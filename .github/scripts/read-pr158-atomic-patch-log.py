#!/usr/bin/env python3
import os
import re
import urllib.error
import urllib.request

JOB_ID = "89804469321"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def download(repo: str, token: str) -> str:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/actions/jobs/{JOB_ID}/logs",
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
    raw = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]))
    lines = raw.splitlines()
    failure_indexes = [
        i for i, line in enumerate(lines)
        if re.search(r"(?i)(##\[error\]|npm ERR|error:|failed|failure|AssertionError|TypeError|SyntaxError)", line)
    ]
    index = failure_indexes[-1] if failure_indexes else max(0, len(lines) - 120)
    lo = max(0, index - 120)
    hi = min(len(lines), index + 120)
    print("SANITIZED_PATCH_FAILURE_BEGIN")
    print("\n".join(lines[lo:hi]))
    print("SANITIZED_PATCH_FAILURE_END")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
