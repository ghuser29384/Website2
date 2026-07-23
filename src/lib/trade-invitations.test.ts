import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createTradeInvitationToken,
  decryptTradeInvitationToken,
  encryptTradeInvitationToken,
  hashTradeInvitationToken,
  isTradeInvitationBearerPath,
  isTradeInvitationUsable,
} from "./trade-invitations";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("invitation secrets are random URL-safe values with one-way lookup hashes", () => {
  const first = createTradeInvitationToken();
  const second = createTradeInvitationToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.match(second, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.match(hashTradeInvitationToken(first), /^[0-9a-f]{64}$/);
  assert.notEqual(hashTradeInvitationToken(first), hashTradeInvitationToken(second));
});

test("sender token recovery is encrypted and invitation-bound", () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-invitation-encryption-key";
  try {
    const token = createTradeInvitationToken();
    const invitationId = "33333333-3333-4333-8333-333333333333";
    const ciphertext = encryptTradeInvitationToken(token, invitationId);

    assert.ok(ciphertext.startsWith("bgenc:v2:"));
    assert.ok(!ciphertext.includes(token));
    assert.equal(decryptTradeInvitationToken(ciphertext, invitationId), token);
    assert.equal(
      decryptTradeInvitationToken(ciphertext, "44444444-4444-4444-8444-444444444444"),
      "",
    );
  } finally {
    if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  }
});

test("invitation route and lifecycle helpers recognize only bearer and open states", () => {
  assert.equal(isTradeInvitationBearerPath("/invitations/secret"), true);
  assert.equal(isTradeInvitationBearerPath("/invitations"), false);
  assert.equal(isTradeInvitationBearerPath("/invite"), false);
  assert.equal(isTradeInvitationUsable("drafted"), true);
  assert.equal(isTradeInvitationUsable("opened"), true);
  assert.equal(isTradeInvitationUsable("accepted"), false);
  assert.equal(isTradeInvitationUsable("revoked"), false);
});

test("database migration enforces recipient, term, block, lease, and grant boundaries", () => {
  const migration = source(
    "supabase/migrations/20260722223000_harden_trade_invitations.sql",
  );

  assert.match(migration, /token_hash text/);
  assert.match(migration, /token_ciphertext text/);
  assert.match(migration, /trade_invitations_token_must_be_null/);
  assert.match(migration, /email_confirmed_at is not null/);
  assert.match(migration, /terms_version <> offer_row\.terms_version/);
  assert.match(migration, /pair_is_blocked/);
  assert.match(migration, /for update skip locked/i);
  assert.match(migration, /attempt_count < 5/);
  assert.match(migration, /trade-invitation:' \|\| p_invitation_id/);
  assert.match(migration, /revoke all on public\.trade_invitations from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.respond_trade_invitation_v2/);
  assert.match(migration, /p_agreement_version_id/);

  const claimFunction = migration.slice(
    migration.indexOf("create or replace function public.claim_email_outbox_v2"),
    migration.indexOf("create or replace function public.complete_email_outbox_v2"),
  );
  const validSourceBranch = claimFunction.indexOf(
    "invitation_id_value := candidate.source_id::uuid",
  );
  const invitationAdvisoryLock = claimFunction.indexOf(
    "pg_catalog.pg_try_advisory_xact_lock",
    validSourceBranch,
  );
  const invitationRowLock = claimFunction.indexOf(
    "select * into invitation_row",
    invitationAdvisoryLock,
  );
  const outboxRowLock = claimFunction.indexOf(
    "select * into locked_email",
    invitationRowLock,
  );
  assert.ok(validSourceBranch >= 0);
  assert.ok(invitationAdvisoryLock > validSourceBranch);
  assert.ok(invitationRowLock > invitationAdvisoryLock);
  assert.ok(outboxRowLock > invitationRowLock);
});

test("application routes use transactional RPCs and never query plaintext bearer tokens", () => {
  const actions = source("src/app/core-trade-actions-base.ts");
  const loader = source("src/lib/core-trade-base.ts");
  const agreementStage = source(
    "src/components/core-trade/trade-agreement-stage-base.tsx",
  );

  assert.doesNotMatch(actions, /\.eq\("token"/);
  assert.doesNotMatch(loader, /\.eq\("token"/);
  assert.match(actions, /create_trade_invitation_v2/);
  assert.match(actions, /respond_trade_invitation_v2/);
  assert.match(actions, /decide_counterproposal_v2/);
  assert.match(actions, /confirm_agreement_version_v2/);
  assert.match(agreementStage, /name="agreement_version_id"/);
});

test("donation-backed confirmation is exact-version and transactional", () => {
  const actions = source("src/app/trade-donation-actions-base.ts");
  const agreementStage = source(
    "src/components/core-trade/trade-donation-agreement-stage.tsx",
  );
  const migration = source(
    "supabase/migrations/20260723060000_harden_trade_donation_confirmation.sql",
  );

  assert.match(actions, /confirm_trade_donation_version_v2/);
  assert.match(actions, /p_agreement_version_id: agreementVersionId/);
  assert.doesNotMatch(actions, /\.from\("trade_agreement_confirmations"\)/);
  assert.match(agreementStage, /name="agreement_version_id"/);
  assert.match(migration, /moral_trade_private\.lock_pair/);
  assert.match(migration, /agreement_row\.current_version_id <> p_agreement_version_id/);
  assert.match(migration, /lifecycle_status = 'awaiting_donation'/);
});

test("bearer routes are no-store, no-referrer, and excluded from analytics", () => {
  const config = source("next.config.ts");
  const tracker = source("src/components/analytics/funnel-tracker.tsx");

  assert.match(config, /source: "\/invitations\/:path\*"/);
  assert.match(config, /value: "no-referrer"/);
  assert.match(config, /value: "private, no-store, max-age=0"/);
  assert.match(tracker, /\^\\\/invitations\\\/\[\^\/\]\+/);
  assert.match(tracker, /Invitation URLs contain bearer secrets/);
});

test("email delivery uses a lease and stable provider idempotency", () => {
  const route = source("src/app/api/jobs/email/route.ts");
  const email = source("src/lib/email.ts");

  assert.match(route, /claim_email_outbox_v2/);
  assert.match(route, /complete_email_outbox_v2/);
  assert.match(route, /retry_email_outbox_v2/);
  assert.match(route, /suppress_email_outbox_v2/);
  assert.match(route, /idempotencyKey: email\.idempotency_key/);
  assert.match(email, /"Idempotency-Key"/);
});
