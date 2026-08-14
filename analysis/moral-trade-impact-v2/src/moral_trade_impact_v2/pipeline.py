from __future__ import annotations

import csv
import json
import platform
import sys
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

import numpy as np

from .cohort import archetype_summary, build_cohort_rows
from .config import (
    FACTOR_LOADINGS,
    FIELDS,
    PACKAGE_ROOT,
    RESOURCE_TYPES,
    Scenario,
    load_archetypes,
    load_parameters,
    load_profiles,
    load_scenarios,
    resolved_profile,
    validate_inputs,
)
from .io_utils import file_hashes, read_json, sha256_file, tree_hash, write_csv, write_json
from .model import HORIZONS, run_simulation
from .reporting import (
    ArtifactAccumulator,
    deterministic_payload,
    research_dossier,
    summary_statistics,
    write_parameter_json,
)


FROZEN_INPUT_FILES = (
    "PARAMETER_LEDGER.csv",
    "PARAMETER_LEDGER.json",
    "ARCHETYPE_LEDGER.csv",
    "RESOURCE_PROFILES.json",
    "SCENARIOS.json",
    "MODEL_SPEC.md",
    "SENSITIVITY_AND_CRUX.md",
)


def freeze_inputs(output_dir: Path, root: Path = PACKAGE_ROOT) -> dict[str, Any]:
    validate_inputs(root)
    write_parameter_json(root)
    hashes = {name: sha256_file(root / name) for name in FROZEN_INPUT_FILES}
    snapshot = {
        "schema_version": 1,
        "status": "frozen_before_results",
        "files": hashes,
        "input_set_hash": tree_hash(hashes),
        "anti_tuning_rule": "No prior or scenario changes after inspecting output without preserving the first complete run and logging before/after results.",
    }
    path = output_dir / "frozen_input_snapshot.json"
    if path.exists() and read_json(path) != snapshot:
        raise RuntimeError("frozen input snapshot changed; preserve the first run and log a revision")
    write_json(path, snapshot)
    return snapshot


def _write_cohort_artifacts(output_dir: Path, root: Path) -> None:
    params = load_parameters(root)
    archetypes = load_archetypes(root)
    targets = [params[f"eoy{year}_active"].central for year in range(1, 6)]
    rows = build_cohort_rows(archetypes, targets)
    write_csv(output_dir / "cohort_summary.csv", rows, [
        "month", "year", "target_active", "ea_active", "non_ea_active", "support_only_active",
        "transaction_active", "retained_active", "new_active", "activation_prospects", "churned_active", "repeat_active",
    ])
    archetype_rows = archetype_summary(archetypes, targets)
    write_csv(output_dir / "archetype_summary.csv", archetype_rows, list(archetype_rows[0].keys()))
    profile_rows: list[dict[str, Any]] = []
    profile_source = load_profiles(root)
    for archetype in archetypes:
        for resource in RESOURCE_TYPES:
            raw = profile_source["profiles"][archetype.archetype_id][resource]
            inherited = raw == "inherit_general"
            resolved = resolved_profile(archetype.archetype_id, resource, root) * 100.0
            profile_rows.append({
                "archetype_id": archetype.archetype_id,
                "resource": resource,
                "inherits_general": inherited,
                **{field: resolved[index] for index, field in enumerate(FIELDS)},
                "total_sparks": float(resolved.sum()),
                "evidence_status": "AI_proposed_prior_not_empirical",
            })
    write_csv(output_dir / "resolved_resource_profiles.csv", profile_rows, [
        "archetype_id", "resource", "inherits_general", *FIELDS, "total_sparks", "evidence_status",
    ])


def _fixed_parameters(root: Path):
    return {key: replace(value, distribution="fixed", low=value.central, high=value.central) for key, value in load_parameters(root).items()}


def _sensitivity_row(label: str, group: str, stats: dict[str, float], draws: int, detail: str) -> dict[str, Any]:
    return {
        "sensitivity_group": group, "sensitivity": label, "draws": draws, "detail": detail,
        "mean_five_year_net_causal_cash": stats["mean"], "median_five_year_net_causal_cash": stats["median"],
        "p10_five_year_net_causal_cash": stats["p10"], "p90_five_year_net_causal_cash": stats["p90"],
    }


def _run_dac_sensitivities(root: Path, draws: int, seed: int, central: Scenario) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    policies = [("coverage_controller", "adaptive transparent coverage controller"), ("stress_percentile", "lowest-rate stress-percentile policy")]
    policies.extend((f"fixed_{rate / 100:.2f}", f"fixed published rate {rate}%") for rate in range(2, 16))
    for index, (policy, detail) in enumerate(policies):
        scenario = replace(central, scenario_id=f"dac_policy_{policy}", dac_policy=policy)
        result = run_simulation(scenario, "conditional", draws, seed + 31_000_000, root)
        funding = summary_statistics(result.metrics["five_year_cumulative"]["dac_project_funding"])
        reserve = summary_statistics(result.metrics["five_year_cumulative"]["dac_reserve_cash"])
        waiting = summary_statistics(result.metrics["five_year_cumulative"]["dac_capacity_waiting_pledges"])
        rows.append({
            "sensitivity_group": "dac_surcharge_policy", "sensitivity": policy, "draws": draws, "detail": detail,
            "median_five_year_project_funding": funding["median"], "median_eoy5_reserve_cash": reserve["median"],
            "probability_capacity_waiting": float(np.mean(result.metrics["five_year_cumulative"]["dac_capacity_waiting_pledges"] > 1e-12)),
            "median_capacity_waiting_pledges": waiting["median"],
        })
        # Avoid retaining large arrays between policy runs.
        del result
    schedules = (
        ("linear_5_to_1", "linear 5% opening to 1% deadline"),
        ("linear_10_to_2", "linear 10% opening to 2% deadline"),
        ("linear_15_to_2", "linear 15% opening to 2% deadline"),
        ("front_loaded_nonlinear", "front-loaded nonlinear 10% opening to 2% deadline"),
    )
    for index, (schedule, detail) in enumerate(schedules):
        scenario = replace(central, scenario_id=f"dac_bonus_{schedule}", bonus_schedule=schedule)
        result = run_simulation(scenario, "conditional", draws, seed + 41_000_000, root)
        funding = summary_statistics(result.metrics["five_year_cumulative"]["dac_project_funding"])
        reserve = summary_statistics(result.metrics["five_year_cumulative"]["dac_reserve_cash"])
        waiting_values = result.metrics["five_year_cumulative"]["dac_capacity_waiting_pledges"]
        rows.append({
            "sensitivity_group": "dac_bonus_schedule", "sensitivity": schedule, "draws": draws, "detail": detail,
            "median_five_year_project_funding": funding["median"], "median_eoy5_reserve_cash": reserve["median"],
            "probability_capacity_waiting": float(np.mean(waiting_values > 1e-12)),
            "median_capacity_waiting_pledges": float(np.median(waiting_values)),
        })
        del result
    return rows


def run_pipeline(output_dir: Path, draws: int, freeze_first_run: bool, root: Path = PACKAGE_ROOT) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    marker_path = output_dir / "first_complete_run.json"
    if freeze_first_run and marker_path.exists():
        raise RuntimeError("first complete run already exists; reproduce into a separate output directory")
    frozen = freeze_inputs(output_dir, root)
    _write_cohort_artifacts(output_dir, root)
    parameters = load_parameters(root)
    scenarios = load_scenarios(root)
    base_seed = int(parameters["simulation_seed"].central)
    baseline = read_json(root / "BASELINE.json")
    accumulator = ArtifactAccumulator(parameters)
    convergence_rows: list[dict[str, Any]] = []
    general_sensitivity_rows: list[dict[str, Any]] = []

    fixed = _fixed_parameters(root)
    deterministic = run_simulation(scenarios[0], "conditional", 1, base_seed, root, parameters=fixed)
    write_json(output_dir / "deterministic_reference.json", deterministic_payload(deterministic))
    del deterministic

    central_full_seen = False
    for scenario_index, scenario in enumerate(scenarios):
        for basis_index, basis in enumerate(("conditional", "probability_weighted")):
            seed = base_seed + scenario_index * 100_003 + basis_index * 10_000_019
            result = run_simulation(scenario, basis, draws, seed, root)
            accumulator.add(result)
            if scenario.scenario_id == "central" and basis == "conditional":
                central_full_seen = True
                stats = summary_statistics(result.metrics["five_year_cumulative"]["net_causal_cash"])
                convergence_rows.append({"draws": draws, "seed": seed, **{key: stats[key] for key in ("mean", "median", "p10", "p90")}})
                new_cash = result.metrics["five_year_cumulative"]["new_cash"]
                rescued = result.metrics["five_year_cumulative"]["rescued_cash"]
                costs = result.metrics["five_year_cumulative"]["cash_operating_costs"]
                displacement_90d = np.minimum(new_cash * result.sampled_inputs["displacement_fraction_90d"], new_cash)
                net_90d = new_cash + rescued - displacement_90d - costs
                general_sensitivity_rows.append(_sensitivity_row(
                    "90_day_displacement", "additionality", summary_statistics(net_90d), draws,
                    "early sensitivity; does not replace the frozen 12-month central estimand",
                ))
                permanent_seed = result.metrics["five_year_cumulative"]["net_causal_cash"] - parameters["dac_initial_reserve"].central
                general_sensitivity_rows.append(_sensitivity_row(
                    "permanent_founder_seed_cost", "cash_cost", summary_statistics(permanent_seed), draws,
                    "$2,500 subtracted once rather than treated as conditionally recoverable reserve capital",
                ))
            del result

    if not central_full_seen:
        raise AssertionError("central conditional result missing")
    central_seed = base_seed
    for convergence_draws in (2_000, 20_000):
        result = run_simulation(scenarios[0], "conditional", convergence_draws, central_seed, root)
        stats = summary_statistics(result.metrics["five_year_cumulative"]["net_causal_cash"])
        convergence_rows.append({"draws": convergence_draws, "seed": central_seed, **{key: stats[key] for key in ("mean", "median", "p10", "p90")}})
        del result
    sensitivity_draws = min(draws, 20_000)
    dac_sensitivity_rows = _run_dac_sensitivities(root, sensitivity_draws, base_seed, scenarios[0])
    accumulator.write(output_dir)
    write_csv(output_dir / "monte_carlo_convergence.csv", sorted(convergence_rows, key=lambda row: row["draws"]), [
        "draws", "seed", "mean", "median", "p10", "p90",
    ])
    write_csv(output_dir / "general_sensitivity.csv", general_sensitivity_rows, [
        "sensitivity_group", "sensitivity", "draws", "detail", "mean_five_year_net_causal_cash",
        "median_five_year_net_causal_cash", "p10_five_year_net_causal_cash", "p90_five_year_net_causal_cash",
    ])
    write_csv(output_dir / "dac_policy_sensitivity.csv", dac_sensitivity_rows, [
        "sensitivity_group", "sensitivity", "draws", "detail", "median_five_year_project_funding",
        "median_eoy5_reserve_cash", "probability_capacity_waiting", "median_capacity_waiting_pledges",
    ])
    write_json(output_dir / "parameter_archetype_summary.json", {
        "parameter_count": len(parameters),
        "parameter_provenance_counts": {
            provenance: sum(parameter.provenance == provenance for parameter in parameters.values())
            for provenance in sorted({parameter.provenance for parameter in parameters.values()})
        },
        "archetypes": [asdict(archetype) for archetype in load_archetypes(root)],
        "owner_reconciliations": {"EA_share": 0.40, "non_EA_share": 0.60, "support_only_share": 0.15, "EA_cash_mean": 100, "non_EA_cash_mean": 50},
    })
    v1 = 580_000.0
    v2 = accumulator.central_lookup[("central", "conditional", "five_year_cumulative")]["median"]
    write_json(output_dir / "model_v1_comparison.json", {
        "model_v1_owner_reported_approximate_conditional_five_year_median_usd": v1,
        "model_v2_conditional_five_year_median_net_causal_cash_usd": v2,
        "nominal_difference_usd": v2 - v1,
        "ratio_v2_to_v1": v2 / v1,
        "warning": "Different estimands and structures; not tuned for agreement and not a report cutover.",
        "specific_structural_differences_documented_in": "MODEL_V1_COMPARISON.md",
    })
    # The dossier is written before the core output hash, then rewritten with that hash.
    dossier_path = output_dir / "research_dossier.json"
    write_json(dossier_path, research_dossier(accumulator, draws, baseline["base_sha"], base_seed))
    core_hashes = file_hashes(output_dir, exclude_names={"reproducibility_manifest.json", "first_complete_run.json", "independent_validation.json", "research_dossier.json"})
    core_hash = tree_hash(core_hashes)
    write_json(dossier_path, research_dossier(accumulator, draws, baseline["base_sha"], base_seed, core_hash))
    completed_hashes = file_hashes(output_dir, exclude_names={"reproducibility_manifest.json", "first_complete_run.json", "independent_validation.json"})
    marker = {
        "schema_version": 1,
        "status": "first_complete_frozen_parameter_run",
        "base_sha": baseline["base_sha"],
        "draws_per_scenario_and_basis": draws,
        "base_seed": base_seed,
        "frozen_input_set_hash": frozen["input_set_hash"],
        "output_set_hash": tree_hash(completed_hashes),
        "preservation_rule": "Do not overwrite. Revisions must use a separate output directory and REVISION_LOG.md.",
    }
    write_json(marker_path, marker)


def build_manifest(output_dir: Path, root: Path = PACKAGE_ROOT) -> dict[str, Any]:
    import numpy

    baseline = read_json(root / "BASELINE.json")
    hashes = file_hashes(root, exclude_names={"reproducibility_manifest.json"})
    manifest = {
        "schema_version": 1,
        "repository": baseline["repository"],
        "base_branch": baseline["base_branch"],
        "base_sha": baseline["base_sha"],
        "package_tree_hash": tree_hash(hashes),
        "files": hashes,
        "environment": {
            "python": platform.python_version(),
            "implementation": platform.python_implementation(),
            "platform": platform.platform(),
            "numpy": numpy.__version__,
        },
        "commands": [
            "PYTHONPATH=src python3 -m unittest discover -s tests -v",
            "PYTHONPATH=src python3 scripts/run_model.py --draws 200000 --freeze-first-run",
            "PYTHONPATH=src python3 scripts/independent_validate.py",
            "PYTHONPATH=src python3 scripts/verify_reproducibility.py --draws 200000 --reference-dir outputs",
        ],
        "manifest_self_hash_excluded": True,
        "warning": "Hashes prove byte identity, not empirical validity.",
    }
    write_json(output_dir / "reproducibility_manifest.json", manifest)
    return manifest
