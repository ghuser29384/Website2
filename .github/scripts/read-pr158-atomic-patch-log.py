#!/usr/bin/env python3
# Diagnostic refresh: inspect the latest completed failed patch run.
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

WORKFLOW_NAME = "Apply PR 158 atomic acceptance repair"
BRANCH = "ops/apply-pr158-atomic-acceptance-20260726"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def github_json(repo: str, token: str, path: str) -> dict:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-pr158-patch-log-reader",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def latest_failed_job(repo: str, token: str) -> tuple[int, int]:
    query = urllib.parse.urlencode({"branch": BRANCH, "status": "failure", "per_page": 50})
    payload = github_json(repo, token, f"/actions/runs?{query}")
    runs = [
        run
        for run in payload.get("workflow_runs", [])
        if run.get("name") == WORKFLOW_NAME and run.get("conclusion") == "failure"
    ]
    if not runs:
        raise RuntimeError("No completed failed atomic patch workflow run was found.")
    run = max(runs, key=lambda item: int(item.get("run_number", 0)))
    jobs_payload = github_json(repo, token, f"/actions/runs/{run['id']}/jobs?per_page=100")
    jobs = [job for job in jobs_payload.get("jobs", []) if job.get("name") == "patch"]
    if len(jobs) != 1:
        raise RuntimeError(f"Expected one patch job for run {run['id']}; found {len(jobs)}.")
    return int(run["id"]), int(jobs[0]["id"])


def download(repo: str, token: str, job_id: int) -> str:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/actions/jobs/{job_id}/logs",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-pr158-patch-log-reader",
        },
    )
    opener = urllib.request.build_opener(NoRedirect)
    try:
        response = opener.open(req, timeout=30)
        content = response.read()
    except urllib.error.HTTPError as error:
        if error.code not in {301, 302, 303, 307, 308}:
            raise
        location = error.headers.get("Location")
        if not location:
            raise RuntimeError("GitHub log redirect omitted Location") from error
        with urllib.request.urlopen(
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-pr158-patch-log-reader"}),
            timeout=30,
        ) as redirected:
            content = redirected.read()
    return content.decode("utf-8", errors="replace")


def sanitize(text: str) -> str:
    text = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", text)
    patterns = (
        (re.compile(r"(?i)\b(?:postgres|postgresql)://\S+"), "[REDACTED_DATABASE_URL]"),
        (re.compile(r"\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+"), "[REDACTED_SUPABASE_KEY]"),
        (re.compile(r"\bvcp_[A-Za-z0-9_-]+"), "[REDACTED_VERCEL_TOKEN]"),
        (re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"), "[REDACTED_JWT]"),
    )
    for pattern, replacement in patterns:
        text = pattern.sub(replacement, text)
    return text


def concise_failure_summary(lines: list[str]) -> list[str]:
    summary: list[str] = []
    test_markers = [i for i, line in enumerate(lines) if "✖ " in line]
    for ordinal, marker in enumerate(test_markers, start=1):
        upper = test_markers[ordinal] if ordinal < len(test_markers) else min(len(lines), marker + 250)
        block = lines[marker:upper]
        summary.append(f"--- FAILURE {ordinal} ---")
        summary.append(lines[marker])
        for line in block:
            if (
                "AssertionError" in line
                or "TypeError" in line
                or "SyntaxError" in line
                or "ReferenceError" in line
                or " at TestContext" in line
                or " expected:" in line
                or " operator:" in line
            ):
                summary.append(line)
    if summary:
        return summary

    failure_indexes = [
        i
        for i, line in enumerate(lines)
        if re.search(
            r"(?i)(##\[error\]|npm ERR|error:|failed|failure|AssertionError|TypeError|SyntaxError)",
            line,
        )
    ]
    index = failure_indexes[-1] if failure_indexes else max(0, len(lines) - 120)
    return lines[max(0, index - 160) : min(len(lines), index + 160)]


def main() -> int:
    repo = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GH_TOKEN"]
    run_id, job_id = latest_failed_job(repo, token)
    raw = sanitize(download(repo, token, job_id))
    lines = raw.splitlines()
    print(f"Inspecting failed patch run {run_id} job {job_id}.")
    print("SANITIZED_PATCH_FAILURE_BEGIN")
    print("\n".join(concise_failure_summary(lines)))
    print("SANITIZED_PATCH_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
