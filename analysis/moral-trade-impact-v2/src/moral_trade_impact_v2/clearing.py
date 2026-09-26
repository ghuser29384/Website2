from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class CreatorOrder:
    authorization_id: str
    order_kind: str
    source_side: str
    accepted_destinations: tuple[str, ...]
    amount_cents: int
    minimum_fill_cents: int
    allow_partial: bool
    deadline_day: int
    addon_bps_required: int = 0
    baseline_class: str = "lower_impact"


@dataclass(frozen=True)
class MatcherOrder:
    authorization_id: str
    accepted_source_sides: tuple[str, ...]
    accepted_destinations: tuple[str, ...]
    amount_cents: int
    deadline_day: int


@dataclass(frozen=True)
class Fill:
    batch_id: str
    creator_authorization_id: str
    matcher_authorization_ids: tuple[str, ...]
    destination: str
    principal_cents: int
    addon_cents: int
    classification: str


@dataclass(frozen=True)
class ClearingResult:
    fills: tuple[Fill, ...]
    planned_principal_cents: int
    cleared_principal_cents: int
    addon_cents: int
    rescued_cents: int
    reallocation_cents: int
    unmatched_fallback_cents: int


def _validate_creator(order: CreatorOrder) -> None:
    if order.order_kind not in {"opposed", "lower_impact"}:
        raise ValueError("unsupported creator order kind")
    if order.amount_cents <= 0 or order.minimum_fill_cents <= 0:
        raise ValueError("creator amount/minimum must be positive")
    if order.minimum_fill_cents > order.amount_cents:
        raise ValueError("minimum fill exceeds creator amount")
    if not order.accepted_destinations:
        raise ValueError("creator requires a structured destination")
    if not 0 <= order.addon_bps_required <= 10000:
        raise ValueError("invalid add-on basis points")


def clear_order_book(creators: list[CreatorOrder], matchers: list[MatcherOrder], as_of_day: int) -> ClearingResult:
    creator_ids = [order.authorization_id for order in creators]
    matcher_ids = [order.authorization_id for order in matchers]
    if len(creator_ids) != len(set(creator_ids)) or len(matcher_ids) != len(set(matcher_ids)):
        raise ValueError("authorization IDs must be unique")
    for order in creators:
        _validate_creator(order)
    matcher_remaining = {order.authorization_id: order.amount_cents for order in matchers}
    fills: list[Fill] = []
    cleared_creator_ids: set[str] = set()

    # Opposed plans require structured terms, a shared accepted destination, and
    # a different source side. Each authorization settles in at most one batch.
    opposed = sorted(
        (o for o in creators if o.order_kind == "opposed" and o.deadline_day >= as_of_day),
        key=lambda o: (o.deadline_day, o.authorization_id),
    )
    for index, left in enumerate(opposed):
        if left.authorization_id in cleared_creator_ids:
            continue
        candidates = [
            right for right in opposed[index + 1:]
            if right.authorization_id not in cleared_creator_ids
            and right.source_side != left.source_side
            and set(left.accepted_destinations).intersection(right.accepted_destinations)
        ]
        if not candidates:
            continue
        right = candidates[0]
        amount = min(left.amount_cents, right.amount_cents)
        if not left.allow_partial and amount != left.amount_cents:
            continue
        if not right.allow_partial and amount != right.amount_cents:
            continue
        if amount < left.minimum_fill_cents or amount < right.minimum_fill_cents:
            continue
        destination = sorted(set(left.accepted_destinations).intersection(right.accepted_destinations))[0]
        batch_id = f"opposed:{destination}:{left.authorization_id}:{right.authorization_id}"
        for order in (left, right):
            fills.append(Fill(
                batch_id=batch_id,
                creator_authorization_id=order.authorization_id,
                matcher_authorization_ids=(),
                destination=destination,
                principal_cents=amount,
                addon_cents=0,
                classification="within_high_impact" if order.baseline_class == "high_impact" else "rescued",
            ))
            cleared_creator_ids.add(order.authorization_id)

    lower = sorted(
        (o for o in creators if o.order_kind == "lower_impact" and o.deadline_day >= as_of_day),
        key=lambda o: (o.deadline_day, o.authorization_id),
    )
    for creator in lower:
        destination_options: list[tuple[int, str, list[MatcherOrder]]] = []
        for destination in sorted(creator.accepted_destinations):
            candidates = [
                matcher for matcher in sorted(matchers, key=lambda m: (m.deadline_day, m.authorization_id))
                if matcher.deadline_day >= as_of_day
                and creator.source_side in matcher.accepted_source_sides
                and destination in matcher.accepted_destinations
                and matcher_remaining[matcher.authorization_id] > 0
            ]
            destination_options.append((sum(matcher_remaining[m.authorization_id] for m in candidates), destination, candidates))
        destination_options.sort(key=lambda option: (-option[0], option[1]))
        _, destination, compatible = destination_options[0] if destination_options else (0, "", [])
        if not compatible:
            continue
        if creator.addon_bps_required == 0:
            principal_capacity = creator.amount_cents
        else:
            addon_available = sum(matcher_remaining[m.authorization_id] for m in compatible)
            principal_capacity = addon_available * 10000 // creator.addon_bps_required
        principal = min(creator.amount_cents, principal_capacity)
        if (not creator.allow_partial and principal != creator.amount_cents) or principal < creator.minimum_fill_cents:
            continue
        addon_needed = math.ceil(principal * creator.addon_bps_required / 10000)
        contributions: list[str] = []
        remaining_addon = addon_needed
        for matcher in compatible:
            take = min(matcher_remaining[matcher.authorization_id], remaining_addon)
            if take:
                matcher_remaining[matcher.authorization_id] -= take
                remaining_addon -= take
                contributions.append(matcher.authorization_id)
            if remaining_addon == 0:
                break
        if remaining_addon:
            raise AssertionError("computed principal capacity exceeded matcher cash")
        fills.append(Fill(
            batch_id=f"lower:{destination}:{creator.authorization_id}",
            creator_authorization_id=creator.authorization_id,
            matcher_authorization_ids=tuple(contributions),
            destination=destination,
            principal_cents=principal,
            addon_cents=addon_needed,
            classification="rescued" if creator.baseline_class != "high_impact" else "within_high_impact",
        ))
        cleared_creator_ids.add(creator.authorization_id)

    planned = sum(order.amount_cents for order in creators)
    cleared = sum(fill.principal_cents for fill in fills)
    addon = sum(fill.addon_cents for fill in fills)
    rescued = sum(fill.principal_cents for fill in fills if fill.classification == "rescued")
    reallocation = sum(fill.principal_cents for fill in fills if fill.classification == "within_high_impact")
    if cleared != rescued + reallocation:
        raise AssertionError("redirect classification does not conserve cleared principal")
    if len(cleared_creator_ids) != len({fill.creator_authorization_id for fill in fills}):
        raise AssertionError("a source authorization cleared twice")
    return ClearingResult(
        fills=tuple(fills), planned_principal_cents=planned, cleared_principal_cents=cleared,
        addon_cents=addon, rescued_cents=rescued, reallocation_cents=reallocation,
        unmatched_fallback_cents=planned - cleared,
    )
