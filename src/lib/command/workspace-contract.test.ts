import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Command persists private conversation and tool payloads with owner-scoped RLS", () => {
  const migration = read("supabase/migrations/20260723110000_universal_command_workspace.sql");
  const persistence = read("src/lib/command/persistence.ts");
  assert.match(migration, /create table if not exists public\.command_sessions/);
  assert.match(migration, /create table if not exists public\.command_messages/);
  assert.match(migration, /create table if not exists public\.command_runs/);
  assert.match(migration, /create table if not exists public\.command_tool_calls/);
  assert.match(migration, /create table if not exists public\.command_audit_events/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /profile_id = \(select auth\.uid\(\)\)/g);
  assert.doesNotMatch(migration, /grant .* to anon/);
  assert.match(migration, /revoke all on public\.command_sessions from anon, authenticated/);
  assert.doesNotMatch(migration, /grant .* to authenticated/);
  assert.match(persistence, /createServiceClient/);
  assert.doesNotMatch(persistence, /createClient\(\)/);
  assert.match(persistence, /encryptBackgroundSensitiveText/);
  assert.match(persistence, /decryptBackgroundSensitiveText/);
  assert.match(persistence, /command_tool_calls\.payload/);
  assert.match(persistence, /entryHash = createHash\("sha256"\)/);
});

test("the live drawer opens the shared persistent workspace instead of a trade-only parser", () => {
  const script = read("public/moral-trade-live-command-center.js");
  const shell = read("public/moral-trade-live.html");
  assert.match(shell, /moral-trade-live-command-center\.js/);
  assert.match(script, /moral-trade\.command\.pending\.v1/);
  assert.match(script, /window\.location\.assign\("\/command\?source=drawer"\)/);
  assert.match(script, /Ask Command to do anything in Moral Trade/);
  assert.match(script, /Send to Command/);
  assert.doesNotMatch(script, /Draft created with editable exact terms/);
});

test("model output cannot directly change state", () => {
  const planner = read("src/lib/command/planner.ts");
  const executor = read("src/lib/command/executor.ts");
  assert.match(planner, /Select only capabilities from the supplied registry/);
  assert.match(planner, /If any material field or tool choice is below 0\.90/);
  assert.match(planner, /store: false/);
  assert.match(executor, /validateCommandCapabilityArguments/);
  assert.match(executor, /executeConfirmedCommandTool/);
  assert.doesNotMatch(planner, /createServiceClient/);
  assert.doesNotMatch(planner, /\.from\(/);
});
