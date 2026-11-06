from __future__ import annotations

import io
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from app.services.providers import OpenAIResponsesClient, ProviderError, request_json
from app.storage import normalize_postgres_url
from app.settings import Settings
from app.x_client.community_notes import LiveXCommunityNotesClient
from app.services.costs import CostLedger


class PersistenceAndProviderTests(unittest.TestCase):
    def test_postgres_persistence_auto_only_outside_local(self) -> None:
        self.assertFalse(Settings(app_env="local").postgres_persistence_enabled())
        self.assertTrue(Settings(app_env="staging").postgres_persistence_enabled())
        self.assertTrue(Settings(app_env="local", persistence_provider="postgres").postgres_persistence_enabled())
        self.assertFalse(Settings(app_env="staging", persistence_provider="memory").postgres_persistence_enabled())

    def test_sqlalchemy_style_postgres_url_is_normalized(self) -> None:
        url = normalize_postgres_url("postgresql+psycopg://user:pass@example/db")
        self.assertEqual(url, "postgresql://user:pass@example/db")

    def test_live_x_requires_safety_flag_and_token(self) -> None:
        disabled = LiveXCommunityNotesClient(Settings(x_provider="live"), CostLedger(Settings()))
        with self.assertRaises(PermissionError):
            disabled.get_usage()
        missing_token_settings = Settings(x_provider="live", allow_live_x_api=True)
        missing_token = LiveXCommunityNotesClient(missing_token_settings, CostLedger(missing_token_settings))
        with self.assertRaises(PermissionError):
            missing_token.get_usage()

    def test_live_x_refresh_token_counts_as_configured_credential(self) -> None:
        settings = Settings(
            x_provider="live",
            allow_live_x_api=True,
            x_oauth2_client_id="client-id",
            x_oauth2_refresh_token="refresh-token",
        )
        self.assertTrue(settings.x_live_credentials_configured())
        self.assertTrue(settings.public_dict()["x_credentials_configured"])
        self.assertTrue(settings.public_dict()["x_oauth2_refresh_configured"])

    def test_live_x_write_requires_separate_write_flag(self) -> None:
        settings = Settings(x_provider="live", allow_live_x_api=True, x_bearer_token="token")
        client = LiveXCommunityNotesClient(settings, CostLedger(settings))
        with self.assertRaisesRegex(PermissionError, "ALLOW_LIVE_X_WRITE=false"):
            client.write_note("post", "note", test_mode=True)

    def test_openai_provider_requires_explicit_live_llm_flag(self) -> None:
        with self.assertRaises(PermissionError):
            OpenAIResponsesClient(Settings(llm_provider="openai", llm_model="example", openai_api_key="sk-test"))

    def test_request_json_wraps_http_errors_without_query_string(self) -> None:
        error = HTTPError(
            "https://api.x.com/2/notes/search/posts_eligible_for_notes?max_results=1",
            429,
            "Too Many Requests",
            {},
            io.BytesIO(b'{"title":"Rate limit exceeded"}'),
        )
        with patch("app.services.providers.urlopen", side_effect=error):
            expected = "GET https://api.x.com/2/notes/search/posts_eligible_for_notes failed with HTTP 429"
            with self.assertRaisesRegex(ProviderError, expected) as context:
                request_json("GET", "https://api.x.com/2/notes/search/posts_eligible_for_notes?max_results=1")

        self.assertNotIn("max_results=1", str(context.exception))


if __name__ == "__main__":
    unittest.main()
