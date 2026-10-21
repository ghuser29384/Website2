#!/usr/bin/env bash
set -euo pipefail
test "${CF_CANDIDATE:-}" = moraltrade
case "${1:-}" in
  prepare)
    CF_RUN_ROOT="$RUNNER_TEMP/cloudflare-roundtrips-cpu"
    test ! -e "$CF_RUN_ROOT"
    test -x /usr/lib/postgresql/16/bin/initdb
    test -x /usr/lib/postgresql/16/bin/pg_ctl
    test -x /usr/lib/postgresql/16/bin/psql
    mkdir -p "$CF_RUN_ROOT/home" "$CF_RUN_ROOT/app" "$CF_RUN_ROOT/harness"
    cp scripts/cloudflare-roundtrips-cpu/{run.sh,check-lock.mjs,runtime-probe.mjs,preview-process.mjs,preview-process.test.mjs,synthetic-api.mjs,synthetic-api.test.mjs,scheduler-runtime-probe.mjs,nonempty-fixture.mjs,source-loader.mjs,source-jobs.test.mjs,offline-provider.mjs,offline-worker.mjs,cpu-profile.mjs,cpu-profile.test.mjs,harness.test.mjs,nonempty-runtime-probe.mjs,reminder-batch.sql,reminder-database.test.mjs} "$CF_RUN_ROOT/harness/"
    git show a4adf0cbb7029a6316a34478bd27dffad22cbca4:src/app/api/jobs/trade-reminders/route.ts > "$CF_RUN_ROOT/harness/baseline-trade-reminders.ts"
    git archive a4adf0cbb7029a6316a34478bd27dffad22cbca4 | tar -x -C "$CF_RUN_ROOT/app"
    (
      cd "$CF_RUN_ROOT/app"
      git apply --check "$GITHUB_WORKSPACE/scripts/cloudflare-roundtrips-cpu/moraltrade.patch"
      git apply "$GITHUB_WORKSPACE/scripts/cloudflare-roundtrips-cpu/moraltrade.patch"
    )
    export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1
    cp "$CF_RUN_ROOT/app/package-lock.json" "$CF_RUN_ROOT/base-lock.json"
    npm install --prefix "$CF_RUN_ROOT/app" --package-lock-only --ignore-scripts --no-audit --no-fund
    node "$CF_RUN_ROOT/harness/check-lock.mjs" "$CF_RUN_ROOT"
    npm ci --prefix "$CF_RUN_ROOT/app" --ignore-scripts --no-audit --no-fund
    ;;
  offline)
    test "${CF_OFFLINE_NAMESPACE:-}" = 1
    test "$(id -u)" -ne 0
    test "$(ip -o link show | wc -l | tr -d ' ')" = 1
    ip link show lo >/dev/null
    test -z "$(ip route show default)"
    test -z "$(ip -6 route show default)"
    export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1 NO_COLOR=1
    export MORAL_TRADE_DISABLE_DEP_REPAIR=1 CF_COMPAT_TEST=1
    node --test "$CF_RUN_ROOT/harness/preview-process.test.mjs" "$CF_RUN_ROOT/harness/synthetic-api.test.mjs"
    CF_APP_ROOT="$CF_RUN_ROOT/app" node --test "$CF_RUN_ROOT/harness/source-jobs.test.mjs" "$CF_RUN_ROOT/harness/harness.test.mjs" "$CF_RUN_ROOT/harness/cpu-profile.test.mjs"
    export CF_TEST_PG_ROOT=/tmp/mt-roundtrip-pg-cloud
    export CF_TEST_PSQL=/usr/lib/postgresql/16/bin/psql
    test ! -e "$CF_TEST_PG_ROOT"
    mkdir -m 700 "$CF_TEST_PG_ROOT"
    mkdir -m 700 "$CF_TEST_PG_ROOT/socket"
    /usr/lib/postgresql/16/bin/initdb -D "$CF_TEST_PG_ROOT/data" -U postgres --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8 --no-clean > "$CF_RUN_ROOT/initdb.log"
    /usr/lib/postgresql/16/bin/pg_ctl -D "$CF_TEST_PG_ROOT/data" -l "$CF_RUN_ROOT/postgres.log" -o "-c listen_addresses='' -c unix_socket_directories='$CF_TEST_PG_ROOT/socket' -c unix_socket_permissions=0700 -p 15439" -w start
    trap '/usr/lib/postgresql/16/bin/pg_ctl -D "$CF_TEST_PG_ROOT/data" -m fast -w stop' EXIT
    CF_APP_ROOT="$CF_RUN_ROOT/app" CF_BASELINE_REMINDER="$CF_RUN_ROOT/harness/baseline-trade-reminders.ts" node --test "$CF_RUN_ROOT/harness/reminder-database.test.mjs"
    /usr/lib/postgresql/16/bin/pg_ctl -D "$CF_TEST_PG_ROOT/data" -m fast -w stop
    trap - EXIT
    cd "$CF_RUN_ROOT/app"
    node --test cloudflare/scheduler.test.mjs
    MORAL_TRADE_DISABLE_SUPABASE=false npm test
    export MORAL_TRADE_DISABLE_SUPABASE=true VERCEL=1 VERCEL_ENV=preview
    export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:15433
    export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-public-key-only
    export NEXT_PUBLIC_SITE_URL=https://synthetic.invalid
    export NODE_OPTIONS=--max-old-space-size=6144
    npm run build:cloudflare:compat
    node "$CF_RUN_ROOT/harness/runtime-probe.mjs"
    MORAL_TRADE_DISABLE_SUPABASE=false node "$CF_RUN_ROOT/harness/scheduler-runtime-probe.mjs"
    MORAL_TRADE_DISABLE_SUPABASE=false node "$CF_RUN_ROOT/harness/nonempty-runtime-probe.mjs"
    ;;
  *) exit 2 ;;
esac
