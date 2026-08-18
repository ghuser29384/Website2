#!/usr/bin/env python3
"""Complete the bounded PR #757 production repair with immutable evidence.

This controller is intentionally one-shot and fail-closed. It only runs from the
checked-in workflow on main, verifies the reviewed repair is in the main lineage,
avoids duplicate production releases, uses the repository's Gated Vercel release
when production does not already contain the repair, runs authenticated canonical
Create UAT, proves cleanup of the exact run-owned fixture, inspects scoped runtime
logs, and publishes durable evidence.
"""

from __future__ import annotations

import datetime as dt
import json
import logging
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Iterable

REPOSITORY = "ghuser29384/Website2"
REPAIR_MERGE_SHA = "f9ae5480ae7c20176f24c5f8b678088b5823fc39"
CONTROLLER_WORKFLOW = ".github/workflows/pr757-production-repair-completion-20260818.yml"
CONTROLLER_SCRIPT = ".github/scripts/pr757-production-repair-completion-20260818.py"
EXPECTED_CONTROLLER_FILES = {CONTROLLER_WORKFLOW, CONTROLLER_SCRIPT}
RELEASE_WORKFLOW = "vercel-release.yml"
HARNESS_BRANCH = "ops/pr727-production-create-uat-final-20260817"
HARNESS_FILES = (
    "create-production-uat.mjs",
    "create-production-uat-fixture.sql",
    "create-production-uat-cleanup.sql",
)
VERCEL_ORG_ID = "team_ySu6sF3Uho1E1GnJtCQPVEuJ"
VERCEL_PROJECT_ID = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
VERCEL_CLI_VERSION = "50.38.1"
SUPABASE_REF = "jnpoxvalyjtdghnperyu"
CANONICAL_ALIASES = ("moraltrade.org", "www.moraltrade.org")
STALE_BRANCH_PREFIXES = (
    "ops/pr757-production-completion-controller-20260818",
    "ops/pr757-production-completion-20260818",
)
STALE_BRANCH_EXACT = {
    "probe/noop-do-not-create",
    "ops/pr757-production-release-dispatch-20260818",
    "ops/pr757-exact-release-controller-pr-20260818",
}


class ControllerError(RuntimeError):
    pass


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso(value: dt.datetime | None = None) -> str:
    return (value or utc_now()).isoformat().replace("+00:00", "Z")


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ControllerError(f"Required environment value is missing: {name}")
    return value


GITHUB_WORKSPACE = Path(require_env("GITHUB_WORKSPACE")).resolve()
RUNNER_TEMP = Path(require_env("RUNNER_TEMP")).resolve()
GITHUB_SHA = require_env("GITHUB_SHA")
GITHUB_RUN_ID = require_env("GITHUB_RUN_ID")
GITHUB_RUN_ATTEMPT = require_env("GITHUB_RUN_ATTEMPT")
GITHUB_SERVER_URL = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
GH_TOKEN = require_env("GH_TOKEN")
VERCEL_TOKEN = require_env("VERCEL_TOKEN_VALUE")
PROD_DB_URL = require_env("PROD_SUPABASE_DB_URL")
OUTPUT_DIR = GITHUB_WORKSPACE / "create-mobile-transition-production-completion"
TARGET_SOURCE = RUNNER_TEMP / "pr757-production-target-source"
HARNESS_DIR = RUNNER_TEMP / "pr757-production-uat-harness"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for secret_value in (GH_TOKEN, VERCEL_TOKEN, PROD_DB_URL):
    print(f"::add-mask::{secret_value}")

logger = logging.getLogger("pr757-production-completion")
logger.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)sZ %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S")
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(formatter)
file_handler = logging.FileHandler(OUTPUT_DIR / "controller.log", encoding="utf-8")
file_handler.setFormatter(formatter)
logger.handlers[:] = [stream_handler, file_handler]


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int | None = None,
    check: bool = True,
    text: bool = True,
    stdout_path: Path | None = None,
    stderr_path: Path | None = None,
) -> subprocess.CompletedProcess[str] | subprocess.CompletedProcess[bytes]:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    logger.info("run: %s", " ".join(command))
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        env=merged_env,
        timeout=timeout,
        check=False,
        capture_output=True,
        text=text,
    )
    if stdout_path is not None:
        stdout_path.parent.mkdir(parents=True, exist_ok=True)
        data = result.stdout if isinstance(result.stdout, (str, bytes)) else ""
        if isinstance(data, bytes):
            stdout_path.write_bytes(data)
        else:
            stdout_path.write_text(data, encoding="utf-8")
    if stderr_path is not None:
        stderr_path.parent.mkdir(parents=True, exist_ok=True)
        data = result.stderr if isinstance(result.stderr, (str, bytes)) else ""
        if isinstance(data, bytes):
            stderr_path.write_bytes(data)
        else:
            stderr_path.write_text(data, encoding="utf-8")
    if check and result.returncode != 0:
        stderr = result.stderr.decode("utf-8", "replace") if isinstance(result.stderr, bytes) else result.stderr
        tail = (stderr or "")[-4000:]
        raise ControllerError(
            f"Command failed with exit {result.returncode}: {' '.join(command)}\n{tail}"
        )
    return result


def git(*arguments: str, cwd: Path = GITHUB_WORKSPACE, check: bool = True) -> str:
    result = run(["git", *arguments], cwd=cwd, check=check)
    assert isinstance(result.stdout, str)
    return result.stdout.strip()


def github_request(
    path: str,
    *,
    method: str = "GET",
    payload: Any | None = None,
    allow_not_found: bool = False,
) -> Any:
    url = path if path.startswith("https://") else f"https://api.github.com/{path.lstrip('/')}"
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moral-trade-pr757-production-controller",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read()
            if not body:
                return None
            return json.loads(body)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        if allow_not_found and error.code == 404:
            return None
        raise ControllerError(
            f"GitHub API {method} {url} failed with {error.code}: {body[-2000:]}"
        ) from error


def vercel_request(path: str) -> Any:
    url = path if path.startswith("https://") else f"https://api.vercel.com/{path.lstrip('/')}"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {VERCEL_TOKEN}",
            "Accept": "application/json",
            "User-Agent": "moral-trade-pr757-production-controller",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        raise ControllerError(f"Vercel API GET {url} failed with {error.code}: {body[-2000:]}") from error


def ensure_commit(sha: str) -> None:
    probe = run(["git", "cat-file", "-e", f"{sha}^{{commit}}"], cwd=GITHUB_WORKSPACE, check=False)
    if probe.returncode == 0:
        return
    run(["git", "fetch", "--no-tags", "origin", sha], cwd=GITHUB_WORKSPACE, timeout=180)
    run(["git", "cat-file", "-e", f"{sha}^{{commit}}"], cwd=GITHUB_WORKSPACE)


def is_ancestor(ancestor: str, descendant: str) -> bool:
    ensure_commit(ancestor)
    ensure_commit(descendant)
    result = run(
        ["git", "merge-base", "--is-ancestor", ancestor, descendant],
        cwd=GITHUB_WORKSPACE,
        check=False,
    )
    return result.returncode == 0


def sanitize_deployment(detail: dict[str, Any], aliases: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": detail.get("id") or detail.get("uid"),
        "url": detail.get("url"),
        "projectId": detail.get("projectId") or (detail.get("project") or {}).get("id"),
        "readyState": detail.get("readyState") or detail.get("state"),
        "target": detail.get("target"),
        "aliasError": detail.get("aliasError"),
        "github": {
            "org": (detail.get("meta") or {}).get("githubCommitOrg"),
            "repo": (detail.get("meta") or {}).get("githubCommitRepo"),
            "sha": (detail.get("meta") or {}).get("githubCommitSha"),
        },
        "aliases": {
            name: {
                "alias": value.get("alias"),
                "projectId": value.get("projectId"),
                "deploymentId": value.get("deploymentId")
                or (value.get("deployment") or {}).get("id")
                or (value.get("deployment") or {}).get("uid"),
            }
            for name, value in aliases.items()
        },
        "observedAt": iso(),
    }


def resolve_production(
    expected_sha: str | None = None,
    *,
    attempts: int = 40,
    delay_seconds: int = 15,
    evidence_name: str | None = None,
) -> dict[str, Any]:
    last_error = "No observation attempted."
    for attempt in range(1, attempts + 1):
        try:
            aliases: dict[str, dict[str, Any]] = {}
            deployment_ids: set[str] = set()
            for alias_name in CANONICAL_ALIASES:
                encoded = urllib.parse.quote(alias_name, safe="")
                alias = vercel_request(
                    f"v4/aliases/{encoded}?projectId={VERCEL_PROJECT_ID}&teamId={VERCEL_ORG_ID}"
                )
                deployment_id = (
                    alias.get("deploymentId")
                    or (alias.get("deployment") or {}).get("id")
                    or (alias.get("deployment") or {}).get("uid")
                )
                if alias.get("alias") != alias_name:
                    raise ControllerError(f"Alias API returned the wrong alias for {alias_name}.")
                if alias.get("projectId") != VERCEL_PROJECT_ID:
                    raise ControllerError(f"Alias {alias_name} is attached to an unexpected project.")
                if not deployment_id:
                    raise ControllerError(f"Alias {alias_name} has no deployment ID.")
                aliases[alias_name] = alias
                deployment_ids.add(str(deployment_id))
            if len(deployment_ids) != 1:
                raise ControllerError("Canonical aliases do not resolve to the same deployment.")
            deployment_id = next(iter(deployment_ids))
            detail = vercel_request(f"v13/deployments/{deployment_id}?teamId={VERCEL_ORG_ID}")
            resolved_id = str(detail.get("id") or detail.get("uid") or "")
            project_id = detail.get("projectId") or (detail.get("project") or {}).get("id")
            state = detail.get("readyState") or detail.get("state")
            metadata = detail.get("meta") or {}
            resolved_sha = str(metadata.get("githubCommitSha") or "")
            if resolved_id != deployment_id:
                raise ControllerError("Deployment detail returned a mismatched deployment ID.")
            if project_id != VERCEL_PROJECT_ID or detail.get("target") != "production":
                raise ControllerError("Canonical deployment is not Moral Trade production.")
            if state != "READY" or detail.get("aliasError") is not None:
                raise ControllerError("Canonical production deployment is not READY and alias-clean.")
            if metadata.get("githubCommitOrg") != "ghuser29384" or metadata.get("githubCommitRepo") != "Website2":
                raise ControllerError("Deployment GitHub provenance is not the canonical repository.")
            if not re.fullmatch(r"[0-9a-f]{40}", resolved_sha):
                raise ControllerError("Deployment GitHub SHA is missing or malformed.")
            if expected_sha and resolved_sha != expected_sha:
                raise ControllerError(
                    f"Production serves {resolved_sha}, not requested exact SHA {expected_sha}."
                )
            sanitized = sanitize_deployment(detail, aliases)
            if evidence_name:
                write_json(OUTPUT_DIR / evidence_name, sanitized)
            return sanitized
        except Exception as error:  # bounded retry around eventually consistent aliases
            last_error = str(error)
            logger.info(
                "production resolution attempt %s/%s not ready: %s",
                attempt,
                attempts,
                last_error,
            )
            if attempt < attempts:
                time.sleep(delay_seconds)
    raise ControllerError(f"Could not resolve canonical production: {last_error}")


def workflow_run_matches(run_detail: dict[str, Any], target_sha: str) -> bool:
    inputs = run_detail.get("inputs") or {}
    if run_detail.get("event") != "workflow_dispatch":
        return False
    if run_detail.get("head_branch") != "main" or run_detail.get("head_sha") != target_sha:
        return False
    if inputs:
        return (
            inputs.get("target") == "production"
            and inputs.get("ref") == "main"
            and inputs.get("expected_sha") == target_sha
            and (inputs.get("synthetic_auth_fixture_url") or "") == ""
        )
    return False


def recent_release_runs(workflow_id: int) -> list[dict[str, Any]]:
    listing = github_request(
        f"repos/{REPOSITORY}/actions/workflows/{workflow_id}/runs?event=workflow_dispatch&per_page=50"
    )
    return list((listing or {}).get("workflow_runs") or [])


def wait_for_run(run_id: int, *, timeout_seconds: int = 9000) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        detail = github_request(f"repos/{REPOSITORY}/actions/runs/{run_id}")
        status = detail.get("status")
        logger.info("Gated release run %s status=%s conclusion=%s", run_id, status, detail.get("conclusion"))
        if status == "completed":
            return detail
        time.sleep(20)
    raise ControllerError(f"Timed out waiting for Gated Vercel release run {run_id}.")


def current_remote_main() -> str:
    output = git("ls-remote", "origin", "refs/heads/main")
    sha = output.split()[0] if output else ""
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ControllerError("Could not resolve a valid remote main SHA.")
    return sha


def resolve_or_release(initial: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    deployed_sha = initial["github"]["sha"]
    ensure_commit(deployed_sha)
    if is_ancestor(REPAIR_MERGE_SHA, deployed_sha):
        logger.info("Production already contains the reviewed repair at %s; no release required.", deployed_sha)
        return deployed_sha, {
            "required": False,
            "reason": "Canonical production already contains PR #757 or a descendant.",
            "runId": None,
            "targetSha": deployed_sha,
            "observedAt": iso(),
        }
    if not is_ancestor(deployed_sha, GITHUB_SHA):
        raise ControllerError(
            "Production does not contain the repair and is not an ancestor of the controller main commit."
        )

    workflow = github_request(f"repos/{REPOSITORY}/actions/workflows/{RELEASE_WORKFLOW}")
    if workflow.get("state") != "active":
        raise ControllerError("The checked-in Gated Vercel release workflow is not active.")
    workflow_id = int(workflow["id"])

    for release_cycle in range(1, 4):
        target_sha = current_remote_main()
        ensure_commit(target_sha)
        if not is_ancestor(GITHUB_SHA, target_sha):
            raise ControllerError("Remote main no longer descends from the audited controller commit.")
        if not is_ancestor(REPAIR_MERGE_SHA, target_sha):
            raise ControllerError("Latest main does not contain the reviewed PR #757 repair.")

        # Wait for any other production release to leave the shared concurrency lane.
        conflict_deadline = time.monotonic() + 5400
        adopted_run_id: int | None = None
        while True:
            active_conflict = False
            exact_active: int | None = None
            exact_completed_success: int | None = None
            for summary in recent_release_runs(workflow_id):
                run_id = int(summary["id"])
                detail = github_request(f"repos/{REPOSITORY}/actions/runs/{run_id}")
                if workflow_run_matches(detail, target_sha):
                    if detail.get("status") == "completed" and detail.get("conclusion") == "success":
                        exact_completed_success = run_id
                        break
                    if detail.get("status") != "completed":
                        exact_active = run_id
                        break
                elif detail.get("status") != "completed":
                    active_conflict = True
            if exact_completed_success is not None:
                adopted_run_id = exact_completed_success
                break
            if exact_active is not None:
                adopted_run_id = exact_active
                break
            if active_conflict:
                if time.monotonic() >= conflict_deadline:
                    raise ControllerError("A conflicting Gated Vercel release did not clear within 90 minutes.")
                logger.info("Waiting for a conflicting gated release before dispatching PR #757 completion.")
                time.sleep(20)
                refreshed = resolve_production(attempts=2, delay_seconds=5)
                refreshed_sha = refreshed["github"]["sha"]
                ensure_commit(refreshed_sha)
                if is_ancestor(REPAIR_MERGE_SHA, refreshed_sha):
                    return refreshed_sha, {
                        "required": False,
                        "reason": "A concurrent guarded release placed the repair in production.",
                        "runId": None,
                        "targetSha": refreshed_sha,
                        "observedAt": iso(),
                    }
                continue
            break

        if adopted_run_id is None:
            if current_remote_main() != target_sha:
                logger.info("Main advanced before dispatch; retrying with the new exact main.")
                continue
            before_ids = {int(item["id"]) for item in recent_release_runs(workflow_id)}
            dispatch_time = utc_now()
            github_request(
                f"repos/{REPOSITORY}/actions/workflows/{workflow_id}/dispatches",
                method="POST",
                payload={
                    "ref": "main",
                    "inputs": {
                        "target": "production",
                        "ref": "main",
                        "expected_sha": target_sha,
                        "synthetic_auth_fixture_url": "",
                    },
                },
            )
            logger.info("Dispatched Gated Vercel release for exact main %s", target_sha)
            discovery_deadline = time.monotonic() + 300
            while time.monotonic() < discovery_deadline and adopted_run_id is None:
                for summary in recent_release_runs(workflow_id):
                    run_id = int(summary["id"])
                    if run_id in before_ids:
                        continue
                    detail = github_request(f"repos/{REPOSITORY}/actions/runs/{run_id}")
                    created = str(detail.get("created_at") or "")
                    if (
                        detail.get("event") == "workflow_dispatch"
                        and detail.get("head_branch") == "main"
                        and detail.get("head_sha") == target_sha
                        and created >= dispatch_time.isoformat().replace("+00:00", "Z")
                    ):
                        adopted_run_id = run_id
                        break
                if adopted_run_id is None:
                    time.sleep(5)
            if adopted_run_id is None:
                raise ControllerError("The exact dispatched Gated Vercel release run could not be identified.")

        detail = wait_for_run(adopted_run_id)
        sanitized = {
            key: detail.get(key)
            for key in (
                "id",
                "name",
                "event",
                "status",
                "conclusion",
                "head_branch",
                "head_sha",
                "created_at",
                "updated_at",
                "html_url",
                "inputs",
            )
        }
        write_json(OUTPUT_DIR / "release-workflow.json", sanitized)
        if detail.get("conclusion") == "success":
            artifacts = github_request(f"repos/{REPOSITORY}/actions/runs/{adopted_run_id}/artifacts")
            write_json(OUTPUT_DIR / "release-workflow-artifacts.json", artifacts or {})
            return target_sha, {
                "required": True,
                "reason": "Production did not contain the repair; the checked-in gated release succeeded.",
                "runId": adopted_run_id,
                "targetSha": target_sha,
                "runUrl": detail.get("html_url"),
                "observedAt": iso(),
            }

        latest_main = current_remote_main()
        if latest_main != target_sha and is_ancestor(target_sha, latest_main):
            logger.info(
                "Exact release %s failed after main advanced to %s; retry cycle %s/3.",
                target_sha,
                latest_main,
                release_cycle,
            )
            continue
        raise ControllerError(
            f"Gated Vercel release run {adopted_run_id} concluded {detail.get('conclusion')}."
        )
    raise ControllerError("Main advanced through all three bounded release retries.")


def materialize_target_source(target_sha: str) -> tuple[Path, Path, str]:
    if TARGET_SOURCE.exists():
        run(["git", "worktree", "remove", "--force", str(TARGET_SOURCE)], cwd=GITHUB_WORKSPACE, check=False)
        shutil.rmtree(TARGET_SOURCE, ignore_errors=True)
    run(["git", "worktree", "add", "--force", "--detach", str(TARGET_SOURCE), target_sha], cwd=GITHUB_WORKSPACE)

    HARNESS_DIR.mkdir(parents=True, exist_ok=True)
    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "origin",
            f"refs/heads/{HARNESS_BRANCH}:refs/remotes/origin/{HARNESS_BRANCH}",
        ],
        cwd=GITHUB_WORKSPACE,
        timeout=180,
    )
    harness_sha = git("rev-parse", f"refs/remotes/origin/{HARNESS_BRANCH}")
    for filename in HARNESS_FILES:
        result = run(
            [
                "git",
                "show",
                f"{harness_sha}:.github/scripts/{filename}",
            ],
            cwd=GITHUB_WORKSPACE,
            text=False,
        )
        assert isinstance(result.stdout, bytes)
        (HARNESS_DIR / filename).write_bytes(result.stdout)
    run(["node", "--check", str(HARNESS_DIR / "create-production-uat.mjs")])
    harness_source = (HARNESS_DIR / "create-production-uat.mjs").read_text(encoding="utf-8")
    for marker in ("transitionGeometry", "mobile-390x844", "1644x900"):
        if marker not in harness_source:
            raise ControllerError(f"Proven production UAT harness is missing marker: {marker}")
    cleanup_source = (HARNESS_DIR / "create-production-uat-cleanup.sql").read_text(encoding="utf-8")
    for marker in ("auth.sessions", "auth.refresh_tokens", "auth.identities", "auth.users"):
        if marker not in cleanup_source:
            raise ControllerError(f"Cleanup harness is missing exact-scope marker: {marker}")
    write_json(
        OUTPUT_DIR / "harness-source.json",
        {
            "branch": HARNESS_BRANCH,
            "sha": harness_sha,
            "files": list(HARNESS_FILES),
            "materializedAt": iso(),
        },
    )
    return TARGET_SOURCE, HARNESS_DIR, harness_sha


def install_uat_dependencies(source: Path) -> None:
    run(["npm", "ci"], cwd=source, timeout=1200)
    run(["npx", "playwright", "install", "--with-deps", "chromium"], cwd=source, timeout=1200)
    run(["sudo", "apt-get", "update", "-qq"], timeout=600)
    run(
        ["sudo", "apt-get", "install", "--yes", "postgresql-client", "jq", "curl"],
        timeout=600,
    )


def parse_public_supabase_config(source: Path) -> tuple[str, str]:
    config_path = source / "src/lib/supabase/config.ts"
    text = config_path.read_text(encoding="utf-8")
    url_match = re.search(
        r'DEFAULT_PUBLIC_SUPABASE_URL\s*=\s*"([^"]+)"',
        text,
    )
    key_match = re.search(
        r'DEFAULT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*=\s*(?:\n\s*)?"([^"]+)"',
        text,
    )
    if not url_match or not key_match:
        raise ControllerError("Could not parse exact public Supabase defaults from deployed source.")
    public_url, public_key = url_match.group(1), key_match.group(1)
    observed_ref = (urllib.parse.urlparse(public_url).hostname or "").split(".")[0]
    if observed_ref != SUPABASE_REF:
        raise ControllerError("Public Supabase configuration is not the Moral Trade production project.")
    print(f"::add-mask::{public_key}")
    return public_url, public_key


def validate_database_boundary() -> None:
    parsed = urllib.parse.urlparse(PROD_DB_URL)
    query = urllib.parse.parse_qs(parsed.query)
    valid = (
        parsed.scheme in {"postgres", "postgresql"}
        and bool(parsed.password)
        and parsed.path == "/postgres"
        and (
            SUPABASE_REF in (parsed.username or "")
            or SUPABASE_REF in (parsed.hostname or "")
            or query.get("project", [""])[0] == SUPABASE_REF
        )
    )
    if not valid:
        raise ControllerError("Refusing a database URL outside exact Moral Trade production.")
    probe = run(
        [
            "psql",
            PROD_DB_URL,
            "--no-psqlrc",
            "-Atv",
            "ON_ERROR_STOP=1",
            "-c",
            "select to_regclass('auth.users') is not null and "
            "to_regclass('auth.identities') is not null and "
            "to_regclass('public.profiles') is not null;",
        ],
        env={"PGCONNECT_TIMEOUT": "15", "PGSSLMODE": "require"},
        timeout=60,
    )
    assert isinstance(probe.stdout, str)
    if probe.stdout.strip() != "t":
        raise ControllerError("Production database boundary probe did not pass.")


def parse_log_timestamp(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        seconds = float(value)
        if seconds > 10_000_000_000:
            seconds /= 1000.0
        return dt.datetime.fromtimestamp(seconds, tz=dt.timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    if re.fullmatch(r"\d+(?:\.\d+)?", text):
        return parse_log_timestamp(float(text))
    try:
        return dt.datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    except ValueError:
        return None


def nested(value: dict[str, Any], path: Iterable[str]) -> Any:
    current: Any = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def inspect_runtime_logs(
    source: Path,
    deployment_host: str,
    started_at: dt.datetime,
    completed_at: dt.datetime,
) -> dict[str, Any]:
    vercel_dir = source / ".vercel"
    vercel_dir.mkdir(exist_ok=True)
    write_json(vercel_dir / "project.json", {"orgId": VERCEL_ORG_ID, "projectId": VERCEL_PROJECT_ID})
    help_result = run(
        ["npx", "--yes", f"vercel@{VERCEL_CLI_VERSION}", "logs", "--help"],
        cwd=source,
        timeout=180,
    )
    assert isinstance(help_result.stdout, str)
    help_text = help_result.stdout
    if "--json" not in help_text:
        raise ControllerError("Pinned Vercel CLI does not expose JSON runtime logs.")
    command = [
        "npx",
        "--yes",
        f"vercel@{VERCEL_CLI_VERSION}",
        "logs",
        f"https://{deployment_host}",
        "--json",
        "--token",
        VERCEL_TOKEN,
    ]
    if "--since" in help_text:
        command.extend(["--since", "1h"])
    if "--limit" in help_text:
        command.extend(["--limit", "1000"])
    result = run(
        command,
        cwd=source,
        timeout=180,
        check=False,
        stdout_path=OUTPUT_DIR / "runtime-logs.jsonl",
        stderr_path=OUTPUT_DIR / "runtime-logs.stderr.log",
    )
    stderr = result.stderr if isinstance(result.stderr, str) else result.stderr.decode("utf-8", "replace")
    no_logs = bool(re.search(r"no\s+(runtime\s+)?logs?\s+found", stderr or "", re.I))
    if result.returncode != 0 and not no_logs:
        raise ControllerError(f"Pinned Vercel runtime-log command failed: {(stderr or '')[-2000:]}")

    lower_bound = started_at - dt.timedelta(minutes=2)
    upper_bound = completed_at + dt.timedelta(minutes=2)
    events_in_window: list[dict[str, Any]] = []
    unparsed_lines = 0
    raw_path = OUTPUT_DIR / "runtime-logs.jsonl"
    if raw_path.exists():
        for raw_line in raw_path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                unparsed_lines += 1
                continue
            timestamp = None
            for candidate in (
                event.get("timestamp"),
                event.get("createdAt"),
                event.get("date"),
                event.get("time"),
                nested(event, ("payload", "timestamp")),
            ):
                timestamp = parse_log_timestamp(candidate)
                if timestamp is not None:
                    break
            if timestamp is None or not (lower_bound <= timestamp <= upper_bound):
                continue
            message = str(
                event.get("message")
                or event.get("text")
                or nested(event, ("payload", "text"))
                or nested(event, ("proxy", "message"))
                or ""
            )
            level = str(event.get("level") or event.get("severity") or event.get("type") or "").lower()
            path = str(
                event.get("path")
                or nested(event, ("request", "path"))
                or nested(event, ("proxy", "path"))
                or ""
            )
            error_like = level in {"error", "fatal", "critical"} or bool(
                re.search(
                    r"uncaught|unhandled|internal server error|function_invocation_failed|\b5\d\d\b",
                    message,
                    re.I,
                )
            )
            if re.search(r"NEXT_REDIRECT|AbortError: The user aborted", message):
                error_like = False
            events_in_window.append(
                {
                    "timestamp": iso(timestamp),
                    "level": level,
                    "path": path,
                    "message": message[:2000],
                    "errorLike": error_like,
                }
            )
    error_events = [event for event in events_in_window if event["errorLike"]]
    summary = {
        "commandExitCode": result.returncode,
        "noLogsFound": no_logs,
        "uatWindow": {"startedAt": iso(started_at), "completedAt": iso(completed_at)},
        "eventsInWindow": len(events_in_window),
        "runtimeRelevantErrorLines": len(error_events),
        "unparsedLines": unparsed_lines,
        "errorEvents": error_events,
        "inspectedAt": iso(),
    }
    write_json(OUTPUT_DIR / "runtime-log-scan.json", summary)
    if error_events:
        raise ControllerError(f"Scoped production runtime logs contain {len(error_events)} relevant errors.")
    return summary


def scan_for_secret_leaks(password: str) -> None:
    needles = [PROD_DB_URL, password]
    leaked: list[str] = []
    for path in OUTPUT_DIR.rglob("*"):
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if any(needle and needle in text for needle in needles):
            leaked.append(str(path.relative_to(OUTPUT_DIR)))
    if leaked:
        raise ControllerError(f"Credential material appeared in evidence files: {leaked}")


def close_stale_prs_and_delete_branches() -> dict[str, Any]:
    result: dict[str, Any] = {
        "closedPullRequests": [],
        "deletedBranches": [],
        "branchDeletionFailures": [],
        "workflowDisabled": False,
    }
    pulls = github_request(f"repos/{REPOSITORY}/pulls?state=open&per_page=100") or []
    for pull in pulls:
        head_ref = str((pull.get("head") or {}).get("ref") or "")
        number = int(pull.get("number") or 0)
        if number == 0:
            continue
        stale = head_ref in STALE_BRANCH_EXACT or any(
            head_ref.startswith(prefix) for prefix in STALE_BRANCH_PREFIXES
        )
        if not stale:
            continue
        github_request(
            f"repos/{REPOSITORY}/pulls/{number}",
            method="PATCH",
            payload={"state": "closed"},
        )
        result["closedPullRequests"].append(number)

    page = 1
    branch_names: list[str] = []
    while True:
        branches = github_request(f"repos/{REPOSITORY}/branches?per_page=100&page={page}") or []
        branch_names.extend(str(item.get("name") or "") for item in branches)
        if len(branches) < 100:
            break
        page += 1
    for branch in sorted(set(branch_names)):
        stale = branch in STALE_BRANCH_EXACT or any(
            branch.startswith(prefix) for prefix in STALE_BRANCH_PREFIXES
        )
        if not stale or branch == "main":
            continue
        encoded_ref = urllib.parse.quote(f"heads/{branch}", safe="")
        try:
            github_request(
                f"repos/{REPOSITORY}/git/refs/{encoded_ref}",
                method="DELETE",
                allow_not_found=True,
            )
            result["deletedBranches"].append(branch)
        except Exception as error:
            result["branchDeletionFailures"].append({"branch": branch, "error": str(error)})

    workflow_filename = Path(CONTROLLER_WORKFLOW).name
    try:
        github_request(
            f"repos/{REPOSITORY}/actions/workflows/{workflow_filename}/disable",
            method="PUT",
        )
        result["workflowDisabled"] = True
    except Exception as error:
        result["workflowDisableError"] = str(error)
    result["completedAt"] = iso()
    write_json(OUTPUT_DIR / "operational-cleanup.json", result)
    return result


def post_completion_comments(
    *,
    target_sha: str,
    deployment_id: str,
    release_info: dict[str, Any],
    started_at: dt.datetime,
    completed_at: dt.datetime,
) -> list[dict[str, Any]]:
    release_text = (
        f"Gated Vercel release run `{release_info['runId']}`"
        if release_info.get("runId")
        else "no additional release run was required"
    )
    run_url = f"{GITHUB_SERVER_URL}/{REPOSITORY}/actions/runs/{GITHUB_RUN_ID}"
    body = (
        "Production completion evidence for the bounded Create mobile transition repair: "
        f"canonical production serves exact Git SHA `{target_sha}` on READY deployment "
        f"`{deployment_id}`; {release_text}. Authenticated canonical Create UAT passed on "
        "both `www.moraltrade.org` and `moraltrade.org` at `1644×900` and `390×844`, "
        "including listed and custom cause transitions, sticky-header clearance, zero "
        "residual transition scroll, autocomplete/focus/overflow diagnostics, and the "
        "existing no-consequential-submission boundary. Scoped runtime-log inspection "
        "found zero relevant error lines. The run-owned production Auth user, identity, "
        "profile, sessions, and refresh tokens were proven absent after cleanup. "
        f"UAT interval: `{iso(started_at)}` through `{iso(completed_at)}`. Immutable run "
        f"and artifact evidence: {run_url}."
    )
    comments: list[dict[str, Any]] = []
    for issue_number in (757, 727, 741):
        try:
            response = github_request(
                f"repos/{REPOSITORY}/issues/{issue_number}/comments",
                method="POST",
                payload={"body": body},
            )
            comments.append({"issue": issue_number, "url": response.get("html_url")})
        except Exception as error:
            comments.append({"issue": issue_number, "error": str(error)})
    write_json(OUTPUT_DIR / "completion-comments.json", comments)
    return comments


def main() -> int:
    phase = "initialization"
    core_error: str | None = None
    fixture_attempted = False
    fixture_created = False
    cleanup_proven = False
    cleanup_error: str | None = None
    qa_user_id = ""
    qa_email = ""
    qa_password = ""
    qa_run_id = f"{GITHUB_RUN_ID}.{GITHUB_RUN_ATTEMPT}"
    harness_dir: Path | None = None
    public_url = ""
    public_key = ""
    target_sha = ""
    deployment: dict[str, Any] = {}
    release_info: dict[str, Any] = {}
    runtime_summary: dict[str, Any] = {}
    uat_started: dt.datetime | None = None
    uat_completed: dt.datetime | None = None

    try:
        phase = "guard-controller-and-reviewed-repair"
        if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
            raise ControllerError("Controller is running outside the canonical repository.")
        if os.environ.get("GITHUB_REF") != "refs/heads/main":
            raise ControllerError("Controller must run only from main.")
        if git("rev-parse", "HEAD") != GITHUB_SHA:
            raise ControllerError("Checked-out controller SHA differs from the event SHA.")
        parent = git("rev-parse", f"{GITHUB_SHA}^1")
        changed_files = {
            line.strip()
            for line in git("diff", "--name-only", parent, GITHUB_SHA).splitlines()
            if line.strip()
        }
        if changed_files != EXPECTED_CONTROLLER_FILES:
            raise ControllerError(
                f"Controller merge changed unexpected files: {sorted(changed_files)}"
            )
        if current_remote_main() != GITHUB_SHA:
            raise ControllerError("Remote main advanced before the one-shot controller began.")
        if not is_ancestor(REPAIR_MERGE_SHA, GITHUB_SHA):
            raise ControllerError("Controller main does not contain the reviewed PR #757 repair.")
        repair_script = (GITHUB_WORKSPACE / "public/moral-trade-create/ui-repairs.js").read_text(
            encoding="utf-8"
        )
        repair_test = (
            GITHUB_WORKSPACE / "tests/create-route-ui-regression.spec.ts"
        ).read_text(encoding="utf-8")
        for marker in (
            "function restoreRequestTopWhenVisible()",
            "new MutationObserver(restoreRequestTopWhenVisible)",
            "window.requestAnimationFrame(restoreRequestTop)",
            "window.setTimeout(restoreRequestTop, 0)",
        ):
            if marker not in repair_script:
                raise ControllerError(f"Reviewed runtime repair marker is missing: {marker}")
        if "keeps listed and custom cause transitions clear of the sticky header on mobile" not in repair_test:
            raise ControllerError("Reviewed 390×844 transition regression test is missing.")
        write_json(
            OUTPUT_DIR / "controller-source.json",
            {
                "controllerSha": GITHUB_SHA,
                "firstParent": parent,
                "changedFiles": sorted(changed_files),
                "repairMergeSha": REPAIR_MERGE_SHA,
                "guardedAt": iso(),
            },
        )

        phase = "resolve-or-release-production"
        initial = resolve_production(evidence_name="deployment-before.json")
        target_sha, release_info = resolve_or_release(initial)
        write_json(OUTPUT_DIR / "release-decision.json", release_info)
        deployment = resolve_production(
            target_sha,
            attempts=80,
            delay_seconds=15,
            evidence_name="deployment.json",
        )
        deployment_id = str(deployment["id"])
        deployment_host = str(deployment["url"])

        phase = "materialize-proven-uat-harness"
        target_source, harness_dir, _ = materialize_target_source(target_sha)
        install_uat_dependencies(target_source)
        validate_database_boundary()
        public_url, public_key = parse_public_supabase_config(target_source)
        write_json(
            OUTPUT_DIR / "environment-boundary.json",
            {
                "target": "Moral Trade production Supabase",
                "supabaseRef": SUPABASE_REF,
                "credentialSource": "MoralTrade QA protected environment",
                "secretValuesRetained": False,
                "validatedAt": iso(),
            },
        )

        phase = "create-run-owned-production-auth-fixture"
        qa_user_id = str(uuid.uuid4())
        qa_email = (
            f"create-mobile-transition-uat-{GITHUB_RUN_ID}-{GITHUB_RUN_ATTEMPT}-"
            f"{secrets.token_hex(6)}@qa.moraltrade.invalid"
        )
        qa_password = secrets.token_urlsafe(40)
        print(f"::add-mask::{qa_password}")
        fixture_env = {
            "PGCONNECT_TIMEOUT": "15",
            "PGSSLMODE": "require",
            "CREATE_UAT_USER_ID": qa_user_id,
            "CREATE_UAT_EMAIL": qa_email,
            "CREATE_UAT_PASSWORD": qa_password,
            "CREATE_UAT_RUN_ID": qa_run_id,
        }
        fixture_attempted = True
        fixture_result = run(
            [
                "psql",
                PROD_DB_URL,
                "--no-psqlrc",
                "-X",
                "-Atv",
                "ON_ERROR_STOP=1",
                "--file",
                str(harness_dir / "create-production-uat-fixture.sql"),
            ],
            env=fixture_env,
            timeout=120,
            check=False,
            stdout_path=OUTPUT_DIR / "fixture-sql.log",
            stderr_path=OUTPUT_DIR / "fixture-sql.stderr.log",
        )
        fixture_output = (OUTPUT_DIR / "fixture-sql.log").read_text(
            encoding="utf-8", errors="replace"
        )
        if fixture_result.returncode != 0 or '"fixturePassed": true' not in fixture_output:
            raise ControllerError("Run-owned production Auth fixture creation did not pass.")
        fixture_created = True
        write_json(
            OUTPUT_DIR / "fixture.json",
            {
                "userId": qa_user_id,
                "scope": "create_mobile_transition_production_uat",
                "runId": qa_run_id,
                "transactionalFixture": True,
                "createdAt": iso(),
            },
        )

        phase = "authenticated-canonical-create-uat"
        uat_started = utc_now()
        uat_env = {
            **fixture_env,
            "NEXT_PUBLIC_SUPABASE_URL": public_url,
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": public_key,
            "CREATE_UAT_EXPECTED_MAIN_SHA": target_sha,
            "CREATE_UAT_EXPECTED_DEPLOYMENT_ID": deployment_id,
            "CREATE_UAT_ORIGINS": "https://www.moraltrade.org,https://moraltrade.org",
            "CREATE_UAT_OUTPUT_DIR": str(OUTPUT_DIR),
        }
        browser_result = run(
            ["node", str(harness_dir / "create-production-uat.mjs")],
            cwd=target_source,
            env=uat_env,
            timeout=1800,
            check=False,
            stdout_path=OUTPUT_DIR / "browser.log",
            stderr_path=OUTPUT_DIR / "browser.stderr.log",
        )
        uat_completed = utc_now()
        (OUTPUT_DIR / "uat-started-at.txt").write_text(iso(uat_started) + "\n", encoding="utf-8")
        (OUTPUT_DIR / "uat-completed-at.txt").write_text(iso(uat_completed) + "\n", encoding="utf-8")
        (OUTPUT_DIR / "browser-exit-code.txt").write_text(
            f"{browser_result.returncode}\n", encoding="utf-8"
        )
        if browser_result.returncode != 0:
            raise ControllerError("Authenticated canonical production Create UAT failed.")
        for screenshot in (
            "create-production-desktop-1644x900.png",
            "create-production-mobile-390x844.png",
        ):
            path = OUTPUT_DIR / screenshot
            if not path.is_file() or path.stat().st_size == 0:
                raise ControllerError(f"Required rendered UAT screenshot is missing: {screenshot}")
        summary_path = OUTPUT_DIR / "summary.json"
        if not summary_path.is_file():
            raise ControllerError("Production UAT summary.json is missing.")
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
        if summary.get("expectedMainSha") != target_sha:
            raise ControllerError("UAT summary is not pinned to the exact deployed Git SHA.")
        if summary.get("expectedDeploymentId") != deployment_id:
            raise ControllerError("UAT summary is not pinned to the exact deployment ID.")

        phase = "scoped-runtime-log-inspection"
        runtime_summary = inspect_runtime_logs(
            target_source,
            deployment_host,
            uat_started,
            uat_completed,
        )

        phase = "post-uat-alias-reverification"
        after = resolve_production(
            target_sha,
            attempts=20,
            delay_seconds=10,
            evidence_name="deployment-after.json",
        )
        if str(after["id"]) != deployment_id:
            raise ControllerError("Canonical aliases moved to another deployment during UAT.")
        scan_for_secret_leaks(qa_password)

    except Exception as error:
        core_error = f"{type(error).__name__}: {error}"
        logger.exception("Production completion failed during phase %s", phase)
    finally:
        cleanup_observed = {
            "attempted": fixture_attempted,
            "created": fixture_created,
            "deleted": False,
            "authUserAbsent": False,
            "identityAbsent": False,
            "profileAbsent": False,
            "sessionAbsent": False,
            "refreshTokenAbsent": False,
            "exitCode": 0,
            "completedAt": iso(),
        }
        if fixture_attempted and harness_dir is not None and qa_user_id:
            try:
                cleanup_env = {
                    "PGCONNECT_TIMEOUT": "15",
                    "PGSSLMODE": "require",
                    "CREATE_UAT_USER_ID": qa_user_id,
                    "CREATE_UAT_EMAIL": qa_email,
                    "CREATE_UAT_RUN_ID": qa_run_id,
                }
                cleanup_result = run(
                    [
                        "psql",
                        PROD_DB_URL,
                        "--no-psqlrc",
                        "-X",
                        "-Atv",
                        "ON_ERROR_STOP=1",
                        "--file",
                        str(harness_dir / "create-production-uat-cleanup.sql"),
                    ],
                    env=cleanup_env,
                    timeout=120,
                    check=False,
                    stdout_path=OUTPUT_DIR / "cleanup-sql.log",
                    stderr_path=OUTPUT_DIR / "cleanup-sql.stderr.log",
                )
                cleanup_output = (OUTPUT_DIR / "cleanup-sql.log").read_text(
                    encoding="utf-8", errors="replace"
                )
                if cleanup_result.returncode != 0 or '"cleanupPassed": true' not in cleanup_output:
                    raise ControllerError("Exact run-owned fixture cleanup proof did not pass.")
                cleanup_proven = True
                cleanup_observed.update(
                    {
                        "deleted": True,
                        "authUserAbsent": True,
                        "identityAbsent": True,
                        "profileAbsent": True,
                        "sessionAbsent": True,
                        "refreshTokenAbsent": True,
                        "exitCode": 0,
                        "completedAt": iso(),
                    }
                )
            except Exception as error:
                cleanup_error = f"{type(error).__name__}: {error}"
                cleanup_observed["exitCode"] = 80
                cleanup_observed["error"] = cleanup_error
                logger.exception("Exact run-owned fixture cleanup failed")
        write_json(OUTPUT_DIR / "cleanup.json", cleanup_observed)

    passed = core_error is None and fixture_created and cleanup_proven
    operational_cleanup: dict[str, Any] = {}
    comments: list[dict[str, Any]] = []
    if passed:
        assert uat_started is not None and uat_completed is not None
        comments = post_completion_comments(
            target_sha=target_sha,
            deployment_id=str(deployment["id"]),
            release_info=release_info,
            started_at=uat_started,
            completed_at=uat_completed,
        )
        operational_cleanup = close_stale_prs_and_delete_branches()

    status = {
        "passed": passed,
        "exitCode": 0 if passed else 1,
        "phase": phase,
        "controllerSha": GITHUB_SHA,
        "repairMergeSha": REPAIR_MERGE_SHA,
        "targetSha": target_sha or None,
        "deploymentId": deployment.get("id") if deployment else None,
        "release": release_info,
        "uat": {
            "startedAt": iso(uat_started) if uat_started else None,
            "completedAt": iso(uat_completed) if uat_completed else None,
            "desktopViewport": "1644x900",
            "mobileViewport": "390x844",
            "canonicalAliases": list(CANONICAL_ALIASES),
        },
        "runtimeRelevantErrorLines": runtime_summary.get("runtimeRelevantErrorLines")
        if runtime_summary
        else None,
        "fixtureCleanup": {
            "proved": cleanup_proven,
            "authUserAbsent": cleanup_proven,
            "identityAbsent": cleanup_proven,
            "profileAbsent": cleanup_proven,
            "sessionAbsent": cleanup_proven,
            "refreshTokenAbsent": cleanup_proven,
        },
        "coreError": core_error,
        "cleanupError": cleanup_error,
        "completionComments": comments,
        "operationalCleanup": operational_cleanup,
        "workflowRun": f"{GITHUB_SERVER_URL}/{REPOSITORY}/actions/runs/{GITHUB_RUN_ID}",
        "completedAt": iso(),
    }
    write_json(OUTPUT_DIR / "status.json", status)

    if passed:
        completion = f"""# PR #757 production repair completion\n\n- Exact deployed Git SHA: `{target_sha}`\n- READY production deployment: `{deployment['id']}`\n- Gated release run: `{release_info.get('runId') or 'not required; repair was already deployed'}`\n- Canonical aliases: `moraltrade.org`, `www.moraltrade.org`\n- Authenticated UAT: desktop `1644×900`; mobile `390×844`\n- Scoped runtime errors: `{runtime_summary.get('runtimeRelevantErrorLines', 0)}`\n- Fixture cleanup: user, identity, profile, sessions, and refresh tokens all proven absent\n- Workflow evidence: {GITHUB_SERVER_URL}/{REPOSITORY}/actions/runs/{GITHUB_RUN_ID}\n"""
        (OUTPUT_DIR / "COMPLETED.md").write_text(completion, encoding="utf-8")
        (OUTPUT_DIR / "SUCCESS").write_text("passed\n", encoding="utf-8")
        logger.info("PR #757 production completion passed.")
        return 0

    blocked = f"""# PR #757 production completion blocked\n\n- Phase: `{phase}`\n- Core error: `{core_error}`\n- Cleanup error: `{cleanup_error}`\n- Workflow evidence: {GITHUB_SERVER_URL}/{REPOSITORY}/actions/runs/{GITHUB_RUN_ID}\n"""
    (OUTPUT_DIR / "BLOCKED.md").write_text(blocked, encoding="utf-8")
    logger.error("PR #757 production completion did not pass.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
