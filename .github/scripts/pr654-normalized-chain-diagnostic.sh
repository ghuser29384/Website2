#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${HISTORICAL_BASE_COMMIT:?}"
: "${SUPABASE_CLI_VERSION:=2.110.0}"
: "${EVIDENCE_DIR:?}"

mkdir -p "$EVIDENCE_DIR"/{logs,manifests,failures,patched}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
: > "$TRANSCRIPT"
exec > >(tee -a "$TRANSCRIPT") 2>&1

supabase() { npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"; }
sanitize() {
  sed -E \
    -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#' \
    -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
    -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[REDACTED_LOCAL_KEY]#g'
}

withheld="$RUNNER_TEMP/pr654-normalized-chain-migrations"
cleanup() {
  set +e
  if [[ -d "$withheld" && ! -d supabase/migrations ]]; then
    mv "$withheld" supabase/migrations
  elif [[ -d "$withheld" && -d supabase/migrations && -z "$(find supabase/migrations -mindepth 1 -print -quit 2>/dev/null)" ]]; then
    rmdir supabase/migrations
    mv "$withheld" supabase/migrations
  fi
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/supabase-stop.log" 2>&1 || true
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' > "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' | grep -E 'supabase|pr654-normalized' > "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' > "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  rm -rf "$withheld" .supabase supabase/config.toml
  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git status --short --branch > "$EVIDENCE_DIR/manifests/git-status-final.txt"
}
trap cleanup EXIT

test "$(git rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git symbolic-ref -q --short HEAD || true)"
test -z "$(git status --porcelain)"
git cat-file -e "$HISTORICAL_BASE_COMMIT:supabase/schema.sql"
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY DATABASE_URL DIRECT_URL POSTGRES_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET; do unset "$name"; done

{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
} > "$EVIDENCE_DIR/toolchain.txt"

printf '===== derive dependency-aware within-version order =====\n'
python3 - <<'PY' > "$EVIDENCE_DIR/manifests/normalized-order.tsv"
from __future__ import annotations
from collections import defaultdict
from pathlib import Path
import heapq, re, subprocess

root=Path('supabase/migrations')
files=sorted(root.glob('*.sql'), key=lambda p:p.name)

def intro(path: Path):
    out=subprocess.check_output([
        'git','log','--all','--diff-filter=A','-1','--date=iso-strict',
        '--format=%aI%x09%H','--',str(path)
    ],text=True).strip()
    if not out:
        return ('9999-12-31T23:59:59Z','')
    date,commit=out.split('\t',1)
    return date,commit

def creates_rel(text: str):
    return set(re.findall(r'(?im)^\s*create\s+(?:table|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)',text))

def relation_refs(text: str):
    patterns=[
        r'(?i)\bfrom\s+public\.([a-z0-9_]+)',
        r'(?i)\bjoin\s+public\.([a-z0-9_]+)',
        r'(?i)\bupdate\s+public\.([a-z0-9_]+)',
        r'(?i)\binsert\s+into\s+public\.([a-z0-9_]+)',
        r'(?i)\bdelete\s+from\s+public\.([a-z0-9_]+)',
        r'(?i)\balter\s+table\s+public\.([a-z0-9_]+)',
        r'(?i)\breferences\s+public\.([a-z0-9_]+)',
        r'(?i)\bon\s+public\.([a-z0-9_]+)',
        r'(?i)\btruncate\s+(?:table\s+)?public\.([a-z0-9_]+)',
    ]
    out=set()
    for pat in patterns: out.update(re.findall(pat,text))
    return out

records={}
groups=defaultdict(list)
for path in files:
    m=re.match(r'^(\d+)_',path.name)
    if not m: raise SystemExit(f'no version prefix: {path.name}')
    date,commit=intro(path)
    text=path.read_text(encoding='utf-8')
    records[path.name]={
        'path':path,'version':m.group(1),'date':date,'commit':commit,
        'creates':creates_rel(text),'refs':relation_refs(text),
    }
    groups[m.group(1)].append(path.name)

print('ordinal\tversion\tfilename\tintroduced_at\tcommit\treason')
ordinal=0
for version in sorted(groups, key=lambda v:(len(v),v)):
    names=groups[version]
    creators=defaultdict(list)
    for name in names:
        for rel in records[name]['creates']: creators[rel].append(name)
    edges={name:set() for name in names}
    indegree={name:0 for name in names}
    reasons=defaultdict(list)
    for consumer in names:
        for rel in records[consumer]['refs']:
            for producer in creators.get(rel,[]):
                if producer==consumer: continue
                if consumer not in edges[producer]:
                    edges[producer].add(consumer); indegree[consumer]+=1
                    reasons[consumer].append(f'after {producer} creates public.{rel}')
    heap=[]
    for name in names:
        if indegree[name]==0:
            r=records[name]
            heapq.heappush(heap,(r['date'],name))
    ordered=[]
    while heap:
        _,name=heapq.heappop(heap); ordered.append(name)
        for nxt in sorted(edges[name]):
            indegree[nxt]-=1
            if indegree[nxt]==0:
                r=records[nxt]; heapq.heappush(heap,(r['date'],nxt))
    if len(ordered)!=len(names):
        remaining=sorted(set(names)-set(ordered),key=lambda n:(records[n]['date'],n))
        ordered.extend(remaining)
        for n in remaining: reasons[n].append('cycle fallback')
    for name in ordered:
        ordinal+=1; r=records[name]
        print(f"{ordinal}\t{version}\t{name}\t{r['date']}\t{r['commit']}\t{' ; '.join(reasons[name]) or 'introduction order'}")
PY

printf '===== initialize empty local stack without repository migrations =====\n'
rm -rf .supabase "$withheld"
supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.raw.log" 2>&1
sanitize < "$EVIDENCE_DIR/logs/supabase-init.raw.log" > "$EVIDENCE_DIR/logs/supabase-init.log"
rm -f "$EVIDENCE_DIR/logs/supabase-init.raw.log"
mv supabase/migrations "$withheld"
mkdir -p supabase/migrations
set +e
supabase start --debug > "$EVIDENCE_DIR/logs/supabase-start.raw.log" 2>&1
start_status=$?
set -e
printf '%s\n' "$start_status" > "$EVIDENCE_DIR/logs/supabase-start.exit"
sanitize < "$EVIDENCE_DIR/logs/supabase-start.raw.log" > "$EVIDENCE_DIR/logs/supabase-start.log"
rm -f "$EVIDENCE_DIR/logs/supabase-start.raw.log"
test "$start_status" -eq 0

db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
test -n "$db_container"
docker exec "$db_container" psql -X -U postgres -d postgres -Atc 'select version();' > "$EVIDENCE_DIR/postgresql-version.txt"
rmdir supabase/migrations
mv "$withheld" supabase/migrations

printf '===== apply historical base =====\n'
git show "$HISTORICAL_BASE_COMMIT:supabase/schema.sql" > "$EVIDENCE_DIR/manifests/historical-base.sql"
docker cp "$EVIDENCE_DIR/manifests/historical-base.sql" "$db_container:/tmp/pr654-normalized.sql"
docker exec "$db_container" psql -X -1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres -f /tmp/pr654-normalized.sql > "$EVIDENCE_DIR/logs/historical-base.log" 2>&1
printf 'BASE_PASSED\n' > "$EVIDENCE_DIR/result.txt"

printf '===== apply dependency-aware chain with one PostgreSQL-17 compatibility overlay =====\n'
: > "$EVIDENCE_DIR/manifests/replay.tsv"
previous='HISTORICAL_BASE'
failure=''
while IFS=$'\t' read -r ordinal version filename introduced commit reason; do
  [[ "$ordinal" == 'ordinal' ]] && continue
  source="supabase/migrations/$filename"
  candidate="$EVIDENCE_DIR/patched/$filename"
  cp "$source" "$candidate"
  patch='none'
  if [[ "$filename" == '20260531_background_intent_claims.sql' ]]; then
    python3 - "$candidate" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); text=p.read_text()
needle="create index if not exists wish_profiles_broad_preview_text_search_idx"
if needle not in text: raise SystemExit('target index not found')
helper="""create or replace function public.moral_trade_immutable_text_array_search(input_values text[])
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(string_agg(value, ' ' order by ordinal), '')
  from unnest(input_values) with ordinality as item(value, ordinal);
$$;

"""
text=text.replace(needle,helper+needle,1)
old="array_to_string(causes, ' ')"
if old not in text: raise SystemExit('array_to_string target not found')
text=text.replace(old,"public.moral_trade_immutable_text_array_search(causes)",1)
p.write_text(text)
PY
    patch='immutable text-array search helper'
  fi
  digest="$(sha256sum "$candidate" | awk '{print $1}')"
  printf '%s\tSTART\t%s\t%s\t%s\t%s\n' "$ordinal" "$filename" "$digest" "$patch" "$reason" | tee -a "$EVIDENCE_DIR/manifests/replay.tsv"
  docker cp "$candidate" "$db_container:/tmp/pr654-normalized.sql"
  set +e
  docker exec "$db_container" psql -X -1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres -f /tmp/pr654-normalized.sql > "$EVIDENCE_DIR/logs/migration-${ordinal}.log" 2>&1
  status=$?
  set -e
  if [[ "$status" -eq 0 ]]; then
    printf '%s\tPASS\t%s\t%s\t%s\t%s\n' "$ordinal" "$filename" "$digest" "$patch" "$reason" | tee -a "$EVIDENCE_DIR/manifests/replay.tsv"
    previous="$filename"
    rm -f "$EVIDENCE_DIR/logs/migration-${ordinal}.log"
    continue
  fi
  printf '%s\tFAIL\t%s\t%s\t%s\t%s\n' "$ordinal" "$filename" "$digest" "$patch" "$reason" | tee -a "$EVIDENCE_DIR/manifests/replay.tsv"
  failure="$filename"
  printf 'first_failed_migration=%s\npreceding_success=%s\nordinal=%s\n' "$filename" "$previous" "$ordinal" > "$EVIDENCE_DIR/failures/first-failure.txt"
  cp "$candidate" "$EVIDENCE_DIR/failures/$filename"
  grep -n -B120 -A40 -E 'ERROR:|SQL state:|LOCATION:' "$EVIDENCE_DIR/logs/migration-${ordinal}.log" > "$EVIDENCE_DIR/failures/error-context.txt" || true
  error_line="$(sed -nE 's#^psql:/tmp/pr654-normalized\.sql:([0-9]+): ERROR:.*#\1#p' "$EVIDENCE_DIR/logs/migration-${ordinal}.log" | head -1)"
  if [[ -n "$error_line" ]]; then
    start_line=$((error_line > 50 ? error_line - 50 : 1)); end_line=$((error_line + 30))
    nl -ba "$candidate" | sed -n "${start_line},${end_line}p" > "$EVIDENCE_DIR/failures/source-neighborhood.txt"
  fi
  break
done < "$EVIDENCE_DIR/manifests/normalized-order.tsv"

if [[ -z "$failure" ]]; then printf 'ALL_MIGRATIONS_PASSED\n' >> "$EVIDENCE_DIR/result.txt"; else printf 'MIGRATION_FAILED=%s\n' "$failure" >> "$EVIDENCE_DIR/result.txt"; fi

docker exec "$db_container" psql -X -U postgres -d postgres -AtF $'\t' -c "select n.nspname,c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','moral_trade_private') order by n.nspname,c.relname;" > "$EVIDENCE_DIR/manifests/objects-after-replay.tsv" 2>&1 || true

if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' "$EVIDENCE_DIR" > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then exit 1; fi
: > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
cleanup
trap - EXIT
test ! -s "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt"
test ! -s "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt"
if grep -q 'supabase_' "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"; then exit 1; fi
