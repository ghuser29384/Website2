#!/usr/bin/env python3
import os
import re
import urllib.error
import urllib.request

JOB_ID = 89807330937


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
            "User-Agent": "moraltrade-pr158-focused-patch-log-reader",
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
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-pr158-focused-patch-log-reader"}),
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
    raw = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]))
    lines = raw.splitlines()
    marker = next(
        (
            index
            for index, line in enumerate(lines)
            if "Run focused repair gates and production build" in line
        ),
        max(0, len(lines) - 360),
    )
    candidate = lines[marker:]
    error_indexes = [
        index
        for index, line in enumerate(candidate)
        if re.search(
            r"(?i)(##\[error\]|error TS\d+|AssertionError|TypeError|SyntaxError|ReferenceError|Process completed with exit code)",
            line,
        )
    ]
    first_error = error_indexes[0] if error_indexes else max(0, len(candidate) - 300)
    lo = max(0, first_error - 220)
    hi = min(len(candidate), first_error + 420)
    print("SANITIZED_FOCUSED_PATCH_FAILURE_BEGIN")
    print("\n".join(candidate[lo:hi]))
    print("SANITIZED_FOCUSED_PATCH_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
