import assert from "node:assert/strict";
import test from "node:test";

import { executeCommandProposal, executeConfirmedCommandTool } from "@/lib/command/executor";

test("private trade drafting prepares a one-time editor handoff without claiming a save", async () => {
  const output = await executeCommandProposal({
    profileId: "00000000-0000-0000-0000-000000000001",
    proposal: {
      capabilityKey: "create_trade_draft",
      confidence: 0.98,
      rationale: "Reported reciprocal command.",
      arguments: {
        offeredCause: "Animal welfare",
        requestedCause: "Animal welfare",
        proposedAction: "Donate $5.",
        requestedAction: "Eat one vegetarian meal.",
        noTradeBaseline: "Neither commitment occurs without agreement.",
        duration: "One meal",
        evidenceRule: "Participant attestation.",
        exitConditions: "Either side may withdraw before confirmation.",
      },
    },
  });
  assert.equal(output.status, "completed");
  assert.match(output.stateClaim, /No draft has been saved/);
  assert.equal(output.links[0]?.href, "/trades/new?handoff=command-center");
  assert.equal((output.data.handoff as { key?: string })?.key, "moral-trade.command-center.handoff.v1");
});

test("external actions stop at confirmation and make no success claim", async () => {
  const output = await executeCommandProposal({
    profileId: "00000000-0000-0000-0000-000000000001",
    proposal: {
      capabilityKey: "send_invitation",
      confidence: 0.98,
      rationale: "User requested an invitation.",
      arguments: {
        offerId: "123e4567-e89b-12d3-a456-426614174000",
        recipient: "person@example.com",
        note: null,
      },
    },
  });
  assert.equal(output.status, "awaiting_confirmation");
  assert.match(output.stateClaim, /Nothing has been sent/);
});

test("confirmed handoffs remain truthful about authoritative external state", async () => {
  const output = await executeConfirmedCommandTool({
    capabilityKey: "authorize_payment",
    argumentsValue: {
      agreementId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 25,
      currency: "USD",
    },
  });
  assert.equal(output.status, "completed");
  assert.match(output.summary, /no payment has been authorized or charged/i);
  assert.match(output.stateClaim, /did not infer or claim/);
});

test("low-confidence tool calls never execute", async () => {
  const output = await executeCommandProposal({
    profileId: "00000000-0000-0000-0000-000000000001",
    proposal: {
      capabilityKey: "navigate",
      confidence: 0.89,
      rationale: "Ambiguous route.",
      arguments: { query: "somewhere" },
    },
  });
  assert.equal(output.status, "blocked");
  assert.match(output.blockers[0] ?? "", /Clarification/);
});
