from __future__ import annotations

import math
from dataclasses import dataclass


ACTION_CATEGORIES = (
    "dietary_animal_product",
    "consumption_change",
    "transport_carbon",
    "skilled_work",
    "learning_forecasting_strategic_reasoning",
)


@dataclass(frozen=True)
class DemandOrder:
    authorization_id: str
    action_category: str
    field: str
    quantity_minutes: int
    max_price_cents_per_hour: int
    payment_route: str
    evidence_tolerance: int
    deadline_day: int


@dataclass(frozen=True)
class SupplyOrder:
    authorization_id: str
    action_category: str
    accepted_fields: tuple[str, ...]
    quantity_minutes: int
    min_price_cents_per_hour: int
    evidence_burden: int
    deadline_day: int


@dataclass(frozen=True)
class DirectFill:
    demand_authorization_id: str
    supply_authorization_id: str
    action_category: str
    field: str
    quantity_minutes: int
    price_cents_per_hour: int
    payment_cents: int
    payment_route: str


def _validate(demands: list[DemandOrder], supplies: list[SupplyOrder]) -> None:
    if len({d.authorization_id for d in demands}) != len(demands):
        raise ValueError("duplicate demand authorization")
    if len({s.authorization_id for s in supplies}) != len(supplies):
        raise ValueError("duplicate supply authorization")
    for demand in demands:
        if demand.action_category not in ACTION_CATEGORIES:
            raise ValueError("donations and unknown categories are excluded from direct actions")
        if demand.payment_route not in {"cause_directed", "personal_income"}:
            raise ValueError("invalid payment route")
        if demand.quantity_minutes <= 0 or demand.max_price_cents_per_hour <= 0:
            raise ValueError("invalid demand quantity/price")
    for supply in supplies:
        if supply.action_category not in ACTION_CATEGORIES:
            raise ValueError("invalid supply category")
        if supply.quantity_minutes <= 0 or supply.min_price_cents_per_hour <= 0:
            raise ValueError("invalid supply quantity/price")


def clear_direct_orders(demands: list[DemandOrder], supplies: list[SupplyOrder], as_of_day: int) -> tuple[DirectFill, ...]:
    _validate(demands, supplies)
    demand_remaining = {d.authorization_id: d.quantity_minutes for d in demands}
    supply_remaining = {s.authorization_id: s.quantity_minutes for s in supplies}
    fills: list[DirectFill] = []
    for demand in sorted(demands, key=lambda d: (d.deadline_day, d.authorization_id)):
        if demand.deadline_day < as_of_day:
            continue
        compatible = sorted((
            supply for supply in supplies
            if supply.deadline_day >= as_of_day
            and supply.action_category == demand.action_category
            and demand.field in supply.accepted_fields
            and supply.min_price_cents_per_hour <= demand.max_price_cents_per_hour
            and supply.evidence_burden <= demand.evidence_tolerance
            and supply_remaining[supply.authorization_id] > 0
        ), key=lambda s: (s.min_price_cents_per_hour, s.deadline_day, s.authorization_id))
        for supply in compatible:
            quantity = min(demand_remaining[demand.authorization_id], supply_remaining[supply.authorization_id])
            if quantity <= 0:
                break
            # Geometric bargaining price is bounded by accepted WTA and WTP.
            price = round(math.sqrt(supply.min_price_cents_per_hour * demand.max_price_cents_per_hour))
            price = min(max(price, supply.min_price_cents_per_hour), demand.max_price_cents_per_hour)
            payment = math.ceil(quantity * price / 60)
            fills.append(DirectFill(
                demand_authorization_id=demand.authorization_id,
                supply_authorization_id=supply.authorization_id,
                action_category=demand.action_category,
                field=demand.field,
                quantity_minutes=quantity,
                price_cents_per_hour=price,
                payment_cents=payment,
                payment_route=demand.payment_route,
            ))
            demand_remaining[demand.authorization_id] -= quantity
            supply_remaining[supply.authorization_id] -= quantity
    if any(sum(f.quantity_minutes for f in fills if f.demand_authorization_id == d.authorization_id) > d.quantity_minutes for d in demands):
        raise AssertionError("direct matching exceeded demand")
    if any(sum(f.quantity_minutes for f in fills if f.supply_authorization_id == s.authorization_id) > s.quantity_minutes for s in supplies):
        raise AssertionError("direct matching exceeded supply")
    return tuple(fills)


def complementary_group_complete(required_roles: dict[str, int], verified_completions: dict[str, int]) -> bool:
    if not required_roles or any(required <= 0 for required in required_roles.values()):
        raise ValueError("complementary group requires positive role counts")
    return all(verified_completions.get(role, 0) >= required for role, required in required_roles.items())


def same_action_group_completion(member_completion: tuple[bool, ...], minimum_completed: int) -> tuple[bool, float]:
    if minimum_completed <= 0 or minimum_completed > len(member_completion):
        raise ValueError("invalid same-action minimum")
    completed = sum(member_completion)
    return completed >= minimum_completed, completed / len(member_completion)
