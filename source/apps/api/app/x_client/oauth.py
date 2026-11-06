from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from urllib.parse import quote, urlencode

from app.services.providers import ProviderError, request_form_json


X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize"
X_TOKEN_URL = "https://api.x.com/2/oauth2/token"


@dataclass(frozen=True)
class OAuth2TokenResponse:
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str
    scope: str
    raw: dict


def generate_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


def oauth2_authorize_url(client_id: str, redirect_uri: str, scopes: str, state: str, code_challenge: str) -> str:
    params = urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        },
        quote_via=quote,
    )
    return f"{X_AUTHORIZE_URL}?{params}"


def exchange_oauth2_code(
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    code: str,
    code_verifier: str,
) -> OAuth2TokenResponse:
    payload = request_form_json(
        "POST",
        X_TOKEN_URL,
        form={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code": code,
            "code_verifier": code_verifier,
        },
        basic_auth=(client_id, client_secret) if client_secret else None,
        timeout=30,
    )
    return _token_response(payload)


def refresh_oauth2_user_access_token(client_id: str, client_secret: str, refresh_token: str) -> OAuth2TokenResponse:
    payload = request_form_json(
        "POST",
        X_TOKEN_URL,
        form={
            "grant_type": "refresh_token",
            "client_id": client_id,
            "refresh_token": refresh_token,
        },
        basic_auth=(client_id, client_secret) if client_secret else None,
        timeout=30,
    )
    return _token_response(payload, fallback_refresh_token=refresh_token)


def _token_response(payload: dict, fallback_refresh_token: str = "") -> OAuth2TokenResponse:
    access_token = str(payload.get("access_token") or "")
    if not access_token:
        raise ProviderError("X OAuth token response did not include access_token")
    return OAuth2TokenResponse(
        access_token=access_token,
        refresh_token=str(payload.get("refresh_token") or fallback_refresh_token),
        expires_in=int(payload.get("expires_in") or 0),
        token_type=str(payload.get("token_type") or "bearer"),
        scope=str(payload.get("scope") or ""),
        raw=payload,
    )
