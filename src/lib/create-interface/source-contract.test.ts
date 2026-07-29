import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync("public/moral-trade-create/index.html", "utf8");
const route = readFileSync("src/app/api/create/publish/route.ts", "utf8");
const page = readFileSync("src/app/trades/new/page.tsx", "utf8");
const frame = readFileSync("src/components/create/create-interface-frame.tsx", "utf8");
const receiptPage = readFileSync(
  "src/app/create/submissions/[submissionId]/page.tsx",
  "utf8",
);
const activationCritical = readFileSync("src/app/activation-critical.css", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260727041000_moral_trade_create_interface_adapter.sql",
  "utf8",
);

test("the accepted Create interface is mounted without replacing its rendered structure", () => {
  assert.match(page, /CreateInterfaceFrame/);
  assert.match(page, /resume=\{resume === "create"\}/);
  assert.match(frame, /public[",\s]+"moral-trade-create"[",\s]+"index\.html"/);
  assert.match(frame, /srcDoc=\{getCreateInterfaceSource\(resume\)\}/);
  assert.match(frame, /The Moral Trade Create resume contract could not be located/);
  assert.doesNotMatch(frame, /src=\{src\}/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /DENY/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(html, /What do you want to improve\?/);
  assert.match(html, /Commitment/);
  assert.match(html, /Donation redirect/);
  assert.match(html, /Dominant assurance contract pool/);
  assert.match(html, /Custom mathematical formula/);
  assert.match(html, /Public exact thresholds/);
  assert.match(html, /Progress range/);
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

test("the API validates, authenticates, and uses the atomic database adapter", () => {
  assert.match(route, /validateCreatePayload/);
  assert.match(route, /getViewer/);
  assert.match(route, /requiresAuth/);
  assert.match(route, /persistCreateSubmission/);
  assert.match(route, /createServiceClient/);
  assert.match(route, /actorId: viewer\.authUser\.id/);
  assert.match(migration, /create or replace function public\.moral_trade_create_submit_service/);
  assert.match(migration, /security definer/);
  assert.match(migration, /revoke all on function public\.moral_trade_create_submit_service[\s\S]*authenticated/);
  assert.match(migration, /grant execute on function public\.moral_trade_create_submit_service[\s\S]*to service_role/);
  assert.match(migration, /target_type = 'offer'/);
  assert.match(migration, /target_type = 'mpgf_pool_proposal'/);
  assert.match(migration, /public_goods_failure_bonus_enabled[\s\S]*false/);
  assert.match(migration, /pending_underwriting/);
  assert.match(migration, /immutable after the first accepted pledge/i);
});
