import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const offersPage = readFileSync("src/app/offers/page.tsx", "utf8");
const offersSurface = [
  offersPage,
  readFileSync("src/app/offers/offers-market-data.ts", "utf8"),
  readFileSync("src/app/offers/offers-market-directory.tsx", "utf8"),
  readFileSync("src/app/offers/offers-market-intro.tsx", "utf8"),
  readFileSync("src/app/offers/offers-market-secondary.tsx", "utf8"),
].join("\n");
const participantMenu = readFileSync(
  "src/components/marketplace/participant-offer-menu.tsx",
  "utf8",
);
const commitmentsPage = readFileSync("src/app/commitments/page.tsx", "utf8");
const dealroomPage = readFileSync("src/app/deals/[agreementId]/page.tsx", "utf8");
const questionPage = readFileSync(
  "src/app/offers/[offerId]/question/page.tsx",
  "utf8",
);

test("the live marketplace groups generated combinations into participant offer menus", () => {
  assert.match(offersSurface, /buildParticipantOfferFamilies/);
  assert.match(offersSurface, /distinct participants/);
  assert.match(offersSurface, /distinct offer families/);
  assert.match(offersSurface, /available combinations/);
  assert.match(offersSurface, /Pagination applies to people, not generated combinations/);
});

test("the weekly clearing round is explicit without promising a match", () => {
  assert.match(offersSurface, /Thursday 17:00 UTC cutoff/);
  assert.match(offersSurface, /consent-based Monday introductions/);
  assert.match(offersSurface, /A match is never guaranteed/);
  assert.match(offersSurface, /Operator-assisted clearing/);
});

test("participant cards expose the core transaction actions directly", () => {
  assert.match(participantMenu, />\s*Propose match\s*</);
  assert.match(participantMenu, />\s*Counteroffer\s*</);
  assert.match(participantMenu, /\{saved \? "Remove saved" : "Save"\}/);
  assert.match(participantMenu, />\s*Ask a question\s*</);
  assert.match(participantMenu, /Eligible for weekly review/);
});

test("empty outcome claims remain truthful and worked examples stay separate", () => {
  assert.match(offersSurface, /No completed agreement is published here yet/);
  assert.match(offersSurface, /Worked example · not live · not completed/);
  assert.match(offersSurface, /not marketplace activity or proof of a completed\s+trade/);
});

test("the template path remains available and the walkthrough behavior is not replaced", () => {
  assert.match(offersSurface, /return <TradeTemplateLibrary \/>/);
  assert.doesNotMatch(offersPage, /redirect\([^)]*walkthrough/);
});

test("the question path posts a real public comment without an empty counter widget", () => {
  assert.match(questionPage, /action=\{addOfferCommentAction\}/);
  assert.match(questionPage, /comments\.length \?/);
  assert.doesNotMatch(questionPage, /0 comment/);
});

test("private commitments enter a dealroom with real term and event actions", () => {
  assert.match(commitmentsPage, /href=\{summary\.dealroomHref\}/);
  assert.match(commitmentsPage, /Open dealroom/);
  assert.match(dealroomPage, /DealroomTermsEditor/);
  assert.match(dealroomPage, /action=\{addAgreementEventAction\}/);
  assert.match(dealroomPage, /value="counterproposal"/);
  assert.match(dealroomPage, /action=\{updateAgreementStatusAction\}/);
  assert.match(dealroomPage, /What changed, when, and why/);
});

test("empty evidence and review modules are omitted from commitment rows", () => {
  assert.match(commitmentsPage, /summary\.evidenceState \?/);
  assert.match(commitmentsPage, /summary\.reviewState \?/);
  assert.doesNotMatch(commitmentsPage, /No evidence item yet/);
  assert.doesNotMatch(commitmentsPage, /No review case/);
});
