from __future__ import annotations

import unittest

from app.fixtures import adversarial_prompt_injection_fixture
from app.services.evals import EvalHarness
from app.services.store import AppState
from app.settings import Settings


class SecurityAndEvalTests(unittest.TestCase):
    def test_prompt_injection_fixture_cannot_bypass_gate(self) -> None:
        fixture = adversarial_prompt_injection_fixture()
        self.assertIn("Ignore", fixture["snippet"])
        state = AppState(Settings())
        state.seed_history()
        candidates = state.sync_eligible_posts()
        candidate = next(item for item in candidates if "Norway" in item.text)
        state.analyze_candidate(candidate.id)
        state.retrieve_evidence(candidate.id)
        draft = state.generate_drafts(candidate.id)[0]
        # No approval, no critique, and no exact X evaluation. Untrusted text cannot change that.
        _, gate = state.submit_draft(draft.id, test_mode=True)
        self.assertFalse(gate.can_submit)
        self.assertIn("Operator approval is required", gate.blockers)

    def test_eval_harness_reports_adversarial_pass(self) -> None:
        result = EvalHarness().run()
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["metrics"]["prompt_injection_blocked"], "passed")

    def test_public_settings_expose_policy_scope_without_secrets(self) -> None:
        settings = Settings()
        public = settings.public_dict()
        self.assertTrue(public["policy_scope"]["data_use_scope_allowed"])
        self.assertIn("solely for Community Notes AI note writing", public["policy_scope"]["policy_text"])
        self.assertTrue(public["bot_identity"]["configured"])
        self.assertNotIn("secret_key", public)


if __name__ == "__main__":
    unittest.main()
