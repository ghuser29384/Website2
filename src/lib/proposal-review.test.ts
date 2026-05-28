import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  getOfferReviewWorkflowCards,
  MORAL_TRADE_VERIFICATION_LOOP_STEPS,
  PROHIBITED_MORAL_TRADE_PATTERNS,
  PROHIBITED_PROPOSAL_FIXTURES,
} from "./proposal-review";

test("protocol draft review requests missing required fields without ranking moral value", () => {
  const review = evaluateMoralTradeProtocolDraft({
    format: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    offeredAction: "",
    requestedAction: "",
    baselineStatement: "",
    duration: "30 days",
    exitConditions: "",
    verificationMethod: "Public pledge",
    publicDescription: "",
    participantImportance: 7,
    counterpartyThreshold: 6,
  });

  assert.equal(review.status, "needs_clarification");
  assert.ok(review.missingRequiredFields.includes("Offered action"));
  assert.ok(review.missingRequiredFields.includes("No-trade baseline"));
  assert.ok(review.factorCodes.includes("participant_relative_scores"));
  assert.ok(review.clarificationQuestions.length <= 5);
  assert.deepEqual(
    review.verificationLoop.map((step) => step.key),
    MORAL_TRADE_VERIFICATION_LOOP_STEPS.map((step) => step.key),
  );
  assert.equal(
    review.verificationLoop.find((step) => step.key === "schema_completeness")?.status,
    "needs_input",
  );
  assert.ok(review.clarificationQuestions.some((item) => item.field === "Offered action"));
  assert.ok(review.uncertaintyFlags.includes("required_fields_incomplete"));
  assert.ok(review.nextStepChecklist.some((step) => /clarification questions/i.test(step)));
  assert.ok(review.citedEvidenceTable.some((row) => row.citation === "draft.verification_method"));
  assert.ok(review.citedEvidenceTable.some((row) => row.status === "artifact_requested"));
  assert.match(review.reviewerSummary, /What is being offered/);
  assert.equal(review.reviewerSummary.split(/\s+/).filter(Boolean).length <= 180, true);
  assert.equal(formatProtocolReviewStatus(review.status), "Needs clarification");
});

test("protocol draft review blocks threat-like proposal framing", () => {
  const review = evaluateMoralTradeProtocolDraft({
    format: "payment",
    offeredCause: "Financial support",
    requestedCause: "Community service",
    offeredAction: "Pay me or I will start harassing this organization.",
    requestedAction: "Send the payment this week.",
    baselineStatement: "Without the trade, I will start harassing the organization.",
    duration: "30 days",
    exitConditions: "If payment is missing, I resume the conduct.",
    verificationMethod: "Manual review required",
    publicDescription: "This is a pay-me-or-I-will-X demand.",
  });

  assert.equal(review.status, "blocked");
  assert.ok(review.policyConflicts.includes("anti_threat_baseline"));
  assert.ok(review.factorCodes.includes("human_review_required"));
  assert.equal(
    review.verificationLoop.find((step) => step.key === "anti_threat")?.status,
    "blocked",
  );
  assert.equal(
    review.verificationLoop.find((step) => step.key === "match_explanation")?.status,
    "blocked",
  );
  assert.ok(review.uncertaintyFlags.includes("policy_conflict:anti_threat_baseline"));
  assert.ok(review.nextStepChecklist.some((step) => /Do not publish or match/i.test(step)));
  assert.ok(
    review.citedEvidenceTable.some(
      (row) => row.citation === "policy_registry.anti_threat_baseline" && row.status === "policy_flag",
    ),
  );
  assert.match(review.reviewerSummary, /Main policy flags: anti_threat_baseline/);
});

test("protocol draft review asks for party-relative benefit before matchability", () => {
  const review = evaluateMoralTradeProtocolDraft({
    format: "pledge_swap",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    offeredAction:
      "I will log a public animal-welfare pledge and attach completion evidence after the review period.",
    requestedAction:
      "The counterparty will make a bounded donation to a global poverty fund after matching.",
    baselineStatement:
      "My prior pledge history and dated intent record show that without this trade I would keep my current diet and donation plan.",
    duration: "90 days",
    exitConditions:
      "If evidence is missing or disputed by the review date, the record stays unresolved and no completion badge is shown.",
    verificationMethod: "Third-party receipt and public pledge log",
    publicDescription: "A bounded pledge swap with evidence, exit rules, and privacy-preserving review.",
    evidenceUrl: "https://example.com/receipt",
  });

  assert.equal(review.status, "needs_clarification");
  assert.ok(review.underspecifiedFields.includes("Party-relative benefit"));
  assert.ok(review.clarificationQuestions.some((item) => item.field === "Party-relative benefit"));
  assert.ok(review.uncertaintyFlags.includes("party_relative_benefit_low"));
  assert.ok(
    review.nextStepChecklist.some((step) =>
      /better off than the no-trade default/i.test(step),
    ),
  );
  assert.ok(!review.factorCodes.includes("party_relative_benefit"));
});

test("protocol draft review requires privacy redaction before matchability", () => {
  const review = evaluateMoralTradeProtocolDraft({
    format: "pledge_swap",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    offeredAction:
      "I will log a public animal-welfare pledge and attach completion evidence after the review period.",
    requestedAction:
      "The counterparty will make a bounded donation to a global poverty fund after matching.",
    baselineStatement:
      "My prior pledge history and dated intent record show that without this trade I would keep my current diet and donation plan.",
    duration: "90 days",
    exitConditions:
      "If evidence is missing or disputed by the review date, the record stays unresolved and no completion badge is shown.",
    verificationMethod: "Third-party receipt and public pledge log",
    publicDescription:
      "Each side is better off than the no-trade baseline using participant-relative priorities. Email victoria@example.org for private coordination.",
    evidenceUrl: "https://example.com/receipt",
    participantImportance: 7,
    counterpartyThreshold: 6,
  });

  assert.equal(review.status, "needs_clarification");
  assert.ok(review.underspecifiedFields.includes("Privacy redaction"));
  assert.equal(
    review.verificationLoop.find((step) => step.key === "privacy_redaction")?.status,
    "needs_input",
  );
  assert.ok(review.clarificationQuestions.some((item) => item.field === "Privacy redaction"));
  assert.ok(review.uncertaintyFlags.includes("privacy_redaction_low"));
  assert.ok(review.uncertaintyFlags.includes("privacy:contact_email_in_public_draft"));
  assert.equal(review.trustAssessment.privacyRedaction.rating, "low");
  assert.ok(!review.factorCodes.includes("privacy_safe_preview"));
  assert.ok(review.factorCodes.includes("human_review_required"));
});

test("protocol prohibited-pattern registry blocks every seeded harmful fixture", () => {
  assert.ok(PROHIBITED_MORAL_TRADE_PATTERNS.length >= 5);

  for (const fixture of PROHIBITED_PROPOSAL_FIXTURES) {
    const review = evaluateMoralTradeProtocolDraft(fixture.draft);

    assert.equal(review.status, "blocked", `${fixture.title} should be blocked`);
    assert.ok(
      review.policyConflicts.includes(fixture.code),
      `${fixture.title} should include conflict ${fixture.code}`,
    );
    assert.ok(review.factorCodes.includes("human_review_required"));
  }
});

test("protocol review blocks political campaign offsets instead of merely routing them to review", () => {
  const fixture = PROHIBITED_PROPOSAL_FIXTURES.find(
    (entry) => entry.code === "prohibited_political_campaign_offset",
  );

  assert.ok(fixture);

  const review = evaluateMoralTradeProtocolDraft(fixture.draft);

  assert.equal(review.status, "blocked");
  assert.ok(review.policyConflicts.includes("prohibited_political_campaign_offset"));
  assert.ok(review.policyConflicts.includes("prohibited_content_review"));
});

test("protocol draft review separates factual trust, baseline confidence, and externality review", () => {
  const review = evaluateMoralTradeProtocolDraft({
    format: "offset",
    offeredCause: "Gun rights",
    requestedCause: "Gun control",
    offeredAction:
      "Redirect $1,000 I would otherwise have donated to a gun-rights lobbying group into a global health fund.",
    requestedAction:
      "Redirect a matching $1,000 from gun-control lobbying into the same global health fund.",
    baselineStatement:
      "Without this trade I would otherwise make the lobbying donation next month, and I can support that with prior donation records and dated intent.",
    duration: "3 months",
    exitConditions:
      "If evidence is missing by the review date, the proposal remains unresolved and no completion badge is displayed.",
    verificationMethod: "Third-party audit",
    publicDescription:
      "A voluntary donation offset with a named compromise destination, no custody claim, and manual review before reliance.",
    evidenceUrl: "https://example.com/audit",
  });

  assert.equal(review.status, "needs_human_review");
  assert.equal(review.trustAssessment.factualTrust.rating, "high");
  assert.equal(review.trustAssessment.counterfactualBaseline.rating, "high");
  assert.equal(review.trustAssessment.externalityReview.required, true);
  assert.equal(
    review.verificationLoop.find((step) => step.key === "externality_trigger")?.status,
    "human_review",
  );
  assert.equal(
    review.verificationLoop.find((step) => step.key === "human_review_routing")?.status,
    "human_review",
  );
  assert.ok(review.factorCodes.includes("externality_review_required"));
  assert.ok(review.uncertaintyFlags.includes("externality:political_adjacent_case"));
  assert.ok(review.nextStepChecklist.some((step) => /third-party impact/i.test(step)));
  assert.ok(
    review.citedEvidenceTable.some(
      (row) => row.citation === "https://example.com/audit" && row.status === "evidence_locator",
    ),
  );
});

test("offer review workflow cards expose status, factor codes, next steps, and appeal scope", () => {
  const cards = getOfferReviewWorkflowCards({
    mode: "offset",
    verification: "Manual review required",
    trustLevel: 4,
    baselineAmountUsd: 1000,
    baselineOpposedCause: "Gun rights",
    requestedMatchingAmountUsd: 1000,
    requestedOpposedCause: "Gun control",
    evidenceUrl: "https://example.com/audit",
    moderationStatus: "clear",
    offeredCause: "Gun rights",
    requestedCause: "Gun control",
    currentStatus: "Live offer; evidence and baseline review required before reliance",
    offerImpact: 8,
    minCounterpartyImpact: 7,
  });

  assert.deepEqual(
    cards.map((card) => card.key),
    [
      "current_status",
      "action_evidence",
      "baseline_confidence",
      "externality_review",
      "participant_relative_scores",
      "appeal_scope",
    ],
  );
  assert.ok(cards.every((card) => card.factorCodes.length > 0));
  assert.ok(cards.every((card) => /Next step|Treat|Attach|State|Ask|Use|Do not/.test(card.nextStep)));
  assert.equal(cards.find((card) => card.key === "action_evidence")?.status, "pass");
  assert.equal(cards.find((card) => card.key === "baseline_confidence")?.status, "pass");
  assert.equal(cards.find((card) => card.key === "externality_review")?.status, "human_review");
  assert.ok(
    cards
      .find((card) => card.key === "participant_relative_scores")
      ?.factorCodes.includes("no_global_moral_ranking"),
  );
  assert.match(cards.find((card) => card.key === "appeal_scope")?.summary ?? "", /specific reviewed claim/);
});
