#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import urllib.error
import urllib.request

JOB_ID = 89911487465


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
            "User-Agent": "moraltrade-pr158-browser-v3-log-reader",
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
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-pr158-browser-v3-log-reader"}),
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


def section(lines: list[str], start_text: str, end_text: str | None = None) -> list[str]:
    starts = [i for i, line in enumerate(lines) if start_text in line]
    if not starts:
        return [f"MISSING SECTION: {start_text}"]
    start = starts[-1]
    end = len(lines)
    if end_text:
        ends = [i for i in range(start + 1, len(lines)) if end_text in lines[i]]
        if ends:
            end = ends[0]
    return lines[start:end]


def main() -> int:
    text = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]))
    lines = text.splitlines()
    selected: list[str] = []
    selected.extend(section(lines, "Run complete 1440 by 900 desktop two-account suite", "Reset exact fixture between viewport suites"))
    selected.extend(["", "==== MOBILE ====", ""])
    selected.extend(section(lines, "Run complete 390 by 844 mobile two-account suite", "Upload desktop and mobile browser evidence"))
    selected.extend(["", "==== ENFORCEMENT ====", ""])
    selected.extend(section(lines, "Enforce desktop, mobile, cleanup, and bypass outcomes", "Post Set up Node.js"))
    print("\n".join(selected))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
