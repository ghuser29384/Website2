import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";

const rawHtml = readFileSync("public/moral-trade-create/index.html", "utf8");
const html = integrateCommonGroundCreateSource(rawHtml);
const commonGroundScript = readFileSync(
  "public/moral-trade-create/common-ground.js",
  "utf8",
);
const route = readFileSync("src/app/api/create/publish/route.ts", "utf8");
const createValidation = readFileSync(
  "src/lib/create-interface/validation.ts",
  "utf8",
);
const createPersistence = readFileSync(
  "src/lib/create-interface/persistence.ts",
  "utf8",
);
const groupClient = readFileSync(
  "src/lib/create-interface/group-contribution-client.ts",
  "utf8",
);
const participantPicker = readFileSync(
  "public/moral-trade-create/participant-picker.js",
  "utf8",
);
const participantTargetServer = readFileSync(
  "src/lib/create-interface/participant-target-server.ts",
  "utf8",
);
const instrumentationClient = readFileSync("src/instrumentation-client.ts", "utf8");
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

test("the accepted Create interface is mounted with Donation Upgrade and compact Co-Fund", () => {
  assert.match(page, /CreateInterfaceFrame/);
  assert.match(page, /resume=\{resume === "create"\}/);
  assert.match(frame, /public[",\s]+"moral-trade-create"[",\s]+"index\.html"/);
  assert.match(frame, /integrateCommonGroundCreateSource/);
  assert.match(frame, /srcDoc=\{getCreateInterfaceSource\(resume\)\}/);
  assert.match(frame, /The Moral Trade Create resume contract could not be located/);
  assert.match(frame, /resumeExpression\.test\(createInterfaceSource\)/);
  assert.match(frame, /createInterfaceSource\.replace\([\s\S]*resumeExpression[\s\S]*const shouldResume = true/);
  assert.doesNotMatch(frame, /src=\{src\}/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /DENY/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(html, /What do you want to improve\?/);
  assert.match(html, /Commitment/);
  assert.match(html, /Donation redirect/);
  assert.match(html, /Donation Upgrade/);
  assert.doesNotMatch(html, />Conditional donation</);
  assert.match(html, /data-fund-mode="conditional"/);
  assert.match(html, /Commit inside Create/);
  assert.match(html, /each participant donates directly after the outcome is fixed\./);
  assert.doesNotMatch(
    html,
    /Authorize a fallback donation|Authorize inside Create|future-charge terms|before any payment method is saved/,
  );
  assert.match(
    html,
    /window\.top\.location\.assign\("\/trades\/new\?structure=conditional-donation"\)/,
  );
  assert.match(html, /Dominant assurance contract pool/);
  assert.match(html, /Co-Fund/);
  assert.match(html, /data-fund-mode="commonGround"/);
  assert.match(html, /Threshold pool/);
  assert.match(html, /data-common-ground-create-integration-v1/);
  assert.match(html, /moral-trade-create\/common-ground\.css/);
  assert.match(html, /moral-trade-create\/participant-picker\.js/);
  assert.match(html, /moral-trade-create\/common-ground\.js/);
  assert.match(html, /Custom mathematical formula/);
  assert.match(html, /Public exact thresholds/);
  assert.match(html, /Progress range/);
  assert.doesNotMatch(html, /href="\/mpgf\/common-ground-pool/);
  assert.match(html, /Are you participating in this Co-Fund\?/);
  assert.match(html, /Typed text is not a participant until you explicitly select an account\./);
  assert.match(html, /private claim link/);
  assert.match(commonGroundScript, /What would you fund instead\?/);
  assert.match(commonGroundScript, /Your private maximum contribution/);
  assert.match(commonGroundScript, /participant-owned terms/i);
  assert.match(commonGroundScript, /privateValueEstimatesStored:\s*false/);
  assert.match(commonGroundScript, /allocationStatus:\s*"open"/);
  assert.match(commonGroundScript, /creatorParticipation:\s*state\.commonGroundCreatorParticipation/);
  assert.match(commonGroundScript, /commonGroundParticipants\.length >= 100/);
  assert.doesNotMatch(commonGroundScript, /contributionCents|participantGainChecked/);
  assert.doesNotThrow(() => new Function(commonGroundScript));
});

test("the browser waits for a durable server receipt and contains no simulated publication", () => {
  assert.match(html, /fetch\("\/api\/create\/publish"/);
  assert.match(html, /credentials: "same-origin"/);
  assert.match(html, /renderSubmittedReceipt/);
  assert.match(html, /function createDraftStorage\(\)/);
  assert.match(html, /window\.top\.sessionStorage/);
  assert.match(html, /storage\.setItem\(CREATE_DRAFT_STORAGE_KEY/);
  assert.match(html, /step: 4/);
  assert.match(html, /offerPhase: "details"/);
  assert.match(html, /return storage\.getItem\(CREATE_DRAFT_STORAGE_KEY\) === serialized/);
  assert.match(html, /if \(!saveDraftForResume\(\)\)/);
  assert.match(html, /function clearDraftForResume\(\)/);
  assert.match(html, /Keep the snapshot through a possible srcDoc remount/);
  assert.doesNotMatch(html, /CREATE_DRAFT_STORAGE\.(?:setItem|getItem|removeItem)/);
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


test("proposal-only group terms are integrated into the real iframe and authoritative write boundary", () => {
  assert.match(instrumentationClient, /startGroupContributionEnhancement/);
  assert.match(groupClient, /iframe\[data-create-interface-frame='true'\]/);
  assert.match(groupClient, /requestUrl\.pathname !== "\/api\/create\/publish"/);
  assert.match(groupClient, /groupContributionTerms: proposal/);
  assert.match(groupClient, /data-mt-group-contribution-review/);
  assert.match(createValidation, /validateGroupContributionProposalForPersistence/);
  assert.match(createValidation, /authoritativeGroupContributionOptions/);
  assert.match(createValidation, /optionKey: `\$\{offer\.id\}:\$\{index \+ 1\}`/);
  assert.match(createValidation, /visibility: "private-review"/);
  assert.match(groupClient, /MoralTradeParticipantPicker/);
  assert.match(groupClient, /Are you participating in this/);
  assert.match(groupClient, /participant-owned(?: terms|-note)|enter and confirm their own/i);
  assert.match(participantPicker, /role="combobox"/);
  assert.match(participantPicker, /Select one explicitly/);
  assert.match(participantPicker, /private claim link/);
  assert.match(route, /validateAccountParticipantTargets/);
  assert.match(participantTargetServer, /resolve_create_participants_v2/);
  assert.match(participantTargetServer, /no longer eligible/);
  assert.match(createPersistence, /groupContributionReviewRecord/);
  assert.doesNotMatch(createPersistence, /paymentIntent|clientSecret|publishIdentities/);
});

test("authentication resume snapshot survives an iframe remount until durable receipt", () => {
  const start = html.indexOf("function restoreDraftForResume()");
  const end = html.indexOf("\n    function renderSubmittedReceipt", start);
  assert.ok(start >= 0 && end > start);
  const restoreSource = html.slice(start, end);
  assert.match(restoreSource, /Object\.assign\(state, saved/);
  assert.doesNotMatch(
    restoreSource,
    /CREATE_DRAFT_STORAGE\.removeItem\(CREATE_DRAFT_STORAGE_KEY\)/,
  );
});
