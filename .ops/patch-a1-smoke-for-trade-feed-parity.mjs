import fs from "node:fs";

const target = process.argv[2];
if (!target) throw new Error("Usage: node patch-a1-smoke-for-trade-feed-parity.mjs <script>");

let source = fs.readFileSync(target, "utf8");
const startMarker = "  await screenshot(viewerPage, '01-authenticated-feed');";
const endMarker = "  result.checks.browserAndServerDiagnostics = true;\n  result.passed = true;";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error("The verified A1 smoke main-flow markers were not found.");
}

const parityFlow = [
  "  await screenshot(viewerPage, '01-authenticated-feed');",
  "",
  "  const identityFrom = async (locator) => locator.evaluate((element) => ({",
  "    opportunityId: element.getAttribute('data-opportunity-id'),",
  "    opportunityType: element.getAttribute('data-opportunity-type'),",
  "    feedItemId: element.getAttribute('data-feed-item-id'),",
  "    feedItemKey: element.getAttribute('data-feed-item-key'),",
  "    exposureRequestId: element.getAttribute('data-exposure-request-id'),",
  "  }));",
  "",
  "  const feedCard = viewerPage",
  "    .locator('.mt-feed-card[data-opportunity-id][data-opportunity-type][data-feed-item-id][data-feed-item-key][data-exposure-request-id]')",
  "    .first();",
  "  await feedCard.waitFor({ state: 'visible', timeout: 60_000 });",
  "  const feedIdentity = await identityFrom(feedCard);",
  "  assert.ok(feedIdentity.opportunityId, 'The live /feed card had no opportunity ID.');",
  "  assert.ok(feedIdentity.opportunityType, 'The live /feed card had no opportunity type.');",
  "  assert.equal(feedIdentity.feedItemId, feedIdentity.opportunityId);",
  "  assert.equal(",
  "    feedIdentity.feedItemKey,",
  "    `${feedIdentity.opportunityType}:${feedIdentity.opportunityId}`,",
  "  );",
  "  assert.ok(feedIdentity.exposureRequestId, 'The live /feed card had no exposure receipt.');",
  "",
  "  await viewerPage.locator('[data-page=\"trade\"]').click();",
  "  await viewerPage.waitForFunction(() => window.location.hash === '#trade');",
  "",
  "  const tradeCard = viewerPage.locator(",
  "    `[data-mt-live-trade-feed=\"ready\"] [data-feed-item-id=\"${feedIdentity.opportunityId}\"]`,",
  "  );",
  "  await tradeCard.waitFor({ state: 'visible', timeout: 30_000 });",
  "  const tradeIdentity = await identityFrom(tradeCard);",
  "",
  "  assert.deepEqual(",
  "    {",
  "      opportunityId: tradeIdentity.opportunityId,",
  "      feedItemKey: tradeIdentity.feedItemKey,",
  "      exposureRequestId: tradeIdentity.exposureRequestId,",
  "    },",
  "    {",
  "      opportunityId: feedIdentity.opportunityId,",
  "      feedItemKey: feedIdentity.feedItemKey,",
  "      exposureRequestId: feedIdentity.exposureRequestId,",
  "    },",
  "    'The live /#trade card did not retain the exact /feed item and exposure identity.',",
  "  );",
  "  assert.equal(tradeIdentity.opportunityType, feedIdentity.opportunityType);",
  "  assert.equal(tradeIdentity.feedItemId, feedIdentity.feedItemId);",
  "",
  "  const exposureAudit = JSON.parse(sql(`",
  "    select jsonb_build_object(",
  "      'count',count(*),",
  "      'requestIds',coalesce(jsonb_agg(distinct request_id::text),'[]'::jsonb),",
  "      'shownCount',count(*) filter (where was_shown)",
  "    )::text",
  "    from public.recommendation_exposures",
  "    where profile_id=${quote(ids.viewer)}::uuid",
  "      and opportunity_type=${quote(feedIdentity.opportunityType)}",
  "      and opportunity_id=${quote(feedIdentity.opportunityId)}",
  "      and request_id::text=${quote(feedIdentity.exposureRequestId)};",
  "  `));",
  "  assert.equal(Number(exposureAudit.count), 1, 'The shared snapshot did not have exactly one exposure row.');",
  "  assert.equal(Number(exposureAudit.shownCount), 1, 'The authoritative exposure row was not marked shown.');",
  "",
  "  result.feedIdentity = feedIdentity;",
  "  result.tradeIdentity = tradeIdentity;",
  "  result.parityAudit = exposureAudit;",
  "  result.checks.tradeFeedIdentityParity = true;",
  "  result.checks.singleAuthoritativeExposureReceipt = true;",
  "  await screenshot(viewerPage, '02-authenticated-trade');",
  "",
  "  assert.deepEqual(result.network.pageErrors, [], 'Browser page errors were detected.');",
  "  assert.deepEqual(result.network.serverErrors, [], 'Server-error responses were detected.');",
  "  result.checks.browserAndServerDiagnostics = true;",
  "  result.passed = true;",
].join("\n");

source = `${source.slice(0, start)}${parityFlow}${source.slice(end + endMarker.length)}`;
fs.writeFileSync(target, source);
