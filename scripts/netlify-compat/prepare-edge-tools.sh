#!/usr/bin/env bash
# Prepared only: requires explicit runner-install/cloud-run approval.
set -euo pipefail
: "${ROOT:?}"
test "${GITHUB_ACTIONS:-}" = true
test "$(uname -s)" = Linux
test "$(uname -m)" = x86_64
test ! -e "$ROOT/edge-tools"
mkdir -p "$ROOT/edge-tools/bin" "$ROOT/home/deno-cache"
archive="$ROOT/edge-tools/deno.zip"
curl --fail --location --proto '=https' --proto-redir '=https' --tlsv1.2 --max-time 180 'https://github.com/denoland/deno/releases/download/v2.4.2/deno-x86_64-unknown-linux-gnu.zip' -o "$archive"
printf '%s  %s\n' d84778633215b7cb93cf7690860d6241f632b087bd2a19de12cd410e6b2e157a "$archive" | sha256sum --check --strict
unzip -q "$archive" deno -d "$ROOT/edge-tools/bin"
test "$("$ROOT/edge-tools/bin/deno" --version | head -1)" = 'deno 2.4.2'
# Cache dependency graphs only; do not run app modules or the emulator online.
# Both bootstrap versions were observed in the resolved Netlify dependency graph.
for version in 3-2-0 2-16-0; do
  env -i HOME="$ROOT/home" PATH="$ROOT/edge-tools/bin:/usr/bin:/bin" DENO_DIR="$ROOT/home/deno-cache" DENO_NO_UPDATE_CHECK=1 \
    deno cache --no-config --no-lock "https://v${version}--edge.netlify.com/bootstrap/index-combined.ts"
done
# Record all acquired cache bytes for review; no cache upload or persistent service.
(cd "$ROOT/home/deno-cache" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$ROOT/edge-tools/cache-sha256.txt"
