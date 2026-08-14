from __future__ import annotations

import math
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np

from .config import FACTOR_LOADINGS, FIELDS, PACKAGE_ROOT, Parameter, load_archetypes, load_parameters
from .io_utils import write_csv, write_json
from .model import HORIZONS, PORTFOLIO_METRICS, SimulationResult


UNITS: dict[str, str] = {
    "gross_planned_principal": "USD",
    "redirect_cleared_principal": "USD",
    "redirect_settled_principal": "USD",
    "redirect_matcher_addon_cash": "USD",
    "redirect_payment_settlement_loss": "USD",
    "new_cash": "USD",
    "rescued_cash": "USD",
    "within_high_impact_reallocation": "USD",
    "cause_directed_cash": "USD",
    "personal_income_transfers": "USD",
    "donation_displacement": "USD",
    "timing_only_shifts": "USD",
    "unmatched_fallback_cash": "USD",
    "processor_fees": "USD",
    "refund_losses": "USD",
    "chargeback_losses": "USD",
    "failed_settlement_losses": "USD",
    "bonus_transfer_fees": "USD",
    "cloud_costs": "USD",
    "api_costs": "USD",
    "support_cash_costs": "USD",
    "review_cash_costs": "USD",
    "legal_cash_costs": "USD",
    "security_cash_costs": "USD",
    "cash_operating_costs": "USD",
    "net_causal_cash": "USD",
    "ordinary_action_hours": "hours",
    "skilled_work_hours": "hours",
    "support_review_coordination_hours": "hours",
    "completed_direct_trades": "commitments",
    "completed_same_action_coacts": "groups",
    "completed_complementary_role_coacts": "groups",
    "completed_dietary_animal_product": "commitments_or_groups",
    "completed_consumption_change": "commitments_or_groups",
    "completed_transport_carbon": "commitments_or_groups",
    "completed_skilled_work": "commitments_or_groups",
    "completed_learning_forecasting_strategic_reasoning": "commitments_or_groups",
    "successful_dac_projects": "projects",
    "lapsed_dac_projects": "projects",
    "dac_project_funding": "USD",
    "dac_project_target": "USD",
    "dac_gross_threshold": "USD",
    "dac_required_surcharge": "USD_internal_threshold_component",
    "dac_surcharge_inflow": "USD_internal_transfer",
    "dac_bonus_liability_locked": "USD_internal_liability",
    "dac_bonus_liability_released": "USD_internal_liability",
    "dac_bonus_paid": "USD_internal_transfer",
    "dac_reserve_cash": "USD_reserve_state",
    "dac_free_reserve": "USD_reserve_state",
    "dac_capacity_waiting_pledges": "USD_pledge_principal",
    "dac_pledge_principal": "USD",
    "dac_returned_or_cancelled_principal": "USD",
    "dac_incremental_funding_caused_by_bonus": "USD",
    "dac_funding_lost_to_surcharge": "USD",
    "_gross_threshold": "USD",
    "_project_target": "USD",
    "_surcharge_rate": "proportion",
    "_reserve_capacity_probability": "indicator",
    "_reserve_exhaustion_probability": "indicator",
}

PERCENTILES = (("p05", 0.05), ("p10", 0.10), ("p25", 0.25), ("p75", 0.75), ("p90", 0.90), ("p95", 0.95))
SUMMARY_FIELDS = [
    "scenario", "forecast_basis", "horizon", "metric", "unit", "draws", "seed",
    "mean", "median", "p05", "p10", "p25", "p75", "p90", "p95",
    "probability_zero", "probability_zero_or_negative", "probability_negligible",
    "probability_gt_100k", "probability_gt_500k", "probability_gt_1m", "probability_gt_5m",
    "evidence_status",
]


def summary_statistics(values: np.ndarray, negligible_threshold: float = 0.0) -> dict[str, float]:
    values = np.asarray(values, dtype=float)
    if values.ndim != 1 or values.size == 0 or not np.isfinite(values).all():
        raise ValueError("summary input must be a finite nonempty vector")
    result = {
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "probability_zero": float(np.mean(np.abs(values) <= 1e-12)),
        "probability_zero_or_negative": float(np.mean(values <= 0.0)),
        "probability_negligible": float(np.mean(values <= negligible_threshold)) if negligible_threshold else float(np.mean(np.abs(values) <= 1e-12)),
        "probability_gt_100k": float(np.mean(values > 100_000.0)),
        "probability_gt_500k": float(np.mean(values > 500_000.0)),
        "probability_gt_1m": float(np.mean(values > 1_000_000.0)),
        "probability_gt_5m": float(np.mean(values > 5_000_000.0)),
    }
    for label, quantile in PERCENTILES:
        result[label] = float(np.quantile(values, quantile, method="linear"))
    return result


def _pearson(left: np.ndarray, right: np.ndarray) -> float:
    left = np.asarray(left, dtype=float)
    right = np.asarray(right, dtype=float)
    left_centered = left - left.mean()
    right_centered = right - right.mean()
    denominator = math.sqrt(float(np.dot(left_centered, left_centered) * np.dot(right_centered, right_centered)))
    return float(np.dot(left_centered, right_centered) / denominator) if denominator else 0.0


def write_parameter_json(root: Path = PACKAGE_ROOT) -> None:
    parameters = load_parameters(root)
    write_json(root / "PARAMETER_LEDGER.json", {
        "schema_version": 1,
        "status": "frozen_before_results",
        "warning": "AI-assisted prior ledger; Monte Carlo draws are not transaction evidence",
        "parameters": [
            {**asdict(parameters[key]), "factor_loadings": FACTOR_LOADINGS.get(key, {})}
            for key in sorted(parameters)
        ],
    })


class ArtifactAccumulator:
    def __init__(self, parameters: dict[str, Parameter]) -> None:
        self.parameters = parameters
        self.portfolio_rows: list[dict[str, Any]] = []
        self.mechanism_rows: list[dict[str, Any]] = []
        self.field_rows: list[dict[str, Any]] = []
        self.dac_rows: list[dict[str, Any]] = []
        self.invariant_rows: list[dict[str, Any]] = []
        self.parameter_correlation_rows: list[dict[str, Any]] = []
        self.variance_driver_rows: list[dict[str, Any]] = []
        self.mechanism_correlation_rows: list[dict[str, Any]] = []
        self.field_correlation_rows: list[dict[str, Any]] = []
        self.central_lookup: dict[tuple[str, str, str], dict[str, float]] = {}

    def add(self, result: SimulationResult) -> None:
        negligible = self.parameters["negligible_cash_threshold"].central
        for horizon in HORIZONS:
            for metric in PORTFOLIO_METRICS:
                stats = summary_statistics(
                    result.metrics[horizon][metric],
                    negligible if metric == "net_causal_cash" else 0.0,
                )
                row = {
                    "scenario": result.scenario,
                    "forecast_basis": result.forecast_basis,
                    "horizon": horizon,
                    "metric": metric,
                    "unit": UNITS[metric],
                    "draws": result.draws,
                    "seed": result.seed,
                    "evidence_status": "prior_driven_synthetic_not_empirical",
                    **stats,
                }
                self.portfolio_rows.append(row)
                if metric == "net_causal_cash":
                    self.central_lookup[(result.scenario, result.forecast_basis, horizon)] = stats

            for mechanism, metrics in result.mechanism_metrics[horizon].items():
                for metric, values in sorted(metrics.items()):
                    if metric.startswith("_") or metric not in UNITS:
                        continue
                    stats = summary_statistics(values)
                    self.mechanism_rows.append({
                        "scenario": result.scenario, "forecast_basis": result.forecast_basis,
                        "horizon": horizon, "mechanism": mechanism, "metric": metric,
                        "unit": UNITS[metric], "draws": result.draws, "seed": result.seed,
                        "mean": stats["mean"], "median": stats["median"], "p10": stats["p10"],
                        "p90": stats["p90"], "probability_zero": stats["probability_zero"],
                        "evidence_status": "prior_driven_synthetic_not_empirical",
                    })

            for metric, matrix in result.field_metrics[horizon].items():
                for field_index, field in enumerate(FIELDS):
                    stats = summary_statistics(matrix[:, field_index])
                    self.field_rows.append({
                        "scenario": result.scenario, "forecast_basis": result.forecast_basis,
                        "horizon": horizon, "metric": metric, "field": field,
                        "unit": UNITS[metric], "draws": result.draws, "seed": result.seed,
                        "mean": stats["mean"], "median": stats["median"], "p05": stats["p05"],
                        "p10": stats["p10"], "p90": stats["p90"], "p95": stats["p95"],
                        "probability_zero": stats["probability_zero"],
                        "evidence_status": "especially_prior_driven_appendix_only",
                    })

        for year_index, diagnostics in enumerate(result.dac_yearly, start=1):
            for metric, values in sorted(diagnostics.items()):
                if metric not in UNITS:
                    continue
                stats = summary_statistics(values)
                self.dac_rows.append({
                    "scenario": result.scenario, "forecast_basis": result.forecast_basis,
                    "year": year_index, "metric": metric, "unit": UNITS[metric],
                    "draws": result.draws, "seed": result.seed, "mean": stats["mean"],
                    "median": stats["median"], "p05": stats["p05"], "p10": stats["p10"],
                    "p90": stats["p90"], "p95": stats["p95"],
                    "probability_positive": float(np.mean(values > 1e-12)),
                })

        for invariant, value in sorted(result.invariants.items()):
            tolerance = 1e-5 if "field" in invariant else 1e-7
            self.invariant_rows.append({
                "scenario": result.scenario, "forecast_basis": result.forecast_basis,
                "draws": result.draws, "seed": result.seed, "invariant": invariant,
                "observed_max": value, "tolerance": tolerance,
                "passed": value <= tolerance,
            })

        if result.scenario == "central":
            target = result.metrics["five_year_cumulative"]["net_causal_cash"]
            correlations: list[tuple[str, float]] = []
            for parameter_id, parameter in sorted(self.parameters.items()):
                if parameter.distribution == "fixed":
                    continue
                correlation = _pearson(result.sampled_inputs[parameter_id], target)
                correlations.append((parameter_id, correlation))
                self.parameter_correlation_rows.append({
                    "forecast_basis": result.forecast_basis,
                    "horizon": "five_year_cumulative",
                    "output_metric": "net_causal_cash",
                    "input_parameter": parameter_id,
                    "pearson_correlation": correlation,
                    "interpretation": "screening_association_not_causal_or_sobol",
                })
            squared_total = sum(correlation * correlation for _, correlation in correlations) or 1.0
            for rank, (parameter_id, correlation) in enumerate(sorted(correlations, key=lambda item: abs(item[1]), reverse=True), start=1):
                self.variance_driver_rows.append({
                    "forecast_basis": result.forecast_basis, "rank": rank,
                    "input_parameter": parameter_id, "pearson_correlation": correlation,
                    "normalized_squared_correlation": correlation * correlation / squared_total,
                    "method": "normalized_squared_Pearson_screening_not_variance_decomposition",
                })
            for horizon in HORIZONS:
                portfolio = result.metrics[horizon]["net_causal_cash"]
                for mechanism in ("redirect", "direct", "dac", "platform_shared"):
                    values = result.mechanism_metrics[horizon][mechanism]["net_causal_cash"]
                    self.mechanism_correlation_rows.append({
                        "forecast_basis": result.forecast_basis, "horizon": horizon,
                        "mechanism": mechanism, "portfolio_metric": "net_causal_cash",
                        "pearson_correlation": _pearson(values, portfolio),
                    })
                for field_index, field in enumerate(FIELDS):
                    values = result.field_metrics[horizon]["cause_directed_cash"][:, field_index]
                    self.field_correlation_rows.append({
                        "forecast_basis": result.forecast_basis, "horizon": horizon,
                        "field": field, "field_metric": "cause_directed_cash",
                        "portfolio_metric": "net_causal_cash",
                        "pearson_correlation": _pearson(values, portfolio),
                        "evidence_status": "especially_prior_driven_appendix_only",
                    })

    def write(self, output_dir: Path) -> None:
        write_csv(output_dir / "portfolio_summary.csv", self.portfolio_rows, SUMMARY_FIELDS)
        write_csv(output_dir / "mechanism_summary.csv", self.mechanism_rows, [
            "scenario", "forecast_basis", "horizon", "mechanism", "metric", "unit", "draws", "seed",
            "mean", "median", "p10", "p90", "probability_zero", "evidence_status",
        ])
        write_csv(output_dir / "field_appendix.csv", self.field_rows, [
            "scenario", "forecast_basis", "horizon", "metric", "field", "unit", "draws", "seed",
            "mean", "median", "p05", "p10", "p90", "p95", "probability_zero", "evidence_status",
        ])
        write_csv(output_dir / "dac_reserve_diagnostics.csv", self.dac_rows, [
            "scenario", "forecast_basis", "year", "metric", "unit", "draws", "seed", "mean", "median",
            "p05", "p10", "p90", "p95", "probability_positive",
        ])
        write_csv(output_dir / "model_invariants.csv", self.invariant_rows, [
            "scenario", "forecast_basis", "draws", "seed", "invariant", "observed_max", "tolerance", "passed",
        ])
        write_csv(output_dir / "parameter_correlations.csv", self.parameter_correlation_rows, [
            "forecast_basis", "horizon", "output_metric", "input_parameter", "pearson_correlation", "interpretation",
        ])
        write_csv(output_dir / "variance_drivers.csv", self.variance_driver_rows, [
            "forecast_basis", "rank", "input_parameter", "pearson_correlation", "normalized_squared_correlation", "method",
        ])
        write_csv(output_dir / "mechanism_correlations.csv", self.mechanism_correlation_rows, [
            "forecast_basis", "horizon", "mechanism", "portfolio_metric", "pearson_correlation",
        ])
        write_csv(output_dir / "field_correlations.csv", self.field_correlation_rows, [
            "forecast_basis", "horizon", "field", "field_metric", "portfolio_metric", "pearson_correlation", "evidence_status",
        ])


def deterministic_payload(result: SimulationResult) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "scenario": result.scenario,
        "forecast_basis": result.forecast_basis,
        "draws": result.draws,
        "seed": result.seed,
        "status": "transparent central reference; prior-driven, not empirical",
        "portfolio": {
            horizon: {metric: float(values[0]) for metric, values in sorted(result.metrics[horizon].items())}
            for horizon in HORIZONS
        },
        "mechanisms": {
            horizon: {
                mechanism: {metric: float(values[0]) for metric, values in sorted(metrics.items()) if not metric.startswith("_")}
                for mechanism, metrics in sorted(result.mechanism_metrics[horizon].items())
            }
            for horizon in HORIZONS
        },
        "dac_yearly": [
            {metric: [float(item) for item in values] for metric, values in sorted(year.items())}
            for year in result.dac_yearly
        ],
        "invariants": result.invariants,
    }


def research_dossier(
    accumulator: ArtifactAccumulator,
    draws: int,
    base_sha: str,
    seed: int,
    output_set_hash: str | None = None,
) -> dict[str, Any]:
    central: dict[str, Any] = {}
    for basis in ("conditional", "probability_weighted"):
        central[basis] = {
            horizon: accumulator.central_lookup[("central", basis, horizon)]
            for horizon in HORIZONS
        }
    structural = {
        scenario: accumulator.central_lookup[(scenario, "conditional", "five_year_cumulative")]
        for scenario in sorted({row["scenario"] for row in accumulator.portfolio_rows})
    }
    return {
        "schema_version": 1,
        "research_question": "Net causal money and labor mobilized in Year 1, Year 5, five-year cumulative operation, and EOY5 annualized run rate.",
        "base_sha": base_sha,
        "draws_per_scenario_and_basis": draws,
        "base_seed": seed,
        "central_net_causal_cash": central,
        "conditional_structural_scenarios_five_year_net_causal_cash": structural,
        "headline_status": "prior-driven synthetic forecast; not empirical; not approved for report cutover",
        "warning": "More draws reduce Monte Carlo noise but do not validate priors.",
        "mechanisms": ["donation_redirects", "direct_reciprocal_and_coacts", "open_voluntary_single_threshold_dac_pools"],
        "excluded_from_central": ["donation_upgrades", "career_salary_gap_pools", "institutional_trades", "threshold_sign_ons"],
        "output_set_hash": output_set_hash,
        "release_classification": "repository_only_research_draft",
        "boundaries": {
            "runtime_imports_changed": False,
            "production_or_private_user_data_accessed": False,
            "production_database_changed": False,
            "payments_enabled_or_executed": False,
            "migration_applied": False,
            "deployment_or_alias_changed": False,
            "merge_performed": False,
        },
    }
