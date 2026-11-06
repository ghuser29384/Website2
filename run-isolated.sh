#!/usr/bin/env bash
set -euo pipefail
: "${TEST_ROOT:?}" "${TEST_PYTHON:?}" "${PG_BIN:?}"
export PATH="$PG_BIN:/usr/bin:/bin"
export HOME="$TEST_ROOT"
export PGDATA="$TEST_ROOT/pgdata"
initdb --auth=trust --username=synthetic --no-locale >/dev/null
pg_ctl -l "$TEST_ROOT/postgres.log" -o "-h 127.0.0.1 -p 55432 -k $TEST_ROOT" -w start >/dev/null
trap 'pg_ctl -m fast -w stop >/dev/null' EXIT
createdb -h 127.0.0.1 -p 55432 -U synthetic render_reconnect_synthetic
export SYNTHETIC_DATABASE_URL='postgresql://synthetic@127.0.0.1:55432/render_reconnect_synthetic'
"$TEST_PYTHON" -B "$TEST_ROOT/test_storage_disconnect.py"
"$TEST_PYTHON" -B "$TEST_ROOT/test_storage_reconnect.py"
TEST_BASELINE=1 "$TEST_PYTHON" -B "$TEST_ROOT/integration_reconnect.py"
"$TEST_PYTHON" -B "$TEST_ROOT/integration_reconnect.py"

# Separate application database contents from component fixtures.
dropdb -h 127.0.0.1 -p 55432 -U synthetic render_reconnect_synthetic
createdb -h 127.0.0.1 -p 55432 -U synthetic render_reconnect_synthetic
cp "$TEST_ROOT/storage_reconnect_candidate.py" "$TEST_ROOT/source/apps/api/app/storage.py"
PYTHONPATH="$TEST_ROOT/source/apps/api" "$TEST_PYTHON" -B -m unittest discover -s "$TEST_ROOT/source/apps/api/tests" -q
"$TEST_PYTHON" -B "$TEST_ROOT/integration_app_restart.py"

# Synthetic-only backup/restore; dump never leaves disposable runner.
pg_dump -h 127.0.0.1 -p 55432 -U synthetic -Fc render_reconnect_synthetic > "$TEST_ROOT/synthetic.dump"
pg_restore --list "$TEST_ROOT/synthetic.dump" >/dev/null
psql -h 127.0.0.1 -p 55432 -U synthetic -d render_reconnect_synthetic -Atc "select row_to_json(r)::text from app_records r order by record_type,id" | sha256sum | cut -d' ' -f1 > "$TEST_ROOT/before.sha"
dropdb -h 127.0.0.1 -p 55432 -U synthetic render_reconnect_synthetic
createdb -h 127.0.0.1 -p 55432 -U synthetic render_reconnect_synthetic
pg_restore -h 127.0.0.1 -p 55432 -U synthetic --exit-on-error --no-owner -d render_reconnect_synthetic "$TEST_ROOT/synthetic.dump"
psql -h 127.0.0.1 -p 55432 -U synthetic -d render_reconnect_synthetic -Atc "select row_to_json(r)::text from app_records r order by record_type,id" | sha256sum | cut -d' ' -f1 > "$TEST_ROOT/after.sha"
cmp "$TEST_ROOT/before.sha" "$TEST_ROOT/after.sha"
"$TEST_PYTHON" -B "$TEST_ROOT/integration_app_restart.py" recover
echo 'PASS: synthetic backup restored with all record hashes equal and application approval valid'
