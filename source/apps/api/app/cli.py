from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import ensure_local_dir, mark_migrated, mark_seeded
from app.settings import Settings
from app.x_client.oauth import exchange_oauth2_code, generate_pkce_pair, oauth2_authorize_url, refresh_oauth2_user_access_token


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else "help"
    if command == "db-up":
        path = ensure_local_dir()
        print(f"Local fixture database directory ready: {path}")
        return 0
    if command == "migrate":
        path = mark_migrated()
        print(f"Migration marker written: {path}")
        return 0
    if command == "seed-fixtures":
        path = mark_seeded()
        print(f"Fixture seed marker written: {path}")
        return 0
    if command == "x-oauth-start":
        settings = Settings.from_env()
        if not settings.x_oauth2_client_id or not settings.x_oauth2_redirect_uri:
            print("Set X_OAUTH2_CLIENT_ID and X_OAUTH2_REDIRECT_URI first.")
            return 2
        code_verifier, code_challenge = generate_pkce_pair()
        state = argv[2] if len(argv) > 2 else "cn-copilot"
        print("Open this URL while signed in as the X account with Community Notes API access:")
        print(oauth2_authorize_url(settings.x_oauth2_client_id, settings.x_oauth2_redirect_uri, settings.x_oauth2_scopes, state, code_challenge))
        print("")
        print("Keep these local values for the exchange step. Do not put them in chat.")
        print(f"state={state}")
        print(f"code_verifier={code_verifier}")
        return 0
    if command == "x-oauth-exchange":
        settings = Settings.from_env()
        if len(argv) < 4:
            print("Usage: python3 apps/api/app/cli.py x-oauth-exchange CODE CODE_VERIFIER")
            return 2
        if not settings.x_oauth2_client_id or not settings.x_oauth2_redirect_uri:
            print("Set X_OAUTH2_CLIENT_ID and X_OAUTH2_REDIRECT_URI first.")
            return 2
        token = exchange_oauth2_code(
            settings.x_oauth2_client_id,
            settings.x_oauth2_client_secret,
            settings.x_oauth2_redirect_uri,
            argv[2],
            argv[3],
        )
        _print_x_token_env(token.access_token, token.refresh_token)
        return 0
    if command == "x-oauth-refresh":
        settings = Settings.from_env()
        if not settings.x_oauth2_client_id or not settings.x_oauth2_refresh_token:
            print("Set X_OAUTH2_CLIENT_ID and X_OAUTH2_REFRESH_TOKEN first.")
            return 2
        token = refresh_oauth2_user_access_token(
            settings.x_oauth2_client_id,
            settings.x_oauth2_client_secret,
            settings.x_oauth2_refresh_token,
        )
        _print_x_token_env(token.access_token, token.refresh_token)
        return 0
    print("Usage: python3 apps/api/app/cli.py [db-up|migrate|seed-fixtures|x-oauth-start|x-oauth-exchange|x-oauth-refresh]")
    return 2


def _print_x_token_env(access_token: str, refresh_token: str) -> None:
    print("Add or update these Render environment variables:")
    print(f"X_BEARER_TOKEN={access_token}")
    if refresh_token:
        print(f"X_OAUTH2_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
