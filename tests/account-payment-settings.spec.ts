import { test, expect, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { mkdirSync } from "node:fs";

const origin = "http://127.0.0.1:3210";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const records = new Map<string, Record<string, unknown>>();
const customers = new Map<string, Record<string, unknown>>();
const accounts = new Map<string, Record<string, unknown>>();
const sessions = new Map<string, Record<string, unknown>>();
const methods = new Map<string, Record<string, unknown>>();
const providerWrites: string[] = [];
let providerUnavailable = false;
let auth: Server;
let provider: Server;
function user(id: string) {
  return { id, aud: "authenticated", role: "authenticated", email: `${id[0]}@example.invalid`,
    email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { display_name: "Payment setup QA" }, identities: [], factors: [] };
}
async function signIn(context: BrowserContext, id = A) {
  const now = Math.floor(Date.now() / 1000);
  const token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, session_id: "33333333-3333-4333-8333-333333333333", aal: "aal1" })).toString("base64url"),
    "local-fixture-not-a-production-signature"].join(".");
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "fixture", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user: user(id) })).toString("base64url")}`, url: origin },
    { name: "mt_analytics_opt_out", value: "1", url: origin }]);
}
function completeSetup() {
  const session = [...sessions.values()].at(-1)!;
  const id = `pm_fixture${methods.size + 1}`;
  methods.set(id, { id, object: "payment_method", type: "card", customer: session.customer, livemode: false, card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 } });
  session.status = "complete"; session.setup_intent = "seti_fixture"; session.fixture_method = id;
  return session.id;
}

test.describe("Account payment setup with isolated Auth, database and Stripe HTTP fixtures", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.ACCOUNT_PAYMENTS_FIXTURE !== "1", "Requires loopback-only provider fixtures, not real accounts or credentials.");
  test.beforeAll(async () => {
    expect(process.env.STRIPE_SECRET_KEY).toBe("sk_test_account_payment_fixture");
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54333");
    auth = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1:54333");
      let raw = ""; for await (const part of req) raw += part;
      const body = raw ? JSON.parse(raw) : {};
      res.setHeader("Content-Type", "application/json");
      let id = A;
      const token = String(req.headers.authorization ?? "").replace(/^Bearer /, "");
      try { id = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub; } catch { /* service fixture */ }
      if (url.pathname === "/auth/v1/user") {
        if (!token.includes("local-fixture-not-a-production-signature")) { res.statusCode = 401; res.end(JSON.stringify({ message: "No fixture session" })); return; }
        res.end(JSON.stringify(user(id))); return;
      }
      if (url.pathname === "/auth/v1/settings") { res.end(JSON.stringify({ external: { email: true } })); return; }
      if (url.pathname.includes("/.well-known/")) { res.end(JSON.stringify({ keys: [] })); return; }
      if (url.pathname === "/rest/v1/rpc/take_account_payment_setup_slot") { res.end("true"); return; }
      let rows: unknown[] = [];
      if (url.pathname === "/rest/v1/profiles") rows = [{ ...user(id), display_name: "Payment setup QA", username: "payment-qa", bio: "", city: "", region: "", country: "", public_location_granularity: "hidden" }];
      if (url.pathname === "/rest/v1/account_payment_settings") {
        const owner = req.method === "POST" ? body.profile_id : url.searchParams.get("profile_id")?.replace(/^eq\./, "");
        if (!owner) { res.statusCode = 400; res.end(JSON.stringify({ message: "Missing owner scope" })); return; }
        if (req.method === "POST" && !records.has(owner)) records.set(owner, { id: "33333333-3333-4333-8333-333333333333", profile_id: owner, platform_account_id: "acct_platform", livemode: false, stripe_customer_id: null, customer_started_at: null, stripe_account_id: null, account_started_at: null, account_country: null });
        const row = records.get(owner);
        if (req.method === "PATCH" && row) Object.assign(row, body);
        if (row) rows = [row];
      }
      const result = String(req.headers.accept).includes("vnd.pgrst.object") ? rows[0] ?? null : rows;
      res.end(JSON.stringify(result));
    });
    provider = createServer(async (req, res) => {
      let raw = ""; for await (const part of req) raw += part;
      const form = new URLSearchParams(raw);
      const url = new URL(req.url ?? "/", "http://127.0.0.1:54334");
      const path = url.pathname;
      res.setHeader("Content-Type", "application/json");
      if (providerUnavailable) { res.statusCode = 503; res.end(JSON.stringify({ error: { type: "api_error", message: "Fixture unavailable" } })); return; }
      if (req.method === "POST") providerWrites.push(path);
      const metadata = Object.fromEntries([...form.entries()].filter(([key]) => /^metadata\[/.test(key)).map(([key, value]) => [key.slice(9, -1), value]));
      let result: unknown;
      if (path === "/v1/account") result = { id: "acct_platform", object: "account", country: "US" };
      else if (path === "/v1/balance") result = { object: "balance", livemode: false, available: [], pending: [] };
      else if (path === "/v1/country_specs") result = { object: "list", data: [{ id: "US" }, { id: "GB" }], has_more: false };
      else if (path === "/v1/country_specs/US") result = { id: "US", object: "country_spec" };
      else if (path === "/v1/customers" && req.method === "POST") {
        const customer = { id: `cus_fixture${customers.size + 1}`, object: "customer", livemode: false, metadata };
        customers.set(customer.id, customer); result = customer;
      } else if (path.startsWith("/v1/customers/")) result = customers.get(path.split("/")[3]);
      else if (path === "/v1/payment_methods") result = { object: "list", data: [...methods.values()].filter(m => m.customer === url.searchParams.get("customer")), has_more: false };
      else if (path.startsWith("/v1/payment_methods/")) {
        result = methods.get(path.split("/")[3]);
        if (path.endsWith("/detach")) methods.delete(path.split("/")[3]);
      } else if (path === "/v1/checkout/sessions" && req.method === "POST") {
        expect(form.get("mode")).toBe("setup"); expect(form.has("payment_intent_data[amount]")).toBe(false);
        const session = { id: `cs_test_fixture${sessions.size + 1}`, object: "checkout.session", livemode: false, mode: "setup", customer: form.get("customer"), client_reference_id: form.get("client_reference_id"), metadata, status: "open", payment_intent: null, setup_intent: null, url: "https://checkout.stripe.com/test-fixture" };
        sessions.set(session.id, session); result = session;
      } else if (path.startsWith("/v1/checkout/sessions/")) result = sessions.get(path.split("/")[4]);
      else if (path === "/v1/setup_intents/seti_fixture") {
        const session = [...sessions.values()].at(-1)!;
        result = { id: "seti_fixture", object: "setup_intent", livemode: false, status: "succeeded", customer: session.customer, metadata: session.metadata, payment_method: session.fixture_method };
      } else if (path === "/v1/accounts" && req.method === "POST") {
        const account = { id: "acct_fixture", object: "account", type: "express", country: "US", charges_enabled: false, payouts_enabled: false, details_submitted: false, capabilities: { transfers: "inactive" }, requirements: {}, metadata };
        accounts.set(account.id, account); result = account;
      } else if (path.endsWith("/external_accounts")) result = { object: "list", data: [{ id: "ba_fixture", object: "bank_account", bank_name: "Test bank", last4: "6789", currency: "usd" }], has_more: false };
      else if (path.endsWith("/login_links")) result = { object: "login_link", url: "https://connect.stripe.com/test-dashboard" };
      else if (path.startsWith("/v1/accounts/")) result = accounts.get(path.split("/")[3]);
      else if (path === "/v1/account_links") result = { object: "account_link", url: "https://connect.stripe.com/test-onboarding" };
      else { res.statusCode = 400; result = { error: { message: `Unexpected fixture call: ${path}`, type: "invalid_request_error" } }; }
      res.end(JSON.stringify(result ?? { error: { message: "No fixture object" } }));
    });
    await Promise.all([new Promise<void>(resolve => auth.listen(54333, "127.0.0.1", resolve)), new Promise<void>(resolve => provider.listen(54334, "127.0.0.1", resolve))]);
    mkdirSync("/tmp/account-payment-settings-evidence", { recursive: true });
  });
  test.afterAll(async () => { for (const server of [auth, provider]) if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
  test.beforeEach(() => { records.clear(); customers.clear(); accounts.clear(); sessions.clear(); methods.clear(); providerWrites.length = 0; providerUnavailable = false; });

  for (const width of [1440, 390]) {
    test(`add, verify and remove a saved method at ${width}px`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 1000 }); await signIn(context);
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.route("https://checkout.stripe.com/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Stripe setup test fixture</h1>" }));
      await page.goto(`${origin}/dashboard/payments`);
      await expect(page.getByRole("heading", { name: "Payment methods & receiving", exact: true })).toBeVisible();
      await expect(page.getByText("No payment methods saved.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Add payment method", exact: true }).click();
      expect(providerWrites).toEqual([]);
      await page.locator('[name="save_consent"]').check();
      await page.getByRole("button", { name: "Add payment method", exact: true }).click();
      await expect(page).toHaveURL(/checkout.stripe.com/);
      const sessionId = completeSetup();
      await page.goto(`${origin}/dashboard/payments?setup_session_id=${sessionId}`);
      await expect(page.getByRole("status")).toContainText("Stripe confirmed");
      await expect(page.getByText("VISA ending in 4242", { exact: true })).toBeVisible();
      expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/account-payment-settings-evidence/saved-method-${width}.png`, fullPage: true });
      await page.locator("summary").filter({ hasText: /^Remove$/ }).click();
      await page.locator('[name="confirm_remove"]').check();
      await page.getByRole("button", { name: "Remove method", exact: true }).click();
      await expect(page.getByText("No payment methods saved.", { exact: true })).toBeVisible();
      expect(providerWrites.some(path => /payment_intents|transfers|charges|subscriptions/.test(path))).toBe(false);
      expect(errors).toEqual([]);
    });
  }
  test("receiving setup returns a truthful pending status and opens payout management", async ({ page, context }) => {
    await signIn(context);
    await page.route("https://connect.stripe.com/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Stripe receiving test fixture</h1>" }));
    await page.goto(`${origin}/dashboard/payments`);
    await page.locator('[name="country"]').selectOption("US");
    await page.getByRole("button", { name: "Set up receiving payments", exact: true }).click();
    await expect(page).toHaveURL(/connect.stripe.com\/test-onboarding/);
    await page.goto(`${origin}/dashboard/payments?flow=receive-return`);
    await expect(page.getByText("Setup incomplete", { exact: true })).toBeVisible();
    expect(await page.getByText("Stripe setup complete", { exact: true }).count()).toBe(0);
    Object.assign(accounts.get("acct_fixture")!, { charges_enabled: true, payouts_enabled: true, details_submitted: true, capabilities: { transfers: "active" } });
    await page.reload();
    await expect(page.getByText("Stripe setup complete", { exact: true })).toBeVisible();
    await expect(page.getByText("Test bank ending in 6789", { exact: true })).toBeVisible();
    await page.screenshot({ path: "/tmp/account-payment-settings-evidence/receiving-ready.png", fullPage: true });
    await page.getByRole("button", { name: "Manage payout methods", exact: true }).click();
    await expect(page).toHaveURL(/connect.stripe.com\/test-dashboard/);
    expect(providerWrites.some(path => /payment_intents|transfers|charges|subscriptions/.test(path))).toBe(false);
  });
  test("signed-out route keeps return destination and cannot create provider objects", async ({ page, context }) => {
    await context.clearCookies(); await page.goto(`${origin}/dashboard/payments`);
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard%2Fpayments/); expect(providerWrites).toEqual([]);
  });
  test("forged success does not imply a method was saved", async ({ page, context }) => {
    await signIn(context, B); await page.goto(`${origin}/dashboard/payments?setup_session_id=cs_test_foreign`);
    await expect(page.getByRole("alert")).toContainText("No payment profile");
    expect(await page.getByText(/Stripe confirmed/).count()).toBe(0); expect(providerWrites).toEqual([]);
  });
});
