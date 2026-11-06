from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.costs import CostLedger
from app.settings import Settings
from app.x_client.community_notes import FixtureXCommunityNotesClient, LiveXCommunityNotesClient
from app.x_client.oauth import OAuth2TokenResponse, oauth2_authorize_url


class XClientTests(unittest.TestCase):
    def test_fixture_returns_eligible_posts_with_suggestions(self) -> None:
        settings = Settings()
        client = FixtureXCommunityNotesClient(settings, CostLedger(settings))
        response = client.search_posts_eligible_for_notes(test_mode=True, max_results=2)
        self.assertEqual(len(response["posts"]), 2)
        self.assertIn("suggested_source_links_with_counts", response["posts"][0])
        self.assertIn("note_request_suggestions", response["posts"][0])

    def test_live_x_api_disabled_by_default(self) -> None:
        settings = Settings()
        client = LiveXCommunityNotesClient(settings, CostLedger(settings))
        with self.assertRaises(PermissionError):
            client.search_posts_eligible_for_notes(test_mode=True, max_results=1)

    def test_oauth_authorize_url_uses_percent_encoded_scopes(self) -> None:
        url = oauth2_authorize_url(
            "client-id",
            "https://example.com/callback",
            "tweet.read users.read offline.access",
            "state",
            "challenge",
        )
        self.assertIn("scope=tweet.read%20users.read%20offline.access", url)
        self.assertNotIn("tweet.read+users.read", url)

    def test_live_x_uses_oauth2_refresh_token_for_authorization_header(self) -> None:
        settings = Settings(
            x_provider="live",
            allow_live_x_api=True,
            x_oauth2_client_id="client-id",
            x_oauth2_client_secret="client-secret",
            x_oauth2_refresh_token="refresh-token",
        )
        client = LiveXCommunityNotesClient(settings, CostLedger(settings))
        token = OAuth2TokenResponse(
            access_token="user-access-token",
            refresh_token="next-refresh-token",
            expires_in=7200,
            token_type="bearer",
            scope="tweet.read users.read offline.access",
            raw={},
        )
        with patch("app.x_client.community_notes.refresh_oauth2_user_access_token", return_value=token) as refresh:
            self.assertEqual(client._headers()["Authorization"], "Bearer user-access-token")
            self.assertEqual(client._headers()["Authorization"], "Bearer user-access-token")

        refresh.assert_called_once_with("client-id", "client-secret", "refresh-token")

    def test_non_test_fixture_write_disabled_by_default(self) -> None:
        settings = Settings()
        client = FixtureXCommunityNotesClient(settings, CostLedger(settings))
        with self.assertRaises(PermissionError):
            client.write_note("191", "note text", test_mode=False)

    def test_usage_api_snapshot_reconciles_with_local_ledger(self) -> None:
        settings = Settings()
        ledger = CostLedger(settings)
        client = FixtureXCommunityNotesClient(settings, ledger)
        client.search_posts_eligible_for_notes(test_mode=True, max_results=1)
        ledger.reconcile_usage_api(client.get_usage()["usage_api"])
        summary = ledger.summary()
        self.assertTrue(summary.usage_api_reconciled)
        self.assertEqual(summary.usage_api_daily_post_count, 1)
        self.assertTrue(summary.deduplication_soft_guarantee)


if __name__ == "__main__":
    unittest.main()
