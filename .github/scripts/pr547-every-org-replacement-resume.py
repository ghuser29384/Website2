"""One-use verification/cutover of the exact already-built protected Preview.
No deployment, build, provider event, secret retrieval, or raw HTTP retention.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location("phase2", Path(__file__).with_name("pr547-every-org-replacement-phase2.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
ORIGIN_SHA = "c6be3728634758726cb698729825b9b3f3a4d19f"
ORIGIN_RUN = "37094660246"
ORIGIN_ARTIFACT = 11264100853
ORIGIN_ARTIFACT_DIGEST = "sha256:fce0636c1708d10bff43a8cbd0dc8c48b21d6f1b9eaf3b33aa06deaa7ce3b13a"
DEPLOYMENT_ID = "dpl_GmverGqmU6qf4N1xgei7GzUESFbu"
HOST = "moraltrade-site-c16vyp41l-ellen-s.vercel.app"
DIGEST = "3d6c165be5232b3c0c187b4c922815ea0488d1b5588835dedb359e6dee3a95ea"
PINNED_RECEIPT_DIGESTS = {'artifact-scan.json': '90c13939bf81ddb6827f5622d64e8d0e30c7f29b88dbb46db24062469bacd9a9', 'build.json': 'da536ca0836d78ad9015053f0d5ae2066444f9d53ea4278540cadca81bdbbd47', 'copied-artifact-manifest.json': '4bd5e3a3d2a4753f735a4388d453c2fc2d62724ea6eba2632226ec6b2e68b1bc', 'disabled-build.json': '6b85657ab582ea890b00d13380062a9a6117671a402c891a9e548e5b387bc0fc', 'gates.json': '1859d8aae9041da223e6b590eff3f538fd9beabf29e1e4fe97fcd8d86d596ad6', 'immutable-before-cutover.json': '4802e3f62b91fe5c8722da3c5b9779ebbc513c539bc0f04151be7e3a42875c87', 'operation-state.json': '1145f936d07a748145d013ace30e5c9f22dfefa8b8ae90694f0c31034e732cec', 'original-artifact-manifest.json': '4e12a6ff0aa7ccf65c0c4f500ecd64e236f34835851d1468c68c3d982ccb808a', 'preflight.json': '941f92f4a9976f06a9e06d305eccc92c5a262ad87dc306cf3bd7f3a6e65fa356', 'sanitization.json': 'f47dd89ee1ab6e63d215eaba44663b1d58a7c9f098affb2187187058e4217dc6', 'validation-source.json': '074b94e64dad21326a9081d020a18fce211f1abfa96a38e131c53e15ac42412f'}
PRIOR = Path("prior-evidence")
MARKER = ".github/pr547-every-org-replacement-resume-v1-20261003.authorize"


def github(suffix):
    status, _, body = m.request("https://api.github.com/repos/" + m.REPOSITORY + suffix,
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"], "User-Agent": m.PURPOSE,
                 "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
    m.require(status == 200, "origin_github_read_failed")
    return m.json_body(body)


def receipt(name):
    path = PRIOR / name
    m.require(PRIOR.is_dir() and not PRIOR.is_symlink() and path.is_file() and not path.is_symlink(), "prior_receipt_path_invalid")
    data = path.read_bytes()
    m.no_secret(data)
    m.require(hashlib.sha256(data).hexdigest() == PINNED_RECEIPT_DIGESTS.get(name), "prior_receipt_digest_mismatch")
    return m.json_body(data)


def verify_prior_evidence():
    expected_names = {"artifact-scan.json", "build.json", "copied-artifact-manifest.json", "disabled-build.json", "gates.json", "immutable-before-cutover.json", "operation-state.json", "original-artifact-manifest.json", "preflight.json", "sanitization.json", "validation-source.json"}
    m.require(PRIOR.is_dir() and not PRIOR.is_symlink() and {p.name for p in PRIOR.iterdir()} == expected_names, "prior_receipt_set_invalid")
    m.require(all(p.is_file() and not p.is_symlink() for p in PRIOR.iterdir()), "prior_receipt_entry_invalid")
    for name in expected_names:
        receipt(name)
    run = github("/actions/runs/" + ORIGIN_RUN)
    m.require(str(run.get("id")) == ORIGIN_RUN and run.get("head_sha") == ORIGIN_SHA
              and run.get("head_branch") == m.BRANCH and run.get("run_attempt") == 1
              and run.get("status") == "completed" and run.get("conclusion") == "failure", "origin_run_drift")
    artifact = github("/actions/artifacts/" + str(ORIGIN_ARTIFACT))
    m.require(artifact.get("id") == ORIGIN_ARTIFACT and artifact.get("digest") == ORIGIN_ARTIFACT_DIGEST
              and artifact.get("name") == "every-org-replacement-phase2-" + ORIGIN_RUN
              and (artifact.get("workflow_run") or {}).get("head_sha") == ORIGIN_SHA
              and artifact.get("expired") is False and (artifact.get("workflow_run") or {}).get("id") == int(ORIGIN_RUN), "origin_artifact_drift")
    jobs = github("/actions/runs/" + ORIGIN_RUN + "/jobs?per_page=100").get("jobs", [])
    m.require(len(jobs) == 2 and next((j for j in jobs if j.get("name") == "control"), {}).get("conclusion") == "success", "origin_control_not_passed")
    job = next((j for j in jobs if j.get("name") == "build_deploy_verify"), {})
    stages = {s.get("name"): s.get("conclusion") for s in job.get("steps", [])}
    for stage in ("Prove exact test-only delta and runtime equality before dependency installation",
                  "Run credential-free focused and complete repository gates",
                  "Run separate disabled-money quality build without credentials",
                  "Build fresh staging standalone Preview with runtime credentials still absent",
                  "Sanitize the bounded evidence before upload", "Retain only successful sanitization output"):
        m.require(stages.get(stage) == "success", "origin_successful_stage_missing")
    m.require(stages.get("Scan final artifacts then deploy verify and guarded-cutover only the new stable alias") == "failure", "origin_failure_stage_drift")
    validation = receipt("validation-source.json")
    m.require(validation.get("acceptedAppSha") == m.APP_SHA and validation.get("acceptedAppTree") == m.APP_TREE
              and validation.get("validationSha") == m.VALIDATION_SHA and validation.get("validationTree") == m.VALIDATION_TREE
              and validation.get("onlyDifferentFile") == m.VALIDATION_TEST and validation.get("runtimeTreesIdentical") is True
              and validation.get("allAssertionsPreserved") is True and validation.get("fixedDateInputsAdded") == 4
              and validation.get("globalClockOverrideUsed") is False and validation.get("bothBuildsUseAcceptedApp") is True,
              "origin_validation_source_invalid")
    gates = receipt("gates.json")
    m.require(all(gates.get(k) is True for k in ("focusedTests", "completeRepositoryTests", "typecheck", "lint", "runtimeTreesIdentical"))
              and gates.get("applicationCredentialsAvailable") is False and gates.get("validationSha") == m.VALIDATION_SHA
              and gates.get("runtimeSourceSha") == m.APP_SHA, "origin_quality_gates_invalid")
    m.require(receipt("disabled-build.json") == {"disabledMoneyQualityBuild": True, "providerCredentialsAvailable": False}, "origin_disabled_build_invalid")
    m.require(receipt("build.json") == {"freshStagingPreviewBuild": True, "standalonePrebuilt": True,
              "providerCredentialsAvailable": False, "privilegedDatabaseCredentialsAvailable": False}, "origin_staging_build_invalid")
    scan = receipt("artifact-scan.json")
    m.require(scan.get("artifactSha256") == DIGEST and scan.get("secretValuesFound") is False
              and scan.get("runtimeTokensAbsentFromAllBuildOutput") is True and scan.get("filesScanned", 0) > 0, "origin_artifact_scan_invalid")
    manifests = [receipt("original-artifact-manifest.json"), receipt("copied-artifact-manifest.json")]
    for manifest in manifests:
        actual = hashlib.sha256(json.dumps(manifest.get("entries"), sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        m.require(actual == manifest.get("sha256") == DIGEST and manifest.get("acceptedAppSha") == m.APP_SHA
                  and manifest.get("acceptedAppTree") == m.APP_TREE and manifest.get("controllerCommit") == ORIGIN_SHA
                  and str(manifest.get("runId")) == ORIGIN_RUN, "origin_manifest_invalid")
    m.require(manifests[1].get("matchesOriginal") is True, "origin_upload_manifest_not_matched")
    state = receipt("operation-state.json")
    m.require(state.get("deploymentAttempted") is True and state.get("deploymentId") == DEPLOYMENT_ID
              and state.get("deploymentHost") == HOST and state.get("artifactDigest") == DIGEST
              and state.get("cutoverAttempted") is False and state.get("cutoverConfirmed") is False
              and state.get("rollbackAttempted") is False and state.get("phase2Verified") is False
              and state.get("failureLabel") == "secret_in_output", "origin_operation_state_invalid")
    m.require(receipt("sanitization.json") == {"secretBearingOrUnexpectedFilesRemoved": 0,
              "rawHttpBodiesRetained": False, "rawCliLogsRetained": False}, "origin_sanitization_invalid")
    m.evidence("origin-evidence-verification.json", {"originControllerCommit": ORIGIN_SHA, "originRunId": ORIGIN_RUN,
        "originArtifactId": ORIGIN_ARTIFACT, "originArtifactDigest": ORIGIN_ARTIFACT_DIGEST,
        "artifactSha256": DIGEST, "qualityGatesAndBothBuildsVerified": True, "privateArtifactScanVerified": True,
        "originalAndUploadManifestsVerified": True, "priorCutoverAttempted": False,
        "acceptedAppSha": m.APP_SHA, "acceptedAppTree": m.APP_TREE, "validationSha": m.VALIDATION_SHA})


def resume():
    m.require(os.environ.get("PHASE2_RESUME_AUTHORIZED") == "true", "resume_not_authorized")
    m.validation_source()
    m.credentials()
    verify_prior_evidence()
    m.STATE.update({"deploymentId": DEPLOYMENT_ID, "deploymentHost": HOST, "artifactDigest": DIGEST,
        "deploymentOriginController": ORIGIN_SHA, "deploymentOriginRun": ORIGIN_RUN,
        "existingDeploymentResumed": True, "newDeploymentCreated": False})
    m.assert_pr()
    m.protection()
    m.validate_deployment(m.api("/v13/deployments/" + m.BOOTSTRAP_ID), m.BOOTSTRAP_ID, m.BOOTSTRAP_HOST, bootstrap=True)
    m.alias_read(m.BOOTSTRAP_ID)
    m.validate_deployment(m.api("/v13/deployments/" + DEPLOYMENT_ID), DEPLOYMENT_ID, HOST)
    before_aliases = m.alias_snapshot()
    m.verify_host(HOST, "immutable-before-cutover")
    m.assert_pr()
    m.protection()
    m.validate_deployment(m.api("/v13/deployments/" + DEPLOYMENT_ID), DEPLOYMENT_ID, HOST)
    m.assert_other_aliases(before_aliases)
    m.evidence("alias-before-cutover.json", m.alias_read(m.BOOTSTRAP_ID))
    m.STATE["cutoverAttempted"] = True
    m.operation_state()
    try:
        result = m.api("/v2/deployments/" + DEPLOYMENT_ID + "/aliases", method="POST", payload={"alias": m.ALIAS})
        m.require(result.get("uid") == m.ALIAS_UID and result.get("alias") == m.ALIAS, "cutover_response_identity_drift")
        m.require(result.get("oldDeploymentId") == m.BOOTSTRAP_ID, "cutover_previous_target_drift")
        m.STATE["cutoverConfirmed"] = True
        m.operation_state()
        m.evidence("alias-after-cutover.json", m.alias_read(DEPLOYMENT_ID))
        m.verify_host(HOST, "immutable-after-cutover")
        m.verify_host(m.ALIAS, "alias-after-cutover-probes")
        m.evidence("alias-final-readback.json", m.alias_read(DEPLOYMENT_ID))
        m.validate_deployment(m.api("/v13/deployments/" + DEPLOYMENT_ID), DEPLOYMENT_ID, HOST)
        m.protection()
        m.assert_other_aliases(before_aliases)
        m.assert_pr()
    except Exception:
        m.rollback(DEPLOYMENT_ID)
        raise
    m.STATE["phase2Verified"] = True
    m.evidence("result.json", {"acceptedAppSha": m.APP_SHA, "acceptedAppTree": m.APP_TREE, "expectedPrHead": m.PR_HEAD,
        "validationSha": m.VALIDATION_SHA, "validationTree": m.VALIDATION_TREE, "runtimeTreesIdentical": True,
        "deploymentId": DEPLOYMENT_ID, "deploymentHost": HOST, "alias": m.ALIAS, "aliasUid": m.ALIAS_UID,
        "target": "preview", "controllerCommit": os.environ["GITHUB_SHA"], "runId": os.environ["GITHUB_RUN_ID"],
        "originControllerCommit": ORIGIN_SHA, "originRunId": ORIGIN_RUN, "artifactSha256": DIGEST,
        "newDeploymentCreated": False, "syntheticAuthenticationVerified": True, "runtimeReadinessVerified": True,
        "pageReadinessBypassMode": "header", "callbackAuthenticationBypassMode": "query", "configuredValueScanPassed": True,
        "managedAndProductionMoneyPathsEnabled": False, "providerOriginDeliveryObserved": False, "providerUatComplete": False,
        "checkoutAttempted": False, "donationAttempted": False, "databaseWriteRequestIssued": False,
        "cardinalityLimitation": "Unchanged counts do not prove zero writes or unchanged row contents.",
        "otherPreexistingProjectAliasesUnchanged": True, "prDraftAndUnmerged": True,
        "secretValuesRetained": False, "nextGate": "separately_authorized_provider_origin_test_no_checkout"})


def run():
    try:
        resume()
        return 0
    except RuntimeError as exc:
        m.STATE["failureLabel"] = str(exc)
        print("Existing Preview continuation halted: " + str(exc), file=sys.stderr)
        return 1
    except Exception:
        m.STATE["failureLabel"] = "unexpected_error_details_suppressed"
        print("Existing Preview continuation halted; raw details suppressed", file=sys.stderr)
        return 1
    finally:
        m.operation_state()


if __name__ == "__main__":
    sys.exit(run())
