from __future__ import annotations

from pathlib import Path
import runpy

SCRIPT = Path('.github/scripts/repair-pr552-one-use-production-auth-qa.py')
source = SCRIPT.read_text(encoding='utf-8')

start_marker = 'old_cleanup = dedent(\n'
end_marker = '\nreplacements = {\n'
if source.count(start_marker) != 1 or source.count(end_marker) != 1:
    raise SystemExit('Expected cleanup-repair source boundaries exactly once.')

start = source.index(start_marker)
end = source.index(end_marker, start)
replacement = '''cleanup_start = '            jq --arg branch "$CONTROLLER_BRANCH" --arg comment "$label" \'[\\n'
cleanup_end = '            ]\' "$RUNNER_TEMP/vercel-env-cleanup-list.json" > "$RUNNER_TEMP/vercel-env-cleanup-match.json"\\n'
if source.count(cleanup_start) != 1 or source.count(cleanup_end) != 1:
    raise SystemExit('Expected exact Vercel environment cleanup selector boundaries once.')
cleanup_index = source.index(cleanup_start)
cleanup_end_index = source.index(cleanup_end, cleanup_index) + len(cleanup_end)
new_cleanup = (
    '            jq --arg branch "$CONTROLLER_BRANCH" \'[\\n'
    '              ((.envs // .)[])\\n'
    '              | select(.key == "SUPABASE_SERVICE_ROLE_KEY")\\n'
    '              | select((.gitBranch // "") == $branch)\\n'
    '            ]\' "$RUNNER_TEMP/vercel-env-cleanup-list.json" > "$RUNNER_TEMP/vercel-env-cleanup-match.json"\\n'
)
source = source[:cleanup_index] + new_cleanup + source[cleanup_end_index:]
'''
source = source[:start] + replacement + source[end:]
SCRIPT.write_text(source, encoding='utf-8')
runpy.run_path(str(SCRIPT), run_name='__main__')
