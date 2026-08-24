#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
BASELINE_DIR="$ROOT/supabase/baseline/pre_activation"
BASELINE_SQL="$BASELINE_DIR/schema.sql"
SOURCE_CATALOG="$BASELINE_DIR/source_catalog.tsv"
CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
OUTPUT_DIR="${1:-$ROOT/artifacts/preactivation-baseline-clean-room}"
SUPABASE_VERSION="2.110.0"
CLEAN_ROOM_ROOT="$(mktemp -d "${RUNNER_TEMP:-/tmp}/website2-preactivation-clean-room.XXXXXX")"
LOCAL_CONFIG="$CLEAN_ROOM_ROOT/supabase/config.toml"
PROJECT_ID="website2_preactivation_${GITHUB_RUN_ID:-$$}"
DB_CONTAINER="supabase_db_${PROJECT_ID}"
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TARGET_CATALOG="$OUTPUT_DIR/target-catalog.tsv"
TARGET_CATALOG_NORMALIZED="$OUTPUT_DIR/target-catalog.normalized.tsv"
START_LOG="$OUTPUT_DIR/supabase-start.log"
STOP_LOG="$OUTPUT_DIR/supabase-stop.log"
STATUS_LOG="$OUTPUT_DIR/supabase-status.log"

mkdir -p "$OUTPUT_DIR" "$CLEAN_ROOM_ROOT/supabase"

if [[ ! -s "$BASELINE_SQL" || ! -s "$SOURCE_CATALOG" ]]; then
  echo "The generated baseline and source catalog are required." >&2
  exit 1
fi
if (( ${#PROJECT_ID} > 40 )); then
  echo "The disposable Supabase project id must remain at most 40 characters." >&2
  exit 1
fi

cleanup() {
  set +e
  (
    cd "$CLEAN_ROOM_ROOT"
    npx --yes "supabase@$SUPABASE_VERSION" stop --no-backup
  ) > "$STOP_LOG" 2>&1
  local leftovers
  leftovers="$(docker ps -a --format '{{.Names}}' | grep "^supabase_.*_${PROJECT_ID}$" || true)"
  printf '%s\n' "$leftovers" > "$OUTPUT_DIR/docker-residue.txt"
  if [[ -n "$leftovers" ]]; then
    docker rm -f $leftovers >> "$STOP_LOG" 2>&1 || true
  fi
  rm -rf "$CLEAN_ROOM_ROOT"
}
trap cleanup EXIT

cat > "$LOCAL_CONFIG" <<TOML
project_id = "$PROJECT_ID"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.pooler]
enabled = false

[studio]
enabled = false

[inbucket]
enabled = false

[storage]
enabled = false

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = []
jwt_expiry = 3600
enable_signup = true

[realtime]
enabled = false

[analytics]
enabled = false
TOML

(
  cd "$CLEAN_ROOM_ROOT"
  npx --yes "supabase@$SUPABASE_VERSION" start --exclude studio,imgproxy,mailpit,storage-api,realtime,edge-runtime,logflare,vector,supavisor \
    > "$START_LOG" 2>&1
  npx --yes "supabase@$SUPABASE_VERSION" status > "$STATUS_LOG" 2>&1
)

for attempt in $(seq 1 60); do
  if pg_isready -d "$LOCAL_DB_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready -d "$LOCAL_DB_URL"
docker inspect "$DB_CONTAINER" >/dev/null

psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select rolname || E'\t' || rolsuper || E'\t' || rolcanlogin || E'\t' || pg_has_role(current_user, oid, 'MEMBER')
from pg_roles
where rolname in ('postgres', 'supabase_admin')
order by rolname;
" > "$OUTPUT_DIR/administrative-roles.txt"

docker exec "$DB_CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -Atqc \
  "select current_user || E'\t' || session_user || E'\t' || rolsuper from pg_roles where rolname = current_user;" \
  > "$OUTPUT_DIR/baseline-administrator.txt"
grep -Eq '^supabase_admin[[:space:]]+supabase_admin[[:space:]]+true$' \
  "$OUTPUT_DIR/baseline-administrator.txt"

PRESTATE_RELATIONS="$OUTPUT_DIR/clean-room-prestate-relations.tsv"
PRE_RELATIONS="$(psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'moral_trade_private')
  and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  and not exists (
    select 1
    from pg_depend d
    where d.deptype = 'e'
      and d.classid = 'pg_class'::regclass
      and d.objid = c.oid
      and d.objsubid = 0
  );
")"
psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' -c "
select
  n.nspname,
  c.relname,
  c.relkind,
  coalesce(e.extname, '')
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_depend d
  on d.deptype = 'e'
 and d.classid = 'pg_class'::regclass
 and d.objid = c.oid
 and d.objsubid = 0
left join pg_extension e on e.oid = d.refobjid
where n.nspname in ('public', 'moral_trade_private')
  and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  and e.oid is null
order by n.nspname, c.relname, c.relkind;
" > "$PRESTATE_RELATIONS"
printf 'pre_application_relations=%s\n' "$PRE_RELATIONS" > "$OUTPUT_DIR/clean-room-prestate.txt"
if [[ "$PRE_RELATIONS" != "0" ]]; then
  echo "Fresh Supabase stack contains unexpected non-extension application relations:" >&2
  cat "$PRESTATE_RELATIONS" >&2
  exit 1
fi

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_SECONDS="$(date +%s)"
docker exec -i "$DB_CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f - \
  < "$BASELINE_SQL" > "$OUTPUT_DIR/baseline-apply.log" 2>&1
END_SECONDS="$(date +%s)"
ENDED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'started_at=%s\nended_at=%s\nduration_seconds=%s\n' \
  "$STARTED_AT" "$ENDED_AT" "$((END_SECONDS - START_SECONDS))" \
  > "$OUTPUT_DIR/baseline-apply-timing.txt"

psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \
  > "$TARGET_CATALOG"
LC_ALL=C sort -u "$TARGET_CATALOG" > "$TARGET_CATALOG_NORMALIZED"
LC_ALL=C diff -u "$SOURCE_CATALOG" "$TARGET_CATALOG_NORMALIZED" \
  > "$OUTPUT_DIR/catalog.diff"
test ! -s "$OUTPUT_DIR/catalog.diff"

if docker exec -i "$DB_CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f - \
  < "$BASELINE_SQL" > "$OUTPUT_DIR/nonempty-reapply.log" 2>&1; then
  echo "The baseline did not reject a non-empty application schema." >&2
  exit 1
fi
grep -Fq 'Pre-activation baseline requires an empty application schema' \
  "$OUTPUT_DIR/nonempty-reapply.log"

LEGACY_ID="a7140000-0000-4000-8000-000000000001"
psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 <<SQL \
  > "$OUTPUT_DIR/auth-profile-trigger.log" 2>&1
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values (
  '$LEGACY_ID',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'preactivation-legacy@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Pre-activation legacy","qa_fixture":true}'::jsonb,
  '', '', '', '', '',
  false,
  false,
  now(),
  now()
);

do \$test\$
begin
  if not exists (
    select 1 from public.profiles
    where id = '$LEGACY_ID'
      and email = 'preactivation-legacy@example.test'
  ) then
    raise exception 'Canonical auth-to-profile trigger did not materialize the legacy profile.';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'activation_stage'
  ) then
    raise exception 'Pre-activation baseline unexpectedly contains activation_stage.';
  end if;
end;
\$test\$;

delete from auth.users where id = '$LEGACY_ID';
SQL

AUTH_COUNT="$(psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "select count(*) from auth.users where id = '$LEGACY_ID';")"
PROFILE_COUNT="$(psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "select count(*) from public.profiles where id = '$LEGACY_ID';")"
test "$AUTH_COUNT" = "0"
test "$PROFILE_COUNT" = "0"
printf 'synthetic_auth_rows=%s\nsynthetic_profile_rows=%s\n' \
  "$AUTH_COUNT" "$PROFILE_COUNT" > "$OUTPUT_DIR/synthetic-residue.txt"

printf 'baseline_sha256=%s\nsource_catalog_sha256=%s\ntarget_catalog_sha256=%s\n' \
  "$(sha256sum "$BASELINE_SQL" | awk '{print $1}')" \
  "$(sha256sum "$SOURCE_CATALOG" | awk '{print $1}')" \
  "$(sha256sum "$TARGET_CATALOG_NORMALIZED" | awk '{print $1}')" \
  > "$OUTPUT_DIR/digests.txt"
printf 'catalog_match=true\nauth_profile_trigger=true\nactivation_stage_absent=true\nnonempty_guard=true\nadmin_replay=true\nzero_synthetic_residue=true\n' \
  > "$OUTPUT_DIR/result.txt"
