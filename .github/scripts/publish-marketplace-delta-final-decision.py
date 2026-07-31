#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

REPO = "ghuser29384/Website2"
PRODUCT_PR = 326
TEMP_PRS = (281, 324, 331)
ROOT = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd())) / "marketplace-delta-final-audit"
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN", "")


def request(path: str, method: str = "GET", data=None):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "moraltrade-marketplace-final-publisher",
    }
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}{path}",
        data=body,
        method=method,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        if response.status == 204:
            return None
        return json.load(response)


def main() -> int:
    if not TOKEN:
        raise SystemExit("Missing GH_TOKEN")
    body = (ROOT / "review-body.md").read_text(encoding="utf-8")
    decision = (ROOT / "decision.txt").read_text(encoding="utf-8").strip()
    try:
        response = request(f"/pulls/{PRODUCT_PR}/reviews", "POST", {"body": body, "event": "COMMENT"})
        publication = {"kind": "review", "url": response.get("html_url") if response else None}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        response = request(f"/issues/{PRODUCT_PR}/comments", "POST", {"body": body})
        publication = {
            "kind": "issue_comment",
            "url": response.get("html_url") if response else None,
            "review_error": detail[:500],
        }
    (ROOT / "publication.json").write_text(json.dumps(publication, indent=2), encoding="utf-8")

    closures = []
    for number in TEMP_PRS:
        current = request(f"/pulls/{number}")
        if current.get("merged"):
            closures.append({"pr": number, "state": current.get("state"), "merged": True, "action": "left unchanged"})
        elif current.get("state") != "closed":
            updated = request(f"/pulls/{number}", "PATCH", {"state": "closed"})
            closures.append({"pr": number, "state": updated.get("state"), "merged": False, "action": "closed without merge"})
        else:
            closures.append({"pr": number, "state": "closed", "merged": False, "action": "already closed"})
    (ROOT / "temporary-pr-closures.json").write_text(json.dumps(closures, indent=2), encoding="utf-8")
    print(json.dumps({"decision": decision, "publication": publication, "closures": closures}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
