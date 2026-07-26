#!/usr/bin/env python3
import os
import re
import urllib.error
import urllib.request

JOB_ID = 89818140904


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
            "User-Agent": "moraltrade-pr158-offer-close-generator-reader",
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
                headers={"User-Agent": "moraltrade-pr158-offer-close-generator-reader"},
            ),
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
        (re.compile(r"QA_SUPABASE_DB_URL:\s*\S+"), "QA_SUPABASE_DB_URL: [REDACTED]"),
    )
    for pattern, replacement in patterns:
        text = pattern.sub(replacement, text)
    return text


def main() -> int:
    lines = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"])).splitlines()
    noteworthy = []
    pattern = re.compile(
        r"(?i)(Generate exact migrations|Traceback|RuntimeError|ValueError|Expected|found|generated|Process completed with exit code|failed)"
    )
    for index, line in enumerate(lines):
        if pattern.search(line):
            noteworthy.extend(lines[max(0, index - 15) : min(len(lines), index + 35)])
    deduped = []
    seen = set()
    for line in noteworthy:
        if line not in seen:
            seen.add(line)
            deduped.append(line)

    print("SANITIZED_OFFER_CLOSE_GENERATOR_FAILURE_BEGIN")
    print("--- NOTEWORTHY LINES ---")
    print("\n".join(deduped[-700:]))
    print("--- TERMINAL LOG TAIL ---")
    print("\n".join(lines[-260:]))
    print("SANITIZED_OFFER_CLOSE_GENERATOR_FAILURE_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
