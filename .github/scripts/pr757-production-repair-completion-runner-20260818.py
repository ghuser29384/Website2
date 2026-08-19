#!/usr/bin/env python3
"""Materialize and execute the audited PR #757 completion controller.

The full controller was staged on a dedicated, unmerged source branch because the
GitHub contents API requires whole-file replacement. This runner fetches that
branch, proves its bounded two-file delta, applies only four deterministic safety
patches, records the exact source and patched digests, and then executes it.
"""

from __future__ import annotations

import hashlib
import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path

REPOSITORY = "ghuser29384/Website2"
SOURCE_BRANCH = "ops/pr757-production-completion-controller-20260818-v19"
SOURCE_WORKFLOW = ".github/workflows/pr757-production-repair-completion-20260818.yml"
SOURCE_SCRIPT = ".github/scripts/pr757-production-repair-completion-20260818.py"
TARGET_WORKFLOW = ".github/workflows/pr757-production-repair-completion-final-20260818.yml"
TARGET_RUNNER = ".github/scripts/pr757-production-repair-completion-runner-20260818.py"
EXPECTED_SOURCE_FILES = {SOURCE_WORKFLOW, SOURCE_SCRIPT}


def run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, text=True, capture_output=True, check=False)
    if check and result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(args)}\n{result.stderr[-4000:]}"
        )
    return result


def git(*args: str) -> str:
    return run("git", *args).stdout.strip()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} patch anchor; found {count}.")
    return source.replace(old, new, 1)


def main() -> None:
    workspace = Path(os.environ["GITHUB_WORKSPACE"]).resolve()
    runner_temp = Path(os.environ["RUNNER_TEMP"]).resolve()
    github_sha = os.environ["GITHUB_SHA"]
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise RuntimeError("Runner is outside the canonical repository.")
    if os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise RuntimeError("Runner must execute only from main.")
    if git("rev-parse", "HEAD") != github_sha:
        raise RuntimeError("Checked-out runner SHA differs from the event SHA.")

    run(
        "git",
        "fetch",
        "--no-tags",
        "origin",
        f"refs/heads/{SOURCE_BRANCH}:refs/remotes/origin/{SOURCE_BRANCH}",
    )
    source_head = git("rev-parse", f"refs/remotes/origin/{SOURCE_BRANCH}")
    source_base = git("merge-base", source_head, github_sha)
    source_files = {
        line.strip()
        for line in git("diff", "--name-only", source_base, source_head).splitlines()
        if line.strip()
    }
    if source_files != EXPECTED_SOURCE_FILES:
        raise RuntimeError(f"Audited source branch has unexpected files: {sorted(source_files)}")
    run("git", "diff", "--check", source_base, source_head)

    source = git("show", f"{source_head}:{SOURCE_SCRIPT}") + "\n"
    required_markers = (
        "Complete the bounded PR #757 production repair with immutable evidence.",
        "REPAIR_MERGE_SHA = \"f9ae5480ae7c20176f24c5f8b678088b5823fc39\"",
        "def resolve_or_release(initial:",
        "def inspect_runtime_logs(",
        "def close_stale_prs_and_delete_branches(",
        "create-production-uat-cleanup.sql",
    )
    for marker in required_markers:
        if marker not in source:
            raise RuntimeError(f"Audited controller source is missing marker: {marker}")

    patched = replace_once(
        source,
        f'CONTROLLER_WORKFLOW = "{SOURCE_WORKFLOW}"',
        f'CONTROLLER_WORKFLOW = "{TARGET_WORKFLOW}"',
        "controller workflow path",
    )
    patched = replace_once(
        patched,
        f'CONTROLLER_SCRIPT = "{SOURCE_SCRIPT}"',
        f'CONTROLLER_SCRIPT = "{TARGET_RUNNER}"',
        "controller script path",
    )
    patched = replace_once(
        patched,
        '    logger.info("run: %s", " ".join(command))',
        '''    rendered_command = " ".join(command)\n    for secret_value in (GH_TOKEN, VERCEL_TOKEN, PROD_DB_URL):\n        if secret_value:\n            rendered_command = rendered_command.replace(secret_value, "<redacted>")\n    logger.info("run: %s", rendered_command)''',
        "secret-redacted command logging",
    )
    patched = replace_once(
        patched,
        "    needles = [PROD_DB_URL, password]",
        "    needles = [PROD_DB_URL, VERCEL_TOKEN, GH_TOKEN, password]",
        "complete evidence secret scan",
    )

    materialized = runner_temp / "pr757-production-repair-completion-materialized.py"
    materialized.write_text(patched, encoding="utf-8")
    py_compile.compile(str(materialized), doraise=True)

    output_dir = workspace / "create-mobile-transition-production-completion"
    output_dir.mkdir(parents=True, exist_ok=True)
    provenance = {
        "sourceBranch": SOURCE_BRANCH,
        "sourceHead": source_head,
        "sourceBase": source_base,
        "sourceFiles": sorted(source_files),
        "sourceSha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
        "patchedSha256": hashlib.sha256(patched.encode("utf-8")).hexdigest(),
        "patches": [
            "controller workflow path",
            "controller script path",
            "secret-redacted command logging",
            "complete evidence secret scan",
        ],
    }
    (output_dir / "controller-materialization.json").write_text(
        json.dumps(provenance, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    environment = os.environ.copy()
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    os.execve(sys.executable, [sys.executable, str(materialized)], environment)


if __name__ == "__main__":
    main()
