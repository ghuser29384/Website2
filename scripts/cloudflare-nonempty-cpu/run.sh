#!/usr/bin/env bash
set -euo pipefail
test "${CF_CANDIDATE:-}" = moraltrade
case "${1:-}" in
  prepare)
    CF_RUN_ROOT="$RUNNER_TEMP/cloudflare-nonempty-cpu"
    test ! -e "$CF_RUN_ROOT"
    mkdir -p "$CF_RUN_ROOT/home" "$CF_RUN_ROOT/app" "$CF_RUN_ROOT/harness"
    cp scripts/cloudflare-nonempty-cpu/{run.sh,check-lock.mjs,runtime-probe.mjs,preview-process.mjs,preview-process.test.mjs,synthetic-api.mjs,synthetic-api.test.mjs,scheduler-runtime-probe.mjs,nonempty-fixture.mjs,source-loader.mjs,source-jobs.test.mjs,offline-provider.mjs,offline-worker.mjs,cpu-profile.mjs,harness.test.mjs,nonempty-runtime-probe.mjs} "$CF_RUN_ROOT/harness/"
    git archive a4adf0cbb7029a6316a34478bd27dffad22cbca4 | tar -x -C "$CF_RUN_ROOT/app"
    (
      cd "$CF_RUN_ROOT/app"
      git apply --check "$GITHUB_WORKSPACE/scripts/cloudflare-nonempty-cpu/moraltrade.patch"
      git apply "$GITHUB_WORKSPACE/scripts/cloudflare-nonempty-cpu/moraltrade.patch"
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
    CF_APP_ROOT="$CF_RUN_ROOT/app" node --test "$CF_RUN_ROOT/harness/source-jobs.test.mjs" "$CF_RUN_ROOT/harness/harness.test.mjs"
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
