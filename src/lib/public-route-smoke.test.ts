import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { PARTNER_COHORTS } from "@/lib/growth";
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
  const browseMenu = getPrimaryNavLinks(false).find((link) => link.label === "Browse");
  const createMenu = getPrimaryNavLinks(false).find((link) => link.label === "Create");
  const siteSource = readRepoFile("src/lib/site.ts");
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");

  assert.deepEqual(labels, ["Browse", "Create", "Learn", "Community"]);
  assert.equal(getTopbarActions(false).primaryAction.href, "/offers?view=examples");
  assert.equal(getTopbarActions(false).primaryAction.label, "See example");
  assert.equal(getTopbarActions(true).primaryAction.href, "/offers/new?mode=offset");
  assert.equal(getTopbarActions(true).primaryAction.label, "Trade");
  assert.equal(getTopbarActions(false).authLink.label, "Sign in");
  assert.match(browseMenu?.summary ?? "", /See current projects/);
  assert.ok(browseMenu?.items?.every((item) => item.description));
  assert.ok(createMenu?.items?.some((item) => item.label === "Trade"));
  assert.ok(hrefs.includes("/projects"));
  assert.ok(hrefs.includes("/about"));
  assert.ok(hrefs.includes("/how-it-works"));
  assert.ok(hrefs.includes("/offers"));
  assert.ok(hrefs.includes("/pledge-swaps"));
  assert.ok(hrefs.includes("/paid-action-offers"));
  assert.ok(hrefs.includes("/donation-offsets"));
  assert.ok(hrefs.includes("/mpgf"));
  assert.ok(hrefs.includes("/validation"));
  assert.ok(hrefs.includes("/moral-trade/technical-spec"));
  assert.ok(hrefs.includes("/offers?view=examples"));
  assert.ok(hrefs.includes("/faq"));
  assert.ok(hrefs.includes("/wish-registry"));
  assert.ok(hrefs.includes("/background-networking"));
  assert.ok(hrefs.includes("/research"));
  assert.ok(hrefs.includes("/cohort"));
  assert.ok(hrefs.includes("/team"));
  assert.ok(hrefs.includes("/updates"));
  assert.ok(!hrefs.includes("/cart"));
  assert.equal(siteSource.includes("label: \"MPGF\""), false);
  assert.equal(siteSource.includes("label: \"Advanced\""), false);
  assert.match(siteSource, /\/contact/);
  assert.match(siteSource, /\/status/);
  assert.match(siteSource, /\/trust/);
  assert.match(siteSource, /\/projects/);
  assert.match(siteSource, /\/updates/);
  assert.match(topbarSource, /topbar-menu-heading/);
  assert.match(topbarSource, /topbar-menu-icon/);
  assert.match(topbarSource, /topbar-with-search/);
  assert.match(topbarSource, /showSearch = true/);
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
  assert.match(offersPage, /Illustrative fit ranking/);
  assert.match(offersPage, /CANONICAL_WORKED_CASE_OFFERS/);
  assert.equal(offersPage.includes(["Six", "seeded", "offers"].join(" ")), false);
  assert.equal(offersPage.includes(".slice(0, 6)"), false);
  assert.equal(offersPage.includes("No public offers have been published yet"), false);

  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  const wishRegistrySource = readRepoFile("src/lib/wish-registry.ts");
  assert.match(registryPage, /EXAMPLE_WISH_PREVIEWS/);
  assert.match(registryPage, /filterWishRegistryExamplePreviews/);
  assert.match(registryPage, /Example preview/);
  assert.match(wishRegistrySource, /getWishRegistryRedactedOverlapTokens/);
  assert.match(wishRegistrySource, /broad_language_overlap_/);
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
  const pagePrimitives = readRepoFile("src/components/ui/page-primitives.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const animalResults = filterSiteSearchItems("animal welfare");
  const mpfgResults = filterSiteSearchItems("manual evidence");
  const validationResults = filterSiteSearchItems("appeal rulebook");

  assert.match(topbarSource, /placeholder="Search trades"/);
  assert.match(topbarSource, /filterSiteSearchItems/);
  assert.match(topbarSource, /topbar-search-results/);
  assert.match(offersPage, /name="search"/);
  assert.match(offersPage, /CAUSE_FILTER_CHIPS/);
  assert.match(offersPage, /type="range"/);
  assert.match(offersPage, /SORT_FILTER_CHIPS/);
  assert.match(offersPage, /parseMinimumScore/);
  assert.match(offersPage, /parseDirectorySort/);
  assert.match(offersPage, /FilterSidebar/);
  assert.match(offersPage, /activeFilterLabels/);
  assert.match(offersPage, /Reset filters/);
  assert.match(offersPage, /popularFilterLinks/);
  assert.match(offersPage, /Popular filters/);
  assert.match(offersPage, /toggleValue/);
  assert.match(offersPage, /groupedListings/);
  assert.match(offersPage, /Jump to cause group/);
  assert.match(offersPage, /highlightedWorkedExamples/);
  assert.match(offersPage, /Study the structure before live offers arrive/);
  assert.match(offersPage, /pilot-info-box/);
  assert.match(offersPage, /formatCounts/);
  assert.match(offersPage, /causeCounts/);
  assert.match(offersPage, /getListingModeIcon/);
  assert.match(offersPage, /primaryActionLabel/);
  assert.match(offersPage, /OfferCard/);
  assert.match(offersPage, /getOfferReviewCardInstrumentation/);
  assert.match(offersPage, /reviewFactorCodes/);
  assert.match(offersPage, /reviewNextStep/);
  assert.match(offersPage, /listingMatchesFilters/);
  assert.match(offersPage, /sortListings/);
  assert.match(pagePrimitives, /listing-factor-codes/);
  assert.match(pagePrimitives, /Next step:/);
  assert.match(globalCss, /listing-factor-codes/);
  assert.match(globalCss, /listing-next-step/);
  assert.match(appDataSource, /offerMatchesSearchQuery/);
  assert.equal(animalResults[0]?.href, "/offers?search=Animal%20Welfare");
  assert.equal(filterSiteSearchItems("pledge swap")[0]?.href, "/pledge-swaps");
  assert.ok(mpfgResults.some((result) => result.href === "/mpgf"));
  assert.ok(validationResults.some((result) => result.href === "/validation"));
});

test("home page is a focused marketplace landing page with pilot metrics and marketplace preview", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const heroIndex = homeSource.indexOf("Cooperate across deep value differences.");
  const metricsIndex = homeSource.indexOf("growth-progress-card");
  const searchIndex = homeSource.indexOf("Search the marketplace");
  const animationIndex = homeSource.indexOf("<MoralTradeAnimations");
  const routeIndex = homeSource.indexOf("Choose the right first path");
  const activationIndex = homeSource.indexOf("Start with one low-risk action");
  const previewIndex = homeSource.indexOf("Marketplace preview");

  assert.ok(heroIndex > -1);
  assert.ok(metricsIndex > heroIndex);
  assert.ok(searchIndex > metricsIndex);
  assert.ok(animationIndex > searchIndex);
  assert.ok(routeIndex > animationIndex);
  assert.ok(activationIndex > routeIndex);
  assert.ok(previewIndex > activationIndex);
  assert.match(homeSource, /See a worked example/);
  assert.match(homeSource, /Donate through a vetted route/);
  assert.match(homeSource, /Join the founding cohort/);
  assert.match(homeSource, /Open worked examples/);
  assert.match(homeSource, /SearchBar/);
  assert.match(homeSource, /Search by cause, action, or trade type/);
  assert.match(homeSource, /Invite one serious counterparty/);
  assert.match(homeSource, /Submit one reviewable proof artifact/);
  assert.match(homeSource, /No autonomous outreach/);
  assert.match(homeSource, /marketplaceOverview/);
  assert.match(homeSource, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(homeSource, /worked examples/);
  assert.match(homeSource, /No custody or escrow/);
  assert.match(homeSource, /Completed agreements/);
  assert.match(homeSource, /IconMark/);
  assert.match(homeSource, /OfferCard/);
  assert.match(homeSource, /getOfferReviewCardInstrumentation/);
  assert.match(homeSource, /reviewFactorCodes/);
  assert.match(homeSource, /reviewNextStep/);
  assert.equal(homeSource.includes("opening-sequence"), false);
  assert.equal(homeSource.includes("OfferComposer"), false);
  assert.equal(homeSource.includes("ParetoChart"), false);
  assert.equal(homeSource.includes("MoralTradeHeroVisual"), false);
  assert.equal(homeSource.includes("delegate heartbeats"), false);
  assert.equal(homeSource.includes("manual source consent ledger"), false);
  assert.equal(homeSource.includes("deterministic synthesis layer"), false);
  assert.equal(homeSource.includes("As featured in"), false);
  assert.equal(homeSource.includes("Hear their stories"), false);
});

test("home page includes the accessible moral trade animation typology", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const animationSource = readRepoFile("src/components/home/moral-trade-animations.tsx");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.match(homeSource, /MoralTradeAnimations/);
  assert.match(animationSource, /Eight moral trade types, in motion/);
  assert.match(animationSource, /role="img"/);
  assert.match(animationSource, /aria-label=\{card\.alt\}/);
  assert.match(animationSource, /Pause motion/);
  assert.match(animationSource, /Resume motion/);

  for (const label of [
    "A. Reciprocal mixed trade",
    "B. Moral-for-prudential trade",
    "C. Pure opposed-cause trade",
    "D. Intrapersonal trade",
    "E. Bargained coordination",
    "F. Lottery-mediated trade",
    "G. Side-payment trade",
    "H. Market-mediated trade",
  ]) {
    assert.match(animationSource, new RegExp(label.replace(/[.]/g, "\\.")));
  }

  assert.match(animationSource, /moral-animation-frame-\$\{card\.scene\}/);

  for (const scene of [
    "reciprocal",
    "prudential",
    "pure",
    "intrapersonal",
    "bargained",
    "lottery",
    "sidePayment",
    "market",
  ]) {
    assert.match(animationSource, new RegExp(`scene: "${scene}"`));
  }

  assert.match(globalCss, /\.moral-animation-grid/);
  assert.match(globalCss, /\.moral-animation-pause-input:checked/);
  assert.match(globalCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globalCss, /@media \(max-width: 760px\)/);
  assert.match(globalCss, /--mt-orange/);
  assert.match(globalCss, /--mt-green/);
  assert.match(globalCss, /--mt-sky/);
  assert.match(globalCss, /--mt-purple/);
});

test("homepage metrics use live counts when available and avoid fake impact totals", () => {
  const pageSource = readRepoFile("src/app/page.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");

  assert.match(pageSource, /getMarketplaceOverview/);
  assert.match(homeSource, /Live offers/);
  assert.match(homeSource, /Public profiles/);
  assert.match(homeSource, /No custody or escrow/);
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

test("background networking and reasoning routes are distinct resilient public routes", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const reasoningCenterPage = readRepoFile("src/app/reasoning-center/page.tsx");
  const standardsPage = readRepoFile("src/app/reasoning-standards/page.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(backgroundPage, /Find possible trades without turning people into targets/);
  assert.match(backgroundPage, /does not ingest private feeds/);
  assert.match(backgroundPage, /No autonomous outreach/);
  assert.match(reasoningCenterPage, /Pilot reasoning index/);
  assert.match(reasoningCenterPage, /getOptionalViewerForReasoningCenter/);
  assert.match(reasoningCenterPage, /Rendering signed-out state after viewer lookup failed/);
  assert.match(reasoningCenterPage, /not a live forum or autonomous moral-ranking system/);
  assert.match(reasoningCenterPage, /getMoralTradeReasoningPackets/);
  assert.match(reasoningCenterPage, /getMoralTradeReasoningPacketContract/);
  assert.match(reasoningCenterPage, /Cited evidence rows/);
  assert.match(reasoningCenterPage, /Uncertainty flags/);
  assert.match(reasoningCenterPage, /Reviewer scope/);
  assert.match(reasoningCenterPage, /\/api\/moral-trade\/provenance\/schema/);
  assert.match(reasoningCenterPage, /\/api\/moral-trade\/review-workflow\/contract/);
  assert.match(reasoningCenterPage, /\/api\/moral-trade\/reasoning\/packets/);
  assert.equal(reasoningCenterPage.includes("Mira Chen"), false);
  assert.equal(reasoningCenterPage.includes("karma"), false);
  assert.equal(reasoningCenterPage.includes("New & upvoted"), false);
  assert.match(globalCss, /reasoning-status-box/);
  assert.match(globalCss, /reasoning-factor-list/);
  assert.match(globalCss, /reasoning-contract-strip/);
  assert.match(globalCss, /reasoning-packet-grid/);
  assert.match(globalCss, /reasoning-contract-rule-list/);
  assert.match(standardsPage, /Make trade records specific enough to judge/);
  assert.match(standardsPage, /not legal escrow/i);
  assert.match(standardsPage, /voluntary/i);
  assert.match(sitemapSource, /\/background-networking/);
  assert.match(sitemapSource, /\/reasoning-center/);
  assert.match(sitemapSource, /\/reasoning-standards/);
  assert.match(sitemapSource, /\/pledge-swaps/);
  assert.match(sitemapSource, /\/cohort/);
  assert.match(sitemapSource, /\/paid-action-offers/);
});

test("global loading and error states expose route-specific recovery instead of generic dead ends", () => {
  const loadingPage = readRepoFile("src/app/loading.tsx");
  const errorPage = readRepoFile("src/app/error.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const performanceProfile = readRepoFile("config/moral-trade/performance-profile.json");

  assert.match(loadingPage, /Preparing route/);
  assert.match(loadingPage, /No state change/);
  assert.match(loadingPage, /Route loading safeguards/);
  assert.match(loadingPage, /does not submit drafts, disclose counterparties, or change review status/);
  assert.equal(loadingPage.includes("Loading Moral Trade."), false);
  assert.match(errorPage, /Recoverable route error/);
  assert.match(errorPage, /This page did not finish rendering/);
  assert.match(errorPage, /No proposal status, match disclosure, or evidence decision is/);
  assert.match(errorPage, /\/moral-trade\/technical-spec/);
  assert.match(errorPage, /\/offers\?view=examples/);
  assert.match(errorPage, /\/reasoning-standards/);
  assert.match(errorPage, /SiteTopbar/);
  assert.equal(errorPage.includes("Something failed"), false);
  assert.match(globalCss, /route-state-grid/);
  assert.match(globalCss, /route-state-link/);
  assert.match(performanceProfile, /route_error_boundary/);
  assert.match(performanceProfile, /loading_state_inventory/);
  assert.match(performanceProfile, /loading_error_boundary_smoke/);
});

test("cohort page exposes founding progress, referral, and one-counterparty invite loop", () => {
  const cohortPage = readRepoFile("src/app/cohort/page.tsx");
  const signupPage = readRepoFile("src/app/signup/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(cohortPage, /Grow cooperative impact in your community/);
  assert.match(cohortPage, /Start with one concrete action/);
  assert.match(cohortPage, /What counts as progress/);
  assert.match(cohortPage, /Activated account/);
  assert.match(cohortPage, /Invite one serious counterparty/);
  assert.match(cohortPage, /Your referral link/);
  assert.match(cohortPage, /Founding progress/);
  assert.match(cohortPage, /Safety and privacy/);
  assert.match(cohortPage, /createNetworkInviteAction/);
  assert.match(cohortPage, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(signupPage, /Start with one low-risk action/);
  assert.match(signupPage, /Clone a worked example/);
  assert.match(signupPage, /Create broad wish preview/);
  assert.match(signupPage, /Log public-good action/);
  assert.match(actionsSource, /return_to/);
  assert.match(actionsSource, /Choose one low-risk first action/);
});

test("growth activation surfaces persist attribution, onboarding, webinars, and cloning", () => {
  const growthSource = readRepoFile("src/lib/growth.ts");
  const migrationSource = readRepoFile("supabase/migrations/20260526_growth_activation.sql");
  const onboardingPage = readRepoFile("src/app/onboarding/page.tsx");
  const partnerPage = readRepoFile("src/app/cohort/[partnerSlug]/page.tsx");
  const adminGrowthPage = readRepoFile("src/app/admin/growth/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const apiSource = readRepoFile("src/app/api/funnel-events/route.ts");
  const funnelTracker = readRepoFile("src/components/analytics/funnel-tracker.tsx");
  const newOfferPage = readRepoFile("src/app/offers/new/page.tsx");
  const offerCreateForm = readRepoFile("src/components/offers/offer-create-form.tsx");

  assert.ok(PARTNER_COHORTS.length >= 10);
  assert.match(growthSource, /FUNNEL_EVENT_TYPES/);
  assert.match(growthSource, /hero_primary_cta_clicked/);
  assert.match(growthSource, /worked_example_opened/);
  assert.match(growthSource, /donation_route_clicked/);
  assert.match(growthSource, /registry_search_executed/);
  assert.match(growthSource, /performance_metric_recorded/);
  assert.match(growthSource, /metricValueBucket/);
  assert.match(growthSource, /PARTNER_COHORTS/);
  assert.match(growthSource, /sanitizeFunnelEventMetadata/);
  assert.match(growthSource, /sanitizeFunnelEventPath/);
  assert.match(growthSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(growthSource, /queryLengthBucket/);
  assert.match(migrationSource, /funnel_events/);
  assert.match(migrationSource, /cohort_attributions/);
  assert.match(migrationSource, /cohort_onboarding_profiles/);
  assert.match(migrationSource, /webinar_rsvps/);
  assert.match(migrationSource, /email_nurture_subscriptions/);
  assert.match(apiSource, /parseAttributionCookie/);
  assert.match(apiSource, /takeRateLimitSlot/);
  assert.match(apiSource, /analytics-ingest/);
  assert.match(apiSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(actionsSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(funnelTracker, /useReportWebVitals/);
  assert.match(funnelTracker, /performance_metric_recorded/);
  assert.match(funnelTracker, /metricValueBucket/);
  assert.match(funnelTracker, /CLS/);
  assert.match(funnelTracker, /INP/);
  assert.match(funnelTracker, /LCP/);
  assert.match(actionsSource, /saveOnboardingAction/);
  assert.match(actionsSource, /createWebinarRsvpAction/);
  assert.match(actionsSource, /referral_invite_drafted/);
  assert.match(onboardingPage, /Activation wizard/);
  assert.match(partnerPage, /generateStaticParams/);
  assert.match(partnerPage, /createWebinarRsvpAction/);
  assert.match(adminGrowthPage, /Growth dashboard/);
  assert.match(newOfferPage, /getWorkedExampleTemplate/);
  assert.match(newOfferPage, /Cloned from worked example/);
  assert.match(offerCreateForm, /initialTemplate/);
});

test("activation loop includes concierge intake, admin triage, SLA, and audit trail", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const adminPage = readRepoFile("src/app/admin/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const schemaSource = readRepoFile("supabase/schema.sql");
  const migrationSource = readRepoFile(
    "supabase/migrations/20260524_match_concierge_activation.sql",
  );

  assert.match(backgroundPage, /id="concierge-intake"/);
  assert.match(backgroundPage, /createMatchConciergeRequestAction/);
  assert.match(registryPage, /Request concierge intro/);
  assert.match(dashboardPage, /Private match concierge/);
  assert.match(dashboardPage, /matchConciergeRequests/);
  assert.match(adminPage, /Match concierge/);
  assert.match(adminPage, /updateMatchConciergeRequestAction/);
  assert.match(adminPage, /formatSlaState/);
  assert.match(adminPage, /match_concierge_events/);
  assert.match(actionsSource, /createMatchConciergeRequestAction/);
  assert.match(actionsSource, /updateMatchConciergeRequestAction/);
  assert.match(actionsSource, /request_created/);
  assert.match(actionsSource, /request_triaged/);
  assert.match(appDataSource, /listMatchConciergeRequestsForUser/);
  assert.match(schemaSource, /match_concierge_requests/);
  assert.match(schemaSource, /match_concierge_events/);
  assert.match(schemaSource, /sla_due_at/);
  assert.match(migrationSource, /match_concierge_requests/);
  assert.match(migrationSource, /match_concierge_events/);
  assert.match(migrationSource, /enable row level security/);
});

test("accepted introductions can progress through agreement evidence review", () => {
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const agreementPage = readRepoFile("src/app/agreements/[agreementId]/page.tsx");
  const adminPage = readRepoFile("src/app/admin/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const schemaSource = readRepoFile("supabase/schema.sql");
  const migrationSource = readRepoFile(
    "supabase/migrations/20260524_agreement_evidence_verification_loop.sql",
  );

  assert.match(dashboardPage, /createAgreementRoomFromIntroductionPlanAction/);
  assert.match(dashboardPage, /Open agreement room/);
  assert.match(agreementPage, /saveAgreementTermsAction/);
  assert.match(agreementPage, /submitAgreementEvidenceAction/);
  assert.match(agreementPage, /requestAgreementReviewAppealAction/);
  assert.match(agreementPage, /No-trade baseline/);
  assert.match(agreementPage, /Counterfactual declaration/);
  assert.match(agreementPage, /Privacy scope/);
  assert.match(agreementPage, /pending_evidence/);
  assert.match(agreementPage, /challenge_window_open/);
  assert.match(agreementPage, /disputed_unresolved/);
  assert.match(adminPage, /Evidence review/);
  assert.match(adminPage, /Verification ladder/);
  assert.match(adminPage, /updateAgreementReviewCaseAction/);
  assert.match(adminPage, /updateProfileVerificationBadgeAction/);
  assert.match(adminPage, /Completion evidence readiness/);
  assert.match(adminPage, /evidence_artifact_linked/);
  assert.match(adminPage, /claim_scope_aligned/);
  assert.match(adminPage, /proof_uniqueness_checked/);
  assert.match(adminPage, /evidence_freshness_reviewed/);
  assert.match(adminPage, /evidence_agent_links_recorded/);
  assert.match(actionsSource, /createAgreementRoomFromIntroductionPlanAction/);
  assert.match(actionsSource, /updateAgreementReviewCaseAction/);
  assert.match(actionsSource, /validateAgreementReviewProtocolTransition/);
  assert.match(actionsSource, /evidenceReviewReadiness/);
  assert.match(actionsSource, /readBoolean\(formData, "claim_scope_aligned"\)/);
  assert.match(actionsSource, /Evidence readiness checks/);
  assert.match(actionsSource, /The review state transition is not allowed by the Moral Trade protocol/);
  assert.match(actionsSource, /completion_reviewed/);
  assert.match(actionsSource, /repeat_counterparty/);
  assert.match(appDataSource, /agreement_evidence_items/);
  assert.match(appDataSource, /agreement_review_cases/);
  assert.match(appDataSource, /profile_verification_badges/);
  assert.match(schemaSource, /agreement_evidence_items/);
  assert.match(schemaSource, /agreement_review_cases/);
  assert.match(schemaSource, /profile_verification_badges/);
  assert.match(schemaSource, /completion_state/);
  assert.match(migrationSource, /agreement_evidence_items/);
  assert.match(migrationSource, /reviewer_role/);
  assert.match(migrationSource, /conflict_of_interest_notes/);
  assert.match(migrationSource, /identity_verified/);
});

test("trade format landing pages explain formats without payment or custody overclaims", () => {
  const pledgePage = readRepoFile("src/app/pledge-swaps/page.tsx");
  const paidActionPage = readRepoFile("src/app/paid-action-offers/page.tsx");
  const primitivesSource = readRepoFile("src/components/ui/page-primitives.tsx");

  assert.match(pledgePage, /Swap bounded pledges under explicit terms/);
  assert.match(pledgePage, /Voluntary only/);
  assert.match(paidActionPage, /payment is pending verification/);
  assert.match(paidActionPage, /not legal escrow/i);
  assert.match(paidActionPage, /No custody, escrow, tax, or investment claim/);
  assert.match(primitivesSource, /Breadcrumb/);
  assert.match(primitivesSource, /TradeFlowDiagram/);
});

test("primer, anti-threat, and research pages frame the public pilot", () => {
  const primerPage = readRepoFile("src/app/moral-trade/page.tsx");
  const antiThreatPage = readRepoFile("src/app/anti-threat-baseline/page.tsx");
  const researchPage = readRepoFile("src/app/research/page.tsx");
  const trustPage = readRepoFile("src/app/trust/page.tsx");
  const contactPage = readRepoFile("src/app/contact/page.tsx");
  const statusPage = readRepoFile("src/app/status/page.tsx");
  const aboutPage = readRepoFile("src/app/about/page.tsx");
  const howItWorksPage = readRepoFile("src/app/how-it-works/page.tsx");
  const projectsPage = readRepoFile("src/app/projects/page.tsx");
  const updatesPage = readRepoFile("src/app/updates/page.tsx");
  const teamPage = readRepoFile("src/app/team/page.tsx");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");
  const siteSearchSource = readRepoFile("src/lib/site-search.ts");

  assert.match(primerPage, /What is moral trade/);
  assert.match(primerPage, /What it is not/);
  assert.match(primerPage, /Why it is hard/);
  assert.match(primerPage, /Personal pledge swap/);
  assert.match(primerPage, /Instrumented workflow/);
  assert.match(primerPage, /Drafts move through visible protocol checks/);
  assert.match(primerPage, /Reviewable draft/);
  assert.match(primerPage, /Blocked draft/);
  assert.match(primerPage, /factor codes/);
  assert.match(primerPage, /Verification gates/);
  assert.match(primerPage, /card\.review\.verificationLoop/);
  assert.match(primerPage, /Evidence to request/);
  assert.match(primerPage, /Reviewer scope/);
  assert.match(primerPage, /Cited evidence rows/);
  assert.match(primerPage, /card\.review\.reviewInstructions\.artifactsToRequest/);
  assert.match(primerPage, /card\.review\.citedEvidenceTable/);
  assert.match(primerPage, /evaluateMoralTradeProtocolDraft/);
  assert.match(primerPage, /card\.review\.factorCodes/);
  assert.match(primerPage, /anti-threat rules/i);
  assert.match(primerPage, /\/moral-trade\/technical-spec/);
  assert.match(proposalReviewSource, /No pay me or I will do X offers/);
  assert.match(proposalReviewSource, /PROHIBITED_MORAL_TRADE_PATTERNS/);
  assert.match(proposalReviewSource, /PROHIBITED_PROPOSAL_FIXTURES/);
  assert.match(proposalReviewSource, /prohibited_illegal_or_fraud/);
  assert.match(proposalReviewSource, /prohibited_doxxing_or_harassment/);
  assert.match(proposalReviewSource, /prohibited_political_campaign_offset/);
  assert.match(proposalReviewSource, /newly_escalated_harmful_behavior/);
  assert.match(antiThreatPage, /Required baseline statement/);
  assert.match(antiThreatPage, /Cooling-off period/);
  assert.match(antiThreatPage, /Rejected proposal examples/);
  assert.match(researchPage, /What we are testing/);
  assert.match(researchPage, /What would make this unsafe/);
  assert.match(researchPage, /Open mechanism-design questions/);
  assert.match(researchPage, /Transparency reports/);
  assert.match(trustPage, /What you can rely on today/);
  assert.match(trustPage, /No custody, escrow, tax, legal, investment, or payment-protection service/);
  assert.match(contactPage, /Reach the pilot operators/);
  assert.match(statusPage, /What is real on Moral Trade today/);
  assert.match(aboutPage, /What exists today, and what does not/);
  assert.match(howItWorksPage, /One reviewable commitment at a time/);
  assert.match(projectsPage, /What Moral Trade is actually doing/);
  assert.match(updatesPage, /public archive for what changed/);
  assert.match(teamPage, /Who is publicly accountable for the pilot/);
  assert.match(sitemapSource, /\/moral-trade/);
  assert.match(sitemapSource, /\/moral-trade\/technical-spec/);
  assert.match(sitemapSource, /\/about/);
  assert.match(sitemapSource, /\/how-it-works/);
  assert.match(sitemapSource, /\/projects/);
  assert.match(sitemapSource, /\/anti-threat-baseline/);
  assert.match(sitemapSource, /\/research/);
  assert.match(sitemapSource, /\/trust/);
  assert.match(sitemapSource, /\/contact/);
  assert.match(sitemapSource, /\/status/);
  assert.match(sitemapSource, /\/updates/);
  assert.match(sitemapSource, /\/team/);
  assert.match(siteSearchSource, /Projects/);
  assert.match(siteSearchSource, /How it works/);
  assert.match(siteSearchSource, /Team and governance/);
  assert.match(siteSearchSource, /Pilot updates/);
  assert.match(siteSearchSource, /Anti-threat and baseline integrity/);
  assert.match(siteSearchSource, /What you can rely on/);
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

  assert.match(donationOffsetsPage, /Perverse-incentive screening/);
  assert.match(donationOffsetsPage, /No custody \/ no escrow \/ no tax advice/);
  assert.match(mpfgPage, /Manual evidence starts review/);
  assert.match(mpfgPage, /Coordinate around moral public goods/);
  assert.match(priorityFundPage, /10% of verified donations plus 10% of verified member-to-member/);
  assert.match(priorityFundPage, /top 10% of karma/);
  assert.equal(joinedSources.includes("Escrow-backed"), false);
  assert.equal(joinedSources.includes("guaranteed custody"), false);
});

test("validation rulebook exposes reviewer roles, SLAs, conflicts, and quality metrics", () => {
  const validationPage = readRepoFile("src/app/validation/page.tsx");
  const validationSource = readRepoFile("src/lib/validation.ts");
  const protocolSource = readRepoFile("src/lib/moral-trade/protocol.ts");
  const dataModelSource = readRepoFile("src/lib/moral-trade/data-model.ts");
  const policyBundleSource = readRepoFile("src/lib/moral-trade/policy-bundle.ts");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const copilotSource = readRepoFile("src/lib/moral-trade/copilot.ts");
  const copilotContract = readRepoFile("config/moral-trade/copilot-contract.json");
  const matchSignalSource = readRepoFile("src/lib/moral-trade/match-signal.ts");
  const challengeAppealSource = readRepoFile("src/lib/moral-trade/challenge-appeal.ts");
  const disclosureSource = readRepoFile("src/lib/moral-trade/disclosure.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const securitySource = readRepoFile("src/lib/moral-trade/security.ts");
  const securityProfile = readRepoFile("config/moral-trade/security-profile.json");
  const evaluationSource = readRepoFile("src/lib/moral-trade/evaluation.ts");
  const evaluationProfile = readRepoFile("config/moral-trade/evaluation-profile.json");
  const performanceSource = readRepoFile("src/lib/moral-trade/performance.ts");
  const performanceProfile = readRepoFile("config/moral-trade/performance-profile.json");
  const externalitySource = readRepoFile("src/lib/moral-trade/externality.ts");
  const externalityProfile = readRepoFile("config/moral-trade/externality-profile.json");
  const aiGovernanceSource = readRepoFile("src/lib/moral-trade/ai-governance.ts");
  const aiGovernanceProfile = readRepoFile("config/moral-trade/ai-governance-profile.json");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const provenanceSource = readRepoFile("src/lib/moral-trade/provenance.ts");
  const reasoningPacketSource = readRepoFile("src/lib/moral-trade/reasoning-packets.ts");
  const dataModelProfile = readRepoFile("config/moral-trade/data-model-profile.json");
  const protocolProfile = readRepoFile("config/moral-trade/protocol-profile.json");
  const technicalSpecPage = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const dataModelContractRoute = readRepoFile(
    "src/app/api/moral-trade/data-model/contract/route.ts",
  );
  const policyBundleContractRoute = readRepoFile(
    "src/app/api/moral-trade/policy-bundle/contract/route.ts",
  );
  const copilotContractRoute = readRepoFile("src/app/api/moral-trade/copilot/contract/route.ts");
  const copilotReviewRoute = readRepoFile("src/app/api/moral-trade/copilot/review/route.ts");
  const matchSignalContractRoute = readRepoFile(
    "src/app/api/moral-trade/match-signal/contract/route.ts",
  );
  const matchSignalEvaluateRoute = readRepoFile(
    "src/app/api/moral-trade/match-signal/evaluate/route.ts",
  );
  const challengeAppealContractRoute = readRepoFile(
    "src/app/api/moral-trade/challenge-appeal/contract/route.ts",
  );
  const challengeAppealEvaluateRoute = readRepoFile(
    "src/app/api/moral-trade/challenge-appeal/evaluate/route.ts",
  );
  const disclosureContractRoute = readRepoFile(
    "src/app/api/moral-trade/disclosure/contract/route.ts",
  );
  const disclosureEvaluateRoute = readRepoFile(
    "src/app/api/moral-trade/disclosure/evaluate/route.ts",
  );
  const reviewWorkflowContractRoute = readRepoFile(
    "src/app/api/moral-trade/review-workflow/contract/route.ts",
  );
  const reviewWorkflowEvaluateRoute = readRepoFile(
    "src/app/api/moral-trade/review-workflow/evaluate/route.ts",
  );
  const reasoningPacketsRoute = readRepoFile(
    "src/app/api/moral-trade/reasoning/packets/route.ts",
  );
  const operationsHealthRoute = readRepoFile("src/app/api/moral-trade/operations/health/route.ts");
  const securityHealthRoute = readRepoFile("src/app/api/moral-trade/security/health/route.ts");
  const evaluationHealthRoute = readRepoFile("src/app/api/moral-trade/evaluation/health/route.ts");
  const performanceHealthRoute = readRepoFile("src/app/api/moral-trade/performance/health/route.ts");
  const externalityHealthRoute = readRepoFile("src/app/api/moral-trade/externality/health/route.ts");
  const aiGovernanceHealthRoute = readRepoFile("src/app/api/moral-trade/ai-governance/health/route.ts");
  const apiContractRoute = readRepoFile("src/app/api/moral-trade/api-contract/route.ts");
  const provenanceSchemaRoute = readRepoFile("src/app/api/moral-trade/provenance/schema/route.ts");
  const nextConfig = readRepoFile("next.config.ts");

  assert.match(validationPage, /VALIDATOR_REVIEW_ROLES/);
  assert.match(validationPage, /VALIDATOR_OPERATION_STANDARDS/);
  assert.match(validationPage, /VALIDATOR_QUALITY_METRICS/);
  assert.match(validationPage, /validateMoralTradeProtocolProfile/);
  assert.match(validationPage, /\/moral-trade\/technical-spec/);
  assert.match(validationPage, /Manual review has named responsibilities/);
  assert.match(validationPage, /Review needs SLAs, conflict rules, and appeals/);
  assert.match(validationPage, /Trust metrics should be published/);
  assert.match(validationSource, /Intake reviewer/);
  assert.match(validationSource, /Evidence reviewer/);
  assert.match(validationSource, /Appeal reviewer/);
  assert.match(validationSource, /Conflict rule/);
  assert.match(validationSource, /2 business days/);
  assert.match(validationSource, /5 business days/);
  assert.match(validationSource, /Appeal overturn rate/);
  assert.match(validationSource, /Duplicate-proof misses/);
  assert.match(protocolSource, /REQUIRED_GUARDRAILS/);
  assert.match(proposalReviewSource, /assessPrivacyRedaction/);
  assert.match(proposalReviewSource, /contact_email_in_public_draft/);
  assert.match(proposalReviewSource, /getOfferReviewWorkflowContract/);
  assert.match(proposalReviewSource, /validateOfferReviewWorkflowContract/);
  assert.match(proposalReviewSource, /MARKETPLACE_REVIEW_FACTOR_PRIORITY/);
  assert.match(proposalReviewSource, /REVIEW_WORKFLOW_PARTICIPANT_COPY/);
  assert.match(proposalReviewSource, /What would you do if this trade did not happen/);
  assert.match(proposalReviewSource, /Status: Needs evidence/);
  assert.match(proposalReviewSource, /Challenge window/);
  assert.match(proposalReviewSource, /baseline_challenge_recommended/);
  assert.match(proposalReviewSource, /This proposal cannot be published/);
  assert.match(proposalReviewSource, /technical_spec_review_workflow_smoke/);
  assert.match(protocolSource, /validateMoralTradeProtocolProfile/);
  assert.match(protocolSource, /validateMoralTradeProposalStateTransition/);
  assert.match(protocolSource, /buildMoralTradeStateTransitionEventRecord/);
  assert.match(protocolSource, /validateMoralTradeStateTransitionEventRecord/);
  assert.match(protocolProfile, /anti_threat_baseline/);
  assert.match(protocolProfile, /stateTransitionRules/);
  assert.match(protocolProfile, /completion_reviewed/);
  assert.match(protocolProfile, /disputed_unresolved/);
  assert.match(protocolProfile, /transition_event_recorded/);
  assert.match(protocolProfile, /state_transition_event_record/);
  assert.match(protocolProfile, /eventHash/);
  assert.match(protocolProfile, /privacy_safe_preview/);
  assert.match(protocolProfile, /baseline_challenge_recommended/);
  assert.match(protocolProfile, /match_signal/);
  assert.match(protocolProfile, /traceability_event/);
  assert.match(protocolProfile, /external_entity_reference/);
  assert.match(protocolProfile, /cause_area_overlap/);
  assert.match(protocolProfile, /cause_area_complementarity/);
  assert.match(protocolProfile, /party_relative_benefit/);
  assert.match(protocolProfile, /evidence_artifact/);
  assert.match(protocolProfile, /provenanceObjectSchemas/);
  assert.match(dataModelSource, /validateMoralTradeDataModelProfile/);
  assert.match(dataModelSource, /REQUIRED_ENTITIES/);
  assert.match(dataModelSource, /review_decision/);
  assert.match(dataModelSource, /private_wish_profile/);
  assert.match(dataModelSource, /source_note_boundary/);
  assert.match(dataModelSource, /payment_non_custody_boundary/);
  assert.match(dataModelProfile, /private_wish_profile/);
  assert.match(dataModelProfile, /source_note/);
  assert.match(dataModelProfile, /saved_search/);
  assert.match(dataModelProfile, /privacy_grant/);
  assert.match(dataModelProfile, /review_decision/);
  assert.equal(dataModelProfile.includes("reviewer_decision"), false);
  assert.match(dataModelProfile, /payment_update/);
  assert.match(dataModelProfile, /agreement_event/);
  assert.match(dataModelProfile, /raw private feeds are not mined/);
  assert.match(dataModelProfile, /data_model_profile_validator/);
  assert.match(policyBundleSource, /getMoralTradePolicyBundleContract/);
  assert.match(policyBundleSource, /validateMoralTradePolicyBundleContract/);
  assert.match(policyBundleSource, /prohibited_pattern_registry/);
  assert.match(policyBundleSource, /verification_method_taxonomy/);
  assert.match(policyBundleSource, /redaction_policy/);
  assert.match(policyBundleSource, /review_decision/);
  assert.match(policyBundleSource, /PROHIBITED_PROPOSAL_FIXTURES/);
  assert.match(policyBundleSource, /private_feed_payloads/);
  assert.match(policyBundleSource, /policy_bundle_contract_validator/);
  assert.match(provenanceSource, /validateMoralTradeProvenanceBundle/);
  assert.match(provenanceSource, /getMoralTradeProvenanceContract/);
  assert.match(provenanceSource, /validateMoralTradeProvenanceContract/);
  assert.match(provenanceSource, /getMoralTradeProvenanceSampleBundle/);
  assert.match(provenanceSource, /createMoralTradeTraceabilityEvent/);
  assert.match(provenanceSource, /createMoralTradeExternalEntityReference/);
  assert.match(provenanceSource, /provenance_contract_validator/);
  assert.match(provenanceSource, /external-entity-references/);
  assert.match(provenanceSource, /open_supply_hub_id/);
  assert.match(provenanceSource, /traceability-events/);
  assert.match(provenanceSource, /one-proof-one-claim/);
  assert.match(provenanceSource, /scope-alignment/);
  assert.match(reasoningPacketSource, /getMoralTradeReasoningPackets/);
  assert.match(reasoningPacketSource, /validateMoralTradeReasoningPacketContract/);
  assert.match(reasoningPacketSource, /cited evidence rows/i);
  assert.match(reasoningPacketSource, /uncertainty flags/i);
  assert.match(reasoningPacketSource, /live private offers are not exported/);
  assert.match(reasoningPacketSource, /no_global_moral_ranking/);
  assert.match(reasoningPacketSource, /reasoning_packets_api_route_smoke/);
  assert.match(copilotSource, /buildMoralTradeCopilotOutput/);
  assert.match(copilotSource, /normalizeMoralTradeCopilotEvidenceMetadata/);
  assert.match(copilotSource, /MORAL_TRADE_COPILOT_EVIDENCE_METADATA_REDACTIONS/);
  assert.match(copilotSource, /validateMoralTradeCopilotContract/);
  assert.match(copilotContract, /strictInputBundle/);
  assert.match(copilotContract, /evidence-metadata review/);
  assert.match(copilotContract, /promptTemplates/);
  assert.match(copilotContract, /system_prompt/);
  assert.match(copilotContract, /draft_repair_prompt/);
  assert.match(copilotContract, /matching_prompt/);
  assert.match(copilotContract, /reviewer_summary_prompt/);
  assert.match(copilotContract, /redacted_profile_pair/);
  assert.match(copilotContract, /verification_loop/);
  assert.match(copilotContract, /challenge_window/);
  assert.match(copilotContract, /clarification_questions/);
  assert.match(copilotContract, /cited_evidence_table/);
  assert.match(copilotContract, /reviewer_summary/);
  assert.match(copilotContract, /no_chain_of_thought/);
  assert.match(copilotContract, /no_autonomous_outreach/);
  assert.match(copilotContract, /guarded_automation/);
  assert.match(copilotContract, /rolloutReadinessSignals/);
  assert.match(copilotContract, /low_risk_task_scope/);
  assert.match(matchSignalSource, /evaluateMoralTradeRedactedProfileMatch/);
  assert.match(matchSignalSource, /getMoralTradeMatchSignalContract/);
  assert.match(matchSignalSource, /validateMoralTradeMatchSignalContract/);
  assert.match(matchSignalSource, /cause_area_overlap_or_complementarity_required/);
  assert.match(matchSignalSource, /causeAreaComplementarity/);
  assert.match(matchSignalSource, /humanReviewRequired/);
  assert.match(matchSignalSource, /participantExplanation/);
  assert.match(matchSignalSource, /Why you are seeing this match/);
  assert.match(matchSignalSource, /Exact wishes and contact details are still hidden/);
  assert.match(matchSignalSource, /ideology_or_psychology_inferences/);
  assert.match(matchSignalSource, /redacted_profile_match_preview_only/);
  assert.match(matchSignalSource, /match_signal_evaluate_route_contract/);
  assert.match(challengeAppealSource, /evaluateMoralTradeChallengeAppeal/);
  assert.match(challengeAppealSource, /validateMoralTradeChallengeAppealContract/);
  assert.match(challengeAppealSource, /affected_party_standing/);
  assert.match(challengeAppealSource, /wrong_scope_evidence_review/);
  assert.match(challengeAppealSource, /privacy_disclosure_review/);
  assert.match(challengeAppealSource, /externality_remedy_review/);
  assert.match(challengeAppealSource, /no_unrelated_moral_disagreement/);
  assert.match(challengeAppealSource, /provenance_activity_required/);
  assert.match(challengeAppealSource, /deterministic_challenge_appeal_scope_only/);
  assert.match(challengeAppealSource, /challenge_appeal_evaluate_route_contract/);
  assert.match(disclosureSource, /getMoralTradeDisclosureContract/);
  assert.match(disclosureSource, /validateMoralTradeDisclosureContract/);
  assert.match(disclosureSource, /deterministic_disclosure_grant_scope_only/);
  assert.match(disclosureSource, /BACKGROUND_DISCLOSURE_FIELDS/);
  assert.match(disclosureSource, /exact_private_wishes_before_consent/);
  assert.match(disclosureSource, /contact_details_before_introduction/);
  assert.match(disclosureSource, /raw_source_notes_redacted/);
  assert.match(disclosureSource, /owner_approval_required/);
  assert.match(disclosureSource, /disclosure_grant_evaluate_route_contract/);
  assert.match(operationsSource, /validateMoralTradeOperationsProfile/);
  assert.match(operationsSource, /decideMoralTradeFallback/);
  assert.match(operationsSource, /fallback_path_unavailable/);
  assert.match(operationsSource, /replay_hash_mismatch/);
  assert.match(operationsProfile, /strict_transport_security/);
  assert.match(operationsProfile, /wish_registry_search/);
  assert.match(operationsProfile, /analytics_ingest/);
  assert.match(operationsProfile, /copilot_fallback_rate/);
  assert.match(operationsProfile, /invalid_copilot_output_no_state_change/);
  assert.match(operationsProfile, /resilience_fallback_audit/);
  assert.match(operationsProfile, /human_controlled_safety/);
  assert.match(securitySource, /validateMoralTradeSecurityProfile/);
  assert.match(securitySource, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(securitySource, /provider-boundary-and-nonclaims/);
  assert.match(securitySource, /scale_control_not_ready/);
  assert.match(securityProfile, /provider_encryption_at_rest/);
  assert.match(securityProfile, /field_level_encryption_not_claimed/);
  assert.match(securityProfile, /two_factor_admin_gate/);
  assert.match(securityProfile, /device_session_review_gate/);
  assert.match(securityProfile, /key_rotation_gate/);
  assert.match(securityProfile, /incident_response_reporting/);
  assert.match(securityProfile, /platform_abuse_throttling/);
  assert.match(securityProfile, /Moral Trade does not claim custom field-level encryption/);
  assert.match(evaluationSource, /validateMoralTradeEvaluationProfile/);
  assert.match(evaluationSource, /auditMoralTradeSurfacingParity/);
  assert.match(evaluationSource, /auditMoralTradeUxReadiness/);
  assert.match(evaluationSource, /getMoralTradeEvaluationSampleAudits/);
  assert.match(evaluationSource, /sample-audits/);
  assert.match(evaluationSource, /MoralTradeSurfacingDeviationReview/);
  assert.match(evaluationSource, /invalid_surfacing_deviation_review/);
  assert.match(evaluationSource, /unscoped_surfacing_deviation_review/);
  assert.match(evaluationSource, /MORAL_TRADE_SURFACING_PARITY_DEFAULTS/);
  assert.match(evaluationSource, /MORAL_TRADE_UX_READINESS_DEFAULTS/);
  assert.match(evaluationProfile, /draft_completion_rate/);
  assert.match(evaluationProfile, /time_to_valid_draft/);
  assert.match(evaluationProfile, /privacy_leakage_incidents/);
  assert.match(evaluationProfile, /reviewer_efficiency_minutes/);
  assert.match(evaluationProfile, /subgroup_surfacing_parity/);
  assert.match(evaluationProfile, /geography_bucket/);
  assert.match(evaluationProfile, /optional_governed_sensitive_attribute/);
  assert.match(evaluationProfile, /surfacing_parity_audit/);
  assert.match(evaluationProfile, /surfacing_deviation_review_log/);
  assert.match(evaluationProfile, /ux_readiness_audit/);
  assert.match(evaluationProfile, /human_overrule_rate/);
  assert.match(evaluationProfile, /no_raw_private_wish_text/);
  assert.match(evaluationProfile, /deviation_review_log_redacted/);
  assert.match(evaluationProfile, /human_controlled_decisions/);
  assert.match(performanceSource, /validateMoralTradePerformanceProfile/);
  assert.match(performanceSource, /auditMoralTradePerformanceSnapshot/);
  assert.match(performanceSource, /auditMoralTradeRouteRecoveryManifest/);
  assert.match(performanceSource, /route_specific_viewer_fallback/);
  assert.match(performanceSource, /packet_json_fallback/);
  assert.match(performanceSource, /MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS/);
  assert.match(performanceSource, /insufficient_data/);
  assert.match(performanceProfile, /route_error_rate/);
  assert.match(performanceProfile, /api_latency_p95_ms/);
  assert.match(performanceProfile, /web_vitals_lcp_p75_ms/);
  assert.match(performanceProfile, /web_vitals_inp_p75_ms/);
  assert.match(performanceProfile, /web_vitals_cls_p75/);
  assert.match(performanceProfile, /specific_loading_recovery_ratio/);
  assert.match(performanceProfile, /build_route_manifest_coverage/);
  assert.match(performanceProfile, /web_vitals_capture/);
  assert.match(performanceProfile, /route_error_boundary/);
  assert.match(performanceProfile, /loading_state_inventory/);
  assert.match(performanceProfile, /route_recovery_manifest_audit/);
  assert.match(performanceProfile, /instrument_before_optimize/);
  assert.match(performanceProfile, /Moral Trade does not claim verified Core Web Vitals/);
  assert.match(externalitySource, /validateMoralTradeExternalityProfile/);
  assert.match(externalitySource, /evaluateMoralTradeExternalityReview/);
  assert.match(externalitySource, /affected_party_standing_required/);
  assert.match(externalitySource, /source_standard_required/);
  assert.match(externalityProfile, /oecd_due_diligence/);
  assert.match(externalityProfile, /un_guiding_principles/);
  assert.match(externalityProfile, /ilo_fundamental_principles/);
  assert.match(externalityProfile, /eti_base_code/);
  assert.match(externalityProfile, /fairtrade_standards/);
  assert.match(externalityProfile, /open_supply_hub/);
  assert.match(externalityProfile, /affected_party_standing/);
  assert.match(externalityProfile, /remediation_plan/);
  assert.match(externalityProfile, /challenge_window_required/);
  assert.match(aiGovernanceSource, /validateMoralTradeAiGovernanceProfile/);
  assert.match(aiGovernanceSource, /REQUIRED_DOCUMENTATION/);
  assert.match(aiGovernanceSource, /documentation-templates/);
  assert.match(aiGovernanceSource, /deterministic-decisioning/);
  assert.match(aiGovernanceProfile, /model_card/);
  assert.match(aiGovernanceProfile, /dataset_datasheet/);
  assert.match(aiGovernanceProfile, /benchmark_slices/);
  assert.match(aiGovernanceProfile, /documentationTemplates/);
  assert.match(aiGovernanceProfile, /requiredFields/);
  assert.match(aiGovernanceProfile, /publicSummaryFields/);
  assert.match(aiGovernanceProfile, /raw_private_wish_text/);
  assert.match(aiGovernanceProfile, /small_cell_identifiers/);
  assert.match(aiGovernanceProfile, /nist_ai_rmf/);
  assert.match(aiGovernanceProfile, /datasheets_for_datasets/);
  assert.match(aiGovernanceProfile, /fairness_tradeoff_literature/);
  assert.match(aiGovernanceProfile, /explanationControls/);
  assert.match(aiGovernanceProfile, /factor_codes_source_of_truth/);
  assert.match(aiGovernanceProfile, /uncertainty_and_redaction_notice/);
  assert.match(aiGovernanceProfile, /end_to_end_llm_matching/);
  assert.match(aiGovernanceProfile, /global_moral_ranking/);
  assert.match(aiGovernanceProfile, /raw_private_feed_training/);
  assert.match(aiGovernanceProfile, /no_undocumented_ml_gate/);
  assert.match(apiContractSource, /validateMoralTradeApiContractProfile/);
  assert.match(apiContractSource, /moral_trade_data_model_contract/);
  assert.match(apiContractSource, /data-model-contract-route/);
  assert.match(apiContractSource, /moral_trade_policy_bundle_contract/);
  assert.match(apiContractSource, /policy-bundle-contract-route/);
  assert.match(apiContractSource, /provenance-schema-validator/);
  assert.match(apiContractSource, /moral_trade_copilot_review/);
  assert.match(apiContractSource, /moral_trade_match_signal_contract/);
  assert.match(apiContractSource, /moral_trade_match_signal_evaluate/);
  assert.match(apiContractSource, /match-signal-routes/);
  assert.match(apiContractSource, /moral_trade_challenge_appeal_contract/);
  assert.match(apiContractSource, /moral_trade_challenge_appeal_evaluate/);
  assert.match(apiContractSource, /challenge-appeal-routes/);
  assert.match(apiContractSource, /moral_trade_disclosure_contract/);
  assert.match(apiContractSource, /moral_trade_disclosure_evaluate/);
  assert.match(apiContractSource, /disclosure-grant-routes/);
  assert.match(apiContractSource, /moral_trade_review_workflow_contract/);
  assert.match(apiContractSource, /moral_trade_review_workflow_evaluate/);
  assert.match(apiContractSource, /review-workflow-evaluate-nonmutating/);
  assert.match(apiContractSource, /moral_trade_reasoning_packets/);
  assert.match(apiContractSource, /reasoning-packets-validator/);
  assert.match(apiContractSource, /moral_trade_security_health/);
  assert.match(apiContractSource, /moral_trade_performance_health/);
  assert.match(apiContractSource, /moral_trade_externality_health/);
  assert.match(apiContractSource, /moral_trade_ai_governance_health/);
  assert.match(apiContractSource, /field-level-schema-contracts/);
  assert.match(apiContractProfile, /data_model_contract_response/);
  assert.match(apiContractProfile, /moral_trade_data_model_contract/);
  assert.match(apiContractProfile, /data-model contract validation blockers/);
  assert.match(apiContractProfile, /private wishes, source notes, saved searches, privacy grants/);
  assert.match(apiContractProfile, /policy_bundle_contract_response/);
  assert.match(apiContractProfile, /moral_trade_policy_bundle_contract/);
  assert.match(apiContractProfile, /policy-bundle validation blockers/);
  assert.match(apiContractProfile, /unseeded prohibited patterns/);
  assert.match(apiContractProfile, /profile_export/);
  assert.match(apiContractProfile, /copilot_review_request/);
  assert.match(apiContractProfile, /copilot_review_response/);
  assert.match(apiContractProfile, /evidenceMetadata/);
  assert.match(apiContractProfile, /evidenceMetadataSummary/);
  assert.match(apiContractProfile, /raw evidence artifacts/);
  assert.match(apiContractProfile, /match_signal_contract_response/);
  assert.match(apiContractProfile, /match_signal_evaluate_request/);
  assert.match(apiContractProfile, /match_signal_evaluate_response/);
  assert.match(apiContractProfile, /redacted_profile_match_preview_only/);
  assert.match(apiContractProfile, /never store submitted redacted profiles/);
  assert.match(apiContractProfile, /rank moral value/);
  assert.match(apiContractProfile, /challenge_appeal_contract_response/);
  assert.match(apiContractProfile, /challenge_appeal_evaluate_request/);
  assert.match(apiContractProfile, /challenge_appeal_evaluate_response/);
  assert.match(apiContractProfile, /deterministic_challenge_appeal_scope_only/);
  assert.match(apiContractProfile, /broaden appeal scope/);
  assert.match(apiContractProfile, /resolve disputes without human review/);
  assert.match(apiContractProfile, /disclosure_contract_response/);
  assert.match(apiContractProfile, /disclosure_evaluate_request/);
  assert.match(apiContractProfile, /disclosure_evaluate_response/);
  assert.match(apiContractProfile, /deterministic_disclosure_grant_scope_only/);
  assert.match(apiContractProfile, /field-level stage grants/);
  assert.match(apiContractProfile, /mutate privacy grants/);
  assert.match(apiContractProfile, /review_workflow_contract_response/);
  assert.match(apiContractProfile, /review_workflow_evaluate_request/);
  assert.match(apiContractProfile, /review_workflow_evaluate_response/);
  assert.match(apiContractProfile, /reasoning_packets_response/);
  assert.match(apiContractProfile, /moral_trade_reasoning_packets/);
  assert.match(apiContractProfile, /Reasoning Center packet contract validator result/);
  assert.match(apiContractProfile, /never expose live private offers/);
  assert.match(apiContractProfile, /deterministic_review_workflow_only/);
  assert.match(apiContractProfile, /participant copy templates/);
  assert.match(apiContractProfile, /marketplace cards must not invent factor codes/);
  assert.match(apiContractProfile, /Review workflow card contract validator result/);
  assert.match(apiContractProfile, /never store submitted review input/);
  assert.match(apiContractProfile, /fixed verification loop/);
  assert.match(apiContractProfile, /ephemeral_private_draft_review/);
  assert.match(apiContractProfile, /copilot_draft_review/);
  assert.match(apiContractProfile, /participant explanation copy/);
  assert.match(apiContractProfile, /empty_request/);
  assert.match(apiContractProfile, /profile_import_response/);
  assert.match(apiContractProfile, /wish_registry_search_request/);
  assert.match(apiContractProfile, /empty_204_response/);
  assert.match(apiContractProfile, /wish_registry_search/);
  assert.match(apiContractProfile, /redacted_analytics/);
  assert.match(apiContractProfile, /privacy_thresholded_public_preview/);
  assert.match(apiContractProfile, /security_health_response/);
  assert.match(apiContractProfile, /field-level encryption, MFA, key rotation, or zero risk/);
  assert.match(apiContractProfile, /performance_health_response/);
  assert.match(apiContractProfile, /Core Web Vitals, API latency, or loading-state readiness/);
  assert.match(apiContractProfile, /externality_health_response/);
  assert.match(apiContractProfile, /ai_governance_health_response/);
  assert.match(apiContractProfile, /machine-checkable documentation templates/);
  assert.match(apiContractProfile, /external entity reference/);
  assert.match(apiContractProfile, /external entity dedupe/);
  assert.match(apiContractProfile, /Provenance object contract validator result/);
  assert.match(apiContractProfile, /sample-bundle summary/);
  assert.match(apiContractProfile, /undocumented ML cannot rank/);
  assert.match(apiContractProfile, /private_no_store/);
  assert.match(apiContractProfile, /query strings and hashes are stripped/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /Content-Security-Policy-Report-Only/);
  assert.match(nextConfig, /private, no-store/);
  assert.match(technicalSpecPage, /public validator contract/);
  assert.match(technicalSpecPage, /Data model contract/);
  assert.match(technicalSpecPage, /Core entities, privacy classes, and relationships are validator-backed/);
  assert.match(technicalSpecPage, /dataModelProfile\.entities/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/data-model\/contract/);
  assert.match(technicalSpecPage, /Policy bundle contract/);
  assert.match(technicalSpecPage, /Copilot inputs are concrete registries, not broad application context/);
  assert.match(technicalSpecPage, /Evidence metadata boundary/);
  assert.match(technicalSpecPage, /Raw artifacts, private notes, contact details, and exact wishes/);
  assert.match(technicalSpecPage, /policyBundleContract\.verificationMethodTaxonomy/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/policy-bundle\/contract/);
  assert.match(technicalSpecPage, /Evidence object contract/);
  assert.match(technicalSpecPage, /traceability events/);
  assert.match(technicalSpecPage, /external entity dedupe failures/);
  assert.match(technicalSpecPage, /Provenance contract/);
  assert.match(technicalSpecPage, /provenanceContract\.validationRules/);
  assert.match(technicalSpecPage, /provenanceContract\.contractTests/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/provenance\/schema/);
  assert.match(technicalSpecPage, /Copilot contract/);
  assert.match(technicalSpecPage, /schema-bound and reversible/);
  assert.match(technicalSpecPage, /Prompt template registry/);
  assert.match(technicalSpecPage, /copilotContract\.promptTemplates/);
  assert.match(technicalSpecPage, /Rollout readiness gates/);
  assert.match(technicalSpecPage, /copilotRolloutReadiness/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/copilot\/contract/);
  assert.match(technicalSpecPage, /Match signal contract/);
  assert.match(technicalSpecPage, /Redacted profile matching is preview-only and human-reviewed/);
  assert.match(technicalSpecPage, /matchSignalContract\.requiredInputFields/);
  assert.match(technicalSpecPage, /Participant explanation/);
  assert.match(technicalSpecPage, /matchSignalContract\.participantExplanationTemplate/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/match-signal\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/match-signal\/evaluate/);
  assert.match(technicalSpecPage, /Challenge appeal contract/);
  assert.match(technicalSpecPage, /Appeals are scoped to reviewed claims, standing, and remedy paths/);
  assert.match(technicalSpecPage, /challengeAppealContract\.standingCategories/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/challenge-appeal\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/challenge-appeal\/evaluate/);
  assert.match(technicalSpecPage, /Disclosure grant contract/);
  assert.match(technicalSpecPage, /Privacy grants now have a staged, field-level contract/);
  assert.match(technicalSpecPage, /disclosureContract\.disclosureFields/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/disclosure\/evaluate/);
  assert.match(technicalSpecPage, /Review workflow contract/);
  assert.match(technicalSpecPage, /Marketplace cards and detail pages share one factor-code source/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.marketplaceFactorPriority/);
  assert.match(technicalSpecPage, /Participant copy/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.participantCopyTemplates/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/review-workflow\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/review-workflow\/evaluate/);
  assert.match(technicalSpecPage, /stateMutation false/);
  assert.match(technicalSpecPage, /Reasoning packet contract/);
  assert.match(technicalSpecPage, /The Reasoning Center publishes structured packets/);
  assert.match(technicalSpecPage, /reasoningPacketContract\.requiredPacketFields/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/reasoning\/packets/);
  assert.match(technicalSpecPage, /live private offers/);
  assert.match(technicalSpecPage, /Operations contract/);
  assert.match(technicalSpecPage, /Security, rate limits, metrics, and fallbacks are inspectable/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/operations\/health/);
  assert.match(technicalSpecPage, /Security contract/);
  assert.match(technicalSpecPage, /Security posture is explicit about controls, boundaries, and non-claims/);
  assert.match(technicalSpecPage, /securityProfile\.publicNonClaims/);
  assert.match(technicalSpecPage, /Public non-claim/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/security\/health/);
  assert.match(technicalSpecPage, /Evaluation contract/);
  assert.match(technicalSpecPage, /Quality metrics are public, privacy-bounded, and rollout-gated/);
  assert.match(technicalSpecPage, /Sample surfacing parity audit/);
  assert.match(technicalSpecPage, /Sample UX readiness audit/);
  assert.match(technicalSpecPage, /sample-audits check/);
  assert.match(technicalSpecPage, /redacted review-log entry/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/evaluation\/health/);
  assert.match(technicalSpecPage, /Performance contract/);
  assert.match(
    technicalSpecPage,
    /Route resilience and Web Vitals are measured before readiness is claimed/,
  );
  assert.match(technicalSpecPage, /performanceProfile\.publicNonClaims/);
  assert.match(technicalSpecPage, /Route recovery manifest/);
  assert.match(technicalSpecPage, /routeRecoveryAudit\.coverageRatio/);
  assert.match(technicalSpecPage, /Performance non-claim/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/performance\/health/);
  assert.match(technicalSpecPage, /Externality contract/);
  assert.match(technicalSpecPage, /Third-party impacts now have due-diligence and remedy gates/);
  assert.match(technicalSpecPage, /affected-party standing/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/externality\/health/);
  assert.match(technicalSpecPage, /AI governance contract/);
  assert.match(technicalSpecPage, /Undocumented ML cannot rank, match, disclose, or change state/);
  assert.match(technicalSpecPage, /Documentation templates/);
  assert.match(technicalSpecPage, /aiGovernanceProfile\.documentationTemplates/);
  assert.match(technicalSpecPage, /Explanation controls/);
  assert.match(technicalSpecPage, /model\s+cards/i);
  assert.match(technicalSpecPage, /dataset datasheets/i);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/ai-governance\/health/);
  assert.match(technicalSpecPage, /API contract/);
  assert.match(
    technicalSpecPage,
    /Core routes now publish privacy, schema, rate-limit, and fallback metadata/,
  );
  assert.match(technicalSpecPage, /\/api\/moral-trade\/api-contract/);
  assert.match(technicalSpecPage, /Field-level schema/);
  assert.match(technicalSpecPage, /State transitions/);
  assert.match(technicalSpecPage, /factor codes/i);
  assert.match(healthRoute, /publicContract/);
  assert.match(healthRoute, /dataModelValidation/);
  assert.match(healthRoute, /dataModelEntities/);
  assert.match(healthRoute, /dataModelOfferRequiredFields/);
  assert.match(healthRoute, /dataModelRelationshipBoundaries/);
  assert.match(healthRoute, /policyBundleValidation/);
  assert.match(healthRoute, /policyBundleStrictInputBundle/);
  assert.match(healthRoute, /policyBundleProhibitedPatternCodes/);
  assert.match(healthRoute, /policyBundleVerificationMethods/);
  assert.match(healthRoute, /stateTransitionRules/);
  assert.match(healthRoute, /provenanceObjectSchemas/);
  assert.match(healthRoute, /provenanceValidation/);
  assert.match(healthRoute, /provenanceValidationRules/);
  assert.match(healthRoute, /provenanceSampleBundleSummary/);
  assert.match(healthRoute, /copilotValidation/);
  assert.match(healthRoute, /copilotPromptTemplates/);
  assert.match(healthRoute, /copilotOutputSections/);
  assert.match(healthRoute, /matchSignalValidation/);
  assert.match(healthRoute, /matchSignalRequiredInputFields/);
  assert.match(healthRoute, /matchSignalRedactedFields/);
  assert.match(healthRoute, /matchSignalParticipantExplanation/);
  assert.match(healthRoute, /challengeAppealValidation/);
  assert.match(healthRoute, /challengeAppealStandingCategories/);
  assert.match(healthRoute, /challengeAppealAllowedOutcomes/);
  assert.match(healthRoute, /disclosureValidation/);
  assert.match(healthRoute, /disclosureAudienceStages/);
  assert.match(healthRoute, /disclosureRedactedFields/);
  assert.match(healthRoute, /reviewWorkflowValidation/);
  assert.match(healthRoute, /reviewWorkflowCardKeys/);
  assert.match(healthRoute, /reviewWorkflowMarketplaceFactorPriority/);
  assert.match(healthRoute, /reviewWorkflowParticipantCopyKeys/);
  assert.match(healthRoute, /reasoningPacketValidation/);
  assert.match(healthRoute, /reasoningPacketRequiredFields/);
  assert.match(healthRoute, /reasoningPacketLinkedContracts/);
  assert.match(healthRoute, /operationsValidation/);
  assert.match(healthRoute, /rateLimitSurfaces/);
  assert.match(healthRoute, /securityValidation/);
  assert.match(healthRoute, /securityControls/);
  assert.match(healthRoute, /securityScaleGates/);
  assert.match(healthRoute, /securityPublicNonClaims/);
  assert.match(healthRoute, /evaluationValidation/);
  assert.match(healthRoute, /evaluationMetrics/);
  assert.match(healthRoute, /performanceValidation/);
  assert.match(healthRoute, /performanceMetricTargets/);
  assert.match(healthRoute, /performancePublicNonClaims/);
  assert.match(healthRoute, /externalityValidation/);
  assert.match(healthRoute, /externalityDueDiligenceSteps/);
  assert.match(healthRoute, /externalityRemedyControls/);
  assert.match(healthRoute, /apiContractValidation/);
  assert.match(healthRoute, /aiGovernanceValidation/);
  assert.match(healthRoute, /aiGovernanceDocumentationBeforeMl/);
  assert.match(healthRoute, /aiGovernanceExplanationControls/);
  assert.match(healthRoute, /apiRoutes/);
  assert.match(healthRoute, /apiSchemaFieldCounts/);
  assert.match(dataModelContractRoute, /validateMoralTradeDataModelProfile/);
  assert.match(dataModelContractRoute, /entities/);
  assert.match(dataModelContractRoute, /offerRequiredFields/);
  assert.match(dataModelContractRoute, /relationshipBoundaries/);
  assert.match(policyBundleContractRoute, /validateMoralTradePolicyBundleContract/);
  assert.match(policyBundleContractRoute, /strictInputBundle/);
  assert.match(policyBundleContractRoute, /prohibitedPatternCodes/);
  assert.match(policyBundleContractRoute, /verificationMethodKeys/);
  assert.match(copilotContractRoute, /validateMoralTradeCopilotContract/);
  assert.match(copilotContractRoute, /getMoralTradeCopilotRolloutReadinessAudits/);
  assert.match(copilotContractRoute, /promptTemplates/);
  assert.match(copilotContractRoute, /rolloutReadinessSignals/);
  assert.match(copilotContractRoute, /rolloutReadiness/);
  assert.match(healthRoute, /copilotRolloutReadinessStatuses/);
  assert.match(copilotReviewRoute, /buildMoralTradeCopilotOutput/);
  assert.match(copilotReviewRoute, /normalizeMoralTradeCopilotEvidenceMetadata/);
  assert.match(copilotReviewRoute, /evidenceMetadataSummary/);
  assert.match(copilotReviewRoute, /validateMoralTradeCopilotOutput/);
  assert.match(copilotReviewRoute, /deterministic_draft_review_only/);
  assert.match(copilotReviewRoute, /stateMutation/);
  assert.match(copilotReviewRoute, /private, no-store/);
  assert.match(matchSignalContractRoute, /validateMoralTradeMatchSignalContract/);
  assert.match(matchSignalContractRoute, /approvedFactorCodes/);
  assert.match(matchSignalContractRoute, /participantExplanationTemplate/);
  assert.match(matchSignalEvaluateRoute, /evaluateMoralTradeRedactedProfileMatch/);
  assert.match(matchSignalEvaluateRoute, /redacted_profile_pair/);
  assert.match(matchSignalEvaluateRoute, /stateMutation: false/);
  assert.match(matchSignalEvaluateRoute, /private, no-store/);
  assert.match(challengeAppealContractRoute, /validateMoralTradeChallengeAppealContract/);
  assert.match(challengeAppealContractRoute, /standingCategories/);
  assert.match(challengeAppealEvaluateRoute, /evaluateMoralTradeChallengeAppeal/);
  assert.match(challengeAppealEvaluateRoute, /challenge_appeal_packet/);
  assert.match(challengeAppealEvaluateRoute, /stateMutation: false/);
  assert.match(challengeAppealEvaluateRoute, /private, no-store/);
  assert.match(disclosureContractRoute, /validateMoralTradeDisclosureContract/);
  assert.match(disclosureContractRoute, /disclosureFields/);
  assert.match(disclosureEvaluateRoute, /evaluateMoralTradeDisclosureGrant/);
  assert.match(disclosureEvaluateRoute, /disclosure_grant_packet/);
  assert.match(disclosureEvaluateRoute, /stateMutation: false/);
  assert.match(disclosureEvaluateRoute, /private, no-store/);
  assert.match(reviewWorkflowContractRoute, /validateOfferReviewWorkflowContract/);
  assert.match(reviewWorkflowContractRoute, /detailWorkflowCards/);
  assert.match(reviewWorkflowContractRoute, /marketplaceFactorPriority/);
  assert.match(reviewWorkflowContractRoute, /participantCopyTemplates/);
  assert.match(reviewWorkflowEvaluateRoute, /getOfferReviewWorkflowCards/);
  assert.match(reviewWorkflowEvaluateRoute, /getOfferReviewCardInstrumentation/);
  assert.match(reviewWorkflowEvaluateRoute, /stateMutation: false/);
  assert.match(reviewWorkflowEvaluateRoute, /private, no-store/);
  assert.match(reasoningPacketsRoute, /getMoralTradeReasoningPackets/);
  assert.match(reasoningPacketsRoute, /validateMoralTradeReasoningPacketContract/);
  assert.match(reasoningPacketsRoute, /packets/);
  assert.match(reasoningPacketsRoute, /Cache-Control/);
  assert.match(operationsHealthRoute, /validateMoralTradeOperationsProfile/);
  assert.match(operationsHealthRoute, /resilienceFallbackTests/);
  assert.match(securityHealthRoute, /validateMoralTradeSecurityProfile/);
  assert.match(securityHealthRoute, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(securityHealthRoute, /publicNonClaims/);
  assert.match(evaluationHealthRoute, /validateMoralTradeEvaluationProfile/);
  assert.match(evaluationHealthRoute, /surfacingParityAuditDefaults/);
  assert.match(evaluationHealthRoute, /uxReadinessAuditDefaults/);
  assert.match(evaluationHealthRoute, /getMoralTradeEvaluationSampleAudits/);
  assert.match(evaluationHealthRoute, /sampleAudits/);
  assert.match(evaluationHealthRoute, /reviewedDeviationCount/);
  assert.match(evaluationHealthRoute, /deviationReviews/);
  assert.match(healthRoute, /evaluationSampleAuditStatuses/);
  assert.match(healthRoute, /evaluationSurfacingDeviationReviews/);
  assert.match(performanceHealthRoute, /validateMoralTradePerformanceProfile/);
  assert.match(performanceHealthRoute, /auditMoralTradeRouteRecoveryManifest/);
  assert.match(performanceHealthRoute, /reasoningCenterRecovery/);
  assert.match(performanceHealthRoute, /auditDefaults/);
  assert.match(performanceHealthRoute, /publicNonClaims/);
  assert.match(externalityHealthRoute, /validateMoralTradeExternalityProfile/);
  assert.match(externalityHealthRoute, /dueDiligenceSteps/);
  assert.match(externalityHealthRoute, /remedyControls/);
  assert.match(aiGovernanceHealthRoute, /validateMoralTradeAiGovernanceProfile/);
  assert.match(aiGovernanceHealthRoute, /requiredDocumentationBeforeMl/);
  assert.match(aiGovernanceHealthRoute, /documentationTemplates/);
  assert.match(aiGovernanceHealthRoute, /explanationControls/);
  assert.match(aiGovernanceHealthRoute, /prohibitedUses/);
  assert.match(apiContractRoute, /validateMoralTradeApiContractProfile/);
  assert.match(apiContractRoute, /requestSchema/);
  assert.match(provenanceSchemaRoute, /validateMoralTradeProvenanceContract/);
  assert.match(provenanceSchemaRoute, /publicContract/);
  assert.match(provenanceSchemaRoute, /validationRuleCodes/);
  assert.match(provenanceSchemaRoute, /sampleBundleSummary/);
});

test("pooled donation offset creation has visible path and server-side guardrails", () => {
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const offerDetailSource = readRepoFile("src/app/offers/[offerId]/page.tsx");
  const adminSource = readRepoFile("src/app/admin/page.tsx");

  assert.match(donationOffsetsPage, /Create offset/);
  assert.match(donationOffsetsPage, /Match ratio/);
  assert.match(offerForm, /offset_pool_maximum_cap_usd/);
  assert.match(offerForm, /offset_anti_threat_certification/);
  assert.match(offerForm, /offset_verification_metadata_acknowledgement/);
  assert.match(offerForm, /One proof, one claim/);
  assert.match(actionsSource, /validateDonationOffsetSubmissionGuards/);
  assert.match(actionsSource, /evidenceLocatorsConflict/);
  assert.match(actionsSource, /validateMoralTradeOfferCreateTransition/);
  assert.match(actionsSource, /getMoralTradeOfferPersistenceStatus/);
  assert.match(actionsSource, /buildMoralTradeOfferProtocolNotes/);
  assert.match(offerDetailSource, /getDonationOffsetEvidenceState/);
  assert.match(offerDetailSource, /One proof, one claim/);
  assert.match(adminSource, /duplicate proof/);
  assert.match(adminSource, /One proof, one claim/);
});

test("offer detail and worked examples expose instrumented review workflow cards", () => {
  const offerDetailSource = readRepoFile("src/app/offers/[offerId]/page.tsx");
  const workedExampleSource = readRepoFile("src/app/offers/examples/[exampleId]/page.tsx");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.match(proposalReviewSource, /getOfferReviewWorkflowCards/);
  assert.match(proposalReviewSource, /current_status/);
  assert.match(proposalReviewSource, /baseline_credibility/);
  assert.match(proposalReviewSource, /no_global_moral_ranking/);
  assert.match(proposalReviewSource, /appealable_review_scope/);
  assert.match(proposalReviewSource, /specific reviewed claim/);
  assert.match(offerDetailSource, /Review workflow/);
  assert.match(offerDetailSource, /Why this record can or cannot be relied on yet/);
  assert.match(offerDetailSource, /reviewWorkflowCards\.map/);
  assert.match(offerDetailSource, /review-factor-list/);
  assert.match(workedExampleSource, /getOfferReviewWorkflowCards/);
  assert.match(workedExampleSource, /Worked example; manual review required before reliance/);
  assert.match(workedExampleSource, /reviewWorkflowCards\.map/);
  assert.match(globalCss, /review-workflow-grid/);
  assert.match(globalCss, /review-workflow-card-human_review/);
  assert.match(globalCss, /review-factor-list/);
  assert.match(globalCss, /review-next-step/);
});

test("offer creation form has live client validation aligned with server-required fields", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(actionsSource, /const offerAction = readRequired\(formData, "offer_action"\)/);
  assert.match(actionsSource, /const requestAction = readRequired\(formData, "request_action"\)/);
  assert.match(actionsSource, /const notes = readRequired\(formData, "notes"\)/);
  assert.match(actionsSource, /The protocol state transition could not be recorded/);
  assert.match(actionsSource, /Offer saved for protocol review/);
  assert.match(offerForm, /liveCoreOfferErrors/);
  assert.match(offerForm, /liveOfferErrors/);
  assert.match(offerForm, /Party-relative benefit/);
  assert.match(offerForm, /Privacy redaction/);
  assert.match(offerForm, /not a platform judgment about/);
  assert.match(offerForm, /better off than the no-trade baseline/);
  assert.match(offerForm, /Ready to publish/);
  assert.match(offerForm, /disabled=\{!canPublishOffer\}/);
  assert.match(offerForm, /name="offer_action"[\s\S]*required/);
  assert.match(offerForm, /name="request_action"[\s\S]*required/);
  assert.match(offerForm, /name="notes"[\s\S]*required/);
});

test("offer creation form exposes preset templates without weakening validation", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");

  assert.match(offerForm, /OFFER_TEMPLATES/);
  assert.match(offerForm, /30-day pledge swap/);
  assert.match(offerForm, /Matched donation offset/);
  assert.match(offerForm, /Threshold offset pool/);
  assert.match(offerForm, /applyOfferTemplate/);
  assert.match(offerForm, /Templates focus on the launch wedge/);
  assert.match(offerForm, /setOfferAction\(template\.offerAction\)/);
  assert.match(offerForm, /setBaselineStatement\(template\.baselineStatement\)/);
  assert.match(offerForm, /disabled=\{!canPublishOffer\}/);
  assert.match(offerForm, /liveOfferErrors/);
});

test("offer creation form exposes a guided reviewable-trade wizard", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const offerNewPage = readRepoFile("src/app/offers/new/page.tsx");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.match(offerForm, /OfferWizardStep/);
  assert.match(offerForm, /Guided offer wizard/);
  assert.match(offerForm, /Choose a launch route/);
  assert.match(offerForm, /State reciprocal terms/);
  assert.match(offerForm, /Explain baseline and exit/);
  assert.match(offerForm, /Set evidence rules/);
  assert.match(offerForm, /Ready for review/);
  assert.match(offerForm, /Protocol review preview/);
  assert.match(offerForm, /Fixed verification loop/);
  assert.match(offerForm, /protocolReview\.verificationLoop/);
  assert.match(offerForm, /buildEvidenceProvenancePreflight/);
  assert.match(offerForm, /provenanceValidationRules/);
  assert.match(offerForm, /Evidence object preflight/);
  assert.match(offerForm, /\/api\/moral-trade\/provenance\/schema/);
  assert.match(offerForm, /one-proof-one-claim/);
  assert.match(offerForm, /claim-artifact-links/);
  assert.match(offerForm, /scope-alignment/);
  assert.match(offerForm, /formatVerificationStepStatus/);
  assert.match(offerForm, /evaluateMoralTradeProtocolDraft/);
  assert.match(offerForm, /formatProtocolReviewStatus/);
  assert.match(offerForm, /Evidence to request/);
  assert.match(offerForm, /Reviewer scope/);
  assert.match(offerForm, /Clarification questions/);
  assert.match(offerForm, /Cited evidence table/);
  assert.match(offerForm, /Next step checklist/);
  assert.match(offerForm, /Reviewer summary/);
  assert.match(offerForm, /protocolReview\.clarificationQuestions/);
  assert.match(offerForm, /protocolReview\.reviewerSummary/);
  assert.match(offerNewPage, /getMoralTradeProvenanceContract/);
  assert.match(offerNewPage, /provenanceValidationRules=\{provenanceValidationRules\}/);
  assert.match(offerForm, /completedWizardSteps/);
  assert.match(offerForm, /wizardProgressPercent/);
  assert.match(offerForm, /href: "#offer-route"/);
  assert.match(offerForm, /id="offer-terms"/);
  assert.match(offerForm, /id="offer-boundaries"/);
  assert.match(offerForm, /id="offer-evidence"/);
  assert.match(offerForm, /id="offer-publish"/);
  assert.match(globalCss, /offer-wizard-panel/);
  assert.match(globalCss, /offer-wizard-steps/);
  assert.match(globalCss, /protocol-review-panel/);
  assert.match(globalCss, /protocol-verification-list/);
  assert.match(globalCss, /protocol-provenance-preflight/);
  assert.match(globalCss, /protocol-provenance-list/);
  assert.match(globalCss, /protocol-verification-step/);
  assert.match(globalCss, /protocol-workflow-card/);
  assert.match(globalCss, /protocol-factor-list/);
  assert.match(globalCss, /protocol-gate-list/);
  assert.match(globalCss, /protocol-workflow-evidence-grid/);
  assert.match(globalCss, /protocol-evidence-row-list/);
});

test("offers page keeps content before the footer in source order", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const mainIndex = offersPage.indexOf("<main");
  const directoryIndex = offersPage.indexOf("Offer marketplace");
  const exampleIndex = offersPage.indexOf("Illustrative fit ranking");
  const footerIndex = offersPage.indexOf("<SiteFooter />");

  assert.ok(mainIndex > -1);
  assert.ok(directoryIndex > mainIndex);
  assert.ok(exampleIndex > directoryIndex);
  assert.ok(footerIndex > exampleIndex);
});

test("create trade route family has stable signed-out entry points", () => {
  const createRoute = readRepoFile("src/app/create/page.tsx");
  const newOfferPage = readRepoFile("src/app/offers/new/page.tsx");

  assert.match(createRoute, /Create trade/);
  assert.match(createRoute, /NewOfferPage/);
  assert.equal(createRoute.includes("redirect("), false);
  assert.match(newOfferPage, /Create an account to save and publish a structured trade proposal/);
  assert.match(newOfferPage, /\/signup\?returnTo=\/offers\/new/);
  assert.match(newOfferPage, /\/login\?returnTo=\/offers\/new/);
  assert.equal(newOfferPage.includes("requireViewer"), false);
});

test("marketplace pilot copy separates live offers from worked examples", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");

  assert.match(offersPage, /Live offers/);
  assert.match(offersPage, /Worked examples/);
  assert.match(offersPage, /<h1>Browse offers<\/h1>/);
  assert.match(offersPage, /Explore live offers and worked examples/);
  assert.match(offersPage, /Create an offer/);
  assert.match(offersPage, /Save search/);
  assert.match(offersPage, /Worked example, not live liquidity/);
  assert.match(offersPage, /Manual review before reliance/);
  assert.match(offersPage, /defaultView = liveOfferCount > 0 \? "live" : "examples"/);
  assert.match(offersPage, /No live offers yet/);
  assert.match(offersPage, /No matching listings/);
  assert.match(offersPage, /Browse worked examples or create the first public offer/);
  assert.match(offersPage, /Baseline confidence is separate from action evidence/);
  assert.match(offersPage, /visibleFormatCounts/);
  assert.match(offersPage, /collection-trust-panel/);
  assert.equal(offersPage.includes("Browse the narrow pilot wedge"), false);
  assert.equal(offersPage.includes("worked example s"), false);
  assert.equal(offersPage.includes("Live participant offers will appear here"), false);
});

test("worked examples have canonical detail pages and sitemap coverage", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const exampleDetailPage = readRepoFile("src/app/offers/examples/[exampleId]/page.tsx");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(offersPage, /\/offers\/examples\/\$\{offer\.id\}/);
  assert.match(exampleDetailPage, /generateStaticParams/);
  assert.match(exampleDetailPage, /Worked example; manual review required before reliance/);
  assert.match(exampleDetailPage, /No escrow or custody claim/);
  assert.match(exampleDetailPage, /Participant-stated importance/);
  assert.match(exampleDetailPage, /Counterparty minimum acceptable importance/);
  assert.match(exampleDetailPage, /Action evidence/);
  assert.match(exampleDetailPage, /Baseline confidence/);
  assert.match(exampleDetailPage, /Third-party externality review/);
  assert.match(exampleDetailPage, /Read primer/);
  assert.match(sitemapSource, /\/offers\/examples\/\$\{offer\.id\}/);
});
