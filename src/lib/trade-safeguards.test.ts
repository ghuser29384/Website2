import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTradeSafeguardItems,
  GENERIC_CREATE_NO_TRADE_BASELINE,
} from "@/lib/trade-safeguards";

function snapshot(overrides: Partial<Parameters<typeof buildTradeSafeguardItems>[0]> = {}) {
  return {
    acceptedEvidenceCount: 1,
    confirmationCount: 2,
    evidenceCount: 1,
    lifecycleStatus: "completed",
    participantCount: 2,
    version: {
      evidenceRule: "A dated receipt and a scoped participant attestation.",
      exitConditions: "Either participant may end future obligations with written notice.",
      maximumBurden: "The stated donation and dietary commitment only.",
      noTradeBaseline:
        "Without this agreement, the donor keeps the planned donation and the counterparty keeps the current diet.",
      privacyScope: "Participants and the assigned reviewer only.",
    },
    ...overrides,
  };
}

function byId(
  items: ReturnType<typeof buildTradeSafeguardItems>,
  id: ReturnType<typeof buildTradeSafeguardItems>[number]["id"],
) {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `missing safeguard item: ${id}`);
  return item;
}

test("reports persisted agreement facts without issuing a safety certificate", () => {
  const items = buildTradeSafeguardItems(snapshot());

  assert.equal(byId(items, "baseline").status, "recorded");
  assert.equal(byId(items, "consent").status, "recorded");
  assert.equal(byId(items, "evidence").status, "recorded");
  assert.equal(byId(items, "review").status, "recorded");
  assert.equal(byId(items, "settlement").status, "recorded");
  assert.equal(byId(items, "affected_parties").status, "not_recorded");
  assert.equal(byId(items, "authority").status, "not_applicable");
  assert.equal(byId(items, "custody").status, "not_applicable");
  assert.ok(items.every((item) => !/safe to rely|safety certificate/i.test(item.summary)));
});

test("fails closed on generic baselines, incomplete consent, and a dispute", () => {
  const items = buildTradeSafeguardItems(
    snapshot({
      acceptedEvidenceCount: 0,
      confirmationCount: 1,
      evidenceCount: 1,
      lifecycleStatus: "disputed",
      version: {
        ...snapshot().version,
        evidenceRule: "Evidence terms must be agreed before any binding trade.",
        noTradeBaseline: GENERIC_CREATE_NO_TRADE_BASELINE,
      },
    }),
  );

  assert.equal(byId(items, "baseline").status, "action_required");
  assert.equal(byId(items, "consent").status, "pending");
  assert.equal(byId(items, "evidence").status, "action_required");
  assert.equal(byId(items, "review").status, "blocked");
  assert.equal(byId(items, "settlement").status, "blocked");
});

test("treats an agreement ended before activation as not requiring missing consent", () => {
  const items = buildTradeSafeguardItems(
    snapshot({
      acceptedEvidenceCount: 0,
      confirmationCount: 0,
      evidenceCount: 0,
      lifecycleStatus: "cancelled",
    }),
  );

  assert.equal(byId(items, "consent").status, "not_applicable");
  assert.equal(byId(items, "settlement").status, "recorded");
});
