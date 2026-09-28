import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type Stripe from "stripe";
import { createAccountPaymentService, type AccountPaymentRecord, type AccountPaymentRepository } from "./account-payment-service";
import { accountPaymentMode, PAYMENT_METHOD_CONSENT_VERSION, safeStripeDestination, paymentReturnOrigin, maskPaymentMethod, payoutStatus } from "./account-payment-policy";

const A = { id: "11111111-1111-4111-8111-111111111111", email: "a@example.invalid", name: "Test user" };
const B = { id: "22222222-2222-4222-8222-222222222222" };
const REQUEST = "33333333-3333-4333-8333-333333333333";
const now = Date.parse("2026-09-28T18:00:00Z");
function harness(live = false) {
  let row: AccountPaymentRecord | null = null;
  const calls: Array<{ action: string; value?: unknown; options?: unknown }> = [];
  const metadata = { purpose: "account_payment_method", profile_id: A.id, platform_account_id: "acct_platform" };
  const customer = { id: "cus_owner", livemode: live, metadata };
  const method = { id: "pm_owner", livemode: live, customer: "cus_owner", type: "card", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 } };
  const account = { id: "acct_owner", country: "US", type: "express", metadata: { profile_id: A.id }, charges_enabled: false, payouts_enabled: false, details_submitted: false, capabilities: { transfers: "inactive" }, requirements: {} };
  const session = { id: "cs_test_owner", mode: "setup", livemode: live, customer: customer.id, client_reference_id: A.id, status: "complete", setup_intent: "seti_owner", payment_intent: null, metadata: { ...metadata, consent_version: PAYMENT_METHOD_CONSENT_VERSION, consent_request_id: REQUEST }, url: "https://checkout.stripe.com/c/pay/test" };
  const setup = { id: "seti_owner", livemode: live, customer: customer.id, payment_method: method.id, status: "succeeded", metadata: session.metadata };
  const repository: AccountPaymentRepository = {
    async read() { return row; },
    async reserve(id) { row ??= { id: REQUEST, profile_id: id, platform_account_id: "acct_platform", livemode: live, stripe_customer_id: null, customer_started_at: null, stripe_account_id: null, account_started_at: null, account_country: null }; return row; },
    async begin(id, kind, country) { await repository.reserve(id); if (kind === "customer") row!.customer_started_at ??= new Date(now).toISOString(); else { row!.account_started_at ??= new Date(now).toISOString(); row!.account_country ??= country!; } return row!; },
    async save(id, kind, providerId) { assert.equal(id, A.id); row![kind === "customer" ? "stripe_customer_id" : "stripe_account_id"] = providerId; },
    async legacyPayout() { calls.push({ action: "legacyPayout" }); return live ? account.id : null; },
    async syncPayout(id, data) { calls.push({ action: "syncPayout", value: { id, data } }); },
  };
  const stripe = {
    customers: { retrieve: async () => customer, create: async (value: unknown, options: unknown) => { calls.push({ action: "customer.create", value, options }); return customer; } },
    paymentMethods: { list: async () => ({ data: row?.stripe_customer_id ? [method] : [], has_more: false }), retrieve: async () => method, detach: async (id: string) => { calls.push({ action: "detach", value: id }); } },
    checkout: { sessions: { create: async (value: unknown, options: unknown) => { calls.push({ action: "checkout.create", value, options }); return session; }, retrieve: async () => session } },
    setupIntents: { retrieve: async () => setup },
    accounts: {
      retrieve: async () => account,
      create: async (value: unknown, options: unknown) => { calls.push({ action: "account.create", value, options }); return account; },
      listExternalAccounts: async () => ({ data: [{ object: "bank_account", bank_name: "Test bank", last4: "6789", currency: "usd", routing_number: "DO-NOT-EXPOSE", account_holder_name: "DO-NOT-EXPOSE" }], has_more: false }),
      createLoginLink: async (id: string) => { calls.push({ action: "login", value: id }); return { url: "https://connect.stripe.com/express/test" }; },
    },
    accountLinks: { create: async (value: unknown) => { calls.push({ action: "onboarding", value }); return { url: "https://connect.stripe.com/setup/test" }; } },
    balance: { retrieve: async () => ({ livemode: live }) },
    countrySpecs: { retrieve: async (country: string) => { assert.equal(country, "US"); return {}; } },
  };
  const service = createAccountPaymentService({ stripe: stripe as unknown as Stripe, repository, platformId: "acct_platform", livemode: live, origin: live ? "https://www.moraltrade.org" : "http://127.0.0.1:3210", now: () => now });
  return { service, calls, customer, method, session, setup, account, repository, stripe, async saved() { await repository.reserve(A.id); row!.stripe_customer_id = customer.id; return row!; } };
}

test("mode separation denies unknown credentials, production test keys, and preview live keys", () => {
  for (const env of [{}, { STRIPE_SECRET_KEY: "secret" }, { STRIPE_SECRET_KEY: "sk_test_x", VERCEL_ENV: "production" }, { STRIPE_SECRET_KEY: "sk_live_x", VERCEL_ENV: "preview" }]) assert.throws(() => accountPaymentMode(env));
  assert.equal(accountPaymentMode({ STRIPE_SECRET_KEY: "sk_test_x", VERCEL_ENV: "preview" }), false);
  assert.equal(accountPaymentMode({ STRIPE_SECRET_KEY: "sk_live_x", VERCEL_ENV: "production" }), true);
});

test("read-only empty overview never creates customers or payout accounts", async () => {
  const h = harness(); assert.deepEqual(await h.service.methods(A), { methods: [], atLimit: false });
  assert.equal(await h.service.receiveOverview(A), null); assert.equal(h.calls.length, 0);
});

test("consent and request validation precede provider writes", async () => {
  const h = harness();
  await assert.rejects(h.service.addMethod(A, false, REQUEST), /agree/);
  await assert.rejects(h.service.addMethod(A, true, "invalid"), /expired/);
  assert.equal(h.calls.length, 0);
});

test("adding creates only a no-charge setup session with persisted owner, consent and stable retry key", async () => {
  const h = harness(); assert.match(await h.service.addMethod(A, true, REQUEST), /^https:\/\/checkout.stripe.com\//);
  await h.service.addMethod(A, true, REQUEST);
  assert.equal(h.calls.filter(c => c.action === "customer.create").length, 1);
  const requests = h.calls.filter(c => c.action === "checkout.create");
  assert.deepEqual(requests[0], requests[1]);
  const payload = requests[0].value as Stripe.Checkout.SessionCreateParams;
  assert.equal(payload.mode, "setup"); assert.equal(payload.customer, "cus_owner");
  assert.equal(payload.client_reference_id, A.id);
  assert.equal(payload.metadata?.consent_version, PAYMENT_METHOD_CONSENT_VERSION);
  assert.equal(payload.payment_method_data?.allow_redisplay, "always");
  assert.equal(payload.payment_intent_data, undefined); assert.equal(payload.line_items, undefined);
  assert.match(payload.success_url!, /setup_session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.doesNotMatch(JSON.stringify(payload), /off_session|subscription_data|transfer_data|amount_cents/);
});

test("cross-user and cross-platform mappings fail before provider writes", async () => {
  const h = harness(); const row = await h.saved();
  await assert.rejects(h.service.methods(B), /verified/);
  row.platform_account_id = "acct_other"; await assert.rejects(h.service.addMethod(A, true, REQUEST), /verified/);
  assert.equal(h.calls.length, 0);
});

test("Stripe customer ownership and live mode are independently checked", async () => {
  const h = harness(); await h.saved();
  h.customer.metadata.profile_id = B.id; await assert.rejects(h.service.methods(A), /verified/);
  h.customer.metadata.profile_id = A.id; h.customer.livemode = true; await assert.rejects(h.service.methods(A), /verified/);
});

test("unreconciled create attempts cannot duplicate customers beyond idempotency window", async () => {
  const h = harness(); const row = await h.repository.reserve(A.id);
  row.customer_started_at = new Date(now - 24 * 3600_000).toISOString();
  await assert.rejects(h.service.addMethod(A, true, REQUEST), /reconciled/);
  assert.equal(h.calls.length, 0);
});

test("success requires the actual owned session, SetupIntent and attached method", async () => {
  const h = harness(); await h.saved(); assert.equal(await h.service.setupResult(A, h.session.id), "saved");
  h.session.status = "open"; assert.equal(await h.service.setupResult(A, h.session.id), "pending");
  h.session.status = "complete"; h.setup.status = "processing"; assert.equal(await h.service.setupResult(A, h.session.id), "pending");
  h.setup.status = "succeeded"; h.method.customer = "cus_other"; await assert.rejects(h.service.setupResult(A, h.session.id), /no longer attached/);
});

test("forged success return and mismatched consent metadata are rejected", async () => {
  const h = harness(); await h.saved();
  h.session.client_reference_id = B.id; await assert.rejects(h.service.setupResult(A, h.session.id), /does not belong/);
  h.session.client_reference_id = A.id; h.setup.metadata = { ...h.setup.metadata, consent_request_id: "different" };
  await assert.rejects(h.service.setupResult(A, h.session.id), /could not be verified/);
  await assert.rejects(h.service.setupResult(A, "https://attacker.invalid"), /Invalid/);
});

test("removal requires explicit confirmation, same customer and mode", async () => {
  const h = harness(); await h.saved();
  await assert.rejects(h.service.removeMethod(A, "pm_owner", false), /Confirm/);
  h.method.customer = "cus_other"; await assert.rejects(h.service.removeMethod(A, "pm_owner", true), /does not belong/);
  h.method.customer = "cus_owner"; h.method.livemode = true; await assert.rejects(h.service.removeMethod(A, "pm_owner", true), /does not belong/);
  h.method.livemode = false; await h.service.removeMethod(A, "pm_owner", true);
  assert.deepEqual(h.calls, [{ action: "detach", value: "pm_owner" }]);
});

test("payout setup is country-explicit, hosted, idempotent and separate from charging", async () => {
  const h = harness(); await assert.rejects(h.service.beginReceiving(A, ""), /country/);
  await h.service.beginReceiving(A, "us"); await h.service.beginReceiving(A, "");
  assert.equal(h.calls.filter(c => c.action === "account.create").length, 1);
  assert.equal(h.calls.filter(c => c.action === "onboarding").length, 2);
  assert.equal(h.calls.filter(c => c.action === "syncPayout").length, 0);
  const create = h.calls.find(c => c.action === "account.create")!.value as Stripe.AccountCreateParams;
  assert.equal(create.country, "US"); assert.equal(create.controller?.stripe_dashboard?.type, "express");
  const link = h.calls.find(c => c.action === "onboarding")!.value as Stripe.AccountLinkCreateParams;
  assert.match(link.return_url!, /flow=receive-return/); assert.doesNotMatch(link.return_url!, /connected|success/);
});

test("a malicious legacy payout mapping cannot open someone else's onboarding or dashboard", async () => {
  const h = harness(true); h.account.metadata.profile_id = B.id;
  await assert.rejects(h.service.beginReceiving(A, ""), /could not be verified/);
  await assert.rejects(h.service.manageReceiving(A), /could not be verified/);
  assert.ok(h.calls.every(c => c.action === "legacyPayout"));
});

test("payout summary contains only masked details and provider-derived readiness", async () => {
  const h = harness(true); const data = await h.service.receiveOverview(A);
  assert.equal(data?.status, "Setup incomplete"); assert.doesNotMatch(JSON.stringify(data), /DO-NOT-EXPOSE|routing_number|account_holder_name/);
  assert.equal(data?.methods[0].label, "Test bank ending in 6789");
  await h.service.manageReceiving(A); assert.equal(h.calls.at(-1)?.action, "login");
});

test("redirects are constrained to Stripe and configured return origins", () => {
  for (const url of ["javascript:alert(1)", "https://stripe.com.evil.invalid", "https://user@checkout.stripe.com", "https://checkout.stripe.com:444", "//connect.stripe.com"]) assert.throws(() => safeStripeDestination(url));
  assert.equal(safeStripeDestination("https://connect.stripe.com/setup/x"), "https://connect.stripe.com/setup/x");
  assert.throws(() => paymentReturnOrigin("http://www.moraltrade.org", true));
  assert.throws(() => paymentReturnOrigin("https://www.moraltrade.org/path", true));
});

test("masked data and ready labels never depend just on a return URL", () => {
  assert.deepEqual(maskPaymentMethod({ id: "pm_x", type: "sepa_debit", sepa_debit: { last4: "9999" } } as Stripe.PaymentMethod), { id: "pm_x", label: "Bank account ending in 9999", expiry: null });
  assert.equal(payoutStatus({ charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active" } } as Stripe.Account), "Stripe setup complete");
  assert.equal(payoutStatus({ charges_enabled: true, payouts_enabled: true, requirements: { disabled_reason: "requirements.past_due" } } as Stripe.Account), "Action required");
});

test("schema and wiring fail closed and expose the new route without changing settlement gates", () => {
  const sql = readFileSync("supabase/migrations/20260928181500_account_payment_settings.sql", "utf8");
  assert.match(sql, /enable row level security/); assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /unique \(profile_id, platform_account_id, livemode\)/);
  assert.match(sql, /security definer set search_path = ''/); assert.match(sql, /return used <= 10/);
  const actions = readFileSync("src/app/dashboard/payments/actions.ts", "utf8");
  assert.match(actions, /requireViewer\(ACCOUNT_PAYMENTS_PATH\)/); assert.match(actions, /takeAccountPaymentSetupSlot\(viewer.authUser.id\)/);
  assert.doesNotMatch(actions, /form.get\("(?:profile_id|customer_id|stripe_account_id)"\)/);
  const service = readFileSync("src/lib/payments/account-payment-service.ts", "utf8");
  assert.doesNotMatch(service, /paymentIntents\.create|transfers\.create|subscriptions\.create|charges\.create|conditional_payment_mandates/);
  const page = readFileSync("src/app/dashboard/payments/page.tsx", "utf8");
  assert.match(page, /force-dynamic/); assert.match(page, /requireViewer\(ACCOUNT_PAYMENTS_PATH\)/);
  assert.match(page, /id="payment-methods"/); assert.match(page, /id="receive-payments"/);
});
