from __future__ import annotations

import hashlib
import uuid
from dataclasses import MISSING, asdict, dataclass, field, fields, is_dataclass
from datetime import UTC, datetime
from typing import Any


def new_id() -> str:
    return str(uuid.uuid4())


def stable_id(*parts: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "|".join(parts)))


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class ValidationError(ValueError):
    pass


class ModelMixin:
    required_fields: tuple[str, ...] = ()

    @classmethod
    def validate_dict(cls, data: dict[str, Any]) -> "ModelMixin":
        if not isinstance(data, dict):
            raise ValidationError(f"{cls.__name__} requires an object")
        required = cls.required_fields or tuple(
            item.name for item in fields(cls) if item.default is MISSING and item.default_factory is MISSING
        )
        missing = [name for name in required if name not in data]
        if missing:
            raise ValidationError(f"{cls.__name__} missing fields: {', '.join(missing)}")
        kwargs = {}
        for dataclass_field in fields(cls):
            if dataclass_field.name in data:
                kwargs[dataclass_field.name] = data[dataclass_field.name]
        return cls(**kwargs)  # type: ignore[misc]

    def to_dict(self) -> dict[str, Any]:
        return _to_plain(self)


def _to_plain(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _to_plain(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_to_plain(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_plain(item) for key, item in value.items()}
    return value


@dataclass
class CandidatePost(ModelMixin):
    id: str
    x_post_id: str
    text: str
    author_id: str
    lang: str = "en"
    status: str = "NEW"
    canonical_hash: str = ""
    note_tweet: dict[str, Any] = field(default_factory=dict)
    referenced_posts: list[dict[str, Any]] = field(default_factory=list)
    quoted_posts: list[dict[str, Any]] = field(default_factory=list)
    replied_to_posts: list[dict[str, Any]] = field(default_factory=list)
    media_metadata: list[dict[str, Any]] = field(default_factory=list)
    suggested_source_links_with_counts: list[dict[str, Any]] = field(default_factory=list)
    note_request_suggestions: list[dict[str, Any]] = field(default_factory=list)
    normalized_context: dict[str, Any] = field(default_factory=dict)
    platform_context: dict[str, Any] = field(default_factory=dict)
    audience_context: dict[str, Any] = field(default_factory=dict)
    media_dependency: dict[str, Any] = field(default_factory=dict)
    high_stakes: dict[str, Any] = field(default_factory=dict)
    abstention_guard: dict[str, Any] = field(default_factory=dict)
    freshness_lifecycle: dict[str, Any] = field(default_factory=dict)
    retention_policy: dict[str, Any] = field(default_factory=dict)
    feed_strategy: dict[str, Any] = field(default_factory=dict)
    artifact_graph: dict[str, Any] = field(default_factory=dict)
    state_machine: dict[str, Any] = field(default_factory=dict)
    crowd_signal_filter: dict[str, Any] = field(default_factory=dict)
    atomic_claim_graph: dict[str, Any] = field(default_factory=dict)
    source_authority_policy: dict[str, Any] = field(default_factory=dict)
    topic_coverage: dict[str, Any] = field(default_factory=dict)
    credential_scope: dict[str, Any] = field(default_factory=dict)
    scheduler_decision: dict[str, Any] = field(default_factory=dict)
    duplicate_of: str | None = None
    created_at: str = field(default_factory=now_iso)


@dataclass
class Claim(ModelMixin):
    id: str
    candidate_id: str
    text: str
    checkability_score: float
    sourceability_hint: str
    opinion_sarcasm_flag: bool
    abstain_reasons: list[str] = field(default_factory=list)
    status: str = "CHECKABLE"


@dataclass
class EvidenceSource(ModelMixin):
    id: str
    candidate_id: str
    url: str
    title: str
    publisher: str
    source_type: str
    suggested_count: int = 0
    reliability_score: float = 0.0
    relevance_score: float = 0.0
    untrusted_input: bool = True


@dataclass
class EvidenceCard(ModelMixin):
    id: str
    candidate_id: str
    claim_id: str
    source_id: str
    url: str
    title: str
    publisher: str
    source_type: str
    date: str
    snippet: str
    retrieved_at: str = field(default_factory=now_iso)
    reliability_score: float = 0.0
    directness_score: float = 0.0
    timeliness_score: float = 0.0
    contradiction_score: float = 0.0
    coverage_score: float = 0.0
    approved: bool = False
    rejection_reasons: list[str] = field(default_factory=list)


@dataclass
class DraftSupportMap(ModelMixin):
    id: str
    draft_id: str
    support_map_json: dict[str, list[str]]


@dataclass
class DraftNote(ModelMixin):
    id: str
    candidate_id: str
    text: str
    status: str = "DRAFTED"
    exact_text_hash: str = ""
    factual_sentences: list[str] = field(default_factory=list)
    support_map_json: dict[str, list[str]] = field(default_factory=dict)
    evidence_brief: str = ""
    evidence_report: dict[str, Any] = field(default_factory=dict)
    cross_perspective: dict[str, Any] = field(default_factory=dict)
    writing_opportunity: dict[str, Any] = field(default_factory=dict)
    methodology: dict[str, Any] = field(default_factory=dict)
    format_validation: dict[str, Any] = field(default_factory=dict)
    adversarial_review: dict[str, Any] = field(default_factory=dict)
    prediction_ledger: dict[str, Any] = field(default_factory=dict)
    approval_record: dict[str, Any] = field(default_factory=dict)
    central_gate_decision: dict[str, Any] = field(default_factory=dict)
    model_contract: dict[str, Any] = field(default_factory=dict)
    operator_feedback: list[dict[str, Any]] = field(default_factory=list)
    operator_approved: bool = False
    operator_override_reason: str | None = None
    created_at: str = field(default_factory=now_iso)

    def __post_init__(self) -> None:
        if not self.exact_text_hash:
            self.exact_text_hash = sha256_text(self.text)

    def support_map_covers_all_factual_sentences(self) -> bool:
        if not self.factual_sentences:
            return False
        for sentence in self.factual_sentences:
            source_ids = self.support_map_json.get(sentence)
            if not source_ids or not all(isinstance(source_id, str) and source_id for source_id in source_ids):
                return False
        return True


@dataclass
class InternalScore(ModelMixin):
    id: str
    draft_id: str
    grounding_pass: bool
    neutrality_score: float
    helpfulness_probability: float
    stability_risk: float
    source_quality_score: float
    high_severity_issues: list[str] = field(default_factory=list)
    overclaiming_score: float = 0.0
    missing_context_score: float = 0.0

    def has_high_severity_issue(self) -> bool:
        return bool(self.high_severity_issues)


@dataclass
class XEvaluationResult(ModelMixin):
    id: str
    draft_id: str
    candidate_id: str
    post_id: str
    exact_text_hash: str
    claim_opinion_score: float
    url_validity_score: float
    harassment_abuse_score: float
    helpfulness_score: float
    raw: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=now_iso)

    def exists_for_exact_text(self, draft_id: str, exact_text_hash: str) -> bool:
        return self.draft_id == draft_id and self.exact_text_hash == exact_text_hash


@dataclass
class Submission(ModelMixin):
    id: str
    draft_id: str
    candidate_id: str
    post_id: str
    note_text: str
    exact_text_hash: str
    test_mode: bool
    status: str
    x_response: dict[str, Any] = field(default_factory=dict)
    gate_snapshot: dict[str, Any] = field(default_factory=dict)
    lifecycle_snapshot: dict[str, Any] = field(default_factory=dict)
    idempotency_key: str = ""
    approval_record: dict[str, Any] = field(default_factory=dict)
    central_gate_decision: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=now_iso)


@dataclass
class NotesWrittenSnapshot(ModelMixin):
    id: str
    note_id: str
    candidate_id: str
    created_at: str
    crh: bool
    crnh: bool
    claim_opinion: str
    url_validity: str
    harassment_abuse: str
    helpfulness: str
    nmr: bool = False
    test_result: str = "passed"
    scoring_status: str = "scored"


@dataclass
class AdmissionWindow(ModelMixin):
    id: str
    window_size: int
    claim_opinion_high_rate: float
    claim_opinion_low_rate: float
    url_validity_high_rate: float
    harassment_abuse_high_rate: float
    eligible_boolean: bool
    blockers: list[str]
    raw_inputs: dict[str, Any]
    created_at: str = field(default_factory=now_iso)


@dataclass
class WritingLimitSnapshot(ModelMixin):
    id: str
    wl: int
    nh_5: int
    nh_10: int
    hr_r: float
    hr_100: float
    hr_14d: float
    hr_l: float
    dn_30: int
    t: int
    total_notes: int
    estimated_writing_limit: int
    feed_size_eligibility: dict[str, bool]
    writing_impact_90d: dict[str, Any]
    formulas: dict[str, str]
    raw_inputs: dict[str, Any]
    created_at: str = field(default_factory=now_iso)


@dataclass
class PromptVersion(ModelMixin):
    id: str
    name: str
    version: str
    strict_json_schema: dict[str, Any]
    created_at: str = field(default_factory=now_iso)


@dataclass
class AuditEvent(ModelMixin):
    id: str
    event_type: str
    entity_type: str
    entity_id: str
    message: str
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=now_iso)


@dataclass
class CostLedgerEntry(ModelMixin):
    id: str
    provider: str
    action: str
    estimated_cost_usd: float
    entity_id: str
    created_at: str = field(default_factory=now_iso)
    metadata: dict[str, Any] = field(default_factory=dict)
