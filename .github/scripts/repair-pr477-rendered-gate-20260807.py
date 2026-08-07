from __future__ import annotations

import sys
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return source.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: repair_pr477.py <repository-root>")

    root = Path(sys.argv[1]).resolve()
    workflow_path = root / ".github/workflows/vercel-release.yml"
    test_path = root / "scripts/vercel-release-workflow.test.mjs"
    workflow = workflow_path.read_text()
    tests = test_path.read_text()

    workflow = replace_once(
        workflow,
        '              grep = "^(?:" + "|".join(re.escape(title) for title in titles) + ")$" if titles else ""',
        '              grep = "(?:" + "|".join(re.escape(title) for title in titles) + ")" if titles else ""',
        "unanchored Playwright title filter",
    )

    candidate_boundary = '''          if [[ -d playwright-report ]]; then
            mv playwright-report "$evidence_dir/candidate-focused-playwright-report"
          fi

          (
            set -euo pipefail
            cd "$base_dir"
'''
    repaired_boundary = '''          if [[ -d playwright-report ]]; then
            mv playwright-report "$evidence_dir/candidate-focused-playwright-report"
          fi

          if [[ "$candidate_focused_status" -eq 0 ]]; then
            cat > "$evidence_dir/focused-summary.md" <<EOF
          ### Focused rendered-failure adjudication

          - Candidate focused failures: 0
          - Exact-base focused rerun: not needed
          - Persistent candidate-only regressions: 0
          - Result: every candidate-only full-suite failure cleared across five focused repetitions
          EOF
            : > "$evidence_dir/regressions.txt"
            cat "$evidence_dir/focused-summary.md" >> "$GITHUB_STEP_SUMMARY"
            echo 'Every candidate-only full-suite failure cleared under repeated focused rerun.'
            exit 0
          fi

          base_focused_files=()
          : > "$evidence_dir/base-unavailable-files.txt"
          for focused_file in "${focused_files[@]}"; do
            if [[ -f "$base_dir/$focused_file" ]]; then
              base_focused_files+=("$focused_file")
            else
              printf '%s\\n' "$focused_file" >> "$evidence_dir/base-unavailable-files.txt"
            fi
          done

          if [[ "${#base_focused_files[@]}" -eq 0 ]]; then
            printf '  0 passed\\n' > "$evidence_dir/base-focused.log"
            printf '0\\n' > "$evidence_dir/base-focused.status"
          else
            (
              set -euo pipefail
              cd "$base_dir"
'''
    workflow = replace_once(
        workflow,
        candidate_boundary,
        repaired_boundary,
        "candidate-pass short circuit and base file partition",
    )

    base_command = '''            npx playwright test "${focused_files[@]}" \\
              --grep "$focused_grep" \\
              --repeat-each=5 \\
              --reporter=line 2>&1 | tee "$evidence_dir/base-focused.log"
'''
    repaired_base_command = '''              npx playwright test "${base_focused_files[@]}" \\
                --grep "$focused_grep" \\
                --repeat-each=5 \\
                --reporter=line 2>&1 | tee "$evidence_dir/base-focused.log"
'''
    workflow = replace_once(
        workflow,
        base_command,
        repaired_base_command,
        "base focused file subset",
    )

    base_close = '''            if [[ -d playwright-report ]]; then
              mv playwright-report "$evidence_dir/base-focused-playwright-report"
            fi
          )
          base_focused_status="$(cat "$evidence_dir/base-focused.status")"
'''
    repaired_base_close = '''              if [[ -d playwright-report ]]; then
                mv playwright-report "$evidence_dir/base-focused-playwright-report"
              fi
            )
          fi
          base_focused_status="$(cat "$evidence_dir/base-focused.status")"
'''
    workflow = replace_once(
        workflow,
        base_close,
        repaired_base_close,
        "base focused conditional close",
    )

    focused_summary = '''            --base-status "$base_focused_status" \\
            --output "$evidence_dir"
          cat "$evidence_dir/focused-summary.md" >> "$GITHUB_STEP_SUMMARY"
'''
    repaired_summary = '''            --base-status "$base_focused_status" \\
            --output "$evidence_dir"
          if [[ -s "$evidence_dir/base-unavailable-files.txt" ]]; then
            unavailable_count="$(grep -c . "$evidence_dir/base-unavailable-files.txt")"
            printf '%s\\n' "- Candidate-only files absent from exact base: $unavailable_count" \\
              >> "$evidence_dir/focused-summary.md"
          fi
          cat "$evidence_dir/focused-summary.md" >> "$GITHUB_STEP_SUMMARY"
'''
    workflow = replace_once(
        workflow,
        focused_summary,
        repaired_summary,
        "focused unavailable-file evidence",
    )

    test_marker = '''test("the release requires a repository secret rather than embedding credentials", async () => {
'''
    regression_test = r'''test("focused preview adjudication reruns full Playwright titles and never asks the base to run absent files", async () => {
  const source = await workflow();
  const candidatePassIndex = source.indexOf(
    'if [[ "$candidate_focused_status" -eq 0 ]]; then',
  );
  const basePartitionIndex = source.indexOf("base_focused_files=()");
  const baseRunIndex = source.indexOf(
    'npx playwright test "${base_focused_files[@]}"',
  );

  assert.ok(
    source.includes(
      'grep = "(?:" + "|".join(re.escape(title) for title in titles) + ")" if titles else ""',
    ),
  );
  assert.ok(!source.includes('grep = "^(?:"'));
  assert.notEqual(candidatePassIndex, -1);
  assert.notEqual(basePartitionIndex, -1);
  assert.notEqual(baseRunIndex, -1);
  assert.ok(candidatePassIndex < basePartitionIndex);
  assert.ok(basePartitionIndex < baseRunIndex);
  assert.ok(source.includes('if [[ -f "$base_dir/$focused_file" ]]; then'));
  assert.ok(source.includes('base_focused_files+=("$focused_file")'));
  assert.ok(
    source.includes('if [[ "${#base_focused_files[@]}" -eq 0 ]]; then'),
  );
  assert.ok(source.includes("printf '  0 passed"));
  assert.ok(source.includes("base-unavailable-files.txt"));
});

'''
    if test_marker not in tests:
        raise SystemExit("regression-test insertion marker missing")
    if "focused preview adjudication reruns full Playwright titles" in tests:
        raise SystemExit("regression test already present")
    tests = tests.replace(test_marker, regression_test + test_marker, 1)

    workflow_path.write_text(workflow)
    test_path.write_text(tests)


if __name__ == "__main__":
    main()
