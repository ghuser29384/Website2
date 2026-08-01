#!/usr/bin/env bash
set -euo pipefail

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate-v5.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v6-wrapper.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text(encoding="utf-8")

interval_marker = '''text = text.replace(needle, replacement, 1)
target_path.write_text(text, encoding="utf-8")
'''
interval_replacement = '''text = text.replace(needle, replacement, 1)
interval_line = "required_stable_intervals=12"
if text.count(interval_line) != 1:
    raise SystemExit(f"Expected one pre-snapshot stability interval setting; found {text.count(interval_line)}")
text = text.replace(interval_line, "required_stable_intervals=4", 1)
target_path.write_text(text, encoding="utf-8")
'''
if text.count(interval_marker) != 1:
    raise SystemExit(f"Expected one v5 wrapper-write block; found {text.count(interval_marker)}")
text = text.replace(interval_marker, interval_replacement, 1)

tree_marker = '''source = source.replace(runtime_auth_marker, runtime_auth_block, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
'''
tree_injection = r'''source = source.replace(runtime_auth_marker, runtime_auth_block, 1)

static_sha_block = """git fetch --no-tags origin main "$CANDIDATE_BRANCH"
if [[ "$(git rev-parse origin/main)" != "$MAIN_SHA" ]] || \\
   [[ "$(git rev-parse "origin/$CANDIDATE_BRANCH")" != "$PR_HEAD_SHA" ]]; then
  echo "Main or PR #326 moved during static validation; refusing stale deployment evidence." >&2
  exit 1
fi
"""
static_tree_block = """git fetch --no-tags origin main "$CANDIDATE_BRANCH"
CURRENT_MAIN_SHA="$(git rev-parse origin/main)"
CURRENT_PR_HEAD_SHA="$(git rev-parse "origin/$CANDIDATE_BRANCH")"
CURRENT_MAIN_TREE="$(git rev-parse "${CURRENT_MAIN_SHA}^{tree}")"
CURRENT_PR_HEAD_TREE="$(git rev-parse "${CURRENT_PR_HEAD_SHA}^{tree}")"
if [[ "$CURRENT_MAIN_TREE" != "$MAIN_TREE" ]] || \\
   [[ "$CURRENT_PR_HEAD_TREE" != "$PR_HEAD_TREE" ]]; then
  echo "Main or PR #326 source tree changed during static validation; refusing stale deployment evidence." >&2
  printf 'snapshot_main_sha=%s\\ncurrent_main_sha=%s\\nsnapshot_main_tree=%s\\ncurrent_main_tree=%s\\nsnapshot_product_sha=%s\\ncurrent_product_sha=%s\\nsnapshot_product_tree=%s\\ncurrent_product_tree=%s\\n' \\
    "$MAIN_SHA" "$CURRENT_MAIN_SHA" "$MAIN_TREE" "$CURRENT_MAIN_TREE" \\
    "$PR_HEAD_SHA" "$CURRENT_PR_HEAD_SHA" "$PR_HEAD_TREE" "$CURRENT_PR_HEAD_TREE" \\
    > "$FINAL_ROOT/static-tree-continuity.txt"
  exit 1
fi
printf 'snapshot_main_sha=%s\\ncurrent_main_sha=%s\\nmain_tree=%s\\nsnapshot_product_sha=%s\\ncurrent_product_sha=%s\\nproduct_tree=%s\\nsource_trees_identical=true\\n' \\
  "$MAIN_SHA" "$CURRENT_MAIN_SHA" "$MAIN_TREE" \\
  "$PR_HEAD_SHA" "$CURRENT_PR_HEAD_SHA" "$PR_HEAD_TREE" \\
  > "$FINAL_ROOT/static-tree-continuity.txt"
"""
if source.count(static_sha_block) != 1:
    raise SystemExit(f"Expected one static SHA continuity block; found {source.count(static_sha_block)}")
source = source.replace(static_sha_block, static_tree_block, 1)

final_sha_block = """FINAL_PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
git fetch --no-tags origin main "$CANDIDATE_BRANCH"
FINAL_MAIN_SHA="$(git rev-parse origin/main)"
if [[ "$FINAL_PR_HEAD_SHA" != "$PR_HEAD_SHA" || "$FINAL_MAIN_SHA" != "$MAIN_SHA" ]]; then
  echo "Main or PR #326 moved before final evidence sealing." >&2
  exit 1
fi
"""
final_tree_block = """FINAL_PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
git fetch --no-tags origin main "$CANDIDATE_BRANCH"
FETCHED_FINAL_PR_HEAD_SHA="$(git rev-parse "origin/$CANDIDATE_BRANCH")"
FINAL_MAIN_SHA="$(git rev-parse origin/main)"
if [[ "$FINAL_PR_HEAD_SHA" != "$FETCHED_FINAL_PR_HEAD_SHA" ]]; then
  echo "GitHub API and fetched PR head disagree before final evidence sealing." >&2
  exit 1
fi
FINAL_PR_HEAD_TREE="$(git rev-parse "${FINAL_PR_HEAD_SHA}^{tree}")"
FINAL_MAIN_TREE="$(git rev-parse "${FINAL_MAIN_SHA}^{tree}")"
if [[ "$FINAL_PR_HEAD_TREE" != "$PR_HEAD_TREE" || "$FINAL_MAIN_TREE" != "$MAIN_TREE" ]]; then
  echo "Main or PR #326 source tree changed before final evidence sealing." >&2
  printf 'snapshot_main_sha=%s\\nfinal_main_sha=%s\\nsnapshot_main_tree=%s\\nfinal_main_tree=%s\\nsnapshot_product_sha=%s\\nfinal_product_sha=%s\\nsnapshot_product_tree=%s\\nfinal_product_tree=%s\\n' \\
    "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_TREE" "$FINAL_MAIN_TREE" \\
    "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_HEAD_TREE" "$FINAL_PR_HEAD_TREE" \\
    > "$FINAL_ROOT/final-tree-continuity.txt"
  exit 1
fi
printf 'snapshot_main_sha=%s\\nfinal_main_sha=%s\\nmain_tree=%s\\nsnapshot_product_sha=%s\\nfinal_product_sha=%s\\nproduct_tree=%s\\nsource_trees_identical=true\\n' \\
  "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_TREE" \\
  "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_HEAD_TREE" \\
  > "$FINAL_ROOT/final-tree-continuity.txt"
"""
if source.count(final_sha_block) != 1:
    raise SystemExit(f"Expected one final SHA continuity block; found {source.count(final_sha_block)}")
source = source.replace(final_sha_block, final_tree_block, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
'''
if text.count(tree_marker) != 1:
    raise SystemExit(f"Expected one v5 generated-source write marker; found {text.count(tree_marker)}")
text = text.replace(tree_marker, tree_injection, 1)

target_path.write_text(text, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
