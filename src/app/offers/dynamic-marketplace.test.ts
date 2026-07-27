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
const dealroomPage = [
  readFileSync("src/app/deals/[agreementId]/page.tsx", "utf8"),
  readFileSync("src/app/deals/[agreementId]/dealroom-main-sections.tsx", "utf8"),
  readFileSync("src/app/deals/[agreementId]/dealroom-history.tsx", "utf8"),
].join("\n");
const questionPage = readFileSync(
  "src/app/offers/[offerId]/question/page.tsx",
  "utf8",
);
const questionAction = readFileSync(
  "src/app/offers/[offerId]/question/actions.ts",
  "utf8",
);
const questionForm = readFileSync(
  "src/app/offers/[offerId]/question/offer-question-form.tsx",
  "utf8",
);
const pledgeCounteroffer = readFileSync("src/app/trades/new/page.tsx", "utf8");
const offsetCounteroffer = readFileSync("src/app/offers/new/page.tsx", "utf8");
const commentThread = readFileSync(
  "src/components/community/comment-thread.tsx",
  "utf8",
);
const marketplaceCleanup = readFileSync(
  "src/app/dynamic-marketplace-cleanup.css",
  "utf8",
);
const serverActions = readFileSync("src/app/actions.ts", "utf8");

function extractFunction(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing function marker: ${startMarker}`);
  assert.ok(end > start, `Missing function end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("the live marketplace groups generated combinations into participant offer menus", () => {
  assert.match(offersSurface, /buildParticipantOfferFamilies/);
  assert.match(offersSurface, /distinct participants/);
  assert.match(offersSurface, /distinct offer families/);
  assert.match(offersSurface, /available combinations/);
  assert.match(offersSurface, /Pagination applies to participants rather than generated pairings/);
});

test("participant menus retain the constraint-aware smart-search pipeline", () => {
  assert.match(offersSurface, /parseSmartQuery/);
  assert.match(offersSurface, /mergeSmartQueryFacets/);
  assert.match(offersSurface, /matchesSmartAmountConstraint/);
  assert.match(offersSurface, /matchesSmartDeadlineConstraint/);
  assert.match(offersSurface, /matchesSmartVerificationConstraint/);
  assert.match(offersSurface, /preserveInputOrder: true/);
  assert.match(offersSurface, /SmartQueryForm/);
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
  assert.match(participantMenu, /SaveOfferSubmitButton/);
  assert.match(participantMenu, /"Saving…"/);
  assert.match(participantMenu, /"Removing…"/);
  assert.match(participantMenu, />\s*Ask a question\s*</);
  assert.match(participantMenu, /Eligible for weekly review/);
});

test("counteroffers preserve and visibly reverse their source proposal", () => {
  assert.match(participantMenu, /source_offer=\$\{selectedPairing\.id\}/);
  assert.match(pledgeCounteroffer, /sourceOffer\.requested_cause/);
  assert.match(pledgeCounteroffer, /sourceOffer\.offer_action/);
  assert.match(pledgeCounteroffer, /Counteroffer to proposal/);
  assert.match(pledgeCounteroffer, /acceptCommandHandoff=\{acceptsCommandHandoff\}/);
  assert.match(offsetCounteroffer, /source_offer/);
  assert.match(offsetCounteroffer, /baselineAmountUsd: ""/);
  assert.match(offsetCounteroffer, /requestedMatchingAmountUsd: ""/);
  assert.match(offsetCounteroffer, /no amount is inferred/i);
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

test("the question path refreshes, confirms, and clears after a real public comment", () => {
  assert.match(questionPage, /OfferQuestionForm/);
  assert.match(questionPage, /comments\.length/);
  assert.match(questionPage, /role=\{formMessage\.tone === "error" \? "alert" : "status"\}/);
  assert.doesNotMatch(questionPage, /The thread is empty until/);
  assert.match(questionAction, /revalidatePath\(`\/offers\/\$\{offerId\}\/question`\)/);
  assert.match(questionAction, /addOfferCommentAction\(formData\)/);
  assert.match(questionForm, /formRef\.current\?\.reset\(\)/);
  assert.match(questionForm, /Posting question…/);
  assert.doesNotMatch(questionPage, /0 comment/);
});

test("private commitments enter a dealroom with real term and event actions", () => {
  assert.match(commitmentsPage, /href=\{summary\.dealroomHref\}/);
  assert.match(commitmentsPage, /Open dealroom/);
  assert.match(dealroomPage, /DealroomTermsEditor/);
  assert.match(dealroomPage, /action=\{addAgreementEventAction\}/);
  assert.match(dealroomPage, /value="counterproposal"/);
  assert.match(dealroomPage, /action=\{confirmAgreementVersionAction\}/);
  assert.match(dealroomPage, /name="agreement_version_id"/);
  assert.match(dealroomPage, /name="terms_reviewed"/);
  assert.doesNotMatch(dealroomPage, /updateAgreementStatusAction/);
  assert.match(dealroomPage, /What changed, when, and why/);
});

test("email notifications use the server-only outbox client", () => {
  const queueEmailOutbox = extractFunction(
    serverActions,
    "async function queueEmailOutbox({",
    "async function requireAdminViewer",
  );
  assert.match(queueEmailOutbox, /const supabase = createServiceClient\(\);/);
  assert.doesNotMatch(queueEmailOutbox, /await createClient\(\)/);
});

test("empty evidence and review modules are omitted from commitment rows", () => {
  assert.match(commitmentsPage, /summary\.evidenceState \?/);
  assert.match(commitmentsPage, /summary\.reviewState \?/);
  assert.doesNotMatch(commitmentsPage, /No evidence item yet/);
  assert.doesNotMatch(commitmentsPage, /No review case/);
});

test("dormant social modules do not masquerade as marketplace activity", () => {
  assert.match(commentThread, /if \(!comments\.length\) \{\s*return null;/);
  assert.doesNotMatch(commentThread, /No public comments yet/);
  assert.match(marketplaceCleanup, /:has\(> \.data-grid > \.empty-state\)/);
  assert.match(marketplaceCleanup, /:has\(#marketplace-detail-section-heading\)/);
});
