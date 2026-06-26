import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { GET as publicPageSimplificationRoute } from "@/app/api/moral-trade/public-page-simplification/contract/route";

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
  assert.match(marketplaceBoundary, /moralpublicgoods102\.md/);
  assert.match(marketplaceBoundary, /CRECM v1\.96/);
  assert.equal(offersPage.includes("Highest offered impact"), false);
  assert.equal(offersPage.includes("Highest example fit"), false);
  assert.equal(offersPage.includes("Impact scores"), false);
  assert.equal(offersPage.includes("Minimum offered-impact score"), false);
  assert.equal(pagePrimitives.includes("Participant-stated importance"), false);
  assert.equal(
    pagePrimitives.includes("Counterparty minimum acceptable importance"),
    false,
  );
  assert.equal(marketplaceBoundary.includes("moralpublicgoods131.md"), false);
  assert.equal(marketplaceBoundary.includes("CRECM v1.125"), false);
});

test("moraltrade82 signed-out offset creation route is a preview landing, not an account wall", () => {
  const newOfferPage = readFileSync("src/app/offers/new/page.tsx", "utf8");

  assert.match(newOfferPage, /Donation offset builder/);
  assert.match(newOfferPage, /Draft a donation offset/);
  assert.match(newOfferPage, /Compare what would happen without the trade/);
  assert.match(newOfferPage, /data-signed-out-offset-preview="true"/);
  assert.match(newOfferPage, /Preview draft/);
  assert.match(newOfferPage, /Save after sign-in/);
  assert.match(newOfferPage, /Start from example/);
  assert.match(newOfferPage, /Sign in only when you are ready to save or request review/);
  assert.match(newOfferPage, /saving, publishing, requesting review, disclosing counterparties, authorizing\s+money, or creating a live offer/);
  assert.equal(newOfferPage.includes("Match me"), false);
  assert.equal(newOfferPage.includes("Pay now"), false);
  assert.equal(newOfferPage.includes("Lock now"), false);
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
