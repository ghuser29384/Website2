import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const actions = readFileSync(path.join(root, "src/app/actions.ts"), "utf8");
const offersPage = readFileSync(path.join(root, "src/app/offers/page.tsx"), "utf8");
const offerDetail = readFileSync(path.join(root, "src/app/offers/[offerId]/page.tsx"), "utf8");
const offersNew = readFileSync(path.join(root, "src/app/offers/new/page.tsx"), "utf8");
const tradesNew = readFileSync(path.join(root, "src/app/trades/new/page.tsx"), "utf8");
const participantGroup = readFileSync(
  path.join(root, "src/components/marketplace/participant-offer-group.tsx"),
  "utf8",
);
const questionForm = readFileSync(
  path.join(root, "src/components/marketplace/offer-question-form.tsx"),
  "utf8",
);
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260729170000_marketplace_atomic_acceptance_current_core.sql"),
  "utf8",
);

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("email outbox writes remain server-only", () => {
  const outbox = between(
    actions,
    "async function queueEmailOutbox",
    "async function requireAdminViewer",
  );
  assert.match(outbox, /createServiceClient\(\)/);
  assert.doesNotMatch(outbox, /await createClient\(\)/);
});

test("member and guest acceptance call atomic database boundaries", () => {
  const member = between(
    actions,
    "export async function acceptInterestAction",
    "export async function acceptGuestInterestAction",
  );
  const guest = between(
    actions,
    "export async function acceptGuestInterestAction",
    "export async function rateAgreementAction",
  );

  assert.match(member, /accept_marketplace_interest_v1/);
  assert.match(guest, /accept_marketplace_guest_interest_v1/);
  assert.doesNotMatch(member, /\.from\("interests"\)[\s\S]*?status:\s*"accepted"/);
  assert.doesNotMatch(guest, /\.from\("guest_interests"\)[\s\S]*?status:\s*"accepted"/);
});

test("member and claimed-guest acceptance land on the created agreement", () => {
  const member = between(
    actions,
    "export async function acceptInterestAction",
    "export async function acceptGuestInterestAction",
  );
  const guest = between(
    actions,
    "export async function acceptGuestInterestAction",
    "export async function rateAgreementAction",
  );
  const canonicalCreatedAgreementRedirect =
    /redirectWithMessage\(\s*`\/trade-agreements\/\$\{agreement\.id\}`,\s*"message"/;

  assert.match(member, canonicalCreatedAgreementRedirect);
  assert.match(guest, /const agreement = acceptancePayload\?\.agreement/);
  assert.match(guest, canonicalCreatedAgreementRedirect);
});

test("migration aligns with the existing core-trade schema rather than adding a second one", () => {
  assert.match(migration, /trade_agreement_versions/);
  assert.match(migration, /trade_agreement_confirmations/);
  assert.match(migration, /offer_row\.status::text = 'matched'/);
  assert.match(migration, /accepted_interest\.status::text = 'accepted'/);
  assert.match(migration, /accepted_guest\.status::text = 'accepted'/);
  assert.doesNotMatch(migration, /completion_state/);
  assert.doesNotMatch(migration, /agreement_evidence_items/);
  assert.doesNotMatch(migration, /agreement_review_cases/);
});

test("directory groups exact proposals and exposes exact-offer actions", () => {
  assert.match(offersPage, /groupOffersByParticipant/);
  assert.match(offersPage, /ParticipantOfferGroup/);
  assert.doesNotMatch(offersPage, /LiveProposalCard/);
  assert.match(participantGroup, /Exact published proposal/);
  assert.match(participantGroup, /source_offer=\$\{offer\.id\}/);
  assert.match(participantGroup, /name="offer_id"[\s\S]*value=\{offer\.id\}/);
  assert.match(participantGroup, /These are the owner&apos;s exact published terms/);
});

test("pledge counteroffers keep the exact source id and reverse its authorized terms", () => {
  assert.match(offersNew, /new URLSearchParams\(\{ source_offer: sourceOfferId \}\)/);
  assert.match(offersNew, /redirect\(`\/trades\/new\?\$\{tradeParams\.toString\(\)\}`\)/);
  assert.match(tradesNew, /const sourceOfferId = valueOf\(resolvedSearchParams\.source_offer\)/);
  assert.match(tradesNew, /offeredCause: sourceOffer\.requested_cause/);
  assert.match(tradesNew, /requestedCause: sourceOffer\.offered_cause/);
  assert.match(tradesNew, /proposedAction: sourceOffer\.request_action/);
  assert.match(tradesNew, /requestedAction: sourceOffer\.offer_action/);
  assert.match(tradesNew, /Counteroffer to \$\{sourceOffer\.ownerProfile\?\.resolvedName/);
});

test("question form has pending state, explicit success type, and success reset", () => {
  assert.match(questionForm, /useFormStatus/);
  assert.match(questionForm, /Posting question…/);
  assert.match(questionForm, /formRef\.current\?\.reset/);
  assert.match(offerDetail, /OfferQuestionForm/);
  assert.match(offerDetail, /id="discussion"/);
  assert.match(actions, /Question posted\./);
});

test("candidate keeps the canonical message and trade-agreement architecture", () => {
  const candidateSources = [
    actions,
    offersPage,
    offerDetail,
    offersNew,
    tradesNew,
    participantGroup,
    questionForm,
  ].join("\n");
  assert.match(participantGroup, /\/offers\/new\?mode=\$\{offer\.mode\}&source_offer=\$\{offer\.id\}/);
  assert.doesNotMatch(candidateSources, /\/deals\//);
  assert.doesNotMatch(candidateSources, /dealroom-main-sections/);
});
