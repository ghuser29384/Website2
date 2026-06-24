import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicReceiptCardPreview,
  validatePublicReceiptCardDraft,
  type PublicReceiptCardDraft,
} from "./public-receipt-cards";

const validDraft: PublicReceiptCardDraft = {
  claimCopy:
    "Participant reports a reviewed donation-offset completion with evidence level shown below.",
  claimKind: "donation_offset",
  correctionStatus: "none",
  directDonationParityNote:
    "Direct donation remains at parity; Moral Trade does not prefer this route over giving directly.",
  evidenceLevel: "receipt_reviewed",
  netAttributionNote:
    "Net attribution is limited to the reviewed redirected amount after excluding unmatched surplus.",
  participantOptIn: true,
  publicActionSummary: "Reviewed donation-offset receipt",
  receiptId: "receipt-card-1",
  reviewed: true,
  sensitiveActionRedacted: true,
  title: "Reviewed offset receipt",
  verificationUrl: "/api/moral-trade/public-receipts/receipt-card-1/verify",
  visibility: "opt_in_public",
};

test("public receipt card preview requires opt-in, review, verification, and redaction", () => {
  const preview = buildPublicReceiptCardPreview(validDraft);

  assert.equal(preview.validation.status, "pass");
  assert.equal(preview.visibility, "opt_in_public");
  assert.equal(preview.directDonationParityNote.includes("Direct donation"), true);
  assert.equal(preview.netAttributionNote.includes("Net attribution"), true);
});

test("public receipt card validator blocks publication without consent and review", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    participantOptIn: false,
    reviewed: false,
    verificationUrl: "",
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("participant_opt_in_required"));
  assert.ok(validation.blockers.includes("review_required_before_publication"));
  assert.ok(validation.blockers.includes("verification_url_required"));
});

test("public receipt card validator blocks ranking, endorsement, private fields, and missing parity", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy:
      "Leaderboard rank #1. Platform endorses this as morally superior. See private note.",
    directDonationParityNote: "Use this route.",
    title: "Achievement unlocked",
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("direct_donation_parity_note_required"));
  assert.ok(validation.blockers.includes("objective_moral_endorsement_claim"));
  assert.ok(validation.blockers.includes("gamification_or_ranking_claim"));
  assert.ok(validation.blockers.includes("private_field_leakage"));
});

test("public receipt card validator requires sensitive action redaction before public visibility", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    claimKind: "pledge_swap",
    evidenceLevel: "self_attestation",
    sensitiveActionRedacted: false,
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("sensitive_action_redaction_required"));
});
