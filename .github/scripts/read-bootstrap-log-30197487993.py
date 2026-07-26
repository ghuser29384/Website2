#!/usr/bin/env python3

import json
import os
import re
import sys
import urllib.error
import urllib.request

SOURCE_JOB_ID = "89781500840"
SOURCE_RUN_ID = "30197487993"
TARGET_PR = 158


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
            raise RuntimeError(f"GitHub job-log request returned HTTP {error.code} {error.reason}") from error
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


def extract_and_redact(raw: str) -> list[str]:
    raw = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", raw)
    lines = raw.splitlines()
    start_markers = (
        "##[group]Run bash scripts/bootstrap-moraltrade-qa-schema.sh",
        "Run bash scripts/bootstrap-moraltrade-qa-schema.sh",
    )
    start = next(
        (i for i, line in enumerate(lines) if any(marker in line for marker in start_markers)),
        None,
    )
    if start is None:
        step_lines = lines[-220:]
    else:
        stop_markers = (
            "##[group]Post Set up Supabase CLI",
            "##[group]Post Set up Node.js",
            "##[group]Post Check out the tested branch",
            "##[group]Complete job",
        )
        end = next(
            (
                i
                for i in range(start + 1, len(lines))
                if any(marker in lines[i] for marker in stop_markers)
            ),
            len(lines),
        )
        step_lines = lines[start:end]

    specific_error = re.compile(
        r"(?i)(pg_dump:\s*error|psql:\s*error|fatal:|error:|failed to|"
        r"permission denied|could not|refusing|unexpectedly|invalid|not found)"
    )
    generic_exit = re.compile(r"(?i)process completed with exit code")
    first_error = next(
        (
            i
            for i, line in enumerate(step_lines)
            if specific_error.search(line) and not generic_exit.search(line)
        ),
        None,
    )
    if first_error is None:
        first_error = max(0, len(step_lines) - 30)

    excerpt = step_lines[first_error : first_error + 30]
    if len(excerpt) < 30 and first_error > 0:
        excerpt = step_lines[max(0, len(step_lines) - 30) :]

    redactions = (
        (re.compile(r"(?i)\b(?:postgres|postgresql)://\S+"), "[REDACTED_DATABASE_URL]"),
        (re.compile(r"\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+"), "[REDACTED_SUPABASE_KEY]"),
        (re.compile(r"\bvcp_[A-Za-z0-9_-]+"), "[REDACTED_VERCEL_TOKEN]"),
        (
            re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
            "[REDACTED_JWT]",
        ),
        (re.compile(r"(?i)(password\s*[=:]\s*)\S+"), r"\1[REDACTED]"),
    )
    sanitized: list[str] = []
    for line in excerpt:
        for pattern, replacement in redactions:
            line = pattern.sub(replacement, line)
        sanitized.append(line)
    return sanitized


def post_comment(repo: str, token: str, excerpt: list[str]) -> None:
    body = (
        f"Automated sanitized extraction from workflow run `{SOURCE_RUN_ID}`, "
        f"job `{SOURCE_JOB_ID}`, failing step **Clone schema only, verify isolation, "
        "and seed synthetic fixtures**. GitHub secret masking and additional explicit "
        "redaction were applied.\n\n```text\n"
        + "\n".join(excerpt)
        + "\n```"
    )
    payload = json.dumps({"body": body}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues/{TARGET_PR}/comments",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "moraltrade-bootstrap-log-reader",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 201:
                raise RuntimeError(f"GitHub comment request returned HTTP {response.status}")
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"GitHub comment request returned HTTP {error.code} {error.reason}") from error


def main() -> int:
    token = os.environ.get("GH_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not token or not repo:
        print("Diagnostic configuration is incomplete.", file=sys.stderr)
        return 1
    try:
        raw = download_job_log(repo, token)
        excerpt = extract_and_redact(raw)
    except Exception as error:
        print(f"Diagnostic failed safely before extraction: {error}", file=sys.stderr)
        return 1

    print("SANITIZED_EXCERPT_BEGIN")
    for line in excerpt:
        print(line)
    print("SANITIZED_EXCERPT_END")

    try:
        post_comment(repo, token, excerpt)
        print("Posted the sanitized failing-step excerpt to PR #158.")
    except Exception as error:
        print(f"PR comment was not posted: {error}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
