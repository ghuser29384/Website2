import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { GET as publicPageSimplificationRoute } from "@/app/api/moral-trade/public-page-simplification/contract/route";
import { DONATION_OFFSET_PLAIN_LABELS } from "@/lib/marketplace-seed-templates";

import {
  getMoralTradePublicPageSimplificationContract,
  validateMoralTradePublicPageSimplificationContract,
} from "./public-page-simplification";

test("moraltrade82 public-page simplification contract validates route audit coverage", () => {
  const contract = getMoralTradePublicPageSimplificationContract();
  const validation = validateMoralTradePublicPageSimplificationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.deepEqual(contract.requiredRouteKeys, [
    "offers_new_offset",
    "offers",
    "donation_offsets",
    "pledge_swaps",
    "moral_trade",
    "how_it_works",
    "validation",
    "paid_action_offers",
    "worked_example_detail",
    "create_similar",
  ]);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_route_simplification_audit_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes("moral_trade_public_page_qa_artifacts"),
  );
  assert.ok(
    contract.releaseGateTestHooks.includes(
      "public_moral_trade_page_simplification_test",
    ),
  );
  assert.ok(
    contract.releaseGateTestHooks.includes("offset_creation_route_happy_path_test"),
  );
  assert.equal(contract.fallbackCopy.title, "This page did not load.");
  assert.equal(
    contract.fallbackCopy.body,
    "No draft was submitted and no review state changed.",
  );
  assert.deepEqual(contract.offersTabOrder, [
    "Live offers",
    "Create from template",
    "Worked examples",
    "Demo data",
    "moral public goods",
  ]);
  assert.deepEqual(contract.validationStatusLabels, [
    "Draft",
    "Needs info",
    "In review",
    "Challenge open",
    "Verified",
    "Disputed",
  ]);
  assert.deepEqual(contract.paidActionSafeAlternatives, [
    "Inspect a worked example",
    "Create a donation offset",
    "Join an invitation-only pilot",
  ]);
  assert.deepEqual(
    Object.values(contract.donationOffsetPlainLabelMap),
    [...DONATION_OFFSET_PLAIN_LABELS],
  );
  assert.deepEqual(contract.fallbackCopy.actions, [
    "Retry",
    "Go to examples",
    "Go to start",
    "Contact support",
  ]);
});

test("moraltrade82 route audits are anchored to current app route files", () => {
  const contract = getMoralTradePublicPageSimplificationContract();

  for (const record of contract.routeAuditRecords) {
    assert.equal(existsSync(record.sourcePath), true, record.sourcePath);
    assert.ok(record.routePath.startsWith("/") || record.routePath.startsWith("/api/"));
    assert.ok(record.oneSentenceHero.length > 20, record.routeKey);
    assert.ok(record.evidenceArtifactRefs.length >= 4, record.routeKey);
    assert.ok(
      contract.requiredQaContexts.every((context) => record.qaContexts.includes(context)),
      record.routeKey,
    );
  }
});

test("moraltrade82 public-page simplification fails closed on public-surface regressions", () => {
  const contract = getMoralTradePublicPageSimplificationContract();
  const [firstRecord, ...rest] = contract.routeAuditRecords;

  assert.ok(firstRecord);

  const validation = validateMoralTradePublicPageSimplificationContract({
    ...contract,
    routeAuditRecords: [
      {
        ...firstRecord,
        advancedDetailsCollapsedByDefault: false,
        factorCodesHiddenFromPrimaryCopy: false,
        noCompetingPrimaryCtas: false,
        noImpactScoreDefaultSurface: false,
        oneSentenceHero:
          "Show factor-code and release_gate validator diagnostics with an impact score.",
        primaryCta: "Pay and lock",
        qaContexts: firstRecord.qaContexts.filter(
          (context) => context !== "default_mobile",
        ),
      },
      ...rest,
    ],
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("pre_gate_primary_cta:offers_new_offset"));
  assert.ok(validation.blockers.includes("advanced_details_not_collapsed:offers_new_offset"));
  assert.ok(validation.blockers.includes("factor_codes_primary_copy:offers_new_offset"));
  assert.ok(validation.blockers.includes("impact_score_default_surface:offers_new_offset"));
  assert.ok(validation.blockers.includes("competing_primary_ctas:offers_new_offset"));
  assert.ok(validation.blockers.includes("qa_context_missing:offers_new_offset"));
  assert.ok(
    validation.blockers.includes("banned_primary_copy:offers_new_offset:factor-code"),
  );
  assert.ok(
    validation.blockers.includes("banned_primary_copy:offers_new_offset:release_gate"),
  );
  assert.ok(
    validation.blockers.includes("banned_primary_copy:offers_new_offset:impact score"),
  );
});

test("moraltrade82 offers route source keeps ranking internals out of default browse copy", () => {
  const offersPage = readFileSync("src/app/offers/page.tsx", "utf8");
  const pagePrimitives = readFileSync("src/components/ui/page-primitives.tsx", "utf8");
  const marketplaceBoundary = readFileSync(
    "src/lib/moral-trade/marketplace-boundary.ts",
    "utf8",
  );

  assert.match(offersPage, /Review-ready first/);
  assert.match(offersPage, /Closest template fit/);
  assert.match(offersPage, /Reviewer detail thresholds/);
  assert.match(pagePrimitives, /defaultOpen = false/);
  assert.match(pagePrimitives, /<summary>Why this is reviewable<\/summary>/);
  assert.match(marketplaceBoundary, /moralpublicgoods131\.md/);
  assert.match(marketplaceBoundary, /CRECM v1\.125/);
  assert.match(marketplaceBoundary, /Public Goods Fund/);
  assert.match(marketplaceBoundary, /Common Ground Budget route/);
  assert.equal(offersPage.includes("Highest offered impact"), false);
  assert.equal(offersPage.includes("Highest example fit"), false);
  assert.equal(offersPage.includes("Impact scores"), false);
  assert.equal(offersPage.includes("Minimum offered-impact score"), false);
  assert.equal(pagePrimitives.includes("Participant-stated importance"), false);
  assert.equal(
    pagePrimitives.includes("Counterparty minimum acceptable importance"),
    false,
  );
  assert.equal(marketplaceBoundary.includes("moralpublicgoods102.md"), false);
  assert.equal(marketplaceBoundary.includes("CRECM v1.96"), false);
  assert.equal(marketplaceBoundary.includes("external CRECM module"), false);
});

test("the legacy creation route preserves pledge and offset mechanism boundaries", () => {
  const newOfferPage = readFileSync("src/app/offers/new/page.tsx", "utf8");

  assert.match(newOfferPage, /getReviewedMarketplaceSeedTemplate/);
  assert.match(newOfferPage, /template\?\.format === "pledge_swap"/);
  assert.match(newOfferPage, /\/trades\/new\?template=/);
  assert.match(newOfferPage, /template\?\.format === "donation_offset" \|\| mode === "offset"/);
  assert.match(newOfferPage, /\/donation-offsets\$\{query\}/);
  assert.match(newOfferPage, /target = "\/pools"/);
  assert.equal(newOfferPage.includes("mode: \"pledge\""), false);
});

test("moraltrade82 typology examples do not become draft-prefill defaults", () => {
  const newOfferPage = readFileSync("src/app/offers/new/page.tsx", "utf8");
  const animationSource = readFileSync(
    "src/components/home/moral-trade-animations.tsx",
    "utf8",
  );

  assert.equal(newOfferPage.includes("const MORAL_TRADE_TYPE_TEMPLATES"), false);
  assert.match(newOfferPage, /getReviewedMarketplaceSeedTemplate\(templateId\)/);
  assert.match(newOfferPage, /template\?\.format === "pledge_swap"/);
  assert.match(newOfferPage, /template\?\.format === "donation_offset"/);
  assert.equal(newOfferPage.includes('title: "Lottery-mediated trade"'), false);
  assert.equal(newOfferPage.includes('title: "Side-payment trade"'), false);
  assert.equal(newOfferPage.includes('duration: "30 days"'), false);

  for (const exampleId of [
    "reciprocal-mixed",
    "moral-for-prudential",
    "pure-opposed-cause",
    "intrapersonal",
    "bargained-coordination",
    "lottery-mediated",
    "side-payment",
    "market-mediated",
  ]) {
    assert.match(
      animationSource,
      new RegExp(`/offers/examples/${exampleId}`),
      exampleId,
    );
    assert.equal(
      animationSource.includes(`/offers/new?template=${exampleId}`),
      false,
      exampleId,
    );
  }
});

test("moraltrade82 donation-offsets page uses plain questions and a concrete preview example", () => {
  const donationOffsetsPage = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const seedTemplatesSource = readFileSync("src/lib/marketplace-seed-templates.ts", "utf8");

  assert.match(donationOffsetsPage, /DONATION_OFFSET_PLAIN_LABELS/);
  assert.match(donationOffsetsPage, /DONATION_OFFSET_PLAIN_LABELS\.map/);
  assert.match(seedTemplatesSource, /what would each side donate without this trade/);
  assert.match(seedTemplatesSource, /how much each side redirects/);
  assert.match(seedTemplatesSource, /where the shared money goes/);
  assert.match(seedTemplatesSource, /why each side prefers this/);
  assert.match(seedTemplatesSource, /what proof reviewers check/);
  assert.match(seedTemplatesSource, /when the offer expires/);
  assert.match(seedTemplatesSource, /what would make this unsafe or invalid/);
  assert.match(donationOffsetsPage, /Without the trade, A would give \$50 to Cause X/);
  assert.match(donationOffsetsPage, /both redirect \$50 to GiveWell Top Charities Fund/);
  assert.match(donationOffsetsPage, /Compare template anatomy/);
  assert.equal(donationOffsetsPage.includes("What would each side donate without this trade?"), false);
  assert.equal(donationOffsetsPage.includes("Baseline intention"), false);
  assert.equal(donationOffsetsPage.includes("Match ratio"), false);
  assert.equal(donationOffsetsPage.includes("Surplus rule"), false);
  assert.equal(donationOffsetsPage.includes("Anti-threat certification"), false);
});

test("moraltrade82 validation page leads with public claim states, not reviewer internals", () => {
  const validationPage = readFileSync("src/app/validation/page.tsx", "utf8");

  assert.match(validationPage, /Reviewers verify specific claims, not moral worth/);
  assert.match(validationPage, /PUBLIC_VALIDATION_STATUS_PILLS/);
  assert.match(validationPage, /label: "Draft"/);
  assert.match(validationPage, /label: "Needs info"/);
  assert.match(validationPage, /label: "In review"/);
  assert.match(validationPage, /label: "Challenge open"/);
  assert.match(validationPage, /label: "Verified"/);
  assert.match(validationPage, /label: "Disputed"/);
  assert.match(validationPage, /<summary>Reviewer details<\/summary>/);
  assert.match(validationPage, /Create a reviewed draft/);
  assert.equal(validationPage.includes("Open operator console"), false);
});

test("moraltrade82 paid-action page is closed with exactly three safe alternatives", () => {
  const paidActionPage = readFileSync("src/app/paid-action-offers/page.tsx", "utf8");

  assert.match(paidActionPage, /Paid action offers are not open to the public yet/);
  assert.match(paidActionPage, /const paidActionAlternatives = \[/);
  assert.match(paidActionPage, /Inspect a worked example/);
  assert.match(paidActionPage, /Create a donation offset/);
  assert.match(paidActionPage, /Join an invitation-only pilot/);
  assert.match(paidActionPage, /Details on labor, exploitation, AML\/KYC, tax, and dispute risks/);
  assert.match(paidActionPage, /Review legal and payment boundaries/);
  assert.equal(paidActionPage.includes("Paid action offers are deferred"), false);
  assert.equal(paidActionPage.includes("Review validation rules"), false);
  assert.equal(paidActionPage.includes("Trade instead"), false);
});

test("moraltrade82 public-page simplification contract route exposes safe route audit metadata", async () => {
  const response = await publicPageSimplificationRoute(
    new Request("http://localhost/api/moral-trade/public-page-simplification/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.requiredRouteKeys.includes("offers_new_offset"));
  assert.ok(body.publicContract.requiredRouteKeys.includes("pledge_swaps"));
  assert.ok(body.publicContract.requiredQaContexts.includes("default_mobile"));
  assert.deepEqual(body.publicContract.offersTabOrder, [
    "Live offers",
    "Create from template",
    "Worked examples",
    "Demo data",
    "moral public goods",
  ]);
  assert.equal(
    body.publicContract.donationOffsetPlainLabelMap.destination,
    DONATION_OFFSET_PLAIN_LABELS[2],
  );
  assert.deepEqual(body.publicContract.paidActionSafeAlternatives, [
    "Inspect a worked example",
    "Create a donation offset",
    "Join an invitation-only pilot",
  ]);
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_route_simplification_audit_records",
    ),
  );
  assert.equal(body.publicContract.fallbackCopy.title, "This page did not load.");
  assert.equal(
    body.publicContract.fallbackCopy.body,
    "No draft was submitted and no review state changed.",
  );
  assert.ok(
    body.publicContract.routeAuditRecords.some(
      (record: { routeKey: string; routePath: string }) =>
        record.routeKey === "offers_new_offset" &&
        record.routePath === "/offers/new?mode=offset",
    ),
  );
  assert.equal(serialized.includes("private_note"), false);
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("reviewer_notes"), false);
});

test("moraltrade82 public-page simplification migration creates route audit records", () => {
  const migration = readFileSync(
    "supabase/migrations/20260626_moral_trade_public_page_simplification_records.sql",
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_route_simplification_audit_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_public_page_qa_artifacts/);
  assert.match(migration, /create table if not exists public\.moral_trade_public_page_plain_language_copy_policies/);
  assert.match(migration, /create table if not exists public\.moral_trade_route_fallback_copy_records/);
  assert.match(migration, /signed_out_local_preview_allowed_bool/);
  assert.match(migration, /default_cards_max_facts integer not null default 6 check \(default_cards_max_facts between 1 and 6\)/);
  assert.match(migration, /title text not null check \(title = 'This page did not load\.'\)/);
  assert.match(migration, /No draft was submitted and no review state changed\./);
  assert.match(migration, /enable row level security/);
});
