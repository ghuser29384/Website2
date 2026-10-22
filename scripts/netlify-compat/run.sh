#!/usr/bin/env bash
set -euo pipefail
case "${CANDIDATE:-}" in canonical|legacy|normativity|rlhf) ;; *) exit 2;; esac
case "${1:-}" in
prepare)
 ROOT="$RUNNER_TEMP/netlify-compat-$CANDIDATE"
 test ! -e "$ROOT"
 mkdir -p "$ROOT/app" "$ROOT/tools" "$ROOT/home"
 cp -R scripts/netlify-compat "$ROOT/harness"
 case "$CANDIDATE" in
 canonical) REPO=Website2; REF=a4adf0cbb7029a6316a34478bd27dffad22cbca4;;
 legacy) REPO=Website2; REF=6c35e4d20fca39d2654d3bba89ee070c25a99f66;;
 normativity) REPO=WebsiteBuilding2; REF=4ee214324976cf579a77bde4788551cfe32f94fb;;
 rlhf) REPO=; REF=;;
 esac
 if test -n "$REPO"; then
   curl --fail --location --proto '=https' --tlsv1.2 "https://codeload.github.com/ghuser29384/$REPO/tar.gz/$REF" -o "$ROOT/source.tar.gz"
   tar -xzf "$ROOT/source.tar.gz" --strip-components=1 -C "$ROOT/app"
 fi
 node "$ROOT/harness/setup.mjs" "$ROOT" "$CANDIDATE"
 npm install --prefix "$ROOT/tools" --package-lock-only --ignore-scripts --no-audit --no-fund
 npm ci --prefix "$ROOT/tools" --ignore-scripts --no-audit --no-fund
 node "$ROOT/harness/check-tools.mjs" "$ROOT" "$CANDIDATE"
 if test "$CANDIDATE" != rlhf; then
   npm ci --prefix "$ROOT/app" --ignore-scripts --no-audit --no-fund
 fi
 if test "$CANDIDATE" = normativity; then
   npm ci --prefix "$ROOT/app/server" --ignore-scripts --no-audit --no-fund
   DATABASE_URL=postgresql://postgres:synthetic@127.0.0.1:15439/synthetic "$ROOT/app/server/node_modules/.bin/prisma" generate --schema "$ROOT/app/server/prisma/schema.prisma"
 fi
 node "$ROOT/harness/setup-links.mjs" "$ROOT" "$CANDIDATE"
 ROOT="$ROOT" bash "$ROOT/harness/prepare-edge-tools.sh"
 ;;
offline)
 test "${OFFLINE_NAMESPACE:-}" = 1
 test "$(id -u)" -ne 0
 test "$(ip -o link show | wc -l | tr -d ' ')" = 1
 test -z "$(ip route show default)"
 test -z "$(ip -6 route show default)"
 export PATH="$ROOT/edge-tools/bin:$PATH" DENO_DIR="$ROOT/home/deno-cache" DENO_NO_UPDATE_CHECK=1
 test "$(deno --version | awk 'NR == 1 { print $1 " " $2 }')" = 'deno 2.4.2'
 export NEXT_TELEMETRY_DISABLED=1 NETLIFY_TELEMETRY_DISABLED=1 CI=true NO_COLOR=1
 export MORAL_TRADE_DISABLE_DEP_REPAIR=1
 node "$ROOT/harness/candidate/tests/local.mjs"
 node --test "$ROOT/harness/diagnostics.test.mjs" "$ROOT/harness/layout.test.mjs" "$ROOT/harness/normativity-boundary.test.mjs"
 node "$ROOT/harness/offline.mjs" "$ROOT" "$CANDIDATE"
 ;;
*) exit 2;;
esac
