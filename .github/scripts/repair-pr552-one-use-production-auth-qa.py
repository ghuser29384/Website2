from __future__ import annotations

from pathlib import Path
from textwrap import dedent

WORKFLOW = Path('.github/workflows/pr552-one-use-production-auth-qa.yml')

source = WORKFLOW.read_text(encoding='utf-8')

scope_start = '      - name: Generate a unique synthetic identity and factor scope\n'
scope_end = '      - name: Create the isolated synthetic production Auth fixture\n'
env_start = '      - name: Create exact branch-scoped sensitive Vercel Preview variable\n'
env_end = '      - name: Link canonical Vercel project and pull branch-specific Preview settings\n'

for marker in (scope_start, scope_end, env_start, env_end):
    if source.count(marker) != 1:
        raise SystemExit(f'Expected exactly one workflow marker: {marker!r}')

scope_index = source.index(scope_start)
scope_end_index = source.index(scope_end, scope_index)
scope_block = source[scope_index:scope_end_index]
source = source[:scope_index] + source[scope_end_index:]

env_index = source.index(env_start)
source = source[:env_index] + scope_block + source[env_index:]

env_index = source.index(env_start)
env_end_index = source.index(env_end, env_index)
new_env_block = dedent(
    r'''
      - name: Create exact branch-scoped sensitive Vercel Preview variable
        id: env_create
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p "$OUTPUT_DIR" .vercel
          label="PR552 one-use ${GITHUB_RUN_ID}.${GITHUB_RUN_ATTEMPT}"
          printf '%s' "$label" > "$RUNNER_TEMP/pr552-env-label"
          printf '{"orgId":"%s","projectId":"%s"}\n' \
            "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json

          curl -fsS \
            -H "Authorization: Bearer ${VERCEL_TOKEN}" \
            "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_ORG_ID}" \
            > "$RUNNER_TEMP/vercel-env-before.json"
          before_count="$(jq --arg branch "$CONTROLLER_BRANCH" '[
            ((.envs // .)[])
            | select(.key == "SUPABASE_SERVICE_ROLE_KEY")
            | select((.gitBranch // "") == $branch)
          ] | length' "$RUNNER_TEMP/vercel-env-before.json")"
          test "$before_count" = '0'

          cli_log="$RUNNER_TEMP/vercel-env-add.log"
          set +e
          printf '%s\n' "$PROD_SUPABASE_SERVICE_ROLE_KEY" \
            | npx --yes "vercel@${VERCEL_CLI_VERSION}" env add \
                SUPABASE_SERVICE_ROLE_KEY \
                preview \
                "$CONTROLLER_BRANCH" \
                --sensitive \
                --yes \
                --token="$VERCEL_TOKEN" \
                > "$cli_log" 2>&1
          cli_code=$?
          set -e

          PROD_SUPABASE_SERVICE_ROLE_KEY="$PROD_SUPABASE_SERVICE_ROLE_KEY" \
            CLI_LOG="$cli_log" \
            OUTPUT_FILE="$OUTPUT_DIR/vercel-env-add.log" \
            python3 <<'PY_REDACT'
          import os
          import re
          from pathlib import Path

          text = Path(os.environ['CLI_LOG']).read_text(encoding='utf-8', errors='replace')
          secret = os.environ['PROD_SUPABASE_SERVICE_ROLE_KEY']
          text = text.replace(secret, '[REDACTED]')
          text = re.sub(r'sb_secret_[A-Za-z0-9_-]+', '[REDACTED]', text)
          text = re.sub(
              r'(?i)(authorization|token|apikey)([:= ]+)[^\s]+',
              r'\1\2[REDACTED]',
              text,
          )
          Path(os.environ['OUTPUT_FILE']).write_text(text, encoding='utf-8')
          PY_REDACT
          rm -f "$cli_log"

          if [[ "$cli_code" -ne 0 ]]; then
            cat "$OUTPUT_DIR/vercel-env-add.log" >&2
            exit "$cli_code"
          fi

          curl -fsS \
            -H "Authorization: Bearer ${VERCEL_TOKEN}" \
            "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_ORG_ID}" \
            > "$RUNNER_TEMP/vercel-env-after.json"
          jq --arg branch "$CONTROLLER_BRANCH" '[
            ((.envs // .)[])
            | select(.key == "SUPABASE_SERVICE_ROLE_KEY")
            | select((.gitBranch // "") == $branch)
            | select(.type == "sensitive")
            | select(
                ((.target | type) == "array" and (.target | index("preview") != null))
                or .target == "preview"
              )
          ]' "$RUNNER_TEMP/vercel-env-after.json" > "$RUNNER_TEMP/vercel-env-match.json"
          test "$(jq 'length' "$RUNNER_TEMP/vercel-env-match.json")" = '1'
          env_id="$(jq -r '.[0].id // .[0].uid // empty' "$RUNNER_TEMP/vercel-env-match.json")"
          test -n "$env_id"
          printf '%s' "$env_id" > "$RUNNER_TEMP/pr552-env-id"
          jq -n \
            --arg id "$env_id" \
            --arg key 'SUPABASE_SERVICE_ROLE_KEY' \
            --arg branch "$CONTROLLER_BRANCH" \
            --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{id:$id,key:$key,target:"preview",gitBranch:$branch,type:"sensitive",createdAt:$createdAt}' \
            > "$OUTPUT_DIR/vercel-env-created.json"
          rm -f \
            "$RUNNER_TEMP/vercel-env-before.json" \
            "$RUNNER_TEMP/vercel-env-after.json" \
            "$RUNNER_TEMP/vercel-env-match.json"
          echo 'exit_code=0' >> "$GITHUB_OUTPUT"

'''
).lstrip('\n')
source = source[:env_index] + new_env_block + source[env_end_index:]

old_cleanup = dedent(
    r'''
            jq --arg branch "$CONTROLLER_BRANCH" --arg comment "$label" '[
              ((.envs // .)[])
              | select(.key == "SUPABASE_SERVICE_ROLE_KEY")
              | select((.gitBranch // "") == $branch)
              | select($comment == "" or (.comment // "") == $comment)
            ]' "$RUNNER_TEMP/vercel-env-cleanup-list.json" > "$RUNNER_TEMP/vercel-env-cleanup-match.json"
'''
).lstrip('\n')
new_cleanup = dedent(
    r'''
            jq --arg branch "$CONTROLLER_BRANCH" '[
              ((.envs // .)[])
              | select(.key == "SUPABASE_SERVICE_ROLE_KEY")
              | select((.gitBranch // "") == $branch)
            ]' "$RUNNER_TEMP/vercel-env-cleanup-list.json" > "$RUNNER_TEMP/vercel-env-cleanup-match.json"
'''
).lstrip('\n')
if source.count(old_cleanup) != 1:
    raise SystemExit('Expected exact Vercel environment cleanup selector once.')
source = source.replace(old_cleanup, new_cleanup, 1)

replacements = {
    '{id:($id | select(length>0)),key:"SUPABASE_SERVICE_ROLE_KEY",gitBranch:$branch,deleted:$deleted,remaining:0,exitCode:$exitCode}':
        '{id:(if ($id|length)>0 then $id else null end),key:"SUPABASE_SERVICE_ROLE_KEY",gitBranch:$branch,deleted:$deleted,remaining:0,exitCode:$exitCode}',
    '{deploymentId:($id | select(length>0)),deploymentUrl:($url | select(length>0)),deleted:$deleted,exitCode:$exitCode}':
        '{deploymentId:(if ($id|length)>0 then $id else null end),deploymentUrl:(if ($url|length)>0 then $url else null end),deleted:$deleted,exitCode:$exitCode}',
}
for old, new in replacements.items():
    if source.count(old) != 1:
        raise SystemExit(f'Expected cleanup JSON expression exactly once: {old}')
    source = source.replace(old, new, 1)

WORKFLOW.write_text(source, encoding='utf-8')
