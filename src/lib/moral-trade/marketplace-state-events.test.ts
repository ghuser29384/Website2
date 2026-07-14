import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as marketplaceStateEventContractRoute } from "@/app/api/moral-trade/marketplace-state-events/contract/route";

import {
  evaluateMoralTradeMarketplaceStateEvents,
  getMoralTradeMarketplaceStateEventContract,
  validateMoralTradeMarketplaceStateEventContract,
  type MoralTradeMarketplaceStateEventRecord,
  type MoralTradeMarketplaceStateEventSubjectType,
} from "./marketplace-state-events";

function hash(seed: string) {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64);

  return `sha256:${hex}`;
}

const TRANSITION_BY_SUBJECT: Record<
  MoralTradeMarketplaceStateEventSubjectType,
  MoralTradeMarketplaceStateEventRecord["transition"]
> = {
  blocker_state: "blocker_state_change",
  cleared_trade_agreement: "agreement_state_change",
  dispute_case: "dispute_state_change",
  evidence_record: "evidence_state_change",
  payment_event: "payment_state_change",
};

function eventFor(
  subjectType: MoralTradeMarketplaceStateEventSubjectType,
  overrides: Partial<MoralTradeMarketplaceStateEventRecord> = {},
): MoralTradeMarketplaceStateEventRecord {
  return {
    appendOnlyRecord: true,
    correctionRecordRef: null,
    createdAt: "2026-06-30T07:00:00.000Z",
    eventHash: hash(subjectType),
    neutralReviewDecisionRef: null,
    nextState: "under_review",
    parentDirectMutation: false,
    previousEventHash: hash(`${subjectType}:previous`),
    previousState: "draft",
    stateEventRef: `marketplace-state-event:${subjectType}`,
    subjectRef: `${subjectType}:demo`,
    subjectType,
    supersedesStateEventRef: null,
    transactionGroupRef: `transaction-group:${subjectType}`,
    transition: TRANSITION_BY_SUBJECT[subjectType],
    ...overrides,
  };
}

test("moraltrade82 marketplace state-event contract validates append-only domain coverage", () => {
  const contract = getMoralTradeMarketplaceStateEventContract();
  const validation = validateMoralTradeMarketplaceStateEventContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.deepEqual(contract.requiredSubjectTypes, [
    "cleared_trade_agreement",
    "payment_event",
    "evidence_record",
    "dispute_case",
    "blocker_state",
  ]);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_marketplace_state_events"));
  assert.match(contract.appendOnlyRule, /Agreement, payment, evidence, dispute, and blocker state changes/);
  assert.match(contract.terminalStateRule, /cannot be silently reopened/);
  assert.match(contract.privacyBoundary, /raw evidence/);
});

test("agreement, payment, evidence, dispute, and blocker events can pass as append-only records", () => {
  const result = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      eventFor("cleared_trade_agreement"),
      eventFor("payment_event"),
      eventFor("evidence_record"),
      eventFor("dispute_case"),
      eventFor("blocker_state"),
    ],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.blockedEventCount, 0);
  assert.deepEqual(result.blockers, []);
});

test("terminal reopen, parent mutation, missing domains, and transition mismatch fail closed", () => {
  const result = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      eventFor("cleared_trade_agreement", {
        appendOnlyRecord: false,
        nextState: "active",
        parentDirectMutation: true,
        previousState: "terminal",
        transactionGroupRef: "",
        transition: "payment_state_change",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("marketplace_state_event_subject_missing:payment_event"));
  assert.ok(result.blockers.includes("marketplace_state_event_subject_missing:evidence_record"));
  assert.ok(result.blockers.includes("marketplace_state_event_subject_missing:dispute_case"));
  assert.ok(result.blockers.includes("marketplace_state_event_subject_missing:blocker_state"));
  assert.ok(
    result.blockers.includes(
      "marketplace_state_event_transition_mismatch:marketplace-state-event:cleared_trade_agreement:payment_state_change",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "marketplace_state_event_terminal_reopen_blocked:marketplace-state-event:cleared_trade_agreement:terminal:active",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "marketplace_state_event_parent_direct_mutation:marketplace-state-event:cleared_trade_agreement",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "marketplace_state_event_append_only_missing:marketplace-state-event:cleared_trade_agreement",
    ),
  );
});

test("terminal correction can pass only with supersession, correction, and neutral review refs", () => {
  const passing = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      eventFor("dispute_case", {
        correctionRecordRef: "correction:dispute",
        neutralReviewDecisionRef: "review:neutral-dispute-correction",
        nextState: "corrected",
        previousState: "terminal",
        supersedesStateEventRef: "marketplace-state-event:old-dispute",
        transition: "terminal_correction_recorded",
      }),
    ],
    requiredSubjectTypes: ["dispute_case"],
  });
  const blocked = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      eventFor("dispute_case", {
        nextState: "corrected",
        previousState: "terminal",
        transition: "terminal_correction_recorded",
      }),
    ],
    requiredSubjectTypes: ["dispute_case"],
  });

  assert.equal(passing.status, "pass");
  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "marketplace_state_event_terminal_correction_incomplete:marketplace-state-event:dispute_case",
    ),
  );
});

test("marketplace state-event contract route exposes safe public metadata", async () => {
  const response = await marketplaceStateEventContractRoute(
    new Request("http://localhost/api/moral-trade/marketplace-state-events/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.requiredSubjectTypes.includes("evidence_record"));
  assert.ok(body.publicContract.requiredSubjectTypes.includes("dispute_case"));
  assert.match(body.publicContract.terminalStateRule, /cannot be silently reopened/);
  assert.equal(serialized.includes("raw_payload"), false);
  assert.equal(serialized.includes("private term sheet payload"), false);
  assert.equal(serialized.includes("payment credentials"), true);
});

test("marketplace state-event migration generalizes append-only event table", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260630_moral_trade_marketplace_state_events_generalization.sql",
    ),
    "utf8",
  );

  assert.match(migration, /moral_trade_marketplace_state_events_subject_type_check/);
  assert.match(migration, /'cleared_trade_agreement'/);
  assert.match(migration, /'evidence_record'/);
  assert.match(migration, /'dispute_case'/);
  assert.match(migration, /'blocker_state'/);
  assert.match(migration, /terminal_correction_recorded/);
  assert.match(migration, /parent_direct_mutation_bool boolean not null default false/);
  assert.match(migration, /private_payload_stored_bool boolean not null default false/);
  assert.match(migration, /Terminal states cannot be silently reopened/);
});
