import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/app/institutions/actions.ts", "utf8");
const dealPage = readFileSync("src/app/institutions/[organizationId]/deals/[dealId]/page.tsx", "utf8");
const consentPage = readFileSync("src/app/institutions/consents/[consentId]/page.tsx", "utf8");
const verifierPage = readFileSync("src/app/institutions/verifier-assignments/[assignmentId]/page.tsx", "utf8");
const individualPage = readFileSync("src/app/institutions/individual/page.tsx", "utf8");
const individualDealPage = readFileSync("src/app/institutions/individual/deals/[dealId]/page.tsx", "utf8");
const organizationPage = readFileSync("src/app/institutions/[organizationId]/page.tsx", "utf8");
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
    /accept_institutional_deal_party/,
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


test("independent participants get a reduced self-authority interface without organization administration", () => {
  expectAll(individualPage, [
    /Acting as: Personal \/ independent/,
    /INDIVIDUAL_INSTITUTIONAL_NAV/,
    /enable_individual_participation/,
    /actingCapacity" type="hidden" value="individual"/,
    /Opportunities/,
    /Matches/,
    /Deals/,
    /Obligations/,
    /Evidence/,
    /Consent and verification/,
  ], "individual workspace");
  expectAll(individualDealPage, [
    /loadIndividualInstitutionalDeal/,
    /Independent deal workspace/,
    /"Parties", "Proposals", "Baselines", "Obligations", "Evidence", "Consent and verification"/,
    /accept_deal_party/,
    /Sign for myself/,
    /expectedTermsHash/,
    /personal signature applies only/i,
  ], "individual deal room");
  for (const forbidden of [
    "Create a commitment account",
    "Enterprise integrations",
    "Active authority grants",
    "Create a program mandate",
  ]) {
    assert.doesNotMatch(individualPage, new RegExp(forbidden, "i"), `individual page must omit ${forbidden}`);
    assert.doesNotMatch(individualDealPage, new RegExp(forbidden, "i"), `individual deal page must omit ${forbidden}`);
  }
  expectAll(organizationPage, [
    /ORGANIZATION_INSTITUTIONAL_NAV/,
    /Switch to personal capacity/,
    /Create a commitment account/,
    /Enterprise integrations/,
  ], "organization workspace");
});

test("server actions branch by acting capacity and hard-gate organization-only controls", () => {
  expectAll(actions, [
    /const selectedCapacity = actingCapacity\(formData\)/,
    /lead_profile_id: viewer\.authUser\.id/,
    /lead_organization_id: null/,
    /authority_status: "self_authorized"/,
    /approval_status: "not_required"/,
    /requireOrganizationActingContext/,
    /Switch to the organization workspace before using organization-only controls/,
    /The active organization context does not match the organization being represented/,
    /requireDealManagementActingContext/,
    /A personal-capacity party cannot inherit an organization, program, or legal entity/,
    /target_authority_grant_id: uuid\(formData, "authorityGrantId"\)/,
  ], "capacity branching");
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
    "Individual party and deal lead require no organization or program",
    "Individual binds their own labor under self authority",
    "Individual cannot bind another person",
    "Individual cannot represent an organization without authority",
    "Organization membership does not leak",
    "Individual cannot create an organization-only budget",
    "individual navigation omits organization-only controls",
    "Individual direct access to another organization's controls is denied",
    "Individual signs exact terms for themselves without an authority grant",
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
