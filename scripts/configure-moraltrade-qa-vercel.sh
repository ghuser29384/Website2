#!/usr/bin/env bash
set -euo pipefail

QA_REF="hvmxfjjbdcgjjudmthdz"
QA_URL="https://$QA_REF.supabase.co"
GIT_BRANCH="${MORALTRADE_QA_GIT_BRANCH:-agent/dynamic-marketplace-clearing-rounds}"
VERCEL_SCOPE="${VERCEL_SCOPE:-ellen-s}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is unavailable: $1" >&2
    exit 1
  }
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_command npx
require_env VERCEL_TOKEN
require_env QA_SUPABASE_PUBLISHABLE_KEY
require_env QA_SUPABASE_SERVICE_ROLE_KEY

if [[ -n "${QA_SUPABASE_URL:-}" && "$QA_SUPABASE_URL" != "$QA_URL" ]]; then
  echo "Refusing to configure an unexpected Supabase project." >&2
  exit 1
fi

set_variable() {
  local project="$1"
  local name="$2"
  local value="$3"
  local sensitivity="$4"

  rm -rf .vercel
  npx --yes vercel@latest link \
    --yes \
    --project "$project" \
    --scope "$VERCEL_SCOPE" \
    --token "$VERCEL_TOKEN" >/dev/null

  if [[ "$sensitivity" == "sensitive" ]]; then
    printf '%s' "$value" | npx --yes vercel@latest env add \
      "$name" preview "$GIT_BRANCH" \
      --force \
      --sensitive \
      --scope "$VERCEL_SCOPE" \
      --token "$VERCEL_TOKEN" >/dev/null
  else
    printf '%s' "$value" | npx --yes vercel@latest env add \
      "$name" preview "$GIT_BRANCH" \
      --force \
      --no-sensitive \
      --scope "$VERCEL_SCOPE" \
      --token "$VERCEL_TOKEN" >/dev/null
  fi

  echo "Configured $name for $project Preview / $GIT_BRANCH."
}

for project in website2 moraltrade-site; do
  set_variable "$project" NEXT_PUBLIC_SUPABASE_URL "$QA_URL" encrypted
  set_variable \
    "$project" \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    "$QA_SUPABASE_PUBLISHABLE_KEY" \
    encrypted
  set_variable \
    "$project" \
    SUPABASE_SERVICE_ROLE_KEY \
    "$QA_SUPABASE_SERVICE_ROLE_KEY" \
    sensitive
done

rm -rf .vercel

echo
printf '%s\n' \
  "Branch-scoped Preview variables are configured for both Vercel projects." \
  "Trigger fresh preview deployments after this script completes; existing deployments retain their old environment snapshot."
