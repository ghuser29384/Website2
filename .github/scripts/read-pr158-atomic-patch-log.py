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


def latest_failed_job(repo: str, token: str) -> int:
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
    print(f"Inspecting failed patch run {run['id']} job {jobs[0]['id']}.")
    return int(jobs[0]["id"])


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


def main() -> int:
    repo = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GH_TOKEN"]
    job_id = latest_failed_job(repo, token)
    raw = sanitize(download(repo, token, job_id))
    lines = raw.splitlines()
    failure_indexes = [
        i
        for i, line in enumerate(lines)
        if re.search(
            r"(?i)(##\[error\]|npm ERR|error:|failed|failure|AssertionError|TypeError|SyntaxError)",
            line,
        )
    ]
    index = failure_indexes[-1] if failure_indexes else max(0, len(lines) - 120)
    lo = max(0, index - 160)
    hi = min(len(lines), index + 160)
    print("SANITIZED_PATCH_FAILURE_BEGIN")
    print("\n".join(lines[lo:hi]))
    print("SANITIZED_PATCH_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
