import assert from "node:assert/strict";
import test from "node:test";

import { confirmationPhraseForTool } from "@/lib/command/confirmation";
import { planCommandDeterministically } from "@/lib/command/planner";

test("the reported trade command becomes a bounded private-draft tool call", () => {
  const plan = planCommandDeterministically(
    "$5 donation to animal welfare if you eat 1 vegetarian meal",
  );
  assert.equal(plan.clarification, null);
  assert.equal(plan.tools.length, 1);
  assert.equal(plan.tools[0]?.capabilityKey, "create_trade_draft");
  assert.ok((plan.tools[0]?.confidence ?? 0) >= 0.9);
  assert.deepEqual(plan.tools[0]?.arguments, {
    offeredCause: "Animal welfare",
    requestedCause: "Animal welfare",
    proposedAction: "Donate $5 to an agreed animal welfare organization.",
    requestedAction: "Eat 1 vegetarian meal.",
    noTradeBaseline:
      "Without this trade, neither the $5 donation nor the vegetarian meal is assumed to occur.",
    duration: "One meal",
    evidenceRule: "",
    exitConditions:
      "Either participant may withdraw before both participants confirm the final terms; no commitment begins before that confirmation.",
  });
});

test("ambiguous donation language asks one focused mechanism question", () => {
  const plan = planCommandDeterministically("Donate $50 to animal welfare");
  assert.equal(plan.tools.length, 0);
  assert.equal(plan.clarification?.required, true);
  assert.match(plan.clarification?.question ?? "", /Which structure/);
  assert.deepEqual(plan.clarification?.options, [
    "Direct donation",
    "Reciprocal trade",
    "Donation offset",
    "Conditional pool",
  ]);
});

test("threshold public-good requests preserve participant and activation terms", () => {
  const plan = planCommandDeterministically(
    "Create a proposal where 100 participants each contribute $20 if at least 80 participants join for animal welfare research.",
  );
  assert.equal(plan.tools[0]?.capabilityKey, "create_public_good_proposal");
  assert.deepEqual(plan.tools[0]?.arguments, {
    title: "animal welfare research threshold pool",
    participantCount: 100,
    contributionAmount: 20,
    thresholdCount: 80,
    cause: "animal welfare research",
  });
  assert.match(plan.assistantMessage, /will not fund or activate/);
});

test("financial actions require exact phrases and authoritative handoffs", () => {
  const agreementId = "123e4567-e89b-12d3-a456-426614174000";
  const plan = planCommandDeterministically(
    `Authorize $25 payment for agreement ${agreementId}`,
  );
  const tool = plan.tools[0];
  assert.equal(tool?.capabilityKey, "authorize_payment");
  assert.equal(
    confirmationPhraseForTool(tool!.capabilityKey, tool!.arguments),
    "CONFIRM AUTHORIZE PAYMENT 25 USD",
  );
});

test("coercive or fabricated-baseline requests are blocked", () => {
  const plan = planCommandDeterministically(
    "Threaten to hurt animals unless the counterparty accepts and fake the no-trade baseline.",
  );
  assert.equal(plan.tools[0]?.capabilityKey, "block_prohibited_request");
  assert.equal(plan.tools[0]?.confidence, 0.99);
  assert.match(plan.assistantMessage, /will not help/);
});

test("unmapped requests fall back to read-only search above the confidence threshold", () => {
  const plan = planCommandDeterministically("Where is the setting for an unusual account option?");
  assert.equal(plan.tools[0]?.capabilityKey, "search_site");
  assert.ok((plan.tools[0]?.confidence ?? 0) >= 0.9);
});
