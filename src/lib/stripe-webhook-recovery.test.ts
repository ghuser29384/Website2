import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

import * as authorization from "./agreement-payment-authorization";
import * as emailCopy from "./moral-trade/email-copy";

type Row = Record<string, unknown>;
type Failure = "ledger" | "read" | "write";
const NOW = "2026-10-17T00:00:00.000Z";
class FixedDate extends Date {
  constructor(value: string | number = NOW) { super(value); }
}

function compile(path: string, dependencies: Record<string, unknown>) {
  const { outputText } = transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { esModuleInterop: true, module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", "Date", outputText)((name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod, mod.exports, FixedDate);
  return mod.exports;
}

function harness(options: { failure?: Failure; blocked?: boolean; missing?: boolean } = {}) {
  let failure = options.failure;
  let ledger: Row | null = null;
  let payment: Row | null = options.missing ? null : {
    id: "payment-fixture", agreement_id: "agreement-fixture", payer_id: "payer-fixture",
    payee_id: "payee-fixture", amount_cents: 1000, currency: "usd", status: "pending",
    authorization_mode: options.blocked ? "manual_review_stub" : "direct_checkout",
    authorization_status: options.blocked ? "stub_blocked" : "not_required_for_stage",
    capture_policy: options.blocked ? "no_capture_until_matched_lock_confirmed" : "direct_checkout_after_participant_request",
    authorization_gate_snapshot: "fixture", paid_at: null,
  };
  const events: Row[] = [];
  const emails: Row[] = [];
  const requests: string[] = [];
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  });
  // Actual SDK query construction; the transport accepts only this inert fixture host.
  const db = createClient("https://offline-fixture.invalid", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://offline-fixture.invalid");
      const table = url.pathname.split("/").at(-1);
      const method = init?.method ?? "GET";
      requests.push(`${method} ${table}`);
      const body = init?.body ? JSON.parse(String(init.body)) as Row : {};
      const atFailure = (table === "conditional_payment_webhook_events" && failure === "ledger") ||
        (table === "agreement_payments" && failure === (method === "GET" ? "read" : "write"));
      if (atFailure) {
        return respond({ code: "OFFLINE", message: "Synthetic database unavailable" }, 503);
      }
      if (table === "conditional_payment_webhook_events") {
        if (method === "POST") {
          if (ledger) return respond({ code: "23505", message: "Synthetic duplicate event" }, 409);
          ledger = { ...body };
          return respond(null, 201);
        }
        if (method === "PATCH") {
          assert.ok(ledger);
          Object.assign(ledger, body);
          return respond(null);
        }
        assert.equal(method, "GET");
        return respond(ledger ? [ledger] : []);
      }
      if (table === "agreement_payments") {
        assert.equal(url.searchParams.get("id"), "eq.payment-fixture");
        if (method === "GET") return respond(payment ? [payment] : []);
        assert.equal(method, "PATCH");
        assert.ok(payment);
        payment = { ...payment, ...body };
        return respond(url.searchParams.has("select") ? payment : null);
      }
      if (table === "agreement_events") {
        assert.equal(method, "POST");
        events.push(body);
        return respond(null, 201);
      }
      if (table === "profiles") {
        assert.equal(method, "GET");
        return respond([{ id: "payer-fixture", email: "payer@example.invalid" }, { id: "payee-fixture", email: "" }]);
      }
      if (table === "email_outbox") {
        assert.equal(method, "POST");
        assert.ok(Array.isArray(body));
        emails.push(...body);
        return respond(null, 201);
      }
      assert.fail(`Unexpected database request: ${method} ${table}`);
    } },
  });
  const unexpected = () => { throw new Error("Unexpected provider/payment operation"); };
  const stripe = new Stripe("sk_test_offline_fixture_only");
  const secret = "whsec_offline_fixture_only";
  const conditional = compile("src/lib/payments/conditional-webhook.ts", {
    "@/lib/stripe": { getStripe: unexpected },
    "@/lib/supabase/server": { createServiceClient: () => db },
    "@/lib/payments/conditional-mandates": { markConditionalMandateReadyFromSetupIntent: unexpected, markConditionalMandateSetupFailed: unexpected },
    "@/lib/payments/conditional-redirect-service": { handleConditionalRedirectSetupSucceeded: unexpected },
    "@/lib/payments/donation-offset-settlement": { attemptDonationOffsetSettlement: unexpected, reconcileConditionalDispute: unexpected, reconcileConditionalPaymentIntent: unexpected, reconcileConditionalRefund: unexpected },
  });
  const route = compile("src/app/api/stripe/webhook/route.ts", {
    "next/server": { NextResponse },
    "@/lib/agreement-payment-authorization": authorization,
    "@/lib/mpgf/real-money": { handleMpgfStripeWebhookEvent: unexpected, hashStripeWebhookBody: (body: string) => createHash("sha256").update(body).digest("hex") },
    "@/lib/moral-trade/email-copy": emailCopy,
    "@/lib/payments/conditional-webhook": conditional,
    "@/lib/supabase/server": { createServiceClient: () => db },
    "@/lib/stripe": { getStripe: () => stripe, getStripeWebhookSecret: () => secret, hasStripeEnv: () => true },
  }) as { POST: (request: Request) => Promise<Response> };
  function deliver(type = "checkout.session.completed", badSignature = false) {
    const payload = JSON.stringify({ id: "evt_offline_fixture", type, livemode: false,
      data: { object: { id: "cs_offline_fixture", metadata: { agreement_payment_id: "payment-fixture" }, payment_intent: "pi_offline_fixture" } } });
    const signature = badSignature ? "invalid" : stripe.webhooks.generateTestHeaderString({ payload, secret });
    return route.POST(new Request("https://offline-fixture.invalid/api/stripe/webhook", {
      method: "POST", body: payload, headers: { "stripe-signature": signature },
    }));
  }
  return { deliver, events, emails, requests, payment: () => payment, ledger: () => ledger,
    recover: () => { failure = undefined; } };
}

for (const failure of ["read", "write"] as const) {
  for (const status of ["paid", "failed"] as const) {
    test(`agreement payment ${failure} failure requests a retry, then ${status} recovery succeeds`, async () => {
      const h = harness({ failure });
      const type = status === "paid" ? "checkout.session.completed" : "checkout.session.async_payment_failed";
      await assert.rejects(h.deliver(type), /Unable to (read|update) the agreement payment/);
      assert.equal(h.payment()?.status, "pending");
      assert.equal(h.events.length, 0);
      assert.equal(h.emails.length, 0);
      assert.equal(h.ledger()?.status, "ignored");
      h.recover();
      assert.equal((await h.deliver(type)).status, 200, "ignored conditional ledger must allow legacy retry");
      assert.equal(h.payment()?.status, status);
      assert.equal(h.payment()?.stripe_payment_intent_id, "pi_offline_fixture");
      assert.equal(h.payment()?.paid_at, status === "paid" ? NOW : null);
      assert.equal(h.events.length, 1);
      assert.deepEqual(h.emails.map(row => row.status), ["queued", "suppressed"]);
    });
  }
}

test("capture-blocked update failure requests a retry without recording false success", async () => {
  const h = harness({ failure: "write", blocked: true });
  await assert.rejects(h.deliver(), /Unable to record the blocked agreement payment/);
  assert.equal(h.events.length, 0);
  assert.equal(h.emails.length, 0);
  h.recover();
  assert.equal((await h.deliver()).status, 200);
  assert.equal(h.payment()?.status, "pending");
  assert.equal(h.payment()?.authorization_status, "capture_blocked");
  assert.equal(h.events.length, 1);
  assert.equal(h.emails.length, 0);
});

test("healthy signed payment still returns the existing response and safe notifications", async () => {
  const h = harness();
  const response = await h.deliver("checkout.session.async_payment_succeeded");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(h.payment()?.status, "paid");
  assert.equal(h.events.length, 1);
  assert.deepEqual(h.emails.map(row => ({ subject: row.subject, body: row.body })),
    [emailCopy.buildMoralTradeSafeEmailCopy("payment_confirmed"), emailCopy.buildMoralTradeSafeEmailCopy("payment_confirmed")]);
});

test("database outage at the initial ledger remains retryable without payment effects", async () => {
  const h = harness({ failure: "ledger" });
  await assert.rejects(h.deliver(), /Unable to record the Stripe webhook event/);
  assert.equal(h.payment()?.status, "pending");
  assert.equal(h.events.length, 0);
  assert.equal(h.emails.length, 0);
});

test("missing payment preserves the existing no-op behavior", async () => {
  const h = harness({ missing: true });
  assert.equal((await h.deliver()).status, 200);
  assert.equal(h.events.length, 0);
  assert.equal(h.emails.length, 0);
});

test("invalid signatures are rejected before any database access", async () => {
  const h = harness();
  assert.equal((await h.deliver(undefined, true)).status, 400);
  assert.equal(h.requests.length, 0);
});
