import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814034559_profile_priority_resource_allocations.sql",
  "utf8",
);
const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
const priorityPage = readFileSync("src/app/profile/priorities/page.tsx", "utf8");
const priorityAction = readFileSync("src/app/profile/priorities/actions.ts", "utf8");
const priorityDomain = readFileSync("src/lib/profile-priorities.ts", "utf8");
const priorityEditor = readFileSync(
  "src/components/profile/profile-priority-editor.tsx",
  "utf8",
);

test("resource allocations are additive owner-private rows and missing rows mean inheritance", () => {
  assert.match(migration, /create table if not exists public\.profile_priority_resource_allocations/);
  assert.match(
    migration,
    /resource_type in \('money', 'ordinary_action', 'skilled_work', 'career'\)/,
  );
  assert.match(migration, /primary key \(profile_id, resource_type\)/);
  assert.match(migration, /missing resource row means the resource inherits/i);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\).*profile_id/);
  assert.match(migration, /for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = profile_id\)/);
  assert.match(migration, /for update[\s\S]*using \(\(select auth\.uid\(\)\) = profile_id\)[\s\S]*with check/);
  assert.match(migration, /for delete[\s\S]*using \(\(select auth\.uid\(\)\) = profile_id\)/);
  assert.match(migration, /revoke all on table public\.profile_priority_resource_allocations from public, anon/);
  assert.doesNotMatch(migration, /to anon\s*;/);
});

test("one authenticated RPC atomically replaces general and explicit resource allocation state", () => {
  const rpcStart = migration.indexOf(
    "create or replace function public.replace_profile_priority_allocations_v1",
  );
  const rpcEnd = migration.indexOf("revoke all on function", rpcStart);
  const rpc = migration.slice(rpcStart, rpcEnd);

  assert.notEqual(rpcStart, -1);
  assert.match(rpc, /security invoker/);
  assert.match(rpc, /actor_id uuid := auth\.uid\(\)/);
  assert.doesNotMatch(rpc, /p_(profile|actor|user)_id/);
  assert.match(rpc, /profile_priority_allocation_is_valid\(p_general_allocation\)/);
  assert.match(rpc, /on conflict \(profile_id\) do update/);
  assert.match(rpc, /delete from public\.profile_priority_resource_allocations/);
  assert.match(rpc, /on conflict \(profile_id, resource_type\) do update/);
  assert.match(migration, /grant execute on function public\.replace_profile_priority_allocations_v1[\s\S]*to authenticated, service_role/);
  assert.match(priorityAction, /normalizeProfilePriorityResourceAllocations/);
  assert.match(priorityAction, /\.rpc\(\s*"replace_profile_priority_allocations_v1"/);
  assert.doesNotMatch(priorityAction, /\.from\("profile_priority_resource_allocations"\)/);
  assert.doesNotMatch(priorityAction, /createServiceClient|SERVICE_ROLE/i);
});

test("private UI loads one editor at a time without changing live ranking semantics", () => {
  assert.match(priorityPage, /if \(!viewer\)[\s\S]*redirect\(`\/login/);
  assert.match(priorityPage, /from\("profile_priority_resource_allocations"\)/);
  assert.match(priorityEditor, /General/);
  assert.match(priorityEditor, /PROFILE_PRIORITY_RESOURCE_OPTIONS/);
  assert.match(priorityDomain, /label: "Money"/);
  assert.match(priorityDomain, /label: "Ordinary actions"/);
  assert.match(priorityDomain, /label: "Skilled work"/);
  assert.match(priorityDomain, /label: "Career effort"/);
  assert.match(priorityEditor, /Customize/);
  assert.match(priorityEditor, /Use general allocation again/);
  assert.match(priorityEditor, /Current live ranking continues to use the general vector/);
  assert.doesNotMatch(priorityEditor, /cardinal moral utility|authorization to act/i);
});

test("generated database types include the owner-private table and atomic RPC", () => {
  assert.match(databaseTypes, /profile_priority_resource_allocations: \{/);
  assert.match(databaseTypes, /resource_type: "money" \| "ordinary_action" \| "skilled_work" \| "career"/);
  assert.match(databaseTypes, /replace_profile_priority_allocations_v1: \{/);
  assert.match(databaseTypes, /p_resource_overrides: Json/);
});
