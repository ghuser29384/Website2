#!/usr/bin/env python3
import os
import re
import urllib.error
import urllib.request

JOB_ID = 89820406167


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
            "User-Agent": "moraltrade-browser-patch-test-reader",
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
            urllib.request.Request(location, headers={"User-Agent": "moraltrade-browser-patch-test-reader"}),
            timeout=30,
        ) as redirected:
            content = redirected.read()
    return content.decode("utf-8", errors="replace")


def sanitize(text: str) -> str:
    return re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", text)


def main() -> int:
    lines = sanitize(download(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"])).splitlines()
    print("SANITIZED_BROWSER_PATCH_TEST_TAIL_BEGIN")
    print("\n".join(lines[-90:]))
    print("SANITIZED_BROWSER_PATCH_TEST_TAIL_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
