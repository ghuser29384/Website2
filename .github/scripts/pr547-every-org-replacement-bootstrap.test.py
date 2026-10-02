import importlib.util
from pathlib import Path
import unittest
import io
import json
import tempfile
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
candidate = HERE / "pr547-every-org-replacement-bootstrap.py"
if not candidate.exists():
    candidate = HERE / "bootstrap_callback.py"
spec = importlib.util.spec_from_file_location("callback", candidate)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BootstrapContractTests(unittest.TestCase):
    def setUp(self):
        module.STATE.clear()
        module.STATE.update({"aliasAssignmentAttempted": False, "aliasAssignmentConfirmed": False,
                             "bootstrapVerified": False, "rollbackAttempted": False, "rollbackConfirmed": False})

    def test_nonsecret_callback_is_exact_staging_target(self):
        self.assertEqual(module.ALIAS, "moraltrade-pr547-every-org-staging-20261002-566bb18.vercel.app")
        self.assertRegex(module.ROUTE, r"^/api/connectors/every-org/du-staging-[a-f0-9]{32}$")
        self.assertNotIn("?", module.ROUTE)
        self.assertNotIn("moraltrade.org", module.ALIAS)

    def test_current_official_protection_modes_are_explicit(self):
        self.assertEqual(set(module.PROTECTION_MODES), {"all", "all_except_custom_domains", "preview", "prod_deployment_urls_and_all_previews"})
        self.assertNotIn(None, module.PROTECTION_MODES)
        self.assertNotIn("disabled", module.PROTECTION_MODES)

    def test_app_401_is_not_vercel_protection(self):
        self.assertFalse(module.valid_protection_response(401, {"server": "Vercel", "x-vercel-id": "id", "content-type": "application/json"}, b'{"ok":false}'))

    def test_verified_sso_interception_is_accepted(self):
        self.assertTrue(module.valid_protection_response(302, {"server": "Vercel", "x-vercel-id": "id", "location": "https://vercel.com/sso-api?url=test"}, b""))

    def test_untrusted_redirect_is_rejected(self):
        for location in ("https://evil.example/sso-api", "http://vercel.com/sso-api", "https://vercel.com.evil.example/sso-api", "https://vercel.com/other"):
            self.assertFalse(module.valid_protection_response(302, {"server": "Vercel", "x-vercel-id": "id", "location": location}, b""))

    def test_missing_platform_header_is_rejected(self):
        self.assertFalse(module.valid_protection_response(401, {"server": "Vercel"}, b"Authentication Required"))

    def test_html_auth_interception_is_accepted(self):
        self.assertTrue(module.valid_protection_response(401, {"server": "Vercel", "x-vercel-id": "id"}, b"Authentication Required"))

    def test_redirect_handler_never_forwards_credentials(self):
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, None, None, "https://other.example"))

    def test_exact_bootstrap_identity(self):
        good = {"id": module.BOOTSTRAP_ID, "url": module.BOOTSTRAP_HOST, "projectId": module.PROJECT, "readyState": "READY", "target": None, "meta": {"githubCommitSha": module.CANDIDATE}}
        module.validate_source_deployment(good)
        for key, value in (("target", "production"), ("projectId", "wrong"), ("readyState", "BUILDING"), ("id", "different"), ("url", "different.vercel.app")):
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                module.validate_source_deployment(dict(good, **{key: value}))

    def test_source_and_tree_drift_rejected(self):
        base = {"id": module.BOOTSTRAP_ID, "url": module.BOOTSTRAP_HOST, "projectId": module.PROJECT, "readyState": "READY", "target": None}
        for meta in ({"githubCommitSha": "wrong"}, {"githubCommitSha": module.CANDIDATE, "moralTradeCandidateTree": "wrong"}):
            with self.assertRaises(RuntimeError):
                module.validate_source_deployment(dict(base, meta=meta))

    def test_alias_is_same_project_exact_deployment_nonredirect(self):
        good = {"alias": module.ALIAS, "projectId": module.PROJECT, "deploymentId": module.BOOTSTRAP_ID}
        module.validate_alias(good, module.BOOTSTRAP_ID)
        for key, value in (("alias", "other.vercel.app"), ("projectId", "wrong"), ("deploymentId", "wrong"), ("redirect", "www.moraltrade.org")):
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                module.validate_alias(dict(good, **{key: value}), module.BOOTSTRAP_ID)

    def test_provider_tokens_cannot_enter_bootstrap(self):
        source = candidate.read_text()
        self.assertNotIn("PARTNER_WEBHOOK_AUTHORIZATION_TOKEN", source)
        self.assertNotIn("DONATE_LINK_WEBHOOK_TOKEN", source)
        self.assertNotIn("--prod", source)
        self.assertNotIn("x-vercel-set-bypass-cookie", source)
        self.assertEqual(source.count('method="POST", payload={"alias": ALIAS}'), 1)

    def test_query_bypass_probes_exact_401_and_no_body_parsing_leak(self):
        with patch.dict(module.os.environ, {"EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET": "a" * 32}):
            with patch.object(module, "request", return_value=(401, {"content-type": "application/json"}, b'{"ok":false}')) as request:
                module.bootstrap_probe(module.ALIAS)
                self.assertEqual(request.call_count, 2)
                for call in request.call_args_list:
                    self.assertIn("?x-vercel-protection-bypass=", call.args[0])
                    self.assertEqual(call.kwargs["data"], b"not-json")
            for response in ((302, {}, b""), (200, {"content-type": "application/json"}, b'{"ok":false}'), (401, {"content-type": "text/html"}, b'not json'), (401, {"content-type": "application/json"}, b'{"ok":true}')):
                with patch.object(module, "request", return_value=response), self.assertRaises(RuntimeError):
                    module.bootstrap_probe(module.ALIAS)

    def test_exact_callback_and_page_protection_are_both_checked(self):
        with patch.object(module, "request", return_value=(302, {"server": "Vercel", "x-vercel-id": "id", "location": "https://vercel.com/sso-api"}, b"")) as request:
            module.protected_host_probes(module.ALIAS)
            self.assertEqual(request.call_count, 4)
            callbacks = [c for c in request.call_args_list if module.ROUTE in c.args[0]]
            self.assertEqual(len(callbacks), 2)
            self.assertTrue(all(c.kwargs["method"] == "POST" and c.kwargs["data"] == b"not-json" for c in callbacks))
            self.assertEqual(sum("?x-vercel-protection-bypass=" in c.args[0] for c in callbacks), 1)

    def test_rollback_requires_same_created_identity_and_target(self):
        good = {"alias": module.ALIAS, "projectId": module.PROJECT, "deploymentId": module.BOOTSTRAP_ID, "uid": "new-alias-uid"}
        with patch.object(module, "api", side_effect=[good, {}, None]) as api:
            module.rollback_new_alias("new-alias-uid")
            self.assertEqual(api.call_args_list[1].args[0], "/v2/aliases/new-alias-uid")
            self.assertEqual(api.call_args_list[1].kwargs["method"], "DELETE")
        for change in ({"uid": "another"}, {"deploymentId": "another"}, {"projectId": "another"}):
            with patch.object(module, "api", return_value=dict(good, **change)) as api, self.assertRaises(RuntimeError):
                module.rollback_new_alias("new-alias-uid")
            self.assertEqual(api.call_count, 1)

    def test_rollback_does_not_retry_uncertain_delete(self):
        good = {"alias": module.ALIAS, "projectId": module.PROJECT, "deploymentId": module.BOOTSTRAP_ID, "uid": "new-alias-uid"}
        with patch.object(module, "api", side_effect=[good, RuntimeError("network_request_failed")]) as api, self.assertRaises(RuntimeError):
            module.rollback_new_alias("new-alias-uid")
        self.assertEqual(api.call_count, 2)

    def mock_environment(self):
        return {"GITHUB_REPOSITORY": module.REPOSITORY, "GITHUB_ACTOR": "ghuser29384",
                "GITHUB_RUN_ATTEMPT": "1", "BOOTSTRAP_AUTHORIZED": "true", "VERCEL_TOKEN": "private-vercel-token",
                "EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET": "b" * 32, "GITHUB_RUN_ID": "test-run", "GITHUB_SHA": "test-controller"}

    def initial_responses(self):
        return [{"id": module.PROJECT, "ssoProtection": {"deploymentType": "preview"}},
                {"id": module.BOOTSTRAP_ID, "url": module.BOOTSTRAP_HOST, "projectId": module.PROJECT, "readyState": "READY", "target": None, "meta": {"githubCommitSha": module.CANDIDATE}}, None]

    def test_assignment_timeout_and_collision_get_failure_evidence_without_retry(self):
        for outcome in (RuntimeError("network_request_failed"), {"alias": module.ALIAS, "uid": "newuid", "oldDeploymentId": "unexpected-previous"}):
            self.setUp()
            with tempfile.TemporaryDirectory() as tmp, patch.object(module, "EVIDENCE", Path(tmp)), patch.dict(module.os.environ, self.mock_environment()), patch.object(module, "protected_host_probes"), patch.object(module, "bootstrap_probe"), patch.object(module, "api", side_effect=self.initial_responses() + [outcome]) as api, patch("sys.stderr", new=io.StringIO()):
                self.assertEqual(module.run(), 1)
                self.assertEqual(api.call_count, 4)
                evidence = json.loads((Path(tmp) / "operation-state.json").read_text())
                self.assertTrue(evidence["aliasAssignmentAttempted"])
                self.assertFalse(evidence["bootstrapVerified"])
                self.assertEqual(evidence["mutationOutcome"], "unconfirmed_or_incomplete")
                self.assertEqual(evidence["nextAction"], "read_only_alias_reconciliation_no_automatic_retry")
                self.assertNotIn("private-vercel-token", json.dumps(evidence))

    def test_post_assignment_callback_protection_failure_rolls_back_only_new_alias(self):
        alias = {"alias": module.ALIAS, "projectId": module.PROJECT, "deploymentId": module.BOOTSTRAP_ID, "uid": "newuid"}
        responses = self.initial_responses() + [{"alias": module.ALIAS, "uid": "newuid"}, alias, alias, {}, None]
        with tempfile.TemporaryDirectory() as tmp, patch.object(module, "EVIDENCE", Path(tmp)), patch.dict(module.os.environ, self.mock_environment()), patch.object(module, "protected_host_probes", side_effect=[None, RuntimeError("vercel_protection_not_proven")]), patch.object(module, "bootstrap_probe"), patch.object(module, "api", side_effect=responses) as api, patch("sys.stderr", new=io.StringIO()):
            self.assertEqual(module.run(), 1)
            evidence = json.loads((Path(tmp) / "operation-state.json").read_text())
            self.assertTrue(evidence["rollbackConfirmed"])
            self.assertFalse(evidence["bootstrapVerified"])
            deletes = [call for call in api.call_args_list if call.kwargs.get("method") == "DELETE"]
            self.assertEqual(len(deletes), 1)
            self.assertEqual(deletes[0].args[0], "/v2/aliases/newuid")


if __name__ == "__main__":
    unittest.main()
