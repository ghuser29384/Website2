#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import urllib.error
import urllib.request

JOB_ID = 89884123058


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
            "User-Agent": "moraltrade-pr158-bilateral-repair-log-reader",
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
            urllib.request.Request(
                location,
                headers={"User-Agent": "moraltrade-pr158-bilateral-repair-log-reader"},
            ),
            timeout=30,
        ) as redirected:
            content = redirected.read()
    return content.decode("utf-8", errors="replace")


def sanitize(text: str) -> str:
    text = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", text)
    replacements = (
        (r"(?i)\b(?:postgres|postgresql)://\S+", "[REDACTED_DATABASE_URL]"),
        (r"\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+", "[REDACTED_SUPABASE_KEY]"),
        (r"\bvcp_[A-Za-z0-9_-]+", "[REDACTED_VERCEL_TOKEN]"),
        (
            r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b",
            "[REDACTED_JWT]",
        ),
    )
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)
    return text


def main() -> int:
    text = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]))
    lines = text.splitlines()
    markers = [
        index
        for index, line in enumerate(lines)
        if re.search(
            r"(?i)(Traceback|RuntimeError|ValueError|AssertionError|Error:|##\[error\]|Process completed with exit code)",
            line,
        )
    ]
    index = markers[-1] if markers else max(0, len(lines) - 180)
    start = max(0, index - 140)
    end = min(len(lines), index + 160)
    print("SANITIZED_BILATERAL_REPAIR_FAILURE_BEGIN")
    print("\n".join(lines[start:end]))
    print("SANITIZED_BILATERAL_REPAIR_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
