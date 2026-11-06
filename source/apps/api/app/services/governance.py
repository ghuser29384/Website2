from __future__ import annotations

import difflib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.models.records import (
    CandidatePost,
    Claim,
    DraftNote,
    EvidenceCard,
    EvidenceSource,
    InternalScore,
    WritingLimitSnapshot,
    XEvaluationResult,
    now_iso,
    sha256_text,
    stable_id,
)
from app.services.costs import CostSummary
from app.settings import Settings


def _lower_blob(*values: Any) -> str:
    parts: list[str] = []
    for value in values:
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, dict):
            parts.extend(str(item) for item in value.values())
        elif isinstance(value, list):
            for item in value:
                parts.append(_lower_blob(item))
        elif value is not None:
            parts.append(str(value))
    return " ".join(parts).lower()


def _parse_date(value: str) -> datetime | None:
    if not value:
        return None
    for candidate in (value, value.replace("Z", "+00:00")):
        try:
            parsed = datetime.fromisoformat(candidate)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(f"{value}T00:00:00+00:00")
    except ValueError:
        return None


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


@dataclass
class PhasedDeliveryAndComplexityBudget:
    settings: Settings

    def status(self) -> dict:
        live_write_phase = "track_b_test_mode" if not self.settings.allow_non_test_mode_write else "track_b_non_test_enabled"
        return {
            "policy_version": self.settings.governance_policy_version,
            "current_phase": live_write_phase,
            "tracks": {
                "track_a_manual_export": {
                    "enabled": True,
                    "requires_express_consent": self.settings.track_a_requires_express_consent,
                },
                "track_b_api_native": {
                    "read_enabled": self.settings.allow_live_x_api,
                    "test_mode_write_possible": self.settings.allow_live_x_write,
                    "non_test_write_possible": self.settings.allow_live_x_write and self.settings.allow_non_test_mode_write,
                },
            },
            "complexity_budget": {
                "live_search": self.settings.allow_live_search,
                "live_llm": self.settings.allow_live_llm,
                "approved_multimodal_workflow": self.settings.approved_multimodal_workflow_enabled,
                "workers_must_remain_nonblocking": True,
            },
        }


@dataclass
class LatencySLOAndGracefulDegradationService:
    settings: Settings

    def stage_budget(self, stage: str) -> dict:
        budgets = {
            "sync": 6.0,
            "analyze": 8.0,
            "retrieve": 15.0,
            "draft": 12.0,
            "critique": 5.0,
            "evaluate_x": 10.0,
            "submit": 6.0,
        }
        budget = budgets.get(stage, 8.0)
        return {
            "stage": stage,
            "budget_seconds": budget,
            "degradation": "hold_for_operator_if_budget_exceeded",
            "nonblocking_worker_required": True,
        }

    def status(self) -> dict:
        return {
            "slo_version": "latency-slo-v1",
            "stage_budgets": {stage: self.stage_budget(stage)["budget_seconds"] for stage in ["sync", "analyze", "retrieve", "draft", "critique", "evaluate_x", "submit"]},
            "graceful_degradation": "prefer abstain/hold/defer over slow or partial external writes",
        }


class DurableArtifactGraphAndCandidateStateMachine:
    ALLOWED_TRANSITIONS = {
        "NEW": {"ANALYZED", "NO_NOTE", "HELD_FOR_OPERATOR"},
        "ANALYZED": {"RETRIEVED", "HELD_FOR_OPERATOR", "NO_NOTE"},
        "RETRIEVED": {"DRAFTED", "HELD_FOR_OPERATOR"},
        "DRAFTED": {"REVIEWED", "HELD_FOR_OPERATOR"},
        "REVIEWED": {"SUBMITTED_TEST", "SUBMITTED_LIVE", "HELD_FOR_OPERATOR"},
        "HELD_FOR_OPERATOR": {"ANALYZED", "RETRIEVED", "DRAFTED", "NO_NOTE"},
        "NO_NOTE": set(),
        "SUBMITTED_TEST": set(),
        "SUBMITTED_LIVE": set(),
    }

    def initialize(self, candidate: CandidatePost, raw: dict) -> tuple[dict, dict]:
        artifact = self.artifact(
            "raw_candidate",
            candidate.id,
            {
                "x_post_id": candidate.x_post_id,
                "canonical_hash": candidate.canonical_hash,
                "raw_payload_hash": sha256_text(_canonical_json(raw)),
            },
        )
        return {
            "schema": "DurableArtifactGraph",
            "version": "artifact-graph-v1",
            "root_candidate_id": candidate.id,
            "artifacts": [artifact],
            "edges": [],
        }, self.state(candidate.status, "initialized", [artifact["id"]])

    def artifact(self, artifact_type: str, entity_id: str, payload: dict) -> dict:
        content_hash = sha256_text(_canonical_json({"artifact_type": artifact_type, "entity_id": entity_id, "payload": payload}))
        return {
            "id": stable_id("artifact", artifact_type, entity_id, content_hash),
            "artifact_type": artifact_type,
            "entity_id": entity_id,
            "content_hash": content_hash,
            "created_at": now_iso(),
        }

    def state(self, status: str, reason: str, artifact_ids: list[str] | None = None) -> dict:
        return {
            "schema": "CandidateStateMachine",
            "version": "state-machine-v1",
            "status": status,
            "allowed_next_states": sorted(self.ALLOWED_TRANSITIONS.get(status, set())),
            "reason": reason,
            "linked_artifact_ids": artifact_ids or [],
            "updated_at": now_iso(),
        }

    def transition(self, candidate: CandidatePost, new_status: str, reason: str, artifacts: list[dict] | None = None) -> dict:
        artifacts = artifacts or []
        previous = candidate.status
        allowed = new_status == previous or new_status in self.ALLOWED_TRANSITIONS.get(previous, set()) or previous == "NEW"
        transition = {
            "id": stable_id("transition", candidate.id, previous, new_status, reason, now_iso()),
            "from": previous,
            "to": new_status,
            "allowed": allowed,
            "reason": reason,
            "linked_artifact_ids": [artifact["id"] for artifact in artifacts],
            "created_at": now_iso(),
        }
        graph = candidate.artifact_graph or {"schema": "DurableArtifactGraph", "version": "artifact-graph-v1", "root_candidate_id": candidate.id, "artifacts": [], "edges": []}
        graph.setdefault("artifacts", []).extend(artifacts)
        graph.setdefault("edges", []).append(transition)
        candidate.artifact_graph = graph
        candidate.state_machine = self.state(new_status, reason, transition["linked_artifact_ids"])
        return transition


@dataclass
class OnlineOfflineLoopSeparationAndPromotionGate:
    settings: Settings

    def status(self) -> dict:
        online_promoted = {
            "normalizer": True,
            "retrieval_fixture": True,
            "governance_gate": True,
            "live_x_read": self.settings.allow_live_x_api,
            "live_x_write": self.settings.allow_live_x_write,
            "non_test_write": self.settings.allow_non_test_mode_write and self.settings.app_env == "production",
        }
        return {
            "policy_version": "online-offline-promotion-v1",
            "offline_replay_can_mutate_live": False,
            "online_promoted_components": online_promoted,
            "promotion_requirements": [
                "offline replay pass",
                "ablation evidence",
                "policy drift clear",
                "operator approval",
                "incident stop clear",
            ],
        }

    def allows_online_mutation(self, component: str) -> dict:
        promoted = bool(self.status()["online_promoted_components"].get(component))
        return {
            "component": component,
            "status": "PASS" if promoted else "BLOCK",
            "blockers": [] if promoted else [f"{component} is not promoted for online mutation"],
        }


@dataclass
class CredentialScopeAndEnvironmentIsolationService:
    settings: Settings

    def scope_for(self, endpoint_class: str, test_mode: bool = True) -> dict:
        x_credentials_configured = self.settings.x_live_credentials_configured()
        scopes = {
            "x_read": self.settings.x_provider == "fixture" or (self.settings.allow_live_x_api and x_credentials_configured),
            "x_evaluate": self.settings.x_provider == "fixture" or (self.settings.allow_live_x_api and x_credentials_configured),
            "x_test_write": self.settings.x_provider == "fixture" or (
                self.settings.allow_live_x_api and self.settings.allow_live_x_write and x_credentials_configured
            ),
            "x_production_write": (
                self.settings.app_env == "production"
                and self.settings.x_provider == "live"
                and self.settings.allow_live_x_api
                and self.settings.allow_live_x_write
                and self.settings.allow_non_test_mode_write
                and x_credentials_configured
            ),
            "search": self.settings.search_provider == "fixture" or (self.settings.allow_live_search and bool(self.settings.brave_search_api_key)),
            "model_call": self.settings.llm_provider == "fixture" or (self.settings.allow_live_llm and bool(self.settings.openai_api_key)),
            "storage": self.settings.postgres_persistence_enabled(),
        }
        needed = "x_production_write" if endpoint_class == "x_write" and not test_mode else endpoint_class
        if endpoint_class == "x_write" and test_mode:
            needed = "x_test_write"
        blockers = []
        if not scopes.get(needed, False):
            blockers.append(f"Credential scope {needed} is not available")
        if self.settings.allow_non_test_mode_write and self.settings.app_env != "production":
            blockers.append("Production-write feature flag is present outside production")
        if self.settings.x_provider == "live" and self.settings.app_env == "local" and x_credentials_configured:
            blockers.append("Live X credentials should not be present in local/dev")
        return {
            "policy_version": "credential-scope-v1",
            "app_env": self.settings.app_env,
            "endpoint_class": endpoint_class,
            "test_mode": test_mode,
            "required_scope": needed,
            "available_scopes": scopes,
            "least_privilege_scope": needed if scopes.get(needed, False) else None,
            "account_identity": self.settings.bot_identity(),
            "status": "PASS" if not blockers else "BLOCK",
            "blockers": blockers,
        }


class RateLimitBackpressureAndWorkScheduler:
    def schedule(
        self,
        action: str,
        candidate: CandidatePost | None,
        costs: CostSummary,
        writing_limit: WritingLimitSnapshot,
        latency_budget: dict,
        priority_score: float = 0.5,
    ) -> dict:
        blockers = []
        decision = "ALLOW"
        if not costs.within_budget:
            blockers.extend(costs.blockers or ["Cost budget is exhausted"])
        if action in {"submit", "write_note"} and writing_limit.estimated_writing_limit < 1:
            blockers.append("Writing limit is exhausted")
        if priority_score < 0.25 and action not in {"submit", "evaluate_note"}:
            decision = "DEFER_LOW_PRIORITY"
        if blockers:
            decision = "BLOCK"
        return {
            "policy_version": "rate-limit-backpressure-v1",
            "action": action,
            "candidate_id": candidate.id if candidate else "",
            "priority_score": round(priority_score, 3),
            "decision": decision,
            "blockers": blockers,
            "retry_budget": 2 if action in {"sync", "evaluate_note"} else 0,
            "latency_budget_seconds": latency_budget.get("budget_seconds"),
            "online_path_priority": "test_mode_write" if action in {"submit", "write_note"} else "normal",
            "shed_policy": "defer offline replay/deep retrieval before online test-mode writes",
        }


class ExternalCallIdempotencyAndCostLedger:
    def key(self, provider: str, endpoint: str, entity_id: str, request: dict) -> str:
        return stable_id("external-call", provider, endpoint, entity_id, sha256_text(_canonical_json(request)))

    def record(
        self,
        provider: str,
        endpoint: str,
        entity_id: str,
        request: dict,
        response: dict | None = None,
        side_effecting: bool = False,
        estimated_cost_usd: float = 0.0,
    ) -> dict:
        key = self.key(provider, endpoint, entity_id, request)
        return {
            "id": key,
            "provider": provider,
            "endpoint": endpoint,
            "entity_id": entity_id,
            "request_hash": sha256_text(_canonical_json(request)),
            "response_hash": sha256_text(_canonical_json(response or {})),
            "side_effecting": side_effecting,
            "estimated_cost_usd": estimated_cost_usd,
            "retry_count": 0,
            "billed_cost_reconciled": False,
            "created_at": now_iso(),
        }

    def duplicate_submission_status(self, submissions: list[Any], post_id: str, exact_text_hash: str, test_mode: bool) -> dict:
        matches = [
            submission.id
            for submission in submissions
            if submission.post_id == post_id and submission.exact_text_hash == exact_text_hash and submission.test_mode == test_mode
        ]
        return {
            "status": "BLOCK" if matches else "PASS",
            "duplicate_submission_ids": matches,
            "blockers": ["Duplicate note submission blocked by idempotency ledger"] if matches else [],
        }


class ModelGatewayAndPromptContractRegistry:
    def status(self, settings: Settings) -> dict:
        live_model = settings.llm_provider == "openai"
        return {
            "policy_version": "model-gateway-prompt-contract-v1",
            "provider": settings.llm_provider,
            "model": settings.llm_model or "fixture-deterministic",
            "promoted_prompt_versions": {
                "claim_extraction": "strict-json-v1",
                "draft_generation": "strict-json-v1",
            },
            "offline_experimental_prompts_can_mutate_online": False,
            "typed_schemas_required": True,
            "structured_output_validation_required": True,
            "live_model_calls_enabled": live_model and settings.allow_live_llm,
            "allowed_tools": [] if live_model else ["fixture"],
            "retention_hooks": ["redact raw X payloads", "log prompt artifact hashes", "no foundation training on X data"],
        }

    def contract_for(self, service: str, settings: Settings) -> dict:
        status = self.status(settings)
        return {
            "service": service,
            "provider": status["provider"],
            "model": status["model"],
            "prompt_version": status["promoted_prompt_versions"].get(service, "not_applicable"),
            "schema_validation": "strict_json",
            "cost_budget_usd": 0.0 if status["provider"] == "fixture" else 0.05,
            "latency_budget_seconds": 8.0,
            "artifact_hash": sha256_text(_canonical_json({"service": service, "status": status})),
        }


class CrowdSignalRobustnessFilter:
    def filter(self, candidate: CandidatePost) -> dict:
        seen_urls: set[str] = set()
        accepted_sources = []
        discounted_sources = []
        for item in candidate.suggested_source_links_with_counts:
            url = item.get("url", "")
            publisher = item.get("publisher", "")
            reasons = []
            if not url.startswith("https://"):
                reasons.append("non_https_or_missing_url")
            if url in seen_urls:
                reasons.append("repeated_url")
            if not publisher:
                reasons.append("missing_publisher")
            count = int(item.get("count", 0))
            normalized = {**item, "count": count, "untrusted_lead_only": True}
            if reasons:
                normalized["discount_reasons"] = reasons
                discounted_sources.append(normalized)
            else:
                normalized["lead_weight"] = round(min(1.0, 0.25 + count / 20), 3)
                accepted_sources.append(normalized)
            seen_urls.add(url)
        note_requests = [
            {
                **item,
                "count": int(item.get("count", 0)),
                "lead_weight": round(min(1.0, int(item.get("count", 0)) / 20), 3),
                "untrusted_lead_only": True,
            }
            for item in candidate.note_request_suggestions
        ]
        return {
            "policy_version": "crowd-signal-robustness-v1",
            "status": "PASS",
            "accepted_suggested_source_links": accepted_sources,
            "discounted_suggested_source_links": discounted_sources,
            "note_request_leads": note_requests,
            "independent_source_validation_required": True,
            "crowd_hints_are_proof": False,
        }


class SourceAuthorityPolicyRegistry:
    POLICY_VERSION = "source-authority-policy-v1"

    DOMAIN_REQUIREMENTS = {
        "health_medical": {"preferred": {"official", "institutional", "peer_reviewed"}, "min_reliability": 0.90, "max_age_days": 730},
        "election_civic": {"preferred": {"official", "primary"}, "min_reliability": 0.85, "max_age_days": 365},
        "legal_regulatory": {"preferred": {"official", "primary", "institutional"}, "min_reliability": 0.85, "max_age_days": 1095},
        "financial": {"preferred": {"official", "primary", "institutional"}, "min_reliability": 0.85, "max_age_days": 365},
        "standard": {"preferred": {"official", "primary", "institutional", "reputable"}, "min_reliability": 0.75, "max_age_days": 1095},
    }

    def status(self) -> dict:
        return {
            "policy_version": self.POLICY_VERSION,
            "source_relations": ["supports", "refutes", "partially_supports", "contextualizes", "irrelevant", "unclear"],
            "disallowed_source_classes": ["unreachable", "anonymous_content_farm", "prompt_injection_payload", "circular_platform_claim_only"],
            "false_balance_override_allowed": False,
            "requirements": self.DOMAIN_REQUIREMENTS,
        }

    def evaluate(self, candidate: CandidatePost, sources: list[EvidenceSource], cards: list[EvidenceCard]) -> dict:
        domains = candidate.high_stakes.get("domains") or ["standard"]
        requirements = [self.DOMAIN_REQUIREMENTS.get(domain, self.DOMAIN_REQUIREMENTS["standard"]) for domain in domains]
        min_reliability = max(item["min_reliability"] for item in requirements)
        preferred = set().union(*(item["preferred"] for item in requirements))
        approved = [card for card in cards if card.approved]
        approved_types = {card.source_type for card in approved}
        blockers = []
        if approved and not any(card.reliability_score >= min_reliability for card in approved):
            blockers.append("Approved evidence does not meet domain reliability floor")
        if candidate.high_stakes.get("risk_tier") == "high" and approved and not approved_types.intersection(preferred):
            blockers.append("High-stakes evidence lacks a registry-preferred source tier")
        return {
            "policy_version": self.POLICY_VERSION,
            "domains": domains,
            "preferred_source_types": sorted(preferred),
            "minimum_reliability": min_reliability,
            "approved_source_count": len(approved),
            "evaluated_source_count": len(sources),
            "status": "PASS" if not blockers else "HOLD_FOR_OPERATOR",
            "blockers": blockers,
        }


class AtomicClaimGraphAndSourceRelationMatrix:
    def build(self, candidate: CandidatePost, claims: list[Claim], cards: list[EvidenceCard]) -> dict:
        graph_id = stable_id("atomic-claim-graph", candidate.id, candidate.canonical_hash)
        atomic_claims = []
        for claim in claims:
            atomic_claims.append(
                {
                    "claim_id": claim.id,
                    "text": claim.text,
                    "status": claim.status,
                    "scope": self._scope(candidate),
                    "date_or_period": candidate.note_tweet.get("created_at", ""),
                    "jurisdictions": candidate.audience_context.get("jurisdictions", []),
                    "modality_dependency": candidate.media_dependency.get("classification", "text_only"),
                    "objectivity": "opinion_or_sarcasm" if claim.opinion_sarcasm_flag else "externally_checkable",
                    "duplicate_cluster_id": candidate.duplicate_of or stable_id("claim-cluster", claim.text.lower()),
                }
            )
        relations = []
        for card in cards:
            relation = "supports"
            if card.contradiction_score > 0.65:
                relation = "refutes"
            elif card.contradiction_score > 0.35:
                relation = "unclear"
            elif not card.approved and card.coverage_score >= 0.50:
                relation = "partially_supports"
            elif card.coverage_score < 0.35:
                relation = "irrelevant"
            relations.append(
                {
                    "relation_id": stable_id("source-relation", card.claim_id, card.source_id, relation),
                    "claim_id": card.claim_id,
                    "source_id": card.source_id,
                    "evidence_card_id": card.id,
                    "relation": relation,
                    "scores": {
                        "reliability": card.reliability_score,
                        "directness": card.directness_score,
                        "timeliness": card.timeliness_score,
                        "contradiction": card.contradiction_score,
                        "coverage": card.coverage_score,
                    },
                }
            )
        return {
            "id": graph_id,
            "schema": "AtomicClaimGraphAndSourceRelationMatrix",
            "policy_version": SourceAuthorityPolicyRegistry.POLICY_VERSION,
            "candidate_id": candidate.id,
            "atomic_claims": atomic_claims,
            "source_relations": relations,
            "support_maps_must_reference_claim_relations": True,
            "status": "PASS" if atomic_claims and (relations or all(claim.status == "ABSTAIN" for claim in claims)) else "PENDING",
        }

    def _scope(self, candidate: CandidatePost) -> str:
        if candidate.high_stakes.get("domains"):
            return ",".join(candidate.high_stakes["domains"])
        if candidate.audience_context.get("jurisdictions"):
            return ",".join(candidate.audience_context["jurisdictions"])
        return "general_public_context"


class AdversarialEvidenceAndContradictionSearchService:
    def review(self, candidate: CandidatePost, claims: list[Claim], cards: list[EvidenceCard]) -> dict:
        risk_tier = candidate.high_stakes.get("risk_tier", "standard")
        deep_pass = risk_tier == "high" or candidate.freshness_lifecycle.get("time_sensitive") is True
        conflicts = [
            {
                "claim_id": card.claim_id,
                "source_id": card.source_id,
                "url": card.url,
                "contradiction_score": card.contradiction_score,
                "rejection_reasons": card.rejection_reasons,
            }
            for card in cards
            if card.contradiction_score > 0.35
        ]
        blockers = []
        if any(item["contradiction_score"] > 0.65 for item in conflicts):
            blockers.append("Unresolved high-confidence counterevidence blocks submission")
        if deep_pass and conflicts:
            blockers.append("High-stakes or time-sensitive candidate has unresolved contradiction review")
        return {
            "policy_version": "adversarial-contradiction-v1",
            "pass_type": "deep" if deep_pass else "lightweight",
            "searched_for": ["counterevidence", "alternate explanation", "scope caveat", "date/jurisdiction mismatch", "source disagreement"],
            "unresolved_conflicts": conflicts,
            "status": "PASS" if not blockers else "HOLD_FOR_OPERATOR",
            "blockers": blockers,
        }


class NoteFormatAndPlatformConstraintValidator:
    MAX_NOTE_LENGTH = 280

    def validate(self, candidate: CandidatePost, draft: DraftNote, cards: list[EvidenceCard]) -> dict:
        blockers = []
        warnings = []
        current_hash = sha256_text(draft.text)
        if len(draft.text) > self.MAX_NOTE_LENGTH:
            blockers.append(f"Note text exceeds {self.MAX_NOTE_LENGTH} characters")
        if draft.text.strip() != draft.text or "\n\n\n" in draft.text:
            blockers.append("Note text has unsupported whitespace formatting")
        if re.search(r"<[^>]+>", draft.text):
            blockers.append("Note text contains prohibited markup")
        urls = [card.url for card in cards if card.approved]
        duplicate_urls = sorted({url for url in urls if urls.count(url) > 1})
        if duplicate_urls:
            warnings.append("Duplicate source URLs in approved evidence")
        if any(not url.startswith("https://") for url in urls):
            blockers.append("Approved source URLs must be https")
        if current_hash != draft.exact_text_hash:
            blockers.append("Draft exact_text_hash is stale")
        if not draft.support_map_covers_all_factual_sentences():
            blockers.append("Every factual sentence must have source support")
        source_ids = {card.source_id for card in cards if card.approved}
        mapped_ids = {source_id for source_ids_for_sentence in draft.support_map_json.values() for source_id in source_ids_for_sentence}
        if not mapped_ids.issubset(source_ids):
            blockers.append("Support map references sources that are not approved evidence")
        if draft.text.lower().startswith("abstain:") or draft.status in {"ABSTAIN", "HOLD_FOR_OPERATOR"}:
            blockers.append("Abstain/hold draft cannot be submitted")
        concise = len(draft.text) <= self.MAX_NOTE_LENGTH and len(draft.factual_sentences) <= 3
        if not concise:
            warnings.append("Note may be too dense for Community Notes surface")
        return {
            "policy_version": "note-format-platform-v1",
            "status": "PASS" if not blockers else "BLOCK",
            "blockers": blockers,
            "warnings": warnings,
            "note_length": len(draft.text),
            "max_note_length": self.MAX_NOTE_LENGTH,
            "exact_text_hash_current": current_hash == draft.exact_text_hash,
            "approved_source_urls": urls,
            "duplicate_urls": duplicate_urls,
            "concise_enough": concise,
        }


class PredictionCalibrationAndUncertaintyLedger:
    def record(
        self,
        candidate: CandidatePost,
        draft: DraftNote,
        internal_score: InternalScore | None,
        x_evaluation: XEvaluationResult | None,
        writing_opportunity: dict,
    ) -> dict:
        predictions = []
        def add(event: str, probability: float, features: dict, horizon: str = "next_scoring_window") -> None:
            predictions.append(
                {
                    "id": stable_id("prediction", draft.id, event),
                    "event": event,
                    "probability": round(max(0.0, min(1.0, probability)), 3),
                    "confidence_interval": [round(max(0.0, probability - 0.12), 3), round(min(1.0, probability + 0.12), 3)],
                    "horizon": horizon,
                    "feature_snapshot": features,
                    "prompt_model_version": draft.model_contract.get("prompt_version", "fixture"),
                    "gate_version": "central-policy-gate-v1",
                    "outcome": None,
                    "calibration_metric": "pending_brier",
                }
            )
        add("sourceability", 0.85 if candidate.atomic_claim_graph.get("status") == "PASS" else 0.35, {"claim_count": len(candidate.atomic_claim_graph.get("atomic_claims", []))})
        add("grounding_pass", internal_score.helpfulness_probability if internal_score else 0.25, {"internal_score": internal_score.to_dict() if internal_score else None})
        add("cross_perspective_helpfulness", draft.cross_perspective.get("score", 0.0), {"cross_perspective": draft.cross_perspective})
        add("crh_likelihood", x_evaluation.helpfulness_score if x_evaluation else 0.2, {"x_evaluation": x_evaluation.to_dict() if x_evaluation else None})
        add("stale_before_review", 0.25 if candidate.freshness_lifecycle.get("freshness_status") == "PASS" else 0.75, {"freshness": candidate.freshness_lifecycle})
        add("writing_opportunity_value", writing_opportunity.get("priority_score", 0.0), {"writing_opportunity": writing_opportunity})
        return {
            "policy_version": "prediction-calibration-v1",
            "status": "recorded",
            "threshold_changes_require_promotion_gate": True,
            "predictions": predictions,
            "summary": {
                "prediction_count": len(predictions),
                "online_updates_allowed": False,
                "calibration_metrics": ["brier", "log_loss"],
            },
        }


class BaselineComparisonAndAblationHarness:
    def status(self) -> dict:
        return {
            "policy_version": "baseline-ablation-v1",
            "status": "fixture_replay_ready",
            "baselines": [
                "manual_operator_no_copilot",
                "x_template_writer",
                "retrieval_only_drafting",
                "no_adversarial_evidence_search",
                "no_cross_perspective_precheck",
                "no_writing_opportunity_ranker",
                "prompt_variant_replay",
            ],
            "promotion_metrics": ["CRH", "CRNH", "NMR", "latency", "cost", "evidence_quality", "operator_edit_distance"],
            "advanced_modules_enabled_by_default_require_replay_evidence": True,
        }


class TopicCoverageAndSkewMonitor:
    def summarize(self, candidates: list[CandidatePost], submissions: list[Any]) -> dict:
        def incr(bucket: dict, key: str) -> None:
            bucket[key or "unknown"] = bucket.get(key or "unknown", 0) + 1

        by_status: dict[str, int] = {}
        by_lang: dict[str, int] = {}
        by_risk: dict[str, int] = {}
        by_domain: dict[str, int] = {}
        by_geo: dict[str, int] = {}
        for candidate in candidates:
            incr(by_status, candidate.status)
            incr(by_lang, candidate.lang)
            incr(by_risk, candidate.high_stakes.get("risk_tier", "standard"))
            domains = candidate.high_stakes.get("domains") or ["standard"]
            for domain in domains:
                incr(by_domain, domain)
            geos = candidate.audience_context.get("jurisdictions") or ["unspecified"]
            for geo in geos:
                incr(by_geo, geo)
        total = max(1, len(candidates))
        alerts = []
        for name, bucket in {"domain": by_domain, "geography": by_geo, "risk": by_risk}.items():
            if bucket and max(bucket.values()) / total > 0.80 and total >= 5:
                alerts.append(f"{name} distribution is concentrated; review for blind spots")
        return {
            "policy_version": "topic-coverage-skew-v1",
            "status": "PASS" if not alerts else "REVIEW",
            "candidate_count": len(candidates),
            "submission_count": len(submissions),
            "distributions": {
                "status": by_status,
                "language": by_lang,
                "risk_tier": by_risk,
                "domain": by_domain,
                "geography": by_geo,
            },
            "alerts": alerts,
            "false_balance_override_allowed": False,
            "case_level_evidence_gates_override_distribution_monitor": True,
        }


@dataclass
class ExactSubmissionPreviewAndApprovalRecord:
    settings: Settings

    def gate_input_hash(self, candidate: CandidatePost, draft: DraftNote, cards: list[EvidenceCard], test_mode: bool) -> str:
        gate_inputs = {
            "candidate_status": candidate.status,
            "post_id": candidate.x_post_id,
            "draft_hash": sha256_text(draft.text),
            "exact_text_hash": draft.exact_text_hash,
            "source_urls": sorted(card.url for card in cards if card.approved),
            "support_map": draft.support_map_json,
            "mode": "test" if test_mode else "production",
            "account_identity": self.settings.bot_identity(),
            "format_validation": draft.format_validation,
            "adversarial_review": draft.adversarial_review,
            "source_authority_policy": candidate.source_authority_policy,
            "credential_scope": candidate.credential_scope,
        }
        return sha256_text(_canonical_json(gate_inputs))

    def preview(self, candidate: CandidatePost, draft: DraftNote, cards: list[EvidenceCard], test_mode: bool, gate_snapshot: dict | None = None) -> dict:
        approved_urls = sorted(card.url for card in cards if card.approved)
        payload = {
            "post_id": candidate.x_post_id,
            "test_mode": test_mode,
            "info": {
                "text": draft.text,
                "trustworthy_sources": True,
                "misleading_tags": [],
                "is_media_note": bool(candidate.media_dependency.get("classification") == "media_dependent"),
            },
        }
        gate_input_hash = self.gate_input_hash(candidate, draft, cards, test_mode)
        payload_hash = sha256_text(_canonical_json({"payload": payload, "source_urls": approved_urls, "gate_input_hash": gate_input_hash}))
        warnings = []
        warnings.extend(draft.format_validation.get("warnings", []))
        warnings.extend(draft.adversarial_review.get("blockers", []))
        return {
            "policy_version": "exact-submission-preview-v1",
            "post_id": candidate.x_post_id,
            "draft_id": draft.id,
            "exact_note_text": draft.text,
            "source_urls": approved_urls,
            "submission_mode": "test_mode" if test_mode else "production",
            "account_identity": self.settings.bot_identity(),
            "api_payload": payload,
            "gate_snapshot": gate_snapshot or {},
            "gate_input_hash": gate_input_hash,
            "payload_hash": payload_hash,
            "unresolved_warnings": warnings,
        }

    def approve(self, candidate: CandidatePost, draft: DraftNote, cards: list[EvidenceCard], test_mode: bool, gate_snapshot: dict | None = None) -> dict:
        preview = self.preview(candidate, draft, cards, test_mode, gate_snapshot)
        return {
            **preview,
            "approval_id": stable_id("approval", draft.id, preview["payload_hash"]),
            "approved": True,
            "approved_at": now_iso(),
            "approval_signature": sha256_text(_canonical_json(preview) + self.settings.secret_key),
        }

    def validate(self, candidate: CandidatePost, draft: DraftNote, cards: list[EvidenceCard], test_mode: bool) -> dict:
        record = draft.approval_record or {}
        current = self.preview(candidate, draft, cards, test_mode)
        valid = bool(record.get("approved")) and record.get("payload_hash") == current["payload_hash"]
        blockers = [] if valid else ["Exact submission preview changed after approval; operator must re-approve"]
        return {
            "status": "PASS" if valid else "BLOCK",
            "blockers": blockers,
            "current_payload_hash": current["payload_hash"],
            "approved_payload_hash": record.get("payload_hash", ""),
            "submission_mode": current["submission_mode"],
        }


@dataclass
class CentralPolicyGatekeeper:
    settings: Settings

    def compile_decision(
        self,
        gate: Any,
        candidate: CandidatePost,
        draft: DraftNote,
        test_mode: bool,
        approval_validation: dict,
        credential_scope: dict,
        scheduler_decision: dict,
        idempotency_status: dict,
    ) -> dict:
        facts = {
            "gate_checks": gate.checks,
            "gate_blockers": gate.blockers,
            "candidate_id": candidate.id,
            "post_id": candidate.x_post_id,
            "draft_id": draft.id,
            "exact_text_hash": draft.exact_text_hash,
            "test_mode": test_mode,
            "format_validation": draft.format_validation,
            "adversarial_review": draft.adversarial_review,
            "source_authority_policy": candidate.source_authority_policy,
            "credential_scope": credential_scope,
            "scheduler_decision": scheduler_decision,
            "approval_validation": approval_validation,
            "idempotency_status": idempotency_status,
            "phase": "test_mode" if test_mode else "production",
            "policy_version": self.settings.governance_policy_version,
        }
        authorized = (
            gate.can_submit
            and approval_validation.get("status") == "PASS"
            and credential_scope.get("status") == "PASS"
            and scheduler_decision.get("decision") == "ALLOW"
            and idempotency_status.get("status") == "PASS"
        )
        decision = {
            "schema": "GateDecision",
            "gatekeeper": "CentralPolicyGatekeeper",
            "gatekeeper_version": "central-policy-gate-v1",
            "authorized": authorized,
            "blockers": sorted(set(gate.blockers + approval_validation.get("blockers", []) + credential_scope.get("blockers", []) + scheduler_decision.get("blockers", []) + idempotency_status.get("blockers", []))),
            "facts_hash": sha256_text(_canonical_json(facts)),
            "created_at": now_iso(),
        }
        decision["signature"] = sha256_text(_canonical_json(decision) + self.settings.secret_key)
        return decision


@dataclass
class PlatformAdapter:
    settings: Settings

    def from_x_payload(self, candidate: CandidatePost, raw: dict) -> dict:
        return {
            "schema": "PortableContextSchema",
            "schema_version": "2026-06-07",
            "platform": "x",
            "platform_adapter": "XCommunityNotesAdapter",
            "platform_content": {
                "platform_content_id": candidate.x_post_id,
                "author_id": candidate.author_id,
                "text": candidate.text,
                "lang": candidate.lang,
                "created_at": candidate.note_tweet.get("created_at") or raw.get("created_at"),
                "relationships": {
                    "referenced_posts": candidate.referenced_posts,
                    "quoted_posts": candidate.quoted_posts,
                    "replied_to_posts": candidate.replied_to_posts,
                },
                "media": candidate.media_metadata,
                "suggested_source_links_with_counts": candidate.suggested_source_links_with_counts,
                "note_request_suggestions": candidate.note_request_suggestions,
            },
            "x_raw_payload_available": True,
            "platform_raw_payload_fields": sorted(raw.keys()),
        }


class AudienceContextService:
    JURISDICTION_HINTS = {
        "norway": "Norway",
        "norwegian": "Norway",
        "cdc": "United States",
        "centers for disease control": "United States",
        "fda": "United States",
        "city council": "local civic",
        "election": "jurisdiction-specific civic",
    }

    def classify(self, candidate: CandidatePost) -> dict:
        blob = _lower_blob(candidate.text, candidate.referenced_posts, candidate.quoted_posts, candidate.replied_to_posts, candidate.suggested_source_links_with_counts)
        jurisdictions = sorted({label for token, label in self.JURISDICTION_HINTS.items() if token in blob})
        context_sources = []
        if candidate.referenced_posts:
            context_sources.append("referenced_posts")
        if candidate.quoted_posts:
            context_sources.append("quoted_posts")
        if candidate.replied_to_posts:
            context_sources.append("replied_to_posts")
        if candidate.note_request_suggestions:
            context_sources.append("note_request_suggestions")
        return {
            "status": "PASS",
            "feed_lang": candidate.lang,
            "jurisdictions": jurisdictions,
            "context_sources": context_sources,
            "reader_context_notes": "Use localized/current context when claims depend on place, time, or audience assumptions.",
        }

    def gate(self, candidate: CandidatePost) -> dict:
        context = candidate.audience_context or self.classify(candidate)
        high_stakes = candidate.high_stakes or {}
        if high_stakes.get("risk_tier") == "high" and not context.get("jurisdictions"):
            return {
                "status": "HOLD_FOR_OPERATOR",
                "blockers": ["High-stakes claim needs explicit jurisdiction/audience context"],
            }
        return {"status": "PASS", "blockers": []}


@dataclass
class MediaDependencyGate:
    settings: Settings

    def classify(self, candidate: CandidatePost) -> dict:
        blob = _lower_blob(candidate.text, candidate.media_metadata, candidate.referenced_posts, candidate.quoted_posts)
        media_present = bool(candidate.media_metadata)
        media_terms = [
            "this video",
            "video shows",
            "this image",
            "photo shows",
            "screenshot shows",
            "chart shows",
            "in the clip",
            "audio proves",
        ]
        media_dependent = media_present and any(term in blob for term in media_terms)
        if media_dependent and not self.settings.approved_multimodal_workflow_enabled:
            decision = "HOLD_FOR_OPERATOR"
            blockers = ["Media-dependent claim requires approved multimodal review before drafting/submission"]
        else:
            decision = "PASS"
            blockers = []
        return {
            "media_present": media_present,
            "classification": "media_dependent" if media_dependent else ("text_claim_with_media_context" if media_present else "text_only"),
            "approved_multimodal_workflow": self.settings.approved_multimodal_workflow_enabled,
            "decision": decision,
            "blockers": blockers,
            "media_metadata_is_hint_not_proof": True,
        }


class HighStakesDomainRouter:
    DOMAIN_KEYWORDS = {
        "health_medical": ["cdc", "vaccine", "measles", "medical", "disease", "drug", "hospital", "infection"],
        "election_civic": ["election", "ballot", "vote", "voting", "city council", "mayor"],
        "legal_regulatory": ["law", "lawsuit", "court", "regulation", "illegal", "legal"],
        "financial": ["stock", "sec", "bank", "interest rate", "investment", "crypto"],
        "public_safety": ["evacuation", "fire", "police", "emergency", "public safety"],
        "war_crisis": ["war", "missile", "invasion", "ceasefire", "refugee"],
        "identity_sensitive": ["race", "religion", "gender", "immigrant", "ethnicity"],
    }
    AUTHORITATIVE_HINTS = {
        "health_medical": ["cdc", "centers for disease control", "nih", "fda", "who", "health"],
        "election_civic": ["election", "official", "secretary of state", "city"],
        "legal_regulatory": ["court", "agency", "official", "regulator"],
        "financial": ["sec", "federal reserve", "treasury", "official"],
        "public_safety": ["official", "agency", "emergency"],
        "war_crisis": ["united nations", "official", "ministry", "agency"],
        "identity_sensitive": ["official", "peer reviewed", "institutional"],
    }

    def classify(self, candidate: CandidatePost) -> dict:
        blob = _lower_blob(candidate.text, candidate.suggested_source_links_with_counts, candidate.note_request_suggestions)
        domains = sorted(domain for domain, keywords in self.DOMAIN_KEYWORDS.items() if any(keyword in blob for keyword in keywords))
        risk_tier = "high" if domains else "standard"
        return {
            "risk_tier": risk_tier,
            "domains": domains,
            "requires_authoritative_sources": bool(domains),
            "requires_currentness": bool(domains),
            "requires_operator_confirmation": bool(domains),
            "authoritative_evidence_met": not domains,
            "currentness_met": not domains,
            "decision": "PASS" if not domains else "REQUIRE_HIGH_STAKES_REVIEW",
            "blockers": [],
        }

    def evaluate_evidence(self, candidate: CandidatePost, cards: list[EvidenceCard]) -> dict:
        status = candidate.high_stakes or self.classify(candidate)
        if status.get("risk_tier") != "high":
            return status
        domains = list(status.get("domains", []))
        authoritative_tokens = [token for domain in domains for token in self.AUTHORITATIVE_HINTS.get(domain, [])]
        approved = [card for card in cards if card.approved]
        source_blob = _lower_blob(
            [{"publisher": card.publisher, "source_type": card.source_type, "title": card.title} for card in approved]
        )
        authoritative = bool(approved) and any(token in source_blob for token in authoritative_tokens)
        current = bool(approved) and all(card.timeliness_score >= 0.70 for card in approved)
        blockers = []
        if not authoritative:
            blockers.append("High-stakes claim requires authoritative source evidence")
        if not current:
            blockers.append("High-stakes claim requires current evidence")
        updated = {
            **status,
            "authoritative_evidence_met": authoritative,
            "currentness_met": current,
            "decision": "PASS" if not blockers else "HOLD_FOR_OPERATOR",
            "blockers": blockers,
        }
        return updated

    def gate(self, candidate: CandidatePost) -> dict:
        status = candidate.high_stakes or self.classify(candidate)
        blockers = list(status.get("blockers", []))
        if status.get("risk_tier") == "high":
            if not status.get("authoritative_evidence_met"):
                blockers.append("High-stakes claim requires authoritative source evidence")
            if not status.get("currentness_met"):
                blockers.append("High-stakes claim requires current evidence")
        return {"status": "PASS" if not blockers else "HOLD_FOR_OPERATOR", "blockers": sorted(set(blockers))}


class AbstentionAndRedundancyGuard:
    def precheck(self, candidate: CandidatePost, claims: list[Claim] | None = None, submitted_hashes: set[str] | None = None) -> dict:
        reasons = []
        checkable = [claim for claim in (claims or []) if claim.status == "CHECKABLE"]
        if claims is not None and not checkable:
            reasons.append("no_checkable_claim")
        if claims and all(claim.opinion_sarcasm_flag or claim.status == "ABSTAIN" for claim in claims):
            reasons.append("opinion_or_satire")
        if candidate.duplicate_of:
            reasons.append("semantic_duplicate")
        if submitted_hashes and candidate.canonical_hash in submitted_hashes:
            reasons.append("already_sufficiently_noted")
        return {
            "decision": "BLOCK" if reasons else "PASS",
            "reasons": sorted(set(reasons)),
            "checks": [
                "no-note controls",
                "public replay",
                "existing-note lookup",
                "semantic claim clustering",
                "recent local draft/submission history",
            ],
        }


class EvidenceFreshnessAndLifecycleMonitor:
    def assess(self, candidate: CandidatePost, cards: list[EvidenceCard]) -> dict:
        approved = [card for card in cards if card.approved]
        time_sensitive = self._time_sensitive(candidate)
        missing_dates = [card.id for card in approved if not card.date]
        stale_cards = []
        now = datetime.now(UTC)
        for card in approved:
            parsed = _parse_date(card.date)
            if parsed and (now - parsed).days > 730:
                stale_cards.append(card.id)
        blockers = []
        if time_sensitive and not approved:
            blockers.append("Freshness not established for time-sensitive claim")
        if missing_dates:
            blockers.append("Approved evidence is missing source dates")
        if stale_cards:
            blockers.append("Approved evidence may be superseded or stale")
        return {
            "time_sensitive": time_sensitive,
            "freshness_status": "PASS" if not blockers else "HOLD_FOR_OPERATOR",
            "blockers": blockers,
            "approved_source_count": len(approved),
            "stale_card_ids": stale_cards,
            "source_date_missing_card_ids": missing_dates,
            "post_submission_monitoring": [
                "source availability",
                "source hash",
                "correction or retraction",
                "post availability",
                "note status",
                "outcome regression",
            ],
        }

    def post_submission_snapshot(self, submission_id: str, cards: list[EvidenceCard]) -> dict:
        return {
            "submission_id": submission_id,
            "created_at": now_iso(),
            "source_hashes": {card.source_id: sha256_text(f"{card.url}|{card.date}|{card.snippet}") for card in cards if card.approved},
            "monitoring_status": "scheduled",
        }

    def _time_sensitive(self, candidate: CandidatePost) -> bool:
        blob = _lower_blob(candidate.text, candidate.note_tweet, candidate.note_request_suggestions)
        return any(token in blob for token in ["now", "today", "currently", "latest", "this week", "routine", "routinely"])


class LinkableEvidenceReportService:
    def build(self, candidate: CandidatePost, draft: DraftNote, claims: list[Claim], cards: list[EvidenceCard]) -> dict:
        approved = [card for card in cards if card.approved]
        return {
            "id": stable_id("evidence-report", draft.id),
            "report_version": "evidence-report-v1",
            "candidate_id": candidate.id,
            "draft_id": draft.id,
            "exact_text_hash": draft.exact_text_hash,
            "operator_route": f"/candidates/{candidate.id}",
            "public_permalink_enabled": False,
            "public_redactions": ["internal thresholds", "private X payloads", "credentials", "operator identifiers"],
            "claims": [{"id": claim.id, "text": claim.text, "status": claim.status} for claim in claims],
            "sources": [
                {
                    "source_id": card.source_id,
                    "url": card.url,
                    "title": card.title,
                    "publisher": card.publisher,
                    "date": card.date,
                    "retrieved_at": card.retrieved_at,
                    "approved": card.approved,
                    "snippet_hash": sha256_text(card.snippet),
                }
                for card in approved
            ],
            "uncertainty": {
                "counterevidence_count": sum(1 for card in cards if card.contradiction_score > 0.35),
                "unsupported_sentence_count": len([sentence for sentence in draft.factual_sentences if not draft.support_map_json.get(sentence)]),
            },
        }


class CrossPerspectiveHelpfulnessService:
    def assess(
        self,
        candidate: CandidatePost,
        draft: DraftNote,
        internal_score: InternalScore | None,
        x_evaluation: XEvaluationResult | None,
    ) -> dict:
        blockers = []
        internal_helpful = internal_score.helpfulness_probability if internal_score else 0.0
        x_helpful = x_evaluation.helpfulness_score if x_evaluation else 0.0
        source_quality = internal_score.source_quality_score if internal_score else 0.0
        request_boost = min(0.12, sum(int(item.get("count", 0)) for item in candidate.note_request_suggestions) / 100)
        score = round((0.40 * internal_helpful) + (0.30 * x_helpful) + (0.20 * source_quality) + request_boost, 3)
        if not internal_score:
            blockers.append("Cross-perspective helpfulness requires internal critique")
        if not x_evaluation:
            blockers.append("Cross-perspective helpfulness requires exact X evaluate_note result")
        if score < 0.62:
            blockers.append("Cross-perspective helpfulness score below threshold")
        if internal_score and internal_score.stability_risk > 0.75:
            blockers.append("High CRNH false-positive stability risk")
        return {
            "status": "PASS" if not blockers else "BLOCK",
            "score": score,
            "blockers": blockers,
            "signals": {
                "internal_helpfulness_probability": internal_helpful,
                "x_helpfulness_score": x_helpful,
                "source_quality_score": source_quality,
                "note_request_boost": request_boost,
            },
        }


class WritingOpportunityRanker:
    def rank(
        self,
        candidate: CandidatePost,
        claims: list[Claim],
        cards: list[EvidenceCard],
        writing_limit: WritingLimitSnapshot,
        costs: CostSummary,
    ) -> dict:
        blockers = []
        checkable_count = sum(1 for claim in claims if claim.status == "CHECKABLE")
        approved = [card for card in cards if card.approved]
        note_requests = sum(int(item.get("count", 0)) for item in candidate.note_request_suggestions)
        source_quality = sum(card.reliability_score for card in approved) / len(approved) if approved else 0.0
        score = round(min(1.0, 0.25 + note_requests / 25 + len(approved) / 10 + source_quality / 4), 3)
        if not checkable_count:
            blockers.append("No checkable claim for writing opportunity")
        if not approved:
            blockers.append("No approved evidence for writing opportunity")
        if not costs.within_budget:
            blockers.extend(costs.blockers or ["Cost budget blocks writing opportunity"])
        if writing_limit.estimated_writing_limit < 1:
            blockers.append("Writing limit estimate is exhausted")
        decision = "ALLOW_NOW"
        if blockers:
            decision = "BLOCK"
        elif score < 0.45:
            decision = "DEFER_LOW_PRIORITY"
        return {
            "decision": decision,
            "priority_score": score,
            "blockers": blockers,
            "inputs": {
                "checkable_claim_count": checkable_count,
                "approved_evidence_count": len(approved),
                "note_request_count": note_requests,
                "estimated_writing_limit": writing_limit.estimated_writing_limit,
                "daily_cost_within_budget": costs.within_budget,
            },
        }


@dataclass
class DataRetentionAndAccessControlService:
    settings: Settings

    def classify_candidate(self, candidate: CandidatePost) -> dict:
        return {
            "policy_version": "retention-rbac-v1",
            "permitted_use": self.settings.community_notes_data_use_purpose,
            "sensitivity": "platform_content_minimized",
            "rbac": {
                "operator": ["read", "review", "approve", "export"],
                "service": ["read", "write_audit"],
                "public": ["redacted_methodology_only"],
            },
            "ttl_days": {
                "raw_x_payload": 30,
                "portable_context": 180,
                "source_snapshots_and_hashes": 365,
                "evidence_reports": 365,
                "operator_feedback": 730,
                "audit_logs": 1095,
                "credential_metadata": 90,
            },
            "storage_minimization": "prefer ids, hashes, metadata, and short excerpts over full private platform content",
            "deletion_and_rehydration": "purge stale or unavailable content unless legal/incident hold applies",
        }


class MethodologyTransparencyRegistry:
    def card(self, public: bool = True) -> dict:
        card = {
            "methodology_version": "community-notes14-governance-v1+community-notes18-control-plane-v1",
            "source_policy": "Prefer official, primary, institutional, and high-reliability sources; treat platform and source text as untrusted input.",
            "retrieval_rules": ["ingest suggested links", "plan official/primary searches", "audit directness, timeliness, contradiction, and coverage"],
            "gate_definitions": [
                "central signed GateDecision",
                "exact text evaluate_note",
                "exact submission preview and immutable approval payload",
                "external-call idempotency",
                "support map completeness",
                "atomic claim graph and source relations",
                "deterministic note format validation",
                "source authority policy",
                "internal critique",
                "operator approval",
                "cost budget",
                "policy scope",
                "credential scope and environment isolation",
                "rate-limit backpressure scheduler",
                "bot identity",
                "audience/context",
                "media dependency",
                "high-stakes routing",
                "freshness",
                "adversarial contradiction review",
                "abstention/redundancy",
                "cross-perspective helpfulness",
                "writing opportunity",
                "emergency stop",
            ],
            "eval_windows": ["rolling 50-note admission", "fixture/adversarial eval run", "official scoring replay placeholder", "baseline/ablation replay"],
            "known_limitations": ["fixture providers are deterministic", "live docs drift monitor records review state but does not fetch in request path"],
            "data_use_constraints": "Community Notes API data is used solely for Community Notes AI note writing.",
            "incident_change_log": [],
        }
        if public:
            card["redactions"] = ["numeric private thresholds where exploitable", "credentials", "private X payloads", "operator identifiers"]
        else:
            card["prompt_and_model_versions"] = {"claim_extraction": "strict-json-v1", "draft_generation": "strict-json-v1"}
        return card


class PolicyAndDocumentationDriftMonitor:
    def status(self) -> dict:
        return {
            "status": "operator_review_required_before_non_test_writes",
            "last_checked_at": None,
            "material_change_freezes_writes": True,
            "sources": [
                {"name": "X API Community Notes docs", "url": "https://docs.x.com/x-api/community-notes"},
                {"name": "X API pricing and usage", "url": "https://developer.x.com/en/support/x-api"},
                {"name": "X Developer policy", "url": "https://developer.x.com/en/developer-terms/policy"},
                {"name": "X terms", "url": "https://x.com/en/tos"},
            ],
            "review_queue": [],
        }


@dataclass
class EmergencyStopAndIncidentResponseController:
    settings: Settings

    def state(self) -> dict:
        return {
            "external_writes_blocked": self.settings.emergency_stop_external_writes,
            "reason": self.settings.emergency_stop_reason,
            "blocks_all_external_writes": True,
            "response_actions": [
                "pause high-risk queues",
                "drain in-flight writes",
                "rollback prompt/gate/adapter/source-policy versions",
                "rotate credentials",
                "require re-enable approval audit",
            ],
        }

    def blockers(self) -> list[str]:
        if self.settings.emergency_stop_external_writes:
            reason = f": {self.settings.emergency_stop_reason}" if self.settings.emergency_stop_reason else ""
            return [f"Emergency stop blocks all external writes{reason}"]
        return []


class OperatorFeedbackAndEditDiffService:
    def record_decision(
        self,
        draft: DraftNote,
        action: str,
        previous_text: str | None = None,
        reason: str | None = None,
        gate_snapshot: dict | None = None,
    ) -> dict:
        before = previous_text if previous_text is not None else draft.text
        diff = list(difflib.unified_diff(before.splitlines(), draft.text.splitlines(), fromfile="before", tofile="after", lineterm=""))
        return {
            "action": action,
            "reason": reason or "",
            "exact_text_hash": draft.exact_text_hash,
            "edit_diff": diff,
            "gate_snapshot": gate_snapshot or {},
            "created_at": now_iso(),
            "learning_use": "evaluation_and_regression_only_no_foundation_training",
        }


class OfficialScoringReplayService:
    def status(self) -> dict:
        return {
            "status": "fixture_replay_available",
            "purpose": "Replay scoring outcomes against gate/prompt changes before production writes.",
            "inputs": ["notes_written", "test_result", "scoring_status", "CRH", "CRNH", "NMR", "ClaimOpinion", "UrlValidity", "HarassmentAbuse"],
            "blocks_non_test_on_regression": True,
        }


class FeedStrategyAndCadenceManager:
    def plan(self, writing_limit: WritingLimitSnapshot, costs: CostSummary, test_mode: bool, max_results: int) -> dict:
        eligibility = writing_limit.feed_size_eligibility
        feed_size = "small"
        for candidate_size in ["xxl", "xl", "large", "small"]:
            allowed = eligibility.get(candidate_size, {})
            if allowed.get("eligible") and (test_mode or not allowed.get("non_test_mode_only")):
                feed_size = candidate_size
                break
        cadence = "manual_or_low_cadence" if not costs.within_budget else "normal_review_cadence"
        return {
            "feed_lang": "en",
            "feed_size": feed_size,
            "cadence": cadence,
            "max_results": max(1, min(max_results, 100)),
            "test_mode": test_mode,
            "budget_within_limit": costs.within_budget,
        }
