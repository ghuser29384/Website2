"""Guarded, one-use replacement staging Phase 2. Never run interactively.

All requests are bounded, cookie-free, and never follow redirects. Secrets stay
in runner memory and runtime deployment configuration, never retained evidence.
The companion workflow supplies the owner-confirmed authorization marker.
"""
from __future__ import annotations
import base64
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import time
import urllib.parse

REPOSITORY = "ghuser29384/Website2"
BRANCH = "ops/pr547-every-org-replacement-566bb18-20261002"
PR_HEAD = "321e10231bd03459208783bce3544d1fd4d54be7"
APP_SHA = "566bb18db56848b40a3a1ab58979a6be88ba45a8"
APP_TREE = "86c70b442272f5cff4cf29e63d030c949b4323cb"
VALIDATION_SHA = "1ceebdc355b2f517e759a1e6131a8ee296bdfcce"
VALIDATION_TREE = "abf0ce088bc3c9abbef2230687b9c2d47e35e0a7"
VALIDATION_TEST = "src/lib/background-candidate-exposure.test.ts"
ORIGINAL_TEST_BLOB = "e53217ed8cdccf67c734cc2b56f26e49b8101e41"
VALIDATION_TEST_BLOB = "41ac638019bad6a378db105b0710f41c29566f9e"
TEAM = "team_ySu6sF3Uho1E1GnJtCQPVEuJ"
PROJECT = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
BOOTSTRAP_ID = "dpl_AZkecr8ZLLym3nwbwt4iAydmi5dD"
BOOTSTRAP_HOST = "moraltrade-site-by44yr6wu-ellen-s.vercel.app"
ALIAS = "moraltrade-pr547-every-org-staging-20261002-566bb18.vercel.app"
ALIAS_UID = "2d7da51c479ec596111e3e163644cbc988f84c2e5b3f5fb4f4a2d229ca6bbc8f9b93c5d9a92043163cb6282e8442e34738f7f7ecf38b68b657c0ba656c62f233"
ROUTE_ID = "du-staging-566bb18db56848b40a3a1ab58979a6be"
ROUTE = "/api/connectors/every-org/" + ROUTE_ID
QA_URL = "https://hvmxfjjbdcgjjudmthdz.supabase.co"
PURPOSE = "every-org-replacement-phase2-20261002-566bb18"
CLI = "vercel@50.38.1"
MARKER = ".github/pr547-every-org-replacement-phase2-v4-20261003.authorize"
TABLES = ("direct_donation_upgrade_offers", "direct_donation_upgrade_candidates",
          "direct_donation_upgrade_obligations", "direct_donation_upgrade_impact_credits",
          "direct_donation_upgrade_audit_events")
SECRET_NAMES = ("VERCEL_TOKEN", "GH_TOKEN", "QA_SUPABASE_PUBLISHABLE_KEY",
                "QA_SUPABASE_SERVICE_ROLE_KEY", "EVERY_ORG_STAGING_PUBLIC_API_KEY",
                "EVERY_ORG_STAGING_PARTNER_METADATA_SECRET", "EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET",
                "EVERY_ORG_STAGING_DONATE_LINK_WEBHOOK_TOKEN",
                "EVERY_ORG_STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN")
PAIR = SECRET_NAMES[-2:]
PRIVATE_BUILD_NAMES = tuple(n for n in SECRET_NAMES if n != "QA_SUPABASE_PUBLISHABLE_KEY")
APP = Path(os.environ.get("PHASE2_APP", "app"))
EVIDENCE = Path(os.environ.get("PHASE2_EVIDENCE", "evidence"))
QUALITY = Path(os.environ.get("PHASE2_QUALITY", "quality"))
STATE = {"deploymentAttempted": False, "cutoverAttempted": False,
         "cutoverConfirmed": False, "rollbackAttempted": False,
         "rollbackConfirmed": False, "phase2Verified": False}


def require(ok, label):
    if not ok:
        raise RuntimeError(label)


def secret_patterns(names=SECRET_NAMES):
    values = set()
    for name in names:
        value = os.environ.get(name, "")
        if value:
            values.update((value.encode(), urllib.parse.quote(value, safe="").encode(),
                           json.dumps(value)[1:-1].encode(), base64.b64encode(value.encode())))
    return tuple(values)


def no_secret(data, names=SECRET_NAMES):
    require(not any(value in data for value in secret_patterns(names)), "secret_in_output")


def evidence(name, value):
    require(bool(re.fullmatch(r"[a-z0-9-]+\.json", name)), "unsafe_evidence_name")
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
    no_secret(data)
    EVIDENCE.mkdir(exist_ok=True)
    (EVIDENCE / name).write_bytes(data)


def request(url, *, method="GET", headers=(), body=None):
    """Raw header list preserves duplicate Authorization fields. No redirects/cookies."""
    parts = urllib.parse.urlsplit(url)
    require(parts.scheme == "https" and parts.hostname and parts.port in (None, 443), "unsafe_request_url")
    require(not parts.username and not parts.password and not parts.fragment, "unsafe_request_url")
    allowed = {"api.vercel.com", "api.github.com", urllib.parse.urlsplit(QA_URL).hostname, ALIAS, BOOTSTRAP_HOST}
    allowed.update([STATE.get("deploymentHost")])
    require(parts.hostname in allowed, "unapproved_request_host")
    pairs = list(headers.items()) if isinstance(headers, dict) else list(headers)
    require(all(k.lower() not in ("cookie", "x-vercel-set-bypass-cookie") for k, _ in pairs), "forbidden_cookie_header")
    connection = http.client.HTTPSConnection(parts.hostname, timeout=30)
    try:
        connection.putrequest(method, parts.path + ("?" + parts.query if parts.query else ""))
        for key, value in pairs:
            connection.putheader(key, value)
        if body is not None:
            connection.putheader("Content-Length", str(len(body)))
        connection.endheaders(body)
        response = connection.getresponse()
        data = response.read(1048577)
        require(len(data) <= 1048576, "response_too_large")
        return response.status, {k.lower(): v for k, v in response.getheaders()}, data
    except RuntimeError:
        raise
    except Exception:
        raise RuntimeError("network_request_failed") from None
    finally:
        connection.close()


def json_body(body):
    try:
        return json.loads(body)
    except Exception:
        raise RuntimeError("response_invalid_json") from None


def api(path, *, method="GET", payload=None):
    require(path.startswith("/") and not path.startswith("//"), "invalid_api_path")
    sep = "&" if "?" in path else "?"
    headers = {"Authorization": "Bearer " + os.environ["VERCEL_TOKEN"]}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode()
    status, _, body = request("https://api.vercel.com" + path + sep + "teamId=" + TEAM,
                              method=method, headers=headers, body=body)
    require(200 <= status < 300, "vercel_api_status_" + str(status))
    return json_body(body)


def assert_pr():
    status, _, body = request("https://api.github.com/repos/" + REPOSITORY + "/pulls/547",
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"], "User-Agent": PURPOSE,
                 "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
    require(status == 200, "github_pr_read_failed")
    value = json_body(body)
    require(value.get("state") == "open" and value.get("draft") is True and value.get("merged") is False,
            "pr_state_drift")
    require((value.get("head") or {}).get("sha") == PR_HEAD, "pr_head_drift")


def alias_target(value):
    return value.get("deploymentId") or (value.get("deployment") or {}).get("id") or (value.get("deployment") or {}).get("uid")


def validate_alias(value, target):
    require(isinstance(value, dict), "alias_missing")
    require(value.get("alias") == ALIAS, "alias_name_drift")
    require(value.get("uid") == ALIAS_UID, "alias_uid_drift")
    require(value.get("projectId") == PROJECT, "alias_project_drift")
    require(alias_target(value) == target, "alias_target_drift")
    require(not value.get("redirect"), "alias_redirect_forbidden")


def alias_read(target):
    value = api("/v4/aliases/" + ALIAS)
    validate_alias(value, target)
    return {"alias": ALIAS, "uid": ALIAS_UID, "projectId": PROJECT, "deploymentId": target}


def validate_deployment(value, deployment_id, host, *, bootstrap=False):
    require((value.get("id") or value.get("uid")) == deployment_id, "deployment_id_drift")
    require(value.get("url") == host, "deployment_host_drift")
    require((value.get("projectId") or (value.get("project") or {}).get("id")) == PROJECT, "deployment_project_drift")
    require((value.get("readyState") or value.get("state")) == "READY", "deployment_not_ready")
    require(value.get("target") in (None, "preview"), "deployment_not_preview")
    meta = value.get("meta") or {}
    require(meta.get("moralTradeCandidateSha", meta.get("githubCommitSha")) == APP_SHA, "deployment_app_sha_drift")
    if not bootstrap or "moralTradeCandidateTree" in meta:
        require(meta.get("moralTradeCandidateTree") == APP_TREE, "deployment_tree_drift")
    if not bootstrap:
        require(meta.get("moralTradeExpectedPrHead") == PR_HEAD, "deployment_pr_head_drift")
        require(meta.get("moralTradePurpose") == PURPOSE, "deployment_purpose_drift")
        require(meta.get("moralTradeControllerSha") == os.environ["GITHUB_SHA"], "deployment_controller_drift")
        require(meta.get("moralTradeWorkflowRunId") == os.environ["GITHUB_RUN_ID"], "deployment_run_drift")
        require(meta.get("moralTradeBuildArtifactSha256") == STATE.get("artifactDigest") and bool(STATE.get("artifactDigest")), "deployment_artifact_digest_drift")
        require(deployment_id != BOOTSTRAP_ID, "deployment_not_fresh")


def protection():
    value = api("/v9/projects/" + PROJECT)
    require(value.get("id") == PROJECT, "project_drift")
    require((value.get("ssoProtection") or {}).get("deploymentType") == "all_except_custom_domains",
            "protection_configuration_drift")
    return value


def vercel_intercepted(status, headers, body):
    headers = {key.lower(): value for key, value in headers.items()}
    if not headers.get("x-vercel-id") or headers.get("server", "").lower() != "vercel":
        return False
    if status in (302, 303, 307, 308):
        target = urllib.parse.urlsplit(headers.get("location", ""))
        return target.scheme == "https" and target.hostname == "vercel.com" and target.path == "/sso-api"
    return status in (401, 403) and (b"Authentication Required" in body or b"Protected by Vercel Authentication" in body)


def host_protection(host):
    results = []
    for path, method in ((ROUTE, "POST"), ("/donation-upgrades", "GET")):
        for invalid in (False, True):
            query = "?x-vercel-protection-bypass=deliberately-invalid-replacement-probe" if invalid else ""
            status, headers, body = request("https://" + host + path + query, method=method,
                headers={"Content-Type": "application/json"}, body=b"not-json" if method == "POST" else None)
            require(vercel_intercepted(status, headers, body), "vercel_interception_not_proven")
            results.append({"path": path, "method": method, "bypass": "invalid" if invalid else "absent",
                            "status": status, "vercelInterceptionProven": True})
    return results


def callback_url(host, path=ROUTE):
    return "https://" + host + path + "?" + urllib.parse.urlencode({
        "x-vercel-protection-bypass": os.environ["EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"]})


def probe_json(host, label, auth_headers, expected_status, expected_body, body=b"not-json", path=ROUTE):
    status, headers, data = request(callback_url(host, path), method="POST",
        headers=[("Content-Type", "application/json"), *auth_headers], body=body)
    require(status == expected_status, "probe_" + label + "_status")
    require("application/json" in headers.get("content-type", "").lower(), "probe_" + label + "_content_type")
    require(json_body(data) == expected_body, "probe_" + label + "_body")
    no_secret(data)
    return {"case": label, "status": status, "bodySha256": hashlib.sha256(data).hexdigest()}


def bootstrap_probes(host):
    return [probe_json(host, "bootstrap-missing", [], 401, {"ok": False}),
            probe_json(host, "bootstrap-wrong", [("Authorization", "Bearer deliberately-invalid-bootstrap-token")],
                       401, {"ok": False})]


def auth_matrix(host):
    private = os.environ[PAIR[1]]
    public = os.environ[PAIR[0]]
    header = [("Authorization", "Bearer " + private)]
    cases = [
        ("missing", []),
        ("wrong", [("Authorization", "Bearer deliberately-invalid-private-token")]),
        ("public-token-as-bearer", [("Authorization", "Bearer " + public)]),
        ("raw-token", [("Authorization", private)]),
        ("lowercase-scheme", [("Authorization", "bearer " + private)]),
        ("double-space", [("Authorization", "Bearer  " + private)]),
        ("coalesced", [("Authorization", "Bearer " + private + ", Bearer " + private)]),
    ]
    results = [probe_json(host, label, headers, 401, {"ok": False}) for label, headers in cases]
    # Transport can reject duplicate fields with 400 before the app. A 400 must
    # not look like the successful app-auth invalid_json result.
    status, headers, data = request(callback_url(host), method="POST",
        headers=[("Content-Type", "application/json"), *header, *header], body=b"not-json")
    no_secret(data)
    if status == 401:
        require("application/json" in headers.get("content-type", "").lower(), "duplicate_content_type")
        require(json_body(data) == {"ok": False}, "duplicate_body")
    else:
        require(status == 400 and headers.get("server", "").lower() == "vercel"
                and bool(headers.get("x-vercel-id")) and "application/json" not in headers.get("content-type", "").lower(),
                "duplicate_not_transport_rejected")
    results.append({"case": "duplicate-authorization-fields", "status": status,
                    "bodySha256": hashlib.sha256(data).hexdigest(), "transportRejected": status == 400})
    results.append(probe_json(host, "wrong-route", header, 401, {"ok": False},
                   path="/api/connectors/every-org/du-staging-wrong-route-00000000000000000001"))
    results.append(probe_json(host, "correct-invalid-json", header, 400, {"ok": False, "error": "invalid_json"}))
    results.append(probe_json(host, "correct-empty-payload", header, 400,
                             {"ok": False, "error": "missing_partner_donation_id"}, body=b"{}"))
    return results


def runtime_readiness(host):
    # Both are read-only app requests. The empty search checks readiness before
    # returning []; it never contacts Every.org or creates a provider event.
    status, headers, body = request(callback_url(host, "/donation-upgrades"))
    require(status == 200 and "text/html" in headers.get("content-type", ""), "staging_page_not_rendered")
    require(b"Move part or all of a planned donation, then add to it." in body, "staging_page_identity_missing")
    require(b"The direct Donation Upgrade rail is fail-closed." not in body, "staging_runtime_not_ready")
    no_secret(body)
    page_hash = hashlib.sha256(body).hexdigest()
    status, headers, body = request(callback_url(host, "/api/donation-upgrades/nonprofits/search"))
    require(status == 200 and "application/json" in headers.get("content-type", ""), "nonprofit_search_not_ready")
    require(json_body(body) == {"results": []}, "empty_search_contract_drift")
    no_secret(body)
    return {"renderedStagingPageReady": True, "emptyNonprofitSearchReady": True,
            "providerSearchRequestSent": False, "providerSearchConnectivityVerified": False,
            "pageBodySha256": page_hash}


def counts():
    result = {}
    key = os.environ["QA_SUPABASE_SERVICE_ROLE_KEY"]
    for table in TABLES:
        status, headers, _ = request(QA_URL + "/rest/v1/" + table + "?select=id", method="HEAD",
            headers={"apikey": key, "Authorization": "Bearer " + key, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"})
        require(status in (200, 206), "qa_count_request_failed")
        count = re.fullmatch(r"(?:\d+-\d+|\*)/(\d+)", headers.get("content-range", ""))
        require(count is not None, "qa_exact_count_missing")
        result[table] = int(count.group(1))
    return result


def verify_host(host, label):
    before = counts()
    outcome = {"host": host, "label": label, "before": before,
               "cardinalityLimitation": "Unchanged counts do not prove zero writes or unchanged row contents."}
    try:
        outcome["protection"] = host_protection(host)
        outcome["authentication"] = auth_matrix(host)
        outcome["runtimeReadiness"] = runtime_readiness(host)
    finally:
        # Read-only cardinality readback still runs after a failed probe.
        after = counts()
        outcome["after"] = after
        outcome["cardinalitiesUnchanged"] = before == after
        evidence(label + ".json", outcome)
    require(before == after, "qa_cardinality_changed")


def credentials():
    for name in SECRET_NAMES:
        value = os.environ.get(name, "")
        require(bool(value) and value == value.strip() and all(32 <= ord(c) <= 126 for c in value),
                "missing_or_invalid_" + name)
    require(bool(re.fullmatch(r"[A-Za-z0-9]{32}", os.environ["EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"])),
            "bypass_format_invalid")
    require(len(os.environ["EVERY_ORG_STAGING_PARTNER_METADATA_SECRET"]) >= 32, "metadata_secret_too_short")
    for name in PAIR:
        require(len(os.environ[name]) >= 8 and not any(c.isspace() for c in os.environ[name]), "provider_token_format_invalid")
    values = [os.environ[n] for n in SECRET_NAMES]
    require(len(values) == len(set(values)), "credentials_must_be_distinct")
    require(os.environ[PAIR[1]] != "deliberately-invalid-private-token", "private_token_matches_negative_fixture")


def local_identity():
    require(os.environ.get("GITHUB_REPOSITORY") == REPOSITORY, "repository_drift")
    require(os.environ.get("GITHUB_REF_NAME") == BRANCH, "controller_branch_drift")
    require(os.environ.get("GITHUB_ACTOR") == "ghuser29384", "actor_drift")
    require(os.environ.get("GITHUB_RUN_ATTEMPT") == "1", "rerun_forbidden")
    require(os.environ.get("PHASE2_AUTHORIZED") == "true", "phase2_not_authorized")
    require(ALIAS_UID != "REPLACE_WITH_VERIFIED_ALIAS_UID", "alias_uid_not_reviewed")
    for field in ("GITHUB_SHA", "GITHUB_RUN_ID"):
        require(bool(re.fullmatch(r"[a-zA-Z0-9_-]+", os.environ.get(field, ""))), "invalid_workflow_identity")
    result = subprocess.run(["git", "rev-parse", "HEAD", "HEAD^{tree}"], cwd=APP,
                            capture_output=True, check=False, text=True)
    require(result.returncode == 0 and result.stdout.splitlines() == [APP_SHA, APP_TREE], "app_checkout_drift")
    clean = subprocess.run(["git", "diff", "--exit-code", "HEAD", "--"], cwd=APP, capture_output=True)
    require(clean.returncode == 0, "accepted_app_modified")


def validate_test_date_change(original, fixed):
    start = 'test("candidate exposure allows only matching purpose'
    end = 'test("candidate exposure requires finite current confirmation windows"'
    require(original.count(start) == original.count(end) == 1, "validation_test_boundaries_drift")
    before, rest = original.split(start, 1)
    middle, after = rest.split(end, 1)
    injection = '    now: new Date("2026-06-14T00:00:00.000Z"),\n'
    count = 0
    for cohort in ("pilot-alpha", "pilot-beta"):
        line = '    cohortScopeId: "' + cohort + '",\n'
        count += middle.count(line)
        middle = middle.replace(line, line + injection)
    require(count == 4, "validation_date_input_count_drift")
    require(fixed == before + start + middle + end + after, "validation_test_edit_not_exact")


def tracked_tree(path):
    result = subprocess.run(["git", "ls-tree", "-rz", "HEAD"], cwd=path, capture_output=True)
    require(result.returncode == 0, "tracked_tree_read_failed")
    entries = {}
    for row in result.stdout.split(b"\0"):
        if row:
            metadata, name = row.split(b"\t", 1)
            entries[name.decode()] = metadata.decode()
    return entries


def validate_runtime_tree_equality(accepted, validation):
    accepted = dict(accepted)
    validation = dict(validation)
    require(accepted.pop(VALIDATION_TEST, None) == "100644 blob " + ORIGINAL_TEST_BLOB, "original_validation_test_blob_drift")
    require(validation.pop(VALIDATION_TEST, None) == "100644 blob " + VALIDATION_TEST_BLOB, "fixed_validation_test_blob_drift")
    require(accepted == validation and bool(accepted), "validation_runtime_source_drift")


def validation_source():
    # Full tests run against a separately pinned, test-only derivative. All
    # deployed bytes are built from the untouched accepted application checkout.
    local_identity()
    result = subprocess.run(["git", "rev-parse", "HEAD", "HEAD^{tree}"], cwd=QUALITY,
                            capture_output=True, text=True)
    require(result.returncode == 0 and result.stdout.splitlines() == [VALIDATION_SHA, VALIDATION_TREE], "validation_checkout_drift")
    clean = subprocess.run(["git", "diff", "--exit-code", "HEAD", "--"], cwd=QUALITY, capture_output=True)
    require(clean.returncode == 0, "validation_source_modified")
    validate_runtime_tree_equality(tracked_tree(APP), tracked_tree(QUALITY))
    validate_test_date_change((APP / VALIDATION_TEST).read_text(), (QUALITY / VALIDATION_TEST).read_text())
    evidence("validation-source.json", {"acceptedAppSha": APP_SHA, "acceptedAppTree": APP_TREE,
        "validationSha": VALIDATION_SHA, "validationTree": VALIDATION_TREE,
        "onlyDifferentFile": VALIDATION_TEST, "originalTestBlob": ORIGINAL_TEST_BLOB,
        "validationTestBlob": VALIDATION_TEST_BLOB, "fixedDateInputsAdded": 4,
        "runtimeTreesIdentical": True, "allAssertionsPreserved": True,
        "globalClockOverrideUsed": False, "bothBuildsUseAcceptedApp": True})


def preflight():
    validation_source()
    credentials()
    for filename in ("src/app/donation-upgrades/page.tsx", "src/app/api/donation-upgrades/nonprofits/search/route.ts",
                     "src/app/api/connectors/every-org/[routeId]/route.ts"):
        text = (APP / filename).read_text()
        require('export const dynamic = "force-dynamic";' in text and 'export const revalidate = 0;' in text,
                "runtime_route_no_longer_dynamic")
    text = (APP / "src/lib/direct-donation-upgrade.ts").read_text()
    require("runtimeEnvironment: DirectDonationUpgradeRuntimeEnvironment = process.env" in text,
            "runtime_configuration_contract_drift")
    assert_pr()
    project = protection()
    require(project.get("framework") == "nextjs", "framework_drift")
    require(project.get("rootDirectory") in (None, "", "."), "project_root_drift")
    require(project.get("nodeVersion") == "24.x", "project_node_version_drift")
    require(project.get("buildCommand") in (None, "npm run build"), "project_build_command_drift")
    require(project.get("installCommand") in (None, "npm ci", "npm install"), "project_install_command_drift")
    require(project.get("outputDirectory") in (None, ".next"), "project_output_directory_drift")
    require(isinstance(project.get("createdAt"), int), "project_created_at_missing")
    validate_deployment(api("/v13/deployments/" + BOOTSTRAP_ID), BOOTSTRAP_ID, BOOTSTRAP_HOST, bootstrap=True)
    alias = alias_read(BOOTSTRAP_ID)
    host_protection(ALIAS)
    bootstrap_probes(ALIAS)
    # A reviewed local project settings file avoids `vercel pull` and forbids
    # automatic environment download during the credential-free local build.
    settings = {"createdAt": project.get("createdAt", 0), "framework": "nextjs",
                "devCommand": None, "installCommand": "npm ci", "buildCommand": "npm run build",
                "outputDirectory": project.get("outputDirectory"), "directoryListing": False, "rootDirectory": None, "nodeVersion": "24.x"}
    data = {"orgId": TEAM, "projectId": PROJECT, "projectName": project.get("name"), "settings": settings}
    require(bool(re.fullmatch(r"[A-Za-z0-9_-]+", data["projectName"] or "")), "invalid_project_name")
    no_secret(json.dumps(data).encode())
    # Keep generated Preview linkage away from unchanged repository quality
    # gates, whose production-target validator inspects app/.vercel/project.json.
    folder = Path(os.environ["RUNNER_TEMP"]) / "every-org-phase2-build-settings"
    require(not folder.exists(), "staged_project_settings_already_exist")
    folder.mkdir(mode=0o700)
    (folder / "project.json").write_text(json.dumps(data) + "\n")
    # Empty, owned Preview dotenv input; never pull project credentials.
    (folder / ".env.preview.local").write_text("# Deliberately no project credentials\n")
    evidence("preflight.json", {"acceptedAppSha": APP_SHA, "acceptedAppTree": APP_TREE, "expectedPrHead": PR_HEAD,
        "aliasBefore": alias, "credentialNamesPresent": list(SECRET_NAMES), "allCredentialsDistinct": True,
        "protectionMode": "all_except_custom_domains", "bootstrapReverified": True, "secretValuesRetained": False})


def standalone_tree(root):
    """Validate all upload indirections before any secret reaches the uploader."""
    require(not root.is_symlink() and not root.parent.is_symlink(), "standalone_root_symlink")
    root = root.resolve()
    require(root.is_dir(), "standalone_output_missing")
    for path in root.rglob("*"):
        try:
            resolved = path.resolve(strict=True)
        except (OSError, RuntimeError):
            raise RuntimeError("standalone_invalid_link") from None
        require(resolved.is_relative_to(root), "standalone_path_escapes_output")
        if path.is_symlink():
            require(not os.path.isabs(os.readlink(path)), "standalone_absolute_symlink")
        if path.is_file():
            no_secret(path.read_bytes(), PRIVATE_BUILD_NAMES)
        if path.name == ".vc-config.json" and path.is_file():
            value = json.loads(path.read_text())
            # Pinned CLI 50.38.1 resolves map VALUES from the upload working
            # directory, two levels above .vercel/output, not this function.
            mapping = value.get("filePathMap") or {}
            require(isinstance(mapping, dict), "standalone_file_map_invalid")
            for mapped in mapping.values():
                require(isinstance(mapped, str) and not os.path.isabs(mapped), "standalone_file_map_invalid")
                try:
                    referenced = (root.parent.parent / mapped).resolve(strict=True)
                except (OSError, RuntimeError):
                    raise RuntimeError("standalone_file_map_missing") from None
                require(referenced.is_relative_to(root) and referenced.is_file(), "standalone_file_map_escapes_output")
            environment = value.get("environment") or {}
            require(isinstance(environment, dict), "function_environment_invalid")
            for key in ("EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN", "EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN",
                        "EVERY_ORG_PUBLIC_API_KEY", "EVERY_ORG_PARTNER_METADATA_SECRET", "SUPABASE_SERVICE_ROLE_KEY",
                        "EVERY_ORG_WEBHOOK_TOKEN", "MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN", "MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET"):
                require(key not in environment, "function_runtime_credential_shadow")
            for key, expected in (("DIRECT_DONATION_UPGRADES_ENABLED", "true"), ("DIRECT_DONATION_UPGRADE_MODE", "staging"),
                                  ("DIRECT_DONATION_UPGRADE_QA_FIXTURES", "false"), ("EVERY_ORG_ENVIRONMENT", "staging"),
                                  ("EVERY_ORG_PLEDGE_DONATIONS_ENABLED", "false"), ("CONDITIONAL_PAYMENTS_MODE", "disabled"),
                                  ("TRADE_DONATION_POOL_ENABLED", "false"), ("TRADE_DONATION_POOL_MODE", "disabled")):
                require(key not in environment or environment[key] == expected, "function_money_rail_override")


def artifact_manifest(root):
    entries = []
    for path in sorted(root.rglob("*")):
        mode = stat.S_IMODE(path.lstat().st_mode)
        row = {"path": path.relative_to(root).as_posix(), "mode": mode}
        if path.is_symlink():
            row.update({"type": "symlink", "target": os.readlink(path)})
        elif path.is_file():
            row.update({"type": "file", "size": path.stat().st_size,
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        elif path.is_dir():
            row["type"] = "directory"
        else:
            raise RuntimeError("unsupported_artifact_file_type")
        entries.append(row)
    serialized = json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()
    no_secret(serialized)
    return {"entries": entries, "sha256": hashlib.sha256(serialized).hexdigest(),
            "acceptedAppSha": APP_SHA, "acceptedAppTree": APP_TREE,
            "controllerCommit": os.environ["GITHUB_SHA"], "runId": os.environ["GITHUB_RUN_ID"]}


def scan_artifacts():
    standalone_tree(APP / ".vercel/output")
    scanned = 0
    for root in (APP / ".next", APP / ".vercel/output"):
        require(root.is_dir(), "required_build_output_missing")
        for path in root.rglob("*"):
            if path.is_file():
                no_secret(path.read_bytes(), PRIVATE_BUILD_NAMES)
                scanned += 1
    # Final prebuilt output and all client assets are checked, not just logs.
    build = json.loads((APP / ".vercel/output/builds.json").read_text())
    require(build.get("target") == "preview" and not build.get("error"), "prebuilt_target_invalid")
    require(all(not b.get("error") for b in build.get("builds", [])), "prebuilt_error")
    manifest = artifact_manifest(APP / ".vercel/output")
    STATE["artifactDigest"] = manifest["sha256"]
    evidence("original-artifact-manifest.json", manifest)
    evidence("artifact-scan.json", {"filesScanned": scanned, "artifactSha256": manifest["sha256"], "secretValuesFound": False,
        "runtimeTokensAbsentFromAllBuildOutput": True, "publishableQaKeyMayBeInClient": True})


def alias_snapshot():
    result, cursor = {}, None
    for _ in range(100):
        path = "/v4/aliases?limit=100" + ("&until=" + str(cursor) if cursor is not None else "")
        data = api(path)
        require(isinstance(data.get("aliases"), list), "alias_inventory_missing")
        for value in data["aliases"]:
            if value.get("projectId") == PROJECT:
                name = value.get("alias")
                require(isinstance(name, str), "alias_inventory_name_missing")
                result[name] = {"uid": value.get("uid"), "deploymentId": alias_target(value)}
        nxt = (data.get("pagination") or {}).get("next")
        if nxt is None:
            return result
        require(isinstance(nxt, int) and nxt != cursor, "alias_inventory_pagination_invalid")
        cursor = nxt
    raise RuntimeError("alias_inventory_pagination_exceeded")


def assert_other_aliases(before):
    after = alias_snapshot()
    require(all(after.get(name) == identity for name, identity in before.items() if name != ALIAS),
            "preexisting_other_alias_changed")
    for name in set(after) - set(before):
        require(name == STATE.get("deploymentHost") and after[name].get("deploymentId") == STATE.get("deploymentId"),
                "unexpected_new_alias_created")


def minimal_cli_env():
    keys = ("PATH", "HOME", "TMPDIR", "RUNNER_TEMP", "NODE_EXTRA_CA_CERTS")
    return {**{k: os.environ[k] for k in keys if k in os.environ}, "CI": "1", "NO_COLOR": "1",
            "VERCEL_TELEMETRY_DISABLED": "1", "DO_NOT_TRACK": "1"}


def runtime_env():
    return {
        "NEXT_PUBLIC_SUPABASE_URL": QA_URL,
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": os.environ["QA_SUPABASE_PUBLISHABLE_KEY"],
        "SUPABASE_SERVICE_ROLE_KEY": os.environ["QA_SUPABASE_SERVICE_ROLE_KEY"],
        "NEXT_PUBLIC_SITE_URL": "https://" + ALIAS, "SITE_URL": "https://" + ALIAS,
        "EVERY_ORG_ENVIRONMENT": "staging", "DIRECT_DONATION_UPGRADES_ENABLED": "true",
        "DIRECT_DONATION_UPGRADE_MODE": "staging", "DIRECT_DONATION_UPGRADE_QA_FIXTURES": "false",
        "EVERY_ORG_PUBLIC_API_KEY": os.environ["EVERY_ORG_STAGING_PUBLIC_API_KEY"],
        "EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN": os.environ[PAIR[0]],
        "EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN": os.environ[PAIR[1]],
        "EVERY_ORG_WEBHOOK_ROUTE_ID": ROUTE_ID,
        "EVERY_ORG_PARTNER_METADATA_SECRET": os.environ["EVERY_ORG_STAGING_PARTNER_METADATA_SECRET"],
        "EVERY_ORG_PLEDGE_DONATIONS_ENABLED": "false", "CONDITIONAL_PAYMENTS_MODE": "disabled",
        "TRADE_DONATION_POOL_ENABLED": "false", "TRADE_DONATION_POOL_MODE": "disabled",
        "EVERY_ORG_WEBHOOK_TOKEN": "", "MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN": "",
        "MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET": "", "CRON_SECRET": "",
    }


def validate_project_link(path):
    require(path.is_file() and not path.is_symlink(), "project_link_file_invalid")
    value = json.loads(path.read_text())
    require(set(value) == {"orgId", "projectId", "projectName", "settings"}, "project_link_shape_invalid")
    require(value["orgId"] == TEAM, "upload_team_drift")
    require(value["projectId"] == PROJECT, "upload_project_drift")
    require(bool(re.fullmatch(r"[A-Za-z0-9_-]+", value["projectName"] or "")), "upload_project_name_invalid")
    settings = value["settings"]
    exact = {"framework": "nextjs", "devCommand": None, "installCommand": "npm ci",
             "buildCommand": "npm run build", "directoryListing": False,
             "rootDirectory": None, "nodeVersion": "24.x"}
    require(isinstance(settings, dict) and set(settings) == set(exact) | {"createdAt", "outputDirectory"},
            "upload_settings_shape_invalid")
    require(all(settings[key] == expected for key, expected in exact.items()), "upload_settings_drift")
    require(type(settings["createdAt"]) is int and settings["createdAt"] >= 0, "upload_created_at_invalid")
    require(settings["outputDirectory"] in (None, ".next"), "upload_output_directory_drift")
    no_secret(path.read_bytes())


def validated_cli():
    expected = Path(os.environ["RUNNER_TEMP"]) / "every-org-vercel-cli/node_modules/vercel/dist/vc.js"
    cli = Path(os.environ.get("PHASE2_VERCEL_CLI", ""))
    require(cli == expected and cli.is_file() and not cli.is_symlink(), "cli_path_not_vetted")
    package = json.loads((cli.parent.parent / "package.json").read_text())
    require(package.get("name") == "vercel" and package.get("version") == "50.38.1", "cli_version_drift")
    require(hashlib.sha256(cli.read_bytes()).hexdigest() == os.environ.get("PHASE2_VERCEL_CLI_SHA256"), "cli_executable_drift")
    return str(cli)


def deploy():
    # Standalone prebuilt upload directory is outside all Git working trees.
    # This avoids inherited Git branch aliases and prevents source/config code
    # execution in the process that receives runtime secrets.
    upload = Path(os.environ["RUNNER_TEMP"]) / ("every-org-phase2-upload-" + os.environ["GITHUB_RUN_ID"])
    require(not upload.exists(), "upload_directory_already_exists")
    upload.mkdir(mode=0o700)
    try:
        (upload / ".vercel").mkdir()
        shutil.copy2(APP / ".vercel/project.json", upload / ".vercel/project.json")
        shutil.copytree(APP / ".vercel/output", upload / ".vercel/output", symlinks=True)
        standalone_tree(upload / ".vercel/output")
        for path in upload.rglob("*"):
            if path.is_file():
                no_secret(path.read_bytes(), PRIVATE_BUILD_NAMES)
        copied = artifact_manifest(upload / ".vercel/output")
        original_now = artifact_manifest(APP / ".vercel/output")
        require(copied["sha256"] == original_now["sha256"] == STATE.get("artifactDigest"), "copied_artifact_digest_mismatch")
        evidence("copied-artifact-manifest.json", {**copied, "matchesOriginal": True})
        outside_git = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=upload, capture_output=True)
        require(outside_git.returncode != 0, "upload_directory_inside_git")
        args = ["node", validated_cli(), "deploy", "--prebuilt", "--yes", "--target=preview", "--force",
                "--token", os.environ["VERCEL_TOKEN"]]
        for key, value in {"moralTradeCandidateSha": APP_SHA, "moralTradeCandidateTree": APP_TREE,
            "moralTradeExpectedPrHead": PR_HEAD, "moralTradePurpose": PURPOSE,
            "moralTradeControllerSha": os.environ["GITHUB_SHA"], "moralTradeWorkflowRunId": os.environ["GITHUB_RUN_ID"],
            "moralTradeBuildArtifactSha256": STATE["artifactDigest"]}.items():
            args += ["--meta", key + "=" + value]
        for key, value in runtime_env().items():
            args += ["--env", key + "=" + value]
        validate_project_link(upload / ".vercel/project.json")
        STATE["deploymentAttempted"] = True
        operation_state()
        # Never log args or raw CLI streams, including on errors; no blind retry.
        result = subprocess.run(args, cwd=upload, env=minimal_cli_env(), capture_output=True, timeout=1800)
        require(result.returncode == 0, "deployment_cli_failed_reconcile_before_retry")
        lines = result.stdout.decode(errors="replace").strip().splitlines()
        require(bool(lines), "deployment_url_missing_reconcile_before_retry")
        url = lines[-1].strip()
        require(bool(re.fullmatch(r"https://[a-z0-9-]+\.vercel\.app", url)), "deployment_url_invalid_reconcile_before_retry")
        host = urllib.parse.urlsplit(url).hostname
        STATE["deploymentHost"] = host
        detail = api("/v13/deployments/" + host)
        deployment_id = detail.get("id") or detail.get("uid")
        require(bool(re.fullmatch(r"dpl_[A-Za-z0-9]+", deployment_id or "")), "deployment_id_invalid")
        STATE["deploymentId"] = deployment_id
        operation_state()
        # The CLI waits for READY. Readback must confirm exact current run metadata.
        validate_deployment(detail, deployment_id, host)
        return deployment_id, host
    except subprocess.TimeoutExpired:
        raise RuntimeError("deployment_cli_timeout_reconcile_before_retry") from None
    finally:
        shutil.rmtree(upload)


def rollback(deployment_id):
    # If cutover response was lost, a single read reconciles it; never retry the
    # write. Only the exact pre-verified new target is eligible for rollback.
    current = api("/v4/aliases/" + ALIAS)
    if alias_target(current) == BOOTSTRAP_ID:
        validate_alias(current, BOOTSTRAP_ID)
        STATE["aliasAlreadyAtBootstrap"] = True
        return
    validate_alias(current, deployment_id)
    validate_deployment(api("/v13/deployments/" + deployment_id), deployment_id, STATE["deploymentHost"])
    validate_deployment(api("/v13/deployments/" + BOOTSTRAP_ID), BOOTSTRAP_ID, BOOTSTRAP_HOST, bootstrap=True)
    STATE["rollbackAttempted"] = True
    operation_state()
    result = api("/v2/deployments/" + BOOTSTRAP_ID + "/aliases", method="POST", payload={"alias": ALIAS})
    require(result.get("uid") == ALIAS_UID and result.get("alias") == ALIAS, "rollback_response_identity_drift")
    require(result.get("oldDeploymentId") == deployment_id, "rollback_previous_target_drift")
    alias_read(BOOTSTRAP_ID)
    host_protection(ALIAS)
    bootstrap_probes(ALIAS)
    alias_read(BOOTSTRAP_ID)
    STATE["rollbackConfirmed"] = True


def release():
    validation_source()
    credentials()
    assert_pr()
    protection()
    alias_read(BOOTSTRAP_ID)
    scan_artifacts()
    before_aliases = alias_snapshot()
    deployment_id, host = deploy()
    assert_other_aliases(before_aliases)
    alias_read(BOOTSTRAP_ID)
    verify_host(host, "immutable-before-cutover")
    # Recheck PR, deployment metadata, and exact alias identity immediately before write.
    assert_pr()
    protection()
    validate_deployment(api("/v13/deployments/" + deployment_id), deployment_id, host)
    before = alias_read(BOOTSTRAP_ID)
    evidence("alias-before-cutover.json", before)
    STATE["cutoverAttempted"] = True
    operation_state()
    try:
        result = api("/v2/deployments/" + deployment_id + "/aliases", method="POST", payload={"alias": ALIAS})
        require(result.get("uid") == ALIAS_UID and result.get("alias") == ALIAS, "cutover_response_identity_drift")
        require(result.get("oldDeploymentId") == BOOTSTRAP_ID, "cutover_previous_target_drift")
        STATE["cutoverConfirmed"] = True
        operation_state()
        evidence("alias-after-cutover.json", alias_read(deployment_id))
        # Both surfaces are rechecked AFTER cutover, not only the stable alias.
        verify_host(host, "immutable-after-cutover")
        verify_host(ALIAS, "alias-after-cutover-probes")
        evidence("alias-final-readback.json", alias_read(deployment_id))
        validate_deployment(api("/v13/deployments/" + deployment_id), deployment_id, host)
        protection()
        assert_other_aliases(before_aliases)
        assert_pr()
    except Exception:
        rollback(deployment_id)
        raise
    STATE["phase2Verified"] = True
    evidence("result.json", {"acceptedAppSha": APP_SHA, "acceptedAppTree": APP_TREE, "expectedPrHead": PR_HEAD,
        "deploymentId": deployment_id, "deploymentHost": host, "alias": ALIAS, "aliasUid": ALIAS_UID,
        "target": "preview", "controllerCommit": os.environ["GITHUB_SHA"], "runId": os.environ["GITHUB_RUN_ID"],
        "artifactSha256": STATE["artifactDigest"], "validationSha": VALIDATION_SHA, "validationTree": VALIDATION_TREE,
        "runtimeTreesIdentical": True, "bothBuildsUseAcceptedApp": True, "directDonationUpgradeEnabled": True, "directDonationUpgradeMode": "staging",
        "managedAndProductionMoneyPathsEnabled": False, "runtimeOnlyReplacementPair": True, "syntheticAuthenticationVerified": True,
        "providerOriginDeliveryObserved": False, "providerUatComplete": False,
        "checkoutAttempted": False, "donationAttempted": False, "databaseWriteRequestIssued": False,
        "cardinalityLimitation": "Unchanged counts do not prove zero writes or unchanged row contents.",
        "otherPreexistingProjectAliasesUnchanged": True, "prDraftAndUnmerged": True,
        "secretValuesRetained": False, "nextGate": "separately_authorized_provider_origin_test_no_checkout"})


def operation_state():
    evidence("operation-state.json", {**STATE, "alias": ALIAS, "aliasUid": ALIAS_UID,
        "bootstrapId": BOOTSTRAP_ID, "secretValuesRetained": False,
        "nextActionIfUnconfirmed": "read_only_reconciliation_no_automatic_write_retry"})


def sanitize():
    removed = 0
    EVIDENCE.mkdir(exist_ok=True)
    for path in EVIDENCE.iterdir():
        if not path.is_file():
            continue
        try:
            require(path.suffix == ".json", "unexpected_evidence_file")
            no_secret(path.read_bytes())
        except RuntimeError:
            path.unlink()
            removed += 1
    evidence("sanitization.json", {"secretBearingOrUnexpectedFilesRemoved": removed,
                                   "rawHttpBodiesRetained": False, "rawCliLogsRetained": False})
    require(removed == 0, "evidence_sanitization_removed_files")


def run():
    command = sys.argv[1] if len(sys.argv) == 2 else ""
    try:
        require(command in ("preflight", "release", "sanitize", "validation-source"), "invalid_command")
        {"preflight": preflight, "release": release, "sanitize": sanitize, "validation-source": validation_source}[command]()
        return 0
    except RuntimeError as exc:
        # Controlled labels only; never format subprocess or network exceptions.
        STATE["failureLabel"] = str(exc)
        print("Phase 2 halted: " + str(exc), file=sys.stderr)
        return 1
    except Exception:
        STATE["failureLabel"] = "unexpected_error_details_suppressed"
        print("Phase 2 halted: unexpected_error_details_suppressed", file=sys.stderr)
        return 1
    finally:
        if command == "release":
            operation_state()


if __name__ == "__main__":
    sys.exit(run())
