#!/usr/bin/env bash
set -euo pipefail

ASSISTANT_PUBLIC_KEY_DER_B64="MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA+9/OYODetLAKz044DwiG7CN2cMW6F9inq/CMy9WRxcEPQosAJ0aobg5tccADIJ2KxlxKr4Px1g4IA1C5BsqSMUO97XlMm3kkpcMoij3/8jk6xqDMM8Wtw6gJkn2fboGJ6yKvMsY9V5QQ3o9he0Xcrsh5TrzkdOKk7jU/sqT4gIM1fs7/3jbobSUoY4ehgpEmAfEIvGFnaiVYxu2v/XZZRT5B7G3l0auti8hO3Fb2zBrdYtET/lzccVkt5HpQT5L+Ihp8v9xIygMHkVvEP0EV6tnylCZ6vWgVfrnuypOVe1ABioIsFwlJbA6miF84t/yUg6LVWPZ2YNEei1ODf/Tqur30tMDmVPDVILfK64c6Y4/M7h/eEuMQvQ1+b8OfUgQvN2HbVdRPbwMgVJtb2g8qQrebHUq+Ah/ffxNUpM3AFlRRjzikSSX9kFwbp2hu8tFSxdILMN4C7UadHTb4Dn7IwEsBlnZk48OffcG4mkJEfC0ujWdzc0uq3F5Z9+uZNaGxftBSFZR144OByIwtP9iWWad0Qav9nhy3EJc18WbI22Wb718GwFn+LEDANYQFrRi2cAVxF+PEfNwEYAraZQ6RRqXTusqRBNLfxRbDFp5kUgUUPam7uMCCGq0E38xgiVboHUP10+nKGv8Ithp03P2id1WfKiYDjE14EmqaqEoHhQ8CAwEAAQ=="

real_vercel="$(command -v vercel)"
if [[ -z "$real_vercel" ]]; then
  echo "Vercel CLI is not installed." >&2
  exit 1
fi

shim_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$shim_dir"
}
trap cleanup EXIT

cat > "$shim_dir/vercel" <<'SHIM'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "login" ]]; then
  exec "$REAL_VERCEL_BIN" "$@"
fi

login_dir="$(mktemp -d)"
login_log="$login_dir/login.typescript"
public_der="$login_dir/assistant-public.der"
public_pem="$login_dir/assistant-public.pem"
device_info="$login_dir/device-info.json"

cleanup_login() {
  rm -rf "$login_dir"
}
trap cleanup_login EXIT

echo "$ASSISTANT_PUBLIC_KEY_DER_B64" | base64 -d > "$public_der"
openssl pkey -pubin -inform DER -in "$public_der" -out "$public_pem" >/dev/null 2>&1
: > "$login_log"

(
  for attempt in $(seq 1 180); do
    if python3 - "$login_log" "$device_info" <<'PY'
import json
import re
import sys
from pathlib import Path

log_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
data = log_path.read_bytes() if log_path.exists() else b""

urls = []
for raw in re.findall(rb"https://[^\x00-\x20\x7f\x1b]+", data):
    try:
        value = raw.decode("utf-8", "ignore").rstrip("'\"),.;]")
    except Exception:
        continue
    if "vercel.com" in value:
        urls.append(value)

preferred = [
    value
    for value in urls
    if any(token in value.lower() for token in ("device", "oauth", "verify", "code="))
]
url = max(preferred or urls, key=len, default="")

text = data.decode("utf-8", "ignore")
code_match = re.search(r"\band enter\s+([A-Z0-9-]{4,32})\b", text, re.IGNORECASE)
code = code_match.group(1) if code_match else ""

if not url:
    raise SystemExit(1)

out_path.write_text(json.dumps({"url": url, "code": code}, separators=(",", ":")))
PY
    then
      ciphertext="$(openssl pkeyutl \
        -encrypt \
        -pubin \
        -inkey "$public_pem" \
        -in "$device_info" \
        -pkeyopt rsa_padding_mode:oaep \
        -pkeyopt rsa_oaep_md:sha256 \
        | base64 -w0)"
      echo "OPS_DEVICE_CIPHERTEXT=$ciphertext"
      exit 0
    fi
    sleep 1
  done
  echo "The Vercel device authorization URL could not be captured before timeout." >&2
  exit 1
) &
watcher_pid=$!

set +e
CI=1 script -q -e -c \
  "'$REAL_VERCEL_BIN' login --no-color" \
  "$login_log" \
  >/dev/null 2>&1
login_status=$?
set -e

wait "$watcher_pid" || true
exit "$login_status"
SHIM

chmod 700 "$shim_dir/vercel"

PATH="$shim_dir:$PATH" \
REAL_VERCEL_BIN="$real_vercel" \
ASSISTANT_PUBLIC_KEY_DER_B64="$ASSISTANT_PUBLIC_KEY_DER_B64" \
bash scripts/ops/consolidate-vercel-projects.sh
