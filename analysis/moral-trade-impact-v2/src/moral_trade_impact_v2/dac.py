from __future__ import annotations

import math
from dataclasses import dataclass, field


def gross_threshold_cents(target_cents: int, surcharge_bps: int) -> int:
    if target_cents <= 0 or not 200 <= surcharge_bps <= 1500:
        raise ValueError("invalid DAC target or surcharge")
    surcharge = target_cents * surcharge_bps
    if surcharge % 10000:
        raise ValueError("fixture target must produce an exact-cent surcharge")
    return target_cents + surcharge // 10000


def bonus_rate_bps(day: int, deadline_day: int, schedule: str = "linear_10_to_2") -> int:
    if deadline_day <= 0 or not 0 <= day <= deadline_day:
        raise ValueError("authorization day outside pool window")
    schedules = {
        "linear_10_to_2": (1000, 200, 1.0),
        "linear_5_to_1": (500, 100, 1.0),
        "linear_15_to_2": (1500, 200, 1.0),
        "front_loaded_nonlinear": (1000, 200, 0.45),
    }
    if schedule not in schedules:
        raise ValueError("unknown bonus schedule")
    start, end, exponent = schedules[schedule]
    progress = (day / deadline_day) ** exponent
    return round(start - (start - end) * progress)


@dataclass(frozen=True)
class PledgeRequest:
    authorization_id: str
    contributor_id: str
    amount_cents: int
    authorization_day: int
    valid: bool = True
    allow_partial: bool = True


@dataclass(frozen=True)
class AcceptedPledge:
    authorization_id: str
    contributor_id: str
    principal_cents: int
    bonus_rate_bps: int
    maximum_bonus_cents: int


@dataclass
class ReserveLedger:
    reserve_cash_cents: int
    locked_liability_cents: int = 0
    bonus_paid_cents: int = 0
    surcharge_inflow_cents: int = 0

    @property
    def free_reserve_cents(self) -> int:
        return self.reserve_cash_cents - self.locked_liability_cents

    def lock(self, liability_cents: int) -> bool:
        if liability_cents < 0:
            raise ValueError("negative liability")
        if self.locked_liability_cents + liability_cents > self.reserve_cash_cents:
            return False
        self.locked_liability_cents += liability_cents
        return True

    def release(self, liability_cents: int) -> None:
        if liability_cents > self.locked_liability_cents:
            raise ValueError("cannot release more than locked")
        self.locked_liability_cents -= liability_cents

    def pay_bonus(self, liability_cents: int) -> None:
        self.release(liability_cents)
        if liability_cents > self.reserve_cash_cents:
            raise AssertionError("reserve cannot pay promised bonus")
        self.reserve_cash_cents -= liability_cents
        self.bonus_paid_cents += liability_cents

    def add_surcharge(self, surcharge_cents: int) -> None:
        if surcharge_cents < 0:
            raise ValueError("negative surcharge")
        self.reserve_cash_cents += surcharge_cents
        self.surcharge_inflow_cents += surcharge_cents


@dataclass
class DACPool:
    pool_id: str
    target_cents: int
    surcharge_bps: int
    deadline_day: int
    bonus_schedule: str = "linear_10_to_2"
    accepted: list[AcceptedPledge] = field(default_factory=list)
    waiting_or_rejected_cents: int = 0
    invalid_cents: int = 0
    settled: bool = False

    @property
    def gross_threshold_cents(self) -> int:
        return gross_threshold_cents(self.target_cents, self.surcharge_bps)

    @property
    def pledged_principal_cents(self) -> int:
        return sum(pledge.principal_cents for pledge in self.accepted)

    def authorize(self, request: PledgeRequest, reserve: ReserveLedger) -> bool:
        if self.settled:
            raise ValueError("settled pool cannot accept pledges")
        if request.amount_cents <= 0:
            raise ValueError("pledge must be positive")
        if any(pledge.authorization_id == request.authorization_id for pledge in self.accepted):
            raise ValueError("authorization cannot clear twice")
        if not request.valid or request.authorization_day > self.deadline_day:
            self.invalid_cents += request.amount_cents
            return False
        remaining = self.gross_threshold_cents - self.pledged_principal_cents
        if remaining <= 0:
            self.waiting_or_rejected_cents += request.amount_cents
            return False
        principal = min(request.amount_cents, remaining)
        if not request.allow_partial and principal != request.amount_cents:
            self.waiting_or_rejected_cents += request.amount_cents
            return False
        rate = bonus_rate_bps(request.authorization_day, self.deadline_day, self.bonus_schedule)
        liability = math.ceil(principal * rate / 10000)
        if not reserve.lock(liability):
            self.waiting_or_rejected_cents += request.amount_cents
            return False
        self.accepted.append(AcceptedPledge(
            authorization_id=request.authorization_id,
            contributor_id=request.contributor_id,
            principal_cents=principal,
            bonus_rate_bps=rate,
            maximum_bonus_cents=liability,
        ))
        if principal < request.amount_cents:
            self.waiting_or_rejected_cents += request.amount_cents - principal
        return True

    def settle(self, reserve: ReserveLedger) -> dict[str, int | str]:
        if self.settled:
            raise ValueError("pool settles exactly once")
        self.settled = True
        liability = sum(pledge.maximum_bonus_cents for pledge in self.accepted)
        if self.pledged_principal_cents == self.gross_threshold_cents:
            surcharge = self.gross_threshold_cents - self.target_cents
            reserve.release(liability)
            reserve.add_surcharge(surcharge)
            return {
                "status": "success",
                "project_receipt_cents": self.target_cents,
                "surcharge_cents": surcharge,
                "principal_returned_cents": 0,
                "bonus_paid_cents": 0,
                "liability_released_cents": liability,
            }
        reserve.pay_bonus(liability)
        return {
            "status": "lapse",
            "project_receipt_cents": 0,
            "surcharge_cents": 0,
            "principal_returned_cents": self.pledged_principal_cents,
            "bonus_paid_cents": liability,
            "liability_released_cents": 0,
        }


def coverage_controller_rate(previous_rate: float, free_reserve_ratio: float, target_free_ratio: float = 0.45) -> float:
    return min(0.15, max(0.02, previous_rate + 0.04 * (target_free_ratio - free_reserve_ratio)))


def stress_percentile_rate(projected_liability: float, reserve_cash: float, stress_percentile: float = 0.95) -> float:
    if reserve_cash <= 0:
        return 0.15
    stress_multiplier = 1.0 + (stress_percentile - 0.5)
    coverage_gap = max(projected_liability * stress_multiplier / reserve_cash - 1.0, 0.0)
    return min(0.15, max(0.02, 0.02 + 0.13 * min(coverage_gap, 1.0)))

