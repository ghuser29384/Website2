#!/usr/bin/env bash
set -euo pipefail
test "${CF_CANDIDATE:-}" = normativity
case "${1:-}" in
  prepare)
    CF_RUN_ROOT="$RUNNER_TEMP/cloudflare-normativity"
    mkdir -p "$CF_RUN_ROOT/home" "$CF_RUN_ROOT/app" "$CF_RUN_ROOT/harness"
    cp scripts/cloudflare-tsa/{run.sh,runtime-probe.mjs,tsa-worker-probe.mjs,preview-process.mjs,preview-process.test.mjs} "$CF_RUN_ROOT/harness/"
    test "$(git -C compatibility-inputs/normativity rev-parse HEAD)" = 4ee214324976cf579a77bde4788551cfe32f94fb
    tar -C compatibility-inputs/normativity --exclude=.git --exclude=node_modules -cf - . | tar -x -C "$CF_RUN_ROOT/app"
    (
      cd "$CF_RUN_ROOT/app"
      git apply --check "$GITHUB_WORKSPACE/scripts/cloudflare-tsa/normativity.patch"
      git apply "$GITHUB_WORKSPACE/scripts/cloudflare-tsa/normativity.patch"
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
    export WRANGLER_SEND_METRICS=false NO_COLOR=1 CF_COMPAT_TEST=1
    export DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic
    export DIRECT_URL="$DATABASE_URL"
    node --test "$CF_RUN_ROOT/harness/preview-process.test.mjs"
    cd "$CF_RUN_ROOT/app"
    npm --prefix cloudflare test
    npm --prefix cloudflare run test:tsa:crypto
    node cloudflare/build.mjs --bundle-only
    node "$CF_RUN_ROOT/harness/runtime-probe.mjs"
    node "$CF_RUN_ROOT/harness/tsa-worker-probe.mjs"
    ;;
  *) exit 2 ;;
esac
