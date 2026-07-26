#!/usr/bin/env python3

import json
import os
import re
import sys
import urllib.error
import urllib.request

RUN_ID = "30202592040"
JOB_ID = "89795027576"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


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

    artifacts = api(repo, token, f"actions/runs/{RUN_ID}/artifacts?per_page=100")
    print("ARTIFACTS_BEGIN")
    print(
        json.dumps(
            [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "expired": item.get("expired"),
                    "size_in_bytes": item.get("size_in_bytes"),
                }
                for item in artifacts.get("artifacts", [])
            ],
            indent=2,
        )
    )
    print("ARTIFACTS_END")

    raw = sanitize(download(repo, token, f"actions/jobs/{JOB_ID}/logs"))
    lines = raw.splitlines()
    marker = next(
        (
            i
            for i, line in enumerate(lines)
            if "Configure branch-scoped Vercel Preview variables" in line
            or "Run bash scripts/configure-moraltrade-qa-vercel.sh" in line
        ),
        0,
    )
    candidate = lines[marker:]
    error_re = re.compile(
        r"(?i)(error|fatal|failed|permission denied|forbidden|unauthorized|invalid|not found|exit code)"
    )
    error_at = next((i for i, line in enumerate(candidate) if error_re.search(line)), max(0, len(candidate) - 60))
    lo = max(0, error_at - 30)
    hi = min(len(candidate), error_at + 90)
    print("SANITIZED_VERCEL_FAILURE_BEGIN")
    print("\n".join(candidate[lo:hi]))
    print("SANITIZED_VERCEL_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
