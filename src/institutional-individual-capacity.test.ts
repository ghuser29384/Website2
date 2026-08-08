import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260726123000_institutional_trade_system.sql", "utf8");
const actions = readFileSync("src/app/institutions/actions.ts", "utf8");
const data = readFileSync("src/lib/institutional-data.ts", "utf8");
const individualPage = readFileSync("src/app/institutions/individual/page.tsx", "utf8");
const individualDealPage = readFileSync("src/app/institutions/individual/deals/[dealId]/page.tsx", "utf8");
const organizationPage = readFileSync("src/app/institutions/[organizationId]/page.tsx", "utf8");
const organizationDealPage = readFileSync("src/app/institutions/[organizationId]/deals/[dealId]/page.tsx", "utf8");
const navigation = readFileSync("src/lib/institutional-trade.ts", "utf8");
const stylesheet = readFileSync("src/app/institutions/institutions.module.css", "utf8");

function expectAll(source: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) assert.match(source, pattern, `${context}: ${pattern}`);
}

function functionBody(source: string, start: RegExp, end: RegExp) {
  const startMatch = source.match(start);
  assert.ok(startMatch?.index != null, `Missing function start: ${start}`);
  const afterStart = source.slice(startMatch.index);
  const endMatch = afterStart.match(end);
  assert.ok(endMatch?.index != null, `Missing function end: ${end}`);
  return afterStart.slice(0, endMatch.index);
}

test("individual and professional parties are valid without an organization, program, or legal entity", () => {
  expectAll(migration, [
    /party_capacity text not null default 'organization' check\(party_capacity in \('organization','individual','service_provider','verifier'\)\)/i,
    /profile_id uuid references public\.profiles\(id\) on delete restrict/i,
    /organization_id uuid references public\.institutional_organizations\(id\) on delete restrict, program_id uuid/i,
    /party_capacity in \('individual','service_provider','verifier'\) and profile_id is not null/i,
    /organization_id is null and program_id is null and legal_entity_id is null/i,
    /foreign key\(program_id,organization_id\) references public\.institutional_programs\(id,organization_id\)/i,
  ], "individual party shape");
  expectAll(actions, [
    /authority_status: capacity === "organization"[\s\S]*: "self_authorized"/i,
    /approval_status: capacity === "organization" \? "pending" : "not_required"/i,
    /A personal-capacity party cannot inherit an organization, program, or legal entity/i,
  ], "individual party action shape");
});

test("a deal lead is explicitly either an individual or an organization", () => {
  expectAll(migration, [
    /lead_capacity text not null default 'organization' check\(lead_capacity in \('organization','individual'\)\)/i,
    /lead_profile_id uuid references public\.profiles\(id\) on delete restrict/i,
    /lead_capacity='individual' and lead_profile_id is not null/i,
    /lead_organization_id is null and lead_program_id is null and legal_counterparty_id is null/i,
    /lead_capacity='organization' and lead_organization_id is not null and lead_profile_id is null/i,
  ], "deal lead schema");
  expectAll(actions, [
    /const selectedCapacity = actingCapacity\(formData\)/,
    /selectedCapacity !== "individual" && selectedCapacity !== "organization"/,
    /lead_capacity: "individual"/,
    /lead_profile_id: viewer\.authUser\.id/,
    /lead_organization_id: null/,
    /lead_program_id: null/,
    /legal_counterparty_id: null/,
  ], "deal lead action");
});

test("server actions require an explicit acting context and do not inherit organization authority in personal capacity", () => {
  expectAll(actions, [
    /function actingCapacity\(formData: FormData\)/,
    /value\(formData, "actingCapacity", true\)/,
    /Switch to personal \/ independent capacity before using this action/i,
    /Switch to the organization workspace before using organization-only controls/i,
    /The active organization context does not match the organization being represented/i,
    /requireDealManagementActingContext/i,
    /Personal capacity may manage only a deal led by that same person/i,
    /The active organization\/program is not an accepted exact party to this deal/i,
  ], "acting-context guards");

  for (const source of [individualPage, individualDealPage]) {
    assert.match(source, /name="actingCapacity" type="hidden" value="individual"/i);
    assert.doesNotMatch(source, /name="actingOrganizationId"/i);
  }
  for (const source of [organizationPage, organizationDealPage]) {
    assert.match(source, /name="actingCapacity" type="hidden" value="organization"/i);
    assert.match(source, /name="actingOrganizationId"/i);
  }
});

test("an individual can bind only themselves and resources they personally control", () => {
  expectAll(migration, [
    /A personal-capacity party may bind only themselves/i,
    /A personal-capacity obligation cannot name or bind a different individual/i,
    /target_authority_grant_id is not null[\s\S]*Personal capacity cannot inherit delegated organizational signing authority/i,
    /party_row\.profile_id<>auth\.uid\(\)/i,
    /party_row\.authority_status<>'self_authorized'/i,
  ], "database self authority");
  expectAll(actions, [
    /individualProfileId !== obligor\.profile_id/,
    /A personal-capacity obligation cannot name a different individual/,
    /A personal-capacity party may be represented only by that same person/,
    /target_authority_grant_id: uuid\(formData, "authorityGrantId"\)/,
  ], "action self authority");
});

test("generic organization approval cannot replace exact named-person consent", () => {
  expectAll(migration, [
    /create table public\.institutional_individual_consents/i,
    /Every named individual must affirmatively consent to the selected exact terms; generic approval cannot substitute/i,
    /Only the named individual may decide this consent/i,
    /Named-person consent must match the exact consent-required obligation/i,
  ], "named consent");
  assert.doesNotMatch(actions, /approval_kind[^\n]*individual_consent/i);
});

test("organization-only administration remains hard-gated at schema, action, loader, and route layers", () => {
  for (const table of [
    "institutional_mandates",
    "institutional_authority_grants",
    "institutional_approval_policies",
    "institutional_budget_accounts",
    "institutional_integrations",
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table} \\([\\s\\S]*?organization_id uuid not null`, "i"), table);
  }

  for (const action of [
    "create_mandate",
    "create_approval",
    "decide_approval",
    "create_budget_account",
    "reserve_budget",
    "create_integration",
    "create_webhook",
  ]) {
    assert.match(actions, new RegExp(`case "${action}"[\\s\\S]*?requireOrganizationActingContext`, "i"), action);
  }

  const individualWorkspaceLoader = functionBody(
    data,
    /export async function loadIndividualInstitutionalWorkspace/,
    /export async function loadIndividualInstitutionalDeal/,
  );
  const individualDealLoader = functionBody(
    data,
    /export async function loadIndividualInstitutionalDeal/,
    /export async function loadInstitutionalVerifierAssignment/,
  );
  const organizationDealLoader = functionBody(
    data,
    /export async function loadInstitutionalDeal/,
    /export async function loadIndividualInstitutionalWorkspace/,
  );
  for (const source of [individualWorkspaceLoader, individualDealLoader]) {
    assert.doesNotMatch(source, /institutional_(mandates|authority_grants|approval_policies|budget_accounts|integrations)/i);
  }
  expectAll(organizationDealLoader, [
    /institutional_memberships/,
    /eq\("organization_id", organizationId\)/,
    /eq\("profile_id", viewerProfileId\)/,
    /eq\("status", "active"\)/,
    /if \(membershipResult\.error \|\| !membershipResult\.data\) return null/,
  ], "direct organization deal route membership gate");
  assert.match(organizationDealPage, /loadInstitutionalDeal\(organizationId, dealId, viewer\.authUser\.id\)/);
});

test("the individual interface is reduced on desktop and mobile", () => {
  expectAll(navigation, [
    /INDIVIDUAL_INSTITUTIONAL_NAV = \[[\s\S]*"Opportunities"[\s\S]*"Matches"[\s\S]*"Deals"[\s\S]*"Obligations"[\s\S]*"Evidence"[\s\S]*"Consent and verification"/,
    /ORGANIZATION_INSTITUTIONAL_NAV = \[[\s\S]*"Mandates"[\s\S]*"Approvals"[\s\S]*"Funds"[\s\S]*"Integrations"/,
  ], "navigation split");
  expectAll(individualPage, [
    /INDIVIDUAL_INSTITUTIONAL_NAV/,
    /Acting as: Personal \/ independent/,
    /You cannot verify your own institutional identity or qualifications/,
  ], "individual workspace");
  expectAll(individualDealPage, [
    /Independent deal workspace/,
    /"Parties", "Proposals", "Baselines", "Obligations", "Evidence", "Consent and verification"/,
    /Sign for myself/,
  ], "individual deal room");
  expectAll(stylesheet, [/@media\s*\(max-width:/i], "responsive stylesheet");

  for (const forbidden of ["Mandates", "Delegated authority", "Committees", "Institutional budgets", "Enterprise integrations"]) {
    assert.doesNotMatch(individualPage, new RegExp(forbidden, "i"), forbidden);
    assert.doesNotMatch(individualDealPage, new RegExp(forbidden, "i"), forbidden);
  }
});

test("independent verification cannot be self-issued", () => {
  expectAll(migration, [
    /institutional_protect_individual_verification/i,
    /An individual cannot self-verify institutional identity or qualifications/i,
    /Individual verification status may be changed only by an authorized reviewer/i,
  ], "individual verification guard");
});

test("organization members can switch capacities without leaking delegated authority into personal actions", () => {
  expectAll(organizationPage, [/Acting as:/, /Switch to personal capacity/], "organization switcher");
  expectAll(individualPage, [/Acting as: Personal \/ independent/, /Switch to an organization context/], "personal switcher");
  expectAll(actions, [
    /if \(isPersonalInstitutionalCapacity\(capacity\)\)/,
    /await requireActiveIndividualParticipation\(client, viewerProfileId\)/,
    /await requireOrganizationActingContext\(client, viewerProfileId, organizationId, formData\)/,
    /A personal-capacity party may be represented only by that same person/i,
  ], "capacity-separated authorization");
});
