import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  return getPrimaryNavLinks(false).flatMap((link) =>
    "items" in link && link.items
      ? link.items.map((item) => item.href)
      : "href" in link && link.href
        ? [link.href]
        : [],
  );
}

test("public navigation exposes professional marketplace routes", () => {
  const links = getPrimaryNavLinks(false);
  const labels = links.map((link) => link.label);
  const hrefs = flattenPrimaryNavHrefs();
  const footerHrefs = FOOTER_LINK_GROUPS.flatMap((group) => group.links.map((link) => link.href));
  const siteSource = readRepoFile("src/lib/site.ts");
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  const globalCss = readRepoFile("src/app/globals.css");

  assert.deepEqual(labels, [
    "Feed",
    "Discover",
    "Create",
    "Invite",
    "Messages",
    "Commitments",
    "Evidence",
    "Safety",
  ]);
  assert.deepEqual(hrefs, [
    "/feed",
    "/discover",
    "/trades/new",
    "/invite",
    "/messages",
    "/commitments",
    "/evidence",
    "/safety",
  ]);
  assert.deepEqual(getTopbarActions(false).authLink, { href: "/login", label: "Sign in" });
  assert.deepEqual(getTopbarActions(false).primaryAction, { href: "/start", label: "Get started" });
  assert.deepEqual(getTopbarActions(true).primaryAction, { href: "/trades/new", label: "Create" });
  assert.equal(getTopbarActions(true).authLink, undefined);

  for (const href of [
    "/feed",
    "/discover",
    "/trades/new",
    "/messages",
    "/commitments",
    "/evidence",
    "/safety",
    "/worked-examples",
    "/moral-trade/technical-spec",
    "/team-and-governance",
    "/privacy",
    "/terms",
  ]) {
    assert.ok(hrefs.includes(href) || footerHrefs.includes(href), `missing public route: ${href}`);
  }

  assert.equal(hrefs.includes("/cart"), false);
  assert.equal(siteSource.includes("social credit"), false);
  assert.match(siteSource, /href: "\/feed", label: "Feed"/);
  assert.match(siteSource, /href: "\/trades\/new", label: "Create"/);
  assert.match(topbarSource, /filterSmartSiteSearchItems/);
  assert.match(topbarSource, /placeholder="Search offers, people, pools, or evidence"/);
  assert.match(topbarSource, /topbar-search-results/);
  assert.match(topbarSource, /showSearch = true/);
  assert.match(globalCss, /\.button-secondary\.button-nav\.is-active/);
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

test("MPGF public copy leads with reviewed external evidence instead of raw gate/debug wording", () => {
  assert.match(MPGF_COPY.plainLanguageSummary, /direct-to-charity Every\.org route/i);
  assert.match(MPGF_COPY.plainLanguageSummary, /reviewed external evidence as fallback/i);
  assert.match(MPGF_COPY.manualExternalPaymentEvidence, /starts review/i);
  assert.match(MPGF_COPY.manualExternalPaymentEvidence, /does not move money/i);

  const publicMpgfSources = [
    "src/app/mpgf/page.tsx",
    "src/app/mpgf/contribute/page.tsx",
    "src/components/mpgf/mpgf-page-frame.tsx",
    "src/components/mpgf/mpgf-console.tsx",
  ].map(readRepoFile).join("\n");

  assert.match(publicMpgfSources, /direct-to-charity Every\.org route/i);
  assert.match(publicMpgfSources, /reviewed external evidence/i);
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

test("live offers stay separated from examples while the wish registry uses broad previews", () => {
  assert.equal(CANONICAL_WORKED_CASE_COUNT, 8);
  assert.equal(getAllOffers([]).length, CANONICAL_WORKED_CASE_COUNT);
  assert.ok(
    CANONICAL_WORKED_CASE_OFFERS.every((offer) => offer.offerAction && offer.requestAction && offer.verification),
  );

  const offersPage = readRepoFile("src/app/offers/page.tsx");
  assert.match(offersPage, /LIVE_METADATA/);
  assert.match(offersPage, /without mixing examples or explanatory records into marketplace inventory/);
  assert.match(offersPage, /if \(view === "templates" \|\| legacyTab === "templates"\) return <TradeTemplateLibrary \/>/);
  assert.match(offersPage, /Live participant records only/);
  assert.match(offersPage, /Search never substitutes examples for live demand/);
  assert.match(offersPage, /livePage\.error \? \(/);
  assert.match(offersPage, /Results unavailable/);
  assert.match(offersPage, /No live proposals are open/);
  assert.equal(offersPage.includes("CANONICAL_WORKED_CASE_OFFERS"), false);
  assert.equal(offersPage.includes("No public offers have been published yet"), false);

  const registryPage = readRepoFile("src/app/wish-registry/page.tsx");
  const wishRegistrySource = readRepoFile("src/lib/wish-registry.ts");
  assert.match(registryPage, /EXAMPLE_WISH_PREVIEWS/);
  assert.match(registryPage, /filterWishRegistryExamplePreviews/);
  assert.match(registryPage, /Broad preview only/);
  assert.match(registryPage, /Browse broad previews/);
  assert.match(registryPage, /Exact wishes,[\s\S]*contact details stay hidden/);
  assert.equal(registryPage.includes("match score"), false);
  assert.match(wishRegistrySource, /getWishRegistryRedactedOverlapTokens/);
  assert.match(wishRegistrySource, /getWishRegistryCompatibilityBand/);
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

test("returning home page exposes the screenshot navigation contract", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");

  assert.match(homeSource, /aria-label="Primary"/);
  assert.match(homeSource, /href="\/feed">Feed/);
  assert.match(homeSource, />\s*Now\s*</);
  assert.match(homeSource, /href="\/offers">Discover/);
  assert.match(homeSource, /href="\/commitments">Activity/);
  assert.match(homeSource, /href="\/evidence">Evidence/);
  assert.match(homeSource, /href="\/profile">Account/);
  assert.match(homeSource, /href="\/offers\?view=templates"/);
  assert.match(homeSource, /Offer a trade/);
  assert.doesNotMatch(homeSource, /SiteTopbar/);
});

test("global search and offers search expose real marketplace discovery", () => {
  const topbarSource = readRepoFile("src/components/layout/site-topbar.tsx");
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const animalResults = filterSiteSearchItems("animal welfare");
  const manualEvidenceResults = filterSiteSearchItems("manual evidence");
  const publicGoodsResults = filterSiteSearchItems("moral public goods");
  const commonGroundResults = filterSiteSearchItems("common ground budget");
  const validationResults = filterSiteSearchItems("appeal rulebook");

  assert.match(topbarSource, /placeholder="Search offers, people, pools, or evidence"/);
  assert.match(topbarSource, /filterSmartSiteSearchItems/);
  assert.match(topbarSource, /\/api\/query\/interpret/);
  assert.match(topbarSource, /topbar-search-results/);
  assert.match(offersPage, /SmartQueryForm/);
  assert.match(offersPage, /queryName="search"/);
  assert.match(offersPage, /Hard constraints are applied before semantic and trust-aware ranking/);
  assert.match(offersPage, /Search proposals/);
  assert.match(offersPage, /MODE_OPTIONS/);
  assert.match(offersPage, /SORT_OPTIONS/);
  assert.match(offersPage, /parseSmartQuery/);
  assert.match(offersPage, /mergeSmartQueryFacets/);
  assert.match(offersPage, /offerMatchesHardConstraints/);
  assert.match(offersPage, /smartInterpretationScore/);
  assert.match(offersPage, /No live proposals satisfy every hard constraint/);
  assert.match(appDataSource, /OFFERS_PAGE_SIZE/);

  assert.equal(animalResults[0]?.href, "/offers?search=Animal%20Welfare");
  assert.equal(filterSiteSearchItems("pledge swap")[0]?.href, "/pledge-swaps");
  assert.ok(manualEvidenceResults.some((result) => result.href === "/evidence"));
  assert.equal(publicGoodsResults[0]?.href, "/mpgf");
  assert.equal(publicGoodsResults[0]?.label, "Common Ground Budget");
  assert.equal(commonGroundResults[0]?.href, "/mpgf");
  assert.ok(validationResults.some((result) => result.href === "/validation"));
});

test("returning home page matches the recommended-trade decision screen", () => {
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const greetingSource = readRepoFile("src/components/home/local-date-greeting.tsx");
  const pageSource = readRepoFile("src/app/page.tsx");

  assert.match(pageSource, /<HomePage displayName=\{viewer\?\.displayName \?\? null\} \/>/);
  assert.match(homeSource, /Your best match right now, based on your commitments and priorities\./);
  assert.match(greetingSource, /Good afternoon/);
  assert.match(homeSource, /Replace eight/);
  assert.match(homeSource, /car trips with transit\./);
  assert.match(homeSource, /Fund \$20 of open/);
  assert.match(homeSource, /civic infrastructure\./);
  assert.match(homeSource, /You could offer/);
  assert.match(homeSource, /Mina would offer/);
  assert.match(homeSource, /Both say yes/);
  assert.match(homeSource, /Complementary priorities/);
  assert.match(homeSource, /96% on-time verification/);
  assert.match(homeSource, /Proof method/);
  assert.match(homeSource, /Offer this trade/);
  assert.match(homeSource, /Counter this trade/);
  assert.match(homeSource, /saved \? "Saved" : "Save"/);
  assert.match(homeSource, /<span>Pass<\/span>/);
  assert.match(homeSource, /useState\(14\)/);
  assert.match(homeSource, /\{remainingMatches\} more matches/);
  assert.match(homeSource, /Focus areas/);
  assert.match(homeSource, /Commitment types/);
  assert.doesNotMatch(homeSource, /founding cohort|Pilot inventory/);
});

test("visitor router exposes four live action paths before deeper marketplace mechanics", () => {
  const startPage = readRepoFile("src/app/start/page.tsx");
  const visitorPathsSource = readRepoFile("src/lib/visitor-paths.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(startPage, /Choose a real first action/);
  assert.match(startPage, /Fund, create, pool, or explore/);
  assert.match(startPage, /Make a financial contribution/);
  assert.match(startPage, /Provider-hosted payment/);
  assert.match(startPage, /No platform custody/);
  assert.match(startPage, /getMarketplaceOverview/);
  assert.match(startPage, /VISITOR_PATHS\.map/);
  assert.match(visitorPathsSource, /key: "fund"/);
  assert.match(visitorPathsSource, /key: "create"/);
  assert.match(visitorPathsSource, /key: "pool"/);
  assert.match(visitorPathsSource, /key: "explore"/);
  assert.match(visitorPathsSource, /complete a real donation through Every\.org/);
  assert.match(visitorPathsSource, /href: "\/offers\?view=live"/);
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

test("returning homepage keeps the screenshot match facts explicit and bounded", () => {
  const pageSource = readRepoFile("src/app/page.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");

  assert.doesNotMatch(pageSource, /getMarketplaceOverview|buildMarketplaceSurface|listOpenOffersPage/);
  assert.match(homeSource, /11 completed/);
  assert.match(homeSource, /96% on-time verification/);
  assert.match(homeSource, /Jul 23, 2026/);
  assert.match(homeSource, /7 days left/);
  assert.match(homeSource, /setRemainingMatches/);
  assert.match(homeSource, /Math\.max\(0, count - 1\)/);
  assert.equal(homeSource.includes("total value traded"), false);
  assert.equal(homeSource.includes("registered users"), false);
});

test("people directory avoids popularity leaderboards and keeps trust signals evidence-bound", () => {
  const peoplePage = readRepoFile("src/app/people/page.tsx");
  const profilePage = readRepoFile("src/app/people/[profileId]/page.tsx");
  const appDataSource = readRepoFile("src/lib/app-data.ts");
  const publicProfileTrustSource = readRepoFile("src/lib/public-profile-trust.ts");

  assert.match(peoplePage, /Browse visible members/);
  assert.match(peoplePage, /reviewed evidence/);
  assert.match(peoplePage, /Most open offers/);
  assert.match(peoplePage, /Newest is chronological/);
  assert.match(peoplePage, /not follower, karma, or comment leaderboards/);
  assert.equal(peoplePage.includes("Counterparty interest"), false);
  assert.equal(peoplePage.includes("Reviewer karma"), false);
  assert.equal(peoplePage.includes("Public discussion"), false);
  assert.match(appDataSource, /listPublicProfilesPage/);
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

test("private matching and reasoning routes remain distinct, reviewable, and privacy bounded", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const reasoningCenterPage = readRepoFile("src/app/reasoning-center/page.tsx");
  const standardsPage = readRepoFile("src/app/reasoning-standards/page.tsx");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(backgroundPage, /Find possible counterparties without exposing private details/);
  assert.match(backgroundPage, /Compatibility is not consent/);
  assert.match(backgroundPage, /Five controlled steps from preview to disclosure/);
  assert.match(backgroundPage, /Create a broad preview/);
  assert.match(backgroundPage, /Choose the audience/);
  assert.match(backgroundPage, /Request a reviewed search/);
  assert.match(backgroundPage, /Disclose only after consent/);
  assert.match(backgroundPage, /No autonomous outreach/);
  assert.match(backgroundPage, /explicit, revocable grants/);
  assert.match(backgroundPage, /createMatchConciergeRequestAction/);
  assert.match(backgroundPage, /no_trade_baseline/);

  assert.match(reasoningCenterPage, /reasoningCenterDescription/);
  assert.match(reasoningCenterPage, /buildBreadcrumbJsonLd/);
  assert.match(reasoningCenterPage, /"@type": "CollectionPage"/);
  assert.match(reasoningCenterPage, /"@type": "ItemList"/);
  assert.match(reasoningCenterPage, /getOptionalViewerForReasoningCenter/);
  assert.match(reasoningCenterPage, /MORAL_TRADE_REASONING_PACKET_FILTERS/);
  assert.match(reasoningCenterPage, /not a live forum or autonomous moral-ranking system/);
  assert.equal(reasoningCenterPage.includes("karma"), false);

  assert.match(standardsPage, /Make trade records specific enough to judge/);
  assert.match(standardsPage, /getOfferReviewWorkflowContract/);
  assert.match(standardsPage, /getMoralTradeCopilotContract/);
  assert.match(standardsPage, /getMoralTradeProvenanceContract/);
  assert.match(standardsPage, /Not a threat market/);
  assert.match(standardsPage, /Not legal escrow/);
  assert.match(sitemapSource, /\/background-networking/);
  assert.match(sitemapSource, /\/reasoning-center/);
  assert.match(sitemapSource, /\/reasoning-standards/);
});

test("background source connector permissions stay field-limited and raw-ingestion disabled", () => {
  const backgroundPage = readRepoFile("src/app/background-networking/page.tsx");
  const permissionSource = readRepoFile("src/lib/background-source-permissions.ts");
  const sourceConnectionsRoute = readRepoFile("src/app/api/background/source-connections/route.ts");
  const backgroundActions = readRepoFile("src/app/background-networking/actions.ts");
  const privacyPage = readRepoFile("src/app/privacy/page.tsx");

  assert.deepEqual(
    BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.map((option) => option.value),
    [
      "cause_priorities",
      "capability_tags",
      "offer_ask_terms",
      "verification_preferences",
      "availability_context",
      "safety_constraints",
    ],
  );
  assert.deepEqual([...BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS], [30, 90, 180, 365]);
  assert.match(permissionSource, /Raw connector ingestion remains disabled/);
  assert.match(permissionSource, /rawIngestionAllowed: false/);
  assert.match(permissionSource, /Source-summary retention cannot outlive/);
  assert.match(sourceConnectionsRoute, /Authentication required/);
  assert.match(sourceConnectionsRoute, /validateBackgroundSourcePermission/);
  assert.match(sourceConnectionsRoute, /allowed_field_keys: permission\.allowedFieldKeys/);
  assert.match(sourceConnectionsRoute, /raw_ingestion_allowed: false/);
  assert.match(sourceConnectionsRoute, /retention_expires_at: permission\.retentionExpiresAt/);
  assert.match(backgroundActions, /Reviewed source summary saved without raw ingestion/);
  assert.match(backgroundActions, /allowed_field_keys/);
  assert.match(backgroundActions, /raw_ingestion_allowed: false/);
  assert.match(backgroundPage, /broad previews first/i);
  assert.match(backgroundPage, /Exact wishes,[\s\S]*contact details remain hidden/);
  assert.match(privacyPage, /Purpose, processors, and retention/);
});

test("root avoids a blank streaming boundary while error states expose route-specific recovery", () => {
  const errorPage = readRepoFile("src/app/error.tsx");
  const globalCss = readRepoFile("src/app/globals.css");
  const performanceProfile = readRepoFile("config/moral-trade/performance-profile.json");

  assert.equal(existsSync(join(process.cwd(), "src/app/loading.tsx")), false);
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

test("network page exposes concrete activation, one-counterparty invitation, and safety boundaries", () => {
  const cohortPage = readRepoFile("src/app/cohort/page.tsx");
  const signupPage = readRepoFile("src/app/signup/page.tsx");
  const actionsSource = readRepoFile("src/app/actions.ts");

  assert.match(cohortPage, /Put one real disagreement into a usable structure/);
  assert.match(cohortPage, /Choose one first action/);
  assert.match(cohortPage, /What activation means/);
  assert.match(cohortPage, /One concrete action/);
  assert.match(cohortPage, /Make a financial contribution/);
  assert.match(cohortPage, /Create a bounded trade/);
  assert.match(cohortPage, /Request a private introduction/);
  assert.match(cohortPage, /Invite one serious counterparty/);
  assert.match(cohortPage, /Network link/);
  assert.match(cohortPage, /Network activity/);
  assert.match(cohortPage, /Operating safeguards/);
  assert.match(cohortPage, /No platform custody/);
  assert.match(cohortPage, /createNetworkInviteAction/);
  assert.match(cohortPage, /createWebinarRsvpAction/);
  assert.match(signupPage, /AuthPage/);
  assert.match(signupPage, /initialMode="signup"/);
  assert.match(actionsSource, /return_to/);
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
  assert.match(growthSource, /PARTNER_COHORTS/);
  assert.match(partnerPage, /generateStaticParams/);
  assert.match(partnerPage, /createWebinarRsvpAction/);
  assert.match(partnerPage, /action\.actionLabel/);
  assert.equal(partnerPage.includes(">Start here<"), false);
  assert.match(adminGrowthPage, /Growth dashboard/);
  assert.match(newOfferPage, /getReviewedMarketplaceSeedTemplate/);
  assert.match(newOfferPage, /Template applied/);
  assert.match(offerCreateForm, /initialTemplate/);
  assert.match(offerCreateForm, /REVIEWED_MARKETPLACE_SEED_TEMPLATES/);
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
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.routes.some((route) => route.path === "/offers?view=live"));
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.devices.some((device) => device.key === "mobile"));
  assert.ok(MEASUREMENT_PERFORMANCE_BASELINE.requiredChecks.includes("no_framework_overlay"));
  assert.match(measurementPage, /Measure useful cooperation, not moral worth/);
  assert.match(measurementPage, /Primary outcome metrics/);
  assert.match(measurementPage, /Privacy-safe event taxonomy/);
  assert.match(measurementPage, /Data the service refuses to use/);
  assert.match(measurementPage, /Measurement guardrails/);
  assert.match(measurementPage, /Performance baseline/);
  assert.match(measurementPage, /Accountability/);
  assert.match(measurementPage, /Activated users/);
  assert.match(measurementPage, /Reviewable records/);
  assert.match(measurementPage, /Safe progression/);
  assert.match(measurementPage, /Small-sample public metrics/);
  assert.match(measurementPage, /MEASUREMENT_EVENT_SPECS/);
  assert.match(measurementPage, /MEASUREMENT_GUARDRAILS/);
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

test("privacy and terms publish processor, retention, analytics, and data-rights boundaries", () => {
  const privacyPage = readRepoFile("src/app/privacy/page.tsx");
  const termsPage = readRepoFile("src/app/terms/page.tsx");
  const siteSearchSource = readRepoFile("src/lib/site-search.ts");

  assert.match(privacyPage, /Private details remain participant-controlled/);
  assert.match(privacyPage, /The operating privacy model/);
  assert.match(privacyPage, /Purpose, processors, and retention/);
  assert.match(privacyPage, /Supabase supports authentication and database storage/);
  assert.match(privacyPage, /Stripe handles supported card,[\s\S]*Every\.org handles direct donation routes/);
  assert.match(privacyPage, /Control privacy-safe funnel measurement for this browser/);
  assert.match(privacyPage, /exact wishes, private messages, evidence bodies, source notes/);
  assert.match(privacyPage, /Turn off optional analytics/);
  assert.match(privacyPage, /Allow minimal analytics/);
  assert.match(privacyPage, /Export, correct, restrict, revoke, or delete/);
  assert.match(privacyPage, /saveAnalyticsPreferenceAction/);
  assert.match(privacyPage, /getMoralTradeDisclosureContract/);
  assert.match(privacyPage, /validateMoralTradeDisclosureContract/);
  assert.match(termsPage, /Privacy, processors, and data requests/);
  assert.match(termsPage, /Some audit, payment, safety, or dispute records may need to/);
  assert.match(siteSearchSource, /Privacy practices/);
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
  assert.match(homePage, /Do more good without agreeing/);
  assert.match(homePage, /Moral Trade: do more good without agreeing/);
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
  assert.match(safetyPage, /alternates/);
  assert.match(safetyPage, /buildBreadcrumbJsonLd/);
  assert.match(safetyPage, /breadcrumbStructuredData/);
  assert.match(safetyPage, /application\/ld\+json/);
  assert.match(safetyPage, /Safety rules for voluntary moral trade/);
  assert.match(safetyPage, /What every workflow must preserve/);
  assert.match(safetyPage, /No manufactured threats/);
  assert.match(safetyPage, /Evidence stays scoped/);
  assert.match(safetyPage, /Inspect the controls behind the claims/);
  assert.match(safetyPage, /Machine-readable endpoints expose security, operations, disclosure, appeal, incident/);
  assert.match(safetyPage, /getMoralTradeSecurityProfile/);
  assert.match(safetyPage, /validateMoralTradeSecurityProfile/);
  assert.match(safetyPage, /auditMoralTradeSecurityScaleReadiness/);
  assert.match(safetyPage, /getMoralTradeOperationsProfile/);
  assert.match(safetyPage, /validateMoralTradeOperationsProfile/);
  assert.match(safetyPage, /Sensitive capabilities do not expand without named controls/);
  assert.match(safetyPage, /What the service does not promise/);
  assert.match(safetyPage, /securityProfile\.publicNonClaims/);
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

test("trade format landing pages explain voluntary terms without custody overclaims", () => {
  const pledgePage = readRepoFile("src/app/pledge-swaps/page.tsx");
  const paidActionPage = readRepoFile("src/app/paid-action-offers/page.tsx");
  const primitivesSource = readRepoFile("src/components/ui/page-primitives.tsx");

  assert.match(pledgePage, /Make a promise\. Get a promise you value/);
  assert.match(pledgePage, /Both confirm, then begin/);
  assert.match(pledgePage, /Trades, not pressure campaigns/);
  assert.match(pledgePage, /voluntary gain/);
  assert.match(pledgePage, /Evidence should be as light as possible/);
  assert.match(paidActionPage, /payment is pending verification/i);
  assert.match(paidActionPage, /not legal escrow/i);
  assert.match(paidActionPage, /No custody, escrow, tax, or investment claim/);
  assert.match(primitivesSource, /Breadcrumb/);
  assert.match(primitivesSource, /TradeFlowDiagram/);
});

test("primer, anti-threat, and research pages frame voluntary coordination and its limits", () => {
  const primerPage = readRepoFile("src/app/moral-trade/page.tsx");
  const antiThreatPage = readRepoFile("src/app/anti-threat-baseline/page.tsx");
  const researchPage = readRepoFile("src/app/research/page.tsx");
  const trustPage = readRepoFile("src/app/trust/page.tsx");
  const safetyPage = readRepoFile("src/app/safety/page.tsx");
  const proposalReviewSource = readRepoFile("src/lib/proposal-review.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(primerPage, /What Is Moral Trade/);
  assert.match(primerPage, /primer on voluntary moral trade/);
  assert.match(primerPage, /What it is/);
  assert.match(primerPage, /What it is not/);
  assert.match(primerPage, /Who it is for/);
  assert.match(primerPage, /Personal pledge swap/);
  assert.match(primerPage, /Donation offset/);
  assert.match(primerPage, /Moral public-good commitment/);
  assert.match(primerPage, /Record the no-trade baseline/);
  assert.match(primerPage, /Review threats and externalities/);
  assert.match(antiThreatPage, /Required baseline statement/);
  assert.match(antiThreatPage, /Cooling-off period/);
  assert.match(antiThreatPage, /Rejected proposal examples/);
  assert.match(researchPage, /What we are testing/);
  assert.match(researchPage, /What would make this unsafe/);
  assert.match(researchPage, /Open mechanism-design questions/);
  assert.match(researchPage, /Reviewer rulebook/);
  assert.match(proposalReviewSource, /PROHIBITED_MORAL_TRADE_PATTERNS/);
  assert.match(proposalReviewSource, /newly_escalated_harmful_behavior/);
  assert.match(trustPage, /permanentRedirect\("\/safety"\)/);
  assert.match(safetyPage, /What the service does not promise/);
  assert.match(sitemapSource, /\/what-is-moral-trade/);
  assert.match(sitemapSource, /\/research/);
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
  const mpgfPage = readRepoFile("src/app/mpgf/page.tsx");
  const mpgfContributePage = readRepoFile("src/app/mpgf/contribute/page.tsx");
  const mpgfTermsPage = readRepoFile("src/app/mpgf/real-money-terms/page.tsx");
  const joinedSources = [donationOffsetsPage, mpgfPage, mpgfContributePage, mpgfTermsPage].join("\n");

  assert.match(donationOffsetsPage, /No custody \/ no escrow \/ no tax advice/);
  assert.match(donationOffsetsPage, /Payment locators are evidence until reviewed/);
  assert.match(donationOffsetsPage, /Receipts are evidence for review, not platform custody or legal escrow/);
  assert.match(mpgfPage, /One budget, explicit stances, gate-cleared funding/);
  assert.match(mpgfPage, /Choose a maximum budget/);
  assert.match(mpgfPage, /Review the frozen terms/);
  assert.match(mpgfPage, /Clear only after gates pass/);
  assert.match(mpgfPage, /External payment evidence shows that a transaction occurred/);
  assert.match(mpgfContributePage, /direct-to-charity Every\.org route/);
  assert.match(mpgfContributePage, /reviewed external evidence as fallback/);
  assert.match(mpgfTermsPage, /External providers remain the payment source of truth/);
  assert.match(mpgfTermsPage, /No tax, escrow, or outcome guarantee/);
  assert.match(mpgfTermsPage, /External payments require review/);
  assert.match(mpgfTermsPage, /Allocation is separate from disbursement/);
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
  assert.match(backgroundNetworkingPage, /Conservative disclosure by default/);
  assert.match(backgroundNetworkingPage, /Five controlled steps from preview to disclosure/);
  assert.match(backgroundNetworkingPage, /No autonomous outreach/);
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

  assert.match(donationOffsetsPage, /Donation offsets/);
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
  assert.match(offerForm, /Set evidence/);
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

test("offers page keeps live directory content before the footer in source order", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const mainIndex = offersPage.indexOf("<main");
  const directoryIndex = offersPage.indexOf('aria-labelledby="directory-heading"');
  const otherRoutesIndex = offersPage.indexOf('aria-labelledby="other-routes-heading"');
  const footerIndex = offersPage.indexOf("<SiteFooter />");

  assert.ok(mainIndex > -1);
  assert.ok(directoryIndex > mainIndex);
  assert.ok(otherRoutesIndex > directoryIndex);
  assert.ok(footerIndex > otherRoutesIndex);
});

test("create trade route family has stable signed-out entry points", () => {
  const createRoute = readRepoFile("src/app/create/page.tsx");
  const newTradePage = readRepoFile("src/app/trades/new/page.tsx");
  const newOffsetPage = readRepoFile("src/app/offers/new/page.tsx");
  const marketplaceBoundary = readRepoFile("src/lib/moral-trade/marketplace-boundary.ts");
  const seedTemplatesSource = readRepoFile("src/lib/marketplace-seed-templates.ts");

  assert.match(createRoute, /CreateRouteChooser/);
  assert.match(createRoute, /Choose a concrete coordination route/);
  assert.match(createRoute, /No funds move/);
  assert.match(newTradePage, /CreateInterfaceFrame/);
  assert.match(newTradePage, /moral-trade-create\/index\.html/);
  assert.match(newTradePage, /TradeDraftSignInGate/);
  assert.match(newTradePage, /returnTo=\{returnTo\}/);
  assert.match(newTradePage, /title: "Create"/);
  assert.match(newOffsetPage, /TradeDraftSignInGate/);
  assert.match(newOffsetPage, /getReviewedMarketplaceSeedTemplate/);
  assert.match(newOffsetPage, /Template applied/);
  assert.match(newOffsetPage, /Nothing is authorized by opening this\s+draft/);
  assert.match(newOffsetPage, /redirect\("\/trades\/new"\)/);
  assert.match(marketplaceBoundary, /moralpublicgoods131\.md/);
  assert.match(marketplaceBoundary, /CRECM v1\.125/);
  assert.match(marketplaceBoundary, /Common Ground Budget route/);
  assert.match(seedTemplatesSource, /what would each side donate without this trade/);
  assert.match(seedTemplatesSource, /what would make this unsafe or invalid/);
});

test("marketplace separates live inventory, reviewed templates, worked examples, and public goods", () => {
  const offersPage = readRepoFile("src/app/offers/page.tsx");
  const workedExamplesPage = readRepoFile("src/app/worked-examples/page.tsx");
  const templateLibrary = readRepoFile("src/components/trade-templates/trade-template-library.tsx");
  const marketplaceBoundary = readRepoFile("src/lib/moral-trade/marketplace-boundary.ts");
  const seedTemplatesSource = readRepoFile("src/lib/marketplace-seed-templates.ts");

  assert.match(offersPage, /title: "Explore live proposals"/);
  assert.match(offersPage, /without mixing examples or explanatory records into marketplace inventory/);
  assert.match(offersPage, /view === "templates"/);
  assert.match(offersPage, /<TradeTemplateLibrary \/>/);
  assert.match(offersPage, /Live participant records only/);
  assert.match(offersPage, /Search never substitutes examples for live demand/);
  assert.match(offersPage, /No live proposals are open/);
  assert.match(offersPage, /Other live routes/);
  assert.match(offersPage, /Donation offsets/);
  assert.match(offersPage, /Funding pools/);
  assert.match(offersPage, /Consent-gated introductions/);
  assert.equal(offersPage.includes("CANONICAL_WORKED_CASE_OFFERS"), false);

  assert.match(workedExamplesPage, /They are\s+not live marketplace demand/i);
  assert.match(workedExamplesPage, /CANONICAL_WORKED_CASE_OFFERS/);
  assert.match(workedExamplesPage, /canonical detail page/);
  assert.match(templateLibrary, /trade template/i);
  assert.match(seedTemplatesSource, /liveMetricEligible: false/);
  assert.match(seedTemplatesSource, /reviewStatus: "admin_reviewed"/);
  assert.match(marketplaceBoundary, /Public Goods Fund/);
  assert.match(marketplaceBoundary, /Common Ground Budget route/);
});

test("worked examples have canonical detail pages and sitemap coverage", () => {
  const workedExamplesPage = readRepoFile("src/app/worked-examples/page.tsx");
  const exampleDetailPage = readRepoFile("src/app/offers/examples/[exampleId]/page.tsx");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(workedExamplesPage, /\/offers\/examples\/\$\{offer\.id\}/);
  assert.match(workedExamplesPage, /They are\s+not live marketplace demand/i);
  assert.match(exampleDetailPage, /generateStaticParams/);
  assert.match(exampleDetailPage, /Worked example; manual review required before reliance/);
  assert.match(exampleDetailPage, /No escrow or custody claim/);
  assert.match(exampleDetailPage, /Action evidence/);
  assert.match(exampleDetailPage, /Baseline confidence/);
  assert.match(exampleDetailPage, /Third-party externality review/);
  assert.match(exampleDetailPage, /Example · Preview only · No commitment/);
  assert.match(sitemapSource, /\/offers\/examples\/\$\{offer\.id\}/);
});

test("core Moral Trade email outbox copy stays generic and dashboard-directed", () => {
  const actionsSource = readRepoFile("src/app/actions.ts");
  const emailCopySource = readRepoFile("src/lib/moral-trade/email-copy.ts");
  const emailJobRoute = readRepoFile("src/app/api/jobs/email/route.ts");
  const invitationMigration = readRepoFile(
    "supabase/migrations/20260722223000_harden_trade_invitations.sql",
  );
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
  assert.match(emailJobRoute, /suppress_email_outbox_v2/);
  assert.match(invitationMigration, /status = 'suppressed'/);
  assert.match(invitationMigration, /provider = 'resend_safety_gate'/);
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
