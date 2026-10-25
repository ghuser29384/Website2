#!/usr/bin/env bash
set -euo pipefail
case "${CANDIDATE:-}" in canonical|legacy) ;; *) exit 2;; esac
case "${DISCOVER_LOADER_VARIANT:-}" in baseline|narrow) ;; *) exit 2;; esac
case "${1:-}" in
prepare)
 bash scripts/netlify-compat/run.sh prepare
 node scripts/netlify-jobs/edge-cache.mjs prepare "$RUNNER_TEMP/netlify-compat-$CANDIDATE"
 node scripts/netlify-jobs/background/prepare.mjs "$RUNNER_TEMP/netlify-compat-$CANDIDATE/app" "$PWD/scripts/netlify-jobs/background"
 if test "${DISCOVER_LOADER_VARIANT:-}" = narrow; then node scripts/netlify-jobs/discover/loader/prepare.mjs "$RUNNER_TEMP/netlify-compat-$CANDIDATE/app"; fi
 cp -R scripts/netlify-jobs "$RUNNER_TEMP/netlify-compat-$CANDIDATE/jobs"
 ;;
offline)
 test "${OFFLINE_NAMESPACE:-}" = 1
 test "$(id -u)" -ne 0
 test "$(ip -o link show | wc -l | tr -d ' ')" = 1
 test -z "$(ip route show default)"
 test -z "$(ip -6 route show default)"
 test -x "$PG_BIN/postgres"
 export PATH="$ROOT/edge-tools/bin:$PATH" DENO_DIR="$ROOT/home/deno-cache" DENO_NO_UPDATE_CHECK=1
 export NETLIFY_JOB_APP="$ROOT/app"
 node "$ROOT/jobs/edge-cache.mjs" offline "$ROOT"
 node --test "$ROOT/jobs/"*.test.mjs "$ROOT/jobs/background/"*.test.mjs
 node --test "$ROOT/jobs/search/process-cpu.test.mjs" "$ROOT/jobs/search/profile-hook.test.mjs" "$ROOT/jobs/search/profile-locations.test.mjs"
 node --test "$ROOT/jobs/hosted-search/"*.test.mjs
 node "$ROOT/jobs/serve-offline.mjs"
 ;;
*) exit 2;;
esac
