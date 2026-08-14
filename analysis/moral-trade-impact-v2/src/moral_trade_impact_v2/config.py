from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import NormalDist
from typing import Any

import numpy as np


PACKAGE_ROOT = Path(__file__).resolve().parents[2]
FIELDS = (
    "factory_farming_reduction",
    "wild_animal_suffering",
    "residual_existential_risk_prevention",
    "preventing_extreme_power_concentration",
    "biorisk_prevention",
    "space_governance",
    "global_health",
    "strategic_reasoning",
    "environmental_protection",
)
RESOURCE_TYPES = ("money", "ordinary_action", "skilled_work", "career")


@dataclass(frozen=True)
class Parameter:
    parameter_id: str
    target_quantity: str
    mechanism: str
    unit: str
    distribution: str
    parameterization: str
    central: float
    low: float
    high: float
    dependence_structure: str
    provenance: str
    evidence_or_derivation: str
    dominant_crux: str
    update_observable: str


@dataclass(frozen=True)
class Archetype:
    archetype_id: str
    segment: str
    approved_dominant_behavior: str
    active_share: float
    monthly_retention: float
    activation_rate: float
    support_only_probability: float
    zero_cash_probability: float
    annual_cash_mean_usd: float
    annual_ordinary_hours: float
    annual_skilled_hours: float
    redirect_propensity: float
    direct_propensity: float
    dac_propensity: float
    wtp_index: float
    wta_index: float
    action_cost_index: float
    trust: float
    evidence_tolerance: float
    reliability: float
    repeat_use: float
    dependence_cluster: str
    provenance: str
    dominant_crux: str
    update_observable: str


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    description: str
    multipliers: dict[str, float]
    dac_policy: str
    bonus_schedule: str
    compulsory_governance_share: float


# Quantitative factor loadings are AI-proposed dependence assumptions. Each row's
# remaining variance is idiosyncratic. Signs encode directional dependence.
FACTOR_LOADINGS: dict[str, dict[str, float]] = {
    "cash_use_share": {"adoption": 0.30, "trust": 0.45},
    "ordinary_time_use_share": {"trust": 0.35, "market": 0.25},
    "skilled_time_use_share": {"trust": 0.35, "market": 0.20},
    "platform_trust": {"adoption": 0.25, "trust": 0.70},
    "evidence_acceptance": {"trust": 0.30, "evidence": 0.65},
    "reliability": {"trust": 0.25, "operations": 0.55},
    "repeat_use": {"adoption": 0.25, "market": 0.35, "trust": 0.20},
    "market_liquidity": {"adoption": 0.35, "market": 0.70},
    "cash_additionality": {"causal": 0.75, "trust": 0.15},
    "time_additionality": {"causal": 0.62, "trust": 0.18},
    "displacement_fraction_12m": {"causal": -0.48, "cost": 0.15},
    "displacement_fraction_90d": {"causal": -0.30, "cost": 0.10},
    "timing_shift_fraction": {"causal": -0.25},
    "redirect_compatibility": {"market": 0.58, "trust": 0.25},
    "redirect_lower_impact_share": {"causal": 0.18},
    "redirect_addon_ratio": {"market": 0.35, "causal": 0.18},
    "redirect_min_fill_loss": {"market": -0.55},
    "redirect_settlement_loss": {"operations": -0.62},
    "redirect_high_impact_share": {"causal": -0.12},
    "direct_supply_fraction": {"market": 0.45, "trust": 0.25},
    "direct_demand_fraction": {"market": 0.45, "trust": 0.28},
    "direct_price_fit": {"price": 0.68, "market": 0.22},
    "direct_mean_price": {"price": 0.55},
    "cause_directed_payment_share": {"causal": 0.20},
    "direct_skilled_category_share": {"market": 0.12},
    "direct_match_efficiency": {"market": 0.50, "trust": 0.28, "evidence": 0.20},
    "coact_activity_share": {"market": 0.25, "trust": 0.20},
    "coact_same_action_share": {"market": 0.10},
    "coact_attrition": {"operations": -0.35, "trust": -0.20},
    "coact_role_completion": {"operations": 0.40, "market": 0.25},
    "support_hours_per_support_user_year": {"evidence": -0.18, "cost": 0.20},
    "coordination_hours_per_completion": {"evidence": -0.25, "cost": 0.20},
    "dac_pool_target": {"dac": 0.25, "price": 0.15},
    "dac_pools_per_10000_user_years": {"adoption": 0.30, "dac": 0.45},
    "dac_willing_pledge_ratio": {"dac": 0.55, "trust": 0.20},
    "dac_moral_valuation": {"dac": 0.65},
    "dac_free_riding": {"dac": -0.30, "market": -0.18},
    "dac_strategic_delay": {"dac": -0.25},
    "dac_bonus_response": {"dac": 0.40, "causal": 0.18},
    "dac_social_proof": {"dac": 0.35, "market": 0.20},
    "dac_surcharge_sensitivity": {"price": 0.58, "dac": -0.20},
    "dac_bonus_transfer_fee": {"cost": 0.58},
    "dac_invalid_pledge_share": {"operations": -0.50},
    "processor_fee_rate": {"cost": 0.45},
    "refund_loss_rate": {"operations": -0.50, "cost": 0.18},
    "chargeback_loss_rate": {"operations": -0.45, "cost": 0.22},
    "failed_settlement_loss_rate": {"operations": -0.55, "cost": 0.18},
    "cloud_cost_per_user_year": {"cost": 0.60},
    "api_cost_per_user_year": {"cost": 0.55},
    "support_cash_cost_per_user_year": {"cost": 0.55, "evidence": -0.12},
    "review_cash_cost_per_user_year": {"cost": 0.52, "evidence": -0.18},
    "legal_cash_cost_per_user_year": {"cost": 0.60},
    "security_cash_cost_per_user_year": {"cost": 0.62},
    "adoption_fraction": {"adoption": 0.85},
    "operational_probability": {"operations": 0.80, "trust": 0.10},
    "adoption_liquidity_exponent": {"market": -0.18},
    "field_concentration": {"evidence": 0.12},
}
FACTOR_NAMES = ("adoption", "trust", "market", "causal", "operations", "evidence", "price", "dac", "cost")


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_parameters(root: Path = PACKAGE_ROOT) -> dict[str, Parameter]:
    rows = _read_csv(root / "PARAMETER_LEDGER.csv")
    result: dict[str, Parameter] = {}
    for row in rows:
        parameter = Parameter(
            parameter_id=row["parameter_id"],
            target_quantity=row["target_quantity"],
            mechanism=row["mechanism"],
            unit=row["unit"],
            distribution=row["distribution"],
            parameterization=row["parameterization"],
            central=float(row["central"]),
            low=float(row["low"]),
            high=float(row["high"]),
            dependence_structure=row["dependence_structure"],
            provenance=row["provenance"],
            evidence_or_derivation=row["evidence_or_derivation"],
            dominant_crux=row["dominant_crux"],
            update_observable=row["update_observable"],
        )
        if parameter.parameter_id in result:
            raise ValueError(f"duplicate parameter: {parameter.parameter_id}")
        if not parameter.low <= parameter.central <= parameter.high:
            raise ValueError(f"invalid low/central/high: {parameter.parameter_id}")
        result[parameter.parameter_id] = parameter
    return result


def load_archetypes(root: Path = PACKAGE_ROOT) -> list[Archetype]:
    result: list[Archetype] = []
    for row in _read_csv(root / "ARCHETYPE_LEDGER.csv"):
        numeric = {
            key: float(row[key])
            for key in (
                "active_share", "monthly_retention", "activation_rate", "support_only_probability",
                "zero_cash_probability", "annual_cash_mean_usd", "annual_ordinary_hours",
                "annual_skilled_hours", "redirect_propensity", "direct_propensity", "dac_propensity",
                "wtp_index", "wta_index", "action_cost_index", "trust", "evidence_tolerance",
                "reliability", "repeat_use",
            )
        }
        result.append(Archetype(
            archetype_id=row["archetype_id"], segment=row["segment"],
            approved_dominant_behavior=row["approved_dominant_behavior"],
            dependence_cluster=row["dependence_cluster"], provenance=row["provenance"],
            dominant_crux=row["dominant_crux"], update_observable=row["update_observable"], **numeric,
        ))
    return result


def load_profiles(root: Path = PACKAGE_ROOT) -> dict[str, Any]:
    with (root / "RESOURCE_PROFILES.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def resolved_profile(archetype_id: str, resource: str, root: Path = PACKAGE_ROOT) -> np.ndarray:
    data = load_profiles(root)
    value = data["profiles"][archetype_id][resource]
    if value == "inherit_general":
        value = data["profiles"][archetype_id]["general"]
    return np.asarray(value, dtype=float) / 100.0


def load_scenarios(root: Path = PACKAGE_ROOT) -> list[Scenario]:
    with (root / "SCENARIOS.json").open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not data.get("frozen_before_results"):
        raise ValueError("scenario definitions must be frozen before results")
    return [Scenario(
        scenario_id=row["id"], description=row["description"],
        multipliers={key: float(value) for key, value in row["multipliers"].items()},
        dac_policy=row["dac_policy"], bonus_schedule=row["bonus_schedule"],
        compulsory_governance_share=float(row["compulsory_governance_share"]),
    ) for row in data["scenarios"]]


def central_values(parameters: dict[str, Parameter]) -> dict[str, float]:
    return {key: value.central for key, value in parameters.items()}


def validate_inputs(root: Path = PACKAGE_ROOT) -> None:
    params = load_parameters(root)
    archetypes = load_archetypes(root)
    if len(archetypes) != 10 or len({a.archetype_id for a in archetypes}) != 10:
        raise ValueError("exactly ten unique archetypes are required")
    if not math.isclose(sum(a.active_share for a in archetypes), 1.0, abs_tol=1e-12):
        raise ValueError("archetype shares do not sum to one")
    ea_share = sum(a.active_share for a in archetypes if a.segment == "EA")
    if not math.isclose(ea_share, params["ea_active_share"].central, abs_tol=1e-12):
        raise ValueError("EA share does not reconcile")
    support = sum(a.active_share * a.support_only_probability for a in archetypes)
    if not math.isclose(support, params["support_only_share"].central, abs_tol=1e-12):
        raise ValueError("support-only share does not reconcile")
    for segment, expected in (("EA", params["ea_cash_budget_mean"].central), ("non_EA", params["non_ea_cash_budget_mean"].central)):
        segment_share = sum(a.active_share for a in archetypes if a.segment == segment)
        weighted = sum(a.active_share * a.annual_cash_mean_usd for a in archetypes if a.segment == segment) / segment_share
        if not math.isclose(weighted, expected, abs_tol=1e-10):
            raise ValueError(f"{segment} cash mean does not reconcile: {weighted}")
    profiles = load_profiles(root)
    if tuple(profiles["fields"]) != FIELDS:
        raise ValueError("field taxonomy/order mismatch")
    for archetype in archetypes:
        for resource in RESOURCE_TYPES:
            profile = resolved_profile(archetype.archetype_id, resource, root)
            if profile.shape != (9,) or not math.isclose(float(profile.sum()), 1.0, abs_tol=1e-12):
                raise ValueError(f"profile does not sum to 100: {archetype.archetype_id}/{resource}")
    allocations = sum(params[key].central for key in ("redirect_allocation", "direct_allocation", "dac_allocation"))
    if not math.isclose(allocations, 1.0, abs_tol=1e-12):
        raise ValueError("central mechanism allocations must sum to one")
    group_mix = sum(params[key].central for key in ("coact_small_group_share", "coact_medium_group_share", "coact_large_group_share"))
    if not math.isclose(group_mix, 1.0, abs_tol=1e-12):
        raise ValueError("Co-Act group-size shares must sum to one")
    scenarios = load_scenarios(root)
    expected = {
        "central", "thin_market", "trust_evidence_failure", "redirect_dominant",
        "direct_trade_underperformance", "strong_network_repeat", "reserve_constrained_dacs",
        "high_bonus_surcharge_sensitive", "near_zero_additionality", "voluntary_pools",
        "compulsory_5pct_governance",
    }
    if {s.scenario_id for s in scenarios} != expected:
        raise ValueError("structural scenario set mismatch")


def _normal_cdf(values: np.ndarray) -> np.ndarray:
    # Stable vectorized approximation; maximum absolute error is below 1e-7.
    x = values / math.sqrt(2.0)
    sign = np.sign(x)
    ax = np.abs(x)
    t = 1.0 / (1.0 + 0.3275911 * ax)
    polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    erf = sign * (1.0 - polynomial * np.exp(-(ax * ax)))
    return 0.5 * (1.0 + erf)


def _rank_copula(raw: np.ndarray, z: np.ndarray) -> np.ndarray:
    ordered = np.sort(raw)
    ranks = np.empty_like(np.argsort(z))
    ranks[np.argsort(z, kind="stable")] = np.arange(z.size)
    return ordered[ranks]


def _correlated_z(parameter_id: str, factors: dict[str, np.ndarray], rng: np.random.Generator, draws: int) -> np.ndarray:
    loadings = FACTOR_LOADINGS.get(parameter_id, {})
    explained = sum(weight * weight for weight in loadings.values())
    if explained >= 1.0:
        raise ValueError(f"factor loadings exceed unit variance: {parameter_id}")
    z = sum((weight * factors[name] for name, weight in loadings.items()), np.zeros(draws))
    return z + math.sqrt(1.0 - explained) * rng.standard_normal(draws)


def _sample_one(parameter: Parameter, z: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    n = z.size
    if parameter.distribution == "fixed":
        return np.full(n, parameter.central)
    if parameter.distribution == "logistic_normal":
        eps = 1e-8
        low = min(max(parameter.low, eps), 1 - eps)
        high = min(max(parameter.high, eps), 1 - eps)
        central = min(max(parameter.central, eps), 1 - eps)
        logit = lambda x: math.log(x / (1.0 - x))
        sigma = max((logit(high) - logit(low)) / (2.0 * 1.2815515655446004), 1e-9)
        return 1.0 / (1.0 + np.exp(-(logit(central) + sigma * z)))
    if parameter.distribution == "lognormal":
        low = max(parameter.low, 1e-12)
        high = max(parameter.high, low * (1 + 1e-12))
        sigma = max((math.log(high) - math.log(low)) / (2.0 * 1.2815515655446004), 1e-9)
        return np.exp(math.log(max(parameter.central, 1e-12)) + sigma * z)
    if parameter.distribution == "truncated_normal":
        sigma = max((parameter.high - parameter.low) / (2.0 * 1.2815515655446004), 1e-12)
        return np.clip(parameter.central + sigma * z, parameter.low, parameter.high)
    if parameter.distribution == "beta_approx":
        mean = min(max(parameter.central, 1e-6), 1 - 1e-6)
        sd = max((parameter.high - parameter.low) / (2.0 * 1.2815515655446004), 1e-4)
        max_var = mean * (1 - mean) * 0.95
        variance = min(sd * sd, max_var)
        concentration = max(mean * (1 - mean) / variance - 1.0, 0.2)
        raw = rng.beta(mean * concentration, (1 - mean) * concentration, n)
        return np.clip(_rank_copula(raw, z), parameter.low, parameter.high)
    if parameter.distribution == "triangular":
        raw = rng.triangular(parameter.low, parameter.central, parameter.high, n)
        return _rank_copula(raw, z)
    if parameter.distribution == "bernoulli":
        threshold = NormalDist().inv_cdf(1.0 - parameter.central)
        return (z > threshold).astype(float)
    raise ValueError(f"unsupported distribution {parameter.distribution}: {parameter.parameter_id}")


def sample_parameters(parameters: dict[str, Parameter], draws: int, seed: int) -> tuple[dict[str, np.ndarray], dict[str, np.ndarray]]:
    rng = np.random.default_rng(seed)
    factors = {name: rng.standard_normal(draws) for name in FACTOR_NAMES}
    sampled: dict[str, np.ndarray] = {}
    for parameter_id in sorted(parameters):
        parameter = parameters[parameter_id]
        z = _correlated_z(parameter_id, factors, rng, draws)
        sampled[parameter_id] = _sample_one(parameter, z, rng)
    return sampled, factors
