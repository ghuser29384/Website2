from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlencode

from app.fixtures import fixture_eligible_posts, fixture_notes_written
from app.models.records import XEvaluationResult, new_id, sha256_text
from app.services.costs import CostLedger
from app.services.providers import request_json
from app.settings import Settings
from app.x_client.oauth import refresh_oauth2_user_access_token


class XCommunityNotesClient(Protocol):
    def search_posts_eligible_for_notes(self, test_mode: bool, max_results: int, feed_lang: str = "en", feed_size: str = "small") -> dict:
        ...

    def evaluate_note(self, post_id: str, note_text: str) -> XEvaluationResult:
        ...

    def write_note(self, post_id: str, note_text: str, test_mode: bool, info: dict | None = None) -> dict:
        ...

    def notes_written(self, since_id: str | None = None, max_results: int = 100) -> dict:
        ...

    def get_usage(self) -> dict:
        ...


@dataclass
class FixtureXCommunityNotesClient:
    settings: Settings
    cost_ledger: CostLedger

    def search_posts_eligible_for_notes(self, test_mode: bool, max_results: int, feed_lang: str = "en", feed_size: str = "small") -> dict:
        self.cost_ledger.log("x_fixture", "posts_eligible_for_notes", 0.001, "eligible-feed", {"test_mode": test_mode, "feed_size": feed_size})
        posts = [post for post in fixture_eligible_posts() if post.get("lang", "en") == feed_lang]
        return {
            "test_mode": test_mode,
            "feed_lang": feed_lang,
            "feed_size": feed_size,
            "posts": posts[:max_results],
        }

    def evaluate_note(self, post_id: str, note_text: str) -> XEvaluationResult:
        self.cost_ledger.log("x_fixture", "evaluate_note", 0.002, post_id)
        lowered = note_text.lower()
        claim_score = 0.92
        if "official" not in lowered and "cdc" not in lowered and "iea" not in lowered and "norway" not in lowered:
            claim_score = 0.42
        return XEvaluationResult(
            id=new_id(),
            draft_id="",
            candidate_id="",
            post_id=post_id,
            exact_text_hash=sha256_text(note_text),
            claim_opinion_score=claim_score,
            url_validity_score=0.99,
            harassment_abuse_score=0.99,
            helpfulness_score=0.86,
            raw={
                "fixture": True,
                "score_labels": {
                    "ClaimOpinion": "high" if claim_score >= 0.75 else "medium",
                    "UrlValidity": "high",
                    "HarassmentAbuse": "high",
                },
            },
        )

    def write_note(self, post_id: str, note_text: str, test_mode: bool, info: dict | None = None) -> dict:
        if self.settings.emergency_stop_external_writes:
            raise PermissionError("Emergency stop blocks all external writes")
        self.cost_ledger.log("x_fixture", "write_note", 0.003, post_id, {"test_mode": test_mode})
        if not test_mode and not self.settings.allow_non_test_mode_write:
            raise PermissionError("Non-test write blocked by ALLOW_NON_TEST_MODE_WRITE=false")
        return {
            "id": f"fixture-write-{new_id()}",
            "post_id": post_id,
            "test_mode": test_mode,
            "accepted": True,
            "info": info or {},
        }

    def notes_written(self, since_id: str | None = None, max_results: int = 100) -> dict:
        self.cost_ledger.log("x_fixture", "notes_written", 0.001, "notes-written", {"since_id": since_id})
        return {"notes": fixture_notes_written()[:max_results], "since_id": since_id}

    def get_usage(self) -> dict:
        return {
            "usage_api": {
                "source": "fixture_usage_api",
                "daily_post_consumption": len(self.cost_ledger.entries),
                "monthly_post_consumption": len(self.cost_ledger.entries),
                "deduplication_soft_guarantee": True,
            }
        }


@dataclass
class LiveXCommunityNotesClient:
    settings: Settings
    cost_ledger: CostLedger

    def __post_init__(self) -> None:
        self._access_token = self.settings.x_bearer_token
        self._refresh_token = self.settings.x_oauth2_refresh_token

    def _disabled(self) -> None:
        if not self.settings.allow_live_x_api:
            raise PermissionError("Live X API calls are disabled by default. Set ALLOW_LIVE_X_API=true to enable.")
        if not self.settings.x_live_credentials_configured():
            raise PermissionError("A user-context X credential is required: set X_BEARER_TOKEN or X_OAUTH2_REFRESH_TOKEN with X_OAUTH2_CLIENT_ID.")

    def _access_token_for_request(self) -> str:
        if self.settings.x_oauth2_refresh_configured() and (not self._access_token or self._access_token == self.settings.x_bearer_token):
            token = refresh_oauth2_user_access_token(
                self.settings.x_oauth2_client_id,
                self.settings.x_oauth2_client_secret,
                self._refresh_token or self.settings.x_oauth2_refresh_token,
            )
            self._access_token = token.access_token
            self._refresh_token = token.refresh_token or self._refresh_token
        if self._access_token:
            return self._access_token
        raise PermissionError("A user-context X credential is required: set X_BEARER_TOKEN or X_OAUTH2_REFRESH_TOKEN with X_OAUTH2_CLIENT_ID.")

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token_for_request()}"}

    def _normalize_post(self, item: dict) -> dict:
        return {
            "x_post_id": str(item.get("id") or item.get("x_post_id")),
            "text": item.get("text", ""),
            "author_id": str(item.get("author_id", "unknown")),
            "lang": item.get("lang", "en"),
            "note_tweet": item.get("note_tweet", {}),
            "referenced_posts": item.get("referenced_posts", []),
            "quoted_posts": item.get("quoted_posts", []),
            "replied_to_posts": item.get("replied_to_posts", []),
            "media_metadata": item.get("media_metadata", []),
            "suggested_source_links_with_counts": item.get("suggested_source_links_with_counts", []),
            "note_request_suggestions": item.get("note_request_suggestions", []),
            "raw_x_api": item,
        }

    def search_posts_eligible_for_notes(self, test_mode: bool, max_results: int, feed_lang: str = "en", feed_size: str = "small") -> dict:
        self._disabled()
        params = urlencode(
            {
                "test_mode": str(test_mode).lower(),
                "max_results": max(1, min(max_results, 100)),
                "post_selection": f"feed_size: {feed_size}, feed_lang: {feed_lang}",
                "tweet.fields": "author_id,created_at,lang,note_tweet,media_metadata,note_request_suggestions,suggested_source_links_with_counts,text,referenced_tweets",
            }
        )
        payload = request_json(
            "GET",
            f"https://api.x.com/2/notes/search/posts_eligible_for_notes?{params}",
            headers=self._headers(),
        )
        self.cost_ledger.log("x_live", "posts_eligible_for_notes", 0.0, "eligible-feed", {"test_mode": test_mode, "feed_size": feed_size})
        return {
            "test_mode": test_mode,
            "feed_lang": feed_lang,
            "feed_size": feed_size,
            "posts": [self._normalize_post(item) for item in payload.get("data", [])],
            "meta": payload.get("meta", {}),
            "errors": payload.get("errors", []),
        }

    def evaluate_note(self, post_id: str, note_text: str) -> XEvaluationResult:
        self._disabled()
        payload = request_json(
            "POST",
            "https://api.x.com/2/evaluate_note",
            headers=self._headers(),
            body={"post_id": post_id, "note_text": note_text},
        )
        data = payload.get("data", {})
        score = float(data.get("claim_opinion_score", 0.0))
        self.cost_ledger.log("x_live", "evaluate_note", 0.0, post_id)
        return XEvaluationResult(
            id=new_id(),
            draft_id="",
            candidate_id="",
            post_id=post_id,
            exact_text_hash=sha256_text(note_text),
            claim_opinion_score=score,
            url_validity_score=float(data.get("url_validity_score", 0.0) or 0.0),
            harassment_abuse_score=float(data.get("harassment_abuse_score", 0.0) or 0.0),
            helpfulness_score=float(data.get("helpfulness_score", score) or score),
            raw=payload,
        )

    def write_note(self, post_id: str, note_text: str, test_mode: bool, info: dict | None = None) -> dict:
        self._disabled()
        if self.settings.emergency_stop_external_writes:
            raise PermissionError("Emergency stop blocks all external writes")
        if not self.settings.allow_live_x_write:
            raise PermissionError("Live X write_note is blocked by ALLOW_LIVE_X_WRITE=false")
        if not test_mode and not self.settings.allow_non_test_mode_write:
            raise PermissionError("Non-test write blocked by ALLOW_NON_TEST_MODE_WRITE=false")
        payload = request_json(
            "POST",
            "https://api.x.com/2/notes",
            headers=self._headers(),
            body={
                "post_id": post_id,
                "test_mode": test_mode,
                "info": {
                    "text": note_text,
                    "trustworthy_sources": True,
                    "misleading_tags": list((info or {}).get("misleading_tags", [])),
                    "is_media_note": bool((info or {}).get("is_media_note", False)),
                },
            },
        )
        self.cost_ledger.log("x_live", "write_note", 0.0, post_id, {"test_mode": test_mode})
        return payload

    def notes_written(self, since_id: str | None = None, max_results: int = 100) -> dict:
        self._disabled()
        params = {"max_results": max(1, min(max_results, 100))}
        if since_id:
            params["since_id"] = since_id
        payload = request_json(
            "GET",
            f"https://api.x.com/2/notes/search/notes_written?{urlencode(params)}",
            headers=self._headers(),
        )
        self.cost_ledger.log("x_live", "notes_written", 0.0, "notes-written", {"since_id": since_id})
        notes = []
        for item in payload.get("data", []):
            scoring = item.get("scoring_status", {})
            notes.append(
                {
                    "id": new_id(),
                    "note_id": str(item.get("id", "")),
                    "candidate_id": str(item.get("post_id", "")),
                    "created_at": item.get("created_at", ""),
                    "crh": False,
                    "crnh": False,
                    "nmr": False,
                    "claim_opinion": "unknown",
                    "url_validity": "unknown",
                    "harassment_abuse": "unknown",
                    "helpfulness": "unknown",
                    "test_result": item.get("test_result", "unknown"),
                    "scoring_status": "has_access" if scoring.get("has_access") else "unknown",
                }
            )
        return {"notes": notes, "meta": payload.get("meta", {}), "errors": payload.get("errors", [])}

    def get_usage(self) -> dict:
        self._disabled()
        payload = request_json("GET", "https://api.x.com/2/usage/tweets?days=7", headers=self._headers())
        data = payload.get("data", {})
        project_usage = int(data.get("project_usage") or 0)
        return {
            "usage_api": {
                "source": "x_usage_api",
                "daily_post_consumption": project_usage,
                "monthly_post_consumption": project_usage,
                "deduplication_soft_guarantee": True,
                "raw": payload,
            }
        }
