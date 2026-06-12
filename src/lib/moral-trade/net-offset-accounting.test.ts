import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getNetOffsetAccountingContract } from "@/app/api/moral-trade/net-offset-accounting/contract/route";
import {
  evaluateMoralTradeNetOffsetAccounting,
  getMoralTradeNetOffsetAccountingContract,
  validateMoralTradeNetOffsetAccountingContract,
  type MoralTradeNetOffsetAccountingRecord,
} from "@/lib/moral-trade/net-offset-accounting";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function accountingRecord(
  overrides: Partial<MoralTradeNetOffsetAccountingRecord> = {},
): MoralTradeNetOffsetAccountingRecord {
  return {
    recordId: "net-offset:test",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:test",
    participantIdHash: HASH_A,
    netOffsetAccountingPolicyRef: "policy-snapshot:net-offset-accounting",
    policyStatus: "resolved_immutable",
    baselineOpposedActionType: "donation",
    baselineOpposedAmountCents: 100_000,
    baselineOpposedActionUnits: 0,
    matchedCanceledAmountCents: 60_000,
    matchedCanceledActionUnits: 0,
    compromiseTransferAmountCents: 60_000,
    sponsorOrMatchAmountCents: 10_000,
    residualOpposedAmountCents: 40_000,
    residualOpposedActionUnits: 0,
    residualActionPolicy: "allowed_if_disclosed",
    substitutionChannelReviewState: "non_blocking",
    evidenceClaimRefs: ["evidence-claim:baseline", "evidence-claim:canceled-offset"],
    evidenceStandardRef: "evidence-standard:net-offset-v1",
    netOffsetState: "locked",
    reviewerDecisionRef: "review-decision:net-offset",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicPrivateBaselineDetails: false,
    publicSubstitutionChannelDetails: false,
    publicReviewerNotes: false,
    ...overrides,
  };
}

test("net-offset accounting contract validates first-class donation-offset records", () => {
  const contract = getMoralTradeNetOffsetAccountingContract();
  const validation = validateMoralTradeNetOffsetAccountingContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_net_offset_accounting_records"));
  assert.ok(contract.policySnapshotSubjects.includes("net_offset_accounting"));
  assert.ok(contract.subjectTypes.includes("negative_commitment_scope"));
  assert.ok(contract.baselineOpposedActionTypes.includes("donation"));
  assert.ok(contract.residualActionPolicies.includes("allowed_if_disclosed"));
  assert.ok(contract.substitutionChannelReviewStates.includes("non_blocking"));
  assert.ok(contract.netOffsetStates.includes("verified"));
  assert.ok(contract.contractTests.includes("net_offset_accounting_test"));
  assert.match(contract.grossVolumeExclusionRule, /Gross compromise donations/i);
  assert.match(contract.privacyBoundary, /private baseline details/i);
});

test("reviewed net-offset accounting can pass lock and public-metric gates", () => {
  const evaluation = evaluateMoralTradeNetOffsetAccounting({
    transition: "matched_trade_lock",
    accountingRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [accountingRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reviewedRecordCount, 1);
  assert.equal(evaluation.netMetricEligibleRecordCount, 1);
  assert.equal(evaluation.privacySafeRecordCount, 1);
  assert.equal(evaluation.netCanceledAmountCents, 60_000);
  assert.equal(evaluation.grossTransferAmountCents, 60_000);
  assert.equal(evaluation.sponsorOrMatchAmountCents, 10_000);
  assert.equal(evaluation.residualOpposedAmountCents, 40_000);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing net-offset accounting fails closed when required", () => {
  const evaluation = evaluateMoralTradeNetOffsetAccounting({
    transition: "clearing_run",
    accountingRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("net_offset_accounting_record_missing"));
});

test("gross-only, residual, substitution, evidence, state, stale, and privacy failures block", () => {
  const evaluation = evaluateMoralTradeNetOffsetAccounting({
    transition: "public_metric_publication",
    accountingRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      accountingRecord({
        policyStatus: "mutable",
        baselineOpposedActionType: "unknown",
        matchedCanceledAmountCents: 0,
        matchedCanceledActionUnits: 0,
        residualActionPolicy: "manual_review",
        substitutionChannelReviewState: "under_review",
        evidenceClaimRefs: [],
        evidenceStandardRef: null,
        netOffsetState: "previewed",
        reviewerDecisionRef: null,
        updatedAt: "2024-01-01T00:00:00.000Z",
        publicParticipantIdentity: true,
        publicPrivateBaselineDetails: true,
        publicSubstitutionChannelDetails: true,
        publicReviewerNotes: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("net_offset_policy_not_immutable:net-offset:test:mutable"));
  assert.ok(evaluation.blockers.includes("baseline_opposed_action_unknown:net-offset:test"));
  assert.ok(evaluation.blockers.includes("matched_canceled_offset_missing:net-offset:test"));
  assert.ok(evaluation.blockers.includes("gross_transfer_without_canceled_offset:net-offset:test"));
  assert.ok(
    evaluation.blockers.includes(
      "residual_opposed_action_not_disclosed:net-offset:test:manual_review",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "substitution_channel_not_non_blocking:net-offset:test:under_review",
    ),
  );
  assert.ok(evaluation.blockers.includes("net_offset_evidence_claim_refs_missing:net-offset:test"));
  assert.ok(evaluation.blockers.includes("net_offset_evidence_standard_missing:net-offset:test"));
  assert.ok(
    evaluation.blockers.includes(
      "net_offset_state_not_metric_eligible:net-offset:test:previewed",
    ),
  );
  assert.ok(evaluation.blockers.includes("stale_net_offset_record:net-offset:test"));
  assert.ok(evaluation.blockers.includes("net_offset_privacy_leak:net-offset:test"));
});

test("inactive net-offset stage passes only when records do not leak private details", () => {
  const clean = evaluateMoralTradeNetOffsetAccounting({
    transition: "draft_preview",
    accountingRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });
  const leaking = evaluateMoralTradeNetOffsetAccounting({
    transition: "draft_preview",
    accountingRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      accountingRecord({
        publicPrivateBaselineDetails: true,
      }),
    ],
  });

  assert.equal(clean.status, "pass");
  assert.equal(leaking.status, "blocked");
  assert.ok(leaking.blockers.includes("net_offset_privacy_leak:net-offset:test"));
});

test("net-offset accounting route exposes only public contract metadata", async () => {
  const response = await getNetOffsetAccountingContract(
    new Request("http://localhost/api/moral-trade/net-offset-accounting/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_net_offset_accounting_records"));
  assert.ok(body.publicContract.baselineOpposedActionTypes.includes("donation"));
  assert.match(body.publicContract.grossVolumeExclusionRule, /baseline opposed action/i);
  assert.match(body.publicContract.privacyBoundary, /participant-specific accounting rows/i);
});

test("net-offset accounting contract is wired through route, health, spec, API profile, preview, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/net-offset-accounting/contract/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const clearingPreview = readFileSync("src/lib/moral-trade/clearing-previews.ts", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_net_offset_accounting_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeNetOffsetAccountingContract/);
  assert.match(health, /netOffsetAccountingValidation/);
  assert.match(spec, /\/api\/moral-trade\/net-offset-accounting\/contract/);
  assert.match(apiProfile, /net_offset_accounting_contract_response/);
  assert.match(apiProfile, /moral_trade_net_offset_accounting_contract/);
  assert.match(clearingPreview, /netOffsetAccountingStatus/);
  assert.match(migration, /moral_trade_net_offset_accounting_records/);
  assert.match(migration, /net_offset_accounting/);
  assert.match(schema, /moral_trade_net_offset_accounting_records/);
  assert.match(schema, /net_offset_accounting/);
  assert.match(databaseTypes, /moral_trade_net_offset_accounting_records/);
  assert.match(databaseTypes, /net_offset_accounting/);
});
