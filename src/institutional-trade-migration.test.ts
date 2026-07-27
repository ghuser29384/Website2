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
    /create table public\.institutional_legal_entities/i,
    /create table public\.institutional_programs/i,
    /create table public\.institutional_memberships/i,
    /create table public\.institutional_authority_grants/i,
    /create table public\.institutional_deal_parties/i,
    /foreign key\(program_id,organization_id\) references public\.institutional_programs\(id,organization_id\)/i,
  ], "identity and authority model");
});

test("baselines and approvals are exact organization/program scoped", () => {
  expectAll([
    /institutional_validate_exact_scope/i,
    /Baseline organization\/program scope must exactly match the deal party/i,
    /Approval organization\/program scope must exactly match a deal party/i,
    /Approval authority grant must exactly match organization, program, and decision maker/i,
    /create trigger institutional_baseline_exact_scope/i,
    /create trigger institutional_approval_exact_scope/i,
    /decide_institutional_approval[\s\S]*Exact-scope approval authority is required/i,
  ], "exact-scope guards");
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
    /institutional_prevent_dependency_cycle/i,
    /institutional_dispute_events_select[\s\S]*d\.id=dispute_id[\s\S]*can_read_institutional_deal\(d\.deal_id\)/i,
  ], "relationship guards");
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
    /Financial reservation cannot substitute for independent pool participation approval/i,
    /Pool contribution reservation must belong to the exact organization\/program/i,
    /Pool vote requires valid exact-scope pool approval authority/i,
    /Required anchor commitments are incomplete/i,
    /Required underwriting commitments are incomplete/i,
    /Reservation idempotency key was already used with different exact terms or authority/i,
    /Exact-scope finance authority is required for this contribution state/i,
  ], "pool gates");
});

test("integration configuration rejects embedded secrets and webhooks use an event allowlist", () => {
  expectAll([
    /institutional_json_contains_secret/i,
    /institutional_validate_integration_configuration/i,
    /Integration configuration must not embed secrets; use a credential reference/i,
    /institutional_supported_webhook_events/i,
    /deal\.signed/i,
    /pool\.activated/i,
    /Unsupported institutional webhook event/i,
    /secret_reference text not null/i,
  ], "integration security");
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
    /revoke all on function public\.sign_institutional_deal/i,
    /grant execute on function public\.sign_institutional_deal/i,
  ], "RLS and grants");
});
