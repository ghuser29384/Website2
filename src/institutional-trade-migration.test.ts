import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260726123000_institutional_trade_system.sql", "utf8");

function expectAll(patterns: RegExp[], context: string) {
  for (const pattern of patterns) assert.match(migration, pattern, `${context}: ${pattern}`);
}

test("institutional schema separates people, organizations, programs, legal entities, authority, and exact parties", () => {
  expectAll([
    /create table public\.institutional_organizations/i,
    /create table public\.institutional_individual_profiles/i,
    /create table public\.institutional_legal_entities/i,
    /create table public\.institutional_programs/i,
    /create table public\.institutional_memberships/i,
    /create table public\.institutional_authority_grants/i,
    /create table public\.institutional_deal_parties[\s\S]*authority_grant_id uuid references public\.institutional_authority_grants/i,
    /Organization-party authority grant must exactly match the representative, organization, and program/i,
    /foreign key\(program_id,organization_id\) references public\.institutional_programs\(id,organization_id\)/i,
  ], "identity and authority model");
});

test("baselines and approvals are exact personal or organization/program scoped", () => {
  expectAll([
    /institutional_validate_exact_scope/i,
    /Baseline profile or organization\/program scope must exactly match the deal party/i,
    /Approval organization\/program scope must exactly match an organization deal party/i,
    /Approval authority grant must exactly match organization, program, and decision maker/i,
    /create trigger institutional_baseline_exact_scope/i,
    /create trigger institutional_approval_exact_scope/i,
    /decide_institutional_approval[\s\S]*Exact-scope approval authority is required/i,
  ], "exact-scope guards");
});


test("individual deal leads and parties do not require an organization or program", () => {
  expectAll([
    /lead_capacity text not null default 'organization'/i,
    /lead_profile_id uuid references public\.profiles/i,
    /lead_capacity='individual' and lead_profile_id is not null/i,
    /lead_organization_id is null and lead_program_id is null and legal_counterparty_id is null/i,
    /party_capacity text not null default 'organization'/i,
    /profile_id uuid references public\.profiles/i,
    /party_capacity in \('individual','service_provider','verifier'\) and profile_id is not null/i,
    /organization_id is null and program_id is null and legal_entity_id is null/i,
    /A personal-capacity party uses self authority, not delegated organizational authority/i,
    /An individual cannot self-verify institutional identity or qualifications/i,
    /Individual verification status may be changed only by an authorized reviewer/i,
    /Only the named personal-capacity participant may accept this deal-party invitation/i,
    /create policy institutional_deal_parties_insert[\s\S]*lead_capacity='individual' and party_capacity='individual'[\s\S]*lead_profile_id=profile_id and profile_id=\(select auth\.uid\(\)\)/i,
    /create policy institutional_deal_parties_update[\s\S]*using\(public\.can_manage_institutional_deal\(deal_id\)\)/i,
    /create policy institutional_deal_parties_delete[\s\S]*using\(public\.can_manage_institutional_deal\(deal_id\)\)/i,
    /A personal-capacity obligation cannot name or bind a different individual/i,
    /Personal-capacity self authority is not active/i,
    /Signature capacity and scope must exactly match the signed deal party/i,
  ], "personal-capacity model");
});

test("organization-only administration remains organization scoped", () => {
  expectAll([
    /create table public\.institutional_mandates \([\s\S]*organization_id uuid not null/i,
    /create table public\.institutional_authority_grants \([\s\S]*organization_id uuid not null/i,
    /create table public\.institutional_approval_policies \([\s\S]*organization_id uuid not null/i,
    /create table public\.institutional_budget_accounts \([\s\S]*organization_id uuid not null/i,
    /create table public\.institutional_integrations \([\s\S]*organization_id uuid not null/i,
    /institutional_mandates_write[\s\S]*has_institutional_permission\(organization_id,program_id,'mandate:manage'/i,
    /institutional_budget_accounts_write[\s\S]*'finance:manage'/i,
    /institutional_integrations_write[\s\S]*'integration:manage'/i,
  ], "organization-only controls");
});

test("proposal, party, obligation, milestone, verifier, and evidence relationships fail closed", () => {
  expectAll([
    /unique\(id,deal_id\)/i,
    /unique\(id,deal_id,terms_hash\)/i,
    /foreign key\(proposal_version_id,deal_id\) references public\.institutional_proposal_versions/i,
    /foreign key\(obligor_party_id,deal_id\) references public\.institutional_deal_parties/i,
    /foreign key\(beneficiary_party_id,deal_id\) references public\.institutional_deal_parties/i,
    /foreign key\(obligation_id,deal_id,proposal_version_id\) references public\.institutional_obligations/i,
    /foreign key\(milestone_id,deal_id,obligation_id,proposal_version_id\) references public\.institutional_milestones/i,
    /foreign key\(requirement_id,deal_id,proposal_version_id,obligation_id,milestone_id\) references public\.institutional_evidence_requirements/i,
    /institutional_room_verifier_assignment_fk/i,
    /institutional_room_member_relationship_guard/i,
    /Independent verifier room access requires the accepted assignment for the same deal and profile/i,
    /Personal-capacity room access must match the named party and cannot imply organization authority/i,
    /institutional_prevent_dependency_cycle/i,
    /institutional_obligation_party_relationship/i,
    /institutional_signature_party_relationship/i,
    /institutional_dispute_events_select[\s\S]*d\.id=dispute_id[\s\S]*can_read_institutional_deal\(d\.deal_id\)/i,
  ], "relationship guards");
});

test("obligation and milestone completion is transition-guarded and evidence-bound", () => {
  expectAll([
    /institutional_guard_obligation_status_transition/i,
    /Invalid institutional obligation status transition/i,
    /Required predecessor obligations must complete before this obligation/i,
    /All obligation milestones must be verified, completed, or waived before completion/i,
    /All obligation evidence requirements must be satisfied, waived, or closed before completion/i,
    /Exact-term named-person consent is required before obligation completion/i,
    /institutional_guard_milestone_status_transition/i,
    /Invalid institutional milestone status transition/i,
    /Milestone evidence requirements must be satisfied, waived, or closed before verification or completion/i,
    /transition_institutional_obligation_status/i,
    /transition_institutional_milestone_status/i,
    /grant execute on function public\.transition_institutional_obligation_status\(uuid,uuid,text\) to authenticated/i,
    /grant execute on function public\.transition_institutional_milestone_status\(uuid,uuid,text\) to authenticated/i,
  ], "verified completion lifecycle");
});

test("confidential matching stores each side’s interest separately and reveals only aggregate status", () => {
  expectAll([
    /create table public\.institutional_match_interests/i,
    /unique\(match_id,organization_id\)/i,
    /Match interest organization must be one of the exact matched organizations/i,
    /generate_institutional_matches/i,
    /record_institutional_match_interest/i,
    /Exact-scope opportunity or deal authority is required to record match interest/i,
    /when offer_interest='interested' and seek_interest='interested' then 'mutual_interest'/i,
    /institutional_match_interests_select[\s\S]*is_institutional_organization_member\(organization_id\)/i,
  ], "confidential matching");
});

test("deal-room message visibility and organization representation are enforced in the database", () => {
  expectAll([
    /institutional_deal_messages_select[\s\S]*visibility='all_parties'/i,
    /visibility='party_internal'[\s\S]*is_institutional_organization_member\(organization_id\)/i,
    /institutional_deal_messages_insert[\s\S]*visibility='all_parties' and organization_id is null/i,
    /Party-internal room access requires an exact represented organization/i,
    /p\.deal_id=institutional_deal_messages\.deal_id/i,
    /p\.organization_id=institutional_deal_messages\.organization_id/i,
  ], "deal-room confidentiality");
});

test("selected and signed terms are immutable and signatures require the current exact hash", () => {
  expectAll([
    /institutional_exact_terms_hash/i,
    /institutional_set_exact_terms_hash/i,
    /institutional_lock_proposal/i,
    /Selected proposal versions are immutable/i,
    /institutional_lock_signed_deal/i,
    /Signed deal records are immutable and exact-term-bound/i,
    /sign_institutional_deal\([\s\S]*target_expected_terms_hash text/i,
    /Signature request is stale because the selected exact terms changed/i,
    /insert into public\.institutional_signatures[\s\S]*terms_hash/i,
    /Institutional signatures are immutable exact-term records/i,
    /Every joined party must sign the selected exact terms before the signed stage/i,
  ], "exact-term immutability");
});

test("named-person consent is a separate exact-term record and cannot be replaced by approval", () => {
  expectAll([
    /create table public\.institutional_individual_consents/i,
    /unique\(obligation_id,individual_profile_id,terms_hash\)/i,
    /request_institutional_individual_consent/i,
    /decide_institutional_individual_consent/i,
    /Every named individual must affirmatively consent to the selected exact terms; generic approval cannot substitute/i,
    /Named-person consent must match the exact consent-required obligation/i,
  ], "named consent");
});

test("verifiers receive confidential access only after accepting their assignment", () => {
  expectAll([
    /create table public\.institutional_verifier_assignments/i,
    /accept_institutional_verifier_assignment/i,
    /Independent verifier must accept the assignment before confidential deal-room access/i,
    /insert into public\.institutional_deal_room_members[\s\S]*verifier_assignment_id/i,
    /target_decision='accepted'/i,
  ], "verifier access");
});

test("pool approval, financial reservation, contributions, anchors, underwriting, votes, and activation are distinct atomic gates", () => {
  expectAll([
    /'pool:approve'/i,
    /'finance:reserve'/i,
    /record_institutional_pool_approval/i,
    /reserve_institutional_budget/i,
    /save_institutional_pool_contribution/i,
    /save_institutional_pool_anchor/i,
    /save_institutional_pool_underwriting/i,
    /cast_institutional_pool_vote/i,
    /activate_institutional_pool/i,
    /grant execute on function public\.generate_institutional_matches\(uuid\) to authenticated/i,
    /grant execute on function public\.record_institutional_match_interest\(uuid,uuid,text,text\) to authenticated/i,
    /grant execute on function public\.accept_institutional_organization_party\(uuid,uuid,uuid,uuid\) to authenticated/i,
    /grant execute on function public\.review_institutional_evidence\(uuid,uuid,text,text,uuid,uuid,uuid\) to authenticated/i,
    /Financial reservation cannot substitute for independent pool participation approval/i,
    /status text not null default 'pledged' check\(status in \('pledged','committed','withdrawn','released','paid','refunded'\)\)/i,
    /target_status not in\('pledged','committed','withdrawn','released','paid','refunded'\)/i,
    /Pool contribution reservation must belong to the exact organization\/program/i,
    /Pool vote requires valid exact-scope pool approval authority/i,
    /Required anchor commitments are incomplete/i,
    /Required underwriting commitments are incomplete/i,
    /Reservation idempotency key was already used with different exact terms or authority/i,
    /Exact-scope finance authority is required for this contribution state/i,
    /institutional_pool_status_transition_guard/i,
    /A pool may become active only through the atomic activation function/i,
    /app\.institutional_pool_activation_id/i,
    /institutional_pool_contributions_orgwide_unique/i,
    /institutional_pool_votes_orgwide_unique/i,
    /program_id is not distinct from target_program_id/i,
  ], "pool gates");
});

test("integration configuration rejects embedded secrets and webhooks use an event allowlist", () => {
  expectAll([
    /institutional_json_contains_secret\(payload jsonb\)/i,
    /jsonb_each\(payload\) as entry\(key,value\)/i,
    /jsonb_array_elements\(payload\) as element\(value\)/i,
    /institutional_validate_integration_configuration/i,
    /Integration configuration must not embed secrets; use a credential reference/i,
    /institutional_supported_webhook_events/i,
    /deal\.signed/i,
    /pool\.activated/i,
    /Unsupported institutional webhook event/i,
    /secret_reference text not null/i,
  ], "integration security");
});

test("institutional SECURITY DEFINER execution is deny-by-default and exactly allowlisted", () => {
  expectAll([
    /p\.prosecdef[\s\S]*p\.proname like '%institutional%'/i,
    /revoke all on function %s from public,anon,authenticated/i,
    /grant execute on function public\.is_institutional_organization_member\(uuid\) to authenticated/i,
    /grant execute on function public\.has_institutional_permission\(uuid,uuid,text,bigint\) to authenticated/i,
    /grant execute on function public\.can_manage_institutional_organization\(uuid\) to authenticated/i,
    /grant execute on function public\.can_read_institutional_deal\(uuid\) to authenticated/i,
    /grant execute on function public\.can_manage_institutional_deal\(uuid\) to authenticated/i,
  ], "institutional function execute grants");

  const observed = Array.from(
    migration.matchAll(/grant execute on function public\.([a-z0-9_]+\([^;]*\)) to authenticated;/gi),
    (match) => match[1].replace(/\s+/g, ""),
  ).sort();
  const expected = [
    "accept_institutional_deal_party(uuid)",
    "accept_institutional_organization_party(uuid,uuid,uuid,uuid)",
    "accept_institutional_verifier_assignment(uuid,text,text)",
    "activate_institutional_pool(uuid,uuid,uuid,uuid)",
    "can_manage_institutional_deal(uuid)",
    "can_manage_institutional_organization(uuid)",
    "can_read_institutional_deal(uuid)",
    "cast_institutional_pool_vote(uuid,uuid,uuid,text,text,uuid)",
    "decide_institutional_approval(uuid,text,uuid,text)",
    "decide_institutional_individual_consent(uuid,text,text)",
    "generate_institutional_matches(uuid)",
    "get_institutional_deal_authorization_snapshot(uuid,uuid,uuid)",
    "has_institutional_permission(uuid,uuid,text,bigint)",
    "is_institutional_organization_member(uuid)",
    "record_institutional_match_interest(uuid,uuid,text,text)",
    "record_institutional_pool_approval(uuid,uuid,uuid,uuid,text)",
    "request_institutional_individual_consent(uuid,uuid)",
    "reserve_institutional_budget(uuid,uuid,bigint,uuid,text)",
    "review_institutional_evidence(uuid,uuid,text,text,uuid,uuid,uuid)",
    "revoke_institutional_room_access(uuid,uuid)",
    "revoke_institutional_verifier_assignment(uuid,uuid)",
    "save_institutional_pool_anchor(uuid,uuid,uuid,uuid,bigint,text,uuid)",
    "save_institutional_pool_contribution(uuid,uuid,uuid,bigint,text,uuid,uuid)",
    "save_institutional_pool_underwriting(uuid,uuid,uuid,bigint,text,uuid,uuid)",
    "select_institutional_proposal_version(uuid,uuid,uuid,uuid)",
    "sign_institutional_deal(uuid,uuid,uuid,text)",
    "transition_institutional_deal_stage(uuid,text)",
    "transition_institutional_milestone_status(uuid,uuid,text)",
    "transition_institutional_obligation_status(uuid,uuid,text)",
  ].sort();
  assert.deepEqual(observed, expected, "authenticated institutional execution must equal the exact 29-function allowlist");
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.[^;]*institutional[^;]* to anon/i,
    "anonymous callers must never execute institutional SECURITY DEFINER functions",
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.(?:assert_institutional_aal2|can_act_for_institutional_party)\([^;]*\) to authenticated/i,
    "internal authorization helpers must remain private",
  );
});

test("all institutional base tables use forced RLS, generated FK indexes, and restricted grants", () => {
  expectAll([
    /c\.relname like 'institutional_%'[\s\S]*alter table %I\.%I enable row level security/i,
    /alter table %I\.%I force row level security/i,
    /institutional_deals_select/i,
    /has_institutional_permission/i,
    /create index if not exists %I on %I\.%I/i,
    /revoke all on table %I\.%I from anon/i,
    /grant select,insert,update,delete on table %I\.%I to authenticated/i,
    /alter view public\.institutional_public_organizations set \(security_invoker=true\)/i,
    /alter view public\.institutional_public_programs set \(security_invoker=true\)/i,
    /alter view public\.institutional_public_opportunities set \(security_invoker=true\)/i,
    /alter view public\.institutional_track_record set \(security_invoker=true\)/i,
    /revoke all on table public\.institutional_public_organizations from public,anon,authenticated/i,
    /revoke all on table public\.institutional_public_programs from public,anon,authenticated/i,
    /revoke all on table public\.institutional_public_opportunities from public,anon,authenticated/i,
    /revoke all on table public\.institutional_track_record from public,anon,authenticated/i,
    /grant select on table public\.institutional_public_organizations,public\.institutional_public_programs,public\.institutional_public_opportunities to anon,authenticated/i,
    /grant select \([\s\S]*public_profile_enabled[\s\S]*\) on table public\.institutional_organizations to anon/i,
    /grant select \([\s\S]*mandate_summary[\s\S]*\) on table public\.institutional_programs to anon/i,
    /grant select \([\s\S]*moral_difference_statement[\s\S]*visibility[\s\S]*\) on table public\.institutional_opportunities to anon/i,
    /institutional_organizations_public_select[\s\S]*for select to anon[\s\S]*status='active' and public_profile_enabled/i,
    /institutional_organizations_member_select[\s\S]*for select to authenticated[\s\S]*is_institutional_organization_member\(id\)/i,
    /institutional_programs_public_select[\s\S]*for select to anon[\s\S]*public_profile_enabled/i,
    /institutional_programs_member_select[\s\S]*for select to authenticated[\s\S]*is_institutional_organization_member\(organization_id\)/i,
    /institutional_opportunities_public_select[\s\S]*for select to anon[\s\S]*visibility='public' and status='published'/i,
    /institutional_opportunities_member_select[\s\S]*for select to authenticated[\s\S]*is_institutional_organization_member\(organization_id\)/i,
    /revoke all on function public\.sign_institutional_deal/i,
    /grant execute on function public\.sign_institutional_deal/i,
  ], "RLS and grants");
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+table\s+[^;]*institutional_track_record[^;]*to\s+(?:anon|authenticated)/i,
    "institutional_track_record must remain server-side without direct client SELECT grants",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+[^;]*(?:all|insert|update|delete|truncate|references|trigger)[^;]*\s+on\s+table\s+[^;]*institutional_(?:public_organizations|public_programs|public_opportunities|track_record)[^;]*\s+to\s+(?:public|anon|authenticated)/i,
    "institutional views must never receive direct client write grants",
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+table\s+public\.institutional_(?:organizations|programs|opportunities)\s+to\s+anon/i,
    "anonymous directory access must remain column-scoped rather than whole-table",
  );
  assert.doesNotMatch(
    migration,
    /create policy institutional_[a-z_]+_public_select[^;]*to anon[^;]*is_institutional_organization_member/i,
    "anonymous public-directory policies must not invoke private membership helpers",
  );
  assert.doesNotMatch(
    migration,
    /p\.deal_id=p\.deal_id|p\.organization_id=p\.organization_id/i,
    "deal-message party scope must never collapse into a tautology",
  );
  const policyStart = migration.indexOf("-- Independent participation is self-managed and opt-in.");
  const policyEnd = migration.indexOf("-- Every foreign-key column sequence receives a covering index.");
  const policySection = migration.slice(policyStart, policyEnd);
  assert.doesNotMatch(
    policySection.replaceAll("(select auth.uid())", ""),
    /auth\.uid\(\)/i,
    "institutional RLS policies must initialize auth.uid once rather than once per row",
  );
});
