"""Disposable hosted fixture launcher. Never use for production."""
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

# Verified from the synthetic Neon project connection dialog on 2026-11-06.
EXPECTED_NEON_HOST = 'ep-odd-math-bbw3do3q-pooler.c-15.us-east-1.aws.neon.tech'
LIVE_FLAGS = ('ALLOW_LIVE_X_API', 'ALLOW_LIVE_X_WRITE', 'ALLOW_LIVE_SEARCH',
              'ALLOW_LIVE_LLM', 'ALLOW_NON_TEST_MODE_WRITE')
LIVE_KEYS = ('X_BEARER_TOKEN', 'X_OAUTH2_CLIENT_ID', 'X_OAUTH2_CLIENT_SECRET',
             'X_OAUTH2_REFRESH_TOKEN', 'BRAVE_SEARCH_API_KEY', 'OPENAI_API_KEY')

def validate(env, expected_host):
    if not expected_host:
        raise ValueError('Synthetic endpoint has not been verified')
    if any(env.get(k, '').strip().lower() not in ('', '0', 'false', 'no', 'off') for k in LIVE_FLAGS):
        raise ValueError('Live integration flags are prohibited')
    if any(env.get(k) for k in LIVE_KEYS):
        raise ValueError('Live credentials are prohibited')
    if any(env.get(k, 'fixture') != 'fixture' for k in ('X_PROVIDER', 'SEARCH_PROVIDER', 'LLM_PROVIDER')):
        raise ValueError('Only fixture providers are permitted')
    try:
        u = urlsplit(env.get('DATABASE_URL', ''))
        q = parse_qs(u.query, strict_parsing=True)
        valid = (u.scheme == 'postgresql' and u.hostname == expected_host
                 and u.path == '/render_reconnect_synthetic' and u.port in (None, 5432)
                 and bool(u.username) and bool(u.password) and not u.fragment
                 and q.get('sslmode') == ['verify-full']
                 and set(q) <= {'sslmode', 'channel_binding'}
                 and q.get('channel_binding', ['require']) == ['require'])
    except ValueError:
        valid = False
    if not valid:
        raise ValueError('Database destination or TLS settings rejected')

def main():
    validate(os.environ, EXPECTED_NEON_HOST)
    os.environ.update({k: 'false' for k in LIVE_FLAGS})
    os.environ.update(X_PROVIDER='fixture', SEARCH_PROVIDER='fixture', LLM_PROVIDER='fixture',
                      PERSISTENCE_PROVIDER='postgres', APP_ENV='synthetic', REQUIRE_OPERATOR_APPROVAL='true')
    sys.path.insert(0, str(Path(__file__).parent / 'source/apps/api'))
    # Select the tested storage candidate before importing AppState/main.
    import storage_reconnect_candidate
    sys.modules['app.storage'] = storage_reconnect_candidate
    from app.main import main as run
    return run()

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception:
        # No credential-bearing exception text or traceback in hosted logs.
        print('STOP: synthetic startup failed', file=sys.stderr)
        raise SystemExit(1)
