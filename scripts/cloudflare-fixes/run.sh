#!/usr/bin/env bash
# Prepared only: execution requires the user's installation/push approval.
set -euo pipefail
case "${CF_CANDIDATE:-}" in moraltrade|normativity) ;; *) exit 2 ;; esac
case "${1:-}" in
  prepare)
    CF_RUN_ROOT="$RUNNER_TEMP/cloudflare-$CF_CANDIDATE"
    export CF_RUN_ROOT
    mkdir -p "$CF_RUN_ROOT/home" "$CF_RUN_ROOT/app" "$CF_RUN_ROOT/harness"
    cp scripts/cloudflare-fixes/{run.sh,runtime-probe.mjs,check-lock.mjs,preview-process.mjs,preview-process.test.mjs} "$CF_RUN_ROOT/harness/"
    if test "$CF_CANDIDATE" = moraltrade; then
      git archive a4adf0cbb7029a6316a34478bd27dffad22cbca4 | tar -x -C "$CF_RUN_ROOT/app"
    else
      test "$(git -C compatibility-inputs/normativity rev-parse HEAD)" = 4ee214324976cf579a77bde4788551cfe32f94fb
      # Preserve the sparse checkout: tracked node_modules must not be copied.
      tar -C compatibility-inputs/normativity --exclude=.git --exclude=node_modules -cf - . |
        tar -x -C "$CF_RUN_ROOT/app"
    fi
    (
      cd "$CF_RUN_ROOT/app"
      git apply --check "$GITHUB_WORKSPACE/scripts/cloudflare-fixes/$CF_CANDIDATE.patch"
      git apply "$GITHUB_WORKSPACE/scripts/cloudflare-fixes/$CF_CANDIDATE.patch"
    )
    export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1
    if test "$CF_CANDIDATE" = moraltrade; then
      cp "$CF_RUN_ROOT/app/package-lock.json" "$CF_RUN_ROOT/base-lock.json"
      npm install --prefix "$CF_RUN_ROOT/app" --package-lock-only --ignore-scripts --no-audit --no-fund
      node "$CF_RUN_ROOT/harness/check-lock.mjs" "$CF_RUN_ROOT"
      npm ci --prefix "$CF_RUN_ROOT/app" --ignore-scripts --no-audit --no-fund
    else
      npm ci --prefix "$CF_RUN_ROOT/app/server" --ignore-scripts --no-audit --no-fund
      npm install --prefix "$CF_RUN_ROOT/app/cloudflare" --ignore-scripts --no-audit --no-fund
      # Existing pinned Prisma generator may obtain its matching engine.
      # No DB is contacted, no schema is applied, and root postinstall is unused.
      env -i PATH="$PATH" HOME="$CF_RUN_ROOT/home" CF_COMPAT_TEST=1 \
        DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic \
        DIRECT_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic \
        node "$CF_RUN_ROOT/app/cloudflare/build.mjs" --generate-only
    fi
    ;;
  offline)
    test "${CF_OFFLINE_NAMESPACE:-}" = 1
    test -n "${CF_RUN_ROOT:-}"
    export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1 NO_COLOR=1
    export MORAL_TRADE_DISABLE_DEP_REPAIR=1 CF_COMPAT_TEST=1
    export DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic
    export DIRECT_URL="$DATABASE_URL"
    node --test "$CF_RUN_ROOT/harness/preview-process.test.mjs"
    cd "$CF_RUN_ROOT/app"
    if test "$CF_CANDIDATE" = moraltrade; then
      # Existing mocked tests require the original env switch value.
      MORAL_TRADE_DISABLE_SUPABASE=false npm test
      export MORAL_TRADE_DISABLE_SUPABASE=true VERCEL=1 VERCEL_ENV=preview
      export NODE_OPTIONS=--max-old-space-size=6144
      npm run build:cloudflare:compat
    else
      npm --prefix cloudflare test
      node cloudflare/build.mjs --bundle-only
    fi
    node "$CF_RUN_ROOT/harness/runtime-probe.mjs"
    ;;
  *) exit 2 ;;
esac
