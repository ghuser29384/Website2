#!/usr/bin/env python3
"""Run the previously reviewed DAC owner-UAT controller against production.

The source UAT controller remains unchanged. This wrapper changes only the
selected data-plane identity from isolated QA to production and replaces the
historical integration-state assertion with an exact merged-main assertion.
The application under test remains the byte-identical validated DAC candidate;
the canonical merged deployment is independently SHA- and asset-verified.
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
from pathlib import Path

import yaml

ORIGINAL = Path("controller/ops/pr758-run-trusted-controller.py")
PROD_REF = "jnpoxvalyjtdghnperyu"
FORBIDDEN_QA_REF = "hvmxfjjbdcgjjudmthdz"
CANDIDATE_SHA = "2ecdf5736e0bb5e064ef6bc68fda450710d07aa8"
CANDIDATE_TREE = "1555c5a493027ea6ee240c6ed83c61e37972e8c1"
ALLOWED_POST_CANDIDATE_PATHS = {
    "public/moral-trade-create/ui-repairs.js",
    "src/lib/create-interface/create-ui-repairs.test.ts",
    "tests/create-route-ui-regression.spec.ts",
}


def load_original():
    spec = importlib.util.spec_from_file_location("trusted_pr758_runner", ORIGINAL)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load trusted runner: {ORIGINAL}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merged_identity_script() -> str:
    allowed_lines = "\n".join(
        f"{path}" for path in sorted(ALLOWED_POST_CANDIDATE_PATHS)
    )
    return f'''set -euo pipefail

test "$(git -C app rev-parse HEAD)" = "$CANDIDATE_HEAD_SHA"
test "$(git -C app rev-parse HEAD^{{tree}})" = "$CANDIDATE_TREE_SHA"
test "$CANDIDATE_HEAD_SHA" = "{CANDIDATE_SHA}"
test "$CANDIDATE_TREE_SHA" = "{CANDIDATE_TREE}"

git -C app fetch origin main --quiet
observed_main_sha="$(git -C app rev-parse origin/main)"
git -C app merge-base --is-ancestor "$CANDIDATE_HEAD_SHA" "$observed_main_sha"

git -C app diff --name-only "$CANDIDATE_HEAD_SHA" "$observed_main_sha" \
  | sort -u > evidence/post-candidate-main-drift.txt
cat > "$RUNNER_TEMP/allowed-post-candidate-paths.txt" <<'EOF_ALLOWED'
{allowed_lines}
EOF_ALLOWED
sort -u "$RUNNER_TEMP/allowed-post-candidate-paths.txt" \
  > "$RUNNER_TEMP/allowed-post-candidate-paths.sorted.txt"
comm -23 evidence/post-candidate-main-drift.txt \
  "$RUNNER_TEMP/allowed-post-candidate-paths.sorted.txt" \
  > evidence/post-candidate-main-unexpected.txt
test ! -s evidence/post-candidate-main-unexpected.txt

gh api repos/$GITHUB_REPOSITORY/pulls/758 > "$RUNNER_TEMP/pr758.json"
jq -e --arg source_head "$CANDIDATE_HEAD_SHA" '
  .state == "closed" and .merged == true and .head.sha == $source_head
' "$RUNNER_TEMP/pr758.json" >/dev/null
merged_sha="$(jq -r '.merge_commit_sha' "$RUNNER_TEMP/pr758.json")"
test -n "$merged_sha"
test "$merged_sha" = "$observed_main_sha"

gh api repos/$GITHUB_REPOSITORY/pulls/689 > "$RUNNER_TEMP/pr689.json"
gh api repos/$GITHUB_REPOSITORY/pulls/640 > "$RUNNER_TEMP/pr640.json"
gh api repos/$GITHUB_REPOSITORY/issues/697 > "$RUNNER_TEMP/issue697.json"
gh api repos/$GITHUB_REPOSITORY/issues/702 > "$RUNNER_TEMP/issue702.json"
jq -e '.state == "open" and .draft == true and .merged == false' \
  "$RUNNER_TEMP/pr689.json" >/dev/null
jq -e '.state == "open" and .draft == true and .merged == false' \
  "$RUNNER_TEMP/pr640.json" >/dev/null
jq -e '.state == "open"' "$RUNNER_TEMP/issue697.json" >/dev/null
jq -e '.state == "closed"' "$RUNNER_TEMP/issue702.json" >/dev/null

python3 - <<'PY_IDENTITY'
from pathlib import Path
import json
import os

paths = [
    line.strip()
    for line in Path("evidence/post-candidate-main-drift.txt").read_text().splitlines()
    if line.strip()
]
Path("evidence/github-state.json").write_text(
    json.dumps(
        {{
            "sourceCandidate": {{
                "head": os.environ["CANDIDATE_HEAD_SHA"],
                "tree": os.environ["CANDIDATE_TREE_SHA"],
                "pr": 758,
                "merged": True,
            }},
            "productionMain": {{
                "sha": os.popen("git -C app rev-parse origin/main").read().strip(),
                "containsSourceCandidate": True,
                "postCandidatePaths": paths,
                "postCandidateDriftClassification": "disjoint",
            }},
            "dataPlane": {{
                "expectedRef": "{PROD_REF}",
                "forbiddenRef": "{FORBIDDEN_QA_REF}",
                "environment": "production",
            }},
            "historicalEvidence": {{
                "pr689OpenDraft": True,
                "pr640OpenDraft": True,
                "issue697Open": True,
                "issue702Closed": True,
            }},
        }},
        indent=2,
    ) + "\\n"
)
PY_IDENTITY
'''


def patch_workflow(original_text: str) -> str:
    workflow = yaml.safe_load(original_text)
    env = workflow.get("env") or {}
    if env.get("EXPECTED_QA_REF") != FORBIDDEN_QA_REF:
        raise RuntimeError("Trusted workflow no longer has the reviewed QA identity pin.")
    if env.get("FORBIDDEN_PROD_REF") != PROD_REF:
        raise RuntimeError("Trusted workflow no longer has the reviewed production exclusion pin.")
    env["EXPECTED_QA_REF"] = PROD_REF
    env["FORBIDDEN_PROD_REF"] = FORBIDDEN_QA_REF
    workflow["env"] = env

    jobs = workflow.get("jobs") or {}
    job = jobs.get("owner-uat")
    if not isinstance(job, dict):
        raise RuntimeError("Trusted workflow owner-uat job is missing.")

    identity_replacements = 0
    for step in job.get("steps") or []:
        run = step.get("run")
        if not isinstance(run, str):
            continue

        # The reviewed controller has one authoritative identity step containing
        # both the observed-main assertion and the integration-PR assertion.
        if "observed_main_sha=" in run and "pr758.json" in run:
            step["run"] = merged_identity_script()
            identity_replacements += 1
            continue

        # Evidence text must say production, not QA. Functional variable names
        # remain unchanged so the trusted controller receives the selected
        # production credentials through its existing fail-closed interfaces.
        run = run.replace("isolated-QA", "production")
        run = run.replace("isolated QA", "production")
        run = run.replace("QA-only", "production-only")
        run = run.replace("qa_only", "production_only")
        step["run"] = run

    if identity_replacements != 1:
        raise RuntimeError(
            f"Expected one trusted identity step, found {identity_replacements}."
        )

    rendered = yaml.safe_dump(workflow, sort_keys=False, width=120)
    forbidden = [
        "EXPECTED_QA_REF: hvmxfjjbdcgjjudmthdz",
        "FORBIDDEN_PROD_REF: jnpoxvalyjtdghnperyu",
    ]
    retained = [token for token in forbidden if token in rendered]
    if retained:
        raise RuntimeError(f"Production transform retained stale identity pins: {retained}")
    return rendered


def main() -> int:
    module = load_original()
    original_transform = module.transform_trusted_workflow

    def transformed() -> str:
        return patch_workflow(original_transform())

    module.transform_trusted_workflow = transformed
    return int(module.main())


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BaseException as exc:
        Path("evidence").mkdir(parents=True, exist_ok=True)
        Path("evidence/production-runner-error.json").write_text(
            json.dumps(
                {{"errorType": type(exc).__name__, "error": str(exc)}},
                indent=2,
            ) + "\n"
        )
        raise
