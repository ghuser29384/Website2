"""Create one approved staging alias and verify its fail-closed bootstrap.

Run only from the dedicated GitHub Actions workflow. Credentials are read from
the runner environment, never accepted on a command line or written to evidence.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = "ghuser29384/Website2"
PR_HEAD = "321e10231bd03459208783bce3544d1fd4d54be7"
CANDIDATE = "566bb18db56848b40a3a1ab58979a6be88ba45a8"
TREE = "86c70b442272f5cff4cf29e63d030c949b4323cb"
PROJECT = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
TEAM = "team_ySu6sF3Uho1E1GnJtCQPVEuJ"
BOOTSTRAP_ID = "dpl_AZkecr8ZLLym3nwbwt4iAydmi5dD"
BOOTSTRAP_HOST = "moraltrade-site-by44yr6wu-ellen-s.vercel.app"
ALIAS = "moraltrade-pr547-every-org-staging-20261002-566bb18.vercel.app"
ROUTE = "/api/connectors/every-org/du-staging-566bb18db56848b40a3a1ab58979a6be"
EVIDENCE = Path("evidence")
STATE = {"aliasAssignmentAttempted": False, "aliasAssignmentConfirmed": False,
         "bootstrapVerified": False, "rollbackAttempted": False, "rollbackConfirmed": False}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def require(condition: bool, label: str) -> None:
    if not condition:
        raise RuntimeError(label)


def request(url: str, *, method="GET", headers=None, data=None):
    req = urllib.request.Request(url, method=method, headers=headers or {}, data=data)
    try:
        response = urllib.request.build_opener(NoRedirect()).open(req, timeout=30)
    except urllib.error.HTTPError as exc:
        response = exc
    except Exception:
        raise RuntimeError("network_request_failed") from None
    with response:
        return response.status, dict(response.headers.items()), response.read(1048576)


def api(path: str, *, method="GET", payload=None, absent_ok=False):
    require(path.startswith("/"), "invalid_api_path")
    sep = "&" if "?" in path else "?"
    url = "https://api.vercel.com" + path + sep + "teamId=" + TEAM
    headers = {"Authorization": "Bearer " + os.environ["VERCEL_TOKEN"]}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode()
    status, _, body = request(url, method=method, headers=headers, data=data)
    if status == 404 and absent_ok:
        return None
    require(200 <= status < 300, "vercel_api_status_" + str(status))
    try:
        return json.loads(body)
    except Exception:
        raise RuntimeError("vercel_api_invalid_json") from None


def alias_deployment(value):
    return value.get("deploymentId") or (value.get("deployment") or {}).get("id") or (value.get("deployment") or {}).get("uid")


def valid_protection_response(status, headers, body):
    headers = {key.lower(): value for key, value in headers.items()}
    if not headers.get("x-vercel-id") or headers.get("server", "").lower() != "vercel":
        return False
    # A handler's generic JSON 401 is not evidence of Vercel interception.
    if status in (302, 303, 307, 308):
        location = urllib.parse.urlsplit(headers.get("location", ""))
        return location.scheme == "https" and location.hostname == "vercel.com" and location.path == "/sso-api"
    return status in (401, 403) and (b"Authentication Required" in body or b"Protected by Vercel Authentication" in body)


def protected_probe(host: str, *, invalid_bypass=False, callback=False):
    url = "https://" + host + (ROUTE if callback else "/donation-upgrades")
    if invalid_bypass:
        url += "?x-vercel-protection-bypass=deliberately-invalid-replacement-probe"
    status, headers, body = request(url, method="POST" if callback else "GET",
                                   headers={"Content-Type": "application/json"} if callback else {},
                                   data=b"not-json" if callback else None)
    require(valid_protection_response(status, headers, body), "vercel_protection_not_proven")


def protected_host_probes(host):
    for callback in (False, True):
        for invalid_bypass in (False, True):
            protected_probe(host, invalid_bypass=invalid_bypass, callback=callback)


def bootstrap_probe(host: str):
    bypass = os.environ["EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"]
    query = urllib.parse.urlencode({"x-vercel-protection-bypass": bypass})
    url = "https://" + host + ROUTE + "?" + query
    for authorization in (None, "Bearer deliberately-invalid-bootstrap-token"):
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        status, response_headers, body = request(url, method="POST", headers=headers, data=b"not-json")
        require(status == 401, "bootstrap_status_not_generic_401")
        require("json" in next((v for k, v in response_headers.items() if k.lower() == "content-type"), ""), "bootstrap_response_not_application_json")
        try:
            payload = json.loads(body)
        except Exception:
            raise RuntimeError("bootstrap_response_invalid_json") from None
        require(payload == {"ok": False}, "bootstrap_response_not_generic")


def validate_source_deployment(value):
    require((value.get("id") or value.get("uid")) == BOOTSTRAP_ID, "bootstrap_id_drift")
    require(value.get("url") == BOOTSTRAP_HOST, "bootstrap_host_drift")
    require((value.get("projectId") or (value.get("project") or {}).get("id")) == PROJECT, "bootstrap_project_drift")
    require((value.get("readyState") or value.get("state")) == "READY", "bootstrap_not_ready")
    require(value.get("target") in (None, "preview"), "bootstrap_not_preview")
    meta = value.get("meta") or {}
    require(meta.get("moralTradeCandidateSha", meta.get("githubCommitSha")) == CANDIDATE, "bootstrap_source_drift")
    if "moralTradeCandidateTree" in meta:
        require(meta["moralTradeCandidateTree"] == TREE, "bootstrap_tree_drift")


def validate_alias(value, expected_deployment):
    require(value is not None, "alias_missing")
    require(value.get("alias") == ALIAS, "alias_name_drift")
    require(value.get("projectId") == PROJECT, "alias_project_drift")
    require(alias_deployment(value) == expected_deployment, "alias_target_drift")
    require(not value.get("redirect"), "alias_must_not_redirect")


def rollback_new_alias(created_uid):
    # Only this newly created identity can be removed; no blind write retries.
    current = api("/v4/aliases/" + ALIAS)
    validate_alias(current, BOOTSTRAP_ID)
    require(current.get("uid") == created_uid, "rollback_alias_identity_drift")
    STATE["rollbackAttempted"] = True
    api("/v2/aliases/" + created_uid, method="DELETE")
    require(api("/v4/aliases/" + ALIAS, absent_ok=True) is None, "rollback_not_confirmed")
    STATE["rollbackConfirmed"] = True


def main():
    EVIDENCE.mkdir(exist_ok=True)
    require(os.environ.get("GITHUB_REPOSITORY") == REPOSITORY, "repository_drift")
    require(os.environ.get("GITHUB_ACTOR") == "ghuser29384", "actor_drift")
    require(os.environ.get("GITHUB_RUN_ATTEMPT") == "1", "bootstrap_rerun_requires_new_guarded_commit")
    require(os.environ.get("BOOTSTRAP_AUTHORIZED") == "true", "bootstrap_not_authorized")
    for name in ("VERCEL_TOKEN", "EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"):
        value = os.environ.get(name, "")
        require(bool(value) and not any(char in value for char in "\r\n"), "missing_or_invalid_" + name)
    require(bool(re.fullmatch(r"[A-Za-z0-9]{32}", os.environ["EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"])), "bypass_format_invalid")

    project = api("/v9/projects/" + PROJECT)
    require(project.get("id") == PROJECT, "project_drift")
    mode = (project.get("ssoProtection") or {}).get("deploymentType")
    require(mode in ("all", "preview", "prod_deployment_urls_and_all_previews"), "preview_protection_not_configured")
    # Do not retain this response: project data can contain credential material.
    del project
    validate_source_deployment(api("/v13/deployments/" + BOOTSTRAP_ID))
    protected_host_probes(BOOTSTRAP_HOST)
    bootstrap_probe(BOOTSTRAP_HOST)
    existing = api("/v4/aliases/" + ALIAS, absent_ok=True)
    require(existing is None, "alias_already_exists_refusing_reassignment")
    STATE["aliasAssignmentAttempted"] = True
    write_operation_state()
    result = api("/v2/deployments/" + BOOTSTRAP_ID + "/aliases", method="POST", payload={"alias": ALIAS})
    require(result.get("alias") == ALIAS, "assignment_name_mismatch")
    require(not result.get("oldDeploymentId"), "assignment_detected_concurrent_alias_collision")
    created_uid = result.get("uid")
    require(bool(created_uid) and bool(re.fullmatch(r"[A-Za-z0-9_-]+", created_uid)), "assignment_uid_missing_or_invalid")
    STATE["aliasAssignmentConfirmed"] = True
    del result
    try:
        validate_alias(api("/v4/aliases/" + ALIAS), BOOTSTRAP_ID)
        protected_host_probes(ALIAS)
        bootstrap_probe(ALIAS)
        validate_alias(api("/v4/aliases/" + ALIAS), BOOTSTRAP_ID)
    except Exception:
        rollback_new_alias(created_uid)
        raise
    STATE["bootstrapVerified"] = True
    evidence = {
        "schema": "every-org-replacement-bootstrap-v1",
        "workflowRunId": os.environ["GITHUB_RUN_ID"],
        "controllerCommit": os.environ["GITHUB_SHA"],
        "acceptedCandidateSha": CANDIDATE,
        "acceptedCandidateTree": TREE,
        "expectedPrHead": PR_HEAD,
        "bootstrapDeploymentId": BOOTSTRAP_ID,
        "bootstrapDeploymentHost": BOOTSTRAP_HOST,
        "callbackBase": "https://" + ALIAS + ROUTE,
        "aliasTargetVerifiedTwice": True,
        "noBypassAndWrongBypassBlockedByVercel": True,
        "exactCallbackPostProtectedWithoutValidBypass": True,
        "validQueryBypassReachedGenericApp401": True,
        "providerTokensCreatedOrChanged": False,
        "webhookRegistered": False,
        "newDeploymentCreated": False,
        "productionAliasChanged": False,
        "checkoutAttempted": False,
        "donationAttempted": False,
        "databaseWriteAttempted": False,
        "secretValuesRetained": False,
        "nextAction": "owner_creates_one_replacement_staging_webhook_and_stores_paired_tokens_directly",
    }
    payload = json.dumps(evidence, indent=2, sort_keys=True) + "\n"
    for name in ("VERCEL_TOKEN", "EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"):
        require(os.environ[name] not in payload, "secret_in_evidence")
    (EVIDENCE / "bootstrap.json").write_text(payload)
    print(payload)


def write_operation_state():
    # Persist operation stage even if the create response or rollback is uncertain.
    EVIDENCE.mkdir(exist_ok=True)
    payload = {**STATE, "alias": ALIAS, "expectedBootstrapDeploymentId": BOOTSTRAP_ID,
               "workflowRunId": os.environ.get("GITHUB_RUN_ID"),
               "secretValuesRetained": False}
    (EVIDENCE / "operation-state.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def run():
    try:
        main()
        return 0
    except RuntimeError as exc:
        # All RuntimeError text is controlled, non-secret labels above.
        STATE["failureLabel"] = str(exc)
        print("Bootstrap halted: " + str(exc), file=sys.stderr)
        return 1
    except Exception:
        STATE["failureLabel"] = "unexpected_error_details_suppressed"
        print("Bootstrap halted: unexpected_error_details_suppressed", file=sys.stderr)
        return 1
    finally:
        if STATE["aliasAssignmentAttempted"] and not STATE["bootstrapVerified"]:
            STATE["nextAction"] = "read_only_alias_reconciliation_no_automatic_retry"
            STATE["mutationOutcome"] = "rollback_confirmed" if STATE["rollbackConfirmed"] else "unconfirmed_or_incomplete"
        else:
            STATE["mutationOutcome"] = "verified" if STATE["bootstrapVerified"] else "not_attempted"
        write_operation_state()


if __name__ == "__main__":
    sys.exit(run())
