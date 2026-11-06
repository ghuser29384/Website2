"""Prepared only. Requires a disposable loopback PostgreSQL database; no live credentials."""
import importlib.util
import os
from pathlib import Path
import sys
import types
from urllib.parse import urlsplit

url = os.environ.get('SYNTHETIC_DATABASE_URL', '')
u = urlsplit(url)
if (u.scheme != 'postgresql' or u.hostname not in ('127.0.0.1', '::1')
        or u.path != '/render_reconnect_synthetic' or u.query or u.fragment):
    raise SystemExit('STOP: dedicated loopback synthetic database required')
import psycopg
class Settings:
    database_url = url
sys.modules['app'] = types.ModuleType('app')
sys.modules['app.settings'] = types.ModuleType('app.settings')
sys.modules['app.settings'].Settings = Settings
spec = importlib.util.spec_from_file_location('candidate', Path(__file__).with_name('apps_api_app_storage.py' if os.environ.get('TEST_BASELINE') == '1' else 'storage_reconnect_candidate.py'))
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)
store = mod.PostgresRecordStore(Settings())
payload = {'id': 'synthetic-draft', 'approval_record': {'approval_id': 'synthetic-only'}, 'text': 'fixture'}
store.upsert('draft', 'synthetic-draft', payload)
assert store.get('draft', 'synthetic-draft') == payload
store._connection.close()
if os.environ.get('TEST_BASELINE') == '1':
    try:
        store.get('draft', 'synthetic-draft')
    except psycopg.OperationalError:
        print('PASS: unchanged baseline reproduces closed-connection failure')
        raise SystemExit(0)
    raise AssertionError('Expected baseline disconnect failure missing')
assert store.get('draft', 'synthetic-draft') == payload
# Kill only this test client's backend, never any other sessions.
pid = store._connection.info.backend_pid
with psycopg.connect(url, autocommit=True) as admin:
    assert admin.execute('select pg_terminate_backend(%s)', (pid,)).fetchone()[0]
try:
    store.get('draft', 'synthetic-draft')
except psycopg.OperationalError:
    pass  # First request may discover the broken connection; never mask later failure.
assert store.get('draft', 'synthetic-draft') == payload
replacement = mod.PostgresRecordStore(Settings())
assert replacement.get('draft', 'synthetic-draft') == payload
replacement._connection.close()
store._connection.close()
print('PASS: real-driver storage persistence and reconnect; application restart acceptance remains separate')
