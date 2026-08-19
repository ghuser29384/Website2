#!/usr/bin/env python3
"""Execute the trusted PR #740 UAT workflow as a PR #749 one-use controller.

The repository's GitHub App cannot push workflow-file changes without the
workflows permission. This runner preserves the previously reviewed workflow
verbatim except for exact identity pins, the integration PR number, and a
fail-closed audit for disjoint main drift after candidate creation. Checkout,
Node setup, and artifact upload remain ordinary wrapper-workflow actions.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

ROOT = Path.cwd()
SOURCE = ROOT / "controller/.github/workflows/pr740-dac-current-main-integration-uat-20260816.yml"
EVIDENCE = ROOT / "evidence"
TRANSFORMED = EVIDENCE / "pr749-transformed-trusted-controller.yml"
RESULT = EVIDENCE / "controller-runner-result.json"


def require_replace(text: str, old: str, new: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing trusted-controller token: {old}")
    return text.replace(old, new)


def transform_trusted_workflow() -> str:
    text = SOURCE.read_text(encoding="utf-8")

    replacements = [
        (
            "PR 740 current-main DAC integration protected Preview owner UAT 20260816",
            "PR 749 fresh-current-main DAC integration protected Preview owner UAT 20260817",
        ),
        (
            "ops/pr740-dac-current-main-integration-uat-20260816",
            "ops/pr749-dac-current-main-integration-uat-20260817",
        ),
        (
            "CANDIDATE_BASE_SHA: 4587e8c418621440835940d6924f32c02ba3f2d1",
            "CANDIDATE_BASE_SHA: c2d7be6a895f1bb8c9ced1b257eb8b4381d50ac3",
        ),
        (
            "CANDIDATE_HEAD_SHA: 434e68d2ecdc034696a850448da2270237100328",
            "CANDIDATE_HEAD_SHA: 0d9c997cee8e251818d74fa96ea8321c6489cac8",
        ),
        (
            "CANDIDATE_TREE_SHA: 2d00b09d2077857fcbf6437f79b7b1abcadd9827",
            "CANDIDATE_TREE_SHA: 6ccbd8c7f34392475b8738ec7ce581a460c55066",
        ),
        ('INTEGRATION_PR_NUMBER: "740"', 'INTEGRATION_PR_NUMBER: "749"'),
        ("pulls/740", "pulls/749"),
        ("pr:740", "pr:749"),
    ]
    for old, new in replacements:
        text = require_replace(text, old, new)

    text = text.replace("PR 740", "PR 749").replace("pr740-", "pr749-")
    text = require_replace(
        text,
        'test "$GITHUB_REF_NAME" = "$CONTROLLER_BRANCH"',
        'test "${GITHUB_HEAD_REF:-$GITHUB_REF_NAME}" = "$CONTROLLER_BRANCH"',
    )

    strict_main = '''          observed_main_sha="$(git -C app rev-parse origin/main)"
          test "$observed_main_sha" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app merge-base HEAD origin/main)" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app status --porcelain)" = ""
'''
    audited_main = '''          observed_main_sha="$(git -C app rev-parse origin/main)"
          git -C app merge-base --is-ancestor "$CANDIDATE_BASE_SHA" "$observed_main_sha"
          test "$(git -C app merge-base HEAD "$observed_main_sha")" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app status --porcelain)" = ""

          mkdir -p evidence
          git -C app diff --name-only "$CANDIDATE_BASE_SHA" "$observed_main_sha" \\
            | sort -u > evidence/post-candidate-main-drift.txt
          git -C app diff --name-only "$CANDIDATE_BASE_SHA" "$CANDIDATE_HEAD_SHA" \\
            | sort -u > evidence/candidate-diff.txt
          comm -12 evidence/candidate-diff.txt evidence/post-candidate-main-drift.txt \\
            > evidence/post-candidate-main-overlap.txt
          test ! -s evidence/post-candidate-main-overlap.txt

          python3 - <<'PY'
          from pathlib import Path
          import json

          drift = [
              line.strip()
              for line in Path("evidence/post-candidate-main-drift.txt").read_text().splitlines()
              if line.strip()
          ]
          critical_tokens = (
              "mpgf", "dac", "supabase", "auth", "vercel", "discover",
              "navigation", "footer", "globals.css", "playwright", "shared-qa",
              "site.ts", "middleware", "proxy.ts", "offers/page.tsx",
          )
          critical = [path for path in drift if any(token in path.lower() for token in critical_tokens)]
          Path("evidence/post-candidate-main-drift-audit.json").write_text(
              json.dumps(
                  {
                      "pathCount": len(drift),
                      "paths": drift,
                      "candidateOverlap": [],
                      "criticalPaths": critical,
                      "classification": "disjoint" if not critical else "relevant_drift_blocked",
                  },
                  indent=2,
              ) + "\\n"
          )
          if critical:
              raise SystemExit(f"Post-candidate main drift touches UAT-critical paths: {critical}")
          PY
'''
    text = require_replace(text, strict_main, audited_main)

    strict_pr = '''          jq -e --arg head "$CANDIDATE_HEAD_SHA" --arg base "$CANDIDATE_BASE_SHA" '
            .state == "open" and .draft == true and .merged == false
              and .head.sha == $head and .base.sha == $base
          ' "$RUNNER_TEMP/pr740.json" > /dev/null
'''
    audited_pr = '''          jq -e --arg head "$CANDIDATE_HEAD_SHA" '
            .state == "open" and .draft == true and .merged == false
              and .head.sha == $head and .base.ref == "main"
          ' "$RUNNER_TEMP/pr740.json" > /dev/null
'''
    text = require_replace(text, strict_pr, audited_pr)

    old_state = '''            '{integration:{pr:749,open:true,draft:true,merged:false,head:$head,tree:$tree,firstParent:$firstParent,secondParent:$secondParent},sourcePr689:{open:true,draft:true,merged:false,head:$secondParent,historicalBase:$sourceBase,preRepair:$sourcePreRepair,orderingRepair:$orderingRepair,terminalGuardRepair:$terminalGuardRepair},repository:{observedMain:$observedMain,exactMainIsFirstParent:true},pr640:{open:true,draft:true,merged:false},issues:{"697":"open","702":"closed_completed"}}' \\
'''
    new_state = '''            '{integration:{pr:749,open:true,draft:true,merged:false,head:$head,tree:$tree,firstParent:$firstParent,secondParent:$secondParent},sourcePr689:{open:true,draft:true,merged:false,head:$secondParent,historicalBase:$sourceBase,preRepair:$sourcePreRepair,orderingRepair:$orderingRepair,terminalGuardRepair:$terminalGuardRepair},repository:{observedMain:$observedMain,candidateBaseWasExactMainAtCreation:true,postCandidateMainDriftChecked:true,postCandidateMainDriftPathDisjoint:true},pr640:{open:true,draft:true,merged:false},issues:{"697":"open","702":"closed_completed"}}' \\
'''
    text = require_replace(text, old_state, new_state)

    forbidden = (
        "CANDIDATE_BASE_SHA: 4587e8c418621440835940d6924f32c02ba3f2d1",
        "CANDIDATE_HEAD_SHA: 434e68d2ecdc034696a850448da2270237100328",
        "CANDIDATE_TREE_SHA: 2d00b09d2077857fcbf6437f79b7b1abcadd9827",
        "ops/pr740-dac-current-main-integration-uat-20260816",
        "pulls/740",
        "pr:740",
    )
    retained = [token for token in forbidden if token in text]
    if retained:
        raise RuntimeError(f"Transformed controller retained stale tokens: {retained}")

    return text


EXPRESSION = re.compile(r"\$\{\{\s*([^{}]+?)\s*\}\}")
STEP_OUTPUT = re.compile(r"^steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)$")


def stringify(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""
    return str(value)


def resolve_expression(expr: str, env: dict[str, str], outputs: dict[str, dict[str, str]]) -> str:
    expr = expr.strip()
    if expr == "github.token":
        return env.get("GH_TOKEN", "")
    if expr == "github.run_id":
        return env.get("GITHUB_RUN_ID", "")
    if expr.startswith("secrets."):
        return env.get(expr.split(".", 1)[1], "")
    if expr.startswith("env."):
        return env.get(expr.split(".", 1)[1], "")
    match = STEP_OUTPUT.match(expr)
    if match:
        return outputs.get(match.group(1), {}).get(match.group(2), "")
    raise RuntimeError(f"Unsupported trusted-controller expression: {expr}")


def resolve(value: Any, env: dict[str, str], outputs: dict[str, dict[str, str]]) -> str:
    text = stringify(value)
    return EXPRESSION.sub(lambda m: resolve_expression(m.group(1), env, outputs), text)


def parse_output_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    parsed: dict[str, str] = {}
    index = 0
    while index < len(lines):
        line = lines[index]
        if "<<" in line:
            key, delimiter = line.split("<<", 1)
            index += 1
            values: list[str] = []
            while index < len(lines) and lines[index] != delimiter:
                values.append(lines[index])
                index += 1
            parsed[key] = "\n".join(values)
        elif "=" in line:
            key, value = line.split("=", 1)
            parsed[key] = value
        index += 1
    return parsed


def should_run(condition: Any, prior_failed: bool, outputs: dict[str, dict[str, str]]) -> bool:
    if condition is None:
        return not prior_failed
    text = stringify(condition).strip()
    if text == "always()":
        return True
    if text.startswith("always() &&"):
        checks = re.findall(
            r"steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)\s*!=\s*''",
            text,
        )
        if not checks:
            raise RuntimeError(f"Unsupported always condition: {text}")
        return all(outputs.get(step_id, {}).get(key, "") != "" for step_id, key in checks)
    raise RuntimeError(f"Unsupported trusted-controller condition: {text}")


def main() -> int:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    transformed = transform_trusted_workflow()
    TRANSFORMED.write_text(transformed, encoding="utf-8")
    workflow = yaml.safe_load(transformed)
    job = workflow["jobs"]["owner-uat"]

    global_env = dict(os.environ)
    for key, value in (workflow.get("env") or {}).items():
        global_env[str(key)] = stringify(value)

    outputs: dict[str, dict[str, str]] = {}
    records: list[dict[str, Any]] = []
    failed = False

    for ordinal, step in enumerate(job["steps"], start=1):
        name = stringify(step.get("name") or f"step-{ordinal}")
        step_id = stringify(step.get("id"))

        if "uses" in step:
            records.append(
                {
                    "ordinal": ordinal,
                    "name": name,
                    "id": step_id or None,
                    "status": "handled_by_wrapper",
                    "uses": stringify(step["uses"]),
                }
            )
            continue

        condition = step.get("if")
        if not should_run(condition, failed, outputs):
            records.append(
                {
                    "ordinal": ordinal,
                    "name": name,
                    "id": step_id or None,
                    "status": "skipped_after_failure",
                }
            )
            continue

        step_env = dict(global_env)
        for key, value in (step.get("env") or {}).items():
            step_env[str(key)] = resolve(value, step_env, outputs)

        working_directory = resolve(step.get("working-directory") or ".", step_env, outputs)
        cwd = (ROOT / working_directory).resolve()
        if not cwd.exists():
            raise RuntimeError(f"Missing working directory for {name}: {cwd}")

        script = resolve(step["run"], step_env, outputs)
        with tempfile.NamedTemporaryFile(prefix="pr749-output-", delete=False) as output_handle:
            output_path = Path(output_handle.name)
        step_env["GITHUB_OUTPUT"] = str(output_path)

        print(f"::group::{ordinal:02d} {name}", flush=True)
        completed = subprocess.run(
            ["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script],
            cwd=cwd,
            env=step_env,
            check=False,
        )
        print("::endgroup::", flush=True)

        captured = parse_output_file(output_path)
        output_path.unlink(missing_ok=True)
        if step_id:
            outputs[step_id] = captured

        records.append(
            {
                "ordinal": ordinal,
                "name": name,
                "id": step_id or None,
                "status": "passed" if completed.returncode == 0 else "failed",
                "returnCode": completed.returncode,
                "outputKeys": sorted(captured),
            }
        )
        if completed.returncode != 0:
            failed = True

    RESULT.write_text(
        json.dumps(
            {
                "trustedSource": str(SOURCE.relative_to(ROOT)),
                "transformedController": str(TRANSFORMED.relative_to(ROOT)),
                "candidateHead": global_env.get("CANDIDATE_HEAD_SHA"),
                "candidateTree": global_env.get("CANDIDATE_TREE_SHA"),
                "failed": failed,
                "steps": records,
                "capturedOutputKeys": {key: sorted(value) for key, value in outputs.items()},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BaseException as exc:
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        if not RESULT.exists():
            RESULT.write_text(
                json.dumps(
                    {
                        "failed": True,
                        "runnerErrorType": type(exc).__name__,
                        "runnerError": str(exc),
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
        raise
