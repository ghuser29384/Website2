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
import { filterSiteSearchItems } from "@/lib/site-search";
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

test("public navigation exposes professional marketplace routes", () => {
  const labels = getPrimaryNavLinks(false).map((link) => link.label);
  const hrefs = flattenPrimaryNavHrefs();
  const exploreMenu = getPrimaryNavLinks(false).find((link) => link.label === "Explore");
  const advancedMenu = getPrimaryNavLinks(false).find((link) => link.label === "Advanced");

  assert.deepEqual(labels, ["Explore", "Learn", "Donation offsets", "Public Goods Fund", "Safety", "About", "Advanced"]);
  assert.equal(getTopbarActions(false).primaryAction.href, "/signup?returnTo=/offers/new");
  assert.equal(getTopbarActions(false).primaryAction.label, "Create trade");
  assert.match(exploreMenu?.summary ?? "", /Browse public proposals/);
  assert.ok(exploreMenu?.items?.every((item) => item.description));
  assert.match(advancedMenu?.summary ?? "", /Prototype tools/);
  assert.ok(hrefs.includes("/offers?mode=pledge"));
  assert.ok(hrefs.includes("/donation-offsets"));
  assert.ok(hrefs.includes("/mpgf"));
  assert.ok(hrefs.includes("/offers"));
  assert.ok(hrefs.includes("/background-networking"));
  assert.ok(hrefs.includes("/reasoning-standards"));
  assert.ok(hrefs.includes("/wish-registry"));
  assert.ok(hrefs.includes("/signup"));
  assert.ok(!hrefs.includes("/#background-networking"));
  assert.ok(!hrefs.includes("/#standards"));
  assert.ok(!hrefs.includes("/cart"));
  assert.ok(hrefs.includes("/mpgf/pools"));
  assert.ok(!hrefs.includes("/offers#best-offers"));

  const siteSource = readRepoFile("src/lib/site.ts");
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  assert.match(siteSource, /mailto:support@moraltrade\.org/);
  assert.match(topbarSource, /topbar-menu-heading/);
  assert.match(topbarSource, /topbar-menu-icon/);
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
  assert.match(offersPage, /Worked examples/);
  assert.match(offersPage, /Example matches by cause/);
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

test("global search and offers search expose real marketplace discovery", () => {
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const animalResults = filterSiteSearchItems("animal welfare");
  const mpfgResults = filterSiteSearchItems("manual evidence");

  assert.match(topbarSource, /placeholder="Search trades"/);
  assert.match(topbarSource, /filterSiteSearchItems/);
  assert.match(topbarSource, /topbar-search-results/);
  assert.match(offersPage, /name="search"/);
  assert.match(offersPage, /CAUSE_FILTER_CHIPS/);
  assert.match(offersPage, /IMPACT_FILTER_CHIPS/);
  assert.match(offersPage, /SORT_FILTER_CHIPS/);
  assert.match(offersPage, /parseImpact/);
  assert.match(offersPage, /parseDirectorySort/);
  assert.match(offersPage, /filter-sidebar/);
  assert.match(offersPage, /listingMatchesFilters/);
  assert.match(offersPage, /sortListings/);
  assert.match(appDataSource, /offerMatchesSearchQuery/);
  assert.equal(animalResults[0]?.href, "/offers?search=Animal%20Welfare");
  assert.ok(mpfgResults.some((result) => result.href === "/mpgf"));
});

test("home page is a focused landing page with pilot metrics and marketplace preview", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const heroIndex = homeSource.indexOf("Trade across moral disagreement.");
  const metricsIndex = homeSource.indexOf("pilot-metric-grid");
  const formatsIndex = homeSource.indexOf("format-card-grid");
  const previewIndex = homeSource.indexOf("Worked examples, not live offers.");

  assert.ok(heroIndex > -1);
  assert.ok(metricsIndex > heroIndex);
  assert.ok(formatsIndex > metricsIndex);
  assert.ok(previewIndex > formatsIndex);
  assert.match(homeSource, /Explore trades/);
  assert.match(homeSource, /Create a trade/);
  assert.match(homeSource, /marketplaceOverview/);
  assert.match(homeSource, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(homeSource, /worked examples/);
  assert.match(homeSource, /3 trade formats/);
  assert.match(homeSource, /Manual review before reliance/);
  assert.match(homeSource, /External-payment evidence only/);
  assert.equal(homeSource.includes("opening-sequence"), false);
  assert.equal(homeSource.includes("OfferComposer"), false);
  assert.equal(homeSource.includes("ParetoChart"), false);
});

test("homepage metrics use live counts when available and avoid fake impact totals", () => {
  const pageSource = readRepoFile("src/app/page.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");

  assert.match(pageSource, /getMarketplaceOverview/);
  assert.match(homeSource, /Live offers/);
  assert.match(homeSource, /Public profiles/);
  assert.match(homeSource, /Reviewed offsets/);
  assert.match(homeSource, /No escrow or custody claim/);
  assert.match(appDataSource, /openOfferCount/);
  assert.match(appDataSource, /completedAgreementCount/);
  assert.equal(homeSource.includes("total value traded"), false);
  assert.equal(homeSource.includes("registered users"), false);
});

test("MPGF signed-out manual evidence copy and controls are gated", () => {
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");

  assert.match(consoleSource, /Manual evidence submission is available after sign-in\./);
  assert.equal(consoleSource.includes("Manual evidence submission is enabled"), false);
  assert.match(consoleSource, /disabled=\{!viewerPresent\}/);
  assert.match(consoleSource, /if \(!viewerPresent\)/);
});

test("background networking and reasoning standards are distinct public routes", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const standardsPage = readRepoFile("src/app/reasoning-standards/page.tsx");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(backgroundPage, /Find possible trades without turning people into targets/);
  assert.match(backgroundPage, /does not ingest private feeds/);
  assert.match(backgroundPage, /No autonomous outreach/);
  assert.match(standardsPage, /Make trade records specific enough to judge/);
  assert.match(standardsPage, /not legal escrow/i);
  assert.match(standardsPage, /voluntary/i);
  assert.match(sitemapSource, /\/background-networking/);
  assert.match(sitemapSource, /\/reasoning-standards/);
});

test("dashboard exposes existing profile portability endpoints", () => {
  const dashboardSource = readRepoFile("src/app/dashboard/page.tsx");
  const panelSource = readRepoFile("src/components/dashboard/profile-portability-panel.tsx");
  const exportRoute = readRepoFile("src/app/api/profile/export/route.ts");
  const importRoute = readRepoFile("src/app/api/profile/import/route.ts");

  assert.match(dashboardSource, /ProfilePortabilityPanel/);
  assert.match(panelSource, /\/api\/profile\/export/);
  assert.match(panelSource, /\/api\/profile\/import/);
  assert.match(panelSource, /\/api\/profile\/schema/);
  assert.match(panelSource, /replaceExisting/);
  assert.match(exportRoute, /schemaUrl: "\/api\/profile\/schema"/);
  assert.match(exportRoute, /importUrl: "\/api\/profile\/import"/);
  assert.match(importRoute, /buildDeterministicSynthesis/);
});

test("public guidance describes verification pipelines without custody overclaims", () => {
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const mpfgPage = readRepoFile("src/app/mpgf/page.tsx");
  const priorityFundPage = readRepoFile("src/app/priority-correction-fund/page.tsx");
  const joinedSources = [donationOffsetsPage, mpfgPage, priorityFundPage].join("\n");

  assert.match(donationOffsetsPage, /Rule-based screening/);
  assert.match(donationOffsetsPage, /not platform custody, tax advice, or legal escrow/);
  assert.match(mpfgPage, /Manual evidence starts review/);
  assert.match(mpfgPage, /does not hold money, claim legal escrow, or provide tax advice/);
  assert.match(priorityFundPage, /10% of verified donations plus 10% of verified member-to-member/);
  assert.match(priorityFundPage, /top 10% of karma/);
  assert.equal(joinedSources.includes("Escrow-backed"), false);
  assert.equal(joinedSources.includes("guaranteed custody"), false);
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

test("offer creation form exposes preset templates without weakening validation", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");

  assert.match(offerForm, /OFFER_TEMPLATES/);
  assert.match(offerForm, /Vegetarian pledge swap/);
  assert.match(offerForm, /Matched donation offset/);
  assert.match(offerForm, /Paid action trial/);
  assert.match(offerForm, /applyOfferTemplate/);
  assert.match(offerForm, /Templates only fill the form/);
  assert.match(offerForm, /setOfferAction\(template\.offerAction\)/);
  assert.match(offerForm, /disabled=\{!canPublishOffer\}/);
  assert.match(offerForm, /liveOfferErrors/);
});

test("offers page keeps content before the footer in source order", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const mainIndex = offersPage.indexOf("<main");
  const directoryIndex = offersPage.indexOf("Offer marketplace");
  const exampleIndex = offersPage.indexOf("Example matches by cause");
  const footerIndex = offersPage.indexOf("<SiteFooter />");

  assert.ok(mainIndex > -1);
  assert.ok(directoryIndex > mainIndex);
  assert.ok(exampleIndex > directoryIndex);
  assert.ok(footerIndex > exampleIndex);
});

test("create trade route family has stable signed-out entry points", () => {
  const createRoute = readRepoFile("src/app/create/page.tsx");
  const newOfferPage = readRepoFile("src/app/offers/new/page.tsx");

  assert.match(createRoute, /redirect\("\/offers\/new"\)/);
  assert.match(newOfferPage, /Create an account to save and publish a structured trade proposal/);
  assert.match(newOfferPage, /\/signup\?returnTo=\/offers\/new/);
  assert.match(newOfferPage, /\/login\?returnTo=\/offers\/new/);
  assert.equal(newOfferPage.includes("requireViewer"), false);
});

test("marketplace pilot copy separates live offers from worked examples", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");

  assert.match(offersPage, /Live offers/);
  assert.match(offersPage, /Worked examples/);
  assert.match(offersPage, /No live offers yet/);
  assert.match(offersPage, /You can inspect worked examples or create the first public offer/);
  assert.equal(offersPage.includes("worked example s"), false);
  assert.equal(offersPage.includes("Live participant offers will appear here"), false);
});
