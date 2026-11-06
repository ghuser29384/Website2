from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class HealthResponse:
    status: str
    app_env: str
    live_x_api_enabled: bool
    non_test_writes_enabled: bool


@dataclass
class GateResult:
    can_submit: bool
    blockers: list[str] = field(default_factory=list)
    checks: dict[str, bool] = field(default_factory=dict)
    decision: dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowResult:
    status: str
    entity: dict[str, Any]
    related: dict[str, Any] = field(default_factory=dict)
