#!/usr/bin/env bash
set -euo pipefail
case "${CANDIDATE:-}" in canonical|legacy) ;; *) exit 2;; esac
case "${1:-}" in
prepare)
 bash scripts/netlify-compat/run.sh prepare
 node scripts/netlify-jobs/edge-cache.mjs prepare "$RUNNER_TEMP/netlify-compat-$CANDIDATE"
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
 node --test "$ROOT/jobs/"*.test.mjs
 node "$ROOT/jobs/serve-offline.mjs"
 ;;
*) exit 2;;
esac
