from __future__ import annotations

from pathlib import Path
import re
import subprocess

REPO = Path(".")
OLD_WORKFLOW = REPO / ".github/workflows/pr689-isolated-qa-preview-uat-20260814.yml"
NEW_WORKFLOW = REPO / ".github/workflows/pr740-dac-current-main-integration-uat-20260816.yml"
OWNER_SPEC = REPO / "ops/pr689-uat702/owner-uat.spec.ts"

EXPECTED_CONTROLLER_ANCESTOR = "3befd6a886cf56622b2f19a69555d33388f19d92"
EXPECTED_OLD_WORKFLOW_BLOB = "b049e47521c17960a3dc7ecd0b94f048e944fb9e"
EXPECTED_OWNER_SPEC_BLOB = "3c3ba551ea4b7890acf6efa954f0b2da68012590"

LIVE_MAIN = "4587e8c418621440835940d6924f32c02ba3f2d1"
SOURCE_PR689_BASE = "79ca382c3bdc325dfc5a28e2cbbafc1b95640386"
SOURCE_PR689_PRE_REPAIR = "5faef28f76ea20097af18a3d5dab6d1c8dfb116c"
SOURCE_PR689_ORDERING_REPAIR = "b9598f3d5c812df6648fd86ff81d74858ba0bfc1"
SOURCE_PR689_TERMINAL_GUARD_REPAIR = "04cf9466be288f92c7569f8c871c711269e40ded"
SOURCE_PR689_HEAD = "1456027e1ebaf9e99ea2d03f5e223de4ef510e23"
INTEGRATION_HEAD = "434e68d2ecdc034696a850448da2270237100328"
INTEGRATION_TREE = "2d00b09d2077857fcbf6437f79b7b1abcadd9827"
CONTROLLER_BRANCH = "ops/pr740-dac-current-main-integration-uat-20260816"


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def replace_exact(source: str, old: str, new: str, *, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"Refusing {label}: expected exactly one occurrence of {old!r}, found {count}."
        )
    return source.replace(old, new, 1)


def main() -> None:
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", EXPECTED_CONTROLLER_ANCESTOR, "HEAD"],
        check=True,
    )
    if run("git", "hash-object", str(OLD_WORKFLOW)) != EXPECTED_OLD_WORKFLOW_BLOB:
        raise SystemExit("Inherited PR 689 controller workflow blob drifted.")
    if run("git", "hash-object", str(OWNER_SPEC)) != EXPECTED_OWNER_SPEC_BLOB:
        raise SystemExit("Inherited PR 689 owner-UAT spec blob drifted.")

    source = OLD_WORKFLOW.read_text(encoding="utf-8")

    replacements = {
        "name: PR 689 isolated-QA protected Preview owner UAT 20260814":
            "name: PR 740 current-main DAC integration protected Preview owner UAT 20260816",
        "      - ops/pr689-isolated-qa-preview-uat-20260814":
            f"      - {CONTROLLER_BRANCH}",
        "      - \".github/workflows/pr689-isolated-qa-preview-uat-20260814.yml\"":
            "      - \".github/workflows/pr740-dac-current-main-integration-uat-20260816.yml\"",
        "  group: pr689-isolated-qa-preview-uat-20260814":
            "  group: mpgf-dac-product-lifecycle-shared-qa",
        "          name: pr689-isolated-qa-owner-uat-${{ github.run_id }}-${{ env.CANDIDATE_HEAD_SHA }}":
            "          name: pr740-dac-current-main-integration-owner-uat-${{ github.run_id }}-${{ env.CANDIDATE_HEAD_SHA }}",
    }
    for old, new in replacements.items():
        source = replace_exact(source, old, new, label="workflow patch")

    env_pattern = re.compile(
        r"  ADMIN_EMAILS: dac-product-reviewer@qa\.invalid\n"
        r"  CANDIDATE_BASE_SHA: .*?\n"
        r"  CANDIDATE_PRE_REPAIR_SHA: .*?\n"
        r"  CANDIDATE_ORDERING_REPAIR_SHA: .*?\n"
        r"  CANDIDATE_TERMINAL_GUARD_REPAIR_SHA: .*?\n"
        r"  CANDIDATE_HEAD_SHA: .*?\n"
        r"  CANDIDATE_TREE_SHA: .*?\n"
        r"  CONTROLLER_BRANCH: .*?\n",
        re.DOTALL,
    )
    env_replacement = f"""  ADMIN_EMAILS: dac-product-reviewer@qa.invalid
  CANDIDATE_BASE_SHA: {LIVE_MAIN}
  SOURCE_PR689_BASE_SHA: {SOURCE_PR689_BASE}
  SOURCE_PR689_PRE_REPAIR_SHA: {SOURCE_PR689_PRE_REPAIR}
  SOURCE_PR689_ORDERING_REPAIR_SHA: {SOURCE_PR689_ORDERING_REPAIR}
  SOURCE_PR689_TERMINAL_GUARD_REPAIR_SHA: {SOURCE_PR689_TERMINAL_GUARD_REPAIR}
  SOURCE_PR689_HEAD_SHA: {SOURCE_PR689_HEAD}
  CANDIDATE_HEAD_SHA: {INTEGRATION_HEAD}
  CANDIDATE_TREE_SHA: {INTEGRATION_TREE}
  CONTROLLER_BRANCH: {CONTROLLER_BRANCH}
  INTEGRATION_PR_NUMBER: \"740\"
"""
    source, count = env_pattern.subn(env_replacement, source, count=1)
    if count != 1:
        raise SystemExit(f"Candidate-identity environment block count was {count}.")

    identity_pattern = re.compile(
        r"      - name: Revalidate exact GitHub and Git identity before any external mutation\n.*?"
        r"(?=      - name: Install exact application dependencies and browser/database clients)",
        re.DOTALL,
    )
    identity_replacement = f'''      - name: Revalidate exact integration, source PRs, and owner boundary before any external mutation
        shell: bash
        env:
          GH_TOKEN: ${{{{ github.token }}}}
        run: |
          set -euo pipefail
          test "$GITHUB_REF_NAME" = "$CONTROLLER_BRANCH"
          test "$(git -C app rev-parse HEAD)" = "$CANDIDATE_HEAD_SHA"
          test "$(git -C app rev-parse HEAD^{{tree}})" = "$CANDIDATE_TREE_SHA"
          test "$(git -C app rev-parse HEAD^1)" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app rev-parse HEAD^2)" = "$SOURCE_PR689_HEAD_SHA"
          observed_main_sha="$(git -C app rev-parse origin/main)"
          test "$observed_main_sha" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app merge-base HEAD origin/main)" = "$CANDIDATE_BASE_SHA"
          test "$(git -C app status --porcelain)" = ""

          gh api repos/ghuser29384/Website2/pulls/740 > "$RUNNER_TEMP/pr740.json"
          gh api repos/ghuser29384/Website2/pulls/689 > "$RUNNER_TEMP/pr689.json"
          gh api repos/ghuser29384/Website2/pulls/640 > "$RUNNER_TEMP/pr640.json"
          gh api repos/ghuser29384/Website2/issues/697 > "$RUNNER_TEMP/issue697.json"
          gh api repos/ghuser29384/Website2/issues/702 > "$RUNNER_TEMP/issue702.json"

          jq -e --arg head "$CANDIDATE_HEAD_SHA" --arg base "$CANDIDATE_BASE_SHA" '
            .state == "open" and .draft == true and .merged == false
              and .head.sha == $head and .base.sha == $base
          ' "$RUNNER_TEMP/pr740.json" > /dev/null
          jq -e --arg head "$SOURCE_PR689_HEAD_SHA" '
            .state == "open" and .draft == true and .merged == false and .head.sha == $head
          ' "$RUNNER_TEMP/pr689.json" > /dev/null
          jq -e '.state == "open" and .draft == true and .merged == false' "$RUNNER_TEMP/pr640.json" > /dev/null
          jq -e '.state == "open"' "$RUNNER_TEMP/issue697.json" > /dev/null
          jq -e '.state == "closed"' "$RUNNER_TEMP/issue702.json" > /dev/null

          mkdir -p evidence
          jq -n \\
            --arg head "$CANDIDATE_HEAD_SHA" \\
            --arg tree "$CANDIDATE_TREE_SHA" \\
            --arg firstParent "$CANDIDATE_BASE_SHA" \\
            --arg secondParent "$SOURCE_PR689_HEAD_SHA" \\
            --arg sourceBase "$SOURCE_PR689_BASE_SHA" \\
            --arg sourcePreRepair "$SOURCE_PR689_PRE_REPAIR_SHA" \\
            --arg orderingRepair "$SOURCE_PR689_ORDERING_REPAIR_SHA" \\
            --arg terminalGuardRepair "$SOURCE_PR689_TERMINAL_GUARD_REPAIR_SHA" \\
            --arg observedMain "$observed_main_sha" \\
            '{{integration:{{pr:740,open:true,draft:true,merged:false,head:$head,tree:$tree,firstParent:$firstParent,secondParent:$secondParent}},sourcePr689:{{open:true,draft:true,merged:false,head:$secondParent,historicalBase:$sourceBase,preRepair:$sourcePreRepair,orderingRepair:$orderingRepair,terminalGuardRepair:$terminalGuardRepair}},repository:{{observedMain:$observedMain,exactMainIsFirstParent:true}},pr640:{{open:true,draft:true,merged:false}},issues:{{"697":"open","702":"closed_completed"}}}}' \\
            > evidence/exact-state.json

'''
    source, count = identity_pattern.subn(identity_replacement, source, count=1)
    if count != 1:
        raise SystemExit(f"Identity-step replacement count was {count}.")

    stale_fragments = (
        "CANDIDATE_PRE_REPAIR_SHA",
        "CANDIDATE_ORDERING_REPAIR_SHA",
        "CANDIDATE_TERMINAL_GUARD_REPAIR_SHA",
        'issues:{"697":"open","702":"open"}',
        "ops/pr689-isolated-qa-preview-uat-20260814",
    )
    for fragment in stale_fragments:
        if fragment in source:
            raise SystemExit(f"Stale controller fragment remains: {fragment}")

    if source.count("group: mpgf-dac-product-lifecycle-shared-qa") != 1:
        raise SystemExit("Shared-QA serialization group must occur exactly once.")

    NEW_WORKFLOW.write_text(source, encoding="utf-8")

    owner = OWNER_SPEC.read_text(encoding="utf-8")
    viewport_marker = '''  const viewports = [
    { name: "390x844", width: 390, height: 844 },
    { name: "320x568", width: 320, height: 568 },
  ];'''
    viewport_replacement = '''  const viewports = [
    { name: "1024x768", width: 1024, height: 768 },
    { name: "390x844", width: 390, height: 844 },
    { name: "320x568", width: 320, height: 568 },
  ];'''
    owner = replace_exact(
        owner,
        viewport_marker,
        viewport_replacement,
        label="owner-UAT viewport patch",
    )
    OWNER_SPEC.write_text(owner, encoding="utf-8")

    # Source-level guardrails before the controller is committed.
    generated = NEW_WORKFLOW.read_text(encoding="utf-8")
    required = (
        f"CANDIDATE_HEAD_SHA: {INTEGRATION_HEAD}",
        f"CANDIDATE_TREE_SHA: {INTEGRATION_TREE}",
        f"CONTROLLER_BRANCH: {CONTROLLER_BRANCH}",
        "group: mpgf-dac-product-lifecycle-shared-qa",
        'target=null',
        'alias=[]',
        'DIRECT_DONATION_UPGRADES_ENABLED: "false"',
        'MPGF_REAL_MONEY_ENABLED: "false"',
    )
    for fragment in required:
        if fragment not in generated:
            raise SystemExit(f"Generated controller lacks required fragment: {fragment}")

    subprocess.run(["git", "diff", "--check"], check=True)
    print("pr740_controller_materialization=passed")


if __name__ == "__main__":
    main()
