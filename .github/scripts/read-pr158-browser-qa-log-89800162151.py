#!/usr/bin/env python3

import os
import re
import sys
import urllib.error
import urllib.request

JOB_ID = "89800162151"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def download(repo: str, token: str) -> str:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/actions/jobs/{JOB_ID}/logs",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "moraltrade-browser-qa-log-reader",
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
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-browser-qa-log-reader"}),
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
        (re.compile(r"(?i)(TEMP_VERCEL_BYPASS_SECRET[=: ]+)\S+"), r"\1[REDACTED]"),
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
    raw = sanitize(download(repo, token))
    lines = raw.splitlines()
    start = next(
        (
            i
            for i, line in enumerate(lines)
            if "Run desktop and mobile two-account browser QA" in line
            or "run-pr158-two-account-browser-qa.mjs" in line
        ),
        max(0, len(lines) - 180),
    )
    candidate = lines[start:]
    error_re = re.compile(r"(?i)(error|fail|exception|syntax|reference|typeerror|process completed)")
    error_at = next(
        (i for i, line in enumerate(candidate) if error_re.search(line)),
        max(0, len(candidate) - 140),
    )
    lo = max(0, error_at - 50)
    hi = min(len(candidate), error_at + 180)
    print("SANITIZED_BROWSER_QA_FAILURE_BEGIN")
    print("\n".join(candidate[lo:hi]))
    print("SANITIZED_BROWSER_QA_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
