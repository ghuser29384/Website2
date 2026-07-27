import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260726171000_collective_identity_threshold_commitments.sql";
const manifestAliasRepairPath =
  "supabase/migrations/20260727030000_fix_collective_manifest_jsonb_alias.sql";
const manifestMaterializedRowsRepairPath =
  "supabase/migrations/20260727043000_fix_collective_manifest_materialized_rows.sql";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("pre-threshold signature storage excludes plaintext identity columns", async () => {
  const migration = await source(migrationPath);
  const tableBody = migration.match(
    /create table if not exists public\.collective_commitment_private_signatures \(([\s\S]*?)\n\);/,
  )?.[1];
  assert.ok(tableBody);
  assert.doesNotMatch(tableBody, /profile_id|credential_id|verified_real_name|verified_affiliation/);
  assert.match(tableBody, /account_token text not null/);
  assert.match(tableBody, /human_token text not null/);
  assert.match(tableBody, /encrypted_identity_payload text not null/);
});

test("database activation enforces an exact MAC-backed manifest before publication", async () => {
  const migration = await source(migrationPath);
  assert.match(migration, /collective_commitment_manifest_count_mismatch/);
  assert.match(migration, /collective_commitment_manifest_duplicate_signature/);
  assert.match(migration, /collective_commitment_manifest_exactness_or_mac_failed/);
  assert.match(migration, /extensions\.hmac/);
  assert.match(migration, /delete from public\.collective_commitment_private_signatures/);
  assert.match(migration, /delete from public\.collective_commitment_keys/);
  assert.match(migration, /set status = 'active'/);
});

test("forward manifest repair keeps JSONB entries scalar through full joins", async () => {
  const repair = await source(manifestAliasRepairPath);
  assert.match(repair, /jsonb_array_elements\(p_manifest\) as manifest\(entry\)/);
  assert.doesNotMatch(repair, /jsonb_array_elements\(p_manifest\) entry/);
  assert.match(repair, /entry->>'revealNonce'/);
  assert.match(repair, /collective_commitment_manifest_exactness_or_mac_failed/);
  assert.match(repair, /grant execute on function public\.activate_collective_commitment_v1/);
});

test("final manifest repair materializes typed JSONB rows and prefilters signatures", async () => {
  const repair = await source(manifestMaterializedRowsRepairPath);
  assert.match(repair, /with manifest_rows as materialized/);
  assert.match(repair, /select jsonb_array_elements\(p_manifest\) as manifest_entry/);
  assert.match(repair, /with signature_rows as materialized/);
  assert.match(repair, /where commitment_id = p_commitment_id/);
  assert.match(repair, /full join manifest_rows manifest/);
  assert.match(repair, /manifest\.manifest_entry->>'revealNonce'/);
  assert.doesNotMatch(repair, /full join jsonb_array_elements\(p_manifest\)/);
  assert.match(repair, /collective_commitment_manifest_exactness_or_mac_failed/);
  assert.match(repair, /grant execute on function public\.activate_collective_commitment_v1/);
});

test("sensitive tables and mutation RPCs are service-role only", async () => {
  const migration = await source(migrationPath);
  for (const table of [
    "collective_identity_credentials",
    "collective_commitments",
    "collective_commitment_keys",
    "collective_commitment_private_signatures",
    "collective_commitment_events",
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`),
    );
  }
  for (const fn of [
    "create_collective_commitment_v1",
    "add_collective_commitment_signature_v1",
    "withdraw_collective_commitment_signature_v1",
    "activate_collective_commitment_v1",
    "release_collective_commitment_activation_v1",
    "expire_collective_commitments_v1",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
  }
});

test("server signing revalidates credentials at signature and activation time", async () => {
  const service = await source("src/lib/collective-commitments/service.ts");
  assert.match(service, /credentialIsCurrent\(credential\)/);
  assert.match(service, /credential\.credential_version === payload\.credentialVersion/);
  assert.match(service, /credential\.verified_at === payload\.credentialVerifiedAt/);
  assert.match(service, /credential\.expires_at === payload\.credentialExpiresAt/);
  assert.match(service, /release_collective_commitment_activation_v1/);
  assert.match(service, /No identities were published/);
});

test("rendered flow requires publication and high-risk acknowledgments", async () => {
  const [form, controls, actions] = await Promise.all([
    source("src/components/collective-commitments/collective-commitment-form.tsx"),
    source("src/components/collective-commitments/collective-signature-controls.tsx"),
    source("src/app/collective-commitments/actions.ts"),
  ]);
  assert.match(form, /publication_acknowledgment/);
  assert.match(form, /high_risk_acknowledgment/);
  assert.match(controls, /identity_publication_acknowledgment/);
  assert.match(controls, /publish_affiliation/);
  assert.match(actions, /Accept the high-risk proposition acknowledgment/);
  assert.match(actions, /verified real name will be public/);
});

test("expiry route is cron-authorized and never claims publication", async () => {
  const route = await source("src/app/api/jobs/collective-commitments-expire/route.ts");
  assert.match(route, /isCronRequestAuthorized/);
  assert.match(route, /expireDueCollectiveCommitments/);
  assert.match(route, /identitiesPublished: false/);
});
