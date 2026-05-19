import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { demoAlternatives, MPGF_COPY } from "@/lib/mpgf/data";
import { getAllOffers } from "@/lib/offers";
import {
  CANONICAL_WORKED_CASE_COUNT,
  CANONICAL_WORKED_CASE_OFFERS,
} from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function flattenPrimaryNavHrefs() {
  return getPrimaryNavLinks(false).flatMap((link) => [
    ...(link.href ? [link.href] : []),
    ...(link.items?.map((item) => item.href) ?? []),
  ]);
}

test("public navigation points at the flagship MPGF flow and hides unfinished routes", () => {
  const hrefs = flattenPrimaryNavHrefs();

  assert.equal(getTopbarActions(false).primaryAction.href, "/mpgf/contribute");
  assert.ok(hrefs.includes("/mpgf"));
  assert.ok(hrefs.includes("/offers"));
  assert.ok(hrefs.includes("/donate"));
  assert.ok(!hrefs.includes("/cart"));
  assert.ok(!hrefs.includes("/wish-registry"));
  assert.ok(!hrefs.includes("/donation-offsets"));
  assert.ok(!hrefs.includes("/mpgf/pools"));
  assert.ok(!hrefs.includes("/offers#best-offers"));
});

test("MPGF public copy leads with manual evidence instead of raw gate/debug wording", () => {
  assert.match(MPGF_COPY.plainLanguageSummary, /manual external-payment evidence/i);
  assert.match(MPGF_COPY.manualExternalPaymentEvidence, /review/i);

  const publicMpgfSources = [
    "src/app/mpgf/page.tsx",
    "src/app/mpgf/contribute/page.tsx",
    "src/components/mpgf/mpgf-page-frame.tsx",
    "src/components/mpgf/mpgf-console.tsx",
    "src/app/loading.tsx",
  ].map(readRepoFile).join("\n");

  for (const forbidden of [
    "Smoke test",
    "Real money disabled",
    "MPGF_MANUAL_EVIDENCE",
    "approval gates must be ready",
    "Preparing the latest public records",
  ]) {
    assert.equal(publicMpgfSources.includes(forbidden), false, `public source leaked: ${forbidden}`);
  }
});

test("manual evidence submission is not gated by feature flags or approval rows", () => {
  const realMoneySource = readRepoFile("src/lib/mpgf/real-money.ts");
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");
  const envExample = readRepoFile(".env.example");

  assert.equal(realMoneySource.includes("MPGF_MANUAL_EVIDENCE_ENABLED"), false);
  assert.equal(realMoneySource.includes("MPGF_MANUAL_EVIDENCE_ACCEPTANCE_ENABLED"), false);
  assert.equal(realMoneySource.includes("Required MPGF manual evidence gate"), false);
  assert.equal(realMoneySource.includes("MPGF manual external-payment evidence is not enabled yet"), false);
  assert.equal(consoleSource.includes("!manualEvidenceReadiness?.ready"), false);
  assert.equal(envExample.includes("MPGF_MANUAL_EVIDENCE_ENABLED"), false);
  assert.match(realMoneySource, /from\("mpgf_manual_external_payment_evidence"\)\s*\n\s*\.insert/);
});

test("MPGF pool reasoning form requires the build-instruction proposal fields", () => {
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");
  const actionSource = readRepoFile("src/app/mpgf/actions.ts");
  const persistenceSource = readRepoFile("src/lib/mpgf/persistence.ts");

  for (const requiredLabel of [
    "Summary",
    "Cause area",
    "Requested maximum funding",
    "Minimum viable funding",
    "Output unit label",
    "Output unit definition",
    "Measurement method",
    "Expected effect vs funding",
    "Timeline",
    "Milestones",
    "Risks",
    "Misuse pathways",
    "Proposed recipient",
    "Implementing team",
  ]) {
    assert.ok(consoleSource.includes(requiredLabel), `pool reasoning form missing ${requiredLabel}`);
  }

  for (const requiredField of [
    "requestedMaximumFundingDollars",
    "outcomeUnitDefinition",
    "expectedEffectVsFunding",
    "misusePathways",
    "implementingTeam",
  ]) {
    assert.ok(actionSource.includes(requiredField), `pool proposal action missing ${requiredField}`);
  }

  for (const requiredColumn of [
    "requested_maximum_funding_cents",
    "outcome_units_summary",
    "expected_effect_vs_funding",
    "milestones_json",
    "risks_json",
    "implementing_team_json",
  ]) {
    assert.ok(persistenceSource.includes(requiredColumn), `pool proposal persistence missing ${requiredColumn}`);
  }
});

test("MPGF demo pools distinguish consensus and hybrid goods without changing allocation", () => {
  const poolsPageSource = readRepoFile("src/app/mpgf/pools/page.tsx");
  const poolDetailSource = readRepoFile("src/app/mpgf/pools/[poolId]/page.tsx");

  assert.ok(demoAlternatives.some((alternative) => alternative.isConsensus));
  assert.ok(demoAlternatives.some((alternative) => alternative.isHybrid));
  assert.ok(
    demoAlternatives.every(
      (alternative) =>
        alternative.preferenceIntensityHint &&
        alternative.expectedMoralImpactTooltip &&
        alternative.demoPriorityBps >= 0,
    ),
  );
  assert.match(poolsPageSource, /name="kind"/);
  assert.match(poolsPageSource, /name="sort"/);
  assert.match(poolsPageSource, /name="min_intensity"/);
  assert.match(poolsPageSource, /Consensus goods/);
  assert.match(poolsPageSource, /Hybrid goods/);
  assert.match(poolDetailSource, /Good type/);
  assert.match(poolDetailSource, /expectedMoralImpactTooltip/);
});

test("MPGF participant mutations require idempotency and audit evidence tables", () => {
  const actionSource = readRepoFile("src/app/mpgf/actions.ts");
  const persistenceSource = readRepoFile("src/lib/mpgf/persistence.ts");
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");
  const controlsSource = readRepoFile("src/components/mpgf/mpgf-contribution-controls.tsx");
  const migrationSource = readRepoFile("supabase/migrations/20260516_mpgf_participant_mutation_controls.sql");

  for (const publicAction of [
    "recordMpgfPledgesAction",
    "cancelMpgfPledgeAction",
    "updateMpgfRecurringCommitmentStatusAction",
    "saveMpgfPoolProposalAction",
    "saveMpgfBallotAction",
  ]) {
    assert.ok(actionSource.includes(publicAction), `missing MPGF public mutation action ${publicAction}`);
  }

  assert.match(actionSource, /idempotencyKey: string/);
  assert.match(consoleSource, /createClientMutationKey/);
  assert.match(controlsSource, /createClientMutationKey/);
  assert.match(persistenceSource, /reserveIdempotency/);
  assert.match(persistenceSource, /request_hash/);
  assert.match(persistenceSource, /recordParticipantMutationEvidence/);
  assert.match(persistenceSource, /mpgf_state_transition_logs/);
  assert.match(persistenceSource, /mpgf_operational_events/);
  assert.match(migrationSource, /create unique index if not exists mpgf_idempotency_keys_scope_key_idx/);
  assert.match(migrationSource, /mpgf_state_transition_logs/);
  assert.match(migrationSource, /mpgf_operational_events/);
});

test("login supports MPGF return-to routes used by participant onboarding", () => {
  const loginPageSource = readRepoFile("src/app/login/page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const mpfgContributePageSource = readRepoFile("src/app/mpgf/contribute/page.tsx");
  const mpfgAccountPageSource = readRepoFile("src/app/mpgf/account/contributions/page.tsx");
  const participantProfile = readRepoFile("config/mpgf/participant-onboarding-profile.json");
  const smokeProfile = readRepoFile("config/mpgf/www-smoke-test-profile.json");

  assert.match(loginPageSource, /resolvedSearchParams\.returnTo/);
  assert.match(loginPageSource, /getSafeInternalPath\(requestedReturnTo \|\| requestedNext/);
  assert.match(appDataSource, /\/login\?returnTo=/);
  assert.match(mpfgContributePageSource, /\/login\?returnTo=\/mpgf\/contribute/);
  assert.match(mpfgAccountPageSource, /\/login\?returnTo=\/mpgf\/account\/contributions/);
  assert.match(participantProfile, /"authEntryRoute": "\/signup\?returnTo=\/mpgf"/);
  assert.match(smokeProfile, /"authRoute": "\/login\?returnTo=\/mpgf"/);
});

test("public offer and registry pages include seeded examples instead of empty-only states", () => {
  assert.equal(CANONICAL_WORKED_CASE_COUNT, 8);
  assert.equal(getAllOffers([]).length, CANONICAL_WORKED_CASE_COUNT);
  assert.ok(
    CANONICAL_WORKED_CASE_OFFERS.every((offer) => offer.offerAction && offer.requestAction && offer.verification),
  );

  const offersPage = readRepoFile("src/app/offers/page.tsx");
  assert.match(offersPage, /Example structures/);
  assert.match(offersPage, /CANONICAL_WORKED_CASE_OFFERS/);
  assert.equal(offersPage.includes(["Six", "seeded", "offers"].join(" ")), false);
  assert.equal(offersPage.includes(".slice(0, 6)"), false);
  assert.equal(offersPage.includes("No public offers have been published yet"), false);

  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  assert.match(registryPage, /EXAMPLE_WISH_PREVIEWS/);
  assert.match(registryPage, /filterWishRegistryExamplePreviews/);
  assert.match(registryPage, /Example preview/);
});

test("public copy does not claim escrow-backed payment protection", () => {
  const publicSources = [
    "src/app/donation-offsets/page.tsx",
    "src/app/offers/page.tsx",
    "src/app/offers/[offerId]/page.tsx",
    "src/app/offers/new/page.tsx",
    "src/app/terms/page.tsx",
    "src/components/home/home-page.tsx",
    "src/components/home/offer-board.tsx",
    "src/components/home/offer-composer.tsx",
    "src/components/offers/offer-create-form.tsx",
    "src/lib/donation-offsets.ts",
    "src/lib/offers.ts",
  ].map(readRepoFile).join("\n");

  assert.equal(publicSources.includes(["Escrow", "-backed"].join("")), false);
  assert.equal(publicSources.includes(["Funds", " in escrow"].join("")), false);
  assert.equal(publicSources.includes(["escrow", " confirmation"].join("")), false);
  assert.match(publicSources, /not legal escrow/i);
});

test("home page exposes a single primary nav source", () => {
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");

  assert.match(topbarSource, /aria-label="Primary"/);
  assert.equal(homeSource.includes("topbar-floating-shell"), false);
});

test("MPGF signed-out manual evidence copy and controls are gated", () => {
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");

  assert.match(consoleSource, /Manual evidence submission is available after sign-in\./);
  assert.equal(consoleSource.includes("Manual evidence submission is enabled"), false);
  assert.match(consoleSource, /disabled=\{!viewerPresent\}/);
  assert.match(consoleSource, /if \(!viewerPresent\)/);
});

test("pooled donation offset creation has visible path and server-side guardrails", () => {
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(donationOffsetsPage, /Create pooled offset/);
  assert.match(donationOffsetsPage, /offset_participation_mode=pool/);
  assert.match(offerForm, /offset_pool_maximum_cap_usd/);
  assert.match(offerForm, /offset_anti_threat_certification/);
  assert.match(offerForm, /offset_verification_metadata_acknowledgement/);
  assert.match(actionsSource, /validateDonationOffsetSubmissionGuards/);
});

test("offer creation form has live client validation aligned with server-required fields", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(actionsSource, /const offerAction = readRequired\(formData, "offer_action"\)/);
  assert.match(actionsSource, /const requestAction = readRequired\(formData, "request_action"\)/);
  assert.match(actionsSource, /const notes = readRequired\(formData, "notes"\)/);
  assert.match(offerForm, /liveCoreOfferErrors/);
  assert.match(offerForm, /liveOfferErrors/);
  assert.match(offerForm, /Ready to publish/);
  assert.match(offerForm, /disabled=\{!canPublishOffer\}/);
  assert.match(offerForm, /name="offer_action"[\s\S]*required/);
  assert.match(offerForm, /name="request_action"[\s\S]*required/);
  assert.match(offerForm, /name="notes"[\s\S]*required/);
});

test("offers page keeps content before the footer in source order", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const mainIndex = offersPage.indexOf("<main>");
  const exampleIndex = offersPage.indexOf("Example structures");
  const directoryIndex = offersPage.indexOf("Offer directory");
  const footerIndex = offersPage.indexOf("<SiteFooter />");

  assert.ok(mainIndex > -1);
  assert.ok(exampleIndex > mainIndex);
  assert.ok(directoryIndex > exampleIndex);
  assert.ok(footerIndex > directoryIndex);
});
