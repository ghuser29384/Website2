import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feedScript = readFileSync("public/moral-trade-live-feed-create.js", "utf8");
const feedStyles = readFileSync("public/moral-trade-live-feed-create.css", "utf8");
const liveShell = readFileSync("public/moral-trade-live.html", "utf8");
const liveNowRoute = readFileSync("src/app/api/live-now/route.ts", "utf8");
const liveNowModel = readFileSync("src/lib/live-now-recommendations.ts", "utf8");
const eventRoute = readFileSync("src/app/api/feed-create/events/route.ts", "utf8");
const sourceResolver = readFileSync("src/lib/feed-create/phase1.ts", "utf8");
const newTradePage = readFileSync("src/app/trades/new/page.tsx", "utf8");
const feedAction = readFileSync("src/app/feed-create-actions.ts", "utf8");
const workbench = readFileSync(
  "src/components/core-trade/trade-draft-workbench.tsx",
  "utf8",
);
const managePage = readFileSync("src/app/trades/[offerId]/manage/page.tsx", "utf8");
const reviewActions = readFileSync("src/app/core-trade-actions-base.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260730150000_feed_create_phase1.sql",
  "utf8",
);
const authenticatedRuntimeMigration = readFileSync(
  "supabase/migrations/20260801062000_feed_create_phase1_authenticated_runtime.sql",
  "utf8",
);

test("Feed cards use the existing authenticated snapshot and never issue a second ranking or exposure request", () => {
  assert.match(liveShell, /moral-trade-live-feed-create\.css/);
  assert.match(liveShell, /moral-trade-live-feed-create\.js/);
  assert.match(feedScript, /window\.__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(feedScript, /diagnostics\.exposureWriteStatus !== "written"/);
  assert.match(feedScript, /Create a trade from this/);
  assert.match(feedScript, /dataset\.feedItemKey = `offer:\$\{recommendation\.id\}`/);
  assert.match(feedScript, /dataset\.exposureRequestId = recommendation\.exposureRequestId/);
  assert.doesNotMatch(feedScript, /fetch\(["']\/api\/live-now/);
  assert.doesNotMatch(feedScript, /recommendation_exposures|upsert\(|insert\(/);
  assert.match(feedStyles, /@media \(max-width: 620px\)/);
});

test("only complete nonfinancial bilateral offers are eligible and native-action opportunity types remain native", () => {
  assert.match(feedScript, /value\.opportunityType !== "offer"/);
  assert.match(feedScript, /value\.mode !== "pledge"/);
  assert.match(feedScript, /!text\(value\.verification/);
  assert.match(feedScript, /!text\(value\.duration/);
  assert.doesNotMatch(feedScript, /donation_pool[\s\S]*Create a trade from this/);
  assert.doesNotMatch(feedScript, /donation_redirect[\s\S]*Create a trade from this/);
  assert.match(liveNowRoute, /terms_version/);
  assert.match(liveNowRoute, /sourceRevision:\s*offer\.terms_version/);
  assert.match(liveNowModel, /sourceRevision\?: number/);
});

test("the server verifies the exact viewer, receipt, source owner, source revision, and open published state", () => {
  assert.match(sourceResolver, /recommendation_exposures/);
  assert.match(sourceResolver, /\.eq\("profile_id", viewerId\)/);
  assert.match(sourceResolver, /\.eq\("request_id", request\.exposureRequestId\)/);
  assert.match(sourceResolver, /\.eq\("opportunity_id", request\.opportunityId\)/);
  assert.match(sourceResolver, /sourceOwnerId !== exposureOwnerId/);
  assert.match(sourceResolver, /sourceOwnerId === viewerId/);
  assert.match(sourceResolver, /sourceRevision !== request\.sourceRevision/);
  assert.match(sourceResolver, /workflow_status[\s\S]*published/);
  assert.match(sourceResolver, /source_is_own/);
  assert.match(sourceResolver, /source_stale/);
  assert.match(eventRoute, /CLIENT_EVENT_TYPES/);
  assert.match(eventRoute, /getViewer\(\)/);
  assert.match(eventRoute, /Cross-origin events are not accepted/);
  assert.match(eventRoute, /new URL\(request\.url\)\.origin/);
  assert.match(eventRoute, /x-forwarded-host/);
  assert.match(eventRoute, /x-forwarded-proto/);
  assert.match(eventRoute, /request\.headers\.get\("host"\)/);
  assert.match(eventRoute, /acceptedOrigins\.has\(origin\)/);
  assert.match(eventRoute, /sec-fetch-site/);
  assert.doesNotMatch(eventRoute, /origin !== request\.nextUrl\.origin/);
  assert.match(sourceResolver, /import \{ createClient \} from "@\/lib\/supabase\/server"/);
  assert.doesNotMatch(sourceResolver, /createServiceClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(feedAction, /createServiceClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(authenticatedRuntimeMigration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(authenticatedRuntimeMigration, /moral_trade_feed_create_record_event_authenticated/);
  assert.match(authenticatedRuntimeMigration, /moral_trade_feed_create_save_authenticated/);
  assert.match(authenticatedRuntimeMigration, /to authenticated/);
  assert.match(authenticatedRuntimeMigration, /from public, anon/);
});

test("Create reverses the source sides, preselects the real counterparty, and requires separate imported-field review", () => {
  assert.match(sourceResolver, /offeredCause:\s*sourceSnapshot\.requestedCause/);
  assert.match(sourceResolver, /requestedCause:\s*sourceSnapshot\.offeredCause/);
  assert.match(sourceResolver, /proposedAction:\s*sourceSnapshot\.requestAction/);
  assert.match(sourceResolver, /requestedAction:\s*sourceSnapshot\.offerAction/);
  assert.match(newTradePage, /resolveFeedCreateSource/);
  assert.match(newTradePage, /saveFeedCreateOfferAction/);
  assert.match(newTradePage, /sourceContext=/);
  assert.match(workbench, /Based on \{sourceContext\.counterpartyName\}/);
  assert.match(workbench, /The original participant is preselected as the counterparty/);
  assert.match(workbench, /From source/);
  assert.match(workbench, /Confirm each material field separately/);
  assert.match(workbench, /Editing an imported field clears its confirmation/);
  assert.match(workbench, /review_\$\{key\}/);
  assert.match(workbench, /duplicateAcknowledged/);
  assert.match(workbench, /Save private draft/);
  assert.match(workbench, /Submit for review/);
});

test("matching context is session-only and excluded from durable proposal and analytics payloads", () => {
  assert.match(feedScript, /sessionStorage\.setItem/);
  assert.match(feedScript, /sessionStorage/);
  assert.match(workbench, /sessionStorage\.removeItem/);
  assert.match(workbench, /Match\s+scores and explanations are session-only/);
  assert.doesNotMatch(feedAction, /matchPercent|matchScore|reasonDetails|paretoSuccess/);
  assert.doesNotMatch(migration, /match_score|match_percent|match_reason|reason_details|preference_vector/i);
  assert.match(migration, /never stores match scores, match reasons/i);
  assert.match(migration, /Privacy-minimal Feed-to-Create funnel events/i);
});

test("the atomic save is source-bound, duplicate-aware, private, and unable to create delivery records", () => {
  assert.match(feedAction, /moral_trade_feed_create_save_authenticated/);
  assert.match(feedAction, /Review every imported material field before saving/);
  assert.match(migration, /source_exposure_id uuid not null/);
  assert.match(migration, /source_terms_version integer not null/);
  assert.match(migration, /derivation_mode text not null check \(derivation_mode = 'counteroffer'\)/);
  assert.match(migration, /active draft already exists[\s\S]*Acknowledge the duplicate/);
  assert.match(migration, /'paused',[\s\S]*workflow_value/);
  assert.match(migration, /Feed-derived counteroffers cannot be published or delivered in Phase 1/);
  assert.match(migration, /moral_trade_feed_create_guard_invitations/);
  assert.match(migration, /moral_trade_feed_create_guard_threads/);
  assert.match(migration, /moral_trade_feed_create_guard_agreements/);
  assert.match(migration, /moral_trade_feed_create_guard_interests/);
  assert.match(migration, /moral_trade_feed_create_guard_guest_interests/);
  assert.match(managePage, /Source-bound counteroffer/);
  assert.match(managePage, /No reliance or contact/);
  assert.match(managePage, /<dt>Delivered<\/dt>/);
  assert.match(managePage, /<dd>No<\/dd>/);
  assert.match(managePage, /sourceLink\.sourceCurrent/);
});

test("operator publication denial is checked before recording review side effects", () => {
  assert.match(reviewActions, /const \{ error: updateError \} = await supabase[\s\S]*if \(updateError\) throw new Error/);
  assert.match(reviewActions, /await Promise\.all\(\[[\s\S]*trade_review_events/);
});
