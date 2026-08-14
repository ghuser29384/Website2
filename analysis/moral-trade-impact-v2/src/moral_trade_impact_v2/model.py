from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .cohort import HORIZONS, horizon_exposures, yearly_exposures
from .config import (
    FIELDS,
    PACKAGE_ROOT,
    Archetype,
    Parameter,
    Scenario,
    central_values,
    load_archetypes,
    load_parameters,
    resolved_profile,
    sample_parameters,
)


PORTFOLIO_METRICS = (
    "gross_planned_principal",
    "redirect_cleared_principal",
    "redirect_settled_principal",
    "redirect_matcher_addon_cash",
    "redirect_payment_settlement_loss",
    "new_cash",
    "rescued_cash",
    "within_high_impact_reallocation",
    "cause_directed_cash",
    "personal_income_transfers",
    "donation_displacement",
    "timing_only_shifts",
    "unmatched_fallback_cash",
    "processor_fees",
    "refund_losses",
    "chargeback_losses",
    "failed_settlement_losses",
    "bonus_transfer_fees",
    "cloud_costs",
    "api_costs",
    "support_cash_costs",
    "review_cash_costs",
    "legal_cash_costs",
    "security_cash_costs",
    "cash_operating_costs",
    "net_causal_cash",
    "ordinary_action_hours",
    "skilled_work_hours",
    "support_review_coordination_hours",
    "completed_direct_trades",
    "completed_same_action_coacts",
    "completed_complementary_role_coacts",
    "completed_dietary_animal_product",
    "completed_consumption_change",
    "completed_transport_carbon",
    "completed_skilled_work",
    "completed_learning_forecasting_strategic_reasoning",
    "successful_dac_projects",
    "lapsed_dac_projects",
    "dac_project_funding",
    "dac_project_target",
    "dac_gross_threshold",
    "dac_required_surcharge",
    "dac_surcharge_inflow",
    "dac_bonus_liability_locked",
    "dac_bonus_liability_released",
    "dac_bonus_paid",
    "dac_reserve_cash",
    "dac_free_reserve",
    "dac_capacity_waiting_pledges",
    "dac_pledge_principal",
    "dac_returned_or_cancelled_principal",
    "dac_incremental_funding_caused_by_bonus",
    "dac_funding_lost_to_surcharge",
)

FLOW_METRICS = tuple(metric for metric in PORTFOLIO_METRICS if metric not in {"dac_reserve_cash", "dac_free_reserve"})
ACTION_CATEGORY_KEYS = (
    "completed_dietary_animal_product",
    "completed_consumption_change",
    "completed_transport_carbon",
    "completed_skilled_work",
    "completed_learning_forecasting_strategic_reasoning",
)


@dataclass
class SimulationResult:
    scenario: str
    forecast_basis: str
    draws: int
    seed: int
    metrics: dict[str, dict[str, np.ndarray]]
    mechanism_metrics: dict[str, dict[str, dict[str, np.ndarray]]]
    field_metrics: dict[str, dict[str, np.ndarray]]
    dac_yearly: list[dict[str, np.ndarray]]
    sampled_inputs: dict[str, np.ndarray]
    invariants: dict[str, float]


def _multiplier(scenario: Scenario, key: str) -> float:
    return scenario.multipliers.get(key, 1.0)


def _clip_probability(value: np.ndarray) -> np.ndarray:
    return np.clip(value, 0.0, 1.0)


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(value, -40.0, 40.0)))


def _empty_metrics(draws: int) -> dict[str, np.ndarray]:
    return {metric: np.zeros(draws, dtype=float) for metric in PORTFOLIO_METRICS}


def _mechanism_allocations(samples: dict[str, np.ndarray], scenario: Scenario) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    redirect = samples["redirect_allocation"] * _multiplier(scenario, "redirect_allocation")
    direct = samples["direct_allocation"] * _multiplier(scenario, "direct_allocation")
    dac = samples["dac_allocation"] * _multiplier(scenario, "dac_allocation")
    total = redirect + direct + dac
    redirect, direct, dac = redirect / total, direct / total, dac / total
    governance = scenario.compulsory_governance_share
    if governance:
        new_dac = np.minimum(dac + governance, 1.0)
        scale = np.divide(1.0 - new_dac, redirect + direct, out=np.zeros_like(dac), where=(redirect + direct) > 0)
        redirect, direct, dac = redirect * scale, direct * scale, new_dac
    return redirect, direct, dac


def _forecast_scalars(samples: dict[str, np.ndarray], scenario: Scenario, forecast_basis: str, year_number: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    draws = samples["simulation_seed"].size
    if forecast_basis == "conditional":
        active_scale = np.ones(draws)
        operational = np.ones(draws)
    elif forecast_basis == "probability_weighted":
        retention_effect = _multiplier(scenario, "retention") ** (year_number / 5.0)
        active_scale = _clip_probability(samples["adoption_fraction"] * retention_effect)
        operational = samples["operational_probability"]
    else:
        raise ValueError(f"unknown forecast basis: {forecast_basis}")
    network_scale = np.power(np.maximum(active_scale, 1e-9), samples["adoption_liquidity_exponent"])
    return active_scale, operational, network_scale


def _profile_weight(archetypes: list[Archetype], resource: str, propensity: str, root: Path) -> np.ndarray:
    weighted = np.zeros(len(FIELDS))
    for archetype in archetypes:
        weight = archetype.active_share * (1.0 - archetype.support_only_probability) * getattr(archetype, propensity)
        weighted += weight * resolved_profile(archetype.archetype_id, resource, root)
    return weighted / weighted.sum()


def _field_weights(
    archetypes: list[Archetype], samples: dict[str, np.ndarray], seed: int, root: Path
) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(seed + 7919)
    draws = samples["simulation_seed"].size
    concentration = np.maximum(samples["field_concentration"], 1e-6)
    zero_probability = samples["field_zero_probability"]
    bases = {
        "redirect_money": _profile_weight(archetypes, "money", "redirect_propensity", root),
        "direct_money": _profile_weight(archetypes, "money", "direct_propensity", root),
        "dac_money": _profile_weight(archetypes, "money", "dac_propensity", root),
        "direct_ordinary": _profile_weight(archetypes, "ordinary_action", "direct_propensity", root),
        "direct_skilled": _profile_weight(archetypes, "skilled_work", "direct_propensity", root),
    }
    result: dict[str, np.ndarray] = {}
    for key, base in bases.items():
        noise = np.exp(rng.standard_normal((draws, len(FIELDS))) / np.sqrt(concentration[:, None]))
        mask = rng.random((draws, len(FIELDS))) >= zero_probability[:, None]
        all_zero = ~mask.any(axis=1)
        if np.any(all_zero):
            mask[all_zero, int(np.argmax(base))] = True
        raw = base[None, :] * noise * mask
        result[key] = raw / raw.sum(axis=1, keepdims=True)
    return result


def _simulate_redirect(
    cash_budget: np.ndarray,
    samples: dict[str, np.ndarray],
    scenario: Scenario,
    liquidity: np.ndarray,
    trust: np.ndarray,
    evidence: np.ndarray,
    reliability: np.ndarray,
) -> dict[str, np.ndarray]:
    result = _empty_metrics(cash_budget.size)
    lower_share = samples["redirect_lower_impact_share"]
    addon_ratio = samples["redirect_addon_ratio"]
    principal = cash_budget / (1.0 + lower_share * addon_ratio)
    addon_capacity = cash_budget - principal
    compatibility = (
        samples["redirect_compatibility"] * _multiplier(scenario, "redirect_compatibility")
        * liquidity * np.sqrt(trust) * np.power(evidence, 0.25)
    )
    clear_fraction = (1.0 - np.exp(-2.4 * compatibility)) * (1.0 - samples["redirect_min_fill_loss"])
    cleared = principal * _clip_probability(clear_fraction) * reliability
    addon = np.minimum(addon_capacity, cleared * lower_share * addon_ratio)
    loss_rate = _clip_probability(samples["redirect_settlement_loss"])
    settlement_loss = (cleared + addon) * loss_rate
    settled_scale = 1.0 - loss_rate
    high_impact_opposed = samples["redirect_high_impact_share"]
    rescued_fraction = lower_share + (1.0 - lower_share) * (1.0 - high_impact_opposed)
    raw_rescued = cleared * rescued_fraction * settled_scale
    rescued_credit = _multiplier(scenario, "rescued_share")
    rescued = raw_rescued * rescued_credit
    reallocation = (
        cleared * (1.0 - lower_share) * high_impact_opposed * settled_scale
        + raw_rescued * (1.0 - rescued_credit)
    )
    additional_addon = addon * samples["cash_additionality"] * _multiplier(scenario, "cash_additionality") * settled_scale
    displacement = additional_addon * _clip_probability(samples["displacement_fraction_12m"] * _multiplier(scenario, "displacement"))
    result.update({
        "gross_planned_principal": principal,
        "redirect_cleared_principal": cleared,
        "redirect_settled_principal": cleared * settled_scale,
        "redirect_matcher_addon_cash": addon,
        "redirect_payment_settlement_loss": settlement_loss,
        "new_cash": additional_addon,
        "rescued_cash": rescued,
        "within_high_impact_reallocation": reallocation,
        "cause_directed_cash": (cleared + addon) * settled_scale,
        "donation_displacement": np.minimum(displacement, additional_addon),
        "timing_only_shifts": additional_addon * samples["timing_shift_fraction"],
        "unmatched_fallback_cash": principal - cleared,
        "processor_fees": (cleared + addon) * settled_scale * samples["processor_fee_rate"],
        "failed_settlement_losses": settlement_loss,
    })
    result["_cash_budget"] = cash_budget
    return result


def _simulate_direct(
    cash_budget: np.ndarray,
    ordinary_capacity: np.ndarray,
    skilled_capacity: np.ndarray,
    samples: dict[str, np.ndarray],
    scenario: Scenario,
    liquidity: np.ndarray,
    trust: np.ndarray,
    evidence: np.ndarray,
    reliability: np.ndarray,
) -> dict[str, np.ndarray]:
    result = _empty_metrics(cash_budget.size)
    demand_cash = cash_budget * samples["direct_demand_fraction"]
    ordinary_offered = ordinary_capacity * samples["ordinary_time_use_share"] * samples["direct_supply_fraction"]
    skilled_offered = skilled_capacity * samples["skilled_time_use_share"] * samples["direct_supply_fraction"]
    total_offered = ordinary_offered + skilled_offered
    price = np.maximum(samples["direct_mean_price"], 0.01)
    demand_hours = demand_cash / price
    compatibility = 1.0 - np.exp(
        -3.5 * liquidity * trust * evidence * samples["direct_price_fit"] * samples["direct_match_efficiency"]
        * _multiplier(scenario, "direct_efficiency") * _multiplier(scenario, "price_fit")
    )
    matched_hours = np.minimum(total_offered, demand_hours) * _clip_probability(compatibility) * reliability
    coact_share = samples["coact_activity_share"]
    same_share = samples["coact_same_action_share"]
    attrition_survival = 1.0 - samples["coact_attrition"]
    coact_completion = _multiplier(scenario, "coact_completion")
    individual_hours = matched_hours * (1.0 - coact_share)
    same_hours = matched_hours * coact_share * same_share * attrition_survival * coact_completion
    complement_hours = (
        matched_hours * coact_share * (1.0 - same_share) * attrition_survival
        * samples["coact_role_completion"] * coact_completion
    )
    completed_hours = np.minimum(individual_hours + same_hours + complement_hours, matched_hours)
    skilled_mix = np.divide(skilled_offered, total_offered, out=np.zeros_like(total_offered), where=total_offered > 0)
    skilled_hours = completed_hours * skilled_mix * samples["time_additionality"] * _multiplier(scenario, "time_additionality")
    ordinary_hours = completed_hours * (1.0 - skilled_mix) * samples["time_additionality"] * _multiplier(scenario, "time_additionality")
    settled_payment = np.minimum(demand_cash, completed_hours * price)
    cause_directed = settled_payment * samples["cause_directed_payment_share"]
    personal = settled_payment - cause_directed
    new_cash = cause_directed * samples["cash_additionality"] * _multiplier(scenario, "cash_additionality")
    displacement = new_cash * _clip_probability(samples["displacement_fraction_12m"] * _multiplier(scenario, "displacement"))

    average_group_size = (
        samples["coact_small_group_share"] * samples["coact_small_mean_size"]
        + samples["coact_medium_group_share"] * samples["coact_medium_mean_size"]
        + samples["coact_large_group_share"] * samples["coact_large_mean_size"]
    )
    average_individual_duration = (
        (1.0 - skilled_mix) * samples["direct_ordinary_hours_per_commitment"]
        + skilled_mix * samples["direct_skilled_hours_per_commitment"]
    )
    direct_count = np.divide(individual_hours, average_individual_duration, out=np.zeros_like(individual_hours), where=average_individual_duration > 0)
    same_count = same_hours / (average_group_size * samples["coact_same_hours_per_member"])
    complement_count = complement_hours / (average_group_size * samples["coact_complement_hours_per_member"])
    total_completions = direct_count + same_count + complement_count
    category_skilled = _clip_probability(samples["direct_skilled_category_share"])
    ordinary_category = 1.0 - category_skilled
    category_weights = (
        ordinary_category * 0.30,
        ordinary_category * 0.24,
        ordinary_category * 0.22,
        category_skilled,
        ordinary_category * 0.24,
    )
    category_counts = [total_completions * weight for weight in category_weights]
    coordination_hours = total_completions * samples["coordination_hours_per_completion"]
    result.update({
        "new_cash": new_cash,
        "cause_directed_cash": cause_directed,
        "personal_income_transfers": personal,
        "donation_displacement": np.minimum(displacement, new_cash),
        "timing_only_shifts": new_cash * samples["timing_shift_fraction"],
        "processor_fees": settled_payment * samples["processor_fee_rate"],
        "refund_losses": settled_payment * samples["refund_loss_rate"],
        "chargeback_losses": settled_payment * samples["chargeback_loss_rate"],
        "failed_settlement_losses": settled_payment * samples["failed_settlement_loss_rate"],
        "ordinary_action_hours": ordinary_hours,
        "skilled_work_hours": skilled_hours,
        "support_review_coordination_hours": coordination_hours,
        "completed_direct_trades": direct_count,
        "completed_same_action_coacts": same_count,
        "completed_complementary_role_coacts": complement_count,
    })
    for key, value in zip(ACTION_CATEGORY_KEYS, category_counts, strict=True):
        result[key] = value
    result["_matched_hours"] = matched_hours
    result["_completed_hours"] = completed_hours
    result["_offered_hours"] = total_offered
    result["_cash_budget"] = cash_budget
    result["_demand_cash"] = demand_cash
    result["_settled_payment"] = settled_payment
    return result


def _bonus_average_rate(samples: dict[str, np.ndarray], scenario: Scenario) -> np.ndarray:
    schedule = scenario.bonus_schedule
    if schedule == "linear_5_to_1":
        start, end, exponent = 0.05, 0.01, 1.0
    elif schedule == "linear_15_to_2":
        start, end, exponent = 0.15, 0.02, 1.0
    elif schedule == "front_loaded_nonlinear":
        start, end, exponent = 0.10, 0.02, 0.45
    else:
        start, end, exponent = samples["dac_bonus_open"], samples["dac_bonus_deadline"], 1.0
    arrival = _clip_probability(0.48 + 0.35 * samples["dac_strategic_delay"] * _multiplier(scenario, "strategic_delay"))
    return start - (start - end) * np.power(arrival, exponent)


def _choose_surcharge(
    previous_rate: np.ndarray,
    reserve_cash: np.ndarray,
    projected_liability: np.ndarray,
    samples: dict[str, np.ndarray],
    scenario: Scenario,
) -> np.ndarray:
    minimum = samples["dac_surcharge_min"]
    maximum = samples["dac_surcharge_max"]
    if scenario.dac_policy.startswith("fixed_"):
        fixed_rate = float(scenario.dac_policy.removeprefix("fixed_"))
        return np.full_like(previous_rate, fixed_rate)
    if scenario.dac_policy == "stress_percentile":
        stress_multiplier = 1.0 + (samples["dac_stress_percentile"] - 0.5)
        ratio = np.divide(projected_liability * stress_multiplier, reserve_cash, out=np.full_like(reserve_cash, 10.0), where=reserve_cash > 0)
        return np.clip(minimum + (maximum - minimum) * np.clip(ratio - 1.0, 0.0, 1.0), minimum, maximum)
    projected_free_ratio = np.divide(
        reserve_cash - projected_liability, reserve_cash,
        out=np.zeros_like(reserve_cash), where=reserve_cash > 0,
    )
    rate = previous_rate + 0.04 * (samples["dac_controller_free_target"] - projected_free_ratio)
    return np.clip(rate, minimum, maximum)


def _simulate_dac_year(
    cash_budget: np.ndarray,
    user_years: np.ndarray,
    samples: dict[str, np.ndarray],
    scenario: Scenario,
    liquidity: np.ndarray,
    trust: np.ndarray,
    evidence: np.ndarray,
    reliability: np.ndarray,
    reserve_cash: np.ndarray,
    previous_rate: np.ndarray,
    prior_success_fraction: np.ndarray,
) -> tuple[dict[str, np.ndarray], np.ndarray, np.ndarray, np.ndarray]:
    result = _empty_metrics(cash_budget.size)
    pool_count = (
        user_years * samples["dac_pools_per_10000_user_years"] / 10000.0
        * _multiplier(scenario, "dac_demand") * (0.55 + 0.45 * liquidity)
    )
    target_total = pool_count * samples["dac_pool_target"]
    preliminary_bonus_rate = _bonus_average_rate(samples, scenario)
    projected_principal = np.minimum(cash_budget, target_total * (1.0 + previous_rate))
    projected_liability = projected_principal * preliminary_bonus_rate * _multiplier(scenario, "bonus_liability")
    surcharge = _choose_surcharge(previous_rate, reserve_cash, projected_liability, samples, scenario)
    gross_total = target_total * (1.0 + surcharge)
    bonus_rate = _bonus_average_rate(samples, scenario)
    willing_ratio = (
        samples["dac_willing_pledge_ratio"]
        * np.sqrt(np.maximum(samples["dac_moral_valuation"], 0.0))
        * (1.0 - _clip_probability(samples["dac_free_riding"] * _multiplier(scenario, "free_riding")))
        * (1.0 + samples["dac_bonus_response"] * _multiplier(scenario, "bonus_response") * bonus_rate)
        * (1.0 + samples["dac_social_proof"] * prior_success_fraction)
        * np.exp(-samples["dac_surcharge_sensitivity"] * _multiplier(scenario, "surcharge_sensitivity") * surcharge)
        * np.sqrt(trust * evidence) * (0.55 + 0.45 * liquidity)
    )
    valid_reliable = reliability * (1.0 - samples["dac_invalid_pledge_share"])
    willing = np.minimum(cash_budget, gross_total * willing_ratio) * valid_reliable
    liability_rate = np.maximum(bonus_rate * _multiplier(scenario, "bonus_liability"), 1e-9)
    capacity = reserve_cash / liability_rate
    accepted = np.minimum(willing, capacity)
    waiting = willing - accepted
    locked = accepted * liability_rate
    funding_ratio = np.divide(accepted, gross_total, out=np.zeros_like(accepted), where=gross_total > 0)
    behavior_probability = _sigmoid(samples["dac_threshold_heterogeneity_slope"] * (funding_ratio - 0.92))
    success_count = np.minimum(pool_count * behavior_probability, np.divide(accepted, samples["dac_pool_target"] * (1.0 + surcharge), out=np.zeros_like(accepted), where=samples["dac_pool_target"] > 0))
    success_count = np.minimum(success_count, pool_count)
    success_fraction = np.divide(success_count, pool_count, out=np.zeros_like(success_count), where=pool_count > 0)
    project_funding = success_count * samples["dac_pool_target"]
    surcharge_inflow = project_funding * surcharge
    successful_gross = project_funding + surcharge_inflow
    failed_principal = np.maximum(accepted - successful_gross, 0.0)
    released = successful_gross * liability_rate
    bonus_paid = failed_principal * liability_rate
    if np.any(locked > reserve_cash + 1e-7):
        raise AssertionError("accepted DAC liability exceeds reserve cash")
    reserve_next = reserve_cash - bonus_paid + surcharge_inflow
    reserve_next = np.maximum(reserve_next, 0.0)

    # Explicit counterfactuals use the same behavior equation with one term removed.
    willing_no_bonus = np.minimum(cash_budget, gross_total * willing_ratio / np.maximum(1.0 + samples["dac_bonus_response"] * _multiplier(scenario, "bonus_response") * bonus_rate, 1e-9)) * valid_reliable
    accepted_no_bonus = np.minimum(willing_no_bonus, capacity)
    ratio_no_bonus = np.divide(accepted_no_bonus, gross_total, out=np.zeros_like(accepted), where=gross_total > 0)
    success_no_bonus = np.minimum(
        pool_count * _sigmoid(samples["dac_threshold_heterogeneity_slope"] * (ratio_no_bonus - 0.92)),
        accepted_no_bonus / np.maximum(samples["dac_pool_target"] * (1.0 + surcharge), 1e-9),
    )
    funding_no_bonus = success_no_bonus * samples["dac_pool_target"]
    no_surcharge_willing = np.minimum(cash_budget, target_total * willing_ratio * np.exp(samples["dac_surcharge_sensitivity"] * _multiplier(scenario, "surcharge_sensitivity") * surcharge)) * valid_reliable
    no_surcharge_ratio = np.divide(no_surcharge_willing, target_total, out=np.zeros_like(accepted), where=target_total > 0)
    no_surcharge_success = np.minimum(
        pool_count * _sigmoid(samples["dac_threshold_heterogeneity_slope"] * (no_surcharge_ratio - 0.92)),
        no_surcharge_willing / np.maximum(samples["dac_pool_target"], 1e-9),
    )
    funding_no_surcharge = no_surcharge_success * samples["dac_pool_target"]

    new_cash = project_funding * samples["cash_additionality"] * _multiplier(scenario, "cash_additionality")
    displacement = new_cash * _clip_probability(samples["displacement_fraction_12m"] * _multiplier(scenario, "displacement"))
    result.update({
        "new_cash": new_cash,
        "cause_directed_cash": project_funding,
        "donation_displacement": np.minimum(displacement, new_cash),
        "timing_only_shifts": new_cash * samples["timing_shift_fraction"],
        "processor_fees": successful_gross * samples["processor_fee_rate"],
        "refund_losses": project_funding * samples["refund_loss_rate"],
        "chargeback_losses": project_funding * samples["chargeback_loss_rate"],
        "failed_settlement_losses": project_funding * samples["failed_settlement_loss_rate"],
        "bonus_transfer_fees": bonus_paid * samples["dac_bonus_transfer_fee"],
        "support_review_coordination_hours": pool_count * (1.5 + 2.5 * (1.0 - evidence)),
        "successful_dac_projects": success_count,
        "lapsed_dac_projects": pool_count - success_count,
        "dac_project_funding": project_funding,
        "dac_project_target": target_total,
        "dac_gross_threshold": gross_total,
        "dac_required_surcharge": gross_total - target_total,
        "dac_surcharge_inflow": surcharge_inflow,
        "dac_bonus_liability_locked": locked,
        "dac_bonus_liability_released": released,
        "dac_bonus_paid": bonus_paid,
        "dac_reserve_cash": reserve_next,
        "dac_free_reserve": reserve_next,
        "dac_capacity_waiting_pledges": waiting,
        "dac_pledge_principal": accepted,
        "dac_returned_or_cancelled_principal": failed_principal,
        "dac_incremental_funding_caused_by_bonus": np.maximum(project_funding - funding_no_bonus, 0.0),
        "dac_funding_lost_to_surcharge": np.maximum(funding_no_surcharge - project_funding, 0.0),
    })
    result["_gross_threshold"] = gross_total
    result["_project_target"] = target_total
    result["_required_surcharge"] = gross_total - target_total
    result["_surcharge_rate"] = surcharge
    result["_reserve_before"] = reserve_cash
    result["_willing_pledge"] = willing
    result["_cash_budget"] = cash_budget
    result["_reserve_capacity_probability"] = (waiting > 1e-9).astype(float)
    result["_reserve_exhaustion_probability"] = (reserve_next <= 1e-9).astype(float)
    return result, reserve_next, surcharge, success_fraction


def _combine_period(
    exposure: dict[str, float],
    samples: dict[str, np.ndarray],
    scenario: Scenario,
    forecast_basis: str,
    year_number: int,
    reserve_cash: np.ndarray,
    previous_rate: np.ndarray,
    prior_success_fraction: np.ndarray,
) -> tuple[dict[str, np.ndarray], dict[str, dict[str, np.ndarray]], np.ndarray, np.ndarray, np.ndarray]:
    active_scale, operational, network_scale = _forecast_scalars(samples, scenario, forecast_basis, year_number)
    trust = _clip_probability(samples["platform_trust"] * _multiplier(scenario, "trust") * (0.70 + 0.30 * network_scale))
    evidence = _clip_probability(samples["evidence_acceptance"] * _multiplier(scenario, "evidence"))
    reliability = _clip_probability(samples["reliability"] * _multiplier(scenario, "reliability"))
    liquidity = _clip_probability(samples["market_liquidity"] * _multiplier(scenario, "liquidity") * network_scale)
    repeat_boost = np.clip(samples["repeat_use"] * _multiplier(scenario, "repeat_use"), 0.25, 3.0)
    activity_scale = active_scale * operational * (0.75 + 0.25 * np.minimum(repeat_boost, 2.0))
    cash_capacity = exposure["cash_capacity"] * activity_scale
    ordinary_capacity = exposure["ordinary_hours_capacity"] * activity_scale
    skilled_capacity = exposure["skilled_hours_capacity"] * activity_scale
    user_years = exposure["user_years"] * active_scale
    used_cash = cash_capacity * samples["cash_use_share"]
    redirect_weight, direct_weight, dac_weight = _mechanism_allocations(samples, scenario)
    redirect_budget = used_cash * redirect_weight
    direct_budget = used_cash * direct_weight
    dac_budget = used_cash * dac_weight
    if np.any(redirect_budget + direct_budget + dac_budget > used_cash + 1e-7):
        raise AssertionError("cash budget double-spent")

    redirect = _simulate_redirect(redirect_budget, samples, scenario, liquidity, trust, evidence, reliability)
    direct = _simulate_direct(direct_budget, ordinary_capacity, skilled_capacity, samples, scenario, liquidity, trust, evidence, reliability)
    dac, reserve_next, rate_next, success_next = _simulate_dac_year(
        dac_budget, user_years, samples, scenario, liquidity, trust, evidence, reliability,
        reserve_cash, previous_rate, prior_success_fraction,
    )
    platform = _empty_metrics(used_cash.size)
    cost_scale = active_scale * (0.25 + 0.75 * operational)
    platform.update({
        "support_review_coordination_hours": (
            exposure["support_user_years"] * active_scale * samples["support_hours_per_support_user_year"]
        ),
        "cloud_costs": exposure["user_years"] * cost_scale * samples["cloud_cost_per_user_year"],
        "api_costs": exposure["user_years"] * cost_scale * samples["api_cost_per_user_year"],
        "support_cash_costs": exposure["user_years"] * cost_scale * samples["support_cash_cost_per_user_year"],
        "review_cash_costs": exposure["user_years"] * cost_scale * samples["review_cash_cost_per_user_year"],
        "legal_cash_costs": exposure["user_years"] * cost_scale * samples["legal_cash_cost_per_user_year"],
        "security_cash_costs": exposure["user_years"] * cost_scale * samples["security_cash_cost_per_user_year"],
    })
    combined = _empty_metrics(used_cash.size)
    for metric in PORTFOLIO_METRICS:
        if metric in {"dac_reserve_cash", "dac_free_reserve"}:
            combined[metric] = dac[metric]
        else:
            combined[metric] = redirect.get(metric, 0.0) + direct.get(metric, 0.0) + dac.get(metric, 0.0) + platform.get(metric, 0.0)
    combined["cash_operating_costs"] = (
        combined["processor_fees"] + combined["refund_losses"] + combined["chargeback_losses"]
        + combined["failed_settlement_losses"] + combined["bonus_transfer_fees"]
        + combined["cloud_costs"] + combined["api_costs"] + combined["support_cash_costs"]
        + combined["review_cash_costs"] + combined["legal_cash_costs"] + combined["security_cash_costs"]
    )
    combined["net_causal_cash"] = (
        combined["new_cash"] + combined["rescued_cash"]
        - combined["donation_displacement"] - combined["cash_operating_costs"]
    )
    for mechanism in (redirect, direct, dac, platform):
        mechanism["cash_operating_costs"] = (
            mechanism.get("processor_fees", 0.0) + mechanism.get("refund_losses", 0.0)
            + mechanism.get("chargeback_losses", 0.0) + mechanism.get("failed_settlement_losses", 0.0)
            + mechanism.get("bonus_transfer_fees", 0.0) + mechanism.get("cloud_costs", 0.0)
            + mechanism.get("api_costs", 0.0) + mechanism.get("support_cash_costs", 0.0)
            + mechanism.get("review_cash_costs", 0.0) + mechanism.get("legal_cash_costs", 0.0)
            + mechanism.get("security_cash_costs", 0.0)
        )
        mechanism["net_causal_cash"] = (
            mechanism.get("new_cash", 0.0) + mechanism.get("rescued_cash", 0.0)
            - mechanism.get("donation_displacement", 0.0) - mechanism["cash_operating_costs"]
        )
    return combined, {"redirect": redirect, "direct": direct, "dac": dac, "platform_shared": platform}, reserve_next, rate_next, success_next


def _sum_flows(periods: list[dict[str, np.ndarray]], final_state: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    result: dict[str, np.ndarray] = {}
    for metric in PORTFOLIO_METRICS:
        if metric in {"dac_reserve_cash", "dac_free_reserve"}:
            result[metric] = final_state[metric]
        else:
            result[metric] = sum((period[metric] for period in periods), np.zeros_like(periods[0][metric]))
    return result


def _sum_mechanisms(periods: list[dict[str, dict[str, np.ndarray]]], final_period: dict[str, dict[str, np.ndarray]]) -> dict[str, dict[str, np.ndarray]]:
    result: dict[str, dict[str, np.ndarray]] = {}
    for mechanism in ("redirect", "direct", "dac", "platform_shared"):
        keys = set().union(*(period[mechanism].keys() for period in periods))
        result[mechanism] = {}
        for key in keys:
            if key.startswith("_"):
                continue
            if key in {"dac_reserve_cash", "dac_free_reserve"}:
                result[mechanism][key] = final_period[mechanism].get(key, np.zeros_like(next(iter(final_period[mechanism].values()))))
            else:
                template = next(iter(periods[0][mechanism].values()))
                result[mechanism][key] = sum((period[mechanism].get(key, np.zeros_like(template)) for period in periods), np.zeros_like(template))
    return result


def run_simulation(
    scenario: Scenario,
    forecast_basis: str,
    draws: int,
    seed: int,
    root: Path = PACKAGE_ROOT,
    parameters: dict[str, Parameter] | None = None,
) -> SimulationResult:
    parameters = parameters or load_parameters(root)
    archetypes = load_archetypes(root)
    samples, _ = sample_parameters(parameters, draws, seed)
    eoy_targets = [parameters[f"eoy{year}_active"].central for year in range(1, 6)]
    yearly = yearly_exposures(archetypes, eoy_targets)
    horizon = horizon_exposures(archetypes, eoy_targets)
    reserve = np.full(draws, parameters["dac_initial_reserve"].central)
    rate = np.full(draws, parameters["dac_initial_surcharge"].central)
    success = np.zeros(draws)
    yearly_metrics: list[dict[str, np.ndarray]] = []
    yearly_mechanisms: list[dict[str, dict[str, np.ndarray]]] = []
    dac_yearly: list[dict[str, np.ndarray]] = []
    for year_index, exposure in enumerate(yearly, start=1):
        combined, mechanisms, reserve, rate, success = _combine_period(
            exposure, samples, scenario, forecast_basis, year_index, reserve, rate, success,
        )
        yearly_metrics.append(combined)
        yearly_mechanisms.append(mechanisms)
        dac_yearly.append({key: value for key, value in mechanisms["dac"].items() if key.startswith("_") or key.startswith("dac_") or key in {"successful_dac_projects", "lapsed_dac_projects"}})

    runrate, runrate_mechanisms, _, _, _ = _combine_period(
        horizon["eoy5_annualized_run_rate"], samples, scenario, forecast_basis, 5,
        reserve.copy(), rate.copy(), success.copy(),
    )
    metrics = {
        "year_1": yearly_metrics[0],
        "year_5_annual": yearly_metrics[4],
        "five_year_cumulative": _sum_flows(yearly_metrics, yearly_metrics[4]),
        "eoy5_annualized_run_rate": runrate,
    }
    mechanism_metrics = {
        "year_1": yearly_mechanisms[0],
        "year_5_annual": yearly_mechanisms[4],
        "five_year_cumulative": _sum_mechanisms(yearly_mechanisms, yearly_mechanisms[4]),
        "eoy5_annualized_run_rate": runrate_mechanisms,
    }
    weights = _field_weights(archetypes, samples, seed, root)
    field_metrics: dict[str, dict[str, np.ndarray]] = {}
    for horizon_id in HORIZONS:
        mechanism = mechanism_metrics[horizon_id]
        cause = (
            mechanism["redirect"]["cause_directed_cash"][:, None] * weights["redirect_money"]
            + mechanism["direct"]["cause_directed_cash"][:, None] * weights["direct_money"]
            + mechanism["dac"]["cause_directed_cash"][:, None] * weights["dac_money"]
        )
        ordinary = metrics[horizon_id]["ordinary_action_hours"][:, None] * weights["direct_ordinary"]
        skilled = metrics[horizon_id]["skilled_work_hours"][:, None] * weights["direct_skilled"]
        field_metrics[horizon_id] = {
            "cause_directed_cash": cause,
            "ordinary_action_hours": ordinary,
            "skilled_work_hours": skilled,
        }
    invariants = {
        "max_cash_budget_overage": float(max(np.max(
            period[mechanism].get("_cash_budget", np.zeros(draws)) * 0.0
            + (
                (period["redirect"]["gross_planned_principal"] + period["redirect"]["redirect_matcher_addon_cash"] - period["redirect"]["_cash_budget"])
                if mechanism == "redirect" else
                (period["direct"]["_settled_payment"] - period["direct"]["_cash_budget"])
                if mechanism == "direct" else
                (period["dac"]["dac_pledge_principal"] - period["dac"]["_cash_budget"])
            )
        ) for period in yearly_mechanisms for mechanism in ("redirect", "direct", "dac"))),
        "max_redirect_principal_reconciliation_error": float(max(np.max(np.abs(
            period["redirect"]["gross_planned_principal"]
            - period["redirect"]["redirect_cleared_principal"]
            - period["redirect"]["unmatched_fallback_cash"]
        )) for period in yearly_mechanisms)),
        "max_redirect_settlement_reconciliation_error": float(max(np.max(np.abs(
            period["redirect"]["cause_directed_cash"]
            + period["redirect"]["redirect_payment_settlement_loss"]
            - period["redirect"]["redirect_cleared_principal"]
            - period["redirect"]["redirect_matcher_addon_cash"]
        )) for period in yearly_mechanisms)),
        "max_redirect_classification_reconciliation_error": float(max(np.max(np.abs(
            period["redirect"]["rescued_cash"] + period["redirect"]["within_high_impact_reallocation"]
            - period["redirect"]["redirect_settled_principal"]
        )) for period in yearly_mechanisms)),
        "max_direct_payment_reconciliation_error": float(max(np.max(np.abs(
            period["direct"]["cause_directed_cash"] + period["direct"]["personal_income_transfers"]
            - period["direct"]["_settled_payment"]
        )) for period in yearly_mechanisms)),
        "max_direct_payment_over_demand": float(max(np.max(period["direct"]["_settled_payment"] - period["direct"]["_demand_cash"]) for period in yearly_mechanisms)),
        "max_direct_match_over_supply": float(max(np.max(period["direct"]["_matched_hours"] - period["direct"]["_offered_hours"]) for period in yearly_mechanisms)),
        "max_direct_completion_over_match": float(max(np.max(period["direct"]["_completed_hours"] - period["direct"]["_matched_hours"]) for period in yearly_mechanisms)),
        "max_dac_liability_over_reserve": float(max(np.max(dac_yearly[i]["dac_bonus_liability_locked"] - (parameters["dac_initial_reserve"].central if i == 0 else dac_yearly[i - 1]["dac_reserve_cash"])) for i in range(5))),
        "max_dac_threshold_reconciliation_error": float(max(np.max(np.abs(
            period["dac"]["dac_gross_threshold"] - period["dac"]["dac_project_target"] - period["dac"]["dac_required_surcharge"]
        )) for period in yearly_mechanisms)),
        "max_dac_liability_settlement_error": float(max(np.max(np.abs(
            period["dac"]["dac_bonus_liability_locked"] - period["dac"]["dac_bonus_liability_released"] - period["dac"]["dac_bonus_paid"]
        )) for period in yearly_mechanisms)),
        "max_dac_principal_reconciliation_error": float(max(np.max(np.abs(
            period["dac"]["dac_pledge_principal"] - period["dac"]["dac_project_funding"]
            - period["dac"]["dac_surcharge_inflow"] - period["dac"]["dac_returned_or_cancelled_principal"]
        )) for period in yearly_mechanisms)),
        "max_dac_reserve_reconciliation_error": float(max(np.max(np.abs(
            period["dac"]["dac_reserve_cash"] - period["dac"]["_reserve_before"]
            + period["dac"]["dac_bonus_paid"] - period["dac"]["dac_surcharge_inflow"]
        )) for period in yearly_mechanisms)),
        "max_dac_funding_over_accepted_principal": float(max(np.max(
            period["dac"]["dac_project_funding"] + period["dac"]["dac_surcharge_inflow"]
            - period["dac"]["dac_pledge_principal"]
        ) for period in yearly_mechanisms)),
        "max_dac_accepted_over_willing_pledge": float(max(np.max(
            period["dac"]["dac_pledge_principal"] - period["dac"]["_willing_pledge"]
        ) for period in yearly_mechanisms)),
        "max_dac_waiting_reconciliation_error": float(max(np.max(np.abs(
            period["dac"]["_willing_pledge"] - period["dac"]["dac_pledge_principal"]
            - period["dac"]["dac_capacity_waiting_pledges"]
        )) for period in yearly_mechanisms)),
        "max_displacement_over_new_cash": float(max(np.max(value["donation_displacement"] - value["new_cash"]) for value in metrics.values())),
        "max_net_cash_reconciliation_error": float(max(np.max(np.abs(
            value["net_causal_cash"] - value["new_cash"] - value["rescued_cash"]
            + value["donation_displacement"] + value["cash_operating_costs"]
        )) for value in metrics.values())),
        "max_field_cash_reconciliation_error": float(max(np.max(np.abs(field_metrics[h]["cause_directed_cash"].sum(axis=1) - metrics[h]["cause_directed_cash"])) for h in HORIZONS)),
        "max_field_ordinary_reconciliation_error": float(max(np.max(np.abs(field_metrics[h]["ordinary_action_hours"].sum(axis=1) - metrics[h]["ordinary_action_hours"])) for h in HORIZONS)),
        "max_field_skilled_reconciliation_error": float(max(np.max(np.abs(field_metrics[h]["skilled_work_hours"].sum(axis=1) - metrics[h]["skilled_work_hours"])) for h in HORIZONS)),
    }
    return SimulationResult(
        scenario=scenario.scenario_id, forecast_basis=forecast_basis, draws=draws, seed=seed,
        metrics=metrics, mechanism_metrics=mechanism_metrics, field_metrics=field_metrics,
        dac_yearly=dac_yearly, sampled_inputs=samples, invariants=invariants,
    )
