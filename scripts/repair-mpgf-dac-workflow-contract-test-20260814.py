from __future__ import annotations

from pathlib import Path


TARGET = Path("src/lib/mpgf/dac-product-lifecycle.test.ts")

OLD = r'''  assert.match(
    workflow,
    /group: mpgf-dac-product-lifecycle-\$\{\{ github\.event\.pull_request\.head\.ref \|\| github\.ref_name \}\}/,
  );
  assert.doesNotMatch(
    workflow,
    /github\.event\.pull_request\.number \|\| github\.ref/,
  );
  assert.match(workflow, /cancel-in-progress: true/);
'''

NEW = r'''  assert.match(workflow, /group: mpgf-dac-product-lifecycle-shared-qa/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(
    workflow,
    /group: mpgf-dac-product-lifecycle-\$\{\{ github\.event\.pull_request\.head\.ref \|\| github\.ref_name \}\}/,
  );
  assert.doesNotMatch(
    workflow,
    /github\.event\.pull_request\.number \|\| github\.ref/,
  );
  assert.equal(
    countOccurrences(
      workflow,
      "supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql",
    ),
    5,
  );
  assert.match(
    workflow,
    /Reconcile exact terminal DAC schema immediately before fixtures/,
  );
  assert.match(workflow, /proposal_lock=true/);
'''


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")
    occurrences = source.count(OLD)
    if occurrences != 1:
        raise SystemExit(
            "Refusing to patch: expected exactly one obsolete DAC workflow "
            f"contract block, found {occurrences}."
        )

    repaired = source.replace(OLD, NEW, 1)

    required_fragments = (
        "group: mpgf-dac-product-lifecycle-shared-qa",
        "cancel-in-progress: false",
        "20260812074500_mpgf_dac_terminal_schema_reconciliation.sql",
        "Reconcile exact terminal DAC schema immediately before fixtures",
        "proposal_lock=true",
    )
    for fragment in required_fragments:
        if fragment not in repaired:
            raise SystemExit(f"Refusing to write: required fragment missing: {fragment}")

    if "assert.match(workflow, /cancel-in-progress: true/);" in repaired:
        raise SystemExit("Refusing to write: obsolete cancellation assertion remains.")

    TARGET.write_text(repaired, encoding="utf-8")


if __name__ == "__main__":
    main()
