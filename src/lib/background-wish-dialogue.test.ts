import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_WISH_DIALOGUE_VERSION,
  buildBackgroundWishDialogueProposal,
  buildBackgroundWishDialogueSignalRows,
  normalizeBackgroundWishDialogueProposal,
  validateBackgroundWishDialogueProposalForApply,
} from "@/lib/background-wish-dialogue";

test("wish dialogue builds schema-bound broad proposals from explicit text", () => {
  const proposal = buildBackgroundWishDialogueProposal({
    messages: [
      {
        role: "user",
        text:
          "I am exploring an animal welfare public good fund. I can help with research and grantmaking, prefer receipts or independent review, and can do weekly remote work.",
      },
    ],
  });

  assert.equal(proposal.version, BACKGROUND_WISH_DIALOGUE_VERSION);
  assert.deepEqual(proposal.causeAreas, ["animal welfare"]);
  assert.ok(proposal.tradeModes.includes("public_good"));
  assert.ok(proposal.broadCapabilities.includes("research"));
  assert.ok(proposal.broadCapabilities.includes("funding"));
  assert.ok(proposal.verificationPreferences.includes("receipt or evidence"));
  assert.ok(proposal.availabilityHints.includes("weekly cadence"));
  assert.equal(proposal.coarseLocation, "remote_or_online");
  assert.equal("contact_details" in proposal, false);
});

test("wish dialogue prefers unanswered fields over hallucinated specifics", () => {
  const proposal = buildBackgroundWishDialogueProposal({
    messages: [{ role: "user", text: "Maybe I want to help, but I am not sure how yet." }],
  });

  assert.ok(proposal.unansweredFields.includes("causeAreas"));
  assert.ok(proposal.uncertaintyFlags.includes("user_marked_uncertainty"));
  assert.equal(proposal.causeAreas.length, 0);
  assert.equal(proposal.broadCapabilities.length, 0);
});

test("wish dialogue normalization strips unsafe inferred values", () => {
  const proposal = normalizeBackgroundWishDialogueProposal({
    broadCapabilities: ["research", "contact alex@example.org"],
    causeAreas: ["animal welfare"],
    coarseLocation: "123 Market Street",
    tradeModes: ["payment", "invalid"],
  });

  assert.deepEqual(proposal.broadCapabilities, ["research"]);
  assert.equal(proposal.coarseLocation, undefined);
  assert.deepEqual(proposal.tradeModes, ["payment"]);
});

test("wish dialogue apply rows are broad profile signals only", () => {
  const proposal = buildBackgroundWishDialogueProposal({
    messages: [
      {
        role: "user",
        text:
          "Climate research pledge with audit evidence, monthly remote availability, and safety review needed.",
      },
    ],
  });
  const validation = validateBackgroundWishDialogueProposalForApply(proposal);
  const rows = buildBackgroundWishDialogueSignalRows({
    expiresAt: "2026-09-01T00:00:00.000Z",
    profileId: "profile-1",
    proposal,
  });

  assert.deepEqual(validation.errors, []);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.profile_id === "profile-1"));
  assert.ok(rows.every((row) => row.source === "wish_dialogue"));
  assert.equal(JSON.stringify(rows).includes("exact private wish"), false);
});
