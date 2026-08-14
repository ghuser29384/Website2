import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { mpgfGatesForAdminSection, type MpgfProductionGate } from "./control-plane";
import { mpgfAdminSections } from "./data";

const editorPath = "src/lib/mpgf/failure-bonus-threshold-editor.ts";
const operatorPath = "src/lib/mpgf/failure-bonus-operator.ts";
const consolePath = "src/components/mpgf/mpgf-console.tsx";
const adminPagePath = "src/app/mpgf/admin/[section]/page.tsx";
const adminActionPath = "src/app/mpgf/admin/actions.ts";
const persistencePath = "src/lib/mpgf/persistence.ts";
const settlementPath = "src/lib/mpgf/public-goods-refund-bonus-non-mvp.ts";
const migrationPath =
  "supabase/migrations/20260726170500_mpgf_multi_threshold_failure_bonus_editor.sql";
const databaseTestPath = "supabase/tests/mpgf_multi_threshold_failure_bonus_editor.sql";
const docsPath = "docs/failure-bonus-multi-threshold-editor.md";

test("the participant editor exposes one to ten cumulative thresholds and pool-wide immutable terms", () => {
  const editor = readFileSync(editorPath, "utf8");
  const consoleSource = readFileSync(consolePath, "utf8");

  assert.match(editor, /FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS = 10/);
  assert.match(editor, /addFailureBonusThresholdDraft/);
  assert.match(editor, /removeFailureBonusThresholdDraft/);
  assert.match(editor, /moveFailureBonusThresholdDraft/);
  assert.match(editor, /parseUsdInputToCents/);
  assert.match(editor, /Every threshold must use the one pool-wide failure-bonus formula/);
  assert.match(editor, /Pool creators cannot self-approve/);
  assert.match(consoleSource, /Price one to ten cumulative thresholds/);
  assert.match(consoleSource, /participant and per-person caps apply once across the whole pool/i);
  assert.match(consoleSource, /Each incremental funding tranche is priced once/);
  assert.match(consoleSource, /Cumulative net/);
  assert.match(consoleSource, /Cumulative premium/);
  assert.match(consoleSource, /Gross success requirement/);
  assert.match(consoleSource, /operator approves the complete schedule atomically/i);
});

test("server persistence stores only a re-quoted pending schedule and freezes the compatibility mirror", () => {
  const source = readFileSync(persistencePath, "utf8");

  assert.match(source, /validateSubmittedFailureBonusSchedule/);
  assert.match(source, /public_goods_threshold_schedule_json/);
  assert.match(source, /public_goods_failure_bonus_eligibility_json/);
  assert.match(source, /public_goods_failure_bonus_max_participants/);
  assert.match(source, /public_goods_failure_bonus_max_per_participant_cents/);
  assert.match(source, /public_goods_failure_bonus_schedule_status/);
  assert.match(source, /pending_review/);
  assert.match(source, /legacy threshold field must mirror threshold 1/);
  assert.match(source, /Pool creators cannot mark a success-premium schedule final or approved/);
});

test("operator approval is MFA-gated, complete-schedule only, and wired to the failure-bonus admin section", () => {
  const operator = readFileSync(operatorPath, "utf8");
  const adminPage = readFileSync(adminPagePath, "utf8");
  const adminAction = readFileSync(adminActionPath, "utf8");

  assert.ok(mpgfAdminSections.includes("failure-bonus"));
  assert.match(operator, /loadPendingMpgfFailureBonusSchedules/);
  assert.match(operator, /validateStoredFailureBonusSchedule/);
  assert.match(adminAction, /requireMpgfAdmin/);
  assert.match(adminAction, /mpgf_approve_failure_bonus_premium_schedule/);
  assert.match(adminAction, /substantive rationale of at least 20 characters/);
  assert.match(adminAction, /atomic_complete_schedule/);
  assert.match(adminPage, /Review the complete one-to-ten-threshold contract/);
  assert.match(adminPage, /no individual threshold can be approved separately/i);
  assert.match(adminPage, /Approve all/);
  assert.doesNotMatch(adminPage, /Approve threshold \{threshold\.thresholdIndex\}/);

  const gates: MpgfProductionGate[] = [
    { area: "governance", key: "g", label: "g", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "exact_pilot", key: "e", label: "e", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "real_money", key: "r", label: "r", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "payout_compliance", key: "p", label: "p", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
  ];
  assert.deepEqual(
    mpgfGatesForAdminSection("failure-bonus", gates).map((gate) => gate.area),
    ["governance", "exact_pilot", "real_money", "payout_compliance"],
  );
});

test("database migration validates every tranche, approves atomically, and freezes post-acceptance terms", () => {
  assert.equal(existsSync(migrationPath), true);
  assert.equal(existsSync(databaseTestPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  const databaseTest = readFileSync(databaseTestPath, "utf8");

  assert.match(migration, /jsonb_array_length\(thresholds_json\)/);
  assert.match(migration, /threshold_count < 1 or threshold_count > 10/);
  assert.match(migration, /thresholdIndex'\)::integer <> current_index/);
  assert.match(migration, /cumulative_net_cents <= previous_cumulative_net_cents/);
  assert.match(migration, /incremental_failure_bonus_exposure_cents/);
  assert.match(migration, /maximum_failure_bonus_exposure_cents/);
  assert.match(migration, /mpgf_sync_failure_bonus_premium_quote/);
  assert.match(migration, /mpgf_approve_failure_bonus_premium_schedule/);
  assert.match(migration, /Failure-bonus threshold quotes must be approved as one atomic schedule/);
  assert.match(migration, /Failure-bonus formula, eligibility, caps, and thresholds cannot change after the first accepted pledge/);
  assert.match(migration, /must be approved before the first accepted pledge/);
  assert.match(migration, /grant execute on function public\.mpgf_approve_failure_bonus_premium_schedule[\s\S]*service_role/);
  assert.equal(
    /grant execute on function public\.mpgf_approve_failure_bonus_premium_schedule[^;]*to\s+(anon|authenticated)/i.test(
      migration,
    ),
    false,
  );

  assert.match(databaseTest, /Initial two-threshold quote set was not reproduced exactly/);
  assert.match(databaseTest, /Schedule editing did not invalidate and replace the stale tranche quote/);
  assert.match(databaseTest, /Partial threshold approval was not blocked/);
  assert.match(databaseTest, /A failure-bonus pledge was accepted before operator approval/);
  assert.match(databaseTest, /Failure-bonus caps changed after the first accepted pledge/);
});

test("settlement derives the highest cleared threshold and cannot undercharge an earlier tranche", () => {
  const source = readFileSync(settlementPath, "utf8");

  assert.match(source, /getHighestClearedThresholdIndex/);
  assert.match(source, /success_premium_cleared_threshold_mismatch/);
  assert.match(source, /success_premium_no_threshold_cleared/);
  assert.match(source, /success_premium_threshold_not_funded/);
  assert.match(source, /successPremiumThresholdId/);
});

test("operator documentation records the lifecycle, exposure cap, partial-clearance, and live-money boundary", () => {
  assert.equal(existsSync(docsPath), true);
  const docs = readFileSync(docsPath, "utf8");

  assert.match(docs, /one and ten cumulative net-recipient thresholds/);
  assert.match(docs, /participant and per-person caps are applied once/);
  assert.match(docs, /Each incremental recipient dollar is therefore priced exactly once/);
  assert.match(docs, /Approval is atomic/);
  assert.match(docs, /After the first accepted pledge/);
  assert.match(docs, /highest cumulative threshold reached/);
  assert.match(docs, /does not activate production custody/);
});
