from __future__ import annotations

import json
from base64 import b64encode
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from app.settings import Settings


class ProviderError(RuntimeError):
    pass


def request_json(method: str, url: str, headers: dict[str, str] | None = None, body: dict[str, Any] | None = None, timeout: int = 20) -> dict[str, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = Request(url, data=data, method=method, headers=headers or {})
    if data is not None:
        request.add_header("Content-Type", "application/json")
    endpoint = _endpoint_label(method, url)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        raw_error = exc.read().decode("utf-8", errors="replace")
        raise ProviderError(f"{endpoint} failed with HTTP {exc.code}: {_error_detail(raw_error)}") from exc
    except URLError as exc:
        raise ProviderError(f"{endpoint} failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ProviderError(f"{endpoint} timed out after {timeout}s") from exc
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ProviderError(f"{endpoint} returned invalid JSON: {_error_detail(raw)}") from exc


def request_form_json(
    method: str,
    url: str,
    form: dict[str, Any],
    headers: dict[str, str] | None = None,
    basic_auth: tuple[str, str] | None = None,
    timeout: int = 20,
) -> dict[str, Any]:
    request_headers = dict(headers or {})
    request_headers["Content-Type"] = "application/x-www-form-urlencoded"
    if basic_auth:
        userpass = f"{basic_auth[0]}:{basic_auth[1]}".encode("utf-8")
        request_headers["Authorization"] = f"Basic {b64encode(userpass).decode('ascii')}"
    data = urlencode(form).encode("utf-8")
    request = Request(url, data=data, method=method, headers=request_headers)
    endpoint = _endpoint_label(method, url)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        raw_error = exc.read().decode("utf-8", errors="replace")
        raise ProviderError(f"{endpoint} failed with HTTP {exc.code}: {_error_detail(raw_error)}") from exc
    except URLError as exc:
        raise ProviderError(f"{endpoint} failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ProviderError(f"{endpoint} timed out after {timeout}s") from exc
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ProviderError(f"{endpoint} returned invalid JSON: {_error_detail(raw)}") from exc


def _endpoint_label(method: str, url: str) -> str:
    parsed = urlsplit(url)
    return f"{method} {parsed.scheme}://{parsed.netloc}{parsed.path}"


def _error_detail(raw: str) -> str:
    if not raw:
        return "empty response"
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return raw[:500].strip()
    errors = payload.get("errors")
    if isinstance(errors, list) and errors:
        parts = []
        for error in errors[:3]:
            if isinstance(error, dict):
                parts.append(str(error.get("detail") or error.get("title") or error.get("message") or error))
            else:
                parts.append(str(error))
        return "; ".join(parts)
    for key in ("detail", "title", "message", "error"):
        value = payload.get(key)
        if value:
            return str(value)
    return json.dumps(payload)[:500]


class BraveSearchClient:
    def __init__(self, settings: Settings):
        if not settings.allow_live_search:
            raise PermissionError("Live search is disabled. Set ALLOW_LIVE_SEARCH=true to enable.")
        if settings.search_provider != "brave":
            raise PermissionError("SEARCH_PROVIDER must be brave for live Brave Search.")
        if not settings.brave_search_api_key:
            raise PermissionError("BRAVE_SEARCH_API_KEY is required for Brave Search.")
        self.settings = settings

    def search(self, query: str, count: int = 5) -> list[dict[str, Any]]:
        params = urlencode({"q": query, "count": max(1, min(count, 10)), "country": "us", "search_lang": "en"})
        payload = request_json(
            "GET",
            f"https://api.search.brave.com/res/v1/web/search?{params}",
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": self.settings.brave_search_api_key,
            },
        )
        return list(payload.get("web", {}).get("results", []))


class OpenAIResponsesClient:
    def __init__(self, settings: Settings):
        if not settings.allow_live_llm:
            raise PermissionError("Live LLM calls are disabled. Set ALLOW_LIVE_LLM=true to enable.")
        if settings.llm_provider != "openai":
            raise PermissionError("LLM_PROVIDER must be openai for OpenAI calls.")
        if not settings.openai_api_key:
            raise PermissionError("OPENAI_API_KEY is required for OpenAI calls.")
        if not settings.llm_model:
            raise PermissionError("LLM_MODEL is required for OpenAI calls.")
        self.settings = settings

    def generate_json(self, instructions: str, user_input: str) -> Any:
        payload = request_json(
            "POST",
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
            body={
                "model": self.settings.llm_model,
                "instructions": instructions,
                "input": user_input,
            },
            timeout=45,
        )
        text = payload.get("output_text") or _extract_response_text(payload)
        if not text:
            raise ProviderError("OpenAI response did not include text output")
        return json.loads(text)


def _extract_response_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            text = content.get("text")
            if text:
                parts.append(text)
    return "\n".join(parts)
