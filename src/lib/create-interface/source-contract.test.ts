import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";
import { integrateCreateSafeguardsSource } from "./safeguards-integration";

const rawHtml = readFileSync("public/moral-trade-create/index.html", "utf8");
const html = integrateCreateSafeguardsSource(
  integrateCommonGroundCreateSource(rawHtml),
);
const commonGroundScript = readFileSync(
  "public/moral-trade-create/common-ground.js",
  "utf8",
);
const safeguardsScript = readFileSync(
  "public/moral-trade-create/safeguards.js",
  "utf8",
);
const route = readFileSync("src/app/api/create/publish/route.ts", "utf8");
const persistence = readFileSync(
  "src/lib/create-interface/persistence.ts",
  "utf8",
);
const page = readFileSync("src/app/trades/new/page.tsx", "utf8");
const frame = readFileSync(
  "src/components/create/create-interface-frame.tsx",
  "utf8",
);
const receiptPage = readFileSync(
  "src/app/create/submissions/[submissionId]/page.tsx",
  "utf8",
);
const activationCritical = readFileSync("src/app/activation-critical.css", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const adapterMigration = readFileSync(
  "supabase/migrations/20260727041000_moral_trade_create_interface_adapter.sql",
  "utf8",
);
const safeguardsMigration = readFileSync(
  "supabase/migrations/20260730082500_create_contextual_safeguards.sql",
  "utf8",
);

test("the accepted Create interface is mounted with compact pools and safeguards", () => {
  assert.match(page, /CreateInterfaceFrame/);
  assert.match(page, /resume=\{resume === "create"\}/);
  assert.match(frame, /public[",\s]+"moral-trade-create"[",\s]+"index\.html"/);
  assert.match(frame, /integrateCommonGroundCreateSource/);
  assert.match(frame, /integrateCreateSafeguardsSource/);
  assert.match(frame, /srcDoc=\{getCreateInterfaceSource\(resume\)\}/);
  assert.match(frame, /The Moral Trade Create resume contract could not be located/);
  assert.doesNotMatch(frame, /src=\{src\}/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /DENY/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(html, /What do you want to improve\?/);
  assert.match(html, /Commitment/);
  assert.match(html, /Donation redirect/);
  assert.match(html, /Common Ground Pool/);
  assert.match(html, /data-fund-mode="commonGround"/);
  assert.match(html, /Threshold pool/);
  assert.match(html, /data-common-ground-create-integration-v1/);
  assert.match(html, /moral-trade-create\/common-ground\.css/);
  assert.match(html, /moral-trade-create\/common-ground\.js/);
  assert.match(html, /data-create-safeguards-v1/);
  assert.match(html, /What happens without this proposal\?/);
  assert.match(html, /No harm or costly baseline was manufactured or escalated/);
  assert.match(html, /Could someone outside the proposal bear a material cost\?/);
  assert.match(html, /acting only in my individual capacity/);
  assert.match(html, /moral-trade-create\/safeguards\.css/);
  assert.match(html, /moral-trade-create\/safeguards\.js/);
  assert.match(html, /Custom mathematical formula/);
  assert.match(html, /Public exact thresholds/);
  assert.match(html, /Progress range/);
  assert.doesNotMatch(html, /href="\/mpgf\/common-ground-pool/);
  assert.match(commonGroundScript, /Private value estimates stay in this tab/);
  assert.match(commonGroundScript, /privateValueEstimatesStored:\s*false/);
  assert.match(commonGroundScript, /participantGainChecked:\s*true/);
  assert.match(safeguardsScript, /safeguards: readSafeguards\(\)/);
  assert.match(safeguardsScript, /noManufacturedLeverage/);
  assert.match(safeguardsScript, /affectedPartyStatus/);
  assert.doesNotThrow(() => new Function(commonGroundScript));
  assert.doesNotThrow(() => new Function(safeguardsScript));
});

test("the browser waits for a durable server receipt and contains no simulated publication", () => {
  assert.match(html, /fetch\("\/api\/create\/publish"/);
  assert.match(html, /credentials: "same-origin"/);
  assert.match(html, /renderSubmittedReceipt/);
  assert.match(html, /sessionStorage\.setItem\(CREATE_DRAFT_STORAGE_KEY/);
  assert.doesNotMatch(html, /POOL-REV/);
  assert.doesNotMatch(html, /Prototype: public/);
  assert.doesNotMatch(html, /state\.publishedId\s*=.*Date\.now/);
  assert.doesNotMatch(html, /setTimeout\(\(\) => \{\s*state\.published = true/);
});

test("the owner-only durable receipt remains visibly rendered with its review boundary", () => {
  assert.match(
    receiptPage,
    /page-shell marketplace-app-shell create-submission-receipt-shell/,
  );
  assert.match(receiptPage, /Durable Create receipt/);
  assert.match(receiptPage, /It is not public/);
  assert.match(receiptPage, /<dt>Status<\/dt><dd>\{label\(submission\.status\)\}<\/dd>/);
  assert.match(
    activationCritical,
    /\.create-submission-receipt-shell\.marketplace-app-shell[\s\S]*header\.v72-route-header[\s\S]*main#main-content[\s\S]*> \.section[\s\S]*display:\s*block/,
  );
});

test("the API validates safeguards and uses the atomic service-role adapter", () => {
  assert.match(route, /validateCreatePayloadWithSafeguards/);
  assert.match(route, /getViewer/);
  assert.match(route, /requiresAuth/);
  assert.match(route, /persistCreateSubmission/);
  assert.match(route, /createServiceClient/);
  assert.match(route, /actorId: viewer\.authUser\.id/);
  assert.match(persistence, /moral_trade_create_submit_service_v2/);
  assert.match(adapterMigration, /create or replace function public\.moral_trade_create_submit_service/);
  assert.match(adapterMigration, /security definer/);
  assert.match(adapterMigration, /target_type = 'offer'/);
  assert.match(adapterMigration, /target_type = 'mpgf_pool_proposal'/);
  assert.match(adapterMigration, /public_goods_failure_bonus_enabled[\s\S]*false/);
  assert.match(adapterMigration, /pending_underwriting/);
  assert.match(adapterMigration, /immutable after the first accepted pledge/i);
  assert.match(safeguardsMigration, /moral_trade_create_submit_service_v2/);
  assert.match(safeguardsMigration, /noManufacturedLeverage/);
  assert.match(safeguardsMigration, /affectedPartyStatus/);
  assert.match(safeguardsMigration, /capacity[\s\S]*individual/);
  assert.match(safeguardsMigration, /set[\s\S]*no_trade_baseline = baseline_value/);
  assert.match(
    safeguardsMigration,
    /revoke all on function public\.moral_trade_create_submit_service_v2[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    safeguardsMigration,
    /grant execute on function public\.moral_trade_create_submit_service_v2[\s\S]*to service_role/,
  );
});
