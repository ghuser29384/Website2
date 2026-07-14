import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS,
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
} from "@/lib/background-source-permissions";
import {
  getBackgroundNetworkingRolloutPlan,
  validateBackgroundNetworkingRolloutPlan,
} from "@/lib/background-rollout";
import { PARTNER_COHORTS } from "@/lib/growth";
import {
  MARKETPLACE_KPI_KEYS,
  MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS,
  validateMarketplaceMeasurementContract,
} from "@/lib/marketplace-measurement";
import {
  MEASUREMENT_EVENT_SPECS,
  MEASUREMENT_GUARDRAILS,
  MEASUREMENT_PERFORMANCE_BASELINE,
  MEASUREMENT_ROADMAP,
  validateMeasurementPlan,
} from "@/lib/measurement-plan";
import { demoAlternatives, MPGF_COPY } from "@/lib/mpgf/data";
import { getAllOffers } from "@/lib/offers";
import {
  CANONICAL_WORKED_CASE_COUNT,
  CANONICAL_WORKED_CASE_OFFERS,
} from "@/lib/seed-data";
import { filterSiteSearchItems } from "@/lib/site-search";
import { FOOTER_LINK_GROUPS, getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function flattenPrimaryNavHrefs() {
  return getPrimaryNavLinks(false).flatMap((link) => link.items.map((item) => item.href));
}

test("public navigation exposes professional marketplace routes", () => {
  const labels = getPrimaryNavLinks(false).map((link) => link.label);
  const hrefs = flattenPrimaryNavHrefs();
  const footerHrefs = FOOTER_LINK_GROUPS.flatMap((group) => group.links.map((link) => link.href));
  const tradeMenu = getPrimaryNavLinks(false).find((link) => link.label === "Trade");
  const publicGoodsMenu = getPrimaryNavLinks(false).find((link) => link.label === "Moral Public Goods");
  const groupBuyingSearchResults = filterSiteSearchItems("group buying", 6);
  const siteSource = readRepoFile("src/lib/site.ts");
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const authenticatedPrimaryAction = getTopbarActions(true).primaryAction;

  assert.deepEqual(labels, ["Trade", "Moral Public Goods"]);
  assert.equal(getTopbarActions(false).primaryAction, undefined);
  assert.ok(authenticatedPrimaryAction);
  assert.equal(authenticatedPrimaryAction.href, "/offers/new?mode=offset");
  assert.equal(authenticatedPrimaryAction.label, "Create trade");
  assert.equal(getTopbarActions(false).authLink.label, "Sign in");
  assert.match(tradeMenu?.summary ?? "", /bounded moral trade commitments/);
  assert.match(publicGoodsMenu?.summary ?? "", /common budgets, and group-buying pools/);
  assert.ok(getPrimaryNavLinks(false).every((link) => link.items?.every((item) => item.description)));
  assert.ok(getPrimaryNavLinks(false).every((link) => link.items?.every((item) => item.section)));
  assert.ok(tradeMenu?.items?.some((item) => item.label === "Create donation offset" && item.section === "Participate"));
  assert.ok(tradeMenu?.items?.some((item) => item.label === "Group buying" && item.section === "Trade lanes"));
  assert.equal(
    tradeMenu?.items?.find((item) => item.label === "Group buying")?.href,
    "/moral-goods-group-buying",
  );
  assert.equal(
    publicGoodsMenu?.items?.some((item) => item.href === "/moral-goods-group-buying"),
    false,
  );
  assert.ok(groupBuyingSearchResults.some((item) => item.href === "/moral-goods-group-buying"));
  assert.ok(hrefs.includes("/projects"));
  assert.ok(hrefs.includes("/start"));
  assert.ok(hrefs.includes("/how-it-works"));
  assert.ok(hrefs.includes("/offers"));
  assert.ok(hrefs.includes("/pledge-swaps"));
  assert.ok(hrefs.includes("/moral-goods-group-buying"));
  assert.ok(hrefs.includes("/donation-offsets"));
  assert.ok(hrefs.includes("/donate"));
  assert.ok(hrefs.includes("/validation"));
  assert.ok(hrefs.includes("/worked-examples"));
  assert.ok(hrefs.includes("/mpgf"));
  assert.ok(hrefs.includes("/mpgf/about"));
  assert.ok(hrefs.includes("/mpgf/contribute"));
  assert.ok(hrefs.includes("/mpgf/pools"));
  assert.ok(hrefs.includes("/mpgf/governance"));
  assert.ok(hrefs.includes("/mpgf/metrics"));
  assert.ok(hrefs.includes("/measurement"));
  assert.ok(hrefs.includes("/faq"));
  assert.ok(hrefs.includes("/sources"));
  assert.ok(hrefs.includes("/background-networking"));
  assert.ok(hrefs.includes("/cohort"));
  assert.ok(hrefs.includes("/team-and-governance"));
  assert.ok(hrefs.includes("/pilot-updates"));
  assert.ok(hrefs.includes("/contact"));
  assert.ok(hrefs.includes("/trust"));
  assert.ok(hrefs.includes("/status"));
  assert.equal(hrefs.includes("/paid-action-offers"), false);
  assert.equal(hrefs.includes("/saved-offers"), false);
  assert.equal(hrefs.includes("/moral-trade/technical-spec"), false);
  assert.equal(hrefs.includes("/reasoning-center"), false);
  assert.equal(hrefs.includes("/accessibility"), false);
  assert.equal(hrefs.includes("/priority-correction-fund"), true);
  assert.equal(footerHrefs.includes("/paid-action-offers"), true);
  assert.equal(footerHrefs.includes("/mpgf"), true);
  assert.equal(footerHrefs.includes("/moral-goods-group-buying"), true);
  assert.equal(footerHrefs.includes("/moral-trade/technical-spec"), true);
  assert.equal(footerHrefs.includes("/reasoning-center"), true);
  assert.equal(footerHrefs.includes("/priority-correction-fund"), true);
  assert.ok(!hrefs.includes("/cart"));
  assert.equal(siteSource.includes("label: \"MPGF\""), false);
  assert.equal(siteSource.includes("label: \"Advanced\""), false);
  assert.match(siteSource, /label: "Trade"/);
  assert.match(siteSource, /label: "Moral Public Goods"/);
  assert.match(siteSource, /section: "Trade lanes"/);
  assert.match(siteSource, /section: "Funding routes"/);
  assert.match(siteSource, /\/contact/);
  assert.match(siteSource, /\/status/);
  assert.match(siteSource, /\/trust/);
  assert.match(siteSource, /\/projects/);
  assert.match(siteSource, /\/start/);
  assert.match(siteSource, /\/pilot-updates/);
  assert.match(siteSource, /\/measurement/);
  assert.match(siteSource, /\/accessibility/);
  assert.match(siteSource, /href: "\/sources", label: "Sources"/);
  assert.equal(siteSource.includes("/methodology#sources"), false);
  assert.match(topbarSource, /topbar-menu-heading/);
  assert.match(topbarSource, /topbar-menu-section/);
  assert.match(topbarSource, /topbar-menu-icon/);
  assert.match(topbarSource, /topbar-with-search/);
  assert.match(topbarSource, /showSearch = true/);
  assert.match(globalCss, /\.topbar-menu-section\s*\{/);
  assert.match(
    globalCss,
    /\.button-secondary\.button-nav\.is-active\s*\{[\s\S]*background:\s*var\(--accent-soft\);[\s\S]*color:\s*var\(--accent-deep\);/,
  );
});

test("offer save surfaces avoid shopping-cart framing", () => {
  const savedOffersPage = readRepoFile("src/app/saved-offers/page.tsx");
  const cartRedirectPage = readRepoFile("src/app/cart/page.tsx");
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const offerDetailPage = readRepoFile("src/app/offers/[offerId]/page.tsx");
  const notFoundPage = readRepoFile("src/app/not-found.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const robotsSource = [
    readRepoFile("src/app/robots.txt/route.ts"),
    readRepoFile("src/lib/crawlability-assets.ts"),
  ].join("\n");
  const publicOffersSource = readRepoFile("src/lib/public-offers.ts");
  const offerFollowsSource = readRepoFile("src/lib/offer-follows.ts");
  const offerCreateSimilarSource = readRepoFile("src/lib/offer-create-similar.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const publicCopySources = [
    savedOffersPage,
    dashboardPage,
    offerDetailPage,
    notFoundPage,
    actionsSource,
  ].join("\n");
  const contractSources = [
    publicOffersSource,
    offerFollowsSource,
    offerCreateSimilarSource,
    apiContractProfile,
  ].join("\n");

  assert.match(savedOffersPage, /title: "Saved offers"/);
  assert.match(savedOffersPage, /<h1 id="plan-heading">Planner<\/h1>/);
  assert.match(savedOffersPage, /Plan — private selected items\. No commitment created\./);
  assert.match(savedOffersPage, /Preview only · Private planning only · No commitment created\./);
  assert.match(savedOffersPage, /await getViewer\(\)/);
  assert.match(savedOffersPage, /Sign in to view your planner\./);
  assert.match(savedOffersPage, /does not create demo planner rows, commitments, or pledge-funding contribution state/);
  assert.equal(savedOffersPage.includes("requireViewer"), false);
  assert.match(savedOffersPage, /value="\/saved-offers"/);
  assert.match(cartRedirectPage, /redirect\("\/saved-offers"\)/);
  assert.match(dashboardPage, /Account — saved settings and records\./);
  assert.match(dashboardPage, /href="\/saved-offers"/);
  assert.match(robotsSource, /OAI-SearchBot/);
  assert.match(robotsSource, /Claude-SearchBot/);
  assert.equal(robotsSource.includes("Disallow"), false);
  assert.match(offerDetailPage, /Interest and saved-offer activity/);
  assert.match(actionsSource, /Saved offer/);
  assert.match(actionsSource, /revalidatePath\("\/saved-offers"\)/);
  assert.match(contractSources, /personalized saved-offer state/);

  for (const forbidden of [
    "Shopping cart",
    "Your cart",
    "Open cart",
    "cart addition(s)",
    "Currently in your cart",
    "Not yet added to your cart",
    "Added to cart",
    "Removed from cart",
    "cart item(s)",
    "cart items",
    "personalized cart state",
    "cart state, or source notes",
    "Dashboards, carts",
    "href=\"/cart\"",
    "value=\"/cart\"",
    "requireViewer(\"/cart\")",
  ]) {
    assert.equal(publicCopySources.includes(forbidden), false);
    assert.equal(contractSources.includes(forbidden), false);
  }
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
  assert.match(poolsPageSource, /name="cluster"/);
  assert.match(poolsPageSource, /name="min_intensity"/);
  assert.match(poolsPageSource, /Common-ground ordering/);
  assert.match(poolsPageSource, /Campaign order ranks coordinatability, not moral truth/);
  assert.match(poolsPageSource, /Consensus goods/);
  assert.match(poolsPageSource, /Hybrid goods/);
  assert.match(poolsPageSource, /Sealed progress/);
  assert.match(poolsPageSource, /Public progress/);
  assert.equal(poolsPageSource.includes("status.verifiedSupporterCount"), false);
  assert.match(poolDetailSource, /Good type/);
  assert.match(poolDetailSource, /expectedMoralImpactTooltip/);
  assert.match(poolDetailSource, /Sealed public preview/);
  assert.match(poolDetailSource, /Threshold rules/);
  assert.equal(poolDetailSource.includes("assuranceStatus.verifiedSupporterCount"), false);
  assert.equal(poolDetailSource.includes("assuranceStatus.amountProgressBps"), false);
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
  const authCardSource = readRepoFile("src/components/auth/auth-card.tsx");
  const authRouteSource = readRepoFile("src/lib/auth-routes.ts");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const mpfgContributePageSource = readRepoFile("src/app/mpgf/contribute/page.tsx");
  const mpfgAccountPageSource = readRepoFile("src/app/mpgf/account/contributions/page.tsx");
  const participantProfile = readRepoFile("config/mpgf/participant-onboarding-profile.json");
  const smokeProfile = readRepoFile("config/mpgf/www-smoke-test-profile.json");

  assert.match(loginPageSource, /<AuthPage/);
  assert.match(authCardSource, /getAuthReturnTo\(searchParams, mode\)/);
  assert.match(authRouteSource, /readSearchParam\(searchParams, "returnTo"\) \?\? readSearchParam\(searchParams, "next"\)/);
  assert.match(appDataSource, /\/login\?returnTo=/);
  assert.match(mpfgContributePageSource, /\/login\?returnTo=\/mpgf\/contribute/);
  assert.match(mpfgAccountPageSource, /\/login\?returnTo=\/mpgf\/account\/contributions/);
  assert.match(participantProfile, /"authEntryRoute": "\/signup\?returnTo=\/mpgf"/);
  assert.match(smokeProfile, /"authRoute": "\/login\?returnTo=\/mpgf"/);
});

test("login exposes a Supabase password recovery flow", () => {
  const loginPageSource = readRepoFile("src/app/login/page.tsx");
  const authCardSource = readRepoFile("src/components/auth/auth-card.tsx");
  const passwordResetPageSource = readRepoFile("src/app/password-reset/page.tsx");
  const passwordUpdatePageSource = readRepoFile("src/app/password-update/page.tsx");
  const actionSource = readRepoFile("src/app/actions.ts");
  const confirmRouteSource = readRepoFile("src/app/auth/confirm/route.ts");

  assert.match(loginPageSource, /<AuthPage/);
  assert.match(authCardSource, /Forgot password\?/);
  assert.match(authCardSource, /\/password-reset\?returnTo=/);
  assert.match(passwordResetPageSource, /requestPasswordResetAction/);
  assert.match(passwordResetPageSource, /name="return_to"/);
  assert.match(passwordResetPageSource, /does not\s+reveal whether the address already has an account/);
  assert.match(passwordUpdatePageSource, /updatePasswordAction/);
  assert.match(passwordUpdatePageSource, /name="confirm_password"/);
  assert.match(actionSource, /resetPasswordForEmail/);
  assert.match(actionSource, /\/auth\/confirm/);
  assert.match(actionSource, /\/password-update/);
  assert.match(actionSource, /updateUser\(\{ password \}\)/);
  assert.match(actionSource, /password-reset:/);
  assert.match(actionSource, /password-update:/);
  assert.match(confirmRouteSource, /verifyOtp/);
  assert.match(confirmRouteSource, /could not confirm that link/);
});

test("public offer and registry pages include seeded examples instead of empty-only states", () => {
  assert.equal(CANONICAL_WORKED_CASE_COUNT, 8);
  assert.equal(getAllOffers([]).length, CANONICAL_WORKED_CASE_COUNT);
  assert.ok(
    CANONICAL_WORKED_CASE_OFFERS.every((offer) => offer.offerAction && offer.requestAction && offer.verification),
  );

  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const marketplaceComponents = readRepoFile("src/components/marketplace/marketplace-components.tsx");
  assert.match(offersPage, /Worked examples/);
  assert.match(offersPage, /MarketplaceHome/);
  assert.match(marketplaceComponents, /Preview only until you confirm/);
  assert.match(offersPage, /CANONICAL_WORKED_CASE_OFFERS/);
  assert.equal(offersPage.includes(["Six", "seeded", "offers"].join(" ")), false);
  assert.equal(offersPage.includes(".slice(0, 6)"), false);
  assert.equal(offersPage.includes("No public offers have been published yet"), false);

  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  const wishRegistrySource = readRepoFile("src/lib/wish-registry.ts");
  assert.match(registryPage, /EXAMPLE_WISH_PREVIEWS/);
  assert.match(registryPage, /filterWishRegistryExamplePreviews/);
  assert.doesNotMatch(registryPage, /getWishRegistryCompatibilityBand/);
  assert.match(registryPage, /BACKGROUND_PUBLIC_REGISTRY_HERO/);
  assert.match(registryPage, /Broad preview only/);
  assert.match(registryPage, /Browse broad previews/);
  assert.match(registryPage, /Exact wishes,\s+private asks, and contact details stay hidden/);
  assert.equal(registryPage.includes("match score"), false);
  assert.match(wishRegistrySource, /getWishRegistryRedactedOverlapTokens/);
  assert.match(wishRegistrySource, /getWishRegistryCompatibilityBand/);
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
  const publicGoodsResults = filterSiteSearchItems("moral public goods");
  const commonGroundResults = filterSiteSearchItems("common ground budget");
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
  assert.match(offersPage, /MarketplaceHome/);
  assert.match(offersPage, /formatCounts/);
  assert.match(offersPage, /causeCounts/);
  assert.match(offersPage, /getListingModeIcon/);
  assert.match(offersPage, /primaryActionLabel/);
  assert.match(offersPage, /OfferCard/);
  assert.match(offersPage, /getOfferReviewCardInstrumentation/);
  assert.match(offersPage, /reviewFactorCodes/);
  assert.match(offersPage, /reviewNextStep/);
  assert.match(offersPage, /reviewStatusReason/);
  assert.match(offersPage, /listingMatchesFilters/);
  assert.match(offersPage, /sortListings/);
  assert.match(pagePrimitives, /listing-factor-codes/);
  assert.match(pagePrimitives, /Next step:/);
  assert.match(pagePrimitives, /Why this status:/);
  assert.match(globalCss, /listing-factor-codes/);
  assert.match(globalCss, /listing-next-step/);
  assert.match(appDataSource, /offerMatchesSearchQuery/);
  assert.equal(animalResults[0]?.href, "/offers?search=Animal%20Welfare");
  assert.equal(filterSiteSearchItems("pledge swap")[0]?.href, "/pledge-swaps");
  assert.ok(mpfgResults.some((result) => result.href === "/mpgf"));
  assert.equal(publicGoodsResults[0]?.href, "/mpgf");
  assert.equal(publicGoodsResults[0]?.label, "Common Ground Budget");
  assert.equal(commonGroundResults[0]?.href, "/mpgf");
  assert.ok(validationResults.some((result) => result.href === "/validation"));
});

test("home page is an editorial pilot landing page with a separate marketplace destination", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const pageSource = readRepoFile("src/app/page.tsx");
  const visitorPathsSource = readRepoFile("src/lib/visitor-paths.ts");
  const heroIndex = homeSource.indexOf("Cooperate");
  const thesisIndex = homeSource.indexOf("Disagreement can create gains.");
  const mechanismIndex = homeSource.indexOf("A small protocol for a hard problem.");
  const laneIndex = homeSource.indexOf("Start with something bounded.");
  const pilotIndex = homeSource.indexOf("See the institution as it is.");
  const examplesIndex = homeSource.indexOf("Read the terms before the theory.");
  const relianceIndex = homeSource.indexOf("Trust comes from legible limits.");
  const startIndex = homeSource.indexOf("Enter at the right depth.");
  const finalIndex = homeSource.indexOf("Bring one real disagreement.");

  assert.ok(heroIndex > -1);
  assert.ok(thesisIndex > heroIndex);
  assert.ok(mechanismIndex > thesisIndex);
  assert.ok(laneIndex > mechanismIndex);
  assert.ok(pilotIndex > laneIndex);
  assert.ok(examplesIndex > pilotIndex);
  assert.ok(relianceIndex > examplesIndex);
  assert.ok(startIndex > relianceIndex);
  assert.ok(finalIndex > startIndex);
  assert.equal(homeSource.includes("<MarketplaceHome"), false);
  assert.equal(homeSource.includes("MarketplaceBottomNav"), false);
  assert.equal(homeSource.includes("marketplaceSurface"), false);
  assert.equal(pageSource.includes("buildMarketplaceDeals"), false);
  assert.equal(pageSource.includes("buildMarketplaceSurface"), false);
  assert.equal(pageSource.includes("listOpenOffersPage"), false);
  assert.equal(pageSource.includes("demoMpgfPublicGoodsCampaigns"), false);
  assert.match(homeSource, /See how it works/);
  assert.match(homeSource, /Browse worked examples/);
  assert.match(homeSource, /Open the coordination feed/);
  assert.match(homeSource, /Join the founding cohort/);
  assert.match(homeSource, /Moral Trade helps people with different values exchange small, reviewable/);
  assert.match(homeSource, /VISITOR_PATHS/);
  assert.match(visitorPathsSource, /Learn the idea/);
  assert.match(visitorPathsSource, /Test an example/);
  assert.match(visitorPathsSource, /Donate through a vetted route/);
  assert.match(visitorPathsSource, /Join the founding cohort/);
  assert.match(visitorPathsSource, /Open worked examples/);
  assert.match(homeSource, /marketplaceOverview/);
  assert.match(homeSource, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(homeSource, /Worked examples/);
  assert.match(homeSource, /No custody or escrow/);
  assert.match(homeSource, /Completed agreements/);
  assert.match(homeSource, /IconMark/);
  assert.match(homeSource, /MutualStepFigure/);
  assert.match(homeSource, /Explicit baselines/);
  assert.match(homeSource, /Consent-gated disclosure/);
  assert.match(homeSource, /no liquidity or impact total is implied/);
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

test("visitor router exposes four intent paths before deeper marketplace mechanics", () => {
  const startPage = readRepoFile("src/app/start/page.tsx");
  const visitorPathsSource = readRepoFile("src/lib/visitor-paths.ts");
  const siteSearchSource = readRepoFile("src/lib/site-search.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(startPage, /Choose the right first path/);
  assert.match(startPage, /learn, test an example, donate, or join\/build/i);
  assert.match(startPage, /Learn, test, donate, or join\/build/);
  assert.match(startPage, /getMarketplaceOverview/);
  assert.match(startPage, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(startPage, /Pilot inventory/);
  assert.match(startPage, /Live offers/);
  assert.match(startPage, /Worked examples/);
  assert.match(startPage, /Public profiles/);
  assert.match(startPage, /No liquidity claim/);
  assert.match(startPage, /growth-progress-card/);
  assert.match(startPage, /No liquidity assumption/);
  assert.match(startPage, /No account pressure/);
  assert.match(startPage, /No hidden automation/);
  assert.match(visitorPathsSource, /key: "learn"/);
  assert.match(visitorPathsSource, /key: "test"/);
  assert.match(visitorPathsSource, /key: "donate"/);
  assert.match(visitorPathsSource, /key: "join-build"/);
  assert.match(visitorPathsSource, /\/worked-examples/);
  assert.match(visitorPathsSource, /\/cohort/);
  assert.match(siteSearchSource, /Choose your path/);
  assert.match(siteSearchSource, /visitor router/);
  assert.match(sitemapSource, /\/start/);
});

test("moral trade animation typology remains accessible as a reference surface", () => {
  const animationSource = readRepoFile("src/components/home/moral-trade-animations.tsx");
  const globalCss = readRepoFile("src/app/globals.css");

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

test("people directory hides empty social proof and sorts by reviewable records", () => {
  const peoplePage = readRepoFile("src/app/people/page.tsx");
  const profilePage = readRepoFile("src/app/people/[profileId]/page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const publicProfileTrustSource = readRepoFile("src/lib/public-profile-trust.ts");

  assert.match(peoplePage, /Reviewed records/);
  assert.match(peoplePage, /Open offers/);
  assert.match(peoplePage, /Newest opt-ins/);
  assert.match(peoplePage, /Empty follower, karma, and comment metrics stay hidden/);
  assert.equal(peoplePage.includes("Counterparty interest"), false);
  assert.equal(peoplePage.includes("Reviewer karma"), false);
  assert.equal(peoplePage.includes("Public discussion"), false);
  assert.match(appDataSource, /export type PeopleSort = "reviewed" \| "offers" \| "newest"/);
  assert.equal(appDataSource.includes('sort === "followers"'), false);
  assert.equal(appDataSource.includes('sort === "karma"'), false);
  assert.equal(appDataSource.includes('sort === "comments"'), false);
  assert.match(profilePage, /Trust signals appear here only after this member publishes reviewable records/);
  assert.match(profilePage, /offer\.commentCount > 0/);
  assert.match(profilePage, /offer\.recommendationCount > 0/);
  assert.match(publicProfileTrustSource, /reviewable records are not public yet/);
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

  assert.match(backgroundPage, /BACKGROUND_PUBLIC_BACKGROUND_HERO/);
  assert.match(backgroundPage, /BACKGROUND_PUBLIC_PROMISE/);
  assert.match(backgroundPage, /BACKGROUND_PUBLIC_SAFETY_CARDS/);
  assert.match(backgroundPage, /BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS/);
  assert.match(backgroundPage, /BACKGROUND_PUBLIC_NOT_THIS/);
  assert.match(backgroundPage, /background-technical-details/);
  assert.match(backgroundPage, /\/api\/background\/source-connections\/:id\/summary-draft/);
  assert.match(backgroundPage, /\/api\/background\/source-connections\/:id\/approve/);
  assert.match(backgroundPage, /\/api\/background\/profile\/recompute/);
  assert.match(backgroundPage, /getMoralTradeMatchSignalContract/);
  assert.match(backgroundPage, /validateMoralTradeMatchSignalContract/);
  assert.match(backgroundPage, /validateMoralTradeMatchSignal/);
  assert.match(backgroundPage, /getBackgroundAiShadowContract/);
  assert.match(backgroundPage, /validateBackgroundAiShadowContract/);
  assert.match(backgroundPage, /getBackgroundCapabilityGateContract/);
  assert.match(backgroundPage, /validateBackgroundCapabilityGateContract/);
  assert.match(backgroundPage, /getBackgroundRlsAuditContract/);
  assert.match(backgroundPage, /validateBackgroundRlsAuditContract/);
  assert.match(backgroundPage, /Match signal contract/);
  assert.match(backgroundPage, /Suggestions explain public compatibility without revealing private wishes/);
  assert.match(backgroundPage, /matchSignalContract\.sampleSignal/);
  assert.match(backgroundPage, /participantExplanation\.headline/);
  assert.match(backgroundPage, /participantExplanation\.redactionNotice/);
  assert.match(backgroundPage, /matchSignalContract\.redactedFields/);
  assert.match(backgroundPage, /AI shadow mode/);
  assert.match(backgroundPage, /Open shadow contract/);
  assert.match(backgroundPage, /\/api\/moral-trade\/ai-shadow\/contract/);
  assert.match(backgroundPage, /aiShadowContract\.sampleReadyEvaluation/);
  assert.match(backgroundPage, /aiShadowContract\.prohibitedEffects/);
  assert.match(backgroundPage, /Capability gates/);
  assert.match(backgroundPage, /Open gate contract/);
  assert.match(backgroundPage, /Private-overlap checks are currently a disabled design lane/);
  assert.match(backgroundPage, /Current phase artifact/);
  assert.match(backgroundPage, /validateBackgroundPhaseGateBundle/);
  assert.match(backgroundPage, /Private overlap contract/);
  assert.match(backgroundPage, /capabilityGateContract\.gates/);
  assert.match(backgroundPage, /capabilityGateValidation\.expansionReady/);
  assert.match(backgroundPage, /\/api\/moral-trade\/background-capability-gates\/contract/);
  assert.match(backgroundPage, /\/api\/moral-trade\/private-overlap\/contract/);
  assert.match(backgroundPage, /RLS and encryption audit/);
  assert.match(backgroundPage, /Open RLS contract/);
  assert.match(backgroundPage, /rlsAuditContract\.tableRequirements/);
  assert.match(backgroundPage, /\/api\/moral-trade\/background-rls-audit\/contract/);
  assert.match(backgroundPage, /Cohort pilot packs/);
  assert.match(backgroundPage, /Donor circles/);
  assert.match(backgroundPage, /Reading groups/);
  assert.match(backgroundPage, /Organization cohorts/);
  assert.match(backgroundPage, /factorCode/);
  assert.match(backgroundPage, /Counts, not hidden inference/);
  assert.match(backgroundPage, /does not infer ideology, psychology, protected traits, or hidden/);
  assert.match(backgroundPage, /BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS/);
  assert.match(backgroundPage, /BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS/);
  assert.match(backgroundPage, /Source connector boundary/);
  assert.match(backgroundPage, /Raw connector ingestion remains disabled/);
  assert.match(backgroundPage, /BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION/);
  assert.match(backgroundPage, /BACKGROUND_SELF_SERVE_DELETION_SURFACES/);
  assert.match(backgroundPage, /Participants can remove the background layer/);
  assert.match(backgroundPage, /Open deletion controls/);
  assert.match(backgroundPage, /\/api\/moral-trade\/match-signal\/contract/);
  assert.match(reasoningCenterPage, /Pilot reasoning index/);
  assert.match(reasoningCenterPage, /reasoningCenterDescription/);
  assert.match(reasoningCenterPage, /twitter/);
  assert.match(reasoningCenterPage, /buildBreadcrumbJsonLd/);
  assert.match(reasoningCenterPage, /Breadcrumbs items/);
  assert.match(reasoningCenterPage, /reasoningCollectionStructuredData/);
  assert.match(reasoningCenterPage, /"@type": "CollectionPage"/);
  assert.match(reasoningCenterPage, /"@type": "ItemList"/);
  assert.match(reasoningCenterPage, /application\/ld\+json/);
  assert.match(reasoningCenterPage, /getOptionalViewerForReasoningCenter/);
  assert.match(reasoningCenterPage, /Rendering signed-out state after viewer lookup failed/);
  assert.match(reasoningCenterPage, /MORAL_TRADE_REASONING_PACKET_FILTERS/);
  assert.match(reasoningCenterPage, /buildMoralTradeReasoningPacketRoutePayload/);
  assert.match(reasoningCenterPage, /resolvedSearchParams\.status/);
  assert.match(reasoningCenterPage, /packet_generation_failed/);
  assert.match(reasoningCenterPage, /Packet generation is in recovery mode/);
  assert.match(reasoningCenterPage, /no proposal status, disclosure, outreach, evidence decision/);
  assert.match(reasoningCenterPage, /filterCounts\[filter\.key\]/);
  assert.match(reasoningCenterPage, /Show all records/);
  assert.match(reasoningCenterPage, /not a live forum or autonomous moral-ranking system/);
  assert.match(reasoningCenterPage, /Cited evidence rows/);
  assert.match(reasoningCenterPage, /Decision steps/);
  assert.match(reasoningCenterPage, /record\.decisionSteps/);
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
  assert.match(globalCss, /reasoning-filter-summary/);
  assert.match(globalCss, /reasoning-empty-state/);
  assert.match(globalCss, /reasoning-packet-grid/);
  assert.match(globalCss, /reasoning-contract-rule-list/);
  assert.match(standardsPage, /Make trade records specific enough to judge/);
  assert.match(standardsPage, /getOfferReviewWorkflowContract/);
  assert.match(standardsPage, /validateOfferReviewWorkflowContract/);
  assert.match(standardsPage, /getMoralTradeCopilotContract/);
  assert.match(standardsPage, /validateMoralTradeCopilotContract/);
  assert.match(standardsPage, /getMoralTradeProvenanceContract/);
  assert.match(standardsPage, /validateMoralTradeProvenanceContract/);
  assert.match(standardsPage, /Protocol-backed standards/);
  assert.match(standardsPage, /The public standards now resolve to validator contracts/);
  assert.match(standardsPage, /protocolContractCheckCount/);
  assert.match(standardsPage, /reviewWorkflowContract\.detailWorkflowCards/);
  assert.match(standardsPage, /copilotContract\.verificationLoop/);
  assert.match(standardsPage, /copilotContract\.approvedOutputSections/);
  assert.match(standardsPage, /provenanceContract\.validationRules/);
  assert.match(standardsPage, /\/api\/moral-trade\/review-workflow\/contract/);
  assert.match(standardsPage, /\/api\/moral-trade\/copilot\/contract/);
  assert.match(standardsPage, /\/api\/moral-trade\/provenance\/schema/);
  assert.match(standardsPage, /not legal escrow/i);
  assert.match(standardsPage, /voluntary/i);
  assert.match(sitemapSource, /\/background-networking/);
  assert.match(sitemapSource, /\/reasoning-center/);
  assert.match(sitemapSource, /\/reasoning-standards/);
  assert.match(sitemapSource, /\/pledge-swaps/);
  assert.match(sitemapSource, /\/cohort/);
  assert.match(sitemapSource, /\/paid-action-offers/);
});

test("background source connector permissions stay field-limited and raw-ingestion disabled", () => {
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const backgroundNetworkingPage = readRepoFile("src/app/background-networking/page.tsx");
  const aiShadowContractRoute = readRepoFile(
    "src/app/api/moral-trade/ai-shadow/contract/route.ts",
  );
  const capabilityGateRoute = readRepoFile(
    "src/app/api/moral-trade/background-capability-gates/contract/route.ts",
  );
  const privateOverlapContractRoute = readRepoFile(
    "src/app/api/moral-trade/private-overlap/contract/route.ts",
  );
  const rlsAuditContractRoute = readRepoFile(
    "src/app/api/moral-trade/background-rls-audit/contract/route.ts",
  );
  const backgroundActions = readRepoFile("src/app/background-networking/actions.ts");
  const sourceSummariesRoute = readRepoFile("src/app/api/background/source-summaries/route.ts");
  const sourceConnectionsRoute = readRepoFile("src/app/api/background/source-connections/route.ts");
  const sourceConnectionRevokeRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/route.ts",
  );
  const sourceConnectionDraftRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/draft-summary/route.ts",
  );
  const sourceConnectionSummaryDraftBg16AliasRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/summary-draft/route.ts",
  );
  const sourceConnectionSummaryDraftAliasRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/summaries/draft/route.ts",
  );
  const sourceSummaryApproveRoute = readRepoFile(
    "src/app/api/background/source-summaries/[id]/approve/route.ts",
  );
  const sourceSummaryConfirmTagsRoute = readRepoFile(
    "src/app/api/background/source-summaries/[id]/confirm-tags/route.ts",
  );
  const sourceConnectionApproveBg16AliasRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/approve/route.ts",
  );
  const sourceConnectionSummaryApproveAliasRoute = readRepoFile(
    "src/app/api/background/source-connections/[id]/summaries/[summaryId]/approve/route.ts",
  );
  const profileInterviewRoute = readRepoFile(
    "src/app/api/background/profile/interview/route.ts",
  );
  const wishInterviewSessionsRoute = readRepoFile(
    "src/app/api/background/wish-interview/sessions/route.ts",
  );
  const wishInterviewAnswerRoute = readRepoFile(
    "src/app/api/background/wish-interview/sessions/[id]/answer/route.ts",
  );
  const wishInterviewApplyRoute = readRepoFile(
    "src/app/api/background/wish-interview/sessions/[id]/apply/route.ts",
  );
  const profileSignalRecomputeRoute = readRepoFile(
    "src/app/api/background/profile-signals/recompute/route.ts",
  );
  const profileRecomputeBg16AliasRoute = readRepoFile(
    "src/app/api/background/profile/recompute/route.ts",
  );
  const introPacketsRoute = readRepoFile("src/app/api/background/intro-packets/route.ts");
  const introRequestsRoute = readRepoFile("src/app/api/background/intro-requests/route.ts");
  const introRequestAppealRoute = readRepoFile(
    "src/app/api/background/intro-requests/[id]/appeal/route.ts",
  );
  const introRequestContactRoute = readRepoFile(
    "src/app/api/background/intro-requests/[id]/approve-contact/route.ts",
  );
  const opportunityBriefsRoute = readRepoFile("src/app/api/background/opportunity-briefs/route.ts");
  const opportunityFeedbackRoute = readRepoFile(
    "src/app/api/background/opportunity-briefs/[id]/feedback/route.ts",
  );
  const opportunitiesAliasRoute = readRepoFile("src/app/api/background/opportunities/route.ts");
  const opportunityFeedbackAliasRoute = readRepoFile(
    "src/app/api/background/opportunities/[id]/feedback/route.ts",
  );
  const backgroundNetworkingSource = readRepoFile("src/lib/background-networking.ts");
  const backgroundSourceAssistSource = readRepoFile("src/lib/background-source-assist.ts");
  const backgroundWishInterviewSource = readRepoFile("src/lib/background-wish-interview.ts");
  const backgroundAiShadowSource = readRepoFile("src/lib/background-ai-shadow.ts");
  const backgroundCapabilityGateSource = readRepoFile("src/lib/background-capability-gates.ts");
  const backgroundRolloutSource = readRepoFile("src/lib/background-rollout.ts");
  const backgroundPrivateOverlapSource = readRepoFile("src/lib/background-private-overlap.ts");
  const backgroundRlsAuditSource = readRepoFile("src/lib/background-rls-audit.ts");
  const backgroundNotificationPolicySource = readRepoFile(
    "src/lib/background-notification-policy.ts",
  );
  const backgroundNotificationsSource = readRepoFile("src/lib/background-notifications.ts");
  const backgroundJobsSource = readRepoFile("src/lib/background-jobs.ts");
  const opportunityFeedbackSource = readRepoFile("src/lib/background-opportunity-feedback.ts");
  const introRequestsSource = readRepoFile("src/lib/background-intro-requests.ts");
  const apiRateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const backgroundNetworkingJobRoute = readRepoFile(
    "src/app/api/jobs/background-networking/route.ts",
  );
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const legacyActions = readRepoFile("src/app/actions.ts");
  const schemaSource = readRepoFile("supabase/schema.sql");
  const vercelConfig = readRepoFile("vercel.json");
  const envExample = readRepoFile(".env.example");
  const bg14RolloutDoc = readRepoFile("docs/moral-trade/background-networking-bg14-rollout.md");
  const migrationSource = readRepoFile(
    "supabase/migrations/20260531_background_source_connection_permissions.sql",
  );
  const sourceAssistMigrationSource = readRepoFile(
    "supabase/migrations/20260601_background_source_assisted_profile_signals.sql",
  );
  const introRequestMigrationSource = readRepoFile(
    "supabase/migrations/20260601_background_intro_request_workflow.sql",
  );
  const bg13MigrationSource = readRepoFile(
    "supabase/migrations/20260601_background_networking_bg13_operational_lanes.sql",
  );
  const bg14RolloutPlan = getBackgroundNetworkingRolloutPlan({});
  const bg14RolloutValidation = validateBackgroundNetworkingRolloutPlan(bg14RolloutPlan);

  assert.ok(BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.length >= 6);
  assert.deepEqual(BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS, [30, 90, 180, 365]);
  assert.equal(bg14RolloutValidation.status, "pass");
  assert.ok(bg14RolloutPlan.flags.every((flag) => flag.defaultEnabled === false));
  assert.ok(bg14RolloutPlan.flags.every((flag) => flag.enabled === false));
  assert.match(backgroundRolloutSource, /background_source_summary_enabled/);
  assert.match(backgroundRolloutSource, /background_wish_interview_enabled/);
  assert.match(backgroundRolloutSource, /background_opportunity_briefs_enabled/);
  assert.match(backgroundRolloutSource, /No autonomous outreach/);
  assert.match(backgroundRolloutSource, /No raw private-feed ingestion/);
  assert.match(backgroundRolloutSource, /Operator review is required before introduced-stage contact disclosure/);
  assert.match(envExample, /BACKGROUND_SOURCE_SUMMARY_ENABLED=false/);
  assert.match(envExample, /BACKGROUND_WISH_INTERVIEW_ENABLED=false/);
  assert.match(envExample, /BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED=false/);
  assert.match(bg14RolloutDoc, /BACKGROUND_NETWORKING_ROLLOUT_STAGE/);
  assert.match(bg14RolloutDoc, /zero unresolved privacy incidents/);
  assert.match(bg14RolloutDoc, /Rollback is per lane/);
  assert.match(dashboardPage, /saveBackgroundSourceConnectionAction/);
  assert.match(dashboardPage, /revokeBackgroundSourceConnectionAction/);
  assert.match(dashboardPage, /Bg14 rollout controls/);
  assert.match(dashboardPage, /backgroundRolloutPlan\.flags\.map/);
  assert.match(dashboardPage, /flag\.envKey/);
  assert.match(backgroundNetworkingPage, /Bg14 rollout/);
  assert.match(backgroundNetworkingPage, /backgroundRolloutValidation/);
  assert.match(backgroundNetworkingPage, /backgroundRolloutPlan\.flags/);
  assert.equal(dashboardPage.includes("saveSourceConnectionAction"), false);
  assert.match(dashboardPage, /BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS/);
  assert.match(dashboardPage, /name="allowed_field_keys"/);
  assert.match(dashboardPage, /name="retention_days"/);
  assert.match(dashboardPage, /name="ai_shadow_mode_allowed"/);
  assert.match(dashboardPage, /name="source_connection_id"/);
  assert.match(dashboardPage, /value="expired"/);
  assert.match(dashboardPage, /Revoke permission/);
  assert.match(dashboardPage, /stores your note with a retention timer/);
  assert.match(dashboardPage, /hasActiveProfileSourcePermission/);
  assert.match(dashboardPage, /formatBackgroundSourcePermissionFieldLabel/);
  assert.match(dashboardPage, /Contact approvals/);
  assert.match(dashboardPage, /Alerts are digest-first by default/);
  assert.match(dashboardPage, /No one is contacted on your behalf/);
  assert.match(dashboardPage, /Raw source content is not stored for matching/);
  assert.match(dashboardPage, /You review and approve a summary/);
  assert.match(dashboardPage, /queued background-networking emails/);
  assert.match(dashboardPage, /delivery \{brief\.deliveryState\}/);
  assert.match(dashboardPage, /brief\.reviewStatus\.replaceAll/);
  assert.match(dashboardPage, /brief\.actions\.includes\("request_more_detail"\)/);
  assert.match(dashboardPage, /Request more detail/);
  assert.match(dashboardPage, /Report privacy concern/);
  assert.match(dashboardPage, /already_connected/);
  assert.match(dashboardPage, /privacy_concern/);
  assert.match(dashboardPage, /Anonymous first question/);
  assert.match(backgroundActions, /validateBackgroundSourcePermission/);
  assert.match(backgroundActions, /getOpportunityBriefDeliveryStateForFeedback/);
  assert.match(backgroundActions, /delivery_state/);
  assert.match(backgroundActions, /firstQuestion/);
  assert.match(backgroundActions, /allowed_field_keys: permission\.allowedFieldKeys/);
  assert.match(backgroundActions, /retention_expires_at: permission\.retentionExpiresAt/);
  assert.match(backgroundActions, /retention_expires_at: sourceSummary\.retention_expires_at/);
  assert.match(backgroundActions, /raw_ingestion_allowed: permission\.rawIngestionAllowed/);
  assert.match(backgroundActions, /revokeBackgroundSourceConnectionAction/);
  assert.match(backgroundActions, /access_status: "revoked"/);
  assert.match(backgroundActions, /\.update\(payload, \{ count: "exact" \}\)/);
  assert.match(backgroundActions, /Source permission revoked for future matching/);
  assert.match(backgroundActions, /resolveBackgroundSourceSummaryFieldScope/);
  assert.match(backgroundActions, /validateBackgroundSourceSummaryRetentionScope/);
  assert.match(backgroundActions, /background-source-summary/);
  assert.match(backgroundActions, /background-intro-packet/);
  assert.match(backgroundActions, /\.eq\("profile_id", viewer\.authUser\.id\)/);
  assert.match(sourceSummariesRoute, /takeMoralTradeApiRateLimitSlot/);
  assert.match(sourceSummariesRoute, /background_source_summary_write/);
  assert.match(sourceSummariesRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(sourceSummariesRoute, /resolveBackgroundSourceSummaryFieldScope/);
  assert.match(sourceSummariesRoute, /validateBackgroundSourceSummaryRetentionScope/);
  assert.match(sourceSummariesRoute, /\.eq\("profile_id", user\.id\)/);
  assert.match(sourceSummariesRoute, /rawIngestionAllowed: false/);
  assert.match(sourceSummariesRoute, /serializeBackgroundNetworkingRolloutSurface/);
  assert.match(sourceSummariesRoute, /background_source_summary_enabled/);
  assert.match(sourceConnectionsRoute, /validateBackgroundSourcePermission/);
  assert.match(sourceConnectionsRoute, /raw_ingestion_allowed: false/);
  assert.match(sourceConnectionsRoute, /source_connection_recorded/);
  assert.match(sourceConnectionsRoute, /background_source_summary_enabled/);
  assert.match(sourceConnectionRevokeRoute, /source_connection_revoked/);
  assert.match(sourceConnectionRevokeRoute, /background_profile_signals/);
  assert.match(sourceConnectionDraftRoute, /buildReviewedSourceDraftSummary/);
  assert.match(sourceConnectionDraftRoute, /rawTextPersisted: false/);
  assert.match(sourceConnectionDraftRoute, /background_source_summary_enabled/);
  assert.match(sourceConnectionDraftRoute, /background_shadow_runs/);
  assert.match(sourceConnectionSummaryDraftBg16AliasRoute, /draft-summary\/route/);
  assert.match(sourceConnectionSummaryDraftAliasRoute, /draft-summary\/route/);
  assert.doesNotMatch(sourceSummaryApproveRoute, /buildBackgroundProfileSignalRows/);
  assert.match(sourceSummaryApproveRoute, /source_summary_approved_without_match_inputs/);
  assert.match(sourceSummaryConfirmTagsRoute, /buildBackgroundProfileSignalRows/);
  assert.match(sourceSummaryConfirmTagsRoute, /background\.source_summary\.confirm_tags/);
  assert.match(sourceSummaryConfirmTagsRoute, /privateThirdPartyDataReviewed/);
  assert.match(sourceSummaryApproveRoute, /background_source_summary_enabled/);
  assert.match(sourceConnectionApproveBg16AliasRoute, /summaryId/);
  assert.match(sourceConnectionApproveBg16AliasRoute, /shadowRunId/);
  assert.match(sourceConnectionApproveBg16AliasRoute, /summaries\/\[summaryId\]\/approve\/route/);
  assert.match(sourceConnectionSummaryApproveAliasRoute, /source_connection_id/);
  assert.match(sourceConnectionSummaryApproveAliasRoute, /requested source connection/);
  assert.match(sourceConnectionSummaryApproveAliasRoute, /source-summaries\/\[id\]\/approve\/route/);
  assert.match(profileInterviewRoute, /buildGuidedWishProfileDraft/);
  assert.match(profileInterviewRoute, /guidedWishProfileDraft/);
  assert.match(profileInterviewRoute, /shadow_first_user_approved_only/);
  assert.match(profileInterviewRoute, /background_wish_interview_enabled/);
  assert.match(wishInterviewSessionsRoute, /BACKGROUND_WISH_INTERVIEW_MODEL_NAME/);
  assert.match(wishInterviewSessionsRoute, /wish_interview_session_created/);
  assert.match(wishInterviewSessionsRoute, /rawTranscriptStored: false/);
  assert.match(wishInterviewAnswerRoute, /prepareRecordSensitiveTextFields/);
  assert.match(wishInterviewAnswerRoute, /answerTextStoredInSession: false/);
  assert.match(wishInterviewAnswerRoute, /wish_interview_answer_drafted/);
  assert.match(wishInterviewApplyRoute, /validateBackgroundWishInterviewApply/);
  assert.match(wishInterviewApplyRoute, /background_profile_signals/);
  assert.match(wishInterviewApplyRoute, /profileMutationApplied: false/);
  assert.match(wishInterviewApplyRoute, /wish_interview_structured_delta_applied/);
  assert.match(profileSignalRecomputeRoute, /profile_signals_recomputed/);
  assert.match(profileSignalRecomputeRoute, /background_profile_signals/);
  assert.match(profileSignalRecomputeRoute, /background_source_summary_enabled/);
  assert.match(profileRecomputeBg16AliasRoute, /profile-signals\/recompute\/route/);
  assert.match(introPacketsRoute, /takeMoralTradeApiRateLimitSlot/);
  assert.match(introPacketsRoute, /background_intro_packet_write/);
  assert.match(introPacketsRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(introPacketsRoute, /anonymous_question/);
  assert.match(introPacketsRoute, /outreachSent: false/);
  assert.match(introPacketsRoute, /background_opportunity_briefs_enabled/);
  assert.match(introRequestsRoute, /background_intro_packet_write/);
  assert.match(introRequestsRoute, /evaluateBackgroundIntroRequestCadence/);
  assert.match(introRequestsRoute, /intro_request_probe_pressure/);
  assert.match(introRequestsRoute, /anonymous_question/);
  assert.match(introRequestsRoute, /privateDetailsReturned: false/);
  assert.match(introRequestsRoute, /background_opportunity_briefs_enabled/);
  assert.match(introRequestAppealRoute, /validateBackgroundIntroAppealRequest/);
  assert.match(introRequestAppealRoute, /intro_request_appeal_requested/);
  assert.match(introRequestAppealRoute, /outreachSent: false/);
  assert.match(introRequestAppealRoute, /background_opportunity_briefs_enabled/);
  assert.match(introRequestContactRoute, /validateBackgroundContactApprovalStepUp/);
  assert.match(introRequestContactRoute, /isBackgroundIntroContactApprovalAllowed/);
  assert.match(introRequestContactRoute, /contactDetailsReturned: false/);
  assert.match(introRequestContactRoute, /background_opportunity_briefs_enabled/);
  assert.match(introRequestsSource, /BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT/);
  assert.match(introRequestsSource, /fresh one-hour session token window/);
  assert.match(opportunityBriefsRoute, /background_opportunity_brief_read/);
  assert.match(opportunityBriefsRoute, /serializeOpportunityBriefCard/);
  assert.match(opportunityBriefsRoute, /Exact wishes, private asks, source notes, constraints, and contact details/);
  assert.match(opportunityBriefsRoute, /background_opportunity_briefs_enabled/);
  assert.match(opportunityFeedbackRoute, /background_opportunity_feedback_write/);
  assert.match(opportunityFeedbackRoute, /isBackgroundOpportunityFeedbackPairAllowed/);
  assert.match(opportunityFeedbackRoute, /outreachSent: false/);
  assert.match(opportunityFeedbackRoute, /background_opportunity_briefs_enabled/);
  assert.match(opportunitiesAliasRoute, /opportunity-briefs\/route/);
  assert.match(opportunityFeedbackAliasRoute, /opportunity-briefs\/\[id\]\/feedback\/route/);
  assert.match(opportunityFeedbackSource, /BACKGROUND_OPPORTUNITY_FEEDBACK_REASONS/);
  assert.match(opportunityFeedbackSource, /maybe_later/);
  assert.match(opportunityFeedbackSource, /already_connected/);
  assert.match(opportunityFeedbackSource, /privacy_concern/);
  assert.match(opportunityFeedbackSource, /isBackgroundOpportunityFeedbackPairAllowed/);
  assert.match(backgroundNotificationPolicySource, /BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS/);
  assert.match(backgroundNotificationPolicySource, /dailyCap/);
  assert.match(backgroundNotificationPolicySource, /quietHoursStart/);
  assert.match(backgroundNotificationPolicySource, /sourceCooldownHours/);
  assert.match(backgroundNotificationsSource, /shouldSendBackgroundNotificationImmediately/);
  assert.match(backgroundNotificationsSource, /shouldQueueSafeWishNotificationEmail/);
  assert.match(backgroundNotificationsSource, /BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS\.has\(eventKind\)/);
  assert.match(backgroundNotificationsSource, /last_discovery_sent_at/);
  assert.match(backgroundNotificationsSource, /source_cooldown_hours/);
  assert.match(backgroundJobsSource, /expireBackgroundNetworkingSourceInfluence/);
  assert.match(backgroundJobsSource, /queueBackgroundOpportunityDigestEmails/);
  assert.match(backgroundJobsSource, /BACKGROUND_OPPORTUNITY_DIGEST_SOURCE_KIND/);
  assert.match(backgroundJobsSource, /exact wishes, private asks, contact details, source notes/);
  assert.match(backgroundNetworkingJobRoute, /isCronRequestAuthorized/);
  assert.match(backgroundNetworkingJobRoute, /runBackgroundNetworkingMaintenanceJob/);
  assert.match(backgroundNetworkingJobRoute, /rawPrivateTextProcessed: false/);
  assert.match(backgroundNetworkingJobRoute, /autonomousOutreachSent: false/);
  assert.match(vercelConfig, /\/api\/jobs\/background-networking/);
  assert.match(apiRateLimitSource, /background_source_summary_write: \{ limit: 12/);
  assert.match(apiRateLimitSource, /background_wish_interview_write: \{ limit: 20/);
  assert.match(apiRateLimitSource, /background_intro_packet_write: \{ limit: 12/);
  assert.match(apiRateLimitSource, /background_opportunity_brief_read: \{ limit: 60/);
  assert.match(apiRateLimitSource, /background_opportunity_feedback_write: \{ limit: 30/);
  assert.match(apiContractProfile, /background_source_summary_create/);
  assert.match(apiContractProfile, /background_wish_interview_session_create/);
  assert.match(apiContractProfile, /background_wish_interview_answer_create/);
  assert.match(apiContractProfile, /background_wish_interview_apply/);
  assert.match(apiContractProfile, /background_source_connection_create/);
  assert.match(apiContractProfile, /background_source_summary_draft/);
  assert.match(apiContractProfile, /background_source_summary_draft_bg16_alias/);
  assert.match(apiContractProfile, /background_source_connection_summary_draft_alias/);
  assert.match(apiContractProfile, /background_source_summary_approve/);
  assert.match(apiContractProfile, /background_source_connection_approve_bg16_alias/);
  assert.match(apiContractProfile, /background_source_connection_summary_approve_alias/);
  assert.match(apiContractProfile, /background_profile_signal_recompute/);
  assert.match(apiContractProfile, /background_profile_recompute_bg16_alias/);
  assert.match(apiContractProfile, /background_intro_packet_create/);
  assert.match(apiContractProfile, /background_intro_request_create/);
  assert.match(apiContractProfile, /background_intro_request_appeal/);
  assert.match(apiContractProfile, /background_intro_request_approve_contact/);
  assert.match(apiContractProfile, /background_opportunity_brief_list/);
  assert.match(apiContractProfile, /background_opportunity_list/);
  assert.match(apiContractProfile, /background_opportunity_feedback_create/);
  assert.match(apiContractProfile, /background_opportunity_feedback_create_alias/);
  assert.match(apiContractProfile, /moral_trade_private_overlap_contract/);
  assert.match(apiContractProfile, /private_overlap_contract_response/);
  assert.match(backgroundNetworkingSource, /hasActiveBackgroundSourcePermission/);
  assert.match(backgroundNetworkingSource, /hasActiveProfileSourcePermission/);
  assert.match(backgroundNetworkingSource, /hasActiveBackgroundProfileSignal/);
  assert.match(backgroundNetworkingSource, /profileSignals/);
  assert.match(backgroundNetworkingSource, /activeProfileSources/);
  assert.match(backgroundNetworkingSource, /activeSourceConnections/);
  assert.match(backgroundSourceAssistSource, /review_first_source_summary_no_raw_persistence/);
  assert.match(backgroundSourceAssistSource, /redactBackgroundSourceAssistRawText/);
  assert.match(backgroundSourceAssistSource, /removedEmails/);
  assert.match(backgroundWishInterviewSource, /contact_details/);
  assert.match(backgroundWishInterviewSource, /raw_profile_notes/);
  assert.match(backgroundWishInterviewSource, /raw_source_notes/);
  assert.match(backgroundWishInterviewSource, /answerTextStoredInSession: false/);
  assert.match(backgroundWishInterviewSource, /reviewed_\$\{answer\.fieldKey\}_provided/);
  assert.match(backgroundAiShadowSource, /getBackgroundAiShadowContract/);
  assert.match(backgroundAiShadowSource, /validateBackgroundAiShadowContract/);
  assert.match(backgroundAiShadowSource, /approved_summary_shadow_evaluation_only/);
  assert.match(backgroundAiShadowSource, /analytics_copy_of_raw_content/);
  assert.match(aiShadowContractRoute, /getBackgroundAiShadowContract/);
  assert.match(aiShadowContractRoute, /validateBackgroundAiShadowContract/);
  assert.match(aiShadowContractRoute, /sampleReadyEvaluation/);
  assert.match(aiShadowContractRoute, /sampleBlockedEvaluation/);
  assert.match(backgroundCapabilityGateSource, /getBackgroundCapabilityGateContract/);
  assert.match(backgroundCapabilityGateSource, /validateBackgroundCapabilityGateContract/);
  assert.match(backgroundCapabilityGateSource, /DPIA and documented privacy-design review/);
  assert.match(backgroundCapabilityGateSource, /privacy_preserving_overlap/);
  assert.match(backgroundCapabilityGateSource, /private_overlap_contract/);
  assert.match(backgroundCapabilityGateSource, /raw_private_feed_training/);
  assert.match(capabilityGateRoute, /getBackgroundCapabilityGateContract/);
  assert.match(capabilityGateRoute, /validateBackgroundCapabilityGateContract/);
  assert.match(capabilityGateRoute, /getBackgroundNetworkingRolloutPlan/);
  assert.match(capabilityGateRoute, /bg14Rollout/);
  assert.match(capabilityGateRoute, /expansionReady/);
  assert.match(backgroundPrivateOverlapSource, /governance_gated_pilot/);
  assert.match(backgroundPrivateOverlapSource, /formal cryptographic design review/);
  assert.match(backgroundPrivateOverlapSource, /free_text/);
  assert.match(backgroundPrivateOverlapSource, /raw_tag/);
  assert.match(backgroundPrivateOverlapSource, /deterministic broad-preview matching/);
  assert.match(privateOverlapContractRoute, /getBackgroundPrivateOverlapContract/);
  assert.match(privateOverlapContractRoute, /validateBackgroundPrivateOverlapContract/);
  assert.match(privateOverlapContractRoute, /Private overlap checks are governance-gated/);
  assert.match(backgroundRlsAuditSource, /validateBackgroundRlsAuditSchema/);
  assert.match(backgroundRlsAuditSource, /match_audit_events/);
  assert.match(backgroundRlsAuditSource, /background_match_feedback/);
  assert.match(backgroundRlsAuditSource, /sensitiveStorageRequirements/);
  assert.match(backgroundRlsAuditSource, /anonymous-policy-not-allowed/);
  assert.match(rlsAuditContractRoute, /getBackgroundRlsAuditContract/);
  assert.match(rlsAuditContractRoute, /validateBackgroundRlsAuditContract/);
  assert.match(rlsAuditContractRoute, /schemaAuditMode: "repository_test"/);
  assert.match(legacyActions, /validateBackgroundSourcePermission/);
  assert.match(legacyActions, /allowed_field_keys: permission\.allowedFieldKeys/);
  assert.match(legacyActions, /retention_expires_at: permission\.retentionExpiresAt/);
  assert.match(legacyActions, /getBackgroundSourceRetentionExpiresAt/);
  assert.match(legacyActions, /raw_ingestion_allowed: permission\.rawIngestionAllowed/);
  assert.match(schemaSource, /profile_sources_retention_expires_idx/);
  assert.match(schemaSource, /source_connections_allowed_field_keys_check/);
  assert.match(schemaSource, /source_connections_raw_ingestion_disabled_check/);
  assert.match(schemaSource, /source_connections_access_status_check/);
  assert.match(schemaSource, /email_outbox_source_dedupe_idx/);
  assert.match(schemaSource, /background_match_feedback/);
  assert.match(schemaSource, /background_opportunity_briefs_feedback_reason_check/);
  assert.match(schemaSource, /privacy_concern/);
  assert.match(schemaSource, /background_profile_signals/);
  assert.match(schemaSource, /background_shadow_runs/);
  assert.match(schemaSource, /background_intro_packets_appeal_status_check/);
  assert.match(schemaSource, /contact_approval_requires_fresh_mfa/);
  assert.match(schemaSource, /redaction_report/);
  assert.match(schemaSource, /source_cooldown_hours/);
  assert.match(schemaSource, /last_discovery_sent_at/);
  assert.match(migrationSource, /source_connections_allowed_field_keys_check/);
  assert.match(migrationSource, /source_connections_raw_ingestion_disabled_check/);
  assert.match(sourceAssistMigrationSource, /background_profile_signals/);
  assert.match(sourceAssistMigrationSource, /background_shadow_runs/);
  assert.match(introRequestMigrationSource, /background_intro_packets_appeal_status_check/);
  assert.match(introRequestMigrationSource, /background_intro_packets_contact_approval_status_check/);
  assert.match(bg13MigrationSource, /email_outbox_source_dedupe_idx/);
  assert.match(bg13MigrationSource, /privacy_concern/);
  assert.match(bg13MigrationSource, /expired/);
});

test("global loading stays silent while error states expose route-specific recovery", () => {
  const loadingPage = readRepoFile("src/app/loading.tsx");
  const errorPage = readRepoFile("src/app/error.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const performanceProfile = readRepoFile("config/moral-trade/performance-profile.json");

  assert.match(loadingPage, /return null/);
  assert.equal(loadingPage.includes("Preparing route"), false);
  assert.equal(loadingPage.includes("Preparing the requested view"), false);
  assert.equal(loadingPage.includes("<h1"), false);
  assert.equal(loadingPage.includes("Loading Moral Trade."), false);
  assert.match(errorPage, /Recoverable route error/);
  assert.match(errorPage, /This page did not finish rendering/);
  assert.match(errorPage, /No proposal status, match disclosure, or evidence decision is/);
  assert.match(errorPage, /\/moral-trade\/technical-spec/);
  assert.match(errorPage, /\/worked-examples/);
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
  assert.match(cohortPage, /Open worked examples/);
  assert.match(cohortPage, /Request concierge intro/);
  assert.match(cohortPage, /Open public-good flow/);
  assert.match(cohortPage, /Invite one serious counterparty/);
  assert.match(cohortPage, /Your referral link/);
  assert.match(cohortPage, /Founding progress/);
  assert.match(cohortPage, /Safety and privacy/);
  assert.match(cohortPage, /createNetworkInviteAction/);
  assert.match(cohortPage, /CANONICAL_WORKED_CASE_COUNT/);
  assert.match(signupPage, /AuthPage/);
  assert.match(signupPage, /initialMode="signup"/);
  assert.match(actionsSource, /return_to/);
  assert.match(actionsSource, /Choose one low-risk first action/);
  assert.equal(cohortPage.includes(">Start here<"), false);
});

test("growth activation surfaces persist attribution, onboarding, webinars, and cloning", () => {
  const growthSource = readRepoFile("src/lib/growth.ts");
  const migrationSource = readRepoFile("supabase/migrations/20260526_growth_activation.sql");
  const marketplaceMeasurementMigration = readRepoFile(
    "supabase/migrations/20260607_marketplace_measurement_events.sql",
  );
  const onboardingPage = readRepoFile("src/app/onboarding/page.tsx");
  const partnerPage = readRepoFile("src/app/cohort/[partnerSlug]/page.tsx");
  const adminGrowthPage = readRepoFile("src/app/admin/growth/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const apiSource = readRepoFile("src/app/api/funnel-events/route.ts");
  const privacyActions = readRepoFile("src/app/privacy/actions.ts");
  const supabaseProxy = readRepoFile("src/lib/supabase/proxy.ts");
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
  assert.match(growthSource, /marketplace_tab_viewed/);
  assert.match(growthSource, /marketplace_filter_applied/);
  assert.match(growthSource, /marketplace_seed_template_selected/);
  assert.match(growthSource, /marketplace_create_from_template_started/);
  assert.match(growthSource, /marketplace_intake_triage_routed/);
  assert.match(growthSource, /marketplace_public_receipt_previewed/);
  assert.match(growthSource, /marketplace_claim_correction_resolved/);
  assert.match(growthSource, /filterKeys/);
  assert.match(growthSource, /marketplaceTab/);
  assert.match(growthSource, /liveMetricEligible/);
  assert.match(growthSource, /metricValueBucket/);
  assert.match(growthSource, /PARTNER_COHORTS/);
  assert.match(growthSource, /sanitizeFunnelEventMetadata/);
  assert.match(growthSource, /sanitizeFunnelEventPath/);
  assert.match(growthSource, /buildPrivacySafeSearchMetadata/);
  assert.match(growthSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(growthSource, /ANALYTICS_OPT_OUT_COOKIE_NAME/);
  assert.match(growthSource, /isAnalyticsOptedOut/);
  assert.match(growthSource, /queryLengthBucket/);
  assert.match(migrationSource, /funnel_events/);
  assert.match(migrationSource, /cohort_attributions/);
  assert.match(migrationSource, /cohort_onboarding_profiles/);
  assert.match(migrationSource, /webinar_rsvps/);
  assert.match(migrationSource, /email_nurture_subscriptions/);
  assert.match(marketplaceMeasurementMigration, /performance_metric_recorded/);
  assert.match(marketplaceMeasurementMigration, /marketplace_tab_viewed/);
  assert.match(marketplaceMeasurementMigration, /marketplace_filter_applied/);
  assert.match(marketplaceMeasurementMigration, /marketplace_seed_template_selected/);
  assert.match(marketplaceMeasurementMigration, /marketplace_create_from_template_started/);
  assert.match(marketplaceMeasurementMigration, /marketplace_intake_triage_routed/);
  assert.match(marketplaceMeasurementMigration, /marketplace_public_receipt_revoked/);
  assert.match(marketplaceMeasurementMigration, /marketplace_claim_correction_requested/);
  assert.match(apiSource, /parseAttributionCookie/);
  assert.match(apiSource, /takeMoralTradeApiRateLimitSlot\(request, "analytics_ingest"\)/);
  assert.match(apiSource, /ANALYTICS_OPT_OUT_COOKIE_NAME/);
  assert.match(apiSource, /isAnalyticsOptedOut/);
  assert.match(apiSource, /status: 204/);
  assert.match(apiSource, /buildMoralTradeApiJsonResponse/);
  assert.match(apiSource, /MORAL_TRADE_API_CACHE_CONTROL_HEADERS\.no_store_dynamic/);
  assert.match(apiSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(privacyActions, /saveAnalyticsPreferenceAction/);
  assert.match(privacyActions, /ANALYTICS_OPT_OUT_COOKIE_NAME/);
  assert.match(privacyActions, /ATTRIBUTION_COOKIE_NAME/);
  assert.match(privacyActions, /maxAge: 0/);
  assert.match(supabaseProxy, /ANALYTICS_OPT_OUT_COOKIE_NAME/);
  assert.match(supabaseProxy, /isAnalyticsOptedOut/);
  assert.match(supabaseProxy, /maxAge: 0/);
  assert.match(actionsSource, /buildPrivacySafeFunnelEventRecord/);
  assert.match(actionsSource, /isAnalyticsOptedOut/);
  assert.match(funnelTracker, /useReportWebVitals/);
  assert.match(funnelTracker, /ANALYTICS_OPT_OUT_COOKIE_NAME/);
  assert.match(funnelTracker, /buildPrivacySafeSearchMetadata/);
  assert.match(funnelTracker, /path: window\.location\.pathname/);
  assert.doesNotMatch(funnelTracker, /window\.location\.search/);
  assert.doesNotMatch(funnelTracker, /searchParams\.toString\(\)/);
  assert.doesNotMatch(funnelTracker, /query:\s*searchParams\.get\("search"\)/);
  assert.match(funnelTracker, /performance_metric_recorded/);
  assert.match(funnelTracker, /marketplace_tab_viewed/);
  assert.match(funnelTracker, /marketplace_filter_applied/);
  assert.match(funnelTracker, /marketplace_seed_template_selected/);
  assert.match(funnelTracker, /marketplace_create_from_template_started/);
  assert.match(funnelTracker, /marketplace_intake_triage_routed/);
  assert.match(funnelTracker, /value === "public_goods"/);
  assert.match(funnelTracker, /value === "external_crecm"/);
  assert.match(funnelTracker, /return "public_goods"/);
  assert.match(funnelTracker, /dataset\.intakeRoute/);
  assert.doesNotMatch(funnelTracker, /window\.location\.search/);
  assert.match(funnelTracker, /metricValueBucket/);
  assert.match(funnelTracker, /CLS/);
  assert.match(funnelTracker, /INP/);
  assert.match(funnelTracker, /LCP/);
  assert.match(actionsSource, /saveOnboardingAction/);
  assert.match(actionsSource, /createWebinarRsvpAction/);
  assert.match(actionsSource, /referral_invite_drafted/);
  assert.match(onboardingPage, /Activation wizard/);
  assert.match(growthSource, /actionLabel: "Open worked examples"/);
  assert.match(growthSource, /actionLabel: "Create broad preview"/);
  assert.match(growthSource, /actionLabel: "Open public-good flow"/);
  assert.match(partnerPage, /generateStaticParams/);
  assert.match(partnerPage, /createWebinarRsvpAction/);
  assert.match(partnerPage, /action\.actionLabel/);
  assert.equal(partnerPage.includes(">Start here<"), false);
  assert.match(adminGrowthPage, /Growth dashboard/);
  assert.match(newOfferPage, /getWorkedExampleTemplate/);
  assert.match(newOfferPage, /Cloned from worked example/);
  assert.match(offerCreateForm, /initialTemplate/);
});

test("public measurement plan stays aligned with privacy-safe analytics", () => {
  const validation = validateMeasurementPlan();
  const marketplaceValidation = validateMarketplaceMeasurementContract();
  const measurementPage = readRepoFile("src/app/measurement/page.tsx");
  const marketplaceMeasurementSource = readRepoFile("src/lib/marketplace-measurement.ts");
  const publicReceiptCardsSource = readRepoFile("src/lib/moral-trade/public-receipt-cards.ts");
  const publicReceiptVerifyRoute = readRepoFile(
    "src/app/api/moral-trade/public-receipts/[receiptId]/verify/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const packageSource = readRepoFile("package.json");
  const routeBaselineScript = readRepoFile("scripts/check-public-route-baseline.mjs");

  assert.equal(marketplaceValidation.status, "pass");
  assert.deepEqual(marketplaceValidation.blockers, []);
  assert.ok(MARKETPLACE_KPI_KEYS.includes("live_offer_count"));
  assert.ok(MARKETPLACE_KPI_KEYS.includes("completed_agreement_count"));
  assert.ok(MARKETPLACE_KPI_KEYS.includes("privacy_leakage_incidents_target_zero"));
  assert.ok(MARKETPLACE_KPI_KEYS.includes("public_receipt_preview_count"));
  assert.ok(MARKETPLACE_KPI_KEYS.includes("claim_correction_resolution_count"));
  assert.ok(MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.includes("marketplace_tab_viewed"));
  assert.ok(MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.includes("marketplace_seed_template_selected"));
  assert.ok(MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.includes("marketplace_intake_triage_routed"));
  assert.ok(MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.includes("marketplace_public_receipt_published"));
  assert.deepEqual(validation.invalidEvents, []);
  assert.deepEqual(validation.duplicateEvents, []);
  assert.deepEqual(validation.sensitiveMetadata, []);
  assert.deepEqual(validation.duplicateBaselineRoutes, []);
  assert.deepEqual(validation.missingBaselineRoutes, []);
  assert.deepEqual(validation.missingBaselineChecks, []);
  assert.deepEqual(validation.invalidBaselineDevices, []);
  assert.deepEqual(validation.invalidBaselineBudgets, []);
  assert.deepEqual(validation.baselineCommandErrors, []);
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "hero_primary_cta_clicked"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "worked_example_opened"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "signup_complete"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "cohort_interest_started"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "detail_request_resolved"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "performance_metric_recorded"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "marketplace_tab_viewed"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "marketplace_filter_applied"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "marketplace_seed_template_selected"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "marketplace_intake_triage_routed"));
  assert.ok(MEASUREMENT_EVENT_SPECS.some((spec) => spec.eventType === "marketplace_public_receipt_revoked"));
  assert.match(MEASUREMENT_PERFORMANCE_BASELINE.command, /npm run measure:routes/);
  assert.equal(MEASUREMENT_PERFORMANCE_BASELINE.baseUrlEnv, "MORALTRADE_BASE_URL");
  assert.equal(MEASUREMENT_PERFORMANCE_BASELINE.outputPathEnv, "MORALTRADE_BASELINE_OUTPUT");
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.routes.some((route) => route.path === "/worked-examples"));
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.devices.some((device) => device.key === "mobile"));
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.requiredChecks.includes("no_framework_overlay"));
  assert.match(measurementPage, /Protocol-quality audits/);
  assert.match(measurementPage, /Marketplace KPIs/);
  assert.match(measurementPage, /Public marketplace metrics are thresholded/);
  assert.match(measurementPage, /getMarketplaceMeasurementContract/);
  assert.match(measurementPage, /buildMarketplaceKpiSnapshot/);
  assert.match(measurementPage, /validateMarketplaceKpiSnapshot/);
  assert.match(measurementPage, /live_offer_count/);
  assert.match(measurementPage, /public_receipt_preview_count/);
  assert.match(measurementPage, /claim_correction_resolution_count/);
  assert.match(measurementPage, /demo_data_live_mix_block_count/);
  assert.match(measurementPage, /Copilot and review metrics stay public/);
  assert.match(measurementPage, /getMoralTradeEvaluationProfile/);
  assert.match(measurementPage, /getMoralTradeEvaluationSampleAudits/);
  assert.match(measurementPage, /validateMoralTradeEvaluationProfile/);
  assert.match(measurementPage, /draft_completion_rate/);
  assert.match(measurementPage, /privacy_leakage_incidents/);
  assert.match(measurementPage, /subgroup_surfacing_parity/);
  assert.match(measurementPage, /human_overrule_rate/);
  assert.match(measurementPage, /\/api\/moral-trade\/evaluation\/health/);
  assert.match(measurementPage, /Executable baseline command/);
  assert.match(measurementPage, /MEASUREMENT_PERFORMANCE_BASELINE/);
  assert.match(marketplaceMeasurementSource, /MARKETPLACE_METRIC_MIN_PUBLIC_COUNT = 3/);
  assert.match(marketplaceMeasurementSource, /MARKETPLACE_KPI_KEYS/);
  assert.match(marketplaceMeasurementSource, /small-cell suppression/);
  assert.match(marketplaceMeasurementSource, /excludedNonLiveInputs/);
  assert.match(publicReceiptCardsSource, /PUBLIC_RECEIPT_CARD_POLICY_VERSION/);
  assert.match(publicReceiptCardsSource, /participant_opt_in_required/);
  assert.match(publicReceiptCardsSource, /direct_donation_parity_note_required/);
  assert.match(publicReceiptCardsSource, /gamification_or_ranking_claim/);
  assert.match(publicReceiptCardsSource, /sensitive_action_redaction_required/);
  assert.match(publicReceiptCardsSource, /trade_unlocked_requires_reviewed_causal_support/);
  assert.match(publicReceiptCardsSource, /unsupported_causal_wording/);
  assert.match(publicReceiptCardsSource, /personal_contribution_reuse_disclosure_required/);
  assert.match(publicReceiptCardsSource, /publication_as_trade_term_blocked/);
  assert.match(publicReceiptCardsSource, /public_engagement_counters_blocked/);
  assert.match(publicReceiptVerifyRoute, /takeMoralTradeApiRateLimitSlot\(request, "public_contract_read"\)/);
  assert.match(publicReceiptVerifyRoute, /contract_only_no_public_claim_loaded/);
  assert.match(publicReceiptVerifyRoute, /buildPublicReceiptCardPreview/);
  assert.match(publicReceiptVerifyRoute, /tradeConditionedWordingDefault/);
  assert.match(publicReceiptVerifyRoute, /publicationAffectsMatchingOrReview/);
  assert.match(healthRoute, /getMarketplaceMeasurementContract/);
  assert.match(healthRoute, /marketplaceMeasurementKpiKeys/);
  assert.match(healthRoute, /marketplaceMeasurementEventTypes/);
  assert.match(packageSource, /measure:routes/);
  assert.match(routeBaselineScript, /process\.env\[config\.baseUrlEnv\]/);
  assert.match(routeBaselineScript, /process\.env\[config\.outputPathEnv\]/);
  assert.match(routeBaselineScript, /no_framework_overlay/);
  assert.ok(
    MEASUREMENT_GUARDRAILS.some((guardrail) =>
      /not moral worth|not score users/i.test(`${guardrail.title} ${guardrail.rule}`),
    ),
  );
  assert.ok(
    MEASUREMENT_GUARDRAILS.some((guardrail) =>
      /Honor analytics objection|opt-out cookie/i.test(`${guardrail.title} ${guardrail.rule}`),
    ),
  );
  assert.ok(
    MEASUREMENT_ROADMAP.some((item) =>
      /Browser-level analytics objection|suppresses optional funnel-event inserts/i.test(
        `${item.title} ${item.detail}`,
      ),
    ),
  );
});

test("privacy and terms publish processor retention and data-request transparency", () => {
  const privacyPage = readRepoFile("src/app/privacy/page.tsx");
  const termsPage = readRepoFile("src/app/terms/page.tsx");
  const siteSearchSource = readRepoFile("src/lib/site-search.ts");

  assert.match(privacyPage, /Data, processors, and retention summary/);
  assert.match(privacyPage, /Account and profile data/);
  assert.match(privacyPage, /Private wish and source data/);
  assert.match(privacyPage, /Payment and donation references/);
  assert.match(privacyPage, /Analytics and attribution/);
  assert.match(privacyPage, /Notifications/);
  assert.match(privacyPage, /source cooldowns/);
  assert.match(privacyPage, /approved derived profile signals/);
  assert.match(privacyPage, /The source-summary lane is manual\/import first/);
  assert.match(privacyPage, /raw imported text is not copied into analytics/);
  assert.match(privacyPage, /Supabase for authentication and database storage/);
  assert.match(privacyPage, /Stripe for participant payment objects; Every\.org for off-site donation routes/);
  assert.match(privacyPage, /future analytics tools must follow the same redaction rules/);
  assert.match(privacyPage, /exact wishes, contact details, report bodies, and raw source notes are excluded/);
  assert.match(privacyPage, /BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS/);
  assert.match(privacyPage, /BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS/);
  assert.match(privacyPage, /separate source permission/);
  assert.match(privacyPage, /broad matching categories/);
  assert.match(privacyPage, /Optional AI shadow-mode review/);
  assert.match(privacyPage, /cannot change live matching, ranking, disclosure, or\s+outreach/);
  assert.match(privacyPage, /Live source connectors, AI assist mode, and private-overlap computation\s+require a DPIA/);
  assert.match(privacyPage, /lawful-basis record, privacy-design review, and external\s+security\/privacy review/);
  assert.match(privacyPage, /Private overlap checks are not live/);
  assert.match(privacyPage, /must not use free text/);
  assert.match(privacyPage, /must not reveal raw tags/);
  assert.match(privacyPage, /saveAnalyticsPreferenceAction/);
  assert.match(privacyPage, /Turn off optional analytics/);
  assert.match(privacyPage, /Allow minimal analytics/);
  assert.match(privacyPage, /prevents middleware from recreating it/);
  assert.match(privacyPage, /getMoralTradeDisclosureContract/);
  assert.match(privacyPage, /validateMoralTradeDisclosureContract/);
  assert.match(privacyPage, /Disclosure is stage-bound, field-bound, and non-mutating/);
  assert.match(privacyPage, /disclosureContract\.audienceStages/);
  assert.match(privacyPage, /disclosureContract\.accessLevels/);
  assert.match(privacyPage, /disclosureContract\.redactedFields/);
  assert.match(privacyPage, /disclosureContract\.searchPrivacyControls/);
  assert.match(privacyPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(privacyPage, /BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION/);
  assert.match(privacyPage, /BACKGROUND_SELF_SERVE_DELETION_SURFACES/);
  assert.match(privacyPage, /Self-serve background-networking deletion/);
  assert.match(privacyPage, /participant-facing matching records/);
  assert.match(privacyPage, /Opportunity brief alerts are dashboard-directed/);
  assert.match(privacyPage, /must not include counterparty contact details/);
  assert.match(privacyPage, /Open data request tools/);
  assert.match(privacyPage, /Contact privacy support/);
  assert.match(privacyPage, /correction, deletion, restriction, or processor clarification/);
  assert.match(termsPage, /Privacy, processors, and data requests/);
  assert.match(termsPage, /Some audit, payment, safety, or dispute records may need to/);
  assert.match(siteSearchSource, /Privacy practices/);
  assert.match(siteSearchSource, /cookies, analytics redaction, processors, retention/);
});

test("public SEO metadata includes FAQ and breadcrumb structured data", () => {
  const seoSource = readRepoFile("src/lib/seo.ts");
  const layoutSource = readRepoFile("src/app/layout.tsx");
  const homePage = readRepoFile("src/app/page.tsx");
  const faqPage = readRepoFile("src/app/faq/page.tsx");
  const methodologyPage = readRepoFile("src/app/methodology/page.tsx");
  const safetyPage = readRepoFile("src/app/safety/page.tsx");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(layoutSource, /"@type": "WebSite"/);
  assert.match(layoutSource, /"@type": "Organization"/);
  assert.match(layoutSource, /SearchAction/);
  assert.match(seoSource, /buildBreadcrumbJsonLd/);
  assert.match(seoSource, /"@type": "BreadcrumbList"/);
  assert.match(seoSource, /buildFaqPageJsonLd/);
  assert.match(seoSource, /"@type": "FAQPage"/);
  assert.match(seoSource, /acceptedAnswer/);
  assert.match(homePage, /Cooperate without agreeing/);
  assert.match(homePage, /Moral Trade: cooperate without agreeing/);
  assert.match(faqPage, /buildFaqPageJsonLd/);
  assert.match(faqPage, /buildBreadcrumbJsonLd/);
  assert.match(faqPage, /Breadcrumbs items/);
  assert.match(faqPage, /application\/ld\+json/);
  assert.match(methodologyPage, /methodologyDescription/);
  assert.match(methodologyPage, /openGraph/);
  assert.match(methodologyPage, /twitter/);
  assert.match(methodologyPage, /buildBreadcrumbJsonLd/);
  assert.match(methodologyPage, /Breadcrumbs items/);
  assert.match(methodologyPage, /getMoralTradeAiGovernanceProfile/);
  assert.match(methodologyPage, /validateMoralTradeAiGovernanceProfile/);
  assert.match(methodologyPage, /AI governance contract/);
  assert.match(methodologyPage, /No hidden ML matching or state changes/);
  assert.match(methodologyPage, /aiGovernanceProfile\.permittedAutomation/);
  assert.match(methodologyPage, /aiGovernanceProfile\.prohibitedUses/);
  assert.match(methodologyPage, /aiGovernanceProfile\.requiredDocumentationBeforeMl/);
  assert.match(methodologyPage, /fairnessDocumentation\.metrics/);
  assert.match(methodologyPage, /\/api\/moral-trade\/ai-governance\/health/);
  assert.match(methodologyPage, /Public validator evidence/);
  assert.match(methodologyPage, /\/moral-trade\/technical-spec/);
  assert.match(methodologyPage, /\/api\/moral-trade\/api-contract/);
  assert.match(safetyPage, /safetyDescription/);
  assert.match(safetyPage, /openGraph/);
  assert.match(safetyPage, /twitter/);
  assert.match(safetyPage, /buildBreadcrumbJsonLd/);
  assert.match(safetyPage, /Breadcrumbs items/);
  assert.match(safetyPage, /Safety contract evidence/);
  assert.match(safetyPage, /getMoralTradeSecurityProfile/);
  assert.match(safetyPage, /validateMoralTradeSecurityProfile/);
  assert.match(safetyPage, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(safetyPage, /Security posture contract/);
  assert.match(safetyPage, /Controls, scale gates, and non-claims are public/);
  assert.match(safetyPage, /Security scale gates/);
  assert.match(safetyPage, /Public security non-claims/);
  assert.match(safetyPage, /securityProfile\.controls/);
  assert.match(safetyPage, /securityProfile\.publicNonClaims/);
  assert.match(safetyPage, /getMoralTradeOperationsProfile/);
  assert.match(safetyPage, /validateMoralTradeOperationsProfile/);
  assert.match(safetyPage, /Operations contract/);
  assert.match(safetyPage, /Headers, sessions, retention, and fallback controls are inspectable/);
  assert.match(safetyPage, /operationsProfile\.securityHeaders/);
  assert.match(safetyPage, /operationsProfile\.privacyAndSessionControls/);
  assert.match(safetyPage, /operationsProfile\.observabilityMetrics/);
  assert.match(safetyPage, /operationsProfile\.rateLimitSurfaces/);
  assert.match(safetyPage, /operationsProfile\.retentionControls/);
  assert.match(safetyPage, /operationsProfile\.fallbackControls/);
  assert.match(safetyPage, /\/api\/moral-trade\/operations\/health/);
  assert.match(safetyPage, /\/api\/moral-trade\/security\/health/);
  assert.match(safetyPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(safetyPage, /\/api\/moral-trade\/incident-response\/health/);
  assert.match(sitemapSource, /\/faq/);
});

test("activation loop includes concierge intake, admin triage, SLA, and audit trail", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const adminPage = readRepoFile("src/app/admin/page.tsx");
  const adminAccessSource = readRepoFile("src/lib/admin.ts");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const schemaSource = readRepoFile("supabase/schema.sql");
  const migrationSource = readRepoFile(
    "supabase/migrations/20260524_match_concierge_activation.sql",
  );

  assert.match(backgroundPage, /id="concierge-intake"/);
  assert.match(backgroundPage, /createMatchConciergeRequestAction/);
  assert.match(backgroundPage, /name="no_trade_baseline"/);
  assert.match(registryPage, /Ask to explore/);
  assert.match(registryPage, /No trade occurs; both participants keep their current plans/);
  assert.match(dashboardPage, /Ask an operator to review an intro path/);
  assert.match(dashboardPage, /matchConciergeRequests/);
  assert.match(dashboardPage, /Consent Center/);
  assert.match(dashboardPage, /Revoke grant/);
  assert.match(dashboardPage, /No-trade baseline/);
  assert.match(dashboardPage, /Contact-email or contact-level grants/);
  assert.match(dashboardPage, /Previews show what a connection or reviewed summary may influence/);
  assert.match(dashboardPage, /raw summary stays\s+private and raw ingestion remains disabled/);
  assert.match(dashboardPage, /Grant receipts/);
  assert.match(adminPage, /Match concierge/);
  assert.match(adminPage, /Privacy and safety dashboard/);
  assert.match(adminPage, /No-trade baseline/);
  assert.match(adminPage, /updateMatchConciergeRequestAction/);
  assert.match(adminPage, /formatSlaState/);
  assert.match(adminPage, /match_concierge_events/);
  assert.match(adminPage, /evaluateAdminOperatorAccess/);
  assert.match(adminPage, /Authenticator MFA required/);
  assert.match(adminPage, /\/dashboard#account-security/);
  assert.match(adminAccessSource, /ADMIN_MFA_REQUIRED_MESSAGE/);
  assert.match(adminAccessSource, /mfa_step_up_required/);
  assert.match(actionsSource, /createMatchConciergeRequestAction/);
  assert.match(actionsSource, /updateMatchConciergeRequestAction/);
  assert.match(actionsSource, /evaluateAdminOperatorAccess/);
  assert.match(actionsSource, /request_created/);
  assert.match(actionsSource, /request_triaged/);
  assert.match(actionsSource, /no_trade_baseline/);
  assert.match(actionsSource, /requireContactDisclosureMfaStepUp/);
  assert.match(appDataSource, /listMatchConciergeRequestsForUser/);
  assert.match(schemaSource, /match_concierge_requests/);
  assert.match(schemaSource, /no_trade_baseline/);
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
  assert.match(actionsSource, /persistMoralTradeAgreementReviewProtocolProvenance/);
  assert.match(actionsSource, /getAgreementEvidencePersistenceShape/);
  assert.match(actionsSource, /persistMoralTradeEvidenceSubmission/);
  assert.match(actionsSource, /status: "pending_evidence"/);
  assert.match(actionsSource, /moraltrade:\/\/agreement-evidence\/\$\{evidenceItem\.id\}/);
  assert.match(actionsSource, /agreement:\$\{agreementId\}:evidence:\$\{evidenceItem\.id\}/);
  assert.match(actionsSource, /traceabilityLocationType: evidenceUrl \? "public_log" : "platform"/);
  assert.match(actionsSource, /Evidence was saved as pending, but review was not opened because the provenance bundle could not be recorded/);
  assert.match(actionsSource, /buildAgreementReviewDecisionRow/);
  assert.match(actionsSource, /buildAgreementReviewProvenanceRows/);
  assert.match(actionsSource, /evidenceReviewReadiness/);
  assert.match(actionsSource, /readBoolean\(formData, "claim_scope_aligned"\)/);
  assert.match(actionsSource, /Evidence readiness checks/);
  assert.match(actionsSource, /The review state transition is not allowed by the Moral Trade protocol/);
  assert.match(actionsSource, /Review status was not changed because the required protocol provenance record could not be written/);
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
  const sourcesPage = readRepoFile("src/app/sources/page.tsx");
  const measurementPage = readRepoFile("src/app/measurement/page.tsx");
  const transparencyPage = readRepoFile("src/app/transparency/page.tsx");
  const transparencyReportSource = readRepoFile("src/lib/moral-trade/transparency-report.ts");
  const transparencyReportRoute = readRepoFile(
    "src/app/api/moral-trade/transparency/report/route.ts",
  );
  const moralTradeHealthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const accessibilityPage = readRepoFile("src/app/accessibility/page.tsx");
  const measurementPlanSource = readRepoFile("src/lib/measurement-plan.ts");
  const updatesPage = readRepoFile("src/app/updates/page.tsx");
  const teamPage = readRepoFile("src/app/team/page.tsx");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");
  const siteSearchSource = readRepoFile("src/lib/site-search.ts");

  assert.match(primerPage, /What is moral trade/);
  assert.match(primerPage, /One-screen explainer/);
  assert.match(primerPage, /What it is/);
  assert.match(primerPage, /What it is not/);
  assert.match(primerPage, /Who it is for/);
  assert.match(primerPage, /Plain-English glossary/);
  assert.match(primerPage, /Pledge swap/);
  assert.match(primerPage, /Donation offset/);
  assert.match(primerPage, /Threshold/);
  assert.match(primerPage, /Manual review/);
  assert.match(primerPage, /Public good/);
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
  assert.match(researchPage, /\/transparency/);
  assert.match(trustPage, /What you can rely on today/);
  assert.match(trustPage, /No custody, escrow, tax, legal, investment, or payment-protection service/);
  assert.match(trustPage, /When something looks wrong/);
  assert.match(trustPage, /getMoralTradeChallengeAppealContract/);
  assert.match(trustPage, /getMoralTradeDisclosureContract/);
  assert.match(trustPage, /getMoralTradeExternalityProfile/);
  assert.match(trustPage, /getMoralTradeIncidentResponseProfile/);
  assert.match(trustPage, /Challenge reviewed evidence or baseline/);
  assert.match(trustPage, /Request disclosure review/);
  assert.match(trustPage, /Request externality remedy/);
  assert.match(trustPage, /Report safety or privacy incident/);
  assert.match(trustPage, /\/api\/moral-trade\/challenge-appeal\/contract/);
  assert.match(trustPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(trustPage, /\/api\/moral-trade\/externality\/health/);
  assert.match(trustPage, /\/api\/moral-trade\/incident-response\/health/);
  assert.match(contactPage, /Reach the pilot operators/);
  assert.match(statusPage, /What is real on Moral Trade today/);
  assert.match(statusPage, /Protocol health/);
  assert.match(statusPage, /Validator-backed surfaces you can audit now/);
  assert.match(statusPage, /validateMoralTradeProtocolProfile/);
  assert.match(statusPage, /validateMoralTradeDataModelProfile/);
  assert.match(statusPage, /validateMoralTradeProvenanceContract/);
  assert.match(statusPage, /validateMoralTradeReasoningPacketContract/);
  assert.match(statusPage, /auditMoralTradeApiImplementationContract/);
  assert.match(statusPage, /validateMoralTradeOperationsProfile/);
  assert.match(statusPage, /validateMoralTradeSecurityProfile/);
  assert.match(statusPage, /validateMoralTradeEvaluationProfile/);
  assert.match(statusPage, /validateMoralTradeAiGovernanceProfile/);
  assert.match(statusPage, /validateMoralTradeDisclosureContract/);
  assert.match(statusPage, /validateMoralTradeChallengeAppealContract/);
  assert.match(statusPage, /validateMoralTradeExternalityProfile/);
  assert.match(statusPage, /validateMoralTradeIncidentResponseProfile/);
  assert.match(statusPage, /validateMoralTradePerformanceProfile/);
  assert.match(statusPage, /auditMoralTradeRouteRecoveryManifest/);
  assert.match(statusPage, /validateMoralTradeTransparencyReportContract/);
  assert.match(statusPage, /\/api\/moral-trade\/health/);
  assert.match(statusPage, /\/api\/moral-trade\/provenance\/schema/);
  assert.match(statusPage, /\/api\/moral-trade\/reasoning\/packets/);
  assert.match(statusPage, /\/api\/moral-trade\/api-contract/);
  assert.match(statusPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(statusPage, /\/api\/moral-trade\/externality\/health/);
  assert.match(statusPage, /\/api\/moral-trade\/incident-response\/health/);
  assert.match(statusPage, /\/api\/moral-trade\/performance\/health/);
  assert.match(statusPage, /\/api\/moral-trade\/transparency\/report/);
  assert.match(statusPage, /Disclosure grants and appeals/);
  assert.match(statusPage, /Externality and remedy review/);
  assert.match(statusPage, /Incident response/);
  assert.match(statusPage, /Performance and route recovery/);
  assert.match(aboutPage, /What exists today, and what does not/);
  assert.match(howItWorksPage, /One reviewable commitment at a time/);
  assert.match(projectsPage, /What Moral Trade is actually doing/);
  assert.match(sourcesPage, /Reference points for the pilot/);
  assert.match(sourcesPage, /https:\/\/doi\.org\/10\.1086\/682187/);
  assert.match(sourcesPage, /Convergence and Compromise/);
  assert.match(sourcesPage, /Moral Public Goods/);
  assert.match(sourcesPage, /product-boundary notes/);
  assert.match(measurementPage, /Measure pilot clarity, not moral worth/);
  assert.match(measurementPage, /Protocol-quality audits/);
  assert.match(measurementPage, /Open evaluation JSON/);
  assert.match(measurementPage, /Lighthouse/);
  assert.match(measurementPage, /Search Console/);
  assert.match(transparencyPage, /Public counts without public case files/);
  assert.match(transparencyPage, /loadMoralTradeTransparencyReportSnapshot/);
  assert.match(transparencyPage, /small-sample suppression/);
  assert.match(transparencyPage, /opportunity briefs, closed-code match\s+feedback, intro packets, and match concierge requests/);
  assert.match(transparencyPage, /never publishes brief text, exact wishes, source\s+notes, contact details/);
  assert.match(transparencyPage, /\/api\/moral-trade\/transparency\/report/);
  assert.match(transparencyReportSource, /MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT = 3/);
  assert.match(transparencyReportSource, /reviewed_match_suggestions/);
  assert.match(transparencyReportSource, /declined_intro_requests/);
  assert.match(transparencyReportSource, /disclosure_grants_created/);
  assert.match(transparencyReportSource, /concierge_appeals_requested/);
  assert.match(transparencyReportSource, /median_concierge_review_hours/);
  assert.match(transparencyReportSource, /no ids, emails, names/);
  assert.match(transparencyReportSource, /small_sample_not_suppressed/);
  assert.match(transparencyReportRoute, /takeMoralTradeApiRateLimitSlot\(request, "public_contract_read"\)/);
  assert.match(transparencyReportRoute, /validateMoralTradeTransparencyReportSnapshot/);
  assert.match(moralTradeHealthRoute, /getMoralTradeTransparencyReportContract/);
  assert.match(moralTradeHealthRoute, /transparencyReportValidation/);
  assert.match(moralTradeHealthRoute, /transparencyReportMinimumPublicCount/);
  assert.match(updatesPage, /First aggregate transparency report route/);
  assert.match(siteSearchSource, /Transparency report/);
  assert.match(sitemapSource, /\/transparency/);
  assert.match(accessibilityPage, /Accessibility statement/);
  assert.match(accessibilityPage, /WCAG 2\.1 AA-oriented QA/);
  assert.match(accessibilityPage, /keyboard and screen-reader QA/);
  assert.match(accessibilityPage, /Authenticated background networking/);
  assert.match(accessibilityPage, /opportunity inbox, consent dialogs, source-summary review/);
  assert.match(accessibilityPage, /Report accessibility issue/);
  assert.match(accessibilityPage, /Known limitations/);
  assert.match(accessibilityPage, /buildBreadcrumbJsonLd/);
  assert.match(accessibilityPage, /application\/ld\+json/);
  assert.match(measurementPlanSource, /hero_primary_cta_clicked/);
  assert.match(measurementPlanSource, /signup_complete/);
  assert.match(measurementPlanSource, /performance_metric_recorded/);
  assert.match(measurementPlanSource, /Exact wishes, source notes, private constraints/);
  assert.match(updatesPage, /public archive for what changed/);
  assert.match(teamPage, /Who is publicly accountable for the pilot/);
  assert.match(sitemapSource, /\/what-is-moral-trade/);
  assert.match(sitemapSource, /\/moral-trade\/technical-spec/);
  assert.match(sitemapSource, /\/about/);
  assert.match(sitemapSource, /\/how-it-works/);
  assert.match(sitemapSource, /\/projects/);
  assert.match(sitemapSource, /\/worked-examples/);
  assert.match(sitemapSource, /\/anti-threat-rules/);
  assert.match(sitemapSource, /\/research/);
  assert.match(sitemapSource, /\/measurement/);
  assert.match(sitemapSource, /\/accessibility/);
  assert.match(sitemapSource, /\/sources/);
  assert.match(sitemapSource, /\/trust/);
  assert.match(sitemapSource, /\/contact/);
  assert.match(sitemapSource, /\/status/);
  assert.match(sitemapSource, /\/pilot-updates/);
  assert.match(sitemapSource, /\/team-and-governance/);
  assert.match(siteSearchSource, /Projects/);
  assert.match(siteSearchSource, /How it works/);
  assert.match(siteSearchSource, /Team and governance/);
  assert.match(siteSearchSource, /Pilot updates/);
  assert.match(siteSearchSource, /Primary references and product-boundary notes/);
  assert.match(siteSearchSource, /Privacy-safe event taxonomy/);
  assert.match(siteSearchSource, /Accessibility statement/);
  assert.match(siteSearchSource, /keyboard and screen-reader checks/);
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
  assert.match(exportRoute, /takeMoralTradeApiRateLimitSlot\(request, "profile_portability"\)/);
  assert.match(exportRoute, /buildMoralTradeApiRateLimitBlocker\(rateLimit\.surface\)/);
  assert.match(exportRoute, /"Retry-After"/);
  assert.match(exportRoute, /"Cache-Control": "private, no-store"/);
  assert.match(importRoute, /buildDeterministicSynthesis/);
  assert.match(importRoute, /takeMoralTradeApiRateLimitSlot\(request, "profile_portability"\)/);
  assert.match(importRoute, /buildMoralTradeApiRateLimitBlocker\(rateLimit\.surface\)/);
  assert.match(importRoute, /"Retry-After"/);
  assert.match(importRoute, /"Cache-Control": "private, no-store"/);
  assert.ok(
    importRoute.indexOf('takeMoralTradeApiRateLimitSlot(request, "profile_portability")') <
      importRoute.indexOf("request.json()"),
  );
});

test("public contract APIs enforce the documented public contract read throttle", () => {
  const apiRateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const wishRegistrySearchRoute = readRepoFile("src/app/api/wish-registry/search/route.ts");
  const funnelEventsRoute = readRepoFile("src/app/api/funnel-events/route.ts");
  const publicContractReadRoutes = [
    { path: "src/app/api/moral-trade/health/route.ts", cacheControl: "no_store_dynamic" },
    { path: "src/app/api/moral-trade/api-contract/route.ts", cacheControl: "no_store_dynamic" },
    {
      path: "src/app/api/moral-trade/data-model/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/policy-bundle/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/provenance/schema/route.ts",
      cacheControl: "no_store_dynamic",
    },
    { path: "src/app/api/moral-trade/schemas/route.ts", cacheControl: "no_store_dynamic" },
    {
      path: "src/app/api/moral-trade/copilot/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/match-signal/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/challenge-appeal/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/disclosure/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/review-workflow/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/reasoning/packets/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/operations/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/security/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/incident-response/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/evaluation/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/performance/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/externality/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/ai-governance/health/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/ai-shadow/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/background-capability-gates/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/private-overlap/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/background-rls-audit/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/transparency/report/route.ts",
      cacheControl: "no_store_dynamic",
    },
    {
      path: "src/app/api/moral-trade/cause-bucket-taxonomy/contract/route.ts",
      cacheControl: "no_store_dynamic",
    },
    { path: "src/app/api/profile/schema/route.ts", cacheControl: "public_contract_static" },
  ];

  assert.match(
    apiRateLimitSource,
    /public_contract_read: \{ limit: 240, windowMs: 60_000 \}/,
  );
  assert.match(apiRateLimitSource, /MORAL_TRADE_API_CACHE_CONTROL_HEADERS/);
  assert.match(apiRateLimitSource, /no_store_dynamic: "no-store"/);
  assert.match(apiRateLimitSource, /private_no_store: "private, no-store"/);
  assert.match(
    apiRateLimitSource,
    /public_contract_static: "public, max-age=300, stale-while-revalidate=3600"/,
  );
  assert.match(apiRateLimitSource, /wish_registry_search: \{ limit: 60, windowMs: 60_000 \}/);
  assert.match(apiRateLimitSource, /analytics_ingest: \{ limit: 120, windowMs: 60_000 \}/);
  assert.match(apiRateLimitSource, /headers\.set\("Cache-Control"/);
  assert.match(apiRateLimitSource, /buildMoralTradeApiRateLimitResponse/);
  assert.match(apiRateLimitSource, /buildMoralTradeApiRateLimitBlocker\(rateLimit\.surface\)/);
  assert.match(apiRateLimitSource, /"Retry-After"/);
  assert.match(apiRateLimitSource, /"Cache-Control": cacheControl/);

  for (const route of publicContractReadRoutes) {
    const routeSource = readRepoFile(route.path);

    assert.match(routeSource, /export async function GET\(request: Request\)/, route.path);
    assert.match(
      routeSource,
      /takeMoralTradeApiRateLimitSlot\(request, "public_contract_read"\)/,
      route.path,
    );
    assert.match(routeSource, /buildMoralTradeApiRateLimitResponse\(/, route.path);
    assert.match(routeSource, /return buildMoralTradeApiJsonResponse\(/, route.path);
    if (route.cacheControl === "public_contract_static") {
      assert.match(routeSource, /"public_contract_static"/, route.path);
    }
    assert.ok(
      routeSource.indexOf('takeMoralTradeApiRateLimitSlot(request, "public_contract_read")') <
        routeSource.indexOf("return buildMoralTradeApiJsonResponse"),
      route.path,
    );
  }

  assert.match(
    wishRegistrySearchRoute,
    /takeMoralTradeApiRateLimitSlot\(request, "wish_registry_search"\)/,
  );
  assert.match(wishRegistrySearchRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(wishRegistrySearchRoute, /toPublicWishRegistrySearchResult/);
  assert.match(wishRegistrySearchRoute, /"Retry-After": String\(rateLimit\.retryAfterSeconds\)/);
  assert.equal(wishRegistrySearchRoute.includes("wish-registry-search"), false);
  assert.match(
    funnelEventsRoute,
    /takeMoralTradeApiRateLimitSlot\(request, "analytics_ingest"\)/,
  );
  assert.match(funnelEventsRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(funnelEventsRoute, /MORAL_TRADE_API_CACHE_CONTROL_HEADERS\.no_store_dynamic/);
  assert.match(funnelEventsRoute, /"Retry-After": String\(rateLimit\.retryAfterSeconds\)/);
  assert.ok(
    funnelEventsRoute.indexOf('takeMoralTradeApiRateLimitSlot(request, "analytics_ingest")') <
      funnelEventsRoute.indexOf("request.json()"),
  );
  assert.equal(funnelEventsRoute.includes("analytics-ingest"), false);
});

test("public guidance describes verification pipelines without custody overclaims", () => {
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const mpfgPage = readRepoFile("src/app/mpgf/page.tsx");
  const priorityFundPage = readRepoFile("src/app/priority-correction-fund/page.tsx");
  const joinedSources = [donationOffsetsPage, mpfgPage, priorityFundPage].join("\n");

  assert.match(donationOffsetsPage, /Perverse-incentive screening/);
  assert.match(donationOffsetsPage, /No custody \/ no escrow \/ no tax advice/);
  assert.match(mpfgPage, /Contribution intents start with identity and conditional authorization/);
  assert.match(mpfgPage, /Coordinate around moral public goods/);
  assert.match(mpfgPage, /title="Common Ground Budget"/);
  assert.match(mpfgPage, /Preview a Common Ground Budget/);
  assert.match(mpfgPage, /View current round/);
  assert.match(mpfgPage, /Learn how it works \/ View audit and rules/);
  assert.match(mpfgPage, /Common Ground Budget status strip/);
  assert.match(mpfgPage, /No charge now/);
  assert.match(mpfgPage, /JIT after gates/);
  assert.match(mpfgPage, /Sealed before close/);
  assert.match(mpfgPage, /Audit and advanced details/);
  assert.match(mpfgPage, /buildMpgfPublicGoodsEcmRulebookReport/);
  assert.match(mpfgPage, /Rulebook hash/);
  assert.match(mpfgPage, /Calculation version/);
  assert.match(mpfgPage, /Mechanism label/);
  assert.match(mpfgPage, /New mechanism/);
  assert.match(mpfgPage, /rulebookReport\.mechanism\.fullTechnicalLabel/);
  assert.match(mpfgPage, /Legacy\/demo label/);
  assert.match(mpfgPage, /legacyMechanismLabelBadge/);
  assert.match(mpfgPage, /rulebookReport\.mechanism\.legacyMechanismLabel/);
  assert.match(mpfgPage, /Source rulebook/);
  assert.match(mpfgPage, /Sponsor pools/);
  assert.match(mpfgPage, /Proof path/);
  assert.match(mpfgPage, /Candidate pools/);
  assert.match(mpfgPage, /Technical spec/);
  assert.match(mpfgPage, /Choose your maximum/);
  assert.match(mpfgPage, /Pick projects/);
  assert.match(mpfgPage, /Review and save/);
  assert.match(mpfgPage, /Round clears after gates/);
  assert.match(mpfgPage, /Trust and review/);
  assert.match(mpfgPage, /no-escrow-unless-true/);
  assert.equal(
    mpfgPage.includes(
      "It might not be necessary for everyone to have the same values, or agree on philosophical questions, to get a future which most views think is pretty great.",
    ),
    true,
  );
  assert.equal(
    mpfgPage.includes(
      "By coordinating to fund moral public goods, we could still get a mostly-great future even if people only broadly agree on what's valuable and even if most people are mostly self-interested.",
    ),
    true,
  );
  assert.equal(
    mpfgPage.includes(
      "With this coordination mechanism, it's in people's best self-interest to fund moral public goods.",
    ),
    true,
  );
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
  const releaseGateSource = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const participantConfirmationSource = readRepoFile(
    "src/lib/moral-trade/participant-confirmations.ts",
  );
  const participantEligibilitySource = readRepoFile(
    "src/lib/moral-trade/participant-eligibility.ts",
  );
  const accountSecuritySource = readRepoFile(
    "src/lib/moral-trade/account-security.ts",
  );
  const reviewerQualitySource = readRepoFile(
    "src/lib/moral-trade/reviewer-quality.ts",
  );
  const antiEnumerationSource = readRepoFile(
    "src/lib/moral-trade/anti-enumeration.ts",
  );
  const privacyGovernanceSource = readRepoFile(
    "src/lib/moral-trade/privacy-governance.ts",
  );
  const impactClaimSource = readRepoFile(
    "src/lib/moral-trade/impact-claims.ts",
  );
  const matchingClearingSource = readRepoFile(
    "src/lib/moral-trade/matching-clearing.ts",
  );
  const baselineIntegritySource = readRepoFile(
    "src/lib/moral-trade/baseline-integrity.ts",
  );
  const agreementAmendmentSource = readRepoFile(
    "src/lib/moral-trade/agreement-amendments.ts",
  );
  const productionReadinessSource = readRepoFile(
    "src/lib/moral-trade/production-readiness.ts",
  );
  const recipientDestinationSource = readRepoFile(
    "src/lib/moral-trade/recipient-destination.ts",
  );
  const recipientAcceptanceSource = readRepoFile(
    "src/lib/moral-trade/recipient-acceptance.ts",
  );
  const aiPreferenceElicitationSource = readRepoFile(
    "src/lib/moral-trade/ai-preference-elicitation.ts",
  );
  const postClearAuditSource = readRepoFile(
    "src/lib/moral-trade/post-clear-audit.ts",
  );
  const nonPublicGoodsSubsidySource = readRepoFile(
    "src/lib/moral-trade/non-public-goods-subsidies.ts",
  );
  const directPairClearingSource = readRepoFile(
    "src/lib/moral-trade/direct-pair-clearing.ts",
  );
  const causeBucketTaxonomySource = readRepoFile(
    "src/lib/moral-trade/cause-bucket-taxonomy.ts",
  );
  const resourceCompatibilitySource = readRepoFile(
    "src/lib/moral-trade/resource-compatibility.ts",
  );
  const netOffsetAccountingSource = readRepoFile(
    "src/lib/moral-trade/net-offset-accounting.ts",
  );
  const offerValiditySource = readRepoFile(
    "src/lib/moral-trade/offer-validity.ts",
  );
  const privateExchangeRateSource = readRepoFile(
    "src/lib/moral-trade/private-exchange-rate.ts",
  );
  const noncompensableBlockerSource = readRepoFile(
    "src/lib/moral-trade/noncompensable-blockers.ts",
  );
  const batchClearingObjectiveSource = readRepoFile(
    "src/lib/moral-trade/batch-clearing-objective.ts",
  );
  const sensitiveEvidenceAttestationSource = readRepoFile(
    "src/lib/moral-trade/sensitive-evidence-attestations.ts",
  );
  const pilotEvidenceSource = readRepoFile(
    "src/lib/moral-trade/pilot-evidence.ts",
  );
  const sideAgreementSource = readRepoFile("src/lib/moral-trade/side-agreements.ts");
  const tradeClassificationSource = readRepoFile(
    "src/lib/moral-trade/trade-classification.ts",
  );
  const templateConformanceSource = readRepoFile(
    "src/lib/moral-trade/template-conformance.ts",
  );
  const reviewCapacitySource = readRepoFile(
    "src/lib/moral-trade/review-capacity.ts",
  );
  const participantTermSheetSource = readRepoFile(
    "src/lib/moral-trade/participant-term-sheet.ts",
  );
  const protectiveAssessmentSource = readRepoFile(
    "src/lib/moral-trade/protective-assessments.ts",
  );
  const userSafetyContentModerationSource = readRepoFile(
    "src/lib/moral-trade/user-safety-content-moderation.ts",
  );
  const financialSettlementControlsSource = readRepoFile(
    "src/lib/moral-trade/financial-settlement-controls.ts",
  );
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const offerWritePathSource = readRepoFile("src/lib/moral-trade/offer-write-path.ts");
  const agreementWritePathSource = readRepoFile("src/lib/moral-trade/agreement-write-path.ts");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const adminSource = readRepoFile("src/lib/admin.ts");
  const adminPageSource = readRepoFile("src/app/admin/page.tsx");
  const adminGrowthPageSource = readRepoFile("src/app/admin/growth/page.tsx");
  const backgroundActionsSource = readRepoFile("src/app/background-networking/actions.ts");
  const backgroundAccountSecuritySource = readRepoFile("src/lib/background-account-security.ts");
  const backgroundAccountSecurityPanelSource = readRepoFile(
    "src/components/dashboard/background-account-security-panel.tsx",
  );
  const mpgfAdminActionsSource = readRepoFile("src/app/mpgf/admin/actions.ts");
  const mpgfAdminPageSource = readRepoFile("src/app/mpgf/admin/page.tsx");
  const copilotSource = readRepoFile("src/lib/moral-trade/copilot.ts");
  const copilotContract = readRepoFile("config/moral-trade/copilot-contract.json");
  const backgroundExplanationsSource = readRepoFile("src/lib/background-explanations.ts");
  const matchSignalSource = readRepoFile("src/lib/moral-trade/match-signal.ts");
  const challengeAppealSource = readRepoFile("src/lib/moral-trade/challenge-appeal.ts");
  const disclosureSource = readRepoFile("src/lib/moral-trade/disclosure.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const operationsProfileSchema = readRepoFile("config/moral-trade/operations-profile.schema.json");
  const securitySource = readRepoFile("src/lib/moral-trade/security.ts");
  const securityProfile = readRepoFile("config/moral-trade/security-profile.json");
  const incidentResponseSource = readRepoFile("src/lib/moral-trade/incident-response.ts");
  const incidentResponseProfile = readRepoFile("config/moral-trade/incident-response-profile.json");
  const evaluationSource = readRepoFile("src/lib/moral-trade/evaluation.ts");
  const evaluationProfile = readRepoFile("config/moral-trade/evaluation-profile.json");
  const performanceSource = readRepoFile("src/lib/moral-trade/performance.ts");
  const performanceProfile = readRepoFile("config/moral-trade/performance-profile.json");
  const externalitySource = readRepoFile("src/lib/moral-trade/externality.ts");
  const externalityProfile = readRepoFile("config/moral-trade/externality-profile.json");
  const aiGovernanceSource = readRepoFile("src/lib/moral-trade/ai-governance.ts");
  const aiGovernanceProfile = readRepoFile("config/moral-trade/ai-governance-profile.json");
  const schemaRegistrySource = readRepoFile("src/lib/moral-trade/schema-registry.ts");
  const dataModelProfileSchema = readRepoFile("config/moral-trade/data-model-profile.schema.json");
  const publicOfferListingSchema = readRepoFile(
    "config/moral-trade/public-offer-listing.schema.json",
  );
  const publicOffersSource = readRepoFile("src/lib/public-offers.ts");
  const offerFollowSource = readRepoFile("src/lib/offer-follows.ts");
  const offerCreateSimilarSource = readRepoFile("src/lib/offer-create-similar.ts");
  const offerSavedSearchSource = readRepoFile("src/lib/offer-saved-searches.ts");
  const offerSavedSearchMigration = readRepoFile(
    "supabase/migrations/20260529_offer_saved_search_capture.sql",
  );
  const provenancePersistenceMigration = readRepoFile(
    "supabase/migrations/20260529_moral_trade_provenance_persistence.sql",
  );
  const reviewDecisionIdempotencyMigration = readRepoFile(
    "supabase/migrations/20260529_moral_trade_review_decision_idempotency.sql",
  );
  const productionReadinessMigration = readRepoFile(
    "supabase/migrations/20260607_zzz_moral_trade_production_readiness_records.sql",
  );
  const participantEligibilityMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzz_moral_trade_participant_eligibility_records.sql",
  );
  const accountSecurityMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzz_moral_trade_account_security_policy_events.sql",
  );
  const reviewerQualityMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzz_moral_trade_reviewer_quality_records.sql",
  );
  const antiEnumerationMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzz_moral_trade_anti_enumeration_records.sql",
  );
  const privacyGovernanceMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzz_moral_trade_privacy_governance_records.sql",
  );
  const impactClaimMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzz_moral_trade_impact_claim_records.sql",
  );
  const matchingClearingMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzz_moral_trade_matching_clearing_records.sql",
  );
  const baselineIntegrityMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzz_moral_trade_baseline_integrity_records.sql",
  );
  const agreementAmendmentMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzzz_moral_trade_agreement_amendment_records.sql",
  );
  const appealCaseMigration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzzzz_moral_trade_appeal_case_records.sql",
  );
  const recipientDestinationMigration = readRepoFile(
    "supabase/migrations/20260607_zzzz_moral_trade_recipient_destination_records.sql",
  );
  const recipientAcceptanceMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_recipient_acceptance_records.sql",
  );
  const aiPreferenceElicitationMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_ai_preference_elicitation_records.sql",
  );
  const postClearAuditMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_post_clear_audit_records.sql",
  );
  const nonPublicGoodsSubsidyMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_non_public_goods_subsidy_records.sql",
  );
  const directPairClearingMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_direct_pair_clearing_records.sql",
  );
  const causeBucketTaxonomyMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_cause_bucket_taxonomy_records.sql",
  );
  const resourceCompatibilityMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_resource_compatibility_records.sql",
  );
  const netOffsetAccountingMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_net_offset_accounting_records.sql",
  );
  const offerValidityMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_offer_validity_records.sql",
  );
  const privateExchangeRateMigration = readRepoFile(
    "supabase/migrations/20260612_moral_trade_private_exchange_rate_quote_records.sql",
  );
  const noncompensableBlockerMigration = readRepoFile(
    "supabase/migrations/20260612_z_moral_trade_noncompensable_blocker_assessments.sql",
  );
  const batchClearingObjectiveMigration = readRepoFile(
    "supabase/migrations/20260612_zz_moral_trade_batch_clearing_objective_records.sql",
  );
  const sensitiveEvidenceAttestationMigration = readRepoFile(
    "supabase/migrations/20260612_zzz_moral_trade_sensitive_evidence_attestations.sql",
  );
  const pilotEvidenceMigration = readRepoFile(
    "supabase/migrations/20260612_zzzz_moral_trade_pilot_evidence_gates.sql",
  );
  const sideAgreementMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_side_agreement_disclosures.sql",
  );
  const tradeClassificationMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_trade_classification_records.sql",
  );
  const templateConformanceMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_template_conformance_records.sql",
  );
  const reviewCapacityMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_review_capacity_records.sql",
  );
  const participantTermSheetMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_participant_term_sheet_records.sql",
  );
  const protectiveAssessmentMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_protective_assessments.sql",
  );
  const userSafetyContentModerationMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_user_safety_content_moderation.sql",
  );
  const financialSettlementControlsMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_financial_settlement_controls.sql",
  );
  const schemaSource = readRepoFile("supabase/schema.sql");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const privateOverlapSource = readRepoFile("src/lib/background-private-overlap.ts");
  const documentCoverageSource = readRepoFile("src/lib/moral-trade/document-coverage.ts");
  const moralTradeBuildInstruction = readRepoFile(
    "docs/moral-trade/codex-build-instruction.md",
  );
  const provenanceSource = readRepoFile("src/lib/moral-trade/provenance.ts");
  const reasoningPacketSource = readRepoFile("src/lib/moral-trade/reasoning-packets.ts");
  const dataModelProfile = readRepoFile("config/moral-trade/data-model-profile.json");
  const protocolProfile = readRepoFile("config/moral-trade/protocol-profile.json");
  const backgroundNetworkingPage = readRepoFile("src/app/background-networking/page.tsx");
  const dashboardPage = readRepoFile("src/app/dashboard/page.tsx");
  const technicalSpecPage = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const dataModelContractRoute = readRepoFile(
    "src/app/api/moral-trade/data-model/contract/route.ts",
  );
  const policyBundleContractRoute = readRepoFile(
    "src/app/api/moral-trade/policy-bundle/contract/route.ts",
  );
  const releaseGateContractRoute = readRepoFile(
    "src/app/api/moral-trade/release-gates/contract/route.ts",
  );
  const participantConfirmationContractRoute = readRepoFile(
    "src/app/api/moral-trade/participant-confirmations/contract/route.ts",
  );
  const participantEligibilityContractRoute = readRepoFile(
    "src/app/api/moral-trade/participant-eligibility/contract/route.ts",
  );
  const accountSecurityContractRoute = readRepoFile(
    "src/app/api/moral-trade/account-security/contract/route.ts",
  );
  const reviewerQualityContractRoute = readRepoFile(
    "src/app/api/moral-trade/reviewer-quality/contract/route.ts",
  );
  const antiEnumerationContractRoute = readRepoFile(
    "src/app/api/moral-trade/anti-enumeration/contract/route.ts",
  );
  const privacyGovernanceContractRoute = readRepoFile(
    "src/app/api/moral-trade/privacy-governance/contract/route.ts",
  );
  const impactClaimContractRoute = readRepoFile(
    "src/app/api/moral-trade/impact-claims/contract/route.ts",
  );
  const matchingClearingContractRoute = readRepoFile(
    "src/app/api/moral-trade/matching-clearing/contract/route.ts",
  );
  const baselineIntegrityContractRoute = readRepoFile(
    "src/app/api/moral-trade/baseline-integrity/contract/route.ts",
  );
  const agreementAmendmentContractRoute = readRepoFile(
    "src/app/api/moral-trade/agreement-amendments/contract/route.ts",
  );
  const productionReadinessContractRoute = readRepoFile(
    "src/app/api/moral-trade/production-readiness/contract/route.ts",
  );
  const recipientDestinationContractRoute = readRepoFile(
    "src/app/api/moral-trade/recipient-destinations/contract/route.ts",
  );
  const recipientAcceptanceContractRoute = readRepoFile(
    "src/app/api/moral-trade/recipient-acceptance/contract/route.ts",
  );
  const aiPreferenceElicitationContractRoute = readRepoFile(
    "src/app/api/moral-trade/ai-preference-elicitation/contract/route.ts",
  );
  const postClearAuditContractRoute = readRepoFile(
    "src/app/api/moral-trade/post-clear-audit/contract/route.ts",
  );
  const nonPublicGoodsSubsidyContractRoute = readRepoFile(
    "src/app/api/moral-trade/non-public-goods-subsidies/contract/route.ts",
  );
  const directPairClearingContractRoute = readRepoFile(
    "src/app/api/moral-trade/direct-pair-clearing/contract/route.ts",
  );
  const causeBucketTaxonomyContractRoute = readRepoFile(
    "src/app/api/moral-trade/cause-bucket-taxonomy/contract/route.ts",
  );
  const resourceCompatibilityContractRoute = readRepoFile(
    "src/app/api/moral-trade/resource-compatibility/contract/route.ts",
  );
  const netOffsetAccountingContractRoute = readRepoFile(
    "src/app/api/moral-trade/net-offset-accounting/contract/route.ts",
  );
  const offerValidityContractRoute = readRepoFile(
    "src/app/api/moral-trade/offer-validity/contract/route.ts",
  );
  const privateExchangeRateContractRoute = readRepoFile(
    "src/app/api/moral-trade/private-exchange-rate/contract/route.ts",
  );
  const noncompensableBlockerContractRoute = readRepoFile(
    "src/app/api/moral-trade/noncompensable-blockers/contract/route.ts",
  );
  const batchClearingObjectiveContractRoute = readRepoFile(
    "src/app/api/moral-trade/batch-clearing-objective/contract/route.ts",
  );
  const sensitiveEvidenceAttestationContractRoute = readRepoFile(
    "src/app/api/moral-trade/sensitive-evidence-attestations/contract/route.ts",
  );
  const pilotEvidenceContractRoute = readRepoFile(
    "src/app/api/moral-trade/pilot-evidence/contract/route.ts",
  );
  const sideAgreementContractRoute = readRepoFile(
    "src/app/api/moral-trade/side-agreements/contract/route.ts",
  );
  const tradeClassificationContractRoute = readRepoFile(
    "src/app/api/moral-trade/trade-classification/contract/route.ts",
  );
  const templateConformanceContractRoute = readRepoFile(
    "src/app/api/moral-trade/template-conformance/contract/route.ts",
  );
  const reviewCapacityContractRoute = readRepoFile(
    "src/app/api/moral-trade/review-capacity/contract/route.ts",
  );
  const participantTermSheetContractRoute = readRepoFile(
    "src/app/api/moral-trade/participant-term-sheet/contract/route.ts",
  );
  const protectiveAssessmentContractRoute = readRepoFile(
    "src/app/api/moral-trade/protective-assessments/contract/route.ts",
  );
  const userSafetyContentModerationContractRoute = readRepoFile(
    "src/app/api/moral-trade/user-safety-content-moderation/contract/route.ts",
  );
  const financialSettlementControlsContractRoute = readRepoFile(
    "src/app/api/moral-trade/financial-settlement-controls/contract/route.ts",
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
  const reasoningCenterErrorPage = readRepoFile("src/app/reasoning-center/error.tsx");
  const publicOffersRoute = readRepoFile("src/app/api/offers/route.ts");
  const publicOfferDetailRoute = readRepoFile("src/app/api/offers/[...slug]/route.ts");
  const publicOffersFacetsRoute = readRepoFile("src/app/api/offers/facets/route.ts");
  const publicOfferFollowRoute = readRepoFile("src/app/api/offers/[offerId]/follow/route.ts");
  const publicOfferCreateSimilarRoute = readRepoFile(
    "src/app/api/offers/[offerId]/create-similar/route.ts",
  );
  const savedSearchesRoute = readRepoFile("src/app/api/saved-searches/route.ts");
  const operationsHealthRoute = readRepoFile("src/app/api/moral-trade/operations/health/route.ts");
  const securityHealthRoute = readRepoFile("src/app/api/moral-trade/security/health/route.ts");
  const incidentResponseHealthRoute = readRepoFile(
    "src/app/api/moral-trade/incident-response/health/route.ts",
  );
  const evaluationHealthRoute = readRepoFile("src/app/api/moral-trade/evaluation/health/route.ts");
  const performanceHealthRoute = readRepoFile("src/app/api/moral-trade/performance/health/route.ts");
  const externalityHealthRoute = readRepoFile("src/app/api/moral-trade/externality/health/route.ts");
  const aiGovernanceHealthRoute = readRepoFile("src/app/api/moral-trade/ai-governance/health/route.ts");
  const privateOverlapContractRoute = readRepoFile(
    "src/app/api/moral-trade/private-overlap/contract/route.ts",
  );
  const apiContractRoute = readRepoFile("src/app/api/moral-trade/api-contract/route.ts");
  const documentCoverageHealthRoute = readRepoFile(
    "src/app/api/moral-trade/document-coverage/health/route.ts",
  );
  const provenanceSchemaRoute = readRepoFile("src/app/api/moral-trade/provenance/schema/route.ts");
  const schemaRegistryRoute = readRepoFile("src/app/api/moral-trade/schemas/route.ts");
  const schemaDocumentRoute = readRepoFile("src/app/schemas/moral-trade/[schema]/route.ts");
  const nextConfig = readRepoFile("next.config.ts");

  assert.match(validationPage, /VALIDATOR_REVIEW_ROLES/);
  assert.match(validationPage, /VALIDATOR_OPERATION_STANDARDS/);
  assert.match(validationPage, /VALIDATOR_QUALITY_METRICS/);
  assert.match(validationPage, /validateMoralTradeProtocolProfile/);
  assert.match(validationPage, /getMoralTradeChallengeAppealContract/);
  assert.match(validationPage, /validateMoralTradeChallengeAppealContract/);
  assert.match(validationPage, /\/moral-trade\/technical-spec/);
  assert.match(validationPage, /\/api\/moral-trade\/challenge-appeal\/contract/);
  assert.match(validationPage, /Manual review has named responsibilities/);
  assert.match(validationPage, /Review needs SLAs, conflict rules, and appeals/);
  assert.match(validationPage, /Appeals are scoped to reviewable claims/);
  assert.match(validationPage, /Reviewable subjects/);
  assert.match(validationPage, /Standing categories/);
  assert.match(validationPage, /Appeal triggers/);
  assert.match(validationPage, /Allowed outcomes/);
  assert.match(validationPage, /Requested outcomes are advisory/);
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
  assert.match(proposalReviewSource, /getMoralTradeUserFacingBlockerExplanations/);
  assert.match(proposalReviewSource, /explainMoralTradeUserFacingBlocker/);
  assert.match(proposalReviewSource, /userFacingBlockerExplanations/);
  assert.match(proposalReviewSource, /moneyEffect/);
  assert.match(proposalReviewSource, /obligationEffect/);
  assert.match(proposalReviewSource, /appealOrCorrectionPath/);
  assert.match(proposalReviewSource, /forbiddenUserFacingExplanationTerms/);
  assert.match(proposalReviewSource, /policy_registry/);
  assert.match(proposalReviewSource, /MARKETPLACE_REVIEW_FACTOR_PRIORITY/);
  assert.match(proposalReviewSource, /REVIEW_WORKFLOW_PARTICIPANT_COPY/);
  assert.match(proposalReviewSource, /What would you do if this trade did not happen/);
  assert.match(proposalReviewSource, /Status: Needs evidence/);
  assert.match(proposalReviewSource, /Challenge window/);
  assert.match(proposalReviewSource, /baseline_challenge_recommended/);
  assert.match(proposalReviewSource, /This proposal cannot be published/);
  assert.match(proposalReviewSource, /technical_spec_review_workflow_smoke/);
  assert.match(protocolSource, /validateMoralTradeProtocolProfile/);
  assert.match(protocolSource, /REQUIRED_DECISION_PIPELINE_STEPS/);
  assert.match(protocolSource, /decision-pipeline/);
  assert.match(protocolSource, /validateMoralTradeProposalStateTransition/);
  assert.match(protocolSource, /buildMoralTradeStateTransitionEventRecord/);
  assert.match(protocolSource, /validateMoralTradeStateTransitionEventRecord/);
  assert.match(protocolProfile, /anti_threat_baseline/);
  assert.match(protocolProfile, /decisionPipeline/);
  assert.match(protocolProfile, /schema_completeness/);
  assert.match(protocolProfile, /anti_threat_policy/);
  assert.match(protocolProfile, /factual_evidence_readiness/);
  assert.match(protocolProfile, /counterfactual_baseline/);
  assert.match(protocolProfile, /externality_review/);
  assert.match(protocolProfile, /privacy_redaction/);
  assert.match(protocolProfile, /match_explanation/);
  assert.match(protocolProfile, /human_review_routing/);
  assert.match(protocolProfile, /stateTransitionRules/);
  assert.match(protocolProfile, /completion_reviewed/);
  assert.match(protocolProfile, /disputed_unresolved/);
  assert.match(protocolProfile, /transition_event_recorded/);
  assert.match(protocolProfile, /"offer"/);
  assert.match(protocolProfile, /state_transition_event_record/);
  assert.match(protocolProfile, /eventHash/);
  assert.match(protocolProfile, /auditQuestionAnswers/);
  assert.match(protocolProfile, /privacy_safe_preview/);
  assert.match(protocolProfile, /baseline_challenge_recommended/);
  assert.match(protocolProfile, /match_signal/);
  assert.match(protocolProfile, /traceability_event/);
  assert.match(protocolProfile, /external_entity_reference/);
  assert.match(protocolProfile, /provenancePersistence/);
  assert.match(protocolProfile, /moral_trade_evidence_artifacts/);
  assert.match(protocolProfile, /moral_trade_traceability_events/);
  assert.match(protocolProfile, /No update or delete policies/);
  assert.match(protocolProfile, /cause_area_overlap/);
  assert.match(protocolProfile, /cause_area_complementarity/);
  assert.match(protocolProfile, /party_relative_benefit/);
  assert.match(protocolProfile, /evidence_artifact/);
  assert.match(protocolProfile, /provenanceObjectSchemas/);
  assert.match(offerWritePathSource, /buildMoralTradeOfferCreateProvenanceRows/);
  assert.match(offerWritePathSource, /buildMoralTradeOfferCreateProvenanceAgentRow/);
  assert.match(offerWritePathSource, /buildMoralTradeOfferCreateProvenanceConflictSelectors/);
  assert.match(offerWritePathSource, /isMoralTradeOfferCreateProvenanceUniqueViolation/);
  assert.match(offerWritePathSource, /activity_hash/);
  assert.match(offerWritePathSource, /event_hash/);
  assert.match(offerWritePathSource, /audit_question_answers/);
  assert.match(offerWritePathSource, /moral_trade_provenance_activities/);
  assert.match(offerWritePathSource, /moral_trade_state_transition_events/);
  assert.match(offerWritePathSource, /stateTransitionEvent/);
  assert.match(agreementWritePathSource, /buildAgreementReviewProvenanceAgentRow/);
  assert.match(agreementWritePathSource, /buildAgreementReviewDecisionRow/);
  assert.match(agreementWritePathSource, /buildAgreementReviewDecisionConflictSelector/);
  assert.match(agreementWritePathSource, /buildAgreementReviewProvenanceRows/);
  assert.match(agreementWritePathSource, /buildAgreementReviewProvenanceConflictSelectors/);
  assert.match(agreementWritePathSource, /moral_trade_review_decisions/);
  assert.match(agreementWritePathSource, /moral_trade_provenance_activities/);
  assert.match(agreementWritePathSource, /moral_trade_state_transition_events/);
  assert.match(agreementWritePathSource, /audit_question_answers/);
  assert.match(actionsSource, /persistMoralTradeOfferCreateProtocolProvenance/);
  assert.match(actionsSource, /persistMoralTradeAgreementReviewProtocolProvenance/);
  assert.match(actionsSource, /confirmExistingMoralTradeProtocolPersistenceRow/);
  assert.match(actionsSource, /insertMoralTradeProtocolPersistenceRow/);
  assert.match(actionsSource, /selector\.tableName/);
  assert.match(actionsSource, /moral_trade_provenance_agents/);
  assert.match(actionsSource, /Offer saved but kept paused because the protocol provenance record could not be written/);
  assert.match(dataModelSource, /validateMoralTradeDataModelProfile/);
  assert.match(dataModelSource, /REQUIRED_ENTITIES/);
  assert.match(dataModelSource, /review_decision/);
  assert.match(dataModelSource, /private_wish_profile/);
  assert.match(dataModelSource, /source_note_boundary/);
  assert.match(dataModelSource, /payment_non_custody_boundary/);
  assert.match(dataModelProfile, /private_wish_profile/);
  assert.match(dataModelProfile, /source_note/);
  assert.match(dataModelProfile, /background_wish_interview_session/);
  assert.match(dataModelProfile, /background_wish_interview_answer/);
  assert.match(dataModelProfile, /background_source_summary/);
  assert.match(dataModelProfile, /background_profile_signal/);
  assert.match(dataModelProfile, /background_opportunity_brief/);
  assert.match(dataModelProfile, /background_match_feedback/);
  assert.match(dataModelProfile, /background_intro_packet/);
  assert.match(dataModelProfile, /match_concierge_request/);
  assert.match(dataModelProfile, /saved_search/);
  assert.match(dataModelProfile, /privacy_grant/);
  assert.match(dataModelProfile, /review_decision/);
  assert.match(dataModelProfile, /decision_hash/);
  assert.equal(dataModelProfile.includes("reviewer_decision"), false);
  assert.match(dataModelProfile, /external_entity_reference/);
  assert.match(dataModelProfile, /traceability_event/);
  assert.match(dataModelProfile, /provenance_activity/);
  assert.match(dataModelProfile, /provenance_agent/);
  assert.match(dataModelProfile, /state_transition_event_record/);
  assert.match(dataModelProfile, /audit_question_answers/);
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
  assert.match(releaseGateSource, /getMoralTradeReleaseGateContract/);
  assert.match(releaseGateSource, /evaluateMoralTradeReleaseGate/);
  assert.match(releaseGateSource, /MORALTRADE82_RELEASE_STAGES/);
  assert.match(releaseGateSource, /MORALTRADE82_FEATURE_FLAGS/);
  assert.match(releaseGateSource, /pledge_swap_preview_only/);
  assert.match(releaseGateSource, /donation_offset_pilot/);
  assert.match(releaseGateSource, /MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS/);
  assert.match(releaseGateSource, /marketplace_intake_triage_routing_test/);
  assert.match(releaseGateSource, /participant_ui_render_snapshot_accessibility_test/);
  assert.match(releaseGateSource, /public_receipt_anti_gamification_test/);
  assert.match(releaseGateSource, /micro_pledge_preperformance_lock_test/);
  assert.match(releaseGateSource, /moral_trade_policy_snapshots/);
  assert.match(releaseGateSource, /moral_trade_release_gate_requirement_results/);
  assert.match(releaseGateSource, /waiver_without_neutral_review/);
  assert.match(releaseGateSource, /missing_inactive_control_representation/);
  assert.match(participantConfirmationSource, /getMoralTradeParticipantConfirmationContract/);
  assert.match(participantConfirmationSource, /evaluateMoralTradeParticipantConfirmation/);
  assert.match(participantConfirmationSource, /moral_trade_participant_confirmation_records/);
  assert.match(participantConfirmationSource, /moral_trade_consent_quality_records/);
  assert.match(participantConfirmationSource, /confirmation_not_recorded/);
  assert.match(participantConfirmationSource, /eligible_set_hash_required/);
  assert.match(participantEligibilitySource, /getMoralTradeParticipantEligibilityContract/);
  assert.match(participantEligibilitySource, /evaluateMoralTradeParticipantEligibility/);
  assert.match(participantEligibilitySource, /moral_trade_participant_eligibility_records/);
  assert.match(participantEligibilitySource, /moral_trade_identity_artifact_references/);
  assert.match(participantEligibilitySource, /human_uniqueness_sybil/);
  assert.match(participantEligibilitySource, /sanctions_potential_match/);
  assert.match(participantEligibilitySource, /moral-worth score/);
  assert.match(participantEligibilitySource, /identity_artifacts_publicly_exposed/);
  assert.match(accountSecuritySource, /getMoralTradeAccountSecurityContract/);
  assert.match(accountSecuritySource, /evaluateMoralTradeAccountSecurity/);
  assert.match(accountSecuritySource, /moral_trade_account_security_policies/);
  assert.match(accountSecuritySource, /moral_trade_account_security_events/);
  assert.match(accountSecuritySource, /browser session alone is not trusted/);
  assert.match(accountSecuritySource, /step_up_required/);
  assert.match(accountSecuritySource, /cooldown_active/);
  assert.match(accountSecuritySource, /manual_review_required/);
  assert.match(reviewerQualitySource, /getMoralTradeReviewerQualityContract/);
  assert.match(reviewerQualitySource, /evaluateMoralTradeReviewerQuality/);
  assert.match(reviewerQualitySource, /moral_trade_reviewer_quality_policies/);
  assert.match(reviewerQualitySource, /moral_trade_review_quality_audits/);
  assert.match(reviewerQualitySource, /Reviewer judgment is not an ungoverned primitive/);
  assert.match(reviewerQualitySource, /second_review_missing/);
  assert.match(reviewerQualitySource, /default_approval_detected/);
  assert.match(antiEnumerationSource, /getMoralTradeAntiEnumerationContract/);
  assert.match(antiEnumerationSource, /evaluateMoralTradeAntiEnumeration/);
  assert.match(antiEnumerationSource, /moral_trade_anti_enumeration_policies/);
  assert.match(antiEnumerationSource, /moral_trade_discovery_access_events/);
  assert.match(antiEnumerationSource, /moral_trade_discovery_probe_audits/);
  assert.match(antiEnumerationSource, /Repeated discovery is not an oracle/);
  assert.match(antiEnumerationSource, /repeated_probe_budget_exceeded/);
  assert.match(antiEnumerationSource, /raw_query_logged/);
  assert.match(privacyGovernanceSource, /getMoralTradePrivacyGovernanceContract/);
  assert.match(privacyGovernanceSource, /evaluateMoralTradePrivacyGovernance/);
  assert.match(privacyGovernanceSource, /privacy_grants/);
  assert.match(privacyGovernanceSource, /moral_trade_privacy_grant_policies/);
  assert.match(privacyGovernanceSource, /moral_trade_privacy_access_logs/);
  assert.match(privacyGovernanceSource, /moral_trade_privacy_disclosure_reviews/);
  assert.match(privacyGovernanceSource, /No private disclosure without a reconstructible ledger/);
  assert.match(privacyGovernanceSource, /raw_private_artifact_returned/);
  assert.match(privacyGovernanceSource, /access_log_missing/);
  assert.match(impactClaimSource, /getMoralTradeImpactClaimContract/);
  assert.match(impactClaimSource, /evaluateMoralTradeImpactClaim/);
  assert.match(impactClaimSource, /moral_trade_impact_claim_methodology_policies/);
  assert.match(impactClaimSource, /moral_trade_impact_claim_records/);
  assert.match(impactClaimSource, /Transfers are not impact/);
  assert.match(impactClaimSource, /transfer_metric_used_as_impact/);
  assert.match(impactClaimSource, /payment_evidence_used_as_impact/);
  assert.match(impactClaimSource, /uncertainty_disclosure_missing/);
  assert.match(matchingClearingSource, /getMoralTradeMatchingClearingContract/);
  assert.match(matchingClearingSource, /evaluateMoralTradeMatchingClearing/);
  assert.match(matchingClearingSource, /moral_trade_matching_clearing_runs/);
  assert.match(matchingClearingSource, /moral_trade_matched_trade_lock_proposals/);
  assert.match(matchingClearingSource, /moral_trade_matching_clearing_reproducibility_checks/);
  assert.match(matchingClearingSource, /Ad hoc matching is not clearing/);
  assert.match(matchingClearingSource, /database_order_matching/);
  assert.match(matchingClearingSource, /lock_proposal_missing/);
  assert.match(matchingClearingSource, /atomic_settlement_missing/);
  assert.match(baselineIntegritySource, /getMoralTradeBaselineIntegrityContract/);
  assert.match(baselineIntegritySource, /evaluateMoralTradeBaselineIntegrity/);
  assert.match(baselineIntegritySource, /moral_trade_baseline_integrity_policies/);
  assert.match(baselineIntegritySource, /moral_trade_baseline_integrity_assessments/);
  assert.match(baselineIntegritySource, /Manufactured baselines are not moral trade/);
  assert.match(baselineIntegritySource, /marketplace_created_baseline/);
  assert.match(baselineIntegritySource, /good_faith_confidence_conflated/);
  assert.match(baselineIntegritySource, /additionality_review_missing/);
  assert.match(baselineIntegritySource, /externality_review_missing/);
  assert.match(agreementAmendmentSource, /getMoralTradeAgreementAmendmentContract/);
  assert.match(agreementAmendmentSource, /evaluateMoralTradeAgreementAmendment/);
  assert.match(agreementAmendmentSource, /moral_trade_agreement_amendment_policies/);
  assert.match(agreementAmendmentSource, /moral_trade_agreement_amendment_records/);
  assert.match(agreementAmendmentSource, /Parent-record edits are not amendments/);
  assert.match(agreementAmendmentSource, /parent_record_edit_detected/);
  assert.match(agreementAmendmentSource, /renewed_confirmation_missing/);
  assert.match(agreementAmendmentSource, /neutral_review_missing/);
  assert.match(productionReadinessSource, /getMoralTradeProductionReadinessContract/);
  assert.match(productionReadinessSource, /evaluateMoralTradeProductionReadiness/);
  assert.match(productionReadinessSource, /moral_trade_account_security_events/);
  assert.match(productionReadinessSource, /moral_trade_backup_recovery_checkpoints/);
  assert.match(productionReadinessSource, /moral_trade_deployment_release_records/);
  assert.match(productionReadinessSource, /moral_trade_configuration_snapshots/);
  assert.match(productionReadinessSource, /moral_trade_schema_migration_runs/);
  assert.match(productionReadinessSource, /moral_trade_environment_data_isolation_records/);
  assert.match(productionReadinessSource, /moral_trade_financial_reconciliation_runs/);
  assert.match(productionReadinessSource, /moral_trade_audit_integrity_checkpoints/);
  assert.match(productionReadinessSource, /moral_trade_data_security_policies/);
  assert.match(productionReadinessSource, /variance_unresolved/);
  assert.match(recipientDestinationSource, /getMoralTradeRecipientDestinationContract/);
  assert.match(recipientDestinationSource, /evaluateMoralTradeRecipientDestination/);
  assert.match(recipientDestinationSource, /moral_trade_recipient_registry_entries/);
  assert.match(recipientDestinationSource, /moral_trade_payment_destinations/);
  assert.match(recipientDestinationSource, /moral_trade_recipient_destination_reviews/);
  assert.match(recipientDestinationSource, /recipient_destination_verification/);
  assert.match(recipientDestinationSource, /recipient_destination_record_required/);
  assert.match(recipientDestinationSource, /impersonation_risk/);
  assert.match(recipientDestinationSource, /prohibited_use_blocked/);
  assert.match(recipientAcceptanceSource, /getMoralTradeRecipientAcceptanceContract/);
  assert.match(recipientAcceptanceSource, /evaluateMoralTradeRecipientAcceptance/);
  assert.match(recipientAcceptanceSource, /moral_trade_recipient_acceptance_policies/);
  assert.match(recipientAcceptanceSource, /moral_trade_recipient_acceptance_records/);
  assert.match(recipientAcceptanceSource, /moral_trade_adverse_association_reviews/);
  assert.match(recipientAcceptanceSource, /recipient_acceptance_record_required/);
  assert.match(recipientAcceptanceSource, /adverse_association_review_required/);
  assert.match(recipientAcceptanceSource, /adverse_association_severe/);
  assert.match(aiPreferenceElicitationSource, /getMoralTradeAiPreferenceElicitationContract/);
  assert.match(aiPreferenceElicitationSource, /evaluateMoralTradeAiPreferenceElicitation/);
  assert.match(aiPreferenceElicitationSource, /moral_trade_ai_preference_elicitation_policies/);
  assert.match(aiPreferenceElicitationSource, /moral_trade_ai_preference_elicitation_records/);
  assert.match(aiPreferenceElicitationSource, /hidden_willingness_to_pay_inference_not_prohibited/);
  assert.match(aiPreferenceElicitationSource, /autonomous_counteroffer_or_acceptance_attempted/);
  assert.match(aiPreferenceElicitationSource, /ai_output_state_change_allowed/);
  assert.match(aiPreferenceElicitationSource, /user-edited structured input/);
  assert.match(postClearAuditSource, /getMoralTradePostClearAuditContract/);
  assert.match(postClearAuditSource, /evaluateMoralTradePostClearAudit/);
  assert.match(postClearAuditSource, /moral_trade_post_clear_audit_policies/);
  assert.match(postClearAuditSource, /moral_trade_post_clear_audit_records/);
  assert.match(postClearAuditSource, /post_clear_audit_record_required/);
  assert.match(postClearAuditSource, /post_clear_audit_non_blocking_record_required/);
  assert.match(postClearAuditSource, /no_public_moral_reputation_or_retroactive_obligation/);
  assert.match(postClearAuditSource, /raw payment evidence/);
  assert.match(nonPublicGoodsSubsidySource, /getMoralTradeNonPublicGoodsSubsidyContract/);
  assert.match(nonPublicGoodsSubsidySource, /evaluateMoralTradeNonPublicGoodsSubsidy/);
  assert.match(nonPublicGoodsSubsidySource, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(nonPublicGoodsSubsidySource, /moral_trade_subsidy_schedule_records/);
  assert.match(nonPublicGoodsSubsidySource, /subsidy_source_of_funds_not_non_blocking/);
  assert.match(nonPublicGoodsSubsidySource, /subsidy_moral_trade_volume_exclusion_missing/);
  assert.match(nonPublicGoodsSubsidySource, /counterparty-distinctness metrics/);
  assert.match(directPairClearingSource, /getMoralTradeDirectPairClearingContract/);
  assert.match(directPairClearingSource, /evaluateMoralTradeDirectPairClearing/);
  assert.match(directPairClearingSource, /moral_trade_direct_pair_clearing_records/);
  assert.match(directPairClearingSource, /direct_pair_background_networking_not_blocked/);
  assert.match(directPairClearingSource, /direct_pair_both_party_confirmation_missing/);
  assert.match(directPairClearingSource, /autonomous outreach/i);
  assert.match(directPairClearingSource, /direct contact details/i);
  assert.match(causeBucketTaxonomySource, /getMoralTradeCauseBucketTaxonomyContract/);
  assert.match(causeBucketTaxonomySource, /evaluateMoralTradeCauseBucketTaxonomy/);
  assert.match(causeBucketTaxonomySource, /moral_trade_cause_bucket_taxonomies/);
  assert.match(causeBucketTaxonomySource, /moral_trade_cause_bucket_assignments/);
  assert.match(causeBucketTaxonomySource, /cause_bucket_protected_trait_proxy_review_not_non_blocking/);
  assert.match(causeBucketTaxonomySource, /cause_bucket_effect_bearing_assignment_not_reviewer_normalized/);
  assert.match(causeBucketTaxonomySource, /not moral rankings/i);
  assert.match(causeBucketTaxonomySource, /inferred ideology/i);
  assert.match(resourceCompatibilitySource, /getMoralTradeResourceCompatibilityContract/);
  assert.match(resourceCompatibilitySource, /evaluateMoralTradeResourceCompatibility/);
  assert.match(resourceCompatibilitySource, /moral_trade_resource_compatibility_assessments/);
  assert.match(resourceCompatibilitySource, /resource_or_action_conflict_blocking/);
  assert.match(resourceCompatibilitySource, /zero_sum_control_claim/);
  assert.match(resourceCompatibilitySource, /private resource claims/i);
  assert.match(netOffsetAccountingSource, /getMoralTradeNetOffsetAccountingContract/);
  assert.match(netOffsetAccountingSource, /evaluateMoralTradeNetOffsetAccounting/);
  assert.match(netOffsetAccountingSource, /moral_trade_net_offset_accounting_records/);
  assert.match(netOffsetAccountingSource, /gross_transfer_without_canceled_offset/);
  assert.match(netOffsetAccountingSource, /matched_canceled_offset_missing/);
  assert.match(netOffsetAccountingSource, /private baseline details/i);
  assert.match(offerValiditySource, /getMoralTradeOfferValidityContract/);
  assert.match(offerValiditySource, /evaluateMoralTradeOfferValidity/);
  assert.match(offerValiditySource, /moral_trade_offer_validity_records/);
  assert.match(offerValiditySource, /offer_validity_expired/);
  assert.match(offerValiditySource, /offer_validity_stale/);
  assert.match(offerValiditySource, /counterparty_bucket_stale/);
  assert.match(privateExchangeRateSource, /getMoralTradePrivateExchangeRateContract/);
  assert.match(privateExchangeRateSource, /evaluateMoralTradePrivateExchangeRate/);
  assert.match(privateExchangeRateSource, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(privateExchangeRateSource, /private_exchange_rate_public_cause_price_published/);
  assert.match(privateExchangeRateSource, /private_exchange_rate_global_exchange_rate_published/);
  assert.match(privateExchangeRateSource, /willingness-to-trade/i);
  assert.match(noncompensableBlockerSource, /getMoralTradeNoncompensableBlockerContract/);
  assert.match(noncompensableBlockerSource, /evaluateMoralTradeNoncompensableBlocker/);
  assert.match(noncompensableBlockerSource, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(noncompensableBlockerSource, /noncompensable_blocker_compensation_attempt_for_nonwaivable_interest/);
  assert.match(noncompensableBlockerSource, /constraints rather than prices/i);
  assert.match(noncompensableBlockerSource, /performance bond/i);
  assert.match(batchClearingObjectiveSource, /getMoralTradeBatchClearingObjectiveContract/);
  assert.match(batchClearingObjectiveSource, /evaluateMoralTradeBatchClearingObjective/);
  assert.match(batchClearingObjectiveSource, /moral_trade_batch_clearing_objective_records/);
  assert.match(batchClearingObjectiveSource, /batch_clearing_objective_prohibited_allocation_driver/);
  assert.match(batchClearingObjectiveSource, /matched volume alone/i);
  assert.match(batchClearingObjectiveSource, /database order/i);
  assert.match(sensitiveEvidenceAttestationSource, /getMoralTradeSensitiveEvidenceAttestationContract/);
  assert.match(sensitiveEvidenceAttestationSource, /evaluateMoralTradeSensitiveEvidenceAttestation/);
  assert.match(sensitiveEvidenceAttestationSource, /moral_trade_sensitive_evidence_attestations/);
  assert.match(sensitiveEvidenceAttestationSource, /sensitive_evidence_counterparty_raw_artifact_disclosure_blocked/);
  assert.match(sensitiveEvidenceAttestationSource, /claim-typed/i);
  assert.match(sensitiveEvidenceAttestationSource, /privacy grant/i);
  assert.match(pilotEvidenceSource, /getMoralTradePilotEvidenceContract/);
  assert.match(pilotEvidenceSource, /evaluateMoralTradePilotEvidence/);
  assert.match(pilotEvidenceSource, /moral_trade_pilot_evidence_gates/);
  assert.match(pilotEvidenceSource, /market_simulation_red_team_test/);
  assert.match(pilotEvidenceSource, /pilot_success_cannot_be_matched_volume_alone/);
  assert.match(sideAgreementSource, /getMoralTradeSideAgreementContract/);
  assert.match(sideAgreementSource, /evaluateMoralTradeSideAgreementDisclosure/);
  assert.match(sideAgreementSource, /moral_trade_side_agreement_disclosures/);
  assert.match(sideAgreementSource, /moral_trade_side_agreement_reviews/);
  assert.match(sideAgreementSource, /side_agreement_disclosure_required/);
  assert.match(sideAgreementSource, /reporting_integrity/);
  assert.match(sideAgreementSource, /civil_rights_discrimination/);
  assert.match(sideAgreementSource, /confidentiality_privacy_rights/);
  assert.match(tradeClassificationSource, /getMoralTradeTradeClassificationContract/);
  assert.match(tradeClassificationSource, /evaluateMoralTradeTradeClassification/);
  assert.match(tradeClassificationSource, /moral_trade_trade_classification_records/);
  assert.match(tradeClassificationSource, /moral_trade_compensated_action_terms/);
  assert.match(tradeClassificationSource, /moral_trade_ordinary_service_procurement_reviews/);
  assert.match(tradeClassificationSource, /ordinary_service_or_procurement/);
  assert.match(tradeClassificationSource, /not a public moral status badge/);
  assert.match(templateConformanceSource, /getMoralTradeTemplateConformanceContract/);
  assert.match(templateConformanceSource, /evaluateMoralTradeTemplateConformance/);
  assert.match(templateConformanceSource, /moral_trade_approved_trade_templates/);
  assert.match(templateConformanceSource, /moral_trade_template_parameter_policies/);
  assert.match(templateConformanceSource, /moral_trade_template_instance_records/);
  assert.match(templateConformanceSource, /off_template_manual_review/);
  assert.match(templateConformanceSource, /free_text_creates_new_obligations/);
  assert.match(reviewCapacitySource, /getMoralTradeReviewCapacityContract/);
  assert.match(reviewCapacitySource, /evaluateMoralTradeReviewCapacity/);
  assert.match(reviewCapacitySource, /moral_trade_review_capacity_policies/);
  assert.match(reviewCapacitySource, /moral_trade_review_queue_records/);
  assert.match(reviewCapacitySource, /moral_trade_reviewer_panel_assignments/);
  assert.match(reviewCapacitySource, /waitlisted_capacity/);
  assert.match(reviewCapacitySource, /estimated_review_after_payment_authorization_expiry/);
  assert.match(participantTermSheetSource, /getMoralTradeParticipantTermSheetContract/);
  assert.match(participantTermSheetSource, /evaluateMoralTradeParticipantTermSheet/);
  assert.match(participantTermSheetSource, /moral_trade_participant_term_sheet_records/);
  assert.match(participantTermSheetSource, /moral_trade_counterparty_blinding_policies/);
  assert.match(
    participantTermSheetSource,
    /moral_trade_staged_counterparty_disclosure_records/,
  );
  assert.match(participantTermSheetSource, /term_sheet_mismatch/);
  assert.match(participantTermSheetSource, /counterparty_disclosure_policy_blocking/);
  assert.match(participantTermSheetSource, /staged_disclosure_consent_missing/);
  assert.match(protectiveAssessmentSource, /getMoralTradeProtectiveAssessmentContract/);
  assert.match(protectiveAssessmentSource, /evaluateMoralTradeProtectiveAssessments/);
  assert.match(protectiveAssessmentSource, /moral_trade_protective_assessment_records/);
  assert.match(protectiveAssessmentSource, /moral_trade_negative_commitment_scopes/);
  assert.match(protectiveAssessmentSource, /moral_trade_action_reversibility_assessments/);
  assert.match(protectiveAssessmentSource, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(protectiveAssessmentSource, /moral_trade_authority_obligation_assessments/);
  assert.match(protectiveAssessmentSource, /reporting_integrity_non_suppression/);
  assert.match(protectiveAssessmentSource, /regulated_goods_hazardous_activity/);
  assert.match(protectiveAssessmentSource, /cyber_abuse_digital_systems_integrity/);
  assert.match(
    userSafetyContentModerationSource,
    /getMoralTradeUserSafetyContentModerationContract/,
  );
  assert.match(
    userSafetyContentModerationSource,
    /evaluateMoralTradeUserSafetyContentModeration/,
  );
  assert.match(
    userSafetyContentModerationSource,
    /moral_trade_contact_interaction_records/,
  );
  assert.match(
    userSafetyContentModerationSource,
    /moral_trade_abuse_report_records/,
  );
  assert.match(
    userSafetyContentModerationSource,
    /moral_trade_content_moderation_records/,
  );
  assert.match(userSafetyContentModerationSource, /viewpoint_neutrality/);
  assert.match(userSafetyContentModerationSource, /unpopular_moral_view/);
  assert.match(userSafetyContentModerationSource, /contact_consent/);
  assert.match(userSafetyContentModerationSource, /serious_unresolved/);
  assert.match(
    financialSettlementControlsSource,
    /getMoralTradeFinancialSettlementControlsContract/,
  );
  assert.match(
    financialSettlementControlsSource,
    /evaluateMoralTradeFinancialSettlementControls/,
  );
  assert.match(financialSettlementControlsSource, /moral_trade_platform_fee_policies/);
  assert.match(financialSettlementControlsSource, /moral_trade_fx_rate_snapshots/);
  assert.match(financialSettlementControlsSource, /moral_trade_material_notice_records/);
  assert.match(financialSettlementControlsSource, /moral_trade_time_authority_policies/);
  assert.match(financialSettlementControlsSource, /moral_trade_challenge_window_records/);
  assert.match(financialSettlementControlsSource, /moral_trade_payout_milestone_records/);
  assert.match(financialSettlementControlsSource, /financial_settlement_control_required/);
  assert.match(financialSettlementControlsSource, /included_in_qf_signal/);
  assert.match(financialSettlementControlsSource, /client_clock_used/);
  assert.match(financialSettlementControlsSource, /payout_destination_binding/);
  assert.match(productionReadinessMigration, /moral_trade_account_security_events/);
  assert.match(productionReadinessMigration, /moral_trade_backup_recovery_checkpoints/);
  assert.match(productionReadinessMigration, /moral_trade_financial_reconciliation_runs/);
  assert.match(productionReadinessMigration, /moral_trade_audit_integrity_checkpoints/);
  assert.match(productionReadinessMigration, /moral_trade_configuration_snapshots/);
  assert.match(participantEligibilityMigration, /moral_trade_participant_eligibility_records/);
  assert.match(participantEligibilityMigration, /moral_trade_participant_eligibility_reviews/);
  assert.match(participantEligibilityMigration, /moral_trade_identity_artifact_references/);
  assert.match(participantEligibilityMigration, /public_moral_reputation_impact/);
  assert.match(accountSecurityMigration, /applies_to_action/);
  assert.match(accountSecurityMigration, /participant_confirmation/);
  assert.match(accountSecurityMigration, /account_security_policy_ref/);
  assert.match(accountSecurityMigration, /step_up_passed/);
  assert.match(accountSecurityMigration, /cooldown_hours/);
  assert.match(reviewerQualityMigration, /moral_trade_reviewer_quality_policies/);
  assert.match(reviewerQualityMigration, /moral_trade_review_quality_audits/);
  assert.match(reviewerQualityMigration, /reviewer_quality_policy_ref/);
  assert.match(reviewerQualityMigration, /conflict_of_interest_state/);
  assert.match(reviewerQualityMigration, /default_approval_prohibited_bool/);
  assert.match(antiEnumerationMigration, /moral_trade_anti_enumeration_policies/);
  assert.match(antiEnumerationMigration, /moral_trade_discovery_access_events/);
  assert.match(antiEnumerationMigration, /moral_trade_discovery_probe_audits/);
  assert.match(antiEnumerationMigration, /anti_enumeration_policy_ref/);
  assert.match(antiEnumerationMigration, /result_count_bucket/);
  assert.match(antiEnumerationMigration, /raw_query_stored_bool/);
  assert.match(antiEnumerationMigration, /timing_equalized_bool/);
  assert.match(privacyGovernanceMigration, /moral_trade_privacy_grant_policies/);
  assert.match(privacyGovernanceMigration, /moral_trade_privacy_access_logs/);
  assert.match(privacyGovernanceMigration, /moral_trade_privacy_disclosure_reviews/);
  assert.match(privacyGovernanceMigration, /privacy_policy_ref/);
  assert.match(privacyGovernanceMigration, /purpose_limited_bool/);
  assert.match(privacyGovernanceMigration, /raw_private_artifact_returned_bool/);
  assert.match(impactClaimMigration, /moral_trade_impact_claim_methodology_policies/);
  assert.match(impactClaimMigration, /moral_trade_impact_claim_records/);
  assert.match(impactClaimMigration, /impact_claim_methodology/);
  assert.match(impactClaimMigration, /payment_evidence_used_as_impact_bool/);
  assert.match(impactClaimMigration, /uncertainty_disclosure/);
  assert.match(impactClaimMigration, /transfer_vs_impact_label/);
  assert.match(matchingClearingMigration, /moral_trade_matching_clearing_runs/);
  assert.match(matchingClearingMigration, /moral_trade_matched_trade_lock_proposals/);
  assert.match(matchingClearingMigration, /moral_trade_matching_clearing_reproducibility_checks/);
  assert.match(matchingClearingMigration, /matching_clearing/);
  assert.match(matchingClearingMigration, /matched_trade_lock/);
  assert.match(matchingClearingMigration, /database_order_matching_bool/);
  assert.match(matchingClearingMigration, /atomic_settlement_group_ref/);
  assert.match(baselineIntegrityMigration, /moral_trade_baseline_integrity_policies/);
  assert.match(baselineIntegrityMigration, /moral_trade_baseline_integrity_assessments/);
  assert.match(baselineIntegrityMigration, /baseline_integrity/);
  assert.match(baselineIntegrityMigration, /baseline_manufacturing/);
  assert.match(baselineIntegrityMigration, /marketplace_created/);
  assert.match(baselineIntegrityMigration, /good_faith_confidence_separated_bool/);
  assert.match(agreementAmendmentMigration, /moral_trade_agreement_amendment_policies/);
  assert.match(agreementAmendmentMigration, /moral_trade_agreement_amendment_records/);
  assert.match(agreementAmendmentMigration, /agreement_amendment/);
  assert.match(agreementAmendmentMigration, /parent_record_edit_detected_bool/);
  assert.match(agreementAmendmentMigration, /renewed_confirmation_refs/);
  assert.match(appealCaseMigration, /moral_trade_appeal_policies/);
  assert.match(appealCaseMigration, /moral_trade_appeal_cases/);
  assert.match(appealCaseMigration, /appeal_case/);
  assert.match(appealCaseMigration, /notice_state/);
  assert.match(appealCaseMigration, /deadline_at/);
  assert.match(appealCaseMigration, /non_retaliation_notice_sent_bool/);
  assert.match(recipientDestinationMigration, /moral_trade_recipient_registry_entries/);
  assert.match(recipientDestinationMigration, /moral_trade_payment_destinations/);
  assert.match(recipientDestinationMigration, /moral_trade_recipient_destination_reviews/);
  assert.match(recipientDestinationMigration, /verification_action_record_id/);
  assert.match(recipientAcceptanceMigration, /moral_trade_recipient_acceptance_policies/);
  assert.match(recipientAcceptanceMigration, /moral_trade_recipient_acceptance_records/);
  assert.match(recipientAcceptanceMigration, /moral_trade_adverse_association_reviews/);
  assert.match(recipientAcceptanceMigration, /recipient_acceptance/);
  assert.match(recipientAcceptanceMigration, /adverse_association/);
  assert.match(recipientAcceptanceMigration, /recipient_private_notes_public_bool/);
  assert.match(recipientAcceptanceMigration, /raw_association_evidence_public_bool/);
  assert.match(aiPreferenceElicitationMigration, /moral_trade_ai_preference_elicitation_policies/);
  assert.match(aiPreferenceElicitationMigration, /moral_trade_ai_preference_elicitation_records/);
  assert.match(aiPreferenceElicitationMigration, /ai_preference_elicitation/);
  assert.match(aiPreferenceElicitationMigration, /hidden_willingness_to_pay_inference_prohibited_bool/);
  assert.match(aiPreferenceElicitationMigration, /autonomous_counteroffer_or_acceptance_bool/);
  assert.match(aiPreferenceElicitationMigration, /state_change_allowed_bool/);
  assert.match(aiPreferenceElicitationMigration, /raw_ai_output_public_bool/);
  assert.match(postClearAuditMigration, /moral_trade_post_clear_audit_policies/);
  assert.match(postClearAuditMigration, /moral_trade_post_clear_audit_records/);
  assert.match(postClearAuditMigration, /post_clear_audit/);
  assert.match(postClearAuditMigration, /public_reputation_effect_prohibited_bool/);
  assert.match(postClearAuditMigration, /raw_payment_evidence_public_bool/);
  assert.match(postClearAuditMigration, /participant_specific_rows_public_bool/);
  assert.match(nonPublicGoodsSubsidyMigration, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(nonPublicGoodsSubsidyMigration, /moral_trade_subsidy_schedule_records/);
  assert.match(nonPublicGoodsSubsidyMigration, /non_public_goods_subsidy/);
  assert.match(nonPublicGoodsSubsidyMigration, /participant_moral_trade_volume_exclusion_bool/);
  assert.match(nonPublicGoodsSubsidyMigration, /counterparty_distinctness_exclusion_bool/);
  assert.match(directPairClearingMigration, /moral_trade_direct_pair_clearing_records/);
  assert.match(directPairClearingMigration, /direct_pair_clearing/);
  assert.match(directPairClearingMigration, /no_background_networking_bool/);
  assert.match(directPairClearingMigration, /final_confirmation_record_refs/);
  assert.match(directPairClearingMigration, /privacy_grant_refs/);
  assert.match(directPairClearingMigration, /ordinary_lock_review_payment_privacy_gates_status/);
  assert.match(causeBucketTaxonomyMigration, /moral_trade_cause_bucket_taxonomies/);
  assert.match(causeBucketTaxonomyMigration, /moral_trade_cause_bucket_assignments/);
  assert.match(causeBucketTaxonomyMigration, /cause_bucket_taxonomy/);
  assert.match(causeBucketTaxonomyMigration, /protected_trait_proxy_review_state/);
  assert.match(causeBucketTaxonomyMigration, /public_moral_ranking_bool/);
  assert.match(causeBucketTaxonomyMigration, /participant_visible_dependency_notice_bool/);
  assert.match(resourceCompatibilityMigration, /moral_trade_resource_compatibility_assessments/);
  assert.match(resourceCompatibilityMigration, /resource_compatibility/);
  assert.match(resourceCompatibilityMigration, /zero_sum_control_claim/);
  assert.match(resourceCompatibilityMigration, /public_private_resource_claims_bool/);
  assert.match(netOffsetAccountingMigration, /moral_trade_net_offset_accounting_records/);
  assert.match(netOffsetAccountingMigration, /net_offset_accounting/);
  assert.match(netOffsetAccountingMigration, /baseline_opposed_action_type/);
  assert.match(netOffsetAccountingMigration, /matched_canceled_amount_cents/);
  assert.match(netOffsetAccountingMigration, /compromise_transfer_amount_cents/);
  assert.match(netOffsetAccountingMigration, /residual_opposed_amount_cents/);
  assert.match(netOffsetAccountingMigration, /substitution_channel_review_state/);
  assert.match(offerValidityMigration, /moral_trade_offer_validity_records/);
  assert.match(offerValidityMigration, /offer_validity/);
  assert.match(offerValidityMigration, /baseline_snapshot_hash/);
  assert.match(offerValidityMigration, /offer_expires_at/);
  assert.match(offerValidityMigration, /stale_reason_codes_json/);
  assert.match(offerValidityMigration, /renewal_confirmation_record_refs/);
  assert.match(privateExchangeRateMigration, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(privateExchangeRateMigration, /private_exchange_rate_quote/);
  assert.match(privateExchangeRateMigration, /public_moral_price_prohibited_bool/);
  assert.match(privateExchangeRateMigration, /global_exchange_rate_published_bool/);
  assert.match(privateExchangeRateMigration, /exact_counterparty_quote_disclosed_bool/);
  assert.match(noncompensableBlockerMigration, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(noncompensableBlockerMigration, /noncompensable_blocker/);
  assert.match(noncompensableBlockerMigration, /protected_interest_type/);
  assert.match(noncompensableBlockerMigration, /attempted_compensation_or_waiver_state/);
  assert.match(noncompensableBlockerMigration, /renewed_confirmation_record_refs/);
  assert.match(noncompensableBlockerMigration, /constraints, not prices/i);
  assert.match(batchClearingObjectiveMigration, /moral_trade_batch_clearing_objective_records/);
  assert.match(batchClearingObjectiveMigration, /batch_clearing_objective/);
  assert.match(batchClearingObjectiveMigration, /tie_break_fairness_rule_type/);
  assert.match(batchClearingObjectiveMigration, /allocation_drivers_json/);
  assert.match(batchClearingObjectiveMigration, /prohibited allocation drivers/i);
  assert.match(sensitiveEvidenceAttestationMigration, /moral_trade_sensitive_evidence_attestations/);
  assert.match(sensitiveEvidenceAttestationMigration, /sensitive_evidence_attestation/);
  assert.match(sensitiveEvidenceAttestationMigration, /claim_type/);
  assert.match(sensitiveEvidenceAttestationMigration, /challenge_route/);
  assert.match(sensitiveEvidenceAttestationMigration, /privacy grant and passed confidentiality review/i);
  assert.match(pilotEvidenceMigration, /moral_trade_pilot_evidence_gates/);
  assert.match(pilotEvidenceMigration, /pilot_evidence/);
  assert.match(pilotEvidenceMigration, /pre_registered_criteria_hash/);
  assert.match(pilotEvidenceMigration, /success_metric_refs_json/);
  assert.match(pilotEvidenceMigration, /matched volume alone/i);
  assert.match(sideAgreementMigration, /moral_trade_side_agreement_disclosures/);
  assert.match(sideAgreementMigration, /moral_trade_side_agreement_reviews/);
  assert.match(sideAgreementMigration, /side_agreement_disclosure/);
  assert.match(sideAgreementMigration, /side_agreement_review/);
  assert.match(sideAgreementMigration, /reporting_integrity/);
  assert.match(sideAgreementMigration, /civil_rights_discrimination/);
  assert.match(tradeClassificationMigration, /moral_trade_trade_classification_records/);
  assert.match(tradeClassificationMigration, /moral_trade_compensated_action_terms/);
  assert.match(
    tradeClassificationMigration,
    /moral_trade_ordinary_service_procurement_reviews/,
  );
  assert.match(tradeClassificationMigration, /trade_classification/);
  assert.match(tradeClassificationMigration, /ordinary_service_procurement/);
  assert.match(templateConformanceMigration, /moral_trade_approved_trade_templates/);
  assert.match(templateConformanceMigration, /moral_trade_template_parameter_policies/);
  assert.match(templateConformanceMigration, /moral_trade_template_instance_records/);
  assert.match(templateConformanceMigration, /approved_trade_template/);
  assert.match(templateConformanceMigration, /template_parameter/);
  assert.match(templateConformanceMigration, /free_text_creates_new_obligations_bool/);
  assert.match(reviewCapacityMigration, /moral_trade_review_capacity_policies/);
  assert.match(reviewCapacityMigration, /moral_trade_review_queue_records/);
  assert.match(reviewCapacityMigration, /moral_trade_reviewer_panel_assignments/);
  assert.match(reviewCapacityMigration, /review_capacity/);
  assert.match(reviewCapacityMigration, /review_queue_admission/);
  assert.match(reviewCapacityMigration, /visible_user_queue_status/);
  assert.match(reviewCapacityMigration, /payment_authorization_expires_at/);
  assert.match(participantTermSheetMigration, /moral_trade_participant_term_sheet_records/);
  assert.match(participantTermSheetMigration, /moral_trade_counterparty_blinding_policies/);
  assert.match(
    participantTermSheetMigration,
    /moral_trade_staged_counterparty_disclosure_records/,
  );
  assert.match(participantTermSheetMigration, /participant_term_sheet/);
  assert.match(participantTermSheetMigration, /counterparty_blinding/);
  assert.match(participantTermSheetMigration, /staged_counterparty_disclosure/);
  assert.match(participantTermSheetMigration, /free_text_creates_new_obligations_bool/);
  assert.match(participantTermSheetMigration, /raw_counterparty_identity_public_bool/);
  assert.match(protectiveAssessmentMigration, /moral_trade_protective_assessment_records/);
  assert.match(protectiveAssessmentMigration, /moral_trade_negative_commitment_scopes/);
  assert.match(
    protectiveAssessmentMigration,
    /moral_trade_action_reversibility_assessments/,
  );
  assert.match(protectiveAssessmentMigration, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(
    protectiveAssessmentMigration,
    /moral_trade_authority_obligation_assessments/,
  );
  assert.match(protectiveAssessmentMigration, /protective_assessment/);
  assert.match(protectiveAssessmentMigration, /financial_crime_fraud_assessment/);
  assert.match(
    protectiveAssessmentMigration,
    /cyber_abuse_digital_integrity_assessment/,
  );
  assert.match(
    userSafetyContentModerationMigration,
    /moral_trade_user_safety_policies/,
  );
  assert.match(
    userSafetyContentModerationMigration,
    /moral_trade_contact_interaction_records/,
  );
  assert.match(
    userSafetyContentModerationMigration,
    /moral_trade_abuse_report_records/,
  );
  assert.match(
    userSafetyContentModerationMigration,
    /moral_trade_content_moderation_policies/,
  );
  assert.match(
    userSafetyContentModerationMigration,
    /moral_trade_content_moderation_records/,
  );
  assert.match(userSafetyContentModerationMigration, /user_safety/);
  assert.match(userSafetyContentModerationMigration, /content_moderation/);
  assert.match(userSafetyContentModerationMigration, /prohibited_use/);
  assert.match(financialSettlementControlsMigration, /moral_trade_platform_fee_policies/);
  assert.match(financialSettlementControlsMigration, /moral_trade_platform_fee_disclosures/);
  assert.match(financialSettlementControlsMigration, /moral_trade_fx_policies/);
  assert.match(financialSettlementControlsMigration, /moral_trade_fx_rate_snapshots/);
  assert.match(financialSettlementControlsMigration, /moral_trade_notification_policies/);
  assert.match(financialSettlementControlsMigration, /moral_trade_material_notice_records/);
  assert.match(financialSettlementControlsMigration, /moral_trade_time_authority_policies/);
  assert.match(financialSettlementControlsMigration, /moral_trade_deadline_records/);
  assert.match(financialSettlementControlsMigration, /moral_trade_challenge_window_records/);
  assert.match(financialSettlementControlsMigration, /moral_trade_payout_milestone_records/);
  assert.match(financialSettlementControlsMigration, /challenge_window/);
  assert.match(financialSettlementControlsMigration, /payout_milestone/);
  assert.match(financialSettlementControlsMigration, /raw_fx_provider_payload_public_bool/);
  assert.match(financialSettlementControlsMigration, /payment_credentials_public_bool/);
  assert.match(schemaSource, /moral_trade_account_security_events/);
  assert.match(schemaSource, /moral_trade_backup_recovery_checkpoints/);
  assert.match(schemaSource, /moral_trade_financial_reconciliation_runs/);
  assert.match(schemaSource, /moral_trade_audit_integrity_checkpoints/);
  assert.match(schemaSource, /moral_trade_participant_eligibility_records/);
  assert.match(schemaSource, /moral_trade_participant_eligibility_reviews/);
  assert.match(schemaSource, /moral_trade_identity_artifact_references/);
  assert.match(schemaSource, /account_security_policy_ref/);
  assert.match(schemaSource, /risk_state text not null/);
  assert.match(schemaSource, /trusted_device_status/);
  assert.match(schemaSource, /moral_trade_reviewer_quality_policies/);
  assert.match(schemaSource, /moral_trade_review_quality_audits/);
  assert.match(schemaSource, /reviewer_quality_policy_ref/);
  assert.match(schemaSource, /conflict_of_interest_state/);
  assert.match(schemaSource, /moral_trade_anti_enumeration_policies/);
  assert.match(schemaSource, /moral_trade_discovery_access_events/);
  assert.match(schemaSource, /moral_trade_discovery_probe_audits/);
  assert.match(schemaSource, /anti_enumeration_policy_ref/);
  assert.match(schemaSource, /result_count_bucket/);
  assert.match(schemaSource, /moral_trade_privacy_grant_policies/);
  assert.match(schemaSource, /moral_trade_privacy_access_logs/);
  assert.match(schemaSource, /moral_trade_privacy_disclosure_reviews/);
  assert.match(schemaSource, /privacy_policy_ref/);
  assert.match(schemaSource, /raw_private_artifact_returned_bool/);
  assert.match(schemaSource, /moral_trade_impact_claim_methodology_policies/);
  assert.match(schemaSource, /moral_trade_impact_claim_records/);
  assert.match(schemaSource, /impact_claim_methodology/);
  assert.match(schemaSource, /payment_evidence_used_as_impact_bool/);
  assert.match(schemaSource, /moral_trade_matching_clearing_runs/);
  assert.match(schemaSource, /moral_trade_matched_trade_lock_proposals/);
  assert.match(schemaSource, /moral_trade_matching_clearing_reproducibility_checks/);
  assert.match(schemaSource, /atomic_settlement_group_ref/);
  assert.match(schemaSource, /moral_trade_baseline_integrity_policies/);
  assert.match(schemaSource, /moral_trade_baseline_integrity_assessments/);
  assert.match(schemaSource, /baseline_manufacturing/);
  assert.match(schemaSource, /moral_trade_agreement_amendment_policies/);
  assert.match(schemaSource, /moral_trade_agreement_amendment_records/);
  assert.match(schemaSource, /agreement_amendment/);
  assert.match(schemaSource, /moral_trade_appeal_policies/);
  assert.match(schemaSource, /moral_trade_appeal_cases/);
  assert.match(schemaSource, /appeal_case/);
  assert.match(schemaSource, /moral_trade_recipient_registry_entries/);
  assert.match(schemaSource, /moral_trade_payment_destinations/);
  assert.match(schemaSource, /moral_trade_recipient_destination_reviews/);
  assert.match(schemaSource, /moral_trade_recipient_acceptance_policies/);
  assert.match(schemaSource, /moral_trade_recipient_acceptance_records/);
  assert.match(schemaSource, /moral_trade_adverse_association_reviews/);
  assert.match(schemaSource, /recipient_acceptance/);
  assert.match(schemaSource, /adverse_association/);
  assert.match(schemaSource, /raw_association_evidence_public_bool/);
  assert.match(schemaSource, /moral_trade_ai_preference_elicitation_policies/);
  assert.match(schemaSource, /moral_trade_ai_preference_elicitation_records/);
  assert.match(schemaSource, /ai_preference_elicitation/);
  assert.match(schemaSource, /hidden_wtp_estimate_public_bool/);
  assert.match(schemaSource, /hidden_negotiation_moves_public_bool/);
  assert.match(schemaSource, /moral_trade_post_clear_audit_policies/);
  assert.match(schemaSource, /moral_trade_post_clear_audit_records/);
  assert.match(schemaSource, /post_clear_audit/);
  assert.match(schemaSource, /raw_payment_evidence_public_bool/);
  assert.match(schemaSource, /participant_specific_rows_public_bool/);
  assert.match(schemaSource, /moral_trade_non_public_goods_subsidy_pools/);
  assert.match(schemaSource, /moral_trade_subsidy_schedule_records/);
  assert.match(schemaSource, /non_public_goods_subsidy/);
  assert.match(schemaSource, /participant_moral_trade_volume_exclusion_bool/);
  assert.match(schemaSource, /counterparty_distinctness_exclusion_bool/);
  assert.match(schemaSource, /moral_trade_direct_pair_clearing_records/);
  assert.match(schemaSource, /direct_pair_clearing/);
  assert.match(schemaSource, /no_background_networking_bool/);
  assert.match(schemaSource, /final_confirmation_record_refs/);
  assert.match(schemaSource, /ordinary_lock_review_payment_privacy_gates_status/);
  assert.match(schemaSource, /moral_trade_cause_bucket_taxonomies/);
  assert.match(schemaSource, /moral_trade_cause_bucket_assignments/);
  assert.match(schemaSource, /cause_bucket_taxonomy/);
  assert.match(schemaSource, /public_moral_ranking_bool/);
  assert.match(schemaSource, /public_inferred_ideology_or_psychology_bool/);
  assert.match(schemaSource, /moral_trade_resource_compatibility_assessments/);
  assert.match(schemaSource, /resource_compatibility/);
  assert.match(schemaSource, /zero_sum_control_claim/);
  assert.match(schemaSource, /public_private_resource_claims_bool/);
  assert.match(schemaSource, /moral_trade_net_offset_accounting_records/);
  assert.match(schemaSource, /net_offset_accounting/);
  assert.match(schemaSource, /baseline_opposed_action_type/);
  assert.match(schemaSource, /matched_canceled_amount_cents/);
  assert.match(schemaSource, /compromise_transfer_amount_cents/);
  assert.match(schemaSource, /substitution_channel_review_state/);
  assert.match(schemaSource, /moral_trade_offer_validity_records/);
  assert.match(schemaSource, /offer_validity/);
  assert.match(schemaSource, /baseline_snapshot_hash/);
  assert.match(schemaSource, /offer_expires_at/);
  assert.match(schemaSource, /stale_reason_codes_json/);
  assert.match(schemaSource, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(schemaSource, /private_exchange_rate_quote/);
  assert.match(schemaSource, /public_moral_price_prohibited_bool/);
  assert.match(schemaSource, /global_exchange_rate_published_bool/);
  assert.match(schemaSource, /exact_counterparty_quote_disclosed_bool/);
  assert.match(schemaSource, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(schemaSource, /noncompensable_blocker/);
  assert.match(schemaSource, /protected_interest_type/);
  assert.match(schemaSource, /attempted_compensation_or_waiver_state/);
  assert.match(schemaSource, /moral_trade_batch_clearing_objective_records/);
  assert.match(schemaSource, /batch_clearing_objective/);
  assert.match(schemaSource, /tie_break_fairness_rule_type/);
  assert.match(schemaSource, /allocation_drivers_json/);
  assert.match(schemaSource, /moral_trade_sensitive_evidence_attestations/);
  assert.match(schemaSource, /sensitive_evidence_attestation/);
  assert.match(schemaSource, /claim_type/);
  assert.match(schemaSource, /challenge_route/);
  assert.match(schemaSource, /moral_trade_pilot_evidence_gates/);
  assert.match(schemaSource, /pilot_evidence/);
  assert.match(schemaSource, /pre_registered_criteria_hash/);
  assert.match(schemaSource, /success_metric_refs_json/);
  assert.match(schemaSource, /moral_trade_side_agreement_disclosures/);
  assert.match(schemaSource, /moral_trade_side_agreement_reviews/);
  assert.match(schemaSource, /moral_trade_trade_classification_records/);
  assert.match(schemaSource, /moral_trade_compensated_action_terms/);
  assert.match(schemaSource, /moral_trade_ordinary_service_procurement_reviews/);
  assert.match(schemaSource, /moral_trade_review_capacity_policies/);
  assert.match(schemaSource, /moral_trade_review_queue_records/);
  assert.match(schemaSource, /moral_trade_reviewer_panel_assignments/);
  assert.match(schemaSource, /visible_user_queue_status/);
  assert.match(schemaSource, /payment_authorization_expires_at/);
  assert.match(schemaSource, /moral_trade_participant_term_sheet_records/);
  assert.match(schemaSource, /moral_trade_counterparty_blinding_policies/);
  assert.match(schemaSource, /moral_trade_staged_counterparty_disclosure_records/);
  assert.match(schemaSource, /counterparty_blinding/);
  assert.match(schemaSource, /staged_counterparty_disclosure/);
  assert.match(schemaSource, /raw_counterparty_identity_public_bool/);
  assert.match(schemaSource, /moral_trade_protective_assessment_records/);
  assert.match(schemaSource, /moral_trade_negative_commitment_scopes/);
  assert.match(schemaSource, /moral_trade_action_reversibility_assessments/);
  assert.match(schemaSource, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(schemaSource, /moral_trade_authority_obligation_assessments/);
  assert.match(schemaSource, /reporting_integrity_assessment/);
  assert.match(schemaSource, /regulated_goods_hazardous_activity_assessment/);
  assert.match(schemaSource, /moral_trade_user_safety_policies/);
  assert.match(schemaSource, /moral_trade_contact_interaction_records/);
  assert.match(schemaSource, /moral_trade_abuse_report_records/);
  assert.match(schemaSource, /moral_trade_content_moderation_policies/);
  assert.match(schemaSource, /moral_trade_content_moderation_records/);
  assert.match(schemaSource, /user_safety/);
  assert.match(schemaSource, /content_moderation/);
  assert.match(schemaSource, /moral_trade_platform_fee_policies/);
  assert.match(schemaSource, /moral_trade_platform_fee_disclosures/);
  assert.match(schemaSource, /moral_trade_fx_policies/);
  assert.match(schemaSource, /moral_trade_fx_rate_snapshots/);
  assert.match(schemaSource, /moral_trade_notification_policies/);
  assert.match(schemaSource, /moral_trade_material_notice_records/);
  assert.match(schemaSource, /moral_trade_time_authority_policies/);
  assert.match(schemaSource, /moral_trade_deadline_records/);
  assert.match(schemaSource, /moral_trade_challenge_window_records/);
  assert.match(schemaSource, /moral_trade_payout_milestone_records/);
  assert.match(schemaSource, /raw_notice_payload_public_bool/);
  assert.match(schemaSource, /raw_fx_provider_payload_public_bool/);
  assert.match(provenanceSource, /validateMoralTradeProvenanceBundle/);
  assert.match(provenanceSource, /getMoralTradeProvenanceContract/);
  assert.match(provenanceSource, /validateMoralTradeProvenanceContract/);
  assert.match(provenanceSource, /getMoralTradeProvenanceSampleBundle/);
  assert.match(provenanceSource, /createMoralTradeTraceabilityEvent/);
  assert.match(provenanceSource, /createMoralTradeExternalEntityReference/);
  assert.match(provenanceSource, /MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES/);
  assert.match(provenanceSource, /validateMoralTradeProvenancePersistenceSql/);
  assert.match(provenanceSource, /persistence-table-coverage/);
  assert.match(provenanceSource, /provenance_contract_validator/);
  assert.match(provenanceSource, /external-entity-references/);
  assert.match(provenanceSource, /open_supply_hub_id/);
  assert.match(provenanceSource, /traceability-events/);
  assert.match(provenanceSource, /audit-question-answers/);
  assert.match(provenanceSource, /one-proof-one-claim/);
  assert.match(provenanceSource, /scope-alignment/);
  assert.match(schemaSource, /create table if not exists public\.moral_trade_evidence_artifacts/);
  assert.match(schemaSource, /create table if not exists public\.moral_trade_review_decisions/);
  assert.match(schemaSource, /decision_hash text not null/);
  assert.match(schemaSource, /unique \(owner_profile_id, idempotency_key\)/);
  assert.match(schemaSource, /create table if not exists public\.moral_trade_provenance_activities/);
  assert.match(schemaSource, /create table if not exists public\.moral_trade_traceability_events/);
  assert.match(schemaSource, /create table if not exists public\.moral_trade_state_transition_events/);
  assert.match(schemaSource, /audit_question_answers jsonb not null/);
  assert.match(schemaSource, /moral_trade_evidence_artifacts_select_visible/);
  assert.match(schemaSource, /moral_trade_traceability_events_insert_owner/);
  assert.match(schemaSource, /Provenance tables are append-only by policy/);
  assert.match(provenancePersistenceMigration, /moral_trade_external_entity_references/);
  assert.match(provenancePersistenceMigration, /moral_trade_state_transition_events_insert_owner/);
  assert.match(reviewDecisionIdempotencyMigration, /moral_trade_review_decisions/);
  assert.match(reviewDecisionIdempotencyMigration, /decision_hash/);
  assert.match(reviewDecisionIdempotencyMigration, /moral_trade_review_decisions_owner_idempotency_idx/);
  assert.match(reasoningPacketSource, /getMoralTradeReasoningPackets/);
  assert.match(reasoningPacketSource, /validateMoralTradeReasoningPacketContract/);
  assert.match(reasoningPacketSource, /cited evidence rows/i);
  assert.match(reasoningPacketSource, /decisionSteps/);
  assert.match(reasoningPacketSource, /decision-step-output/);
  assert.match(reasoningPacketSource, /step-by-step decision gates/);
  assert.match(reasoningPacketSource, /uncertainty flags/i);
  assert.match(reasoningPacketSource, /live private offers are not exported/);
  assert.match(reasoningPacketSource, /no_global_moral_ranking/);
  assert.match(reasoningPacketSource, /reasoning_packets_api_route_smoke/);
  assert.match(reasoningPacketSource, /reasoning_packets_recovery_payload_smoke/);
  assert.match(reasoningPacketSource, /buildMoralTradeReasoningPacketRoutePayload/);
  assert.match(reasoningPacketSource, /getMoralTradeReasoningPacketRecoveryContract/);
  assert.match(reasoningPacketSource, /packet_generation_failed/);
  assert.match(reasoningCenterErrorPage, /Reasoning Center recovery/);
  assert.match(reasoningCenterErrorPage, /Open packet JSON/);
  assert.match(reasoningCenterErrorPage, /does not change proposal\s+status/);
  assert.match(apiContractProfile, /recoveryMode/);
  assert.match(apiContractProfile, /packet_generation_failed recovery payload/);
  assert.match(apiContractProfile, /canonicalInstruction/);
  assert.match(apiContractProfile, /SHA-256 artifact hash/);
  assert.match(apiContractProfile, /sourceDocumentArtifacts/);
  assert.match(apiContractProfile, /Hash-checked Markdown and PDF source artifacts/);
  assert.match(apiContractProfile, /sourceStackReferences/);
  assert.match(apiContractProfile, /Recommended source-stack traceability records/);
  assert.match(apiContractProfile, /testingPlanCoverage/);
  assert.match(apiContractProfile, /schema, policy, evidence, privacy, fairness, UX, and resilience/);
  assert.match(apiContractProfile, /required implementation evidence phrases/);
  assert.match(moralTradeBuildInstruction, /Core Moral Trade Codex Build Instruction/);
  assert.match(
    moralTradeBuildInstruction,
    /node --import tsx --test src\/lib\/moral-trade\/\*\.test\.ts/,
  );
  assert.match(moralTradeBuildInstruction, /npm run lint/);
  assert.match(moralTradeBuildInstruction, /git diff --check/);
  assert.match(
    moralTradeBuildInstruction,
    /\/api\/moral-trade\/document-coverage\/health/,
  );
  assert.match(moralTradeBuildInstruction, /\/api\/moral-trade\/private-overlap\/contract/);
  assert.match(moralTradeBuildInstruction, /background-private-overlap\.test\.ts/);
  assert.match(moralTradeBuildInstruction, /does not prove live production liquidity/);
  assert.match(documentCoverageSource, /canonicalInstruction/);
  assert.match(documentCoverageSource, /canonicalInstructionHash/);
  assert.match(documentCoverageSource, /sourceDocumentArtifacts/);
  assert.match(documentCoverageSource, /sourceStackReferences/);
  assert.match(documentCoverageSource, /REQUIRED_RECOMMENDED_SOURCE_STACK_KEYS/);
  assert.match(documentCoverageSource, /source-stack:/);
  assert.match(documentCoverageSource, /testingPlanCoverage/);
  assert.match(documentCoverageSource, /requiredEvidencePhrases/);
  assert.match(documentCoverageSource, /evidencePhrases=/);
  assert.match(documentCoverageSource, /REQUIRED_TESTING_PLAN_LAYER_KEYS/);
  assert.match(documentCoverageSource, /testing-plan:/);
  assert.match(documentCoverageSource, /open_supply_hub/);
  assert.match(documentCoverageSource, /nist_ai_rmf_xai/);
  assert.match(documentCoverageSource, /human_ai_interaction/);
  assert.match(documentCoverageSource, /lime_shap_diagnostics/);
  assert.match(documentCoverageSource, /diagnostic-only/);
  assert.match(documentCoverageSource, /schema_tests/);
  assert.match(documentCoverageSource, /policy_tests/);
  assert.match(documentCoverageSource, /evidence_tests/);
  assert.match(documentCoverageSource, /privacy_tests/);
  assert.match(documentCoverageSource, /fairness_tests/);
  assert.match(documentCoverageSource, /ux_tests/);
  assert.match(documentCoverageSource, /resilience_tests/);
  assert.match(documentCoverageSource, /hashFileIfExists/);
  assert.match(documentCoverageSource, /expectedSha256/);
  assert.match(documentCoverageSource, /source-artifact:/);
  assert.match(documentCoverageSource, /hash-checked/);
  assert.match(documentCoverageSource, /payment-custody/);
  assert.match(documentCoverageSource, /authenticated workflows/);
  assert.match(documentCoverageSource, /instruction:canonical-build/);
  assert.match(documentCoverageSource, /sha256/);
  assert.match(documentCoverageHealthRoute, /canonicalInstruction/);
  assert.match(documentCoverageHealthRoute, /sourceDocumentArtifacts/);
  assert.match(documentCoverageHealthRoute, /sourceStackReferences/);
  assert.match(documentCoverageHealthRoute, /testingPlanCoverage/);
  assert.match(documentCoverageHealthRoute, /requiredEvidencePhrases/);
  assert.match(documentCoverageHealthRoute, /expectedHash/);
  assert.match(documentCoverageHealthRoute, /const canonicalInstruction/);
  assert.match(documentCoverageHealthRoute, /artifactHash/);
  assert.match(documentCoverageHealthRoute, /validation\.canonicalInstructionHash/);
  assert.match(copilotSource, /buildMoralTradeCopilotOutput/);
  assert.match(copilotSource, /normalizeMoralTradeCopilotEvidenceMetadata/);
  assert.match(copilotSource, /auditMoralTradeCopilotStrictInputBundle/);
  assert.match(copilotSource, /COPILOT_FORBIDDEN_TOP_LEVEL_KEY_PATTERN/);
  assert.match(copilotSource, /isApprovedCopilotCitation/);
  assert.match(copilotSource, /COPILOT_FORBIDDEN_CITATION_PATTERN/);
  assert.match(copilotSource, /COPILOT_REQUIRED_REVIEWER_SUMMARY_SECTIONS/);
  assert.match(copilotSource, /MORAL_TRADE_COPILOT_EVIDENCE_METADATA_REDACTIONS/);
  assert.match(copilotSource, /validateMoralTradeCopilotReviewRouteImplementation/);
  assert.match(copilotSource, /validateMoralTradeCopilotContract/);
  assert.match(copilotContract, /strictInputBundle/);
  assert.match(copilotContract, /evidence-metadata review/);
  assert.match(copilotContract, /promptTemplates/);
  assert.match(copilotContract, /system_prompt/);
  assert.match(copilotContract, /draft_repair_prompt/);
  assert.match(copilotContract, /matching_prompt/);
  assert.match(copilotContract, /reviewer_summary_prompt/);
  assert.match(copilotContract, /Summaries stay under 180 words/);
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
  assert.match(matchSignalSource, /privacyPolicyId/);
  assert.match(matchSignalSource, /disclosureStage/);
  assert.match(matchSignalSource, /MORAL_TRADE_MATCH_SIGNAL_PRIVACY_POLICY_ID/);
  assert.match(matchSignalSource, /participantExplanation/);
  assert.match(matchSignalSource, /Why you are seeing this match/);
  assert.match(matchSignalSource, /Exact wishes and contact details are still hidden/);
  assert.match(matchSignalSource, /ideology_or_psychology_inferences/);
  assert.match(matchSignalSource, /redacted_profile_match_preview_only/);
  assert.match(matchSignalSource, /match_signal_evaluate_route_contract/);
  assert.match(backgroundExplanationsSource, /buildMatchInboxBadges/);
  assert.match(backgroundExplanationsSource, /buildPrivacySafeMatchAuditSummary/);
  assert.match(backgroundExplanationsSource, /buildPrivacySafeMatchDigestLine/);
  assert.match(backgroundExplanationsSource, /confidence band is a review prompt/);
  assert.match(backgroundExplanationsSource, /trustBadge/);
  assert.match(backgroundExplanationsSource, /riskBadge/);
  assert.match(backgroundExplanationsSource, /participantActions/);
  assert.match(backgroundNetworkingPage, /BACKGROUND_PUBLIC_SAFETY_CARDS/);
  assert.match(backgroundNetworkingPage, /BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS/);
  assert.match(backgroundNetworkingPage, /background-technical-details/);
  assert.match(dashboardPage, /Trust and risk badges/);
  assert.match(dashboardPage, /Next safe actions/);
  assert.match(dashboardPage, /Reason codes/);
  assert.match(dashboardPage, /Minimum compatibility threshold/);
  assert.match(dashboardPage, /compatibility signal/);
  assert.equal(dashboardPage.includes("Fit score"), false);
  assert.match(challengeAppealSource, /evaluateMoralTradeChallengeAppeal/);
  assert.match(challengeAppealSource, /evaluateMoralTradeAppealCase/);
  assert.match(challengeAppealSource, /validateMoralTradeChallengeAppealContract/);
  assert.match(challengeAppealSource, /moral_trade_appeal_policies/);
  assert.match(challengeAppealSource, /moral_trade_appeal_cases/);
  assert.match(challengeAppealSource, /appeal_case/);
  assert.match(challengeAppealSource, /affected_party_standing/);
  assert.match(challengeAppealSource, /wrong_scope_evidence_review/);
  assert.match(challengeAppealSource, /privacy_disclosure_review/);
  assert.match(challengeAppealSource, /externality_remedy_review/);
  assert.match(challengeAppealSource, /no_unrelated_moral_disagreement/);
  assert.match(challengeAppealSource, /provenance_activity_required/);
  assert.match(challengeAppealSource, /deterministic_challenge_appeal_scope_only/);
  assert.match(challengeAppealSource, /notice_missing/);
  assert.match(challengeAppealSource, /deadline_expired/);
  assert.match(challengeAppealSource, /neutral_review_missing/);
  assert.match(challengeAppealSource, /settled_obligation_reopen_attempted/);
  assert.match(challengeAppealSource, /challenge_appeal_evaluate_route_contract/);
  assert.match(disclosureSource, /getMoralTradeDisclosureContract/);
  assert.match(disclosureSource, /validateMoralTradeDisclosureContract/);
  assert.match(disclosureSource, /deterministic_disclosure_grant_scope_only/);
  assert.match(disclosureSource, /BACKGROUND_DISCLOSURE_FIELDS/);
  assert.match(disclosureSource, /exact_private_wishes_before_consent/);
  assert.match(disclosureSource, /contact_details_before_introduction/);
  assert.match(disclosureSource, /raw_source_notes_redacted/);
  assert.match(disclosureSource, /owner_approval_required/);
  assert.match(disclosureSource, /step_up_auth_required/);
  assert.match(disclosureSource, /disclosure_contact_step_up_contract_smoke/);
  assert.match(disclosureSource, /searchPrivacyControls/);
  assert.match(disclosureSource, /daily_registry_query_budget/);
  assert.match(disclosureSource, /sparse_result_privacy_floor/);
  assert.match(disclosureSource, /disclosure_query_budget_contract_smoke/);
  assert.match(disclosureSource, /disclosure_grant_evaluate_route_contract/);
  assert.match(operationsSource, /validateMoralTradeOperationsProfile/);
  assert.match(operationsSource, /decideMoralTradeFallback/);
  assert.match(operationsSource, /fallback_path_unavailable/);
  assert.match(operationsSource, /replay_hash_mismatch/);
  assert.match(operationsSource, /REQUIRED_RETENTION_CONTROLS/);
  assert.match(operationsSource, /retention-lifecycle-controls/);
  assert.match(operationsProfile, /strict_transport_security/);
  assert.match(operationsProfile, /wish_registry_search/);
  assert.match(operationsProfile, /analytics_ingest/);
  assert.match(operationsProfile, /retentionControls/);
  assert.match(operationsProfile, /account_profile_lifecycle/);
  assert.match(operationsProfile, /private_wish_source_lifecycle/);
  assert.match(operationsProfile, /evidence_provenance_lifecycle/);
  assert.match(operationsProfile, /payment_donation_reference_lifecycle/);
  assert.match(operationsProfile, /analytics_attribution_lifecycle/);
  assert.match(operationsProfile, /Browser-level opt-out clears attribution/);
  assert.match(operationsProfile, /notification_delivery_lifecycle/);
  assert.match(operationsProfile, /email_outbox_safety_gate/);
  assert.match(operationsProfile, /email_outbox_suppression_count/);
  assert.match(operationsProfile, /unsafe_email_no_provider_send/);
  assert.match(operationsProfile, /email_outbox_safety_gate_smoke/);
  assert.match(operationsProfile, /agreement IDs/);
  assert.match(operationsProfile, /data_right_request_lifecycle/);
  assert.match(operationsProfile, /retention_lifecycle_contract_smoke/);
  assert.match(operationsProfileSchema, /retentionControls/);
  assert.match(operationsProfileSchema, /retentionWindow/);
  assert.match(operationsProfile, /copilot_fallback_rate/);
  assert.match(operationsProfile, /invalid_copilot_output_no_state_change/);
  assert.match(operationsProfile, /resilience_fallback_audit/);
  assert.match(operationsProfile, /human_controlled_safety/);
  assert.match(securitySource, /validateMoralTradeSecurityProfile/);
  assert.match(securitySource, /validateMoralTradeSecurityImplementation/);
  assert.match(securitySource, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(securitySource, /provider-boundary-and-nonclaims/);
  assert.match(securitySource, /scale_control_not_ready/);
  assert.match(securitySource, /operator-mfa-gate-source/);
  assert.match(securitySource, /participant-session-review-source/);
  assert.match(backgroundAccountSecuritySource, /BACKGROUND_SESSION_REVIEW_CONTROL_VERSION/);
  assert.match(backgroundAccountSecuritySource, /supabase\.auth\.getClaims/);
  assert.match(backgroundAccountSecuritySource, /session_id/);
  assert.match(backgroundAccountSecuritySource, /accessTokenWindowStatus/);
  assert.match(backgroundActionsSource, /signOut\(\{\s*scope:\s*"others"\s*\}\)/);
  assert.match(backgroundAccountSecurityPanelSource, /Revoke other sessions/);
  assert.match(backgroundAccountSecurityPanelSource, /sessionIdSuffix/);
  assert.match(adminSource, /evaluateAdminOperatorAccess/);
  assert.match(adminSource, /verifiedTotpCount < 1/);
  assert.match(adminSource, /currentLevel !== "aal2"/);
  assert.match(adminPageSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(adminPageSource, /evaluateAdminOperatorAccess/);
  assert.match(adminPageSource, /\/dashboard#account-security/);
  assert.match(adminGrowthPageSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(backgroundActionsSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(backgroundActionsSource, /evaluateAdminOperatorAccess/);
  assert.match(actionsSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(actionsSource, /evaluateAdminOperatorAccess/);
  assert.match(mpgfAdminActionsSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(mpgfAdminActionsSource, /evaluateAdminOperatorAccess/);
  assert.match(mpgfAdminPageSource, /loadBackgroundAccountSecuritySummary/);
  assert.match(securityProfile, /provider_encryption_at_rest/);
  assert.match(securityProfile, /field_level_encryption_not_claimed/);
  assert.match(securityProfile, /two_factor_admin_gate/);
  assert.match(securityProfile, /participant_session_review_revocation/);
  assert.match(securityProfile, /revoke other active Supabase sessions/);
  assert.match(securityProfile, /\"status\": \"implemented\"/);
  assert.match(securityProfile, /active Supabase authenticator MFA session \(AAL2\)/);
  assert.match(securityProfile, /device_session_review_gate/);
  assert.match(securityProfile, /key_rotation_gate/);
  assert.match(securityProfile, /incident_response_reporting/);
  assert.match(securityProfile, /platform_abuse_throttling/);
  assert.match(securityProfile, /security_implementation_source_smoke/);
  assert.match(securityProfile, /Moral Trade does not claim custom field-level encryption/);
  assert.match(incidentResponseSource, /validateMoralTradeIncidentResponseProfile/);
  assert.match(incidentResponseSource, /auditMoralTradeIncidentReadinessGate/);
  assert.match(incidentResponseSource, /incident_response_profile_validator/);
  assert.match(incidentResponseSource, /raw private records stay redacted/);
  assert.match(incidentResponseProfile, /privacy_leakage/);
  assert.match(incidentResponseProfile, /security_control_failure/);
  assert.match(incidentResponseProfile, /payment_provider_error/);
  assert.match(incidentResponseProfile, /copilot_output_violation/);
  assert.match(incidentResponseProfile, /sev0_active_sensitive_exposure/);
  assert.match(incidentResponseProfile, /affected_participant_notice_required/);
  assert.match(incidentResponseProfile, /public_aggregate_only/);
  assert.match(incidentResponseProfile, /validator_blockers_linked/);
  assert.match(incidentResponseProfile, /Moral Trade does not claim 24\/7 staffed security operations/);
  assert.match(evaluationSource, /validateMoralTradeEvaluationProfile/);
  assert.match(evaluationSource, /auditMoralTradeSurfacingParity/);
  assert.match(evaluationSource, /auditMoralTradeUxReadiness/);
  assert.match(evaluationSource, /auditMoralTradeWorkflowQuality/);
  assert.match(evaluationSource, /getMoralTradeEvaluationSampleAudits/);
  assert.match(evaluationSource, /sample-audits/);
  assert.match(evaluationSource, /workflow_quality_sample_too_small/);
  assert.match(evaluationSource, /blocked_proposal_precision_below_target/);
  assert.match(evaluationSource, /privacy_leakage_incident_present/);
  assert.match(evaluationSource, /false_match_rate_above_target/);
  assert.match(evaluationSource, /human_overrule_reason_coverage_incomplete/);
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
  assert.match(evaluationProfile, /workflow_quality_audit/);
  assert.match(evaluationProfile, /blocked_proposal_precision/);
  assert.match(evaluationProfile, /false_match_rate/);
  assert.match(evaluationProfile, /human_overrule_rate/);
  assert.match(evaluationProfile, /no_raw_private_wish_text/);
  assert.match(evaluationProfile, /deviation_review_log_redacted/);
  assert.match(evaluationProfile, /human_controlled_decisions/);
  assert.match(performanceSource, /validateMoralTradePerformanceProfile/);
  assert.match(performanceSource, /auditMoralTradePerformanceSnapshot/);
  assert.match(performanceSource, /auditMoralTradeRouteRecoveryManifest/);
  assert.match(performanceSource, /route_segment_error_boundary/);
  assert.match(performanceSource, /evidenceFile/);
  assert.match(performanceSource, /route_recovery_evidence_missing/);
  assert.match(performanceSource, /route_specific_viewer_fallback/);
  assert.match(performanceSource, /packet_generation_recovery_notice/);
  assert.match(performanceSource, /packet_generation_failed_contract/);
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
  assert.match(performanceProfile, /route segment error boundary/);
  assert.match(performanceProfile, /\/api\/moral-trade\/reasoning\/packets/);
  assert.match(performanceProfile, /validator blockers instead of a public route crash/);
  assert.match(performanceProfile, /instrument_before_optimize/);
  assert.match(performanceProfile, /Moral Trade does not claim verified Core Web Vitals/);
  assert.match(externalitySource, /validateMoralTradeExternalityProfile/);
  assert.match(externalitySource, /evaluateMoralTradeExternalityReview/);
  assert.match(externalitySource, /getTriggerStandardMatrix/);
  assert.match(externalitySource, /triggerStandardMatrix/);
  assert.match(externalitySource, /affected_party_standing_required/);
  assert.match(externalitySource, /source_standard_required/);
  assert.match(externalitySource, /trigger_standard_matrix_missing/);
  assert.match(externalitySource, /trigger-standard-matrix/);
  assert.match(externalityProfile, /triggerStandardMatrix/);
  assert.match(externalityProfile, /trigger_standard_matrix_contract/);
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
  assert.match(aiGovernanceSource, /sample-documentation-packets/);
  assert.match(aiGovernanceSource, /sampleDocumentationPacketFailures/);
  assert.match(aiGovernanceSource, /deterministic-decisioning/);
  assert.match(aiGovernanceProfile, /model_card/);
  assert.match(aiGovernanceProfile, /dataset_datasheet/);
  assert.match(aiGovernanceProfile, /benchmark_slices/);
  assert.match(aiGovernanceProfile, /documentationTemplates/);
  assert.match(aiGovernanceProfile, /sampleDocumentationPackets/);
  assert.match(aiGovernanceProfile, /sample_documentation_packet_contract/);
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
  assert.match(apiContractSource, /moral_trade_participant_eligibility_contract/);
  assert.match(apiContractSource, /moral_trade_account_security_contract/);
  assert.match(apiContractSource, /moral_trade_reviewer_quality_contract/);
  assert.match(apiContractSource, /moral_trade_anti_enumeration_contract/);
  assert.match(apiContractSource, /moral_trade_privacy_governance_contract/);
  assert.match(apiContractSource, /moral_trade_impact_claim_contract/);
  assert.match(apiContractSource, /moral_trade_matching_clearing_contract/);
  assert.match(apiContractSource, /moral_trade_baseline_integrity_contract/);
  assert.match(apiContractSource, /moral_trade_agreement_amendment_contract/);
  assert.match(apiContractSource, /moral_trade_production_readiness_contract/);
  assert.match(apiContractSource, /moral_trade_side_agreement_contract/);
  assert.match(apiContractSource, /moral_trade_post_clear_audit_contract/);
  assert.match(apiContractSource, /moral_trade_trade_classification_contract/);
  assert.match(apiContractSource, /moral_trade_template_conformance_contract/);
  assert.match(apiContractSource, /moral_trade_review_capacity_contract/);
  assert.match(apiContractSource, /moral_trade_protective_assessment_contract/);
  assert.match(
    apiContractSource,
    /moral_trade_user_safety_content_moderation_contract/,
  );
  assert.match(
    apiContractSource,
    /moral_trade_financial_settlement_controls_contract/,
  );
  assert.match(apiContractSource, /provenance-schema-validator/);
  assert.match(apiContractSource, /moral_trade_schema_registry/);
  assert.match(apiContractSource, /schema-registry-route/);
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
  assert.match(apiContractSource, /moral_trade_incident_response_health/);
  assert.match(apiContractSource, /incident-response-health-route/);
  assert.match(apiContractSource, /moral_trade_performance_health/);
  assert.match(apiContractSource, /moral_trade_externality_health/);
  assert.match(apiContractSource, /moral_trade_ai_governance_health/);
  assert.match(apiContractSource, /moral_trade_ai_shadow_contract/);
  assert.match(apiContractSource, /moral_trade_background_capability_gates_contract/);
  assert.match(apiContractSource, /moral_trade_private_overlap_contract/);
  assert.match(apiContractSource, /moral_trade_background_rls_audit_contract/);
  assert.match(apiContractSource, /moral_trade_transparency_report/);
  assert.match(apiContractSource, /moral_trade_api_contract/);
  assert.match(apiContractSource, /auditMoralTradeApiImplementationContract/);
  assert.match(apiContractSource, /implementation-backed-rate-limits-and-cache/);
  assert.match(apiContractSource, /field-level-schema-contracts/);
  assert.match(apiContractProfile, /moral_trade_api_contract/);
  assert.match(apiContractProfile, /api_contract_response/);
  assert.match(apiContractProfile, /api_contract_route_contract/);
  assert.match(apiContractProfile, /data_model_contract_response/);
  assert.match(apiContractProfile, /moral_trade_data_model_contract/);
  assert.match(apiContractProfile, /data-model contract validation blockers/);
  assert.match(apiContractProfile, /private wishes, source notes, saved searches, privacy grants/);
  assert.match(apiContractProfile, /policy_bundle_contract_response/);
  assert.match(apiContractProfile, /moral_trade_policy_bundle_contract/);
  assert.match(apiContractProfile, /policy-bundle validation blockers/);
  assert.match(apiContractProfile, /unseeded prohibited patterns/);
  assert.match(apiContractProfile, /participant_eligibility_contract_response/);
  assert.match(apiContractProfile, /moral_trade_participant_eligibility_contract/);
  assert.match(apiContractProfile, /raw identity artifacts, linkage signals/);
  assert.match(apiContractProfile, /account_security_contract_response/);
  assert.match(apiContractProfile, /moral_trade_account_security_contract/);
  assert.match(apiContractProfile, /device fingerprints, session anomalies/);
  assert.match(apiContractProfile, /reviewer_quality_contract_response/);
  assert.match(apiContractProfile, /moral_trade_reviewer_quality_contract/);
  assert.match(apiContractProfile, /reviewer identities, private reviewer notes, conflict facts/);
  assert.match(apiContractProfile, /anti_enumeration_contract_response/);
  assert.match(apiContractProfile, /moral_trade_anti_enumeration_contract/);
  assert.match(apiContractProfile, /raw query text, exact hidden result counts/);
  assert.match(apiContractProfile, /privacy_governance_contract_response/);
  assert.match(apiContractProfile, /moral_trade_privacy_governance_contract/);
  assert.match(apiContractProfile, /raw private artifacts, exact wishes, contact details/);
  assert.match(apiContractProfile, /impact_claim_contract_response/);
  assert.match(apiContractProfile, /moral_trade_impact_claim_contract/);
  assert.match(apiContractProfile, /private evidence, reviewer notes, methodology payloads/);
  assert.match(apiContractProfile, /matching_clearing_contract_response/);
  assert.match(apiContractProfile, /moral_trade_matching_clearing_contract/);
  assert.match(apiContractProfile, /raw input bundles, private counterparty data/);
  assert.match(apiContractProfile, /baseline_integrity_contract_response/);
  assert.match(apiContractProfile, /moral_trade_baseline_integrity_contract/);
  assert.match(apiContractProfile, /raw baseline narratives, private evidence/);
  assert.match(apiContractProfile, /agreement_amendment_contract_response/);
  assert.match(apiContractProfile, /moral_trade_agreement_amendment_contract/);
  assert.match(apiContractProfile, /private amendment narratives, participant identities/);
  assert.match(apiContractProfile, /production_readiness_contract_response/);
  assert.match(apiContractProfile, /moral_trade_production_readiness_contract/);
  assert.match(apiContractProfile, /account-security events, backup contents, configuration values/);
  assert.match(apiContractProfile, /recipient_destination_contract_response/);
  assert.match(apiContractProfile, /moral_trade_recipient_destination_contract/);
  assert.match(apiContractProfile, /bank details, wallet addresses, raw donation links/);
  assert.match(apiContractProfile, /recipient_acceptance_contract_response/);
  assert.match(apiContractProfile, /moral_trade_recipient_acceptance_contract/);
  assert.match(apiContractProfile, /recipient-acceptance and adverse-association governance/);
  assert.match(apiContractProfile, /raw adverse-association evidence/);
  assert.match(apiContractProfile, /ai_preference_elicitation_contract_response/);
  assert.match(apiContractProfile, /moral_trade_ai_preference_elicitation_contract/);
  assert.match(apiContractProfile, /AI-preference-elicitation governance/);
  assert.match(apiContractProfile, /hidden willingness-to-pay estimates/);
  assert.match(apiContractProfile, /participant-specific elicitation records/);
  assert.match(apiContractProfile, /post_clear_audit_contract_response/);
  assert.match(apiContractProfile, /moral_trade_post_clear_audit_contract/);
  assert.match(apiContractProfile, /post-clear audit sampling governance/);
  assert.match(apiContractProfile, /raw payment evidence/);
  assert.match(apiContractProfile, /public moral reputation scores/);
  assert.match(apiContractProfile, /non_public_goods_subsidy_contract_response/);
  assert.match(apiContractProfile, /moral_trade_non_public_goods_subsidy_contract/);
  assert.match(apiContractProfile, /non-public-goods subsidy governance/);
  assert.match(apiContractProfile, /sponsor identity hashes/);
  assert.match(apiContractProfile, /participant-specific subsidy records/);
  assert.match(apiContractProfile, /direct_pair_clearing_contract_response/);
  assert.match(apiContractProfile, /moral_trade_direct_pair_clearing_contract/);
  assert.match(apiContractProfile, /direct-pair clearing governance/);
  assert.match(apiContractProfile, /direct contact details/);
  assert.match(apiContractProfile, /private surplus estimates/);
  assert.match(apiContractProfile, /cause_bucket_taxonomy_contract_response/);
  assert.match(apiContractProfile, /moral_trade_cause_bucket_taxonomy_contract/);
  assert.match(apiContractProfile, /cause-bucket taxonomy governance/);
  assert.match(apiContractProfile, /protected-trait facts/);
  assert.match(apiContractProfile, /inferred psychology/);
  assert.match(apiContractProfile, /resource_compatibility_contract_response/);
  assert.match(apiContractProfile, /moral_trade_resource_compatibility_contract/);
  assert.match(apiContractProfile, /resource-compatibility governance/);
  assert.match(apiContractProfile, /zero-sum control-claim/);
  assert.match(apiContractProfile, /private resource claims/);
  assert.match(apiContractProfile, /net_offset_accounting_contract_response/);
  assert.match(apiContractProfile, /moral_trade_net_offset_accounting_contract/);
  assert.match(apiContractProfile, /net-offset accounting governance/);
  assert.match(apiContractProfile, /gross-volume exclusion/);
  assert.match(apiContractProfile, /private baseline details/);
  assert.match(apiContractProfile, /offer_validity_contract_response/);
  assert.match(apiContractProfile, /moral_trade_offer_validity_contract/);
  assert.match(apiContractProfile, /offer-validity governance/);
  assert.match(apiContractProfile, /validity-window rule/);
  assert.match(apiContractProfile, /private payment credentials/);
  assert.match(apiContractProfile, /private_exchange_rate_contract_response/);
  assert.match(apiContractProfile, /moral_trade_private_exchange_rate_contract/);
  assert.match(apiContractProfile, /private exchange-rate governance/);
  assert.match(apiContractProfile, /public non-price rule/);
  assert.match(apiContractProfile, /global moral exchange rates/);
  assert.match(apiContractProfile, /noncompensable_blocker_contract_response/);
  assert.match(apiContractProfile, /moral_trade_noncompensable_blocker_contract/);
  assert.match(apiContractProfile, /noncompensable blocker governance/);
  assert.match(apiContractProfile, /protected-interest categories/);
  assert.match(apiContractProfile, /exact protected-interest facts/);
  assert.match(apiContractProfile, /batch_clearing_objective_contract_response/);
  assert.match(apiContractProfile, /moral_trade_batch_clearing_objective_contract/);
  assert.match(apiContractProfile, /batch-clearing objective governance/);
  assert.match(apiContractProfile, /prohibited allocation drivers/);
  assert.match(apiContractProfile, /sensitive_evidence_attestation_contract_response/);
  assert.match(apiContractProfile, /moral_trade_sensitive_evidence_attestation_contract/);
  assert.match(apiContractProfile, /sensitive-evidence attestation governance/);
  assert.match(apiContractProfile, /raw private artifacts/);
  assert.match(apiContractProfile, /pilot_evidence_contract_response/);
  assert.match(apiContractProfile, /moral_trade_pilot_evidence_contract/);
  assert.match(apiContractProfile, /pilot-evidence governance/);
  assert.match(apiContractProfile, /matched volume alone/);
  assert.match(apiContractProfile, /side_agreement_contract_response/);
  assert.match(apiContractProfile, /moral_trade_side_agreement_contract/);
  assert.match(apiContractProfile, /side-agreement disclosure/);
  assert.match(apiContractProfile, /private side-arrangement narratives/);
  assert.match(apiContractProfile, /trade_classification_contract_response/);
  assert.match(apiContractProfile, /moral_trade_trade_classification_contract/);
  assert.match(apiContractProfile, /trade-classification governance/);
  assert.match(apiContractProfile, /private moral-reason narratives/);
  assert.match(apiContractProfile, /template_conformance_contract_response/);
  assert.match(apiContractProfile, /moral_trade_template_conformance_contract/);
  assert.match(apiContractProfile, /template-conformance governance/);
  assert.match(apiContractProfile, /participant-specific template instance records/);
  assert.match(apiContractProfile, /review_capacity_contract_response/);
  assert.match(apiContractProfile, /moral_trade_review_capacity_contract/);
  assert.match(apiContractProfile, /review-capacity and queue-admission governance/);
  assert.match(apiContractProfile, /participant-specific queue records/);
  assert.match(apiContractProfile, /participant_term_sheet_contract_response/);
  assert.match(apiContractProfile, /moral_trade_participant_term_sheet_contract/);
  assert.match(apiContractProfile, /participant-term-sheet and counterparty-disclosure governance/);
  assert.match(apiContractProfile, /participant-specific term sheets/);
  assert.match(apiContractProfile, /raw counterparty identities/);
  assert.match(apiContractProfile, /protective_assessment_contract_response/);
  assert.match(apiContractProfile, /moral_trade_protective_assessment_contract/);
  assert.match(apiContractProfile, /protective-assessment governance/);
  assert.match(apiContractProfile, /protected-trait facts, authority documents/);
  assert.match(
    apiContractProfile,
    /user_safety_content_moderation_contract_response/,
  );
  assert.match(
    apiContractProfile,
    /moral_trade_user_safety_content_moderation_contract/,
  );
  assert.match(apiContractProfile, /content-moderation contract/);
  assert.match(apiContractProfile, /private messages, reporter identities/);
  assert.match(apiContractProfile, /financial_settlement_controls_contract_response/);
  assert.match(apiContractProfile, /moral_trade_financial_settlement_controls_contract/);
  assert.match(apiContractProfile, /financial-settlement-controls governance/);
  assert.match(apiContractProfile, /raw FX provider payloads/);
  assert.match(apiContractProfile, /schema_registry_response/);
  assert.match(apiContractProfile, /moral_trade_schema_registry/);
  assert.match(apiContractProfile, /data-model schema/);
  assert.match(apiContractProfile, /profile_export/);
  assert.match(apiContractProfile, /copilot_review_request/);
  assert.match(apiContractProfile, /copilot_review_response/);
  assert.match(apiContractProfile, /evidenceMetadata/);
  assert.match(apiContractProfile, /evidenceMetadataSummary/);
  assert.match(apiContractProfile, /raw evidence artifacts/);
  assert.match(apiContractProfile, /match_signal_contract_response/);
  assert.match(apiContractProfile, /ai_shadow_contract_response/);
  assert.match(apiContractProfile, /moral_trade_ai_shadow_contract/);
  assert.match(apiContractProfile, /approved, redacted source summaries/);
  assert.match(apiContractProfile, /cannot publish matches, disclose details, contact counterparties, rank users/);
  assert.match(apiContractProfile, /background_capability_gates_contract_response/);
  assert.match(apiContractProfile, /moral_trade_background_capability_gates_contract/);
  assert.match(apiContractProfile, /DPIA, lawful-basis, privacy-design, external-review/);
  assert.match(apiContractProfile, /source connector workers, AI assist mode, and private-overlap computation cannot expand/);
  assert.match(apiContractProfile, /private_overlap_contract_response/);
  assert.match(apiContractProfile, /moral_trade_private_overlap_contract/);
  assert.match(apiContractProfile, /formal cryptographic review/);
  assert.match(apiContractProfile, /must not use free text or reveal raw tags/);
  assert.match(apiContractProfile, /background_rls_audit_contract_response/);
  assert.match(apiContractProfile, /moral_trade_background_rls_audit_contract/);
  assert.match(apiContractProfile, /row-level security, participant-scoped policies/);
  assert.match(apiContractProfile, /sensitive ciphertext\/version storage/);
  assert.match(apiContractProfile, /transparency_report_response/);
  assert.match(apiContractProfile, /moral_trade_transparency_report/);
  assert.match(apiContractProfile, /Aggregate-only review outcomes/);
  assert.match(apiContractProfile, /small nonzero samples are suppressed/);
  assert.match(apiContractProfile, /match_signal_evaluate_request/);
  assert.match(apiContractProfile, /match_signal_evaluate_response/);
  assert.match(apiContractProfile, /"key": "match_signal"/);
  assert.match(apiContractProfile, /privacyPolicyId/);
  assert.match(apiContractProfile, /disclosureStage/);
  assert.match(apiContractProfile, /redacted_profile_match_preview_only/);
  assert.match(apiContractProfile, /never store submitted redacted profiles/);
  assert.match(apiContractProfile, /rank moral value/);
  assert.match(apiContractProfile, /challenge_appeal_contract_response/);
  assert.match(apiContractProfile, /first-class appeal-case record metadata/);
  assert.match(apiContractProfile, /appeal-case record contract/);
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
  assert.match(apiContractProfile, /search privacy controls/);
  assert.match(apiContractProfile, /mutate privacy grants/);
  assert.match(apiContractProfile, /review_workflow_contract_response/);
  assert.match(apiContractProfile, /moral-trade-api-contract-v0\.75-2026-06/);
  assert.match(apiContractProfile, /user-facing status\/blocker explanation governance/);
  assert.match(apiContractProfile, /user_facing_status_contract_response/);
  assert.match(apiContractProfile, /moral_trade_user_facing_status_contract/);
  assert.match(apiContractProfile, /privacy-safe blocker explanations/);
  assert.match(apiContractProfile, /money and obligation effects/);
  assert.match(apiContractProfile, /review_workflow_evaluate_request/);
  assert.match(apiContractProfile, /review_workflow_evaluate_response/);
  assert.match(apiContractProfile, /reasoning_packets_response/);
  assert.match(apiContractProfile, /moral_trade_reasoning_packets/);
  assert.match(apiContractProfile, /Reasoning Center packet contract validator result/);
  assert.match(apiContractProfile, /decision steps/);
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
  assert.match(apiContractProfile, /incident_response_health_response/);
  assert.match(apiContractProfile, /moral_trade_incident_response_health/);
  assert.match(apiContractProfile, /Incident-response validator result/);
  assert.match(apiContractProfile, /raw private wishes, source notes, contact details, payment secrets/);
  assert.match(apiContractProfile, /performance_health_response/);
  assert.match(apiContractProfile, /Core Web Vitals, API latency, or loading-state readiness/);
  assert.match(apiContractProfile, /externality_health_response/);
  assert.match(apiContractProfile, /trigger-standard matrix/);
  assert.match(apiContractProfile, /ai_governance_health_response/);
  assert.match(apiContractProfile, /machine-checkable documentation templates/);
  assert.match(apiContractProfile, /external entity reference/);
  assert.match(apiContractProfile, /external entity dedupe/);
  assert.match(apiContractProfile, /Provenance object contract validator result/);
  assert.match(apiContractProfile, /public_offers_collection_response/);
  assert.match(apiContractProfile, /public_offer_detail_response/);
  assert.match(apiContractProfile, /public_offers_facets_response/);
  assert.match(apiContractProfile, /decision pipeline/);
  assert.match(apiContractProfile, /public_offer_follow_response/);
  assert.match(apiContractProfile, /public_offer_create_similar_response/);
  assert.match(apiContractProfile, /saved_search_create_response/);
  assert.match(apiContractProfile, /offer_collection_read/);
  assert.match(apiContractProfile, /offer_detail_read/);
  assert.match(apiContractProfile, /offer_facets_read/);
  assert.match(apiContractProfile, /offer_create_similar/);
  assert.match(apiContractProfile, /saved_search_write/);
  assert.match(apiContractProfile, /persistenceTables/);
  assert.match(apiContractProfile, /sample-bundle summary/);
  assert.match(apiContractProfile, /undocumented ML cannot rank/);
  assert.match(apiContractProfile, /private_no_store/);
  assert.match(apiContractProfile, /query strings and hashes are stripped/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /Content-Security-Policy-Report-Only/);
  assert.match(nextConfig, /private, no-store/);
  assert.match(technicalSpecPage, /public validator contract/);
  assert.match(technicalSpecPage, /Document coverage contract/);
  assert.match(technicalSpecPage, /documentCoverageProfile\.testingPlanCoverage/);
  assert.match(technicalSpecPage, /documentCoverageEvidencePhraseCount/);
  assert.match(technicalSpecPage, /Requirement phrase gates/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/document-coverage\/health/);
  assert.match(technicalSpecPage, /Public readiness matrix/);
  assert.match(technicalSpecPage, /Every canonical contract route is visible before readiness is claimed/);
  assert.match(technicalSpecPage, /publicContractReadiness/);
  assert.match(technicalSpecPage, /publicContractPassCount/);
  assert.match(technicalSpecPage, /unlistedCanonicalRoutes/);
  assert.match(technicalSpecPage, /All canonical public contract routes have a visible readiness row/);
  assert.match(technicalSpecPage, /getMoralTradeTransparencyReportContract/);
  assert.match(technicalSpecPage, /validateMoralTradeTransparencyReportContract/);
  assert.match(technicalSpecPage, /getBackgroundPrivateOverlapContract/);
  assert.match(technicalSpecPage, /validateBackgroundPrivateOverlapContract/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/transparency\/report/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/private-overlap\/contract/);
  assert.match(technicalSpecPage, /does not claim production liquidity/);
  assert.match(technicalSpecPage, /Decision pipeline/);
  assert.match(technicalSpecPage, /profile\.decisionPipeline/);
  assert.match(technicalSpecPage, /Data model contract/);
  assert.match(technicalSpecPage, /Core entities, privacy classes, and relationships are validator-backed/);
  assert.match(technicalSpecPage, /dataModelProfile\.entities/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/data-model\/contract/);
  assert.match(technicalSpecPage, /Schema registry/);
  assert.match(technicalSpecPage, /schemaRegistry\.schemaDocuments/);
  assert.match(technicalSpecPage, /schemaRegistrySampleCount/);
  assert.match(technicalSpecPage, /sample validation\(s\)/);
  assert.match(technicalSpecPage, /public offer listing schemas/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/schemas/);
  assert.match(technicalSpecPage, /Policy bundle contract/);
  assert.match(technicalSpecPage, /Copilot inputs are concrete registries, not broad application context/);
  assert.match(technicalSpecPage, /Evidence metadata boundary/);
  assert.match(technicalSpecPage, /Raw artifacts, private notes, contact details, and exact wishes/);
  assert.match(technicalSpecPage, /policyBundleContract\.verificationMethodTaxonomy/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/policy-bundle\/contract/);
  assert.match(technicalSpecPage, /Release gate contract/);
  assert.match(technicalSpecPage, /releaseGateContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/release-gates\/contract/);
  assert.match(technicalSpecPage, /Participant confirmation contract/);
  assert.match(technicalSpecPage, /participantConfirmationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/participant-confirmations\/contract/);
  assert.match(technicalSpecPage, /Participant eligibility contract/);
  assert.match(technicalSpecPage, /participantEligibilityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /participantEligibilityContract\.reviewDimensions/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/participant-eligibility\/contract/);
  assert.match(technicalSpecPage, /Account security contract/);
  assert.match(technicalSpecPage, /accountSecurityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /accountSecurityContract\.highRiskActions/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/account-security\/contract/);
  assert.match(technicalSpecPage, /Reviewer quality contract/);
  assert.match(technicalSpecPage, /reviewerQualityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /reviewerQualityContract\.reviewTypes/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/reviewer-quality\/contract/);
  assert.match(technicalSpecPage, /Anti-enumeration contract/);
  assert.match(technicalSpecPage, /antiEnumerationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /antiEnumerationContract\.surfaces/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/anti-enumeration\/contract/);
  assert.match(technicalSpecPage, /Privacy-governance contract/);
  assert.match(technicalSpecPage, /privacyGovernanceContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /privacyGovernanceContract\.surfaces/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/privacy-governance\/contract/);
  assert.match(technicalSpecPage, /Impact-claim contract/);
  assert.match(technicalSpecPage, /impactClaimContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /impactClaimContract\.claimTypes/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/impact-claims\/contract/);
  assert.match(technicalSpecPage, /Matching-clearing contract/);
  assert.match(technicalSpecPage, /matchingClearingContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /matchingClearingContract\.flowTypes/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/matching-clearing\/contract/);
  assert.match(technicalSpecPage, /Baseline-integrity contract/);
  assert.match(technicalSpecPage, /baselineIntegrityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /baselineIntegrityContract\.transitions/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/baseline-integrity\/contract/);
  assert.match(technicalSpecPage, /Agreement-amendment contract/);
  assert.match(technicalSpecPage, /agreementAmendmentContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /agreementAmendmentContract\.transitions/);
  assert.match(technicalSpecPage, /agreementAmendmentContract\.amendmentTypes/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/agreement-amendments\/contract/);
  assert.match(technicalSpecPage, /Production readiness contract/);
  assert.match(technicalSpecPage, /productionReadinessContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/production-readiness\/contract/);
  assert.match(technicalSpecPage, /Recipient and destination contract/);
  assert.match(technicalSpecPage, /recipientDestinationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /recipientDestinationContract\.reviewDimensions/);
  assert.match(technicalSpecPage, /Recipient acceptance/);
  assert.match(technicalSpecPage, /recipientAcceptanceContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /recipientAcceptanceContract\.visibleRecipientStatuses/);
  assert.match(technicalSpecPage, /recipient-acceptance\/contract/);
  assert.match(technicalSpecPage, /AI preference elicitation/);
  assert.match(technicalSpecPage, /aiPreferenceElicitationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /aiPreferenceElicitationContract\.scopes/);
  assert.match(technicalSpecPage, /ai-preference-elicitation\/contract/);
  assert.match(technicalSpecPage, /Post-clear audit/);
  assert.match(technicalSpecPage, /postClearAuditContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /postClearAuditContract\.auditTypes/);
  assert.match(technicalSpecPage, /post-clear-audit\/contract/);
  assert.match(technicalSpecPage, /Subsidy governance/);
  assert.match(technicalSpecPage, /nonPublicGoodsSubsidyContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /nonPublicGoodsSubsidyContract\.allowedLaunchTiers/);
  assert.match(technicalSpecPage, /non-public-goods-subsidies\/contract/);
  assert.match(technicalSpecPage, /Direct-pair clearing/);
  assert.match(technicalSpecPage, /directPairClearingContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /directPairClearingContract\.allowedLaunchTradeTypes/);
  assert.match(technicalSpecPage, /direct-pair-clearing\/contract/);
  assert.match(technicalSpecPage, /Cause-bucket taxonomy/);
  assert.match(technicalSpecPage, /causeBucketTaxonomyContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /causeBucketTaxonomyContract\.taxonomyTypes/);
  assert.match(technicalSpecPage, /cause-bucket-taxonomy\/contract/);
  assert.match(technicalSpecPage, /Side-agreement disclosure contract/);
  assert.match(technicalSpecPage, /sideAgreementContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /sideAgreementContract\.reviewDimensions/);
  assert.match(technicalSpecPage, /side-agreements\/contract/);
  assert.match(technicalSpecPage, /Trade-classification contract/);
  assert.match(technicalSpecPage, /tradeClassificationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /tradeClassificationContract\.reviewDimensions/);
  assert.match(technicalSpecPage, /trade-classification\/contract/);
  assert.match(technicalSpecPage, /Template-conformance contract/);
  assert.match(technicalSpecPage, /templateConformanceContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /templateConformanceContract\.tradeTypes/);
  assert.match(technicalSpecPage, /template-conformance\/contract/);
  assert.match(technicalSpecPage, /Review-capacity contract/);
  assert.match(technicalSpecPage, /reviewCapacityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /reviewCapacityContract\.visibleQueueStatuses/);
  assert.match(technicalSpecPage, /review-capacity\/contract/);
  assert.match(technicalSpecPage, /Participant term-sheet contract/);
  assert.match(technicalSpecPage, /participantTermSheetContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /participantTermSheetContract\.visibleDisclosureStatuses/);
  assert.match(technicalSpecPage, /participant-term-sheet\/contract/);
  assert.match(technicalSpecPage, /Protective assessments/);
  assert.match(technicalSpecPage, /protectiveAssessmentContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /protectiveAssessmentContract\.assessmentDimensions/);
  assert.match(technicalSpecPage, /protective-assessments\/contract/);
  assert.match(technicalSpecPage, /User safety and content moderation/);
  assert.match(
    technicalSpecPage,
    /userSafetyContentModerationContract\.firstClassRecordTables/,
  );
  assert.match(
    technicalSpecPage,
    /userSafetyContentModerationContract\.moderationDimensions/,
  );
  assert.match(
    technicalSpecPage,
    /user-safety-content-moderation\/contract/,
  );
  assert.match(technicalSpecPage, /Financial settlement controls/);
  assert.match(technicalSpecPage, /financialSettlementControlsContract\.controlKeys/);
  assert.match(
    technicalSpecPage,
    /financialSettlementControlsContract\.firstClassRecordTables/,
  );
  assert.match(technicalSpecPage, /financial-settlement-controls\/contract/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/recipient-destinations\/contract/);
  assert.match(technicalSpecPage, /Evidence object contract/);
  assert.match(technicalSpecPage, /traceability events/);
  assert.match(technicalSpecPage, /external entity dedupe failures/);
  assert.match(technicalSpecPage, /Provenance contract/);
  assert.match(technicalSpecPage, /provenanceContract\.validationRules/);
  assert.match(technicalSpecPage, /Append-only storage/);
  assert.match(technicalSpecPage, /provenanceContract\.persistenceTables/);
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
  assert.match(technicalSpecPage, /challengeAppealContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /challengeAppealContract\.appealCaseStatuses/);
  assert.match(technicalSpecPage, /challengeAppealContract\.failClosedStatuses/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/challenge-appeal\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/challenge-appeal\/evaluate/);
  assert.match(technicalSpecPage, /Requested outcomes are advisory/);
  assert.match(technicalSpecPage, /Disclosure grant contract/);
  assert.match(technicalSpecPage, /Privacy grants now have a staged, field-level contract/);
  assert.match(technicalSpecPage, /disclosureContract\.disclosureFields/);
  assert.match(technicalSpecPage, /Search privacy controls/);
  assert.match(technicalSpecPage, /disclosureContract\.searchPrivacyControls/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/disclosure\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/disclosure\/evaluate/);
  assert.match(technicalSpecPage, /Review workflow contract/);
  assert.match(technicalSpecPage, /Marketplace cards and detail pages share one factor-code source/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.policyEnforcedWorkflow/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.reviewStateOutcomes/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.marketplaceFactorPriority/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.userFacingBlockerExplanations/);
  assert.match(
    technicalSpecPage,
    /reviewWorkflowContract\.sampleUserFacingBlockerExplanations/,
  );
  assert.match(technicalSpecPage, /User-facing blockers/);
  assert.match(technicalSpecPage, /Participant copy/);
  assert.match(technicalSpecPage, /reviewWorkflowContract\.participantCopyTemplates/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/review-workflow\/contract/);
  assert.match(technicalSpecPage, /POST \/api\/moral-trade\/review-workflow\/evaluate/);
  assert.match(technicalSpecPage, /stateMutation false/);
  assert.match(technicalSpecPage, /Reasoning packet contract/);
  assert.match(technicalSpecPage, /The Reasoning Center publishes structured packets/);
  assert.match(technicalSpecPage, /reasoningPacketContract\.requiredPacketFields/);
  assert.match(technicalSpecPage, /step-by-step decision gates/);
  assert.match(technicalSpecPage, /reasoningPacketContract\.samplePackets/);
  assert.match(technicalSpecPage, /reasoningPacketContract\.supportedFilters/);
  assert.match(technicalSpecPage, /reasoningPacketContract\.filterCounts/);
  assert.match(technicalSpecPage, /status=needs-evidence/);
  assert.match(technicalSpecPage, /Public filters/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/reasoning\/packets/);
  assert.match(technicalSpecPage, /live private offers/);
  assert.match(technicalSpecPage, /Operations contract/);
  assert.match(technicalSpecPage, /Security, rate limits, metrics, and fallbacks are inspectable/);
  assert.match(technicalSpecPage, /email-outbox safety gates/);
  assert.match(technicalSpecPage, /Privacy\/session controls/);
  assert.match(technicalSpecPage, /operationsProfile\.privacyAndSessionControls/);
  assert.match(technicalSpecPage, /retention lifecycle boundaries/);
  assert.match(technicalSpecPage, /Retention lifecycle/);
  assert.match(technicalSpecPage, /operationsProfile\.retentionControls/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/operations\/health/);
  assert.match(technicalSpecPage, /Security contract/);
  assert.match(technicalSpecPage, /Security posture is explicit about controls, boundaries, and non-claims/);
  assert.match(technicalSpecPage, /securityProfile\.publicNonClaims/);
  assert.match(technicalSpecPage, /Public non-claim/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/security\/health/);
  assert.match(technicalSpecPage, /Incident response contract/);
  assert.match(technicalSpecPage, /Incident intake, disclosure, and reopening rules are validator-backed/);
  assert.match(technicalSpecPage, /incidentResponseProfile\.severityLevels/);
  assert.match(technicalSpecPage, /auditMoralTradeIncidentReadinessGate/);
  assert.match(technicalSpecPage, /Incident non-claim/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/incident-response\/health/);
  assert.match(technicalSpecPage, /Evaluation contract/);
  assert.match(technicalSpecPage, /Quality metrics are public, privacy-bounded, and rollout-gated/);
  assert.match(technicalSpecPage, /Sample surfacing parity audit/);
  assert.match(technicalSpecPage, /Sample UX readiness audit/);
  assert.match(technicalSpecPage, /Sample workflow quality audit/);
  assert.match(technicalSpecPage, /workflowQualityAudit/);
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
  assert.match(technicalSpecPage, /routeRecoveryAudit\.entries/);
  assert.match(technicalSpecPage, /entry\.evidenceFile/);
  assert.match(technicalSpecPage, /Performance non-claim/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/performance\/health/);
  assert.match(technicalSpecPage, /Externality contract/);
  assert.match(technicalSpecPage, /Third-party impacts now have due-diligence and remedy gates/);
  assert.match(technicalSpecPage, /Trigger-standard matrix/);
  assert.match(technicalSpecPage, /externalityProfile\.triggerStandardMatrix/);
  assert.match(technicalSpecPage, /affected-party standing/);
  assert.match(technicalSpecPage, /\/api\/moral-trade\/externality\/health/);
  assert.match(technicalSpecPage, /AI governance contract/);
  assert.match(technicalSpecPage, /Undocumented ML cannot rank, match, disclose, or change state/);
  assert.match(technicalSpecPage, /Documentation templates/);
  assert.match(technicalSpecPage, /aiGovernanceProfile\.documentationTemplates/);
  assert.match(technicalSpecPage, /Sample documentation packets/);
  assert.match(technicalSpecPage, /aiGovernanceProfile\.sampleDocumentationPackets/);
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
  assert.match(technicalSpecPage, /Resource compatibility/);
  assert.match(technicalSpecPage, /resourceCompatibilityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /resourceCompatibilityContract\.conflictTypes/);
  assert.match(technicalSpecPage, /Net-offset accounting/);
  assert.match(technicalSpecPage, /netOffsetAccountingContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /netOffsetAccountingContract\.baselineOpposedActionTypes/);
  assert.match(technicalSpecPage, /net-offset-accounting\/contract/);
  assert.match(technicalSpecPage, /Offer validity/);
  assert.match(technicalSpecPage, /offerValidityContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /offerValidityContract\.staleReasonCodes/);
  assert.match(technicalSpecPage, /offer-validity\/contract/);
  assert.match(technicalSpecPage, /Private exchange-rate quotes/);
  assert.match(technicalSpecPage, /privateExchangeRateContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /privateExchangeRateContract\.quoteTypes/);
  assert.match(technicalSpecPage, /private-exchange-rate\/contract/);
  assert.match(technicalSpecPage, /Noncompensable blockers/);
  assert.match(technicalSpecPage, /noncompensableBlockerContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /noncompensableBlockerContract\.protectedInterestTypes/);
  assert.match(technicalSpecPage, /noncompensable-blockers\/contract/);
  assert.match(technicalSpecPage, /Batch-clearing objective/);
  assert.match(technicalSpecPage, /batchClearingObjectiveContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /batchClearingObjectiveContract\.prohibitedAllocationDrivers/);
  assert.match(technicalSpecPage, /batch-clearing-objective\/contract/);
  assert.match(technicalSpecPage, /Sensitive-evidence attestations/);
  assert.match(technicalSpecPage, /sensitiveEvidenceAttestationContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /sensitiveEvidenceAttestationContract\.claimTypes/);
  assert.match(technicalSpecPage, /sensitive-evidence-attestations\/contract/);
  assert.match(technicalSpecPage, /Pilot evidence gates/);
  assert.match(technicalSpecPage, /pilotEvidenceContract\.firstClassRecordTables/);
  assert.match(technicalSpecPage, /pilotEvidenceContract\.successMetrics/);
  assert.match(technicalSpecPage, /pilot-evidence\/contract/);
  assert.match(technicalSpecPage, /resource-compatibility\/contract/);
  assert.match(technicalSpecPage, /Field-level schema/);
  assert.match(technicalSpecPage, /State transitions/);
  assert.match(technicalSpecPage, /factor codes/i);
  assert.match(technicalSpecPage, /trust badges/);
  assert.match(technicalSpecPage, /risk badges/);
  assert.match(healthRoute, /publicContract/);
  assert.match(healthRoute, /decisionPipeline/);
  assert.match(healthRoute, /profile\.decisionPipeline/);
  assert.match(healthRoute, /dataModelValidation/);
  assert.match(healthRoute, /dataModelEntities/);
  assert.match(healthRoute, /dataModelOfferRequiredFields/);
  assert.match(healthRoute, /dataModelRelationshipBoundaries/);
  assert.match(healthRoute, /policyBundleValidation/);
  assert.match(healthRoute, /policyBundleStrictInputBundle/);
  assert.match(healthRoute, /policyBundleProhibitedPatternCodes/);
  assert.match(healthRoute, /policyBundleVerificationMethods/);
  assert.match(healthRoute, /releaseGateValidation/);
  assert.match(healthRoute, /releaseGateStageKeys/);
  assert.match(healthRoute, /releaseGateFirstClassRecordTables/);
  assert.match(healthRoute, /participantConfirmationValidation/);
  assert.match(healthRoute, /participantConfirmationScopes/);
  assert.match(healthRoute, /participantConfirmationFirstClassRecordTables/);
  assert.match(healthRoute, /participantEligibilityValidation/);
  assert.match(healthRoute, /participantEligibilityReviewDimensions/);
  assert.match(healthRoute, /participantEligibilityFirstClassRecordTables/);
  assert.match(healthRoute, /accountSecurityValidation/);
  assert.match(healthRoute, /accountSecurityHighRiskActions/);
  assert.match(healthRoute, /accountSecurityFirstClassRecordTables/);
  assert.match(healthRoute, /reviewerQualityValidation/);
  assert.match(healthRoute, /reviewerQualityReviewTypes/);
  assert.match(healthRoute, /reviewerQualityFirstClassRecordTables/);
  assert.match(healthRoute, /antiEnumerationValidation/);
  assert.match(healthRoute, /antiEnumerationSurfaces/);
  assert.match(healthRoute, /antiEnumerationFirstClassRecordTables/);
  assert.match(healthRoute, /privacyGovernanceValidation/);
  assert.match(healthRoute, /privacyGovernanceSurfaces/);
  assert.match(healthRoute, /privacyGovernanceFirstClassRecordTables/);
  assert.match(healthRoute, /impactClaimValidation/);
  assert.match(healthRoute, /impactClaimClaimTypes/);
  assert.match(healthRoute, /impactClaimFirstClassRecordTables/);
  assert.match(healthRoute, /matchingClearingValidation/);
  assert.match(healthRoute, /matchingClearingFlowTypes/);
  assert.match(healthRoute, /matchingClearingFirstClassRecordTables/);
  assert.match(healthRoute, /baselineIntegrityValidation/);
  assert.match(healthRoute, /baselineIntegrityTransitionKeys/);
  assert.match(healthRoute, /baselineIntegrityFirstClassRecordTables/);
  assert.match(healthRoute, /agreementAmendmentValidation/);
  assert.match(healthRoute, /agreementAmendmentTransitionKeys/);
  assert.match(healthRoute, /agreementAmendmentFirstClassRecordTables/);
  assert.match(healthRoute, /productionReadinessValidation/);
  assert.match(healthRoute, /productionReadinessControlKeys/);
  assert.match(healthRoute, /productionReadinessFirstClassRecordTables/);
  assert.match(healthRoute, /recipientDestinationValidation/);
  assert.match(healthRoute, /recipientDestinationTransitionKeys/);
  assert.match(healthRoute, /recipientDestinationFirstClassRecordTables/);
  assert.match(healthRoute, /recipientAcceptanceValidation/);
  assert.match(healthRoute, /recipientAcceptanceTransitionKeys/);
  assert.match(healthRoute, /recipientAcceptanceFirstClassRecordTables/);
  assert.match(healthRoute, /recipientAcceptancePrivacyBoundary/);
  assert.match(healthRoute, /resourceCompatibilityValidation/);
  assert.match(healthRoute, /resourceCompatibilityFirstClassRecordTables/);
  assert.match(healthRoute, /resourceCompatibilityConflictTypes/);
  assert.match(healthRoute, /resourceCompatibilityZeroSumConflictRule/);
  assert.match(healthRoute, /netOffsetAccountingValidation/);
  assert.match(healthRoute, /netOffsetAccountingFirstClassRecordTables/);
  assert.match(healthRoute, /netOffsetAccountingGrossVolumeExclusionRule/);
  assert.match(healthRoute, /offerValidityValidation/);
  assert.match(healthRoute, /offerValidityFirstClassRecordTables/);
  assert.match(healthRoute, /offerValidityWindowRule/);
  assert.match(healthRoute, /privateExchangeRateValidation/);
  assert.match(healthRoute, /privateExchangeRateFirstClassRecordTables/);
  assert.match(healthRoute, /privateExchangeRatePublicNonPriceRule/);
  assert.match(healthRoute, /noncompensableBlockerValidation/);
  assert.match(healthRoute, /noncompensableBlockerFirstClassRecordTables/);
  assert.match(healthRoute, /noncompensableBlockerCompensationAttemptRule/);
  assert.match(healthRoute, /batchClearingObjectiveValidation/);
  assert.match(healthRoute, /batchClearingObjectiveFirstClassRecordTables/);
  assert.match(healthRoute, /batchClearingObjectiveProhibitedAllocationRule/);
  assert.match(healthRoute, /sensitiveEvidenceAttestationValidation/);
  assert.match(healthRoute, /sensitiveEvidenceAttestationFirstClassRecordTables/);
  assert.match(healthRoute, /sensitiveEvidenceAttestationRawArtifactDisclosureRule/);
  assert.match(healthRoute, /pilotEvidenceValidation/);
  assert.match(healthRoute, /pilotEvidenceFirstClassRecordTables/);
  assert.match(healthRoute, /pilotEvidenceMatchedVolumeRule/);
  assert.match(healthRoute, /aiPreferenceElicitationValidation/);
  assert.match(healthRoute, /aiPreferenceElicitationTransitionKeys/);
  assert.match(healthRoute, /aiPreferenceElicitationFirstClassRecordTables/);
  assert.match(healthRoute, /aiPreferenceElicitationPrivacyBoundary/);
  assert.match(healthRoute, /aiPreferenceElicitationProhibitedUseBlockers/);
  assert.match(healthRoute, /sideAgreementValidation/);
  assert.match(healthRoute, /sideAgreementTransitionKeys/);
  assert.match(healthRoute, /sideAgreementFirstClassRecordTables/);
  assert.match(healthRoute, /sideAgreementForbiddenPublicSummaryTerms/);
  assert.match(healthRoute, /tradeClassificationValidation/);
  assert.match(healthRoute, /tradeClassificationTransitionKeys/);
  assert.match(healthRoute, /tradeClassificationFirstClassRecordTables/);
  assert.match(healthRoute, /tradeClassificationPublicNonClaim/);
  assert.match(healthRoute, /templateConformanceValidation/);
  assert.match(healthRoute, /templateConformanceTransitionKeys/);
  assert.match(healthRoute, /templateConformanceFirstClassRecordTables/);
  assert.match(healthRoute, /templateConformancePrivacyBoundary/);
  assert.match(healthRoute, /reviewCapacityValidation/);
  assert.match(healthRoute, /reviewCapacityTransitionKeys/);
  assert.match(healthRoute, /reviewCapacityFirstClassRecordTables/);
  assert.match(healthRoute, /reviewCapacityPrivacyBoundary/);
  assert.match(healthRoute, /participantTermSheetValidation/);
  assert.match(healthRoute, /participantTermSheetTransitionKeys/);
  assert.match(healthRoute, /participantTermSheetFirstClassRecordTables/);
  assert.match(healthRoute, /participantTermSheetPrivacyBoundary/);
  assert.match(healthRoute, /protectiveAssessmentValidation/);
  assert.match(healthRoute, /protectiveAssessmentTransitionKeys/);
  assert.match(healthRoute, /protectiveAssessmentDimensions/);
  assert.match(healthRoute, /protectiveAssessmentFirstClassRecordTables/);
  assert.match(healthRoute, /protectiveAssessmentPrivacyBoundary/);
  assert.match(healthRoute, /financialSettlementControlsValidation/);
  assert.match(healthRoute, /financialSettlementControlsTransitionKeys/);
  assert.match(healthRoute, /financialSettlementControlsControlKeys/);
  assert.match(healthRoute, /financialSettlementControlsFirstClassRecordTables/);
  assert.match(healthRoute, /financialSettlementControlsPrivacyBoundary/);
  assert.match(healthRoute, /stateTransitionRules/);
  assert.match(healthRoute, /provenanceObjectSchemas/);
  assert.match(healthRoute, /provenanceValidation/);
  assert.match(healthRoute, /provenanceValidationRules/);
  assert.match(healthRoute, /provenancePersistenceTables/);
  assert.match(healthRoute, /provenanceSampleBundleSummary/);
  assert.match(healthRoute, /schemaRegistryValidation/);
  assert.match(healthRoute, /schemaRegistryDocuments/);
  assert.match(healthRoute, /schemaRegistrySampleValidationCount/);
  assert.match(healthRoute, /schemaRegistrySampleValidationFailureCount/);
  assert.match(healthRoute, /schemaRegistryDataModelSchema/);
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
  assert.match(healthRoute, /challengeAppealFirstClassRecordTables/);
  assert.match(healthRoute, /challengeAppealCaseStatuses/);
  assert.match(healthRoute, /challengeAppealFailClosedStatuses/);
  assert.match(healthRoute, /disclosureValidation/);
  assert.match(healthRoute, /disclosureAudienceStages/);
  assert.match(healthRoute, /disclosureRedactedFields/);
  assert.match(healthRoute, /disclosureSearchPrivacyControls/);
  assert.match(healthRoute, /reviewWorkflowValidation/);
  assert.match(healthRoute, /reviewWorkflowCardKeys/);
  assert.match(healthRoute, /reviewWorkflowMarketplaceFactorPriority/);
  assert.match(healthRoute, /reviewWorkflowParticipantCopyKeys/);
  assert.match(healthRoute, /reviewWorkflowUserFacingBlockerCategories/);
  assert.match(healthRoute, /reviewWorkflowSampleBlockerExplanationKeys/);
  assert.match(healthRoute, /reviewWorkflowForbiddenExplanationTerms/);
  assert.match(healthRoute, /reasoningPacketValidation/);
  assert.match(healthRoute, /reasoningPacketFilters/);
  assert.match(healthRoute, /reasoningPacketFilterCounts/);
  assert.match(healthRoute, /reasoningPacketRequiredFields/);
  assert.match(healthRoute, /reasoningPacketDecisionStepKeys/);
  assert.match(healthRoute, /reasoningPacketLinkedContracts/);
  assert.match(healthRoute, /operationsValidation/);
  assert.match(healthRoute, /rateLimitSurfaces/);
  assert.match(healthRoute, /retentionControlKeys/);
  assert.match(healthRoute, /retentionControlScopes/);
  assert.match(healthRoute, /securityValidation/);
  assert.match(healthRoute, /securityControls/);
  assert.match(healthRoute, /securityScaleGates/);
  assert.match(healthRoute, /securityPublicNonClaims/);
  assert.match(healthRoute, /incidentResponseValidation/);
  assert.match(healthRoute, /incidentResponseIntakeChannels/);
  assert.match(healthRoute, /incidentResponseSeverityLevels/);
  assert.match(healthRoute, /incidentResponseDisclosureRules/);
  assert.match(healthRoute, /incidentResponseReadinessGates/);
  assert.match(healthRoute, /evaluationValidation/);
  assert.match(healthRoute, /evaluationMetrics/);
  assert.match(healthRoute, /performanceValidation/);
  assert.match(healthRoute, /performanceMetricTargets/);
  assert.match(healthRoute, /performancePublicNonClaims/);
  assert.match(healthRoute, /externalityValidation/);
  assert.match(healthRoute, /externalityDueDiligenceSteps/);
  assert.match(healthRoute, /externalityTriggerStandardMatrix/);
  assert.match(healthRoute, /externalityRemedyControls/);
  assert.match(healthRoute, /apiContractValidation/);
  assert.match(healthRoute, /apiContractImplementationAudit/);
  assert.match(healthRoute, /apiContractImplementationAuditStatus/);
  assert.match(healthRoute, /aiGovernanceValidation/);
  assert.match(healthRoute, /aiGovernanceDocumentationBeforeMl/);
  assert.match(healthRoute, /aiGovernanceSampleDocumentationPacketCount/);
  assert.match(healthRoute, /aiGovernanceExplanationControls/);
  assert.match(healthRoute, /apiRoutes/);
  assert.match(healthRoute, /apiContractRoute/);
  assert.match(healthRoute, /apiImplementationRouteCount/);
  assert.match(healthRoute, /apiImplementationRateLimitSurfaces/);
  assert.match(healthRoute, /apiImplementationCacheControls/);
  assert.match(healthRoute, /apiImplementationBlockers/);
  assert.match(healthRoute, /apiSchemaFieldCounts/);
  assert.match(healthRoute, /documentCoverageValidation/);
  assert.match(healthRoute, /documentCoverageSourceDocumentArtifacts/);
  assert.match(healthRoute, /documentCoverageValidation\.sourceDocumentArtifacts/);
  assert.match(healthRoute, /documentCoverageSourceStackReferences/);
  assert.match(healthRoute, /documentCoverageProfile\.sourceStackReferences/);
  assert.match(healthRoute, /documentCoverageTestingPlanCoverage/);
  assert.match(healthRoute, /documentCoverageProfile\.testingPlanCoverage/);
  assert.match(healthRoute, /documentCoverageRequiredEvidencePhraseCount/);
  assert.match(healthRoute, /documentCoverageCanonicalInstruction/);
  assert.match(healthRoute, /canonicalInstruction\.verificationCommands/);
  assert.match(healthRoute, /documentCoverageValidation\.canonicalInstructionHash/);
  assert.match(dataModelContractRoute, /validateMoralTradeDataModelProfile/);
  assert.match(dataModelContractRoute, /entities/);
  assert.match(dataModelContractRoute, /offerRequiredFields/);
  assert.match(dataModelContractRoute, /relationshipBoundaries/);
  assert.match(policyBundleContractRoute, /validateMoralTradePolicyBundleContract/);
  assert.match(policyBundleContractRoute, /strictInputBundle/);
  assert.match(policyBundleContractRoute, /prohibitedPatternCodes/);
  assert.match(policyBundleContractRoute, /verificationMethodKeys/);
  assert.match(releaseGateContractRoute, /validateMoralTradeReleaseGateContract/);
  assert.match(releaseGateContractRoute, /documentedReleaseStages/);
  assert.match(releaseGateContractRoute, /documentedFeatureFlags/);
  assert.match(releaseGateContractRoute, /firstClassRecordTables/);
  assert.match(releaseGateContractRoute, /sampleEvaluations/);
  assert.match(participantConfirmationContractRoute, /validateMoralTradeParticipantConfirmationContract/);
  assert.match(participantConfirmationContractRoute, /confirmationScopes/);
  assert.match(participantConfirmationContractRoute, /failClosedStatuses/);
  assert.match(participantEligibilityContractRoute, /validateMoralTradeParticipantEligibilityContract/);
  assert.match(participantEligibilityContractRoute, /reviewDimensions/);
  assert.match(participantEligibilityContractRoute, /participantEligibilitySampleEvaluationStatuses/);
  assert.match(accountSecurityContractRoute, /validateMoralTradeAccountSecurityContract/);
  assert.match(accountSecurityContractRoute, /highRiskActions/);
  assert.match(accountSecurityContractRoute, /accountSecuritySampleEvaluationStatuses/);
  assert.match(reviewerQualityContractRoute, /validateMoralTradeReviewerQualityContract/);
  assert.match(reviewerQualityContractRoute, /reviewTypes/);
  assert.match(reviewerQualityContractRoute, /reviewerQualitySampleEvaluationStatuses/);
  assert.match(antiEnumerationContractRoute, /validateMoralTradeAntiEnumerationContract/);
  assert.match(antiEnumerationContractRoute, /surfaces/);
  assert.match(antiEnumerationContractRoute, /antiEnumerationSampleEvaluationStatuses/);
  assert.match(privacyGovernanceContractRoute, /validateMoralTradePrivacyGovernanceContract/);
  assert.match(privacyGovernanceContractRoute, /surfaces/);
  assert.match(privacyGovernanceContractRoute, /privacyGovernanceSampleEvaluationStatuses/);
  assert.match(impactClaimContractRoute, /validateMoralTradeImpactClaimContract/);
  assert.match(impactClaimContractRoute, /claimTypes/);
  assert.match(impactClaimContractRoute, /impactClaimSampleEvaluationStatuses/);
  assert.match(matchingClearingContractRoute, /validateMoralTradeMatchingClearingContract/);
  assert.match(matchingClearingContractRoute, /flowTypes/);
  assert.match(matchingClearingContractRoute, /matchingClearingSampleEvaluationStatuses/);
  assert.match(baselineIntegrityContractRoute, /validateMoralTradeBaselineIntegrityContract/);
  assert.match(baselineIntegrityContractRoute, /transitions/);
  assert.match(baselineIntegrityContractRoute, /baselineIntegritySampleEvaluationStatuses/);
  assert.match(agreementAmendmentContractRoute, /validateMoralTradeAgreementAmendmentContract/);
  assert.match(agreementAmendmentContractRoute, /amendmentTypes/);
  assert.match(agreementAmendmentContractRoute, /agreementAmendmentSampleEvaluationStatuses/);
  assert.match(productionReadinessContractRoute, /validateMoralTradeProductionReadinessContract/);
  assert.match(productionReadinessContractRoute, /firstClassRecordTables/);
  assert.match(productionReadinessContractRoute, /productionReadinessSampleEvaluationStatuses/);
  assert.match(recipientDestinationContractRoute, /validateMoralTradeRecipientDestinationContract/);
  assert.match(recipientDestinationContractRoute, /reviewDimensions/);
  assert.match(recipientDestinationContractRoute, /recipientDestinationSampleEvaluationStatuses/);
  assert.match(recipientAcceptanceContractRoute, /validateMoralTradeRecipientAcceptanceContract/);
  assert.match(recipientAcceptanceContractRoute, /visibleRecipientStatuses/);
  assert.match(recipientAcceptanceContractRoute, /firstClassRecordTables/);
  assert.match(recipientAcceptanceContractRoute, /recipientAcceptanceSampleEvaluationStatuses/);
  assert.match(aiPreferenceElicitationContractRoute, /validateMoralTradeAiPreferenceElicitationContract/);
  assert.match(aiPreferenceElicitationContractRoute, /scopes/);
  assert.match(aiPreferenceElicitationContractRoute, /firstClassRecordTables/);
  assert.match(aiPreferenceElicitationContractRoute, /aiPreferenceElicitationSampleEvaluationStatuses/);
  assert.match(postClearAuditContractRoute, /validateMoralTradePostClearAuditContract/);
  assert.match(postClearAuditContractRoute, /auditTypes/);
  assert.match(postClearAuditContractRoute, /firstClassRecordTables/);
  assert.match(postClearAuditContractRoute, /postClearAuditSampleEvaluationStatuses/);
  assert.match(nonPublicGoodsSubsidyContractRoute, /validateMoralTradeNonPublicGoodsSubsidyContract/);
  assert.match(nonPublicGoodsSubsidyContractRoute, /allowedLaunchTiers/);
  assert.match(nonPublicGoodsSubsidyContractRoute, /metricExclusionRule/);
  assert.match(nonPublicGoodsSubsidyContractRoute, /subsidySampleEvaluationStatuses/);
  assert.match(directPairClearingContractRoute, /validateMoralTradeDirectPairClearingContract/);
  assert.match(directPairClearingContractRoute, /allowedLaunchTradeTypes/);
  assert.match(directPairClearingContractRoute, /noAutonomousOutreachRule/);
  assert.match(directPairClearingContractRoute, /directPairSampleEvaluationStatuses/);
  assert.match(causeBucketTaxonomyContractRoute, /validateMoralTradeCauseBucketTaxonomyContract/);
  assert.match(causeBucketTaxonomyContractRoute, /taxonomyTypes/);
  assert.match(causeBucketTaxonomyContractRoute, /nonRankingRule/);
  assert.match(causeBucketTaxonomyContractRoute, /causeBucketSampleEvaluationStatuses/);
  assert.match(resourceCompatibilityContractRoute, /validateMoralTradeResourceCompatibilityContract/);
  assert.match(resourceCompatibilityContractRoute, /conflictTypes/);
  assert.match(resourceCompatibilityContractRoute, /zeroSumConflictRule/);
  assert.match(resourceCompatibilityContractRoute, /resourceCompatibilitySampleEvaluationStatuses/);
  assert.match(netOffsetAccountingContractRoute, /validateMoralTradeNetOffsetAccountingContract/);
  assert.match(netOffsetAccountingContractRoute, /baselineOpposedActionTypes/);
  assert.match(netOffsetAccountingContractRoute, /grossVolumeExclusionRule/);
  assert.match(netOffsetAccountingContractRoute, /netOffsetAccountingSampleEvaluationStatuses/);
  assert.match(offerValidityContractRoute, /validateMoralTradeOfferValidityContract/);
  assert.match(offerValidityContractRoute, /staleReasonCodes/);
  assert.match(offerValidityContractRoute, /validityWindowRule/);
  assert.match(offerValidityContractRoute, /offerValiditySampleEvaluationStatuses/);
  assert.match(privateExchangeRateContractRoute, /validateMoralTradePrivateExchangeRateContract/);
  assert.match(privateExchangeRateContractRoute, /publicNonPriceRule/);
  assert.match(privateExchangeRateContractRoute, /affectedParticipantCoverageRule/);
  assert.match(privateExchangeRateContractRoute, /privateExchangeRateSampleEvaluationStatuses/);
  assert.match(noncompensableBlockerContractRoute, /validateMoralTradeNoncompensableBlockerContract/);
  assert.match(noncompensableBlockerContractRoute, /protectedInterestTypes/);
  assert.match(noncompensableBlockerContractRoute, /compensationAttemptRule/);
  assert.match(noncompensableBlockerContractRoute, /noncompensableBlockerSampleEvaluationStatuses/);
  assert.match(batchClearingObjectiveContractRoute, /validateMoralTradeBatchClearingObjectiveContract/);
  assert.match(batchClearingObjectiveContractRoute, /prohibitedAllocationDrivers/);
  assert.match(batchClearingObjectiveContractRoute, /deterministicTieBreakRule/);
  assert.match(batchClearingObjectiveContractRoute, /batchClearingObjectiveSampleEvaluationStatuses/);
  assert.match(sensitiveEvidenceAttestationContractRoute, /validateMoralTradeSensitiveEvidenceAttestationContract/);
  assert.match(sensitiveEvidenceAttestationContractRoute, /rawArtifactDisclosureRule/);
  assert.match(sensitiveEvidenceAttestationContractRoute, /sensitiveEvidenceAttestationSampleEvaluationStatuses/);
  assert.match(pilotEvidenceContractRoute, /validateMoralTradePilotEvidenceContract/);
  assert.match(pilotEvidenceContractRoute, /matchedVolumeRule/);
  assert.match(pilotEvidenceContractRoute, /pilotEvidenceSampleEvaluationStatuses/);
  assert.match(sideAgreementContractRoute, /validateMoralTradeSideAgreementContract/);
  assert.match(sideAgreementContractRoute, /reviewDimensions/);
  assert.match(sideAgreementContractRoute, /sideAgreementSampleEvaluationStatuses/);
  assert.match(sideAgreementContractRoute, /forbiddenPublicSummaryTerms/);
  assert.match(
    tradeClassificationContractRoute,
    /validateMoralTradeTradeClassificationContract/,
  );
  assert.match(tradeClassificationContractRoute, /classifications/);
  assert.match(
    tradeClassificationContractRoute,
    /tradeClassificationSampleEvaluationStatuses/,
  );
  assert.match(tradeClassificationContractRoute, /publicNonClaim/);
  assert.match(
    templateConformanceContractRoute,
    /validateMoralTradeTemplateConformanceContract/,
  );
  assert.match(templateConformanceContractRoute, /tradeTypes/);
  assert.match(templateConformanceContractRoute, /firstClassRecordTables/);
  assert.match(
    templateConformanceContractRoute,
    /templateConformanceSampleEvaluationStatuses/,
  );
  assert.match(
    reviewCapacityContractRoute,
    /validateMoralTradeReviewCapacityContract/,
  );
  assert.match(reviewCapacityContractRoute, /visibleQueueStatuses/);
  assert.match(reviewCapacityContractRoute, /firstClassRecordTables/);
  assert.match(
    reviewCapacityContractRoute,
    /reviewCapacitySampleEvaluationStatuses/,
  );
  assert.match(
    participantTermSheetContractRoute,
    /validateMoralTradeParticipantTermSheetContract/,
  );
  assert.match(participantTermSheetContractRoute, /visibleDisclosureStatuses/);
  assert.match(participantTermSheetContractRoute, /firstClassRecordTables/);
  assert.match(
    participantTermSheetContractRoute,
    /participantTermSheetSampleEvaluationStatuses/,
  );
  assert.match(
    protectiveAssessmentContractRoute,
    /validateMoralTradeProtectiveAssessmentContract/,
  );
  assert.match(protectiveAssessmentContractRoute, /assessmentDimensions/);
  assert.match(
    protectiveAssessmentContractRoute,
    /protectiveAssessmentSampleEvaluationStatuses/,
  );
  assert.match(protectiveAssessmentContractRoute, /privacyBoundary/);
  assert.match(
    userSafetyContentModerationContractRoute,
    /validateMoralTradeUserSafetyContentModerationContract/,
  );
  assert.match(userSafetyContentModerationContractRoute, /moderationDimensions/);
  assert.match(userSafetyContentModerationContractRoute, /userSafetyDimensions/);
  assert.match(userSafetyContentModerationContractRoute, /sampleEvaluationStatuses/);
  assert.match(userSafetyContentModerationContractRoute, /privacyBoundary/);
  assert.match(
    financialSettlementControlsContractRoute,
    /validateMoralTradeFinancialSettlementControlsContract/,
  );
  assert.match(financialSettlementControlsContractRoute, /controlKeys/);
  assert.match(financialSettlementControlsContractRoute, /sampleEvaluationStatuses/);
  assert.match(financialSettlementControlsContractRoute, /privacyBoundary/);
  assert.match(copilotContractRoute, /validateMoralTradeCopilotContract/);
  assert.match(copilotContractRoute, /getMoralTradeCopilotRolloutReadinessAudits/);
  assert.match(copilotContractRoute, /promptTemplates/);
  assert.match(copilotContractRoute, /rolloutReadinessSignals/);
  assert.match(copilotContractRoute, /rolloutReadiness/);
  assert.match(healthRoute, /copilotRolloutReadinessStatuses/);
  assert.match(copilotReviewRoute, /buildMoralTradeCopilotOutput/);
  assert.match(copilotReviewRoute, /normalizeMoralTradeCopilotEvidenceMetadata/);
  assert.match(copilotReviewRoute, /auditMoralTradeCopilotStrictInputBundle/);
  assert.match(copilotReviewRoute, /inputBundleAudit/);
  assert.match(copilotReviewRoute, /preOutputBlockers/);
  assert.match(copilotReviewRoute, /without emitting an output packet/);
  assert.match(copilotReviewRoute, /evidenceMetadataSummary/);
  assert.match(copilotReviewRoute, /validateMoralTradeCopilotOutput/);
  assert.match(copilotReviewRoute, /deterministic_draft_review_only/);
  assert.match(copilotReviewRoute, /stateMutation/);
  assert.equal(copilotReviewRoute.includes("stateMutation: true"), false);
  assert.match(copilotReviewRoute, /private, no-store/);
  assert.match(apiContractProfile, /invalid strict bundles emit no copilot output packet/);
  assert.match(matchSignalContractRoute, /validateMoralTradeMatchSignalContract/);
  assert.match(matchSignalContractRoute, /approvedFactorCodes/);
  assert.match(matchSignalContractRoute, /privacyPolicyId/);
  assert.match(matchSignalContractRoute, /disclosureStages/);
  assert.match(matchSignalContractRoute, /participantExplanationTemplate/);
  assert.match(matchSignalEvaluateRoute, /evaluateMoralTradeRedactedProfileMatch/);
  assert.match(matchSignalEvaluateRoute, /redacted_profile_pair/);
  assert.match(matchSignalEvaluateRoute, /stateMutation: false/);
  assert.match(matchSignalEvaluateRoute, /private, no-store/);
  assert.match(challengeAppealContractRoute, /validateMoralTradeChallengeAppealContract/);
  assert.match(challengeAppealContractRoute, /standingCategories/);
  assert.match(challengeAppealContractRoute, /firstClassRecordTables/);
  assert.match(challengeAppealContractRoute, /appealCaseSampleEvaluationStatuses/);
  assert.match(challengeAppealEvaluateRoute, /evaluateMoralTradeChallengeAppeal/);
  assert.match(challengeAppealEvaluateRoute, /challenge_appeal_packet/);
  assert.match(challengeAppealEvaluateRoute, /stateMutation: false/);
  assert.match(challengeAppealEvaluateRoute, /private, no-store/);
  assert.match(disclosureContractRoute, /validateMoralTradeDisclosureContract/);
  assert.match(disclosureContractRoute, /disclosureFields/);
  assert.match(disclosureContractRoute, /searchPrivacyControls/);
  assert.match(disclosureEvaluateRoute, /evaluateMoralTradeDisclosureGrant/);
  assert.match(disclosureEvaluateRoute, /disclosure_grant_packet/);
  assert.match(disclosureEvaluateRoute, /stateMutation: false/);
  assert.match(disclosureEvaluateRoute, /private, no-store/);
  assert.match(reviewWorkflowContractRoute, /validateOfferReviewWorkflowContract/);
  assert.match(reviewWorkflowContractRoute, /detailWorkflowCards/);
  assert.match(reviewWorkflowContractRoute, /policyEnforcedWorkflow/);
  assert.match(reviewWorkflowContractRoute, /reviewStateOutcomes/);
  assert.match(reviewWorkflowContractRoute, /marketplaceFactorPriority/);
  assert.match(reviewWorkflowContractRoute, /participantCopyTemplates/);
  assert.match(reviewWorkflowContractRoute, /userFacingBlockerExplanations/);
  assert.match(reviewWorkflowContractRoute, /sampleUserFacingBlockerExplanations/);
  assert.match(reviewWorkflowContractRoute, /forbiddenUserFacingExplanationTerms/);
  assert.match(reviewWorkflowEvaluateRoute, /getOfferReviewWorkflowCards/);
  assert.match(reviewWorkflowEvaluateRoute, /getOfferReviewCardInstrumentation/);
  assert.match(reviewWorkflowEvaluateRoute, /stateMutation: false/);
  assert.match(reviewWorkflowEvaluateRoute, /private, no-store/);
  assert.match(reasoningPacketsRoute, /buildMoralTradeReasoningPacketRoutePayload/);
  assert.match(reasoningPacketsRoute, /onRecovery/);
  assert.match(reasoningPacketsRoute, /Returning recovery payload after packet generation failed/);
  assert.match(reasoningPacketsRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(operationsHealthRoute, /validateMoralTradeOperationsProfile/);
  assert.match(operationsHealthRoute, /retentionControls/);
  assert.match(operationsHealthRoute, /retentionWindow/);
  assert.match(operationsHealthRoute, /resilienceFallbackTests/);
  assert.match(securityHealthRoute, /validateMoralTradeSecurityProfile/);
  assert.match(securityHealthRoute, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(securityHealthRoute, /publicClaim/);
  assert.match(securityHealthRoute, /evidence/);
  assert.match(securityHealthRoute, /rule/);
  assert.match(securityHealthRoute, /publicNonClaims/);
  assert.match(incidentResponseHealthRoute, /validateMoralTradeIncidentResponseProfile/);
  assert.match(incidentResponseHealthRoute, /auditMoralTradeIncidentReadinessGate/);
  assert.match(incidentResponseHealthRoute, /incidentCategories/);
  assert.match(incidentResponseHealthRoute, /publicNonClaims/);
  assert.match(evaluationHealthRoute, /validateMoralTradeEvaluationProfile/);
  assert.match(evaluationHealthRoute, /surfacingParityAuditDefaults/);
  assert.match(evaluationHealthRoute, /uxReadinessAuditDefaults/);
  assert.match(evaluationHealthRoute, /getMoralTradeEvaluationSampleAudits/);
  assert.match(evaluationHealthRoute, /sampleAudits/);
  assert.match(evaluationHealthRoute, /workflowQuality/);
  assert.match(evaluationHealthRoute, /blockedProposalPrecision/);
  assert.match(evaluationHealthRoute, /reviewedDeviationCount/);
  assert.match(evaluationHealthRoute, /deviationReviews/);
  assert.match(healthRoute, /evaluationSampleAuditStatuses/);
  assert.match(healthRoute, /evaluationSurfacingDeviationReviews/);
  assert.match(performanceHealthRoute, /validateMoralTradePerformanceProfile/);
  assert.match(performanceHealthRoute, /auditMoralTradeRouteRecoveryManifest/);
  assert.match(performanceHealthRoute, /reasoningCenterRecovery/);
  assert.match(performanceHealthRoute, /reasoningCenterEvidenceFile/);
  assert.match(performanceHealthRoute, /reasoningPacketJsonRecovery/);
  assert.match(performanceHealthRoute, /auditDefaults/);
  assert.match(performanceHealthRoute, /publicNonClaims/);
  assert.match(externalityHealthRoute, /validateMoralTradeExternalityProfile/);
  assert.match(externalityHealthRoute, /dueDiligenceSteps/);
  assert.match(externalityHealthRoute, /triggerStandardMatrix/);
  assert.match(externalityHealthRoute, /remedyControls/);
  assert.match(aiGovernanceHealthRoute, /validateMoralTradeAiGovernanceProfile/);
  assert.match(aiGovernanceHealthRoute, /requiredDocumentationBeforeMl/);
  assert.match(aiGovernanceHealthRoute, /documentationTemplates/);
  assert.match(aiGovernanceHealthRoute, /sampleDocumentationPacketCount/);
  assert.match(aiGovernanceHealthRoute, /sampleDocumentationPackets/);
  assert.match(aiGovernanceHealthRoute, /explanationControls/);
  assert.match(aiGovernanceHealthRoute, /prohibitedUses/);
  assert.match(privateOverlapSource, /BACKGROUND_PRIVATE_OVERLAP_CONTRACT_VERSION/);
  assert.match(privateOverlapSource, /governance_gated_pilot/);
  assert.match(privateOverlapSource, /futureStoredFields/);
  assert.match(privateOverlapSource, /blocked_pending_crypto_review/);
  assert.match(privateOverlapSource, /formal cryptographic design review/);
  assert.match(privateOverlapSource, /deterministic broad-preview matching/);
  assert.match(privateOverlapContractRoute, /getBackgroundPrivateOverlapContract/);
  assert.match(privateOverlapContractRoute, /validateBackgroundPrivateOverlapContract/);
  assert.match(privateOverlapContractRoute, /publicNonClaim/);
  assert.match(apiContractRoute, /validateMoralTradeApiContractProfile/);
  assert.match(apiContractRoute, /auditMoralTradeApiImplementationContract/);
  assert.match(apiContractRoute, /implementationAudit/);
  assert.match(
    apiContractRoute,
    /validation\.status === "pass" && implementationAudit\.status === "pass"/,
  );
  assert.match(apiContractRoute, /requestSchema/);
  assert.match(provenanceSchemaRoute, /validateMoralTradeProvenanceContract/);
  assert.match(provenanceSchemaRoute, /publicContract/);
  assert.match(provenanceSchemaRoute, /persistenceTables/);
  assert.match(provenanceSchemaRoute, /validationRuleCodes/);
  assert.match(provenanceSchemaRoute, /sampleBundleSummary/);
  assert.match(schemaRegistrySource, /validateMoralTradeSchemaRegistry/);
  assert.match(schemaRegistrySource, /data_model_profile_schema/);
  assert.match(schemaRegistrySource, /public_offer_listing_schema/);
  assert.match(schemaRegistrySource, /schemaPublicPath/);
  assert.match(schemaRegistrySource, /sampleValidationCount/);
  assert.match(schemaRegistrySource, /public-schema-sample-conformance/);
  assert.match(dataModelProfileSchema, /Moral Trade Data Model Profile/);
  assert.match(dataModelProfileSchema, /relationshipBoundaries/);
  assert.match(dataModelProfileSchema, /additionalProperties/);
  assert.match(publicOfferListingSchema, /Moral Trade Public Offer Listing/);
  assert.match(publicOfferListingSchema, /offeredAction/);
  assert.match(publicOfferListingSchema, /baselineBondBadge/);
  assert.match(publicOfferListingSchema, /noEscrow/);
  assert.match(publicOffersSource, /buildPublicOffersCollectionPayload/);
  assert.match(publicOffersSource, /buildPublicOfferDetailPayload/);
  assert.match(publicOffersSource, /buildPublicOffersFacetsPayload/);
  assert.match(publicOffersSource, /defaultedToWorkedExamples/);
  assert.match(publicOffersSource, /hiddenZeroCountFacets/);
  assert.match(publicOffersSource, /\| "templates"/);
  assert.match(publicOffersSource, /\| "public_goods"/);
  assert.match(publicOffersSource, /availableTabs/);
  assert.match(publicOffersSource, /reviewedSeedTemplates/);
  assert.match(publicOffersSource, /reviewed-seed-templates/);
  assert.match(publicOffersSource, /marketplace-tab-separation/);
  assert.match(publicOffersSource, /moral public goods/);
  assert.match(publicOffersSource, /MARKETPLACE_PUBLIC_GOODS_BOUNDARY/);
  assert.match(publicOffersSource, /sourceOfTruthNote/);
  assert.match(publicOffersSource, /external_crecm_module/);
  assert.match(publicOffersSource, /public-offer-listing/);
  assert.match(publicOffersSource, /validateMoralTradeJsonSchemaSubset/);
  assert.match(publicOffersSource, /listing-json-schema/);
  assert.match(offerFollowSource, /buildOfferFollowPayload/);
  assert.match(offerFollowSource, /offer_carts/);
  assert.match(offerFollowSource, /not public social follows/);
  assert.match(offerFollowSource, /worked-example slugs/);
  assert.match(offerCreateSimilarSource, /buildOfferCreateSimilarPayload/);
  assert.match(offerCreateSimilarSource, /none_draft_prefill/);
  assert.match(offerCreateSimilarSource, /No create-similar storage/);
  assert.match(offerCreateSimilarSource, /evidence URLs/);
  assert.match(offerSavedSearchSource, /normalizeOfferSavedSearchDraft/);
  assert.match(offerSavedSearchSource, /notifyOnLiveMatch/);
  assert.match(offerSavedSearchSource, /sign-in draft/);
  assert.match(offerSavedSearchSource, /cause following/i);
  assert.match(offerSavedSearchMigration, /filters_json/);
  assert.match(offerSavedSearchMigration, /notify_on_live_match/);
  assert.match(offerSavedSearchMigration, /source_route/);
  assert.match(schemaRegistryRoute, /validateMoralTradeSchemaRegistry/);
  assert.match(schemaRegistryRoute, /schemaDocuments/);
  assert.match(schemaRegistryRoute, /publicPayloadSampleValidationCount/);
  assert.match(schemaRegistryRoute, /publicPayloadSampleValidationFailureCount/);
  assert.match(schemaDocumentRoute, /getMoralTradeSchemaDocumentBySlug/);
  assert.match(schemaDocumentRoute, /availableSchemas/);
  assert.match(publicOffersRoute, /buildPublicOffersCollectionPayload/);
  assert.match(publicOffersRoute, /takeMoralTradeApiRateLimitSlot\(request, "offer_collection_read"\)/);
  assert.match(publicOffersRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(publicOffersRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(publicOffersRoute, /offer_collection_read/);
  assert.match(publicOfferDetailRoute, /buildPublicOfferDetailPayload/);
  assert.match(publicOfferDetailRoute, /validatePublicOfferDetailPayload/);
  assert.match(publicOfferDetailRoute, /takeMoralTradeApiRateLimitSlot\(request, "offer_detail_read"\)/);
  assert.match(publicOfferDetailRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(publicOfferDetailRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(publicOfferDetailRoute, /offer_detail_read/);
  assert.match(publicOffersFacetsRoute, /buildPublicOffersFacetsPayload/);
  assert.match(publicOffersFacetsRoute, /validatePublicOffersFacetsPayload/);
  assert.match(publicOffersFacetsRoute, /takeMoralTradeApiRateLimitSlot\(request, "offer_facets_read"\)/);
  assert.match(publicOffersFacetsRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(publicOffersFacetsRoute, /buildMoralTradeApiJsonResponse/);
  assert.match(publicOffersFacetsRoute, /offer_facets_read/);
  assert.match(publicOfferFollowRoute, /validateOfferFollowPayload/);
  assert.match(publicOfferFollowRoute, /takeMoralTradeApiRateLimitSlot\(request, "offer_follow_write"\)/);
  assert.match(publicOfferFollowRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(publicOfferFollowRoute, /offer_follow_write/);
  assert.match(publicOfferFollowRoute, /offer_carts/);
  assert.match(publicOfferFollowRoute, /private, no-store/);
  assert.match(publicOfferCreateSimilarRoute, /validateOfferCreateSimilarPayload/);
  assert.match(
    publicOfferCreateSimilarRoute,
    /takeMoralTradeApiRateLimitSlot\(request, "offer_create_similar"\)/,
  );
  assert.match(publicOfferCreateSimilarRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(publicOfferCreateSimilarRoute, /offer_create_similar/);
  assert.match(publicOfferCreateSimilarRoute, /getOfferById/);
  assert.match(publicOfferCreateSimilarRoute, /private, no-store/);
  assert.match(savedSearchesRoute, /normalizeOfferSavedSearchDraft/);
  assert.match(savedSearchesRoute, /takeMoralTradeApiRateLimitSlot\(request, "saved_search_write"\)/);
  assert.match(savedSearchesRoute, /buildMoralTradeApiRateLimitResponse/);
  assert.match(savedSearchesRoute, /saved_search_write/);
  assert.match(savedSearchesRoute, /private, no-store/);
  assert.match(savedSearchesRoute, /auth_required/);
});

test("pooled donation offset creation has visible path and server-side guardrails", () => {
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const offerDetailSource = readRepoFile("src/app/offers/[offerId]/page.tsx");
  const adminSource = readRepoFile("src/app/admin/page.tsx");
  const evidencePersistenceSource = readRepoFile(
    "src/lib/moral-trade/evidence-persistence.ts",
  );

  assert.match(donationOffsetsPage, /Draft an offset/);
  assert.match(donationOffsetsPage, /DONATION_OFFSET_PLAIN_LABELS/);
  assert.match(offerForm, /offset_pool_maximum_cap_usd/);
  assert.match(offerForm, /offset_anti_threat_certification/);
  assert.match(offerForm, /offset_verification_metadata_acknowledgement/);
  assert.match(offerForm, /One proof, one claim/);
  assert.match(actionsSource, /validateDonationOffsetSubmissionGuards/);
  assert.match(actionsSource, /evidenceLocatorsConflict/);
  assert.match(actionsSource, /validateMoralTradeOfferCreateTransition/);
  assert.match(actionsSource, /getMoralTradeOfferPersistenceStatus/);
  assert.match(actionsSource, /buildMoralTradeOfferProtocolNotes/);
  assert.match(actionsSource, /persistMoralTradeEvidenceSubmission/);
  assert.match(actionsSource, /getDonationOffsetEvidencePersistenceShape/);
  assert.match(actionsSource, /donation-offset:\$\{data\.id\}:initial-evidence/);
  assert.match(actionsSource, /counterfactual_baseline/);
  assert.match(actionsSource, /baseline_credibility_bond/);
  assert.match(offerDetailSource, /getDonationOffsetEvidenceState/);
  assert.match(offerDetailSource, /One proof, one claim/);
  assert.match(offerDetailSource, /Baseline evidence was submitted for reviewer-only provenance review/);
  assert.match(evidencePersistenceSource, /moral_trade_evidence_artifacts/);
  assert.match(evidencePersistenceSource, /moral_trade_evidence_claims/);
  assert.match(evidencePersistenceSource, /moral_trade_traceability_events/);
  assert.match(evidencePersistenceSource, /moral_trade_provenance_activities/);
  assert.match(adminSource, /duplicate proof/);
  assert.match(adminSource, /One proof, one claim/);
});

test("offer detail and worked examples expose instrumented review workflow cards", () => {
  const actionsSource = readRepoFile("src/app/actions.ts");
  const dashboardSource = readRepoFile("src/app/dashboard/page.tsx");
  const offerDetailSource = readRepoFile("src/app/offers/[offerId]/page.tsx");
  const workedExampleSource = readRepoFile("src/app/offers/examples/[exampleId]/page.tsx");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const guestContactMigration = readRepoFile(
    "supabase/migrations/20260529_disable_guest_interest_public_insert.sql",
  );
  const schemaSource = readRepoFile("supabase/schema.sql");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.match(proposalReviewSource, /getOfferReviewWorkflowCards/);
  assert.match(proposalReviewSource, /current_status/);
  assert.match(proposalReviewSource, /baseline_credibility/);
  assert.match(proposalReviewSource, /no_global_moral_ranking/);
  assert.match(proposalReviewSource, /appealable_review_scope/);
  assert.match(proposalReviewSource, /statusReasonCode/);
  assert.match(proposalReviewSource, /statusReasonRule/);
  assert.match(proposalReviewSource, /specific reviewed claim/);
  assert.match(offerDetailSource, /Review workflow/);
  assert.match(offerDetailSource, /Why this record can or cannot be relied on yet/);
  assert.match(offerDetailSource, /getOfferReviewWorkflowContract/);
  assert.match(offerDetailSource, /participantCopyTemplates/);
  assert.match(offerDetailSource, /reviewWorkflowCards\.map/);
  assert.match(offerDetailSource, /Why this status:/);
  assert.match(offerDetailSource, /review-factor-list/);
  assert.match(offerDetailSource, /Participant action guide/);
  assert.match(offerDetailSource, /What the review system will ask for next/);
  assert.match(offerDetailSource, /Participant review action copy/);
  assert.match(offerDetailSource, /Baseline helper/);
  assert.match(offerDetailSource, /baselineHelperText/);
  assert.match(offerDetailSource, /Needs evidence status/);
  assert.match(offerDetailSource, /needsEvidenceStatusCopy/);
  assert.match(offerDetailSource, /Safety boundary/);
  assert.match(offerDetailSource, /safetyWarningCopy/);
  assert.match(offerDetailSource, /Participant importance/);
  assert.match(offerDetailSource, /importanceScoreNote/);
  assert.match(offerDetailSource, /Appeal scope/);
  assert.match(offerDetailSource, /appealCopy/);
  assert.match(offerDetailSource, /Contact after sign-in/);
  assert.match(offerDetailSource, /Save offer/);
  assert.match(offerDetailSource, /createSimilarHref/);
  assert.match(offerDetailSource, /returnTo=\$\{encodeURIComponent\(respondReturnTo\)\}/);
  assert.match(offerDetailSource, /new public contact paths now require\s+sign-in/);
  assert.equal(offerDetailSource.includes("expressGuestInterestAction"), false);
  assert.equal(offerDetailSource.includes("Respond without account"), false);
  assert.match(dashboardSource, /new public contact paths require sign-in first/);
  assert.equal(actionsSource.includes("expressGuestInterestAction"), false);
  assert.equal(actionsSource.includes("Response recorded without an account"), false);
  assert.equal(actionsSource.includes('from("guest_interests").upsert'), false);
  assert.match(schemaSource, /No insert policy is intentionally defined for guest_interests/);
  assert.match(schemaSource, /New offer contact paths require sign-in and write to public\.interests/);
  assert.equal(schemaSource.includes('create policy "guest_interests_insert_public"'), false);
  assert.match(guestContactMigration, /drop policy if exists "guest_interests_insert_public"/);
  assert.match(guestContactMigration, /New public contact writes are disabled/);
  assert.match(workedExampleSource, /getOfferReviewWorkflowCards/);
  assert.match(workedExampleSource, /Worked example; manual review required before reliance/);
  assert.match(workedExampleSource, /reviewWorkflowCards\.map/);
  assert.match(workedExampleSource, /Why this status:/);
  assert.match(globalCss, /review-workflow-grid/);
  assert.match(globalCss, /review-workflow-card-human_review/);
  assert.match(globalCss, /review-status-reason/);
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
  const seedTemplatesSource = readRepoFile("src/lib/marketplace-seed-templates.ts");

  assert.match(offerForm, /REVIEWED_MARKETPLACE_SEED_TEMPLATES/);
  assert.match(seedTemplatesSource, /One-meal food-abstention pledge swap/);
  assert.match(seedTemplatesSource, /Direct donation-offset redirect/);
  assert.match(seedTemplatesSource, /Threshold offset pool/);
  assert.match(seedTemplatesSource, /Few-day reciprocal micro-pledge sequence/);
  assert.match(seedTemplatesSource, /Thirty-day or longer abstention pledges are manual exceptions/);
  assert.match(offerForm, /applyOfferTemplate/);
  assert.match(offerForm, /Templates focus on the launch wedge/);
  assert.match(offerForm, /applyOfferTemplate\(template\.prefill\)/);
  assert.match(offerForm, /setOfferAction\(template\.offerAction\)/);
  assert.match(offerForm, /setBaselineStatement\(template\.baselineStatement\)/);
  assert.match(offerForm, /disabled=\{!canPublishOffer\}/);
  assert.match(offerForm, /liveOfferErrors/);
});

test("offer creation hides offset-only compromise destination for non-offset modes", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(
    offerForm,
    /\{isOffset \? \(\s*<label className="field">\s*<span>Compromise destination \(offset only\)<\/span>[\s\S]*name="compromise_cause"[\s\S]*\) : null\}/,
  );
  assert.match(
    actionsSource,
    /compromise_cause: normalizedMode === "offset" \? compromiseCause : "Not needed"/,
  );
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
  assert.match(offerForm, /getOfferReviewWorkflowCards/);
  assert.match(offerForm, /reviewWorkflowCards/);
  assert.match(offerForm, /Draft review workflow cards/);
  assert.match(offerForm, /review-workflow-card-\$\{card\.status\}/);
  assert.match(offerForm, /review-factor-list/);
  assert.match(offerForm, /review-next-step/);
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
  assert.match(offerForm, /protocolReview\.userFacingBlockerExplanations/);
  assert.match(offerForm, /Review blockers/);
  assert.doesNotMatch(offerForm, /Policy conflicts:/);
  assert.match(offerForm, /Reviewer scope/);
  assert.match(offerForm, /Clarification questions/);
  assert.match(offerForm, /Cited evidence table/);
  assert.match(offerForm, /Next step checklist/);
  assert.match(offerForm, /Reviewer summary/);
  assert.match(offerForm, /protocolReview\.clarificationQuestions/);
  assert.match(offerForm, /protocolReview\.reviewerSummary/);
  assert.match(offerForm, /CopilotReviewState/);
  assert.match(offerForm, /runSchemaBoundCopilotReview/);
  assert.match(offerForm, /\/api\/moral-trade\/copilot\/review/);
  assert.match(offerForm, /structured_draft/);
  assert.match(offerForm, /evidence_metadata/);
  assert.match(offerForm, /Schema-bound copilot check/);
  assert.match(offerForm, /stateMutation false/);
  assert.match(offerForm, /decisioningMode/);
  assert.match(offerForm, /copilotReview\.response\.output\.clarification_questions/);
  assert.match(offerForm, /copilotReview\.response\.output\.cited_evidence_table/);
  assert.match(offerForm, /copilotReview\.response\.output\.reviewer_summary/);
  assert.match(offerNewPage, /getMoralTradeProvenanceContract/);
  assert.match(offerNewPage, /provenanceValidationRules=\{provenanceValidationRules\}/);
  assert.match(offerForm, /completedWizardSteps/);
  assert.match(offerForm, /wizardProgressPercent/);
  assert.match(offerForm, /href: "#offer-route"/);
  assert.match(offerForm, /id="offer-terms"/);
  assert.match(offerForm, /id="offer-boundaries"/);
  assert.match(offerForm, /id="offer-evidence"/);
  assert.match(offerForm, /id="offer-publish"/);
  assert.match(offerNewPage, /page-shell offer-create-shell/);
  assert.match(offerNewPage, /auth-grid offer-create-grid/);
  assert.match(globalCss, /offer-wizard-panel/);
  assert.match(globalCss, /offer-wizard-steps/);
  assert.match(globalCss, /\.offer-create-shell \.offer-create-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(globalCss, /\.offer-create-shell \.offer-wizard-steps[\s\S]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(globalCss, /\.offer-create-shell \.offer-template-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(globalCss, /@media \(max-width: 1023px\)[\s\S]*\.offer-create-shell \.offer-wizard-steps[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(globalCss, /@media \(max-width: 760px\)[\s\S]*\.offer-create-shell \.offer-wizard-steps[\s\S]*grid-template-columns: 1fr/);
  assert.match(globalCss, /protocol-review-panel/);
  assert.match(globalCss, /protocol-verification-list/);
  assert.match(globalCss, /protocol-provenance-preflight/);
  assert.match(globalCss, /schema-copilot-panel/);
  assert.match(globalCss, /schema-copilot-detail-grid/);
  assert.match(globalCss, /protocol-provenance-list/);
  assert.match(globalCss, /protocol-verification-step/);
  assert.match(globalCss, /protocol-workflow-card/);
  assert.match(globalCss, /protocol-factor-list/);
  assert.match(globalCss, /protocol-gate-list/);
  assert.match(globalCss, /protocol-workflow-evidence-grid/);
  assert.match(globalCss, /protocol-evidence-row-list/);
});

test("offer exit condition field exposes accessible template suggestions", () => {
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.match(offerForm, /TemplateTextareaSuggestions/);
  assert.match(offerForm, /EXIT_CONDITION_TEMPLATE_SUGGESTIONS/);
  assert.match(offerForm, /If required evidence is not submitted by the deadline/);
  assert.match(offerForm, /If payment, donation, or offset evidence cannot be verified/);
  assert.match(offerForm, /aria-autocomplete="list"/);
  assert.match(offerForm, /role="listbox"/);
  assert.match(offerForm, /event\.key === "ArrowDown"/);
  assert.match(offerForm, /event\.key === "ArrowUp"/);
  assert.match(offerForm, /event\.key === "Escape"/);
  assert.match(offerForm, /event\.key === "Enter" \|\| event\.key === "Tab"/);
  assert.match(offerForm, /onChange=\{setExitCondition\}/);
  assert.match(globalCss, /template-suggestion-panel/);
  assert.match(globalCss, /template-suggestion-option\[aria-selected="true"\]/);
});

test("offers page keeps content before the footer in source order", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const mainIndex = offersPage.indexOf("<main");
  const browseIndex = offersPage.indexOf("<MarketplaceHome");
  const bottomNavIndex = offersPage.indexOf("<MarketplaceBottomNav");
  const footerIndex = offersPage.indexOf("<SiteFooter />");

  assert.ok(mainIndex > -1);
  assert.ok(browseIndex > mainIndex);
  assert.ok(bottomNavIndex > browseIndex);
  assert.ok(footerIndex > bottomNavIndex);
});

test("create trade route family has stable signed-out entry points", () => {
  const createRoute = readRepoFile("src/app/create/page.tsx");
  const newOfferPage = readRepoFile("src/app/offers/new/page.tsx");
  const donationOffsetsPage = readRepoFile("src/app/donation-offsets/page.tsx");
  const marketplaceBoundary = readRepoFile("src/lib/moral-trade/marketplace-boundary.ts");
  const marketplaceIntakeTriage = readRepoFile(
    "src/lib/moral-trade/marketplace-intake-triage.ts",
  );
  const seedTemplatesSource = readRepoFile("src/lib/marketplace-seed-templates.ts");

  assert.match(createRoute, /Create trade/);
  assert.match(createRoute, /NewOfferPage/);
  assert.equal(createRoute.includes("redirect("), false);
  assert.match(newOfferPage, /Create an account to save and publish a structured trade proposal/);
  assert.match(newOfferPage, /Marketplace intake triage/);
  assert.match(newOfferPage, /MARKETPLACE_INTAKE_TRIAGE_ROUTES/);
  assert.match(newOfferPage, /data-intake-route/);
  assert.match(newOfferPage, /Next action:/);
  assert.match(newOfferPage, /Correction path:/);
  assert.match(marketplaceIntakeTriage, /sourceOfTruthNote/);
  assert.match(marketplaceIntakeTriage, /ordinary_donation/);
  assert.match(marketplaceIntakeTriage, /ordinary_matching_or_cofunding/);
  assert.match(marketplaceIntakeTriage, /ordinary_procurement_or_service/);
  assert.match(marketplaceIntakeTriage, /self_offset_bookkeeping/);
  assert.match(marketplaceIntakeTriage, /external_crecm_module/);
  assert.match(marketplaceIntakeTriage, /background_networking_request/);
  assert.match(marketplaceIntakeTriage, /prohibited_or_unsupported/);
  assert.match(marketplaceIntakeTriage, /route_away_points_to_lock_path/);
  assert.match(marketplaceIntakeTriage, /triage_infers_private_moral_profile/);
  assert.match(newOfferPage, /MARKETPLACE_PUBLIC_GOODS_BOUNDARY/);
  assert.match(marketplaceBoundary, /moralpublicgoods131\.md/);
  assert.match(marketplaceBoundary, /CRECM v1\.125/);
  assert.match(marketplaceBoundary, /userFacingLabel: "Common Ground Budget"/);
  assert.match(marketplaceBoundary, /marketplaceLaneLabel: "Public Goods Fund"/);
  assert.match(marketplaceBoundary, /marketplaceLaneCtaLabel: "Open Public Goods Fund"/);
  assert.match(marketplaceBoundary, /Common Ground Budget route/);
  assert.equal(marketplaceBoundary.includes("moralpublicgoods102.md"), false);
  assert.equal(marketplaceBoundary.includes("CRECM v1.96"), false);
  assert.equal(marketplaceBoundary.includes("external CRECM module"), false);
  assert.equal(marketplaceBoundary.includes("Verified Assurance Matching"), false);
  assert.match(newOfferPage, /data-signed-out-offset-preview="true"/);
  assert.match(newOfferPage, /Preview the donation-offset shape before sign-in/);
  assert.match(newOfferPage, /Sign-in is required before\s+saving, publishing, requesting review, disclosing counterparties, authorizing\s+money, or creating a live offer/);
  assert.match(newOfferPage, /DONATION_OFFSET_PLAIN_LABELS/);
  assert.match(donationOffsetsPage, /DONATION_OFFSET_PLAIN_LABELS/);
  assert.equal(donationOffsetsPage.includes("What would each side donate without this trade?"), false);
  assert.match(seedTemplatesSource, /what would each side donate without this trade/);
  assert.match(seedTemplatesSource, /what would make this unsafe or invalid/);
  assert.match(newOfferPage, /Public receipt preview/);
  assert.match(newOfferPage, /Receipts are private by default and opt-in only/);
  assert.match(newOfferPage, /Correction and revocation/);
  assert.match(newOfferPage, /buildOfferCreationReturnTo/);
  assert.match(newOfferPage, /encodeURIComponent\(offerCreationReturnTo\)/);
  assert.match(newOfferPage, /source_offer/);
  assert.equal(newOfferPage.includes("requireViewer"), false);
});

test("marketplace pilot copy separates live offers from worked examples", () => {
  const adminPage = readRepoFile("src/app/admin/page.tsx");
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const marketplaceComponents = readRepoFile("src/components/marketplace/marketplace-components.tsx");
  const offerForm = readRepoFile("src/components/offers/offer-create-form.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const mpgfPage = readRepoFile("src/app/mpgf/page.tsx");
  const mpgfRoundBoard = readRepoFile("src/components/mpgf/mpgf-round-board.tsx");
  const mpgfContributePage = readRepoFile("src/app/mpgf/contribute/page.tsx");
  const roundPage = readRepoFile("src/app/mpgf/rounds/[roundId]/page.tsx");
  const publicOffersSource = readRepoFile("src/lib/public-offers.ts");
  const seedTemplatesSource = readRepoFile("src/lib/marketplace-seed-templates.ts");

  assert.match(offersPage, /Live offers/);
  assert.match(offersPage, /Worked examples/);
  assert.match(offersPage, /MARKETPLACE_BOOTSTRAP_TABS/);
  assert.match(offersPage, /value: "templates"/);
  assert.match(offersPage, /value: "worked_examples"/);
  assert.match(offersPage, /value: "demo"/);
  assert.match(offersPage, /value: "public_goods"/);
  assert.match(offersPage, /Start reviewed template/);
  assert.match(offersPage, /Demo records/);
  assert.match(offersPage, /Public Goods Fund/);
  assert.match(offersPage, /laneCtaLabel: MARKETPLACE_PUBLIC_GOODS_BOUNDARY\.marketplaceLaneCtaLabel/);
  assert.match(offersPage, /Common Ground Budget result available/);
  assert.match(offersPage, /id="public-goods-result-card"/);
  assert.match(offersPage, /data-primary-result="common-ground-budget"/);
  assert.match(offersPage, /role="status" aria-live="polite"/);
  assert.match(offersPage, /aria-describedby="public-goods-result-announcement public-goods-result-summary"/);
  assert.match(offersPage, /Preview a Common Ground Budget/);
  assert.match(offersPage, /public-goods-primary-action/);
  assert.equal((offersPage.match(/public-goods-primary-action/g) ?? []).length, 1);
  assert.match(offersPage, /Common Ground Budget \/ Public Goods Fund result available/);
  assert.equal(offersPage.includes("No ordinary moral-trade offers match this search"), false);
  assert.match(offersPage, /The moral-public-goods route is separate/);
  assert.match(offersPage, /Current mode/);
  assert.match(offersPage, /capped pilot/);
  assert.match(offersPage, /No charge in this preview/);
  assert.equal(offersPage.includes("Payment capture"), false);
  assert.match(offersPage, /Current safe action/);
  assert.match(offersPage, /preview budget/);
  assert.match(offersPage, /Capture enabled/);
  assert.match(offersPage, /Qualitative progress/);
  assert.match(offersPage, /Needs more support/);
  assert.match(offersPage, /Browse ordinary offers instead/);
  assert.match(publicOffersSource, /View current round/);
  assert.match(publicOffersSource, /View audit and rules/);
  assert.match(offersPage, /Fund public goods only if enough different-view support joins/);
  assert.match(offersPage, /No charge\s+now/);
  assert.match(offersPage, /Exact live progress may be hidden until the round closes/);
  assert.match(offersPage, /does not\s+create, edit, clear, authorize, capture, release, reward, credit, certify, or\s+audit any CRECM record/);
  assert.match(offersPage, /Search terms, clicks, browsing, and CTA selection do not infer allocatable\s+project stances or create a pledge/);
  assert.match(offersPage, /Review, identity, payment, authorization,\s+sponsor, sealed-progress, failure-bonus, reward, credit, certificate, and audit\s+gates still apply/);
  assert.match(offersPage, /live progress sealed before close/);
  assert.match(offersPage, /no\s+escrow or custody claim unless a valid custody route records one/);
  assert.match(offersPage, /no payment-protection, tax-treatment, legal-advice, impact-certainty,\s+guaranteed-match, or capture-timing claim beyond the recorded CRECM state/);
  assert.match(offersPage, /gross,\s+fee,\s+net-recipient,\s+actual,\s+counted,\s+and match-eligible accounting channels/);
  assert.match(offersPage, /requires final review before any binding budget or project stance is saved/);
  assert.equal(offersPage.includes("escrow-backed"), false);
  assert.equal(offersPage.includes("funds held"), false);
  assert.equal(offersPage.includes("payment protection"), false);
  assert.equal(offersPage.includes("tax-deductible"), false);
  assert.equal(offersPage.includes("legal advice"), false);
  assert.equal(offersPage.includes("guaranteed match"), false);
  assert.equal(offersPage.includes("guaranteed impact"), false);
  assert.match(offersPage, /No escrow claim/);
  assert.match(offersPage, /Separated accounting/);
  assert.match(offersPage, /Final review consent/);
  assert.match(offersPage, /aria-label="moral public goods text status labels"/);
  assert.match(offersPage, /Budget to Projects to Review; no binding save before final review/);
  assert.match(offersPage, /Advanced details/);
  assert.match(offersPage, /Lane counts/);
  assert.match(offersPage, /Rulebook hash/);
  assert.match(offersPage, /Calculation version/);
  assert.match(offersPage, /Deployment mode/);
  assert.match(offersPage, /Audit bundle/);
  assert.match(offersPage, /Audit bundle contract/);
  assert.match(offersPage, /Rulebook report/);
  assert.match(offersPage, /success-without-me progress stays sealed before close/);
  assert.match(mpgfPage, /Common Ground Budget \| Public Goods Fund/);
  assert.match(mpgfPage, /Preview a Common Ground Budget/);
  assert.match(mpgfPage, /View current round/);
  assert.match(mpgfPage, /Learn how it works \/ View audit and rules/);
  assert.match(mpgfPage, /roundBoardCardByCampaignId/);
  assert.match(mpgfPage, /Qualitative progress/);
  assert.match(mpgfPage, /sealedProgressLabel/);
  assert.match(mpgfRoundBoard, /Your choice/);
  assert.match(mpgfRoundBoard, /Your maximum/);
  assert.match(mpgfRoundBoard, /Deployment mode: capped pilot/);
  assert.match(mpgfPage, /Review contribution controls/);
  assert.equal(mpgfPage.includes("Start conditional contribution"), false);
  assert.match(mpgfContributePage, /\/login\?returnTo=\/mpgf\/contribute/);
  assert.match(mpgfContributePage, /viewerPresent=\{Boolean\(viewer\)\}/);
  assert.match(publicOffersSource, /PUBLIC_GOODS_BINDING_CTA_PREREQUISITES/);
  assert.match(publicOffersSource, /public-goods-cta-hierarchy/);
  assert.match(publicOffersSource, /requiresFinalReviewBeforeBinding/);
  assert.match(publicOffersSource, /normal_crecm_gates/);
  assert.match(publicOffersSource, /safeForDeploymentModes/);
  const mpgfPreviewCtaIndex = mpgfPage.indexOf("Preview a Common Ground Budget");
  const mpgfCurrentRoundCtaIndex = mpgfPage.indexOf("View current round");
  const mpgfContributionControlsIndex = mpgfPage.indexOf("Review contribution controls");
  assert.ok(mpgfPreviewCtaIndex > -1);
  assert.ok(mpgfCurrentRoundCtaIndex > mpgfPreviewCtaIndex);
  assert.ok(mpgfContributionControlsIndex > mpgfCurrentRoundCtaIndex);
  assert.match(roundPage, /qualitativeSealedProgressLabel/);
  assert.match(roundPage, /Qualitative progress/);
  assert.match(roundPage, /Likely near threshold/);
  assert.match(roundPage, /Review pending/);
  assert.match(roundPage, /Closed; final audit available/);
  assert.match(offersPage, /Search public-goods funding/);
  assert.match(offersPage, /Deployment mode/);
  assert.match(offersPage, /Round state/);
  assert.match(offersPage, /Project bucket/);
  assert.match(offersPage, /showPublicGoodsEntryCard \? \(/);
  assert.match(offersPage, /Collapsed ordinary-offer filters for public-goods search/);
  assert.match(offersPage, /Ordinary-offer filters remain separated/);
  assert.match(offersPage, /Other ways to browse separated marketplace lanes/);
  assert.match(offersPage, /Other ways to browse/);
  assert.match(offersPage, /marketplaceBrowseLanes/);
  assert.match(offersPage, /Shadow previews lane/);
  assert.match(offersPage, /Capped-pilot rounds lane/);
  assert.match(offersPage, /Collapsed advanced moral public goods audit details/);
  assert.match(offersPage, /filter-drawer-content/);
  assert.match(offersPage, /assurance matching/);
  assert.match(offersPage, /conditional public-good pledge/);
  assert.match(offersPage, /cross-view funding/);
  assert.match(offersPage, /MARKETPLACE_PUBLIC_GOODS_BOUNDARY/);
  assert.match(offersPage, /sourceOfTruthNote/);
  assert.match(offersPage, /mechanismVersion/);
  assert.match(offersPage, /publicGoodsEntry\?\.mechanismVersion/);
  assert.equal(offersPage.includes("Public Goods Fund module without mixing their counts"), false);
  assert.match(offersPage, /demoMpgfAssuranceRound/);
  assert.match(offersPage, /seedRoundProjects/);
  assert.match(offersPage, /common-ground-budget-preview/);
  assert.match(offersPage, /createDonationOffsetTemplateHref/);
  assert.match(offersPage, /createPledgeSwapTemplateHref/);
  assert.match(offersPage, /REVIEWED_MARKETPLACE_SEED_TEMPLATES/);
  assert.match(offersPage, /Reviewed non-public-goods templates/);
  assert.match(offersPage, /reviewed donation-offset/);
  assert.match(publicOffersSource, /shadow_previews/);
  assert.match(publicOffersSource, /capped_pilot_rounds/);
  assert.match(publicOffersSource, /public_goods_modules/);
  assert.match(publicOffersSource, /marketplace-browse-lane-separation/);
  assert.match(offersPage, /final-lock confirmation/);
  assert.match(offersPage, /Public offer count/);
  assert.match(offersPage, /cannot count as\s+live offers/);
  assert.match(marketplaceComponents, /<h1 id="moral-marketplace-heading">Browse offers<\/h1>/);
  assert.match(marketplaceComponents, /Search causes, templates, rounds/);
  assert.match(marketplaceComponents, /No live offers yet · Showing examples and templates/);
  assert.match(marketplaceComponents, /Templates/);
  assert.match(marketplaceComponents, /Examples/);
  assert.match(marketplaceComponents, /Public goods/);
  assert.match(marketplaceComponents, /Guides/);
  assert.match(offersPage, /Worked example, not live liquidity/);
  assert.match(offersPage, /Manual review before reliance/);
  assert.match(offersPage, /isPublicGoodsDirectoryIntent/);
  assert.match(offersPage, /publicGoodsSearchIntent/);
  assert.match(offersPage, /defaultView: DirectoryView = publicGoodsSearchIntent/);
  assert.match(offersPage, /buildPublicGoodsEntryCard/);
  assert.match(offersPage, /publicGoodsEntry\?\.primaryCta/);
  assert.match(offersPage, /publicGoodsEntry\?\.secondaryCtas/);
  assert.match(offersPage, /Gross captured/);
  assert.match(offersPage, /Fees excluded/);
  assert.match(offersPage, /Net recipient/);
  assert.match(offersPage, /Counted \/ match-eligible/);
  assert.match(offersPage, /Reward \/ credit \/ certificate/);
  assert.match(offersPage, /Ordinary \/ worked \/ demo \/ module/);
  assert.match(offersPage, /publicGoodsEntry\?\.accountingSnapshot\.grossCapturedCents/);
  assert.match(offersPage, /publicGoodsEntry\?\.accountingSnapshot\.successRewardCents/);
  assert.match(offersPage, /showPublicGoodsEntryCard \? null : \(\s*<MarketplaceHome/);
  assert.match(offersPage, /liveOfferCount=\{liveOfferCount\}/);
  const mainContentIndex = offersPage.indexOf('<main id="main-content"');
  const publicGoodsResultIndex = offersPage.indexOf('id="public-goods-result-card"');
  const publicGoodsPrimaryCtaIndex = offersPage.indexOf('public-goods-primary-action');
  const publicGoodsSummaryGridIndex = offersPage.indexOf('aria-label="moral public goods search-result summary"');
  const marketplaceShellIndex = offersPage.indexOf('aria-label="Offer marketplace"');
  assert.ok(mainContentIndex > -1);
  assert.ok(publicGoodsResultIndex > mainContentIndex);
  assert.ok(publicGoodsPrimaryCtaIndex > publicGoodsResultIndex);
  assert.ok(publicGoodsPrimaryCtaIndex < publicGoodsSummaryGridIndex);
  assert.ok(publicGoodsResultIndex < marketplaceShellIndex);
  assert.match(publicOffersSource, /publicGoodsEntry/);
  assert.match(publicOffersSource, /buildPublicGoodsEntryCard/);
  assert.match(publicOffersSource, /validateMpgfCrecPublishedCopyBundle/);
  assert.match(publicOffersSource, /copyValidation/);
  assert.match(publicOffersSource, /MPGF_CRECM_COPY_VALIDATION_POLICY/);
  assert.match(publicOffersSource, /public-offers-api-v0\.4-2026-06/);
  assert.match(publicOffersSource, /public-offers-api-validator-v0\.4/);
  assert.match(publicOffersSource, /noPrimaryZeroState/);
  assert.match(publicOffersSource, /ordinaryOfferZeroStateSecondary/);
  assert.match(publicOffersSource, /zeroFacetPanelsHidden/);
  assert.match(publicOffersSource, /public-goods-zero-state-suppression/);
  assert.match(publicOffersSource, /ordinaryOfferFiltersCollapsed/);
  assert.match(publicOffersSource, /exactLiveProgressExposed/);
  assert.match(offersPage, /query\.set\("tab", params\.view\)/);
  assert.match(offersPage, /parseDirectoryView/);
  assert.match(offersPage, /No live offers yet/);
  assert.match(offersPage, /No matching listings/);
  assert.match(offersPage, /Browse worked examples or create the first public offer/);
  assert.match(offersPage, /Baseline confidence is separate from action evidence/);
  assert.match(offersPage, /visibleFormatCounts/);
  assert.match(offersPage, /collection-trust-panel/);
  assert.match(roundPage, /id="common-ground-budget-preview"/);
  assert.match(seedTemplatesSource, /REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT/);
  assert.match(seedTemplatesSource, /REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT/);
  assert.match(seedTemplatesSource, /promotionBehavior: "reviewed_template_only"/);
  assert.match(seedTemplatesSource, /liveMetricEligible: false/);
  assert.match(seedTemplatesSource, /reviewStatus: "admin_reviewed"/);
  assert.match(offerForm, /REVIEWED_MARKETPLACE_SEED_TEMPLATES/);
  assert.match(offerForm, /template\.reviewStatusLabel/);
  assert.match(adminPage, /Reviewed seed template promotion controls/);
  assert.match(adminPage, /Promotion requires reviewed live-template approval/);
  assert.match(globalCss, /\.marketplace-bootstrap-grid/);
  assert.match(globalCss, /\.offer-template-button small/);
  assert.match(globalCss, /\.marketplace-bootstrap-projects/);
  assert.equal(offersPage.includes("Browse the narrow pilot wedge"), false);
  assert.equal(offersPage.includes("worked example s"), false);
  assert.equal(offersPage.includes("Live participant offers will appear here"), false);
});

test("worked examples have canonical detail pages and sitemap coverage", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const exampleDetailPage = readRepoFile("src/app/offers/examples/[exampleId]/page.tsx");
  const marketplaceComponents = readRepoFile("src/components/marketplace/marketplace-components.tsx");
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
  assert.match(exampleDetailPage, /Example · Preview only · No commitment/);
  assert.match(marketplaceComponents, /No commitment was created\./);
  assert.match(sitemapSource, /\/offers\/examples\/\$\{offer\.id\}/);
});

test("core Moral Trade email outbox copy stays generic and dashboard-directed", () => {
  const actionsSource = readRepoFile("src/app/actions.ts");
  const emailCopySource = readRepoFile("src/lib/moral-trade/email-copy.ts");
  const emailJobRoute = readRepoFile("src/app/api/jobs/email/route.ts");
  const paymentReminderRoute = readRepoFile("src/app/api/jobs/payment-reminders/route.ts");
  const stripeWebhookRoute = readRepoFile("src/app/api/stripe/webhook/route.ts");

  assert.match(actionsSource, /buildMoralTradeSafeEmailCopy\("offer_response_received"\)/);
  assert.match(actionsSource, /buildMoralTradeSafeEmailCopy\("response_accepted"\)/);
  assert.match(paymentReminderRoute, /buildMoralTradeSafeEmailCopy\("payment_reminder"\)/);
  assert.match(paymentReminderRoute, /buildMoralTradeSafeEmailCopy\("payment_schedule_update"\)/);
  assert.match(stripeWebhookRoute, /buildMoralTradeSafeEmailCopy\(/);
  assert.match(emailCopySource, /leaves out participant aliases/);
  assert.match(emailCopySource, /payment amounts/);
  assert.match(emailCopySource, /agreement IDs/);
  assert.match(emailCopySource, /source notes/);
  assert.match(emailCopySource, /evaluateMoralTradeEmailOutboxSafety/);
  assert.match(emailCopySource, /contact_email_in_body/);
  assert.match(emailCopySource, /payment_amount_in_body/);
  assert.match(emailJobRoute, /evaluateMoralTradeEmailOutboxSafety/);
  assert.match(emailJobRoute, /status: "suppressed"/);
  assert.match(emailJobRoute, /resend_safety_gate/);
  assert.equal(actionsSource.includes("responded to ${offer.offered_cause}"), false);
  assert.equal(actionsSource.includes("An agreement was created for ${offer.offered_cause}"), false);
  assert.equal(paymentReminderRoute.includes("A negotiated payment of ${amount}"), false);
  assert.equal(paymentReminderRoute.includes("A scheduled ${amount} payment"), false);
  assert.equal(stripeWebhookRoute.includes("for agreement ${payment.agreement_id}"), false);
  assert.equal(stripeWebhookRoute.includes("payment ${payment.id} failed"), false);
});

test("agreement payment checkout path records no-capture authorization stubs for controlled trades", () => {
  const agreementPage = readRepoFile("src/app/agreements/[agreementId]/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");
  const stripeWebhookRoute = readRepoFile("src/app/api/stripe/webhook/route.ts");
  const schemaSql = readRepoFile("supabase/schema.sql");
  const migration = readRepoFile(
    "supabase/migrations/20260607_agreement_payment_authorization_stubs.sql",
  );

  assert.match(agreementPage, /buildAgreementPaymentAuthorizationPreview/);
  assert.match(agreementPage, /Record no-capture payment authorization/);
  assert.match(agreementPage, /Payment authorization gates/);
  assert.match(actionsSource, /buildAgreementPaymentAuthorizationPreview/);
  assert.match(actionsSource, /No Stripe Checkout was created/);
  assert.match(actionsSource, /authorization_mode: paymentAuthorizationPreview\.authorizationMode/);
  assert.match(stripeWebhookRoute, /isAgreementPaymentCapturePermitted/);
  assert.match(stripeWebhookRoute, /capture_blocked/);
  assert.match(schemaSql, /authorization_mode text not null default 'direct_checkout'/);
  assert.match(schemaSql, /no_capture_until_matched_lock_confirmed/);
  assert.match(migration, /agreement_payments_authorization_mode_check/);
  assert.match(migration, /agreement_payments_capture_policy_check/);
});
