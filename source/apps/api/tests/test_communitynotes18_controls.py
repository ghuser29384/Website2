from __future__ import annotations

import unittest

from app.services.store import AppState
from app.settings import Settings


def ready_state() -> tuple[AppState, str, str]:
    state = AppState(Settings())
    state.seed_history()
    candidate = next(item for item in state.sync_eligible_posts() if "Norway" in item.text)
    state.analyze_candidate(candidate.id)
    state.retrieve_evidence(candidate.id)
    draft = state.generate_drafts(candidate.id)[0]
    state.critique_draft(draft.id)
    state.evaluate_x(draft.id)
    return state, candidate.id, draft.id


class CommunityNotes18ControlTests(unittest.TestCase):
    def test_signed_gate_decision_and_artifacts_are_persisted(self) -> None:
        state, candidate_id, draft_id = ready_state()
        candidate = state.candidates[candidate_id]
        draft = state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)

        self.assertTrue(candidate.artifact_graph["artifacts"])
        self.assertEqual(candidate.atomic_claim_graph["schema"], "AtomicClaimGraphAndSourceRelationMatrix")
        self.assertTrue(candidate.atomic_claim_graph["source_relations"])
        self.assertEqual(candidate.source_authority_policy["status"], "PASS")
        self.assertFalse(candidate.crowd_signal_filter["crowd_hints_are_proof"])
        self.assertEqual(draft.format_validation["status"], "PASS")
        self.assertEqual(draft.adversarial_review["status"], "PASS")
        self.assertTrue(draft.prediction_ledger["predictions"])
        self.assertTrue(draft.approval_record["approved"])
        self.assertEqual(gate.decision["gatekeeper"], "CentralPolicyGatekeeper")
        self.assertTrue(gate.decision["authorized"])
        self.assertTrue(gate.decision["signature"])

    def test_duplicate_submission_is_blocked_by_idempotency(self) -> None:
        state, _, draft_id = ready_state()
        state.approve_draft(draft_id)
        first, first_gate = state.submit_draft(draft_id, test_mode=True)
        self.assertIsNotNone(first)
        self.assertTrue(first_gate.decision["authorized"])

        second, second_gate = state.submit_draft(draft_id, test_mode=True)
        self.assertIsNone(second)
        self.assertFalse(second_gate.can_submit)
        self.assertIn("Duplicate note submission blocked by idempotency ledger", second_gate.blockers)

    def test_exact_approval_invalidates_after_text_change(self) -> None:
        state, _, draft_id = ready_state()
        state.approve_draft(draft_id)
        state.drafts[draft_id].text += " Changed after approval."

        gate = state.gate_for_draft(draft_id, test_mode=True)

        self.assertFalse(gate.can_submit)
        self.assertIn("Exact submission preview changed after approval; operator must re-approve", gate.blockers)
        self.assertIn("Draft exact_text_hash is stale", gate.blockers)

    def test_credential_scope_blocks_live_write_secret_in_local_dev(self) -> None:
        state = AppState(
            Settings(
                app_env="local",
                x_provider="live",
                allow_live_x_api=True,
                allow_live_x_write=True,
                x_bearer_token="token",
            )
        )
        scope = state.credential_scope.scope_for("x_write", test_mode=True)

        self.assertEqual(scope["status"], "BLOCK")
        self.assertIn("Live X credentials should not be present in local/dev", scope["blockers"])

    def test_governance_status_exposes_communitynotes18_controls(self) -> None:
        status = AppState(Settings()).governance_status(public=True)
        for key in [
            "online_offline_promotion",
            "credential_scope_and_environment",
            "rate_limit_backpressure_scheduler",
            "external_call_idempotency_and_cost",
            "model_gateway_and_prompt_contracts",
            "central_policy_gatekeeper",
            "source_authority_policy",
            "topic_coverage_and_skew",
            "baseline_comparison_and_ablation",
            "prediction_calibration_and_uncertainty",
            "exact_submission_preview_and_approval",
            "claim_graph_and_source_relations",
            "crowd_signal_robustness",
            "note_format_validator",
            "adversarial_contradiction_search",
        ]:
            self.assertIn(key, status)
        self.assertTrue(status["central_policy_gatekeeper"]["sole_write_authority"])


if __name__ == "__main__":
    unittest.main()
