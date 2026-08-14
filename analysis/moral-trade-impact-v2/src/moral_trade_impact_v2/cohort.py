from __future__ import annotations

from dataclasses import asdict
from typing import Iterable

import numpy as np

from .config import Archetype


EOY_MONTHS = (12, 24, 36, 48, 60)
HORIZONS = ("year_1", "year_5_annual", "five_year_cumulative", "eoy5_annualized_run_rate")


def target_active_by_month(eoy_targets: Iterable[float]) -> np.ndarray:
    targets = np.asarray((0.0, *eoy_targets), dtype=float)
    months = np.arange(61, dtype=float)
    return np.interp(months, np.asarray((0, *EOY_MONTHS), dtype=float), targets)


def build_cohort_rows(archetypes: list[Archetype], eoy_targets: Iterable[float], retention_multiplier: float = 1.0) -> list[dict[str, float | int]]:
    targets = target_active_by_month(eoy_targets)
    shares = np.asarray([a.active_share for a in archetypes])
    retention = np.minimum(np.asarray([a.monthly_retention for a in archetypes]) * retention_multiplier, 0.999999)
    activation = np.asarray([a.activation_rate for a in archetypes])
    support_probability = np.asarray([a.support_only_probability for a in archetypes])
    repeat_probability = np.asarray([a.repeat_use for a in archetypes])
    rows: list[dict[str, float | int]] = []
    prior = np.zeros(len(archetypes))
    for month in range(1, 61):
        current = targets[month] * shares
        retained = prior * retention
        new_active = current - retained
        if np.any(new_active < -1e-8):
            raise ValueError("retention creates more actives than the fixed stock")
        new_active = np.maximum(new_active, 0.0)
        churned = prior - retained
        support = current * support_probability
        rows.append({
            "month": month,
            "year": (month - 1) // 12 + 1,
            "target_active": float(current.sum()),
            "ea_active": float(sum(current[i] for i, a in enumerate(archetypes) if a.segment == "EA")),
            "non_ea_active": float(sum(current[i] for i, a in enumerate(archetypes) if a.segment == "non_EA")),
            "support_only_active": float(support.sum()),
            "transaction_active": float((current - support).sum()),
            "retained_active": float(retained.sum()),
            "new_active": float(new_active.sum()),
            "activation_prospects": float((new_active / activation).sum()),
            "churned_active": float(churned.sum()),
            "repeat_active": float((retained * repeat_probability).sum()),
        })
        prior = current
    return rows


def archetype_month_matrix(archetypes: list[Archetype], eoy_targets: Iterable[float]) -> np.ndarray:
    targets = target_active_by_month(eoy_targets)[1:]
    return targets[:, None] * np.asarray([a.active_share for a in archetypes])[None, :]


def horizon_month_indices() -> dict[str, np.ndarray]:
    return {
        "year_1": np.arange(0, 12),
        "year_5_annual": np.arange(48, 60),
        "five_year_cumulative": np.arange(0, 60),
        # The run rate holds the month-60 stock constant for a forward 12 months.
        "eoy5_annualized_run_rate": np.full(12, 59, dtype=int),
    }


def horizon_exposures(archetypes: list[Archetype], eoy_targets: Iterable[float]) -> dict[str, dict[str, float]]:
    matrix = archetype_month_matrix(archetypes, eoy_targets)
    result: dict[str, dict[str, float]] = {}
    for horizon, indices in horizon_month_indices().items():
        user_years_by_archetype = matrix[indices].sum(axis=0) / 12.0
        support_user_years = sum(
            user_years_by_archetype[i] * a.support_only_probability for i, a in enumerate(archetypes)
        )
        transaction_user_years = float(user_years_by_archetype.sum() - support_user_years)
        result[horizon] = {
            "user_years": float(user_years_by_archetype.sum()),
            "support_user_years": float(support_user_years),
            "transaction_user_years": transaction_user_years,
            "cash_capacity": float(sum(user_years_by_archetype[i] * a.annual_cash_mean_usd * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "ordinary_hours_capacity": float(sum(user_years_by_archetype[i] * a.annual_ordinary_hours * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "skilled_hours_capacity": float(sum(user_years_by_archetype[i] * a.annual_skilled_hours * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "repeat_user_years": float(sum(user_years_by_archetype[i] * a.repeat_use for i, a in enumerate(archetypes))),
        }
    return result


def yearly_exposures(archetypes: list[Archetype], eoy_targets: Iterable[float]) -> list[dict[str, float]]:
    matrix = archetype_month_matrix(archetypes, eoy_targets)
    result: list[dict[str, float]] = []
    for year in range(5):
        indices = np.arange(year * 12, (year + 1) * 12)
        user_years_by_archetype = matrix[indices].sum(axis=0) / 12.0
        support_user_years = sum(
            user_years_by_archetype[i] * a.support_only_probability for i, a in enumerate(archetypes)
        )
        result.append({
            "user_years": float(user_years_by_archetype.sum()),
            "support_user_years": float(support_user_years),
            "transaction_user_years": float(user_years_by_archetype.sum() - support_user_years),
            "cash_capacity": float(sum(user_years_by_archetype[i] * a.annual_cash_mean_usd * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "ordinary_hours_capacity": float(sum(user_years_by_archetype[i] * a.annual_ordinary_hours * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "skilled_hours_capacity": float(sum(user_years_by_archetype[i] * a.annual_skilled_hours * (1 - a.support_only_probability) for i, a in enumerate(archetypes))),
            "repeat_user_years": float(sum(user_years_by_archetype[i] * a.repeat_use for i, a in enumerate(archetypes))),
        })
    return result


def archetype_summary(archetypes: list[Archetype], eoy_targets: Iterable[float]) -> list[dict[str, float | str]]:
    matrix = archetype_month_matrix(archetypes, eoy_targets)
    rows: list[dict[str, float | str]] = []
    for i, archetype in enumerate(archetypes):
        user_years = float(matrix[:, i].sum() / 12.0)
        row = asdict(archetype)
        row.update({
            "eoy5_active": float(matrix[-1, i]),
            "five_year_user_years": user_years,
            "five_year_support_user_years": user_years * archetype.support_only_probability,
            "five_year_cash_capacity": user_years * archetype.annual_cash_mean_usd * (1 - archetype.support_only_probability),
        })
        rows.append(row)
    return rows
