from __future__ import annotations

from dataclasses import dataclass, field

from app.models.records import CandidatePost, DraftNote, InternalScore, XEvaluationResult, sha256_text
from app.schemas.api import GateResult
from app.services.costs import CostLedger
from app.settings import Settings


@dataclass
class ProductionReadinessGuard:
    settings: Settings
    admission_ready: bool

    def allows_non_test_write(self) -> bool:
        return (
            self.settings.allow_non_test_mode_write
            and self.admission_ready
            and self.settings.data_use_scope_allowed()
            and self.settings.operational_evals_scope_allowed()
            and self.settings.bot_identity_configured()
        )


@dataclass
class SubmissionGate:
    settings: Settings
    cost_ledger: CostLedger
    readiness_guard: ProductionReadinessGuard
    extra_blockers: list[str] = field(default_factory=list)

    def evaluate(
        self,
        candidate: CandidatePost,
        draft: DraftNote | None,
        internal_score: InternalScore | None,
        x_evaluation: XEvaluationResult | None,
        test_mode: bool,
    ) -> GateResult:
        checks = {}
        blockers = list(self.extra_blockers)
        checks["candidate_status_allowed"] = candidate.status not in {
            "DUPLICATE",
            "ALREADY_HAS_MATCHED_SHOWN_NOTE",
            "NO_NOTE",
            "HELD_FOR_OPERATOR",
            "BLOCKED",
        }
        checks["draft_reviewed"] = draft is not None and draft.status == "REVIEWED"
        checks["operator_approved"] = draft is not None and draft.operator_approved is True
        checks["support_map_complete"] = draft is not None and draft.support_map_covers_all_factual_sentences()
        checks["grounding_pass"] = internal_score is not None and internal_score.grounding_pass is True
        checks["no_high_severity_issue"] = internal_score is not None and not internal_score.has_high_severity_issue()
        checks["neutrality_threshold"] = internal_score is not None and internal_score.neutrality_score >= self.settings.min_neutrality_score
        checks["helpfulness_or_override"] = (
            internal_score is not None
            and draft is not None
            and (internal_score.helpfulness_probability >= self.settings.min_helpfulness_probability or bool(draft.operator_override_reason))
        )
        current_text_hash = sha256_text(draft.text) if draft is not None else ""
        checks["draft_hash_current"] = draft is not None and draft.exact_text_hash == current_text_hash
        checks["x_evaluation_exact_text"] = (
            x_evaluation is not None
            and draft is not None
            and x_evaluation.exists_for_exact_text(draft.id, current_text_hash)
        )
        checks["x_claim_opinion_threshold"] = x_evaluation is not None and x_evaluation.claim_opinion_score >= self.settings.min_claim_opinion_score
        checks["cost_budget"] = self.cost_ledger.within_budget()
        checks["data_use_scope_allowed"] = self.settings.data_use_scope_allowed()
        checks["operational_evals_scope_allowed"] = self.settings.operational_evals_scope_allowed()
        checks["bot_identity_configured"] = self.settings.bot_identity_configured()
        checks["test_or_production_readiness"] = test_mode is True or self.readiness_guard.allows_non_test_write()
        checks["emergency_stop_clear"] = not self.settings.emergency_stop_external_writes
        checks["abstention_redundancy_pass"] = not candidate.abstention_guard or candidate.abstention_guard.get("decision") == "PASS"
        checks["media_dependency_pass"] = not candidate.media_dependency or candidate.media_dependency.get("decision") == "PASS"
        checks["high_stakes_pass"] = not candidate.high_stakes or candidate.high_stakes.get("decision") == "PASS"
        checks["audience_context_pass"] = not candidate.audience_context or candidate.audience_context.get("status") == "PASS"
        checks["evidence_freshness_pass"] = (
            not candidate.freshness_lifecycle or candidate.freshness_lifecycle.get("freshness_status") == "PASS"
        )
        checks["cross_perspective_helpfulness_pass"] = (
            draft is not None and bool(draft.cross_perspective) and draft.cross_perspective.get("status") == "PASS"
        )
        checks["writing_opportunity_allow_now"] = (
            draft is not None and bool(draft.writing_opportunity) and draft.writing_opportunity.get("decision") == "ALLOW_NOW"
        )

        labels = {
            "candidate_status_allowed": "Candidate status blocks submission",
            "draft_reviewed": "Draft must be reviewed before submission",
            "operator_approved": "Operator approval is required",
            "support_map_complete": "Every factual sentence must map to at least one evidence source",
            "draft_hash_current": "Draft text changed after its exact text hash was recorded",
            "grounding_pass": "Internal grounding critique did not pass",
            "no_high_severity_issue": "High-severity critique issue blocks submission",
            "neutrality_threshold": "Neutrality score is below threshold",
            "helpfulness_or_override": "Helpfulness probability is below threshold and no override reason is present",
            "x_evaluation_exact_text": "X evaluate_note result for exact draft text is required",
            "x_claim_opinion_threshold": "X ClaimOpinion score is below threshold",
            "cost_budget": "Cost guard is over budget",
            "data_use_scope_allowed": "Community Notes API data scope must be solely Community Notes AI note writing",
            "operational_evals_scope_allowed": "Operational evals must be directly necessary to operate the note writer",
            "bot_identity_configured": "Track B bot profile disclosure and responsible party are required",
            "test_or_production_readiness": "Non-test submissions require explicit enablement and readiness",
            "emergency_stop_clear": "Emergency stop blocks all external writes",
            "abstention_redundancy_pass": "Abstention/redundancy guard blocks this candidate",
            "media_dependency_pass": "Media-dependent claim requires approved multimodal review before submission",
            "high_stakes_pass": "High-stakes domain routing requirements are not satisfied",
            "audience_context_pass": "Audience/context fit is not sufficient for submission",
            "evidence_freshness_pass": "Evidence freshness or lifecycle checks are not satisfied",
            "cross_perspective_helpfulness_pass": "Cross-perspective helpfulness precheck is not satisfied",
            "writing_opportunity_allow_now": "Writing opportunity ranker did not prioritize this candidate for submission",
        }
        for key, passed in checks.items():
            if not passed:
                blockers.append(labels[key])
        return GateResult(can_submit=not blockers, blockers=blockers, checks=checks)
