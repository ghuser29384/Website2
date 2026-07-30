import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const organizationPage = readFileSync("src/app/institutions/[organizationId]/page.tsx", "utf8");
const organizationDealPage = readFileSync("src/app/institutions/[organizationId]/deals/[dealId]/page.tsx", "utf8");
const individualPage = readFileSync("src/app/institutions/individual/page.tsx", "utf8");
const individualDealPage = readFileSync("src/app/institutions/individual/deals/[dealId]/page.tsx", "utf8");
const dealWorkspace = readFileSync("src/components/institutions/institutional-deal-workspace.tsx", "utf8");
const organizationAdministration = readFileSync("src/components/institutions/institutional-organization-administration.tsx", "utf8");
const poolWorkspace = readFileSync("src/components/institutions/institutional-pool-workspace.tsx", "utf8");
const actions = readFileSync("src/app/institutions/actions.ts", "utf8");
const data = readFileSync("src/lib/institutional-data.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260726123000_institutional_trade_system.sql", "utf8");
const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");

function expectAll(source: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) assert.match(source, pattern, `${context}: ${pattern}`);
}

test("Beta 1 exposes the complete transaction-integrity workflow", () => {
  for (const phrase of [
    "Public identity and verification facets",
    "Programs and portfolio mandates",
    "Resources offered and sought",
    "Institutional opportunities",
    "Deal room",
    "Parties and no-trade baselines",
    "Versioned proposals and exact-term selection",
    "Approvals, named-person consent, and signatures",
    "Accept this organization-party invitation under exact authority",
    "Request a named exact-scope organizational approval",
    "Obligations, dependencies, and milestones",
    "Exact requirements, submissions, and independent review",
    "Threats, conflicts, externalities, amendments, and disputes",
    "Immutable event history",
  ]) {
    assert.match(`${organizationPage}\n${organizationDealPage}\n${dealWorkspace}`, new RegExp(phrase, "i"), phrase);
  }
  expectAll(actions, [
    /case "create_baseline"/,
    /create_proposal/,
    /select_proposal/,
    /case "create_approval"/,
    /decide_approval/,
    /request_individual_consent/,
    /sign_deal/,
    /reserve_budget/,
    /create_milestone/,
    /submit_evidence/,
    /create_amendment/,
    /open_dispute/,
  ], "Beta 1 actions");
});

test("Beta 2 exposes repeatable institutional infrastructure", () => {
  expectAll(organizationAdministration, [
    /Reusable templates/,
    /Framework agreements/,
    /Track-record entries/,
    /permission-aware Command draft/,
  ], "Beta 2 organization interface");
  expectAll(organizationPage, [/Enterprise integrations/, /Create a signed webhook/], "Beta 2 enterprise interface");
  expectAll(dealWorkspace, [
    /independent verifier or service provider/i,
    /Attribution, board packets, and structured reporting/,
    /Create immutable snapshot/,
  ], "Beta 2 deal interface");
  expectAll(actions, [
    /create_template/,
    /create_framework_agreement/,
    /create_command_draft/,
    /create_attribution_claim/,
    /create_report_snapshot/,
  ], "Beta 2 actions");
});

test("Beta 3 exposes consortium and moral-public-goods pool governance without custody", () => {
  expectAll(poolWorkspace, [
    /Consortium and moral-public-goods pool governance/,
    /Create exact pool economics and governance terms/,
    /Record independent pool participation approval/,
    /Reserve financial capacity/,
    /Record contribution lifecycle/,
    /Record an anchor commitment/,
    /Record underwriting/,
    /Cast an exact-term governance vote/,
    /Run atomic activation gate/,
  ], "Beta 3 deal interface");
  expectAll(actions, [
    /create_pool_terms/,
    /record_pool_approval/,
    /reserve_budget/,
    /save_pool_contribution/,
    /save_pool_anchor/,
    /save_pool_underwriting/,
    /cast_pool_vote/,
    /activate_pool/,
  ], "Beta 3 actions");
  expectAll(migration, [
    /institutional_pool_terms/,
    /institutional_pool_contributions/,
    /institutional_pool_anchors/,
    /institutional_pool_underwritings/,
    /institutional_pool_votes/,
    /Financial reservation cannot substitute for independent pool participation approval/i,
  ], "Beta 3 database model");
  assert.match(`${organizationAdministration}\n${dealWorkspace}\n${poolWorkspace}`, /does not (?:custody|hold|hold, escrow, or transfer) institutional funds/i);
});

test("independent institutional participation remains first-class and reduced", () => {
  expectAll(individualPage, [
    /Acting as: Personal \/ independent/,
    /Opportunities/,
    /Matches/,
    /Deals/,
    /Obligations/,
    /Evidence/,
    /Consent and verification/,
  ], "individual workspace");
  expectAll(individualDealPage, [
    /Independent deal workspace/,
    /InstitutionalDealWorkspace/,
    /Sign for myself/,
  ], "individual deal workspace");
  for (const forbidden of ["Create exact-scope delegated authority", "Create an approval policy", "Create a signed webhook", "Create a commitment account"]) {
    assert.doesNotMatch(`${individualPage}\n${individualDealPage}`, new RegExp(forbidden, "i"), forbidden);
  }
  expectAll(migration, [
    /lead_capacity='individual'/,
    /party_capacity in \('individual','service_provider','verifier'\)/,
    /Personal capacity cannot inherit a delegated organizational authority grant/i,
  ], "individual database boundary");
});

test("confidential matching, scoped rooms, and accepted verifiers fail closed", () => {
  expectAll(migration, [
    /institutional_match_interests/,
    /record_institutional_match_interest/,
    /institutional_room_member_relationship_guard/,
    /visibility='party_internal'/,
    /Independent verifier room access requires the accepted assignment/i,
  ], "confidential database controls");
  expectAll(actions, [
    /Personal capacity cannot post a message as an organization-internal communication/i,
    /Organization-scoped room access must exactly match the selected organization party/i,
    /review_institutional_evidence/,
  ], "confidential action controls");
  expectAll(data, [/acceptedVerifier/, /institutional_deal_room_members/, /institutional_verifier_assignments/], "confidential loaders");
});

test("authenticated QA contains both complete positive workflows and the negative matrix", () => {
  for (const phrase of [
    "organization-led",
    "independent-individual-led",
    "desktop",
    "mobile",
    "wrong-program",
    "Individual cannot represent an organization without authority",
    "cross-deal",
    "stale signature",
    "generic approval",
    "before acceptance",
    "unauthorized financial reservation",
    "unauthorized pool vote",
    "organization-only",
    "authority leakage",
    "zero synthetic",
  ]) assert.match(qaScript, new RegExp(phrase, "i"), phrase);
});
