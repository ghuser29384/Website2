from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

PROD_REF = os.environ["PROD_REF"]
QA_REF = os.environ["QA_REF"]
LABEL = os.environ["PROBE_LABEL"]


def classify_url(value: str) -> str:
    parsed = urlparse(value)
    username = parsed.username or ""
    host = parsed.hostname or ""
    path = parsed.path
    query = parse_qs(parsed.query)
    if parsed.scheme not in {"postgres", "postgresql"}:
        return "invalid_scheme"
    if not parsed.password:
        return "missing_password"
    if path != "/postgres":
        return "unexpected_database"
    if PROD_REF in username or PROD_REF in host:
        return "production"
    if QA_REF in username or QA_REF in host:
        return "qa"
    if query.get("project", [""])[0] == PROD_REF:
        return "production"
    if query.get("project", [""])[0] == QA_REF:
        return "qa"
    return "unknown"


def connection_status(value: str, expected_ref: str) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            [
                "psql",
                value,
                "--no-psqlrc",
                "--tuples-only",
                "--no-align",
                "--set",
                "ON_ERROR_STOP=1",
                "--command",
                "select current_database(), current_user, "
                "coalesce(current_setting('request.jwt.claims', true), ''), "
                "to_regclass('auth.users') is not null;",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=25,
            env={**os.environ, "PGCONNECT_TIMEOUT": "15", "PGSSLMODE": "require"},
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"connected": False, "reason": type(error).__name__}

    output = completed.stdout.strip()
    connected = completed.returncode == 0 and output.endswith("|t")
    return {
        "connected": connected,
        "returnCode": completed.returncode,
        "expectedRef": expected_ref,
    }


url_candidates: list[dict[str, Any]] = []
password_candidates: list[dict[str, Any]] = []
seen_values: dict[str, int] = {}

for name, raw_value in sorted(os.environ.items()):
    if not (name.startswith("D") or name.startswith("P")):
        continue
    value = raw_value.strip()
    if not value:
        continue

    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    value_group = seen_values.setdefault(digest, len(seen_values) + 1)
    public_name = name.split("_", 1)[1] if "_" in name else name

    if name.startswith("D"):
        classification = classify_url(value)
        expected_ref = PROD_REF if classification == "production" else QA_REF if classification == "qa" else ""
        connection = connection_status(value, expected_ref) if expected_ref else {"connected": False, "reason": classification}
        url_candidates.append(
            {
                "name": public_name,
                "valueGroup": value_group,
                "classification": classification,
                **connection,
            }
        )
    else:
        password_candidates.append(
            {
                "name": public_name,
                "valueGroup": value_group,
                "lengthAtLeast14": len(value) >= 14,
            }
        )

result = {
    "schemaVersion": 1,
    "label": LABEL,
    "presentDatabaseCandidateCount": len(url_candidates),
    "presentPasswordCandidateCount": len(password_candidates),
    "databaseCandidates": url_candidates,
    "passwordCandidates": password_candidates,
    "workingProductionDatabaseNames": [
        candidate["name"]
        for candidate in url_candidates
        if candidate["classification"] == "production" and candidate["connected"]
    ],
    "workingQaDatabaseNames": [
        candidate["name"]
        for candidate in url_candidates
        if candidate["classification"] == "qa" and candidate["connected"]
    ],
    "usablePasswordNames": [
        candidate["name"]
        for candidate in password_candidates
        if candidate["lengthAtLeast14"]
    ],
}

output = Path(f"credential-db-probe-{LABEL}.json")
output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

print(
    json.dumps(
        {
            "label": LABEL,
            "workingProductionDatabaseNames": result["workingProductionDatabaseNames"],
            "workingQaDatabaseNames": result["workingQaDatabaseNames"],
            "usablePasswordNames": result["usablePasswordNames"],
        },
        sort_keys=True,
    )
)
