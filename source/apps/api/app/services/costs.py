from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.records import CostLedgerEntry, new_id
from app.settings import Settings


@dataclass
class CostSummary:
    daily_total_usd: float
    monthly_total_usd: float
    daily_budget_usd: float
    monthly_budget_usd: float
    within_budget: bool
    blockers: list[str]
    local_call_count: int = 0
    usage_api_daily_post_count: int = 0
    usage_api_monthly_post_count: int = 0
    usage_api_reconciled: bool = False
    developer_console_reconciliation_required: bool = True
    developer_console_reconciled: bool = False
    deduplication_soft_guarantee: bool = True

    def to_dict(self) -> dict:
        return {
            "daily_total_usd": round(self.daily_total_usd, 6),
            "monthly_total_usd": round(self.monthly_total_usd, 6),
            "daily_budget_usd": self.daily_budget_usd,
            "monthly_budget_usd": self.monthly_budget_usd,
            "within_budget": self.within_budget,
            "blockers": self.blockers,
            "local_call_count": self.local_call_count,
            "usage_api_daily_post_count": self.usage_api_daily_post_count,
            "usage_api_monthly_post_count": self.usage_api_monthly_post_count,
            "usage_api_reconciled": self.usage_api_reconciled,
            "developer_console_reconciliation_required": self.developer_console_reconciliation_required,
            "developer_console_reconciled": self.developer_console_reconciled,
            "deduplication_soft_guarantee": self.deduplication_soft_guarantee,
        }


class CostLedger:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.entries: list[CostLedgerEntry] = []
        self.usage_api_snapshot: dict | None = None
        self.developer_console_checked_at: str | None = None
        self.on_entry = None
        self.on_state_change = None

    def log(self, provider: str, action: str, estimated_cost_usd: float, entity_id: str, metadata: dict | None = None) -> CostLedgerEntry:
        entry = CostLedgerEntry(
            id=new_id(),
            provider=provider,
            action=action,
            estimated_cost_usd=estimated_cost_usd,
            entity_id=entity_id,
            metadata=metadata or {},
        )
        self.entries.append(entry)
        if self.on_entry:
            self.on_entry(entry)
        return entry

    def reconcile_usage_api(self, snapshot: dict) -> None:
        self.usage_api_snapshot = {
            "source": snapshot.get("source", "unknown"),
            "daily_post_consumption": int(snapshot.get("daily_post_consumption", 0)),
            "monthly_post_consumption": int(snapshot.get("monthly_post_consumption", 0)),
            "deduplication_soft_guarantee": bool(snapshot.get("deduplication_soft_guarantee", True)),
            "received_at": datetime.now(UTC).isoformat(),
        }
        if self.on_state_change:
            self.on_state_change()

    def mark_developer_console_reconciled(self, checked_at: str | None = None) -> None:
        self.developer_console_checked_at = checked_at or datetime.now(UTC).isoformat()
        if self.on_state_change:
            self.on_state_change()

    def summary(self) -> CostSummary:
        now = datetime.now(UTC)
        day_prefix = now.date().isoformat()
        month_prefix = now.strftime("%Y-%m")
        daily = sum(entry.estimated_cost_usd for entry in self.entries if entry.created_at.startswith(day_prefix))
        monthly = sum(entry.estimated_cost_usd for entry in self.entries if entry.created_at.startswith(month_prefix))
        blockers = []
        if daily > self.settings.daily_x_api_budget_usd:
            blockers.append("Daily X API budget exceeded")
        if monthly > self.settings.monthly_x_api_budget_usd:
            blockers.append("Monthly X API budget exceeded")
        usage_daily = int((self.usage_api_snapshot or {}).get("daily_post_consumption", 0))
        usage_monthly = int((self.usage_api_snapshot or {}).get("monthly_post_consumption", 0))
        return CostSummary(
            daily_total_usd=daily,
            monthly_total_usd=monthly,
            daily_budget_usd=self.settings.daily_x_api_budget_usd,
            monthly_budget_usd=self.settings.monthly_x_api_budget_usd,
            within_budget=not blockers,
            blockers=blockers,
            local_call_count=len(self.entries),
            usage_api_daily_post_count=usage_daily,
            usage_api_monthly_post_count=usage_monthly,
            usage_api_reconciled=self.usage_api_snapshot is not None,
            developer_console_reconciliation_required=self.settings.developer_console_reconciliation_required,
            developer_console_reconciled=bool(self.developer_console_checked_at),
            deduplication_soft_guarantee=bool((self.usage_api_snapshot or {}).get("deduplication_soft_guarantee", True)),
        )

    def within_budget(self) -> bool:
        return self.summary().within_budget

    def to_dict(self) -> dict:
        return {
            "summary": self.summary().to_dict(),
            "entries": [entry.to_dict() for entry in self.entries],
            "usage_api_snapshot": self.usage_api_snapshot,
            "developer_console_checked_at": self.developer_console_checked_at,
        }
