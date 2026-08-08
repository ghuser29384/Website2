import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  publicLoader: "src/lib/mpgf/dac-lifecycle.ts",
  model: "src/lib/mpgf/dac-lifecycle-model.ts",
  participantActions: "src/app/mpgf/actions.ts",
  adminActions: "src/app/mpgf/admin/actions.ts",
  campaignView: "src/components/mpgf/mpgf-dac-campaign-view.tsx",
  pledgePanel: "src/components/mpgf/mpgf-dac-pledge-panel.tsx",
  creatorPage: "src/app/mpgf/pools/proposals/[proposalId]/page.tsx",
  reviewerPage: "src/app/mpgf/admin/dac-lifecycle/page.tsx",
  campaignPage: "src/app/mpgf/campaigns/[campaignId]/page.tsx",
  poolPage: "src/app/mpgf/pools/[poolId]/page.tsx",
  publicApi: "src/app/api/mpgf/dac/campaigns/[campaignId]/route.ts",
  publicTermsMigration: "supabase/migrations/20260807100000_mpgf_dac_public_terms_api.sql",
  publicTermsRegression: "supabase/tests/mpgf_dac_public_terms_api.sql",
  browserFixture: "supabase/tests/mpgf_dac_product_browser_fixture.sql",
  browserCleanup: "supabase/tests/mpgf_dac_product_browser_cleanup.sql",
  browserSpec: "tests/mpgf-dac-product-lifecycle.spec.ts",
  workflow: ".github/workflows/mpgf-dac-product-lifecycle-gates.yml",
} as const;

async function read(path: string) {
  return readFile(path, "utf8");
}

function countOccurrences(source: string, fragment: string) {
  return source.split(fragment).length - 1;
}

test("live public DAC surfaces resolve exact published terms, terminal outcome, and owner-only receipts", async () => {
  const [loader, model, campaignPage, poolPage, publicApi, campaignView] = await Promise.all([
    read(paths.publicLoader),
    read(paths.model),
    read(paths.campaignPage),
    read(paths.poolPage),
    read(paths.publicApi),
    read(paths.campaignView),
  ]);

  assert.match(loader, /from\("mpgf_public_goods_campaigns"\)/);
  assert.match(loader, /rpc\("mpgf_public_dac_campaign_terms"/);
  assert.match(loader, /from\("mpgf_dac_campaign_outcomes"\)/);
  assert.match(loader, /from\("mpgf_public_goods_pledges"\)[\s\S]*\.eq\("profile_id", viewerId\)/);
  assert.match(loader, /exactPublishedTermsMatch/);
  assert.match(loader, /publishedTerms\.termsSha256 === campaignRow\.published_terms_sha256/);
  assert.match(model, /const \{ ownPledges: _privatePledges, \.\.\.publicCampaign \} = campaign/);
  assert.match(model, /privatePledgeEvidenceIncluded: false/);
  assert.match(campaignPage, /loadMpgfDacPublicCampaign/);
  assert.match(campaignPage, /MpgfDacCampaignView/);
  assert.match(poolPage, /loadMpgfDacPublicCampaign/);
  assert.match(poolPage, /MpgfDacCampaignView/);
  assert.match(publicApi, /toPublicMpgfDacCampaignApi/);
  assert.match(campaignView, /What happens under these exact DAC terms/);
  assert.match(campaignView, /Aggregate only after finalization/);
  assert.match(campaignView, /Your private receipts/);
  assert.match(campaignView, /The public API does not include this private amount or consent evidence/);
});

test("pledger and creator actions use the canonical DAC lifecycle without payment execution", async () => {
  const [participantActions, pledgePanel, creatorPage] = await Promise.all([
    read(paths.participantActions),
    read(paths.pledgePanel),
    read(paths.creatorPage),
  ]);

  assert.match(participantActions, /rpc\("mpgf_create_dac_pledge"/);
  assert.match(participantActions, /rpc\("mpgf_link_pool_proposal_revision"/);
  const pledgeActionStart = participantActions.indexOf("export async function recordMpgfDacPledgeAction");
  const pledgeActionEnd = participantActions.indexOf("export async function linkMpgfDacProposalRevisionAction");
  assert.ok(pledgeActionStart >= 0 && pledgeActionEnd > pledgeActionStart);
  const pledgeAction = participantActions.slice(pledgeActionStart, pledgeActionEnd);
  assert.match(pledgeAction, /mapMpgfDacPledgeReceipt/);
  assert.match(pledgeAction, /No payment method, authorization, charge, or capture was created/);
  assert.doesNotMatch(pledgeAction, /paymentIntent|stripe|authorize|capture\(/i);
  assert.match(pledgePanel, /I accept this exact published version and hash/);
  assert.match(pledgePanel, /Record conditional pledge/);
  assert.match(pledgePanel, /No payment method, authorization, charge, or capture was created/);
  assert.match(creatorPage, /Creator lifecycle receipt/);
  assert.match(creatorPage, /loadMpgfDacCreatorProposal/);
  assert.match(creatorPage, /if \(!proposal\) notFound\(\)/);
  assert.match(creatorPage, /View public campaign/);
});

test("reviewer workspace exposes every non-payment lifecycle decision through authorized RPCs", async () => {
  const [adminActions, reviewerPage, loader] = await Promise.all([
    read(paths.adminActions),
    read(paths.reviewerPage),
    read(paths.publicLoader),
  ]);

  for (const rpc of [
    "mpgf_begin_pool_proposal_review",
    "mpgf_request_pool_proposal_changes",
    "mpgf_reject_pool_proposal",
    "mpgf_approve_and_freeze_pool_proposal",
    "mpgf_publish_pool_proposal",
    "mpgf_review_dac_pledge_eligibility",
    "mpgf_finalize_dac_campaign",
  ]) {
    assert.ok(adminActions.includes(rpc), `Expected reviewer action to call ${rpc}`);
  }
  assert.match(adminActions, /effectiveHumanScoreBps = eligibilityState === "eligible" \? humanScoreBps : 0/);
  assert.match(reviewerPage, /MFA-gated reviewer workspace/);
  assert.match(reviewerPage, /loadMpgfDacReviewerWorkspace/);
  assert.match(reviewerPage, /Reviewer registry required/);
  assert.match(reviewerPage, /Canonical pending DAC pledges/);
  assert.match(reviewerPage, /Evaluate success or lapse/);
  assert.match(reviewerPage, /These controls cannot create custody or settlement/);
  assert.match(loader, /currentlyAuthorized: reviewerCurrentlyAuthorized/);
  assert.match(reviewerPage, /Boolean\(authorization\?\.currentlyAuthorized\)/);
  assert.doesNotMatch(reviewerPage, /Date\.now\(\)/);
});

test("public exact-term migration is privacy-sanitized and mechanically explicit about the no-payment boundary", async () => {
  const [migration, regression] = await Promise.all([
    read(paths.publicTermsMigration),
    read(paths.publicTermsRegression),
  ]);

  assert.match(migration, /security definer/);
  assert.match(migration, /published_terms_version/);
  assert.match(migration, /published_terms_sha256/);
  assert.match(migration, /version\.proposal_terms_json/);
  assert.match(migration, /version\.create_pool_terms_json/);
  assert.match(migration, /proposal_json := proposal_terms_json/);
  assert.match(migration, /'failureBonus'/);
  assert.match(migration, /'successPremium'/);
  assert.match(migration, /jsonb_typeof\(threshold_schedule_json -> 'thresholds'\) is distinct from 'array'/);
  assert.match(migration, /threshold_item\.value ->> 'provisional' is distinct from 'false'/);
  assert.match(migration, /public_goods_success_premium_provisional' is distinct from 'false'/);
  assert.match(migration, /public_goods_payout_method' is distinct from 'signed_intent'/);
  assert.match(migration, /'payoutMethod', proposal_json -> 'public_goods_payout_method'/);
  for (const fragment of [
    "'paymentMethodCollected', false",
    "'authorized', false",
    "'mandateCreated', false",
    "'charged', false",
    "'captured', false",
    "'settled', false",
    "'failureBonusPaid', false",
  ]) {
    assert.ok(migration.includes(fragment), `Expected migration to include ${fragment}`);
  }
  assert.doesNotMatch(migration, /proposer_id|reviewed_by|review_reason|idempotency_key_hash/);
  assert.match(migration, /grant execute on function public\.mpgf_public_dac_campaign_terms\(text\)[\s\S]*to anon, authenticated, service_role/);

  assert.equal(
    regression.match(/"contributorIdentityRule":"verified_unique_person"/g)?.length,
    2,
    "The proposal and pending schedule must carry the same complete eligibility policy.",
  );
  assert.equal(
    regression.match(/Provisional threshold 1 experience-rated quote; operator approval remains required\./g)?.length,
    1,
    "The rollback fixture must use the canonical pending-review rationale.",
  );
  assert.doesNotMatch(
    regression,
    /"eligibilityPolicy":\{"policyVersion":"mpgf_failure_bonus_eligibility_v0_1"\}/,
  );
});

test("permanent isolated-QA proof covers open pledge, creator, reviewer, terminal states, privacy, mobile, and cleanup", async () => {
  const [fixture, cleanup, browser, workflow] = await Promise.all([
    read(paths.browserFixture),
    read(paths.browserCleanup),
    read(paths.browserSpec),
    read(paths.workflow),
  ]);
  const exactLapsedCampaignId = "'campaign-c0777777777747778777777777777777'";
  const malformedLapsedCampaignId = "'campaign-c077777777774777877777777777777'";

  assert.match(fixture, /qa-dac-product-open/);
  assert.match(fixture, /qa-dac-product-succeeded/);
  assert.match(fixture, /qa-dac-product-lapsed/);
  assert.match(fixture, /mpgf_create_dac_pledge/);
  assert.match(fixture, /mpgf_review_dac_pledge_eligibility/);
  assert.match(fixture, /mpgf_finalize_dac_campaign/);
  assert.match(fixture, /payment_count <> 0/);
  assert.equal(
    countOccurrences(fixture, '"contributorIdentityRule":"verified_unique_person"'),
    2,
  );
  assert.equal(
    countOccurrences(
      fixture,
      "Provisional threshold 1 experience-rated quote; operator approval remains required.",
    ),
    1,
  );
  assert.equal(countOccurrences(fixture, exactLapsedCampaignId), 8);
  assert.doesNotMatch(fixture, /'campaign-c077777777774777877777777777777'/);

  assert.match(cleanup, /mpgf_dac_campaign_outcomes_immutable/);
  assert.match(cleanup, /delete from auth\.mfa_factors/);
  assert.match(cleanup, /delete from moral_trade_private\.person_accounts/);
  assert.match(cleanup, /delete from auth\.users/);
  assert.equal(countOccurrences(cleanup, exactLapsedCampaignId), 5);
  assert.equal(countOccurrences(cleanup, "disable trigger moral_trade_create_pool_terms_immutable"), 1);
  assert.equal(countOccurrences(cleanup, "enable trigger moral_trade_create_pool_terms_immutable"), 1);
  assert.equal(countOccurrences(cleanup, "disable trigger mpgf_failure_bonus_approved_quote_immutable"), 1);
  assert.equal(countOccurrences(cleanup, "enable trigger mpgf_failure_bonus_approved_quote_immutable"), 1);
  assert.doesNotMatch(cleanup, /'campaign-c077777777774777877777777777777'/);

  assert.match(browser, /complete creator, reviewer, public pledge, success, lapse, privacy, and mobile DAC lifecycle/);
  assert.match(browser, /Record conditional pledge/);
  assert.match(browser, /Creator lifecycle receipt/);
  assert.match(browser, /MFA-gated authorized reviewer queue/);
  assert.match(browser, /No canonical DAC pledge is awaiting eligibility review/);
  assert.match(browser, /Campaign succeeded/);
  assert.match(browser, /Campaign lapsed/);
  assert.match(browser, /recursivelyCollectKeys/);
  assert.match(browser, /open-anonymous-mobile/);
  assert.match(browser, /success-mobile/);
  assert.match(browser, /lapse-mobile/);

  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npx tsc --noEmit/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /hvmxfjjbdcgjjudmthdz/);
  assert.match(workflow, /QA_SUPABASE_DB_URL/);
  assert.match(workflow, /QA_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /mpgf_dac_public_terms_api\.sql/);
  assert.match(workflow, /mpgf_dac_product_browser_fixture\.sql/);
  assert.match(workflow, /mpgf_dac_product_browser_cleanup\.sql/);
  assert.match(workflow, /tests\/mpgf-dac-product-lifecycle\.spec\.ts/);
  assert.match(workflow, /moral_trade_private\.person_accounts/);
  assert.match(workflow, /fixture_residue=0/);
  assert.match(workflow, /payment_refs=0/);
  assert.equal(countOccurrences(workflow, exactLapsedCampaignId), 2);
  assert.doesNotMatch(workflow, /'campaign-c077777777774777877777777777777'/);
  assert.doesNotMatch(workflow, /PRODUCTION_SUPABASE_DB_URL/);
  assert.doesNotMatch(workflow, /vercel deploy|vercel promote|moraltrade\.org\/api/i);
});
