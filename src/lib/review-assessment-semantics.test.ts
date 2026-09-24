import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { getOfferReviewWorkflowCards } from "./proposal-review";
test("a URL and clear moderation do not attest to completed evidence or baseline reviews", () => {
  const cards = getOfferReviewWorkflowCards({ mode: "offset", verification: "Receipt", evidenceUrl: "https://example.invalid/proof", moderationStatus: "clear", trustLevel: 5, baselineAmountUsd: 100, baselineOpposedCause: "Cause A", currentStatus: "open" });
  for (const key of ["action_evidence", "baseline_confidence"]) {
    const card = cards.find((c) => c.key === key)!;
    assert.equal(card.status, "human_review"); assert.equal(card.assessmentLabel, "Awaiting reviewer");
  }
  assert.ok(cards.every((c) => !/^(pass|approved|reviewed)$/i.test(c.assessmentLabel)));
});
test("no externality trigger is labeled as screening, not as safety approval", () => {
  const cards = getOfferReviewWorkflowCards({ mode: "pledge", verification: "Self-attestation", currentStatus: "open" });
  const card = cards.find((c) => c.key === "externality_review")!;
  assert.equal(card.status, "human_review"); assert.equal(card.assessmentLabel, "No listed trigger detected");
  assert.match(card.assessmentReason, /does not establish.*reviewed/);
  assert.equal(cards.find((c) => c.key === "baseline_confidence")?.assessmentLabel, "Not assessed");
});
test("real blockers stay blocking and generic rejection templates are not current-record findings", () => {
  const cards = getOfferReviewWorkflowCards({ mode: "payment", verification: "", currentStatus: "Blocked by anti-threat policy" });
  assert.equal(cards[0].status, "blocked"); assert.equal(cards[0].assessmentLabel, "Blocked");
  const source = readFileSync("src/app/offers/[offerId]/page.tsx", "utf8");
  assert.doesNotMatch(source, /participantReviewCopy\.safetyWarningCopy|participantReviewCopy\.needsEvidenceStatusCopy/);
  assert.match(source, /card\.assessmentLabel/); assert.match(source, /card\.assessmentReason/);
});
test("retired heuristic library and visualization assets are absent, with honest route handoffs", () => {
  for (const name of ["offer-plane-inline-client.tsx", "offer-plane-inline-mount.tsx", "offer-plane-disclosure.module.css", "offer-plane-inline.module.css", "offer-visual-card.tsx", "offer-visual-directory-mount.tsx"]) assert.equal(existsSync(`src/app/offers/${name}`), false);
  assert.equal(existsSync("src/lib/offer-plane.ts"), false);
  assert.match(readFileSync("src/app/api/offers/plane/route.ts", "utf8"), /status: 410/);
  assert.match(readFileSync("src/app/offers/plane/page.tsx", "utf8"), /permanentRedirect\("\/discover"\)/);
});
