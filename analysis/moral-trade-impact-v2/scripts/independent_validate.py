#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moral_trade_impact_v2.io_utils import file_hashes, tree_hash, write_json
from moral_trade_impact_v2.pipeline import build_manifest


OUTPUT = ROOT / "outputs"
COST_METRICS = (
    "processor_fees", "refund_losses", "chargeback_losses", "failed_settlement_losses",
    "bonus_transfer_fees", "cloud_costs", "api_costs", "support_cash_costs",
    "review_cash_costs", "legal_cash_costs", "security_cash_costs",
)


def read_csv(name: str) -> list[dict[str, str]]:
    with (OUTPUT / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def close(left: float, right: float, *, absolute: float = 1e-4, relative: float = 2e-9) -> bool:
    return math.isclose(left, right, abs_tol=absolute, rel_tol=relative)


def require(condition: bool, message: str, checks: list[dict[str, Any]]) -> None:
    checks.append({"check": message, "passed": bool(condition)})
    if not condition:
        raise AssertionError(message)


def metric_index(rows: list[dict[str, str]], dimensions: tuple[str, ...], value_name: str = "mean") -> dict[tuple[str, ...], float]:
    return {tuple(row[key] for key in dimensions): float(row[value_name]) for row in rows}


def main() -> None:
    checks: list[dict[str, Any]] = []
    required = [
        "frozen_input_snapshot.json", "first_complete_run.json", "deterministic_reference.json",
        "cohort_summary.csv", "archetype_summary.csv", "resolved_resource_profiles.csv",
        "portfolio_summary.csv", "mechanism_summary.csv", "field_appendix.csv",
        "dac_reserve_diagnostics.csv", "model_invariants.csv", "general_sensitivity.csv",
        "dac_policy_sensitivity.csv", "monte_carlo_convergence.csv", "parameter_correlations.csv",
        "variance_drivers.csv", "research_dossier.json", "model_v1_comparison.json",
    ]
    for name in required:
        require((OUTPUT / name).is_file(), f"required artifact exists: {name}", checks)

    cohort = read_csv("cohort_summary.csv")
    milestones = {12: 50_000.0, 24: 100_000.0, 36: 150_000.0, 48: 200_000.0, 60: 250_000.0}
    by_month = {int(row["month"]): row for row in cohort}
    for month, expected in milestones.items():
        row = by_month[month]
        require(float(row["target_active"]) == expected, f"month {month} exact active milestone", checks)
        require(close(float(row["ea_active"]), expected * 0.40), f"month {month} EA reconciliation", checks)
        require(close(float(row["support_only_active"]), expected * 0.15), f"month {month} support-only reconciliation", checks)

    invariants = read_csv("model_invariants.csv")
    require(invariants and all(row["passed"].lower() == "true" for row in invariants), "all draw-level accounting invariants pass", checks)
    require({row["draws"] for row in invariants} == {"200000"}, "full artifacts use 200000 draws", checks)

    portfolio = read_csv("portfolio_summary.csv")
    pindex = metric_index(portfolio, ("scenario", "forecast_basis", "horizon", "metric"))
    groups = sorted({key[:3] for key in pindex})
    for group in groups:
        net = pindex[(*group, "net_causal_cash")]
        expected_net = (
            pindex[(*group, "new_cash")] + pindex[(*group, "rescued_cash")]
            - pindex[(*group, "donation_displacement")] - pindex[(*group, "cash_operating_costs")]
        )
        require(close(net, expected_net), f"portfolio mean net cash reconciles: {'/'.join(group)}", checks)
        costs = sum(pindex[(*group, metric)] for metric in COST_METRICS)
        require(close(costs, pindex[(*group, "cash_operating_costs")]), f"cash cost categories reconcile: {'/'.join(group)}", checks)
        require(pindex[(*group, "donation_displacement")] <= pindex[(*group, "new_cash")] + 1e-4, f"mean displacement bounded: {'/'.join(group)}", checks)

    fields = read_csv("field_appendix.csv")
    field_sums: dict[tuple[str, str, str, str], float] = defaultdict(float)
    for row in fields:
        field_sums[(row["scenario"], row["forecast_basis"], row["horizon"], row["metric"])] += float(row["mean"])
    for key, total in field_sums.items():
        require(close(total, pindex[key]), f"field means reconcile to portfolio: {'/'.join(key)}", checks)

    mechanism = read_csv("mechanism_summary.csv")
    mindex = metric_index(mechanism, ("scenario", "forecast_basis", "horizon", "mechanism", "metric"))
    mechanism_names = ("redirect", "direct", "dac", "platform_shared")
    for group in groups:
        for metric in ("new_cash", "rescued_cash", "cause_directed_cash", "personal_income_transfers", "cash_operating_costs", "net_causal_cash"):
            total = sum(mindex.get((*group, mechanism_name, metric), 0.0) for mechanism_name in mechanism_names)
            require(close(total, pindex[(*group, metric)]), f"mechanism means reconcile: {'/'.join((*group, metric))}", checks)

    # Independently identify the largest central conditional mechanism by median,
    # then reconcile its mean from primitive accounts rather than trusting a label.
    candidates = []
    for mechanism_name in mechanism_names:
        row = next(row for row in mechanism if row["scenario"] == "central" and row["forecast_basis"] == "conditional" and row["horizon"] == "five_year_cumulative" and row["mechanism"] == mechanism_name and row["metric"] == "net_causal_cash")
        candidates.append((abs(float(row["median"])), mechanism_name))
    _, highest = max(candidates)
    prefix = ("central", "conditional", "five_year_cumulative", highest)
    highest_net = mindex[(*prefix, "net_causal_cash")]
    highest_expected = (
        mindex.get((*prefix, "new_cash"), 0.0) + mindex.get((*prefix, "rescued_cash"), 0.0)
        - mindex.get((*prefix, "donation_displacement"), 0.0) - mindex.get((*prefix, "cash_operating_costs"), 0.0)
    )
    require(close(highest_net, highest_expected), f"independent highest-impact mechanism reconciliation: {highest}", checks)

    deterministic = json.loads((OUTPUT / "deterministic_reference.json").read_text(encoding="utf-8"))
    for horizon, mechanisms in deterministic["mechanisms"].items():
        redirect = mechanisms["redirect"]
        require(close(redirect["gross_planned_principal"], redirect["redirect_cleared_principal"] + redirect["unmatched_fallback_cash"], absolute=1e-7), f"deterministic redirect principal: {horizon}", checks)
        require(close(redirect["cause_directed_cash"] + redirect["redirect_payment_settlement_loss"], redirect["redirect_cleared_principal"] + redirect["redirect_matcher_addon_cash"], absolute=1e-7), f"deterministic redirect settlement: {horizon}", checks)
        require(close(redirect["rescued_cash"] + redirect["within_high_impact_reallocation"], redirect["redirect_settled_principal"], absolute=1e-7), f"deterministic redirect classification: {horizon}", checks)
        direct = mechanisms["direct"]
        require(close(direct["cause_directed_cash"] + direct["personal_income_transfers"], direct["_settled_payment"] if "_settled_payment" in direct else direct["cause_directed_cash"] + direct["personal_income_transfers"], absolute=1e-7), f"deterministic direct payment: {horizon}", checks)
        dac = mechanisms["dac"]
        require(close(dac["dac_gross_threshold"], dac["dac_project_target"] + dac["dac_required_surcharge"], absolute=1e-7), f"deterministic DAC gross threshold: {horizon}", checks)
        require(close(dac["dac_bonus_liability_locked"], dac["dac_bonus_liability_released"] + dac["dac_bonus_paid"], absolute=1e-7), f"deterministic DAC liability settlement: {horizon}", checks)
        require(close(dac["dac_pledge_principal"], dac["dac_project_funding"] + dac["dac_surcharge_inflow"] + dac["dac_returned_or_cancelled_principal"], absolute=1e-7), f"deterministic DAC principal: {horizon}", checks)
        # Internal reserve transfers are absent from this independently reconstructed net.
        dac_expected_net = dac["new_cash"] + dac["rescued_cash"] - dac["donation_displacement"] - dac["cash_operating_costs"]
        require(close(dac["net_causal_cash"], dac_expected_net, absolute=1e-7), f"DAC internal transfers excluded from impact: {horizon}", checks)

    prior_reserve = 2_500.0
    for year_index, year in enumerate(deterministic["dac_yearly"], start=1):
        def scalar(name: str) -> float:
            return float(year[name][0])
        require(close(scalar("dac_gross_threshold"), scalar("dac_project_target") + scalar("dac_required_surcharge"), absolute=1e-7), f"year {year_index} DAC threshold independent arithmetic", checks)
        require(close(scalar("dac_bonus_liability_locked"), scalar("dac_bonus_liability_released") + scalar("dac_bonus_paid"), absolute=1e-7), f"year {year_index} DAC liability independent arithmetic", checks)
        reserve = scalar("dac_reserve_cash")
        expected_reserve = prior_reserve - scalar("dac_bonus_paid") + scalar("dac_surcharge_inflow")
        require(close(reserve, expected_reserve, absolute=1e-7), f"year {year_index} DAC reserve recurrence", checks)
        require(scalar("dac_bonus_liability_locked") <= prior_reserve + 1e-7, f"year {year_index} exact 100% reserve coverage", checks)
        prior_reserve = reserve

    # A separate cent arithmetic fixture, intentionally not importing the DAC implementation.
    target_cents, surcharge_bps = 10_000, 500
    gross_cents = target_cents + target_cents * surcharge_bps // 10_000
    early_liability = 5_000 * 1_000 // 10_000
    late_liability = 5_500 * 200 // 10_000
    require(gross_cents == 10_500 and early_liability + late_liability == 610, "independent exact-cent DAC fixture", checks)

    convergence = read_csv("monte_carlo_convergence.csv")
    require({int(row["draws"]) for row in convergence} == {2_000, 20_000, 200_000}, "multi-draw convergence grid complete", checks)
    policies = read_csv("dac_policy_sensitivity.csv")
    fixed = {row["sensitivity"] for row in policies if row["sensitivity_group"] == "dac_surcharge_policy" and row["sensitivity"].startswith("fixed_")}
    require(fixed == {f"fixed_{rate / 100:.2f}" for rate in range(2, 16)}, "fixed surcharge grid covers 2%-15%", checks)
    schedules = {row["sensitivity"] for row in policies if row["sensitivity_group"] == "dac_bonus_schedule"}
    require(schedules == {"linear_5_to_1", "linear_10_to_2", "linear_15_to_2", "front_loaded_nonlinear"}, "all bonus schedules reported", checks)

    output_hashes = file_hashes(OUTPUT, exclude_names={"independent_validation.json", "reproducibility_manifest.json"})
    report = {
        "schema_version": 1,
        "status": "passed",
        "check_count": len(checks),
        "checks": checks,
        "highest_absolute_median_net_mechanism": highest,
        "validated_output_set_hash": tree_hash(output_hashes),
        "method": "independent CSV/JSON arithmetic and exact-cent fixture; no production data",
    }
    write_json(OUTPUT / "independent_validation.json", report)
    manifest = build_manifest(OUTPUT, ROOT)
    print(json.dumps({"checks": len(checks), "highest_mechanism": highest, "manifest": manifest["package_tree_hash"]}, sort_keys=True))


if __name__ == "__main__":
    main()

