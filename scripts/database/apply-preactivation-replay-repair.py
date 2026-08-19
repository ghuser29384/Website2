#!/usr/bin/env python3
"""One-shot, fail-closed repair for the pre-activation baseline generator."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import os
import subprocess


def run(*args: str) -> str:
    completed = subprocess.run(
        args,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    print(completed.stdout, end="")
    return completed.stdout.strip()


root = Path(run("git", "rev-parse", "--show-toplevel"))
os.chdir(root)

target_branch = os.environ.get(
    "TARGET_BRANCH", "database/preactivation-schema-baseline-clean-20260819"
)
source_head = run("git", "rev-parse", "HEAD")
run("git", "fetch", "--no-tags", "origin", target_branch)
remote_head = run("git", "rev-parse", f"origin/{target_branch}")
if remote_head != source_head:
    raise SystemExit(
        f"Refusing repair after branch drift: local {source_head}, remote {remote_head}."
    )
if run("git", "status", "--porcelain"):
    raise SystemExit("Refusing repair from a dirty checkout.")

generator = Path("scripts/database/generate-preactivation-baseline.sh")
source = generator.read_text()
settings_marker = "set local statement_timeout = '10min';\n"
if source.count(settings_marker) != 1:
    raise SystemExit("Expected the baseline statement timeout exactly once.")
if "set local check_function_bodies = false;" in source:
    raise SystemExit("Function-body replay repair is already present.")
source = source.replace(
    settings_marker,
    settings_marker + "set local check_function_bodies = false;\n",
)

assertion_marker = (
    "  assert.match(sql, /Pre-activation baseline requires an empty application schema/);\n"
)
if source.count(assertion_marker) != 1:
    raise SystemExit("Expected the generated baseline guard assertion exactly once.")
source = source.replace(
    assertion_marker,
    assertion_marker
    + "  assert.match(sql, /set local check_function_bodies = false;/);\n",
)
generator.write_text(source)

workflow = Path(".github/workflows/generate-preactivation-baseline.yml")
workflow_source = workflow.read_text()
repair_step = """      - name: Apply bounded pre-activation generator repair
        if: ${{ hashFiles('scripts/database/apply-preactivation-replay-repair.py') != '' }}
        shell: bash
        run: |
          set -euo pipefail
          python3 scripts/database/apply-preactivation-replay-repair.py

"""
if workflow_source.count(repair_step) != 1:
    raise SystemExit("Expected the one-shot repair workflow step exactly once.")
workflow_source = workflow_source.replace(repair_step, "")

old_scan = r"""          if grep -RIl \
              'postgresql\?://\|eyJ[A-Za-z0-9_-]\{20,\}' \
              evidence 2>/dev/null > evidence/credential-scan-matches.txt; then
            test ! -s evidence/credential-scan-matches.txt
          fi
"""
new_scan = r"""          python3 - <<'PY_REDACT'
          from pathlib import Path
          import re

          ansi_escape = re.compile(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
          replacements = (
              (re.compile(r"postgres(?:ql)?://[^\s\x1b]+", re.IGNORECASE), "[redacted-local-database-url]"),
              (re.compile(r"\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b"), "[redacted-local-api-key]"),
              (re.compile(r"\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]+){1,2}\b"), "[redacted-jwt]"),
          )
          clean_room = Path("evidence/clean-room")
          if clean_room.is_dir():
              for path in clean_room.glob("*.log"):
                  text = ansi_escape.sub("", path.read_text(errors="replace"))
                  for pattern, replacement in replacements:
                      text = pattern.sub(replacement, text)
                  path.write_text(text)
          PY_REDACT
          if grep -REIl \
              'postgres(ql)?://|eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_[A-Za-z0-9_-]+' \
              evidence 2>/dev/null > evidence/credential-scan-matches.txt; then
            test ! -s evidence/credential-scan-matches.txt
          fi
"""
if workflow_source.count(old_scan) != 1:
    raise SystemExit("Expected the old evidence credential scan exactly once.")
workflow.write_text(workflow_source.replace(old_scan, new_scan))

trigger = Path("scripts/database/generate-preactivation-baseline.trigger")
requested_at = (
    datetime.now(timezone.utc)
    .replace(microsecond=0)
    .isoformat()
    .replace("+00:00", "Z")
)
trigger.write_text(
    "issue-714 authoritative pre-activation baseline generation\n"
    "source-main=26d1fe436dbf9a4440bfafd501ddf8db944a1127\n"
    f"requested-at={requested_at}\n"
    "purpose=pg-dump-function-body-replay-and-redacted-clean-room-evidence-r5\n"
)

for obsolete in (
    Path(".github/workflows/patch-preactivation-baseline-replay-and-evidence.yml"),
    Path("scripts/database/apply-preactivation-replay-repair.py"),
):
    if obsolete.exists():
        obsolete.unlink()

run("bash", "-n", "scripts/database/generate-preactivation-baseline.sh")
run("bash", "-n", "scripts/database/validate-preactivation-baseline.sh")
run("git", "diff", "--check")
if "set local check_function_bodies = false;" not in generator.read_text():
    raise SystemExit("Generator replay setting was not materialized.")
if "redacted-local-database-url" not in workflow.read_text():
    raise SystemExit("Evidence redaction was not materialized.")

run("git", "config", "user.name", "github-actions[bot]")
run(
    "git",
    "config",
    "user.email",
    "41898282+github-actions[bot]@users.noreply.github.com",
)
run("git", "add", "-A")
run("git", "commit", "-m", "Preserve baseline function-body replay semantics")
result_head = run("git", "rev-parse", "HEAD")
run("git", "push", "origin", f"HEAD:{target_branch}")
print(f"Published repaired generator head: {result_head}")
