#!/usr/bin/env python3

import os
import re
import sys
import urllib.error
import urllib.request

SOURCE_JOB_ID = "89793799942"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def download_job_log(repo: str, token: str) -> str:
    api_url = f"https://api.github.com/repos/{repo}/actions/jobs/{SOURCE_JOB_ID}/logs"
    request = urllib.request.Request(
        api_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-bootstrap-log-reader",
        },
    )
    opener = urllib.request.build_opener(NoRedirect)
    try:
        response = opener.open(request, timeout=30)
        content = response.read()
    except urllib.error.HTTPError as error:
        if error.code not in {301, 302, 303, 307, 308}:
            raise RuntimeError(
                f"GitHub job-log request returned HTTP {error.code} {error.reason}"
            ) from error
        location = error.headers.get("Location")
        if not location:
            raise RuntimeError("GitHub job-log redirect omitted the Location header") from error
        clean_request = urllib.request.Request(
            location,
            headers={"User-Agent": "moraltrade-bootstrap-log-reader"},
        )
        with urllib.request.urlopen(clean_request, timeout=30) as redirected:
            content = redirected.read()
    return content.decode("utf-8", errors="replace")


def redact(line: str) -> str:
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
        line = pattern.sub(replacement, line)
    return line


def extract(raw: str) -> list[str]:
    raw = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", raw)
    lines = raw.splitlines()
    start = next(
        (
            i
            for i, line in enumerate(lines)
            if "Run bash scripts/bootstrap-moraltrade-qa-schema.sh" in line
        ),
        0,
    )
    candidate = lines[start:]
    error_re = re.compile(
        r"(?i)(pg_dump:\s*error|psql:\s*error|fatal:|error running container|"
        r"permission denied|could not|refusing|unexpectedly|invalid|not found|"
        r"differs from production|required qa table is missing|expected two synthetic|"
        r"process completed with exit code)"
    )
    first_error = next(
        (i for i, line in enumerate(candidate) if error_re.search(line)),
        max(0, len(candidate) - 80),
    )
    lo = max(0, first_error - 20)
    hi = min(len(candidate), first_error + 80)
    return [redact(line) for line in candidate[lo:hi]]


def main() -> int:
    token = os.environ.get("GH_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not token or not repo:
        print("Diagnostic configuration is incomplete.", file=sys.stderr)
        return 1
    try:
        raw = download_job_log(repo, token)
        excerpt = extract(raw)
    except Exception as error:
        print(f"Diagnostic failed safely: {error}", file=sys.stderr)
        return 1
    print("SANITIZED_EXCERPT_BEGIN")
    for line in excerpt:
        print(line)
    print("SANITIZED_EXCERPT_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
