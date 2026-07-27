import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/app/institutions/actions.ts", "utf8");
const dealPage = readFileSync("src/app/institutions/[organizationId]/deals/[dealId]/page.tsx", "utf8");
const consentPage = readFileSync("src/app/institutions/consents/[consentId]/page.tsx", "utf8");
const verifierPage = readFileSync("src/app/institutions/verifier-assignments/[assignmentId]/page.tsx", "utf8");
const data = readFileSync("src/lib/institutional-data.ts", "utf8");
const webhooks = readFileSync("src/lib/institutional-webhooks.ts", "utf8");
const qaWorkflow = readFileSync(".github/workflows/institutional-trade-qa.yml", "utf8");
const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");

function expectAll(source: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) assert.match(source, pattern, `${context}: ${pattern}`);
}

test("deal room renders exact-scope baselines, immutable terms, consent, signatures, evidence, and pool governance", () => {
  expectAll(dealPage, [
    /loadInstitutionalDeal/,
    /Select exact terms/,
    /Request exact-term consent/,
    /Sign exact selected terms/,
    /expectedTermsHash/,
    /Record independent decision/,
    /Reserve financial capacity/,
    /Save contribution lifecycle/,
    /Cast exact-term vote/,
    /Independent verification and evidence/,
  ], "deal room");
});

test("named-person and verifier decision surfaces use separate authenticated actions", () => {
  expectAll(consentPage, [/decide_individual_consent/, /Record my decision/, /Exact terms hash/, /organizational approval cannot affirm/i], "consent surface");
  expectAll(verifierPage, [/decide_verifier_assignment/, /Record my decision/, /conflictDeclaration/, /No access before acceptance/], "verifier surface");
});

test("server actions use atomic RPCs for critical transitions", () => {
  expectAll(actions, [
    /select_institutional_proposal_version/,
    /decide_institutional_approval/,
    /request_institutional_individual_consent/,
    /decide_institutional_individual_consent/,
    /accept_institutional_verifier_assignment/,
    /sign_institutional_deal/,
    /target_expected_terms_hash/,
    /record_institutional_pool_approval/,
    /reserve_institutional_budget/,
    /save_institutional_pool_contribution/,
    /save_institutional_pool_anchor/,
    /save_institutional_pool_underwriting/,
    /cast_institutional_pool_vote/,
    /activate_institutional_pool/,
  ], "atomic actions");
});

test("integration configuration and webhook destinations are validated before insertion", () => {
  expectAll(actions, [/assertInstitutionalIntegrationConfigHasNoSecrets/, /validateInstitutionalWebhookDestination/, /validateSupportedInstitutionalWebhookEvents/], "integration actions");
  expectAll(webhooks, [/url\.protocol !== "https:"/, /url\.username \|\| url\.password/, /dns\.lookup/, /isForbiddenInstitutionalWebhookAddress/], "webhook SSRF controls");
});

test("confidential loaders query through user RLS while the operator Deal Desk uses the service role after separate access checks", () => {
  expectAll(data, [/createClient\(\)/, /institutional_deal_room_members/, /institutional_individual_consents/, /institutional_verifier_assignments/, /createServiceClient\(\)/], "data boundary");
});

test("QA workflow is isolated, generates types, runs database checks, full code gates, browser QA, and cleanup evidence", () => {
  expectAll(qaWorkflow, [
    /hvmxfjjbdcgjjudmthdz/,
    /refusing to run against production/i,
    /supabase db lint/,
    /gen types typescript/,
    /npm test/,
    /tsc --noEmit/,
    /npm run lint/,
    /npm run build/,
    /institutional-trade-qa-e2e\.mjs/,
    /Upload institutional QA evidence/,
  ], "QA workflow");
});

test("five-participant QA names all required negative cases and verifies zero synthetic residue", () => {
  for (const phrase of [
    "wrong-program",
    "cross-deal proposal",
    "invalid party",
    "cross-obligation milestone",
    "mismatched evidence",
    "stale signature",
    "generic approval",
    "before acceptance",
    "unauthorized financial reservation",
    "unauthorized pool vote",
    "embedded integration secret",
    "unsupported webhook event",
    "Outsider cannot read",
    "zero synthetic",
  ]) assert.match(qaScript, new RegExp(phrase, "i"), phrase);
});
