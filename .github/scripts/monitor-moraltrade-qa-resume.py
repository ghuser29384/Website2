#!/usr/bin/env python3

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

EXPECTED_SHA = "c3157809f4ef8fc788e78a27ff730226174714ba"
WORKFLOW_FILE = "resume-moraltrade-qa-bootstrap.yml"
BRANCH = "agent/dynamic-marketplace-clearing-rounds"


def api(repo: str, token: str, path: str):
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-qa-resume-monitor",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def download(repo: str, token: str, path: str) -> str:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-qa-resume-monitor",
        },
    )
    opener = urllib.request.build_opener(NoRedirect)
    try:
        response = opener.open(request, timeout=30)
        content = response.read()
    except urllib.error.HTTPError as error:
        if error.code not in {301, 302, 303, 307, 308}:
            raise
        location = error.headers.get("Location")
        if not location:
            raise RuntimeError("GitHub log redirect omitted Location") from error
        with urllib.request.urlopen(
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-qa-resume-monitor"}),
            timeout=30,
        ) as redirected:
            content = redirected.read()
    return content.decode("utf-8", errors="replace")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def sanitize(text: str) -> str:
    text = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", text)
    patterns = (
        (re.compile(r"(?i)\b(?:postgres|postgresql)://\S+"), "[REDACTED_DATABASE_URL]"),
        (re.compile(r"\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+"), "[REDACTED_SUPABASE_KEY]"),
        (re.compile(r"\bvcp_[A-Za-z0-9_-]+"), "[REDACTED_VERCEL_TOKEN]"),
        (
            re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
            "[REDACTED_JWT]",
        ),
        (re.compile(r"(?i)(password\s*[=:]\s*)\S+"), r"\1[REDACTED]"),
    )
    for pattern, replacement in patterns:
        text = pattern.sub(replacement, text)
    return text


def main() -> int:
    token = os.environ.get("GH_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not token or not repo:
        print("Missing diagnostic configuration.", file=sys.stderr)
        return 1

    encoded_branch = urllib.parse.quote(BRANCH, safe="")
    selected = None
    for _ in range(60):
        data = api(
            repo,
            token,
            f"actions/workflows/{WORKFLOW_FILE}/runs?branch={encoded_branch}&event=push&per_page=20",
        )
        selected = next(
            (run for run in data.get("workflow_runs", []) if run.get("head_sha") == EXPECTED_SHA),
            None,
        )
        if selected and selected.get("status") == "completed":
            break
        time.sleep(5)

    if not selected:
        print("No matching QA resume workflow run was found.", file=sys.stderr)
        return 1

    run_id = selected["id"]
    print(
        json.dumps(
            {
                "run_id": run_id,
                "status": selected.get("status"),
                "conclusion": selected.get("conclusion"),
                "head_sha": selected.get("head_sha"),
                "html_url": selected.get("html_url"),
                "run_attempt": selected.get("run_attempt"),
            },
            indent=2,
        )
    )

    jobs = api(repo, token, f"actions/runs/{run_id}/jobs?filter=latest&per_page=100")
    compact_jobs = []
    failed_job_id = None
    for job in jobs.get("jobs", []):
        compact_jobs.append(
            {
                "id": job.get("id"),
                "name": job.get("name"),
                "status": job.get("status"),
                "conclusion": job.get("conclusion"),
                "steps": [
                    {
                        "name": step.get("name"),
                        "status": step.get("status"),
                        "conclusion": step.get("conclusion"),
                        "number": step.get("number"),
                    }
                    for step in job.get("steps", [])
                ],
            }
        )
        if job.get("conclusion") == "failure":
            failed_job_id = job.get("id")
    print("JOBS_BEGIN")
    print(json.dumps(compact_jobs, indent=2))
    print("JOBS_END")

    artifacts = api(repo, token, f"actions/runs/{run_id}/artifacts?per_page=100")
    compact_artifacts = [
        {
            "id": artifact.get("id"),
            "name": artifact.get("name"),
            "expired": artifact.get("expired"),
            "size_in_bytes": artifact.get("size_in_bytes"),
        }
        for artifact in artifacts.get("artifacts", [])
    ]
    print("ARTIFACTS_BEGIN")
    print(json.dumps(compact_artifacts, indent=2))
    print("ARTIFACTS_END")

    if failed_job_id:
        raw = sanitize(download(repo, token, f"actions/jobs/{failed_job_id}/logs"))
        lines = raw.splitlines()
        error_re = re.compile(
            r"(?i)(error|fatal|failed|permission denied|refusing|invalid|not found|exit code)"
        )
        first = next((i for i, line in enumerate(lines) if error_re.search(line)), max(0, len(lines) - 100))
        lo = max(0, first - 20)
        hi = min(len(lines), first + 100)
        print("SANITIZED_FAILURE_LOG_BEGIN")
        print("\n".join(lines[lo:hi]))
        print("SANITIZED_FAILURE_LOG_END")

    return 0 if selected.get("status") == "completed" else 2


if __name__ == "__main__":
    raise SystemExit(main())
