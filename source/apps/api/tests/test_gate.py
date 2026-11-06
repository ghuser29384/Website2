from __future__ import annotations

import unittest

from app.services.store import AppState
from app.settings import Settings


def ready_state(settings: Settings | None = None) -> tuple[AppState, str, str]:
    state = AppState(settings or Settings())
    state.seed_history()
    candidates = state.sync_eligible_posts()
    candidate = next(item for item in candidates if "Norway" in item.text)
    state.analyze_candidate(candidate.id)
    state.retrieve_evidence(candidate.id)
    drafts = state.generate_drafts(candidate.id)
    draft = drafts[0]
    state.critique_draft(draft.id)
    state.evaluate_x(draft.id)
    return state, candidate.id, draft.id


class SubmissionGateTests(unittest.TestCase):
    def test_write_note_impossible_without_approval(self) -> None:
        state, _, draft_id = ready_state()
        submission, gate = state.submit_draft(draft_id, test_mode=True)
        self.assertIsNone(submission)
        self.assertFalse(gate.can_submit)
        self.assertIn("Operator approval is required", gate.blockers)

    def test_draft_can_submit_after_exact_evaluate_and_approval(self) -> None:
        state, _, draft_id = ready_state()
        state.approve_draft(draft_id)
        submission, gate = state.submit_draft(draft_id, test_mode=True)
        self.assertTrue(gate.can_submit)
        self.assertIsNotNone(submission)
        self.assertTrue(submission.test_mode)

    def test_non_test_submission_blocked_without_flag(self) -> None:
        state, _, draft_id = ready_state()
        state.approve_draft(draft_id)
        submission, gate = state.submit_draft(draft_id, test_mode=False)
        self.assertIsNone(submission)
        self.assertFalse(gate.can_submit)
        self.assertIn("Non-test submissions require explicit enablement and readiness", gate.blockers)

    def test_exact_text_evaluation_required(self) -> None:
        state, _, draft_id = ready_state()
        draft = state.drafts[draft_id]
        draft.text = draft.text + " Extra unsupported sentence."
        state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("X evaluate_note result for exact draft text is required", gate.blockers)

    def test_unsupported_sentence_blocks_gate(self) -> None:
        state, _, draft_id = ready_state()
        draft = state.drafts[draft_id]
        draft.support_map_json = {}
        state.critique_draft(draft_id)
        with self.assertRaisesRegex(PermissionError, "Deterministic note format validation"):
            state.evaluate_x(draft_id)
        state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("Every factual sentence must map to at least one evidence source", gate.blockers)
        self.assertIn("High-severity critique issue blocks submission", gate.blockers)

    def test_cost_guard_blocks_when_budget_exceeded(self) -> None:
        state, _, draft_id = ready_state()
        state.cost_ledger.log("x_fixture", "forced_overage", 100.0, "test")
        state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("Cost guard is over budget", gate.blockers)

    def test_support_map_source_ids_match_retrieved_sources_after_refresh(self) -> None:
        state, candidate_id, draft_id = ready_state()
        state.retrieve_evidence(candidate_id)
        draft = state.drafts[draft_id]
        current_source_ids = {card.source_id for card in state.evidence_cards[candidate_id]}
        mapped_ids = {source_id for ids in draft.support_map_json.values() for source_id in ids}
        self.assertTrue(mapped_ids)
        self.assertTrue(mapped_ids.issubset(current_source_ids))

    def test_track_a_export_requires_express_consent(self) -> None:
        state, _, draft_id = ready_state()
        with self.assertRaises(PermissionError):
            state.export_draft(draft_id)
        exported = state.export_draft(draft_id, consent_ack=True, consent_actor="operator", consent_reason="manual export")
        self.assertIn("Express consent actor: operator", exported)

    def test_overbroad_data_use_scope_blocks_submission(self) -> None:
        state, _, draft_id = ready_state(Settings(community_notes_data_use_purpose="api_note_writing_operations_and_local_evaluation"))
        state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("Community Notes API data scope must be solely Community Notes AI note writing", gate.blockers)

    def test_missing_bot_identity_blocks_submission(self) -> None:
        state, _, draft_id = ready_state(Settings(bot_profile_disclosure="", bot_responsible_party=""))
        state.approve_draft(draft_id)
        gate = state.gate_for_draft(draft_id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("Track B bot profile disclosure and responsible party are required", gate.blockers)


if __name__ == "__main__":
    unittest.main()
