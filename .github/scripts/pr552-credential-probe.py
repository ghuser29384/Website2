from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

PROD_REF = os.environ["PROD_REF"]
QA_REF = os.environ["QA_REF"]
LABEL = os.environ["PROBE_LABEL"]


def request_status(url: str, headers: dict[str, str]) -> int:
    request = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read(1)
            return int(response.status)
    except urllib.error.HTTPError as error:
        error.read(1)
        return int(error.code)
    except (urllib.error.URLError, TimeoutError):
        return 0


def service_status(project_ref: str, credential: str) -> int:
    return request_status(
        f"https://{project_ref}.supabase.co/auth/v1/admin/users?page=1&per_page=1",
        {
            "apikey": credential,
            "Authorization": f"Bearer {credential}",
            "User-Agent": "MoralTrade-PR552-credential-probe/1",
        },
    )


def management_status(credential: str) -> int:
    return request_status(
        f"https://api.supabase.com/v1/projects/{PROD_REF}/api-keys",
        {
            "Authorization": f"Bearer {credential}",
            "User-Agent": "MoralTrade-PR552-credential-probe/1",
        },
    )


service_candidates: list[dict[str, Any]] = []
management_candidates: list[dict[str, Any]] = []
seen_values: dict[str, int] = {}

for name, raw_value in sorted(os.environ.items()):
    if not (name.startswith("C") or name.startswith("M")):
        continue
    value = raw_value.strip()
    if not value:
        continue

    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    value_group = seen_values.setdefault(digest, len(seen_values) + 1)
    public_name = name.split("_", 1)[1] if "_" in name else name

    if name.startswith("C"):
        service_candidates.append(
            {
                "name": public_name,
                "valueGroup": value_group,
                "productionStatus": service_status(PROD_REF, value),
                "qaStatus": service_status(QA_REF, value),
            }
        )
    else:
        management_candidates.append(
            {
                "name": public_name,
                "valueGroup": value_group,
                "productionManagementStatus": management_status(value),
            }
        )

result = {
    "schemaVersion": 1,
    "label": LABEL,
    "presentServiceCandidateCount": len(service_candidates),
    "presentManagementCandidateCount": len(management_candidates),
    "serviceCandidates": service_candidates,
    "managementCandidates": management_candidates,
    "workingProductionServiceNames": [
        candidate["name"]
        for candidate in service_candidates
        if candidate["productionStatus"] == 200
    ],
    "workingQaServiceNames": [
        candidate["name"]
        for candidate in service_candidates
        if candidate["qaStatus"] == 200
    ],
    "workingProductionManagementNames": [
        candidate["name"]
        for candidate in management_candidates
        if candidate["productionManagementStatus"] == 200
    ],
}

output = Path(f"credential-probe-{LABEL}.json")
output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

print(
    json.dumps(
        {
            "label": LABEL,
            "presentServiceCandidateCount": result["presentServiceCandidateCount"],
            "presentManagementCandidateCount": result["presentManagementCandidateCount"],
            "workingProductionServiceNames": result["workingProductionServiceNames"],
            "workingQaServiceNames": result["workingQaServiceNames"],
            "workingProductionManagementNames": result[
                "workingProductionManagementNames"
            ],
        },
        sort_keys=True,
    )
)
