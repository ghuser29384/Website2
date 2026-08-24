import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const actionSource = read("src/app/admin/donation-upgrades/actions.ts");
const adminSource = read("src/app/admin/donation-upgrades/page.tsx");
const detailLayoutSource = read(
  "src/app/donation-upgrades/[offerId]/layout.tsx",
);

function assertIncludesAll(source: string, fragments: string[]) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `missing source contract: ${fragment}`);
  }
}

test("provider-refund action is AAL2/admin gated and derives exact immutable provider fields", () => {
  assertIncludesAll(actionSource, [
    '"use server"',
    "isAdminEmail",
    "evaluateAdminOperatorAccess",
    "loadBackgroundAccountSecuritySummary",
    "viewer.profile.id",
    '.from("direct_donation_upgrade_obligations")',
    'obligation.status !== "verified"',
    "provider_charge_id_hash",
    "partner_donation_id",
    "expected_recipient_hash",
    "provider_gross_amount_cents",
    "provider_currency",
    '"record_direct_donation_upgrade_provider_reversal"',
    "p_expected_environment: obligation.environment",
    "p_provider_charge_id_hash: chargeHash",
    "p_partner_donation_id: partnerDonationId",
    "p_recipient_hash: recipientHash",
    "p_amount_cents: providerAmountCents",
    "p_currency: providerCurrency",
  ]);

  assert.ok(
    actionSource.indexOf("evaluateAdminOperatorAccess") <
      actionSource.indexOf('.from("direct_donation_upgrade_obligations")'),
    "AAL2/admin authorization must precede provider-record lookup",
  );
  assert.ok(
    actionSource.indexOf('.from("direct_donation_upgrade_obligations")') <
      actionSource.indexOf(
        '"record_direct_donation_upgrade_provider_reversal"',
      ),
    "immutable obligation lookup must precede reversal RPC",
  );
});

test("operator action stores only a hash of a bounded authoritative reference", () => {
  assertIncludesAll(actionSource, [
    "ALLOWED_EVIDENCE_SOURCES",
    '"every_org_dashboard"',
    '"every_org_support"',
    'read(formData, "authority_confirmation") !== "yes"',
    "evidenceReference.length < 8",
    "evidenceReference.length > 500",
    'createHash("sha256")',
    "p_evidence_reference_hash: sha256Text(evidenceReference)",
  ]);
  assert.ok(
    !actionSource.includes("p_evidence_reference: evidenceReference"),
    "raw evidence references must not be passed to persistence",
  );
  assert.ok(!actionSource.includes("console.log"));
  assert.ok(!actionSource.includes("console.error"));
});

test("operator UI distinguishes provider recording from refund execution and excludes donor PII fields", () => {
  assertIncludesAll(adminSource, [
    "This console does not prove a donation from a browser return and does not execute refunds.",
    "Record an authoritative full Every.org refund without rewriting history.",
    "This AAL2-gated action records a provider fact.",
    "Moral Trade recorded this provider evidence; Moral Trade did not process or issue the refund.",
    'name="authority_confirmation"',
    'value="yes"',
    'name="evidence_source"',
    'value="every_org_dashboard"',
    'value="every_org_support"',
    'name="evidence_reference"',
    "do not enter donor names, donor email, payment data, or a raw webhook body",
  ]);
  for (const forbiddenField of [
    'name="donor_name"',
    'name="donor_email"',
    'name="card_number"',
    'name="bank_account"',
    'name="raw_webhook_body"',
  ]) {
    assert.ok(!adminSource.includes(forbiddenField));
  }
});

test("participant-safe detail distinguishes historical confirmation from current unreversed credit", () => {
  assertIncludesAll(detailLayoutSource, [
    "Every.org confirmation is not irreversible finality",
    "Provider refund recorded",
    "Rare fraud-related refunds can later occur.",
    "Moral Trade does not receive, hold, process, issue, or refund the charitable payment.",
    "A provider refund is distinct from participant default, failed donation, cancellation, and Moral Trade action.",
    "post-completion exception state",
    "current_unreversed_gross_amount_cents",
    "current_unreversed_net_amount_cents",
    "current_incremental_net_amount_cents",
    "current_redirected_net_amount_cents",
    "Historical provider-confirmed gross",
    "Current unreversed net credit",
    "does not retroactively establish what the participant otherwise would have done",
  ]);
});

test("runtime refund tranche makes no partnership claim and creates no money-moving provider path", () => {
  const runtimeSource = `${actionSource}\n${adminSource}\n${detailLayoutSource}`;
  for (const forbiddenClaim of [
    "partnered with Every.org",
    "in partnership with Every.org",
    "sponsored by Every.org",
    "endorsed by Every.org",
    "co-branded with Every.org",
  ]) {
    assert.ok(!runtimeSource.includes(forbiddenClaim));
  }
  for (const forbiddenPrimitive of [
    "stripe.checkout",
    "paymentIntents.create",
    "refunds.create",
    "transfers.create",
    "payouts.create",
    "createCheckoutSession",
    "EVERY_ORG_REFUND_API",
  ]) {
    assert.ok(!runtimeSource.includes(forbiddenPrimitive));
  }
});
