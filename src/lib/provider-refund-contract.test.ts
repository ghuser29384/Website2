import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260821140000_direct_donation_upgrade_provider_refunds.sql",
  "utf8",
);
const regression = readFileSync(
  "supabase/tests/direct_donation_upgrade_provider_refunds.sql",
  "utf8",
);
const reviewPacket = readFileSync(
  "docs/provider-review/every-org-donation-upgrade-review-packet.md",
  "utf8",
);
const authorization = readFileSync(
  "src/lib/every-org-partner-webhook-auth.ts",
  "utf8",
);

test("refund accounting is additive and preserves original provider confirmation", () => {
  assert.match(
    migration,
    /create table if not exists public\.direct_donation_upgrade_provider_reversals/,
  );
  assert.match(
    migration,
    /impact_credit_id uuid not null unique[\s\S]*direct_donation_upgrade_impact_credits/,
  );
  assert.match(
    migration,
    /provider_charge_id_hash text not null[\s\S]*provider_refunded_at timestamptz not null/,
  );
  assert.match(
    migration,
    /reversed_verified_gross_amount_cents[\s\S]*reversed_redirected_net_amount_cents/,
  );
  assert.doesNotMatch(
    migration,
    /delete from public\.direct_donation_upgrade_impact_credits|update public\.direct_donation_upgrade_impact_credits/i,
  );
  assert.match(
    migration,
    /direct_donation_upgrade_reversal_immutable[\s\S]*direct_donation_upgrade_prevent_audit_mutation/,
  );
});

test("provider refunds require exact immutable obligation identity and authority", () => {
  assert.match(
    migration,
    /create or replace function public\.record_direct_donation_upgrade_provider_reversal\(/,
  );
  for (const contract of [
    /offer_row\.environment is distinct from p_expected_environment/,
    /obligation_row\.provider_charge_id_hash <> normalized_charge_hash/,
    /obligation_row\.partner_donation_id <>[\s\S]*normalized_partner_donation_id/,
    /obligation_row\.expected_recipient_hash <>[\s\S]*normalized_recipient_hash/,
    /obligation_row\.expected_amount_cents <> p_amount_cents/,
    /obligation_row\.expected_currency <> normalized_currency/,
    /credit_row\.provider_charge_id_hash <> normalized_charge_hash/,
    /credit_row\.recipient_hash <> normalized_recipient_hash/,
  ]) {
    assert.match(migration, contract);
  }
  assert.match(
    migration,
    /evidence_source in \('every_org_dashboard', 'every_org_support'\)/,
  );
  assert.match(
    migration,
    /Refund evidence must come from the Every\.org dashboard or Every\.org support/,
  );
  assert.doesNotMatch(
    migration,
    /participant_screenshot|self[_ -]?report/i,
  );
});

test("exact refund replay is idempotent and altered reports fail closed", () => {
  assert.match(
    migration,
    /report_fingerprint_hash text not null unique/,
  );
  assert.match(
    migration,
    /normalized_evidence_source,[\s\S]*normalized_evidence_reference_hash[\s\S]*sha256/,
  );
  assert.match(
    migration,
    /existing_reversal\.report_fingerprint_hash = fingerprint_hash[\s\S]*'outcome', 'already_recorded'/,
  );
  assert.match(
    migration,
    /mismatch_reason := 'provider_reversal_altered_replay'/,
  );
  assert.match(
    migration,
    /status = 'needs_review'[\s\S]*provider-refund report did not exactly match/,
  );
});

test("completion replay cannot restore a provider-reversed obligation or recreate credit", () => {
  const reversedCheck = migration.indexOf(
    "if obligation_row.provider_reversed_at is not null then",
  );
  const frozenDelegate = migration.indexOf(
    "return public.direct_donation_upgrade_complete_obligation_20260820(",
  );
  assert.ok(reversedCheck >= 0);
  assert.ok(frozenDelegate > reversedCheck);
  assert.match(
    migration,
    /'outcome', 'already_provider_reversed'/,
  );
  assert.match(
    migration,
    /post_refund_completion_replay_mismatch/,
  );
  assert.doesNotMatch(
    migration.slice(reversedCheck, frozenDelegate),
    /insert into public\.direct_donation_upgrade_impact_credits/i,
  );
});

test("completed refunds become explicit post-completion exceptions", () => {
  assert.match(
    migration,
    /'post_completion_exception'/,
  );
  assert.match(
    migration,
    /old\.status = 'completed'[\s\S]*new\.status in \('post_completion_exception', 'needs_review'\)/,
  );
  assert.match(
    migration,
    /offer_was_completed := offer_row\.status = 'completed'/,
  );
  assert.match(
    migration,
    /when offer_was_completed[\s\S]*then 'post_completion_exception'/,
  );
  assert.match(
    migration,
    /historical completion timestamp/,
  );
});

test("public accounting separates historical confirmation from current unreversed credit", () => {
  for (const field of [
    "verified_gross_amount_cents",
    "verified_net_amount_cents",
    "current_unreversed_gross_amount_cents",
    "current_unreversed_net_amount_cents",
    "current_incremental_net_amount_cents",
    "current_redirected_net_amount_cents",
    "provider_reversed_obligation_count",
  ]) {
    assert.match(migration, new RegExp(`as ${field}`));
  }
  assert.match(
    migration,
    /reversed_verified_gross_amount_cents/,
  );
  assert.match(
    migration,
    /left join public\.direct_donation_upgrade_provider_reversals reversal/,
  );
  assert.match(
    reviewPacket,
    /gross confirmed totals distinct from current unreversed\/net credited totals/,
  );
});

test("refund evidence is service-only, append-only, and data-minimized", () => {
  assert.match(
    migration,
    /revoke execute on function[\s\S]*record_direct_donation_upgrade_provider_reversal[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /grant execute on function[\s\S]*record_direct_donation_upgrade_provider_reversal[\s\S]*to service_role/,
  );
  assert.match(
    migration,
    /revoke all on public\.direct_donation_upgrade_provider_reversals[\s\S]*grant select on public\.direct_donation_upgrade_provider_reversals[\s\S]*to service_role/,
  );
  const reversalTable = migration.slice(
    migration.indexOf(
      "create table if not exists public.direct_donation_upgrade_provider_reversals",
    ),
    migration.indexOf(
      "create index if not exists direct_donation_upgrade_reversals_offer_idx",
    ),
  );
  for (const forbidden of [
    /donor_name/i,
    /donor_email/i,
    /raw_payload/i,
    /card_number/i,
    /bank_account/i,
    /payment_credential/i,
  ]) {
    assert.doesNotMatch(reversalTable, forbidden);
  }
  assert.match(
    reviewPacket,
    /must not newly persist donor name, donor email, payment credentials, card or bank data, or a full raw webhook body/,
  );
});

test("rollback-only regression covers exact success, mismatch matrix, replay, and privileges", () => {
  assert.match(regression, /^begin;/m);
  assert.match(regression, /^rollback;$/m);
  for (const marker of [
    "provider_reversal_amount_mismatch",
    "provider_reversal_recipient_mismatch",
    "provider_reversal_environment_mismatch",
    "provider_reversal_charge_mismatch",
    "provider_reversal_donation_id_mismatch",
    "provider_reversal_cross_obligation_charge",
    "participant_screenshot",
    "already_recorded",
    "already_provider_reversed",
    "post_refund_completion_replay_mismatch",
    "current_unreversed_net_amount_cents",
    "direct_donation_upgrade_provider_reversals",
  ]) {
    assert.match(regression, new RegExp(marker));
  }
  assert.doesNotMatch(regression, /where offer_id = offer_id|where obligation_id = obligation_id/);
});

test("Issue #708 Authorization Bearer boundary remains the provider ingress contract", () => {
  assert.match(
    authorization,
    /EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS =[\s\S]*"authorization_bearer_v1"/,
  );
  assert.match(
    authorization,
    /EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_HEADER =[\s\S]*"Authorization"/,
  );
  assert.match(
    authorization,
    /EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_VALUE_PREFIX =[\s\S]*"Bearer "/,
  );
  assert.doesNotMatch(migration, /authorization header|bearer token/i);
});

test("refund foundation creates no managed-money or provider-execution path", () => {
  for (const source of [migration, regression]) {
    assert.doesNotMatch(
      source,
      /stripe|checkout session|paymentintent|setupintent|escrow|custody|transfer|payout/i,
    );
  }
});
