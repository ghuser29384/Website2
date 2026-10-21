#!/usr/bin/env bash
set -euo pipefail
test "${CF_CANDIDATE:-}" = normativity
case "${1:-}" in
  prepare)
    CF_RUN_ROOT="$RUNNER_TEMP/cloudflare-db-jobs"
    test ! -e "$CF_RUN_ROOT"
    mkdir -p "$CF_RUN_ROOT/home" "$CF_RUN_ROOT/app" "$CF_RUN_ROOT/harness"
    cp scripts/cloudflare-db-jobs/{run.sh,runtime-probe.mjs,tsa-worker-probe.mjs,database-runtime-probe.mjs,preview-process.mjs,preview-process.test.mjs,moraltrade-source-schedules.mjs,moraltrade-schedule.mjs,moraltrade-schedule.test.mjs} "$CF_RUN_ROOT/harness/"
    test -x /usr/lib/postgresql/16/bin/initdb
    test -x /usr/lib/postgresql/16/bin/pg_ctl
    /usr/lib/postgresql/16/bin/postgres --version
    test "$(git -C compatibility-inputs/normativity rev-parse HEAD)" = 4ee214324976cf579a77bde4788551cfe32f94fb
    cmp scripts/vercel-project-config.mjs "$CF_RUN_ROOT/harness/moraltrade-source-schedules.mjs"
    tar -C compatibility-inputs/normativity --exclude=.git --exclude=node_modules --exclude=.env --exclude='.env.*' -cf - . | tar -x -C "$CF_RUN_ROOT/app"
    (
      cd "$CF_RUN_ROOT/app"
      git apply --check "$GITHUB_WORKSPACE/scripts/cloudflare-db-jobs/normativity.patch"
      git apply "$GITHUB_WORKSPACE/scripts/cloudflare-db-jobs/normativity.patch"
    )
    export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1
    npm ci --prefix "$CF_RUN_ROOT/app/server" --ignore-scripts --no-audit --no-fund
    npm install --prefix "$CF_RUN_ROOT/app/cloudflare" --ignore-scripts --no-audit --no-fund
    env -i PATH="$PATH" HOME="$CF_RUN_ROOT/home" CF_COMPAT_TEST=1 \
      DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic \
      DIRECT_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic \
      node "$CF_RUN_ROOT/app/cloudflare/build.mjs" --generate-only
    ;;
  offline)
    test "${CF_OFFLINE_NAMESPACE:-}" = 1
    test "$(id -u)" -ne 0
    test "$(ip -o link show | wc -l | tr -d ' ')" = 1
    ip link show lo >/dev/null
    test -z "$(ip route show default)"
    test -z "$(ip -6 route show default)"
    test ! -e "$CF_RUN_ROOT/pgdata"
    export WRANGLER_SEND_METRICS=false NO_COLOR=1 CF_COMPAT_TEST=1
    export DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic
    export DIRECT_URL="$DATABASE_URL"
    export PATH="/usr/lib/postgresql/16/bin:$PATH"
    initdb -D "$CF_RUN_ROOT/pgdata" -U postgres --auth=trust --no-locale --encoding=UTF8 > "$CF_RUN_ROOT/initdb.log"
    mkdir "$CF_RUN_ROOT/pgsocket"
    cat >> "$CF_RUN_ROOT/pgdata/postgresql.conf" <<EOF
listen_addresses = '127.0.0.1'
port = 15432
unix_socket_directories = '$CF_RUN_ROOT/pgsocket'
max_connections = 30
shared_buffers = '32MB'
EOF
    pg_ctl -D "$CF_RUN_ROOT/pgdata" -l "$CF_RUN_ROOT/postgres.log" -w start
    trap 'pg_ctl -D "$CF_RUN_ROOT/pgdata" -m fast -w stop >/dev/null 2>&1 || true' EXIT
    psql -h 127.0.0.1 -p 15432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'CREATE ROLE synthetic LOGIN;'
    createdb -h 127.0.0.1 -p 15432 -U postgres -O synthetic synthetic
    for migration in "$CF_RUN_ROOT"/app/server/prisma/migrations/*/migration.sql; do
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f "$migration" > "$CF_RUN_ROOT/migration-$(basename "$(dirname "$migration")").log"
    done
    node --test "$CF_RUN_ROOT/harness/preview-process.test.mjs" "$CF_RUN_ROOT/harness/moraltrade-schedule.test.mjs"
    cd "$CF_RUN_ROOT/app"
    npm --prefix cloudflare test
    npm --prefix cloudflare run test:tsa:crypto
    node cloudflare/build.mjs --bundle-only
    node "$CF_RUN_ROOT/harness/runtime-probe.mjs"
    node "$CF_RUN_ROOT/harness/tsa-worker-probe.mjs"
    node "$CF_RUN_ROOT/harness/database-runtime-probe.mjs"
    ;;
  *) exit 2 ;;
esac
