from __future__ import annotations

import unittest

from app.services.normalizer import CandidateNormalizer
from app.services.store import AppState
from app.settings import Settings


def ready_state_for(text_token: str = "Norway") -> tuple[AppState, str, str]:
    state = AppState(Settings())
    state.seed_history()
    candidates = state.sync_eligible_posts()
    candidate = next(item for item in candidates if text_token in item.text)
    state.analyze_candidate(candidate.id)
    state.retrieve_evidence(candidate.id)
    draft = state.generate_drafts(candidate.id)[0]
    state.critique_draft(draft.id)
    state.evaluate_x(draft.id)
    return state, candidate.id, draft.id


class GovernanceTests(unittest.TestCase):
    def test_normalizer_prefers_note_tweet_full_text(self) -> None:
        raw = {
            "x_post_id": "longform-1",
            "author_id": "author",
            "text": "Truncated short text",
            "note_tweet": {"text": "Full long-form note_tweet text should be canonical."},
            "referenced_posts": [],
            "quoted_posts": [],
            "replied_to_posts": [],
            "media_metadata": [],
            "suggested_source_links_with_counts": [],
            "note_request_suggestions": [],
        }
        candidate = CandidateNormalizer().from_x_post(raw)
        self.assertEqual(candidate.text, "Full long-form note_tweet text should be canonical.")
        self.assertEqual(candidate.normalized_context["text"], candidate.text)

    def test_evidence_report_and_ranker_are_persisted_on_draft(self) -> None:
        state, _, draft_id = ready_state_for()
        draft = state.drafts[draft_id]
        self.assertEqual(draft.evidence_report["draft_id"], draft.id)
        self.assertEqual(draft.writing_opportunity["decision"], "ALLOW_NOW")
        self.assertEqual(draft.cross_perspective["status"], "PASS")
        self.assertIn("community-notes14-governance-v1", draft.methodology["methodology_version"])

    def test_emergency_stop_blocks_test_submission(self) -> None:
        state = AppState(Settings(emergency_stop_external_writes=True, emergency_stop_reason="incident drill"))
        state.seed_history()
        candidates = state.sync_eligible_posts()
        candidate = next(item for item in candidates if "Norway" in item.text)
        state.analyze_candidate(candidate.id)
        state.retrieve_evidence(candidate.id)
        draft = state.generate_drafts(candidate.id)[0]
        state.critique_draft(draft.id)
        state.evaluate_x(draft.id)
        state.approve_draft(draft.id)
        submission, gate = state.submit_draft(draft.id, test_mode=True)
        self.assertIsNone(submission)
        self.assertFalse(gate.can_submit)
        self.assertIn("Emergency stop blocks all external writes", gate.blockers)

    def test_media_dependent_candidate_is_held_without_multimodal_workflow(self) -> None:
        state = AppState(Settings())
        state.seed_history()
        candidate = next(item for item in state.sync_eligible_posts() if "Norway" in item.text)
        candidate.text = "This video shows Norway getting all electricity from coal."
        candidate.media_dependency = state.media_gate.classify(candidate)
        state.analyze_candidate(candidate.id)
        self.assertEqual(state.candidates[candidate.id].status, "HELD_FOR_OPERATOR")
        state.retrieve_evidence(candidate.id)
        draft = state.generate_drafts(candidate.id)[0]
        self.assertEqual(draft.status, "HOLD_FOR_OPERATOR")
        self.assertIn("Media-dependent claim requires approved multimodal review", draft.evidence_brief)

    def test_high_stakes_health_claim_requires_authoritative_current_evidence(self) -> None:
        state, candidate_id, draft_id = ready_state_for("CDC")
        candidate = state.candidates[candidate_id]
        self.assertEqual(candidate.high_stakes["risk_tier"], "high")
        self.assertIn("health_medical", candidate.high_stakes["domains"])
        self.assertTrue(candidate.high_stakes["authoritative_evidence_met"])
        self.assertTrue(candidate.high_stakes["currentness_met"])
        state.approve_draft(draft_id)
        submission, gate = state.submit_draft(draft_id, test_mode=True)
        self.assertTrue(gate.can_submit)
        self.assertIsNotNone(submission)

    def test_operator_feedback_edit_diff_records_approval(self) -> None:
        state, _, draft_id = ready_state_for()
        draft = state.approve_draft(draft_id, override_reason="verified evidence wording")
        self.assertEqual(draft.operator_feedback[-1]["action"], "approve_with_override")
        self.assertEqual(draft.operator_feedback[-1]["learning_use"], "evaluation_and_regression_only_no_foundation_training")

    def test_governance_status_exposes_public_safe_controls(self) -> None:
        status = AppState(Settings()).governance_status(public=True)
        self.assertIn("phase_and_complexity", status)
        self.assertIn("policy_drift", status)
        self.assertTrue(status["policy_drift"]["material_change_freezes_writes"])
        self.assertIn("redactions", status["methodology"])

    def test_dashboard_degrades_when_live_x_token_missing(self) -> None:
        state = AppState(Settings(x_provider="live", allow_live_x_api=True))
        dashboard = state.dashboard()
        costs = state.refresh_usage_reconciliation()
        self.assertIn("A user-context X credential is required", dashboard["provider_readiness"]["blockers"][0])
        self.assertIn("usage_reconciliation_error", costs)
        self.assertFalse(dashboard["provider_readiness"]["x_live_read_ready"])


if __name__ == "__main__":
    unittest.main()
