import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260726123000_institutional_trade_system.sql", "utf8");
const data = readFileSync("src/lib/institutional-data.ts", "utf8");
const organizationDealPage = readFileSync("src/app/institutions/[organizationId]/deals/[dealId]/page.tsx", "utf8");
const individualDealPage = readFileSync("src/app/institutions/individual/deals/[dealId]/page.tsx", "utf8");
const dealWorkspace = readFileSync("src/components/institutions/institutional-deal-workspace.tsx", "utf8");
const poolWorkspace = readFileSync("src/components/institutions/institutional-pool-workspace.tsx", "utf8");
const actions = readFileSync("src/app/institutions/actions.ts", "utf8");

function expectAll(source: string, patterns: RegExp[], context: string) {
  for (const pattern of patterns) assert.match(source, pattern, `${context}: ${pattern}`);
}

test("institutional React renders do not compute authorization from an impure clock", () => {
  for (const [name, source] of [
    ["organization deal page", organizationDealPage],
    ["individual deal page", individualDealPage],
    ["deal workspace", dealWorkspace],
    ["pool workspace", poolWorkspace],
  ] as const) {
    assert.doesNotMatch(source, /Date\.now\s*\(/, `${name} must not call Date.now during render`);
    assert.doesNotMatch(source, /Date\.parse\s*\([^)]*valid_(?:from|until)/i, `${name} must not re-evaluate grant time validity`);
  }
  expectAll(organizationDealPage, [
    /const authorization = data\.authorization/,
    /const canManageDeal = authorization\.canManageDeal/,
    /const canApprove = authorization\.canApprove/,
    /const canReserveFunds = authorization\.canReserveFunds/,
    /const canReviewEvidence = authorization\.canReviewEvidence/,
    /database-owned snapshot as of/i,
  ], "organization page snapshot rendering");
});

test("database snapshot uses one PostgreSQL time and filters exact active grants", () => {
  const match = migration.match(/create or replace function public\.get_institutional_deal_authorization_snapshot\([\s\S]*?end \$\$;/i);
  assert.ok(match, "authorization snapshot RPC must exist");
  const body = match[0];
  assert.equal((body.match(/snapshot_as_of timestamptz := now\(\)/gi) ?? []).length, 1, "snapshot must capture PostgreSQL now() once");
  expectAll(body, [
    /profile_id=viewer_profile_id/i,
    /organization_id=target_organization_id/i,
    /program_id is not distinct from party_row\.program_id/i,
    /g\.revoked_at is null/i,
    /g\.valid_from<=snapshot_as_of/i,
    /g\.valid_until is null or g\.valid_until>snapshot_as_of/i,
    /'canManageDeal'/i,
    /'canApprove'/i,
    /'canSign'/i,
    /'canReserveFunds'/i,
    /'canReviewEvidence'/i,
    /'matchingAuthorityGrantIds'/i,
    /'authorityGrantIdsByPermission'/i,
  ], "database-time snapshot");
  expectAll(migration, [
    /revoke all on function public\.get_institutional_deal_authorization_snapshot\(uuid,uuid,uuid\) from public/i,
    /grant execute on function public\.get_institutional_deal_authorization_snapshot\(uuid,uuid,uuid\) to authenticated/i,
  ], "snapshot RPC grants");
});

test("loaders fail closed and return only grants certified by the database snapshot", () => {
  expectAll(data, [
    /export interface InstitutionalDealAuthorizationSnapshot/,
    /normalizeInstitutionalAuthorizationSnapshot/,
    /client\.rpc\("get_institutional_deal_authorization_snapshot"/,
    /target_organization_id: organizationId/,
    /target_party_id: organizationParty\.id/,
    /eq\("profile_id", viewerProfileId\)/,
    /matchingAuthorityGrantIds = new Set\(authorization\.matchingAuthorityGrantIds\)/,
    /authorityGrants: rows\(authorityGrantsResult\.data\)\.filter\(\(grant\) => matchingAuthorityGrantIds\.has\(grant\.id\)\)/,
  ], "organization loader");
  expectAll(data, [
    /target_organization_id: null/,
    /actingCapacity: "individual"/,
    /authorityGrants: \[\]/,
    /canManage: authorization\.canManageDeal/,
  ], "personal loader");
});

test("expired and future grants cannot enable controls and personal capacity cannot inherit organization authority", () => {
  expectAll(migration, [
    /g\.valid_from<=snapshot_as_of/i,
    /g\.valid_until is null or g\.valid_until>snapshot_as_of/i,
    /'actingCapacity','individual'[\s\S]*'canApprove',false[\s\S]*'canReserveFunds',false/i,
    /'matchingAuthorityGrantIds',to_jsonb\('\{\}'::uuid\[\]\)/i,
    /Personal verifier review cannot inherit organization authority/i,
  ], "capacity separation");
  expectAll(individualDealPage, [
    /canReviewEvidence=\{data\.authorization\.canReviewEvidence\}/,
    /canManage=\{data\.canManage\}/,
  ], "personal interface snapshot");
  expectAll(dealWorkspace, [
    /canReviewEvidence: boolean/,
    /canReviewEvidence \? <form action=\{runInstitutionalAction\}/,
  ], "separate evidence review capability");
  expectAll(poolWorkspace, [
    /canReserveFunds: boolean/,
    /canReserveFunds \? <InstitutionalDisclosure title="Reserve financial capacity"/,
    /No active exact-scope finance:reserve authority/i,
  ], "separate financial authority");
});

test("rendered permissions remain advisory and every mutation retains independent server authorization", () => {
  expectAll(actions, [
    /requireDealManagementActingContext/,
    /case "decide_approval"[\s\S]*decide_institutional_approval/i,
    /case "reserve_budget"[\s\S]*reserve_institutional_budget/i,
    /case "review_evidence"[\s\S]*review_institutional_evidence/i,
  ], "server-action authorization");
  expectAll(migration, [
    /create or replace function public\.has_institutional_permission/i,
    /create or replace function public\.can_manage_institutional_deal/i,
    /perform public\.assert_institutional_aal2\(\)/i,
    /Exact-scope evidence-review authority is required/i,
    /Exact-scope finance authority is required/i,
  ], "database authorization remains final");
});
