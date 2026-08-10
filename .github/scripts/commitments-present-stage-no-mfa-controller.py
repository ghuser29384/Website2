#!/usr/bin/env python3
"""Apply the present-stage Commitments governance decision without weakening other gates."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path


OLD_BLOCKER = "founder_aal2_session_not_yet_verified"
NEW_BLOCKER = "founder_approver_account_not_yet_configured"
WRAPPERS = [
    "trade.json",
    "co_fund.json",
    "threshold_funding.json",
    "donation_upgrade.json",
    "threshold_sign_on.json",
    "donation_redirect.json",
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def replace_exact(text: str, old: str, new: str, expected: int, label: str) -> str:
    actual = text.count(old)
    if actual != expected:
        raise SystemExit(f"{label}: expected {expected} occurrences, found {actual}")
    return text.replace(old, new)


def edit_repo(root: Path) -> None:
    target_sha = os.environ["EXPECTED_TARGET_SHA"]
    main_sha = os.environ["EXPECTED_MAIN_SHA"]
    migration_version = os.environ["MIGRATION_VERSION"]
    migration_name = os.environ["MIGRATION_NAME"]
    migration_path = os.environ["MIGRATION_PATH"]
    qa_ref = os.environ["EXPECTED_QA_REF"]

    wrapper_dir = root / "docs/commitments/impact-methodologies-v1"
    for filename in WRAPPERS:
        path = wrapper_dir / filename
        payload = json.loads(read(path))
        blockers = payload.get("approvalBlockers")
        if not isinstance(blockers, list) or blockers.count(OLD_BLOCKER) != 1:
            raise SystemExit(f"{path}: stale AAL2 blocker shape is not exact")
        payload["approvalBlockers"] = [
            NEW_BLOCKER if item == OLD_BLOCKER else item for item in blockers
        ]
        write(path, json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

    manifest_path = wrapper_dir / "manifest.json"
    manifest = json.loads(read(manifest_path))
    expected_global = (
        "the selected founder approver must enroll authenticator MFA and establish a real AAL2 session"
    )
    replacement_global = (
        "the selected founder account must be configured as an active impact-model approver "
        "and use an authenticated session"
    )
    if manifest.get("globalApprovalBlockers", []).count(expected_global) != 1:
        raise SystemExit("manifest global MFA blocker is not exact")
    manifest["globalApprovalBlockers"] = [
        replacement_global if item == expected_global else item
        for item in manifest["globalApprovalBlockers"]
    ]
    for entry in manifest.get("methodologies", []):
        blockers = entry.get("approvalBlockers")
        if not isinstance(blockers, list) or blockers.count(OLD_BLOCKER) != 1:
            raise SystemExit(
                f"manifest entry {entry.get('mechanismFamily')} has unexpected blocker state"
            )
        entry["approvalBlockers"] = [
            NEW_BLOCKER if item == OLD_BLOCKER else item for item in blockers
        ]
    manifest["generatedAtUtc"] = "2026-08-10T01:38:45Z"
    manifest["status"] = (
        "review_ready_current_main_synced_qa_authenticated_approver_migration_verified_"
        "not_approved_not_active"
    )
    manifest["sourcePullRequestHead"] = target_sha
    manifest["currentMainAtPreparation"] = main_sha
    manifest["currentMainMergeCommit"] = target_sha
    manifest["currentStageApprovalSecurity"] = {
        "mfaRequired": False,
        "mfaDeferredUntil": "site_high_leverage",
        "approverRequirement": "authenticated_active_allowlisted_account",
        "qaProjectRef": qa_ref,
        "qaMigrationVersion": migration_version,
        "qaMigrationName": migration_name,
        "status": "applied_and_verified",
        "productionApplied": False,
    }
    write(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    review_path = root / "docs/commitments/impact-methodologies-v1-review.md"
    review = read(review_path)
    review = replace_exact(
        review,
        "**Status:** current-main synchronized; QA RLS hardening applied and verified; "
        "not approved; not active; not deployed to production",
        "**Status:** current-main synchronized; QA RLS hardening and present-stage "
        "authenticated-approver governance applied and verified; MFA deferred until the site "
        "is high-leverage; not approved; not active; not deployed to production",
        1,
        "review status",
    )
    review = replace_exact(
        review,
        "- Current `main` merged into the feature branch: "
        "`bb3b0e4608b7282aecc9d1fe11b5cb310c409347`\n"
        "- Current-main synchronization merge commit: "
        "`d34398baeae99ea99d87c97576ef3280dd5b9b57`",
        f"- Current `main` merged into the feature branch: `{main_sha}`\n"
        f"- Current-main synchronization merge commit: `{target_sha}`",
        1,
        "review current-main state",
    )
    review = replace_exact(
        review,
        "- Exact normalized migration SHA-256: "
        "`33bc1fefed0298a1643bd37956b9c8850ccffd8805d66403439e4c1ab60e5bf4`\n"
        "- Production database and production deployment: unchanged by this continuation",
        "- Exact normalized migration SHA-256: "
        "`33bc1fefed0298a1643bd37956b9c8850ccffd8805d66403439e4c1ab60e5bf4`\n"
        f"- QA present-stage approver migration: `{migration_version}_{migration_name}.sql`\n"
        "- Current approval requirement: authenticated active allowlisted founder account; "
        "MFA is not required at the present stage\n"
        "- MFA reconsideration point: when Moral Trade becomes high-leverage, including "
        "meaningful users, funds, irreversible commitments, or concentrated production control\n"
        "- Production database and production deployment: unchanged by this continuation",
        1,
        "review QA migration metadata",
    )
    approval_heading = "## Approval and activation sequence\n"
    if review.count(approval_heading) != 1:
        raise SystemExit("review approval heading is not exact")
    security_section = (
        "## Present-stage approval security\n\n"
        "The selected founder account must be explicitly configured in the audited "
        "`impact_model_approvers` allowlist and must use an authenticated session. MFA/AAL2 is "
        "deliberately not a present-stage requirement. The optional AAL2 check remains available "
        "in the database so a later migration can require it once Moral Trade is high-leverage "
        "without changing the approver roster, exact-hash audit trail, or model-health gates. "
        "Exact methodology hashes, append-only approval events, active-approver status, and "
        "current passing model health remain mandatory.\n\n"
    )
    review = review.replace(approval_heading, security_section + approval_heading)
    review = replace_exact(
        review,
        "3. Enroll authenticator MFA for the selected founder approver and verify a real AAL2 "
        "session on `/dashboard#account-security`.",
        "3. Configure the selected founder account as an active impact-model approver and use an "
        "authenticated session. MFA is explicitly deferred until the site is high-leverage.",
        1,
        "approval step 3",
    )
    review = replace_exact(
        review,
        "6. Record explicit AAL2 founder approval for each exact hash.",
        "6. Record explicit authenticated founder approval for each exact hash.",
        1,
        "approval step 6",
    )
    review = replace_exact(
        review,
        "- Founder authenticator MFA / AAL2 has not been verified.",
        "- The selected founder account has not yet been configured as an active impact-model "
        "approver.",
        1,
        "review blocker",
    )
    write(review_path, review)

    validator_path = root / "scripts/validate-commitments-impact-methodologies.mjs"
    validator = read(validator_path)
    validator = replace_exact(
        validator,
        "\nfunction canonicalize(value) {",
        "\nconst CURRENT_STAGE_APPROVER_BLOCKER = "
        '"founder_approver_account_not_yet_configured";\n'
        "const RETIRED_PRESENT_STAGE_BLOCKER = "
        '"founder_aal2_session_not_yet_verified";\n\n'
        "function canonicalize(value) {",
        1,
        "validator constants",
    )
    validator = replace_exact(
        validator,
        'assert(manifest.qaRlsHardening?.productionApplied === false, "Manifest must not claim '
        'production migration.");',
        'assert(manifest.qaRlsHardening?.productionApplied === false, "Manifest must not claim '
        'production migration.");\n'
        'assert(manifest.currentStageApprovalSecurity?.mfaRequired === false, "Present-stage '
        'manifest must not require MFA.");\n'
        'assert(manifest.currentStageApprovalSecurity?.mfaDeferredUntil === "site_high_leverage", '
        '"MFA deferral stage is missing.");\n'
        'assert(manifest.currentStageApprovalSecurity?.approverRequirement === '
        '"authenticated_active_allowlisted_account", "Present-stage approver requirement is '
        'invalid.");\n'
        'assert(manifest.currentStageApprovalSecurity?.qaMigrationVersion === "20260810013845", '
        '"Present-stage QA governance migration is not bound.");\n'
        'assert(!JSON.stringify(manifest.globalApprovalBlockers).match(/aal2|authenticator|mfa/i), '
        '"Present-stage global blockers must not retain MFA/AAL2.");',
        1,
        "validator manifest policy",
    )
    validator = replace_exact(
        validator,
        "  assert(entry.methodologyHash === expectedHash, `${mechanism} manifest hash mismatch.`);",
        "  assert(entry.methodologyHash === expectedHash, `${mechanism} manifest hash mismatch.`);\n"
        "  assert(entry.approvalBlockers.includes(CURRENT_STAGE_APPROVER_BLOCKER), `${mechanism} "
        "present-stage approver blocker is missing.`);\n"
        "  assert(!entry.approvalBlockers.includes(RETIRED_PRESENT_STAGE_BLOCKER), `${mechanism} "
        "retains the retired AAL2 blocker.`);",
        1,
        "validator entry blocker policy",
    )
    validator = replace_exact(
        validator,
        "  assert(\n"
        "    JSON.stringify(wrapper.approvalBlockers) === JSON.stringify(entry.approvalBlockers),\n"
        "    `${mechanism} manifest/file blockers differ.`,\n"
        "  );",
        "  assert(\n"
        "    JSON.stringify(wrapper.approvalBlockers) === JSON.stringify(entry.approvalBlockers),\n"
        "    `${mechanism} manifest/file blockers differ.`,\n"
        "  );\n"
        "  assert(wrapper.approvalBlockers.includes(CURRENT_STAGE_APPROVER_BLOCKER), "
        "`${mechanism} wrapper present-stage approver blocker is missing.`);\n"
        "  assert(!wrapper.approvalBlockers.includes(RETIRED_PRESENT_STAGE_BLOCKER), "
        "`${mechanism} wrapper retains the retired AAL2 blocker.`);",
        1,
        "validator wrapper blocker policy",
    )
    write(validator_path, validator)

    workflow_path = root / ".github/workflows/commitments-impact-accounting-gates.yml"
    workflow = read(workflow_path)
    workflow = replace_exact(
        workflow,
        '      - "supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql"',
        '      - "supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql"\n'
        '      - "supabase/migrations/20260810013845_commitments_impact_present_stage_'
        'authenticated_approver.sql"',
        1,
        "workflow trigger path",
    )
    workflow = replace_exact(
        workflow,
        "          supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql\n"
        "          supabase/tests/commitments_impact_accounting_phase1.sql",
        "          supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql\n"
        "          supabase/migrations/20260810013845_commitments_impact_present_stage_"
        "authenticated_approver.sql\n"
        "          supabase/tests/commitments_impact_accounting_phase1.sql",
        1,
        "workflow required file",
    )
    workflow = replace_exact(
        workflow,
        "              supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql) ;;",
        "              supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql|\\\n"
        "              supabase/migrations/20260810013845_commitments_impact_present_stage_"
        "authenticated_approver.sql) ;;",
        1,
        "workflow allowlist",
    )
    workflow = replace_exact(
        workflow,
        "            printf '%s\\n' supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql",
        "            printf '%s\\n' supabase/migrations/20260808174259_mpgf_public_goods_public_read_rls.sql\n"
        "            printf '%s\\n' supabase/migrations/20260810013845_commitments_impact_"
        "present_stage_authenticated_approver.sql",
        1,
        "workflow migration inventory",
    )
    write(workflow_path, workflow)

    test_path = root / "supabase/tests/commitments_impact_accounting_phase1.sql"
    sql_test = read(test_path)
    sql_test = replace_exact(
        sql_test,
        "      ('20260806135201', 'commitments_impact_approver_event_comment_fix')",
        "      ('20260806135201', 'commitments_impact_approver_event_comment_fix'),\n"
        "      ('20260810013845', 'commitments_impact_present_stage_authenticated_approver')",
        1,
        "SQL expected migration",
    )
    guard_pattern = re.compile(r"do \$aal1_guard\$.*?\$aal1_guard\$;", re.S)
    guard_replacement = """do $present_stage_auth_guard$
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'The configured account was not recognized as a present-stage authenticated approver.';
  end if;
  if public.is_impact_model_approver(true) then
    raise exception 'AAL1 unexpectedly satisfied the optional future AAL2 check.';
  end if;
end;
$present_stage_auth_guard$;"""
    sql_test, count = guard_pattern.subn(guard_replacement, sql_test, count=1)
    if count != 1:
        raise SystemExit(f"SQL present-stage guard replacement count: {count}")

    marker = "$present_stage_auth_guard$;\n\nreset role;\n"
    if sql_test.count(marker) != 1:
        raise SystemExit("SQL insertion marker is not exact")
    unconfigured_guard = """
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

do $unconfigured_approver_guard$
begin
  begin
    perform public.submit_impact_model_version_for_review(
      '7a100000-0000-4000-8000-000000000010'
    );
    raise exception 'An unconfigured authenticated user unexpectedly submitted an impact model.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.review_impact_model_version(
      '7a100000-0000-4000-8000-000000000010',
      'approve',
      'This must not be recorded.'
    );
    raise exception 'An unconfigured authenticated user unexpectedly reviewed an impact model.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.activate_impact_model_version(
      '7a100000-0000-4000-8000-000000000010'
    );
    raise exception 'An unconfigured authenticated user unexpectedly activated an impact model.';
  exception
    when insufficient_privilege then null;
  end;
end;
$unconfigured_approver_guard$;

reset role;
"""
    sql_test = sql_test.replace(marker, marker + "\n" + unconfigured_guard, 1)
    auth_aal2 = "'role', 'authenticated',\n    'aal', 'aal2'"
    auth_aal1 = "'role', 'authenticated',\n    'aal', 'aal1'"
    if sql_test.count(auth_aal2) != 2:
        raise SystemExit(
            f"Expected two authenticated AAL2 fixtures, found {sql_test.count(auth_aal2)}"
        )
    sql_test = sql_test.replace(auth_aal2, auth_aal1)
    if "AAL1 unexpectedly submitted an impact model for review" in sql_test:
        raise SystemExit("Retired AAL1 denial assertion remains in SQL test")
    write(test_path, sql_test)

    inspected = [review_path, validator_path, manifest_path] + [
        wrapper_dir / item for item in WRAPPERS
    ]
    for path in inspected:
        text = read(path)
        if OLD_BLOCKER in text:
            raise SystemExit(f"{path}: retired blocker remains")
    if Path(migration_path).name not in read(workflow_path):
        raise SystemExit("New migration is not bound into the gate workflow")


def edit_pr_body(input_path: Path, output_path: Path, new_sha: str) -> None:
    payload = json.loads(read(input_path))
    body = payload["body"]
    old_head = "a86464941e459e39b786da2d3d6ee14dfdc9285f"
    old_main = "bb3b0e4608b7282aecc9d1fe11b5cb310c409347"
    main_sha = os.environ["EXPECTED_MAIN_SHA"]
    target_sha = os.environ["EXPECTED_TARGET_SHA"]

    replacements = [
        (
            "The branch is synchronized with the recorded current `main` base, and the exact "
            "final head passed the dedicated code and QA gates. No methodology is approved or "
            "active, no modeled estimate has been published, no production migration has been "
            "applied, and this PR must remain draft and must not be merged or deployed yet.",
            "The branch is synchronized with current `main`. The QA database now enforces the "
            "founder decision that an authenticated active allowlisted approver is sufficient at "
            "the present stage; MFA is deferred until Moral Trade is high-leverage. The prior head "
            "passed dedicated code and QA gates, while the current continuation head is undergoing "
            "a new exact-head gate run. No methodology is approved or active, no modeled estimate "
            "has been published, no production migration has been applied, and this PR remains "
            "draft and must not be merged or deployed yet.",
        ),
        (
            f"- Pull request #534 and its exact final head `{old_head}`.",
            f"- Pull request #534 and its current continuation head `{new_sha}`.",
        ),
        (
            "- **Deployment target / plan:** Keep PR #534 draft. After the selected founder account "
            "has an enrolled authenticator factor and a verified AAL2 session, each exact methodology "
            "hash has been substantively reviewed, eligible empirical calibration evidence and passing "
            "model-health records exist, and a separate production release is explicitly authorized, "
            "apply the exact reviewed migrations to the production Moral Trade Supabase project, "
            "configure only the selected approver, merge the exact reviewed head, and promote the "
            "corresponding immutable Vercel deployment to the canonical production aliases.",
            "- **Deployment target / plan:** Keep PR #534 draft. After the selected founder account "
            "is configured as an active impact-model approver, each exact methodology hash has been "
            "substantively reviewed, eligible empirical calibration evidence and passing model-health "
            "records exist, and a separate production release is explicitly authorized, apply the exact "
            "reviewed migrations to the production Moral Trade Supabase project, configure only the "
            "selected approver, merge the exact reviewed head, and promote the corresponding immutable "
            "Vercel deployment to the canonical production aliases. MFA is deferred until Moral Trade "
            "is high-leverage.",
        ),
        (
            "verify founder AAL2 governance boundaries",
            "verify authenticated active-approver governance boundaries",
        ),
        (
            f"Exact final head `{old_head}` was exercised by pull-request run `31271444845` and "
            "independent push run `31271442346`. The executed gates included:",
            f"Prior exact head `{old_head}` was exercised by pull-request run `31271444845` and "
            f"independent push run `31271442346`. The current authenticated-approver continuation "
            f"head `{new_sha}` requires its dedicated post-push exact-head gate result before merge. "
            "The prior executed gates included:",
        ),
        (
            f"- **Merged commit:** None. PR #534 remains open and draft at head `{old_head}`.",
            f"- **Merged commit:** None. PR #534 remains open and draft at current head `{new_sha}`.",
        ),
        (
            "The production project currently has no verified authenticator MFA factor; no exact "
            "methodology hash is approved;",
            "The production approver account is not yet configured; no exact methodology hash is approved;",
        ),
        (
            "- Governance actions require the exact approved methodology hash and a real AAL2 session.",
            "- Governance actions require the exact approved methodology hash and an authenticated "
            "active allowlisted approver account. MFA is deferred until Moral Trade is high-leverage.",
        ),
        (
            "All six remain `under_review` and retain founder-AAL2, exact-hash, empirical-calibration, "
            "and model-health blockers.",
            "All six remain `under_review` and retain authenticated-founder-approver, exact-hash, "
            "empirical-calibration, and model-health blockers.",
        ),
        (
            f"- Current `main` incorporated at preparation: `{old_main}`\n"
            "- Current-main synchronization merge: `d34398baeae99ea99d87c97576ef3280dd5b9b57`\n"
            f"- Exact final continuation head: `{old_head}`",
            f"- Current `main` incorporated at preparation: `{main_sha}`\n"
            f"- Current-main synchronization merge: `{target_sha}`\n"
            f"- Current authenticated-approver continuation head: `{new_sha}`",
        ),
        (
            "1. Enroll authenticator MFA for the selected production approver account and verify a "
            "real AAL2 session.\n2. Complete substantive review of the six exact methodologies;",
            "1. Configure the selected founder account as the active production impact-model approver; "
            "an authenticated session is sufficient at the present stage, and MFA is deferred until "
            "the site is high-leverage.\n2. Complete substantive review of the six exact methodologies;",
        ),
    ]
    for old, new in replacements:
        count = body.count(old)
        if count != 1:
            raise SystemExit(
                f"PR body replacement was not exact ({count}): {old[:120]}"
            )
        body = body.replace(old, new)
    body = body.replace(OLD_BLOCKER, NEW_BLOCKER)
    write(output_path, body)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    edit_repo_parser = subparsers.add_parser("edit-repo")
    edit_repo_parser.add_argument("root", type=Path)

    edit_pr_parser = subparsers.add_parser("edit-pr-body")
    edit_pr_parser.add_argument("input", type=Path)
    edit_pr_parser.add_argument("output", type=Path)
    edit_pr_parser.add_argument("new_sha")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "edit-repo":
        edit_repo(args.root.resolve())
    elif args.command == "edit-pr-body":
        edit_pr_body(args.input.resolve(), args.output.resolve(), args.new_sha)
    else:
        raise AssertionError(args.command)


if __name__ == "__main__":
    main()
