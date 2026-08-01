#!/usr/bin/env bash
set -euo pipefail

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate-v6.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v7-wrapper.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding="utf-8")

old_static = r'''CURRENT_MAIN_TREE="$(git rev-parse "${CURRENT_MAIN_SHA}^{tree}")"
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
  > "$FINAL_ROOT/static-tree-continuity.txt"'''
new_static = r'''CURRENT_MAIN_TREE="$(git rev-parse "${CURRENT_MAIN_SHA}^{tree}")"
CURRENT_PR_HEAD_TREE="$(git rev-parse "${CURRENT_PR_HEAD_SHA}^{tree}")"
release_fingerprint() {
  git ls-tree -r --full-tree "$1" | grep -v $'\\t.github/' | sha256sum | awk '{print $1}'
}
SNAPSHOT_MAIN_RELEASE_HASH="$(release_fingerprint "$MAIN_SHA")"
CURRENT_MAIN_RELEASE_HASH="$(release_fingerprint "$CURRENT_MAIN_SHA")"
SNAPSHOT_PR_RELEASE_HASH="$(release_fingerprint "$PR_HEAD_SHA")"
CURRENT_PR_RELEASE_HASH="$(release_fingerprint "$CURRENT_PR_HEAD_SHA")"
if [[ "$CURRENT_MAIN_RELEASE_HASH" != "$SNAPSHOT_MAIN_RELEASE_HASH" ]] || \\
   [[ "$CURRENT_PR_RELEASE_HASH" != "$SNAPSHOT_PR_RELEASE_HASH" ]]; then
  echo "Main or PR #326 release-relevant source changed during static validation; refusing stale deployment evidence." >&2
  printf 'snapshot_main_sha=%s\\ncurrent_main_sha=%s\\nsnapshot_main_tree=%s\\ncurrent_main_tree=%s\\nsnapshot_main_release_hash=%s\\ncurrent_main_release_hash=%s\\nsnapshot_product_sha=%s\\ncurrent_product_sha=%s\\nsnapshot_product_tree=%s\\ncurrent_product_tree=%s\\nsnapshot_product_release_hash=%s\\ncurrent_product_release_hash=%s\\n' \\
    "$MAIN_SHA" "$CURRENT_MAIN_SHA" "$MAIN_TREE" "$CURRENT_MAIN_TREE" \\
    "$SNAPSHOT_MAIN_RELEASE_HASH" "$CURRENT_MAIN_RELEASE_HASH" \\
    "$PR_HEAD_SHA" "$CURRENT_PR_HEAD_SHA" "$PR_HEAD_TREE" "$CURRENT_PR_HEAD_TREE" \\
    "$SNAPSHOT_PR_RELEASE_HASH" "$CURRENT_PR_RELEASE_HASH" \\
    > "$FINAL_ROOT/static-tree-continuity.txt"
  exit 1
fi
printf 'snapshot_main_sha=%s\\ncurrent_main_sha=%s\\nsnapshot_main_tree=%s\\ncurrent_main_tree=%s\\nmain_release_hash=%s\\nsnapshot_product_sha=%s\\ncurrent_product_sha=%s\\nsnapshot_product_tree=%s\\ncurrent_product_tree=%s\\nproduct_release_hash=%s\\nrelease_relevant_source_identical=true\\ngithub_only_churn_allowed=true\\n' \\
  "$MAIN_SHA" "$CURRENT_MAIN_SHA" "$MAIN_TREE" "$CURRENT_MAIN_TREE" "$SNAPSHOT_MAIN_RELEASE_HASH" \\
  "$PR_HEAD_SHA" "$CURRENT_PR_HEAD_SHA" "$PR_HEAD_TREE" "$CURRENT_PR_HEAD_TREE" "$SNAPSHOT_PR_RELEASE_HASH" \\
  > "$FINAL_ROOT/static-tree-continuity.txt"'''
if source.count(old_static) != 1:
    raise SystemExit(f"Expected one v6 static full-tree block; found {source.count(old_static)}")
source = source.replace(old_static, new_static, 1)

old_final = r'''FINAL_PR_HEAD_TREE="$(git rev-parse "${FINAL_PR_HEAD_SHA}^{tree}")"
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
  > "$FINAL_ROOT/final-tree-continuity.txt"'''
new_final = r'''FINAL_PR_HEAD_TREE="$(git rev-parse "${FINAL_PR_HEAD_SHA}^{tree}")"
FINAL_MAIN_TREE="$(git rev-parse "${FINAL_MAIN_SHA}^{tree}")"
release_fingerprint() {
  git ls-tree -r --full-tree "$1" | grep -v $'\\t.github/' | sha256sum | awk '{print $1}'
}
SNAPSHOT_MAIN_RELEASE_HASH="$(release_fingerprint "$MAIN_SHA")"
FINAL_MAIN_RELEASE_HASH="$(release_fingerprint "$FINAL_MAIN_SHA")"
SNAPSHOT_PR_RELEASE_HASH="$(release_fingerprint "$PR_HEAD_SHA")"
FINAL_PR_RELEASE_HASH="$(release_fingerprint "$FINAL_PR_HEAD_SHA")"
if [[ "$FINAL_PR_RELEASE_HASH" != "$SNAPSHOT_PR_RELEASE_HASH" || \\
      "$FINAL_MAIN_RELEASE_HASH" != "$SNAPSHOT_MAIN_RELEASE_HASH" ]]; then
  echo "Main or PR #326 release-relevant source changed before final evidence sealing." >&2
  printf 'snapshot_main_sha=%s\\nfinal_main_sha=%s\\nsnapshot_main_tree=%s\\nfinal_main_tree=%s\\nsnapshot_main_release_hash=%s\\nfinal_main_release_hash=%s\\nsnapshot_product_sha=%s\\nfinal_product_sha=%s\\nsnapshot_product_tree=%s\\nfinal_product_tree=%s\\nsnapshot_product_release_hash=%s\\nfinal_product_release_hash=%s\\n' \\
    "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_TREE" "$FINAL_MAIN_TREE" \\
    "$SNAPSHOT_MAIN_RELEASE_HASH" "$FINAL_MAIN_RELEASE_HASH" \\
    "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_HEAD_TREE" "$FINAL_PR_HEAD_TREE" \\
    "$SNAPSHOT_PR_RELEASE_HASH" "$FINAL_PR_RELEASE_HASH" \\
    > "$FINAL_ROOT/final-tree-continuity.txt"
  exit 1
fi
printf 'snapshot_main_sha=%s\\nfinal_main_sha=%s\\nsnapshot_main_tree=%s\\nfinal_main_tree=%s\\nmain_release_hash=%s\\nsnapshot_product_sha=%s\\nfinal_product_sha=%s\\nsnapshot_product_tree=%s\\nfinal_product_tree=%s\\nproduct_release_hash=%s\\nrelease_relevant_source_identical=true\\ngithub_only_churn_allowed=true\\n' \\
  "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_TREE" "$FINAL_MAIN_TREE" "$SNAPSHOT_MAIN_RELEASE_HASH" \\
  "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_HEAD_TREE" "$FINAL_PR_HEAD_TREE" "$SNAPSHOT_PR_RELEASE_HASH" \\
  > "$FINAL_ROOT/final-tree-continuity.txt"'''
if source.count(old_final) != 1:
    raise SystemExit(f"Expected one v6 final full-tree block; found {source.count(old_final)}")
source = source.replace(old_final, new_final, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
