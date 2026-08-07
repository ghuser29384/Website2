import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const core = readFileSync("src/lib/direct-donation-upgrade.ts", "utf8");
const actions = readFileSync("src/app/direct-donation-upgrade-actions.ts", "utf8");
const createPage = readFileSync("src/app/trades/new/conditional-donation.tsx", "utf8");
const webhookRoute = readFileSync("src/app/api/connectors/every-org/[secret]/route.ts", "utf8");
const lifecycleRoute = readFileSync("src/app/api/jobs/donation-upgrades/route.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260801050000_direct_verified_donation_upgrades.sql",
  "utf8",
);
const vercelConfig = readFileSync("scripts/vercel-project-config.mjs", "utf8");
const renderedQaWorkflow = readFileSync(
  ".github/workflows/direct-donation-upgrade-rendered-qa.yml",
  "utf8",
);

test("rendered QA can inspect the commitment form without loading service-role data", () => {
  assert.match(
    createPage,
    /DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE/,
  );
  assert.match(createPage, /config\.environment && !renderedQaNoServiceData/);
  assert.match(
    renderedQaWorkflow,
    /DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE: "true"/,
  );
  assert.doesNotMatch(renderedQaWorkflow, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
});

test("the direct Donation Upgrade rail never imports or invokes Stripe", () => {
  for (const source of [core, actions, createPage, lifecycleRoute]) {
    assert.doesNotMatch(source, /@\/lib\/stripe|stripe\.checkout|payment_intent|setup_intent/i);
  }
  assert.match(createPage, /Commit and publish/);
  assert.doesNotMatch(createPage, /Authorize and publish/);
});

test("publication freezes baseline, environment, both recipient identities, and the terms hash", () => {
  assert.match(actions, /fetchEveryOrgNonprofitIdentity/);
  assert.match(actions, /sameEveryOrgNonprofit/);
  assert.match(actions, /p_baseline_attestation: attestation/);
  assert.match(core, /baselineAttestationHash/);
  assert.match(migration, /original_recipient_hash text not null/);
  assert.match(migration, /upgraded_recipient_hash text not null/);
  assert.match(migration, /check \(original_recipient_hash <> upgraded_recipient_hash\)/);
});


test("published offers, candidates, and obligations have database-level immutable identity guards", () => {
  assert.match(migration, /create or replace function public\.direct_donation_upgrade_guard_offer_terms\(\)/);
  assert.match(migration, /create trigger direct_donation_upgrade_offer_terms_immutable/);
  assert.match(migration, /Published Donation Upgrade terms and baseline are immutable/);
  assert.match(migration, /create or replace function public\.direct_donation_upgrade_guard_candidate_identity\(\)/);
  assert.match(migration, /Donation Upgrade matcher identity and commitment are immutable/);
  assert.match(migration, /create or replace function public\.direct_donation_upgrade_guard_obligation_terms\(\)/);
  assert.match(migration, /Direct Donation Upgrade obligation terms are immutable/);
});

test("webhook verification is the only completion authority and exact replays are idempotent", () => {
  assert.match(webhookRoute, /handleDirectDonationUpgradeEveryOrgWebhook/);
  assert.match(webhookRoute, /directResult\.handled/);
  assert.match(migration, /complete_direct_donation_upgrade_obligation/);
  assert.match(migration, /outcome', 'already_verified'/);
  assert.match(migration, /altered_replay/);
  assert.match(createPage, /Browser returns, screenshots, and self-attestation do not complete/);
});


test("provider charge allocation is serialized before the unique-charge reuse check", () => {
  assert.match(migration, /pg_advisory_xact_lock\([\s\S]*hashtextextended\(lower\(p_provider_charge_id_hash\), 0\)/);
  assert.match(migration, /where provider_charge_id_hash = lower\(p_provider_charge_id_hash\)/);
  assert.match(migration, /Valid provider charge and payload hashes are required/);
});

test("the matcher-first lifecycle edge preserves a fulfilled matcher when the creator defaults", () => {
  assert.match(
    migration,
    /where id = offer_row\.winning_candidate_id\s+and status in \('primary', 'promoted', 'fulfilled'\)/,
  );
  assert.match(migration, /A matcher who already donated remains fulfilled even though the creator defaulted/);
  assert.match(
    migration,
    /if matcher_obligation\.status = 'verified' then\s+update public\.direct_donation_upgrade_candidates\s+set status = 'fulfilled'/,
  );
  assert.match(migration, /set status = 'defaulted', defaulted_at = p_now,\s+failure_code = 'creator_matched_default'/);
});

test("backup promotion, reminders, defaults, and temporary restrictions are explicit", () => {
  assert.match(migration, /status = 'backup'/);
  assert.match(migration, /set status = 'promoted', promoted_at = p_now/);
  assert.match(migration, /reminder_72h_sent_at/);
  assert.match(migration, /reminder_24h_sent_at/);
  assert.match(migration, /direct_donation_upgrade_default/);
  assert.match(migration, /timezone\('utc', now\(\)\) \+ interval '7 days'/);
  assert.match(vercelConfig, /\/api\/jobs\/donation-upgrades/);
});

test("public privacy reveals identities only when public or completed", () => {
  assert.match(migration, /offer\.privacy_mode = 'public' or offer\.status = 'completed'/);
  assert.match(migration, /else null\s+end as creator_display_name/);
  assert.match(migration, /else null\s+end as matcher_display_name/);
});

test("impact accounting separates gross, net, incremental, and redirected amounts", () => {
  assert.match(migration, /verified_gross_amount_cents/);
  assert.match(migration, /verified_net_amount_cents/);
  assert.match(migration, /incremental_net_amount_cents/);
  assert.match(migration, /redirected_net_amount_cents/);
  assert.match(createPage, /The creator’s original amount is not\s+counted as incremental/);
});

test("all mutating RPCs are revoked from users and granted only to service_role", () => {
  const publicRpcNames = [
    "create_direct_donation_upgrade_offer",
    "join_direct_donation_upgrade_offer",
    "withdraw_direct_donation_upgrade_backup",
    "cancel_direct_donation_upgrade_offer",
    "start_direct_donation_upgrade_checkout",
    "complete_direct_donation_upgrade_obligation",
    "run_direct_donation_upgrade_lifecycle",
  ];
  for (const name of publicRpcNames) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${name}\\(`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role;`));
  }
  assert.match(migration, /revoke all on public\.direct_donation_upgrade_obligations from anon, authenticated/);
});
