import { test, expect, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { mkdirSync } from "node:fs";
import {
  PROFILE_PRIORITY_OPTIONS,
  buildPersistedProfilePriorities,
  serializeProfilePriorityAllocation,
  type ProfilePriorityAllocation,
} from "../src/lib/profile-priorities";

const origin = "http://127.0.0.1:3210";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const priority = PROFILE_PRIORITY_OPTIONS[0];
const requests: Array<{ method: string; path: string; search: string; body: Record<string, unknown> }> = [];
let unavailable = false;
let server: Server;
const saved = new Map<string, unknown>();
function allocation(blocks: number) {
  return Object.fromEntries(PROFILE_PRIORITY_OPTIONS.map(({ id }) => [id, id === priority.id ? blocks : 0])) as ProfilePriorityAllocation;
}
function user(id: string) {
  return { id, aud: "authenticated", role: "authenticated", email: `qa-${id[0]}@example.invalid`,
    email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Dashboard QA" }, identities: [], factors: [] };
}
async function signIn(context: BrowserContext, id = a) {
  const now = Math.floor(Date.now() / 1000);
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600,
      session_id: "33333333-3333-4333-8333-333333333333", aal: "aal1" })).toString("base64url"),
    "local-fixture-not-a-production-signature",
  ].join(".");
  const session = { access_token: token, refresh_token: "local-fixture-only", token_type: "bearer",
    expires_in: 3600, expires_at: now + 3600, user: user(id) };
  await context.addCookies([
    { name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: origin },
    { name: "mt_analytics_opt_out", value: "1", url: origin },
  ]);
}

test.describe("Dashboard 100 Sparks with a loopback-only account fixture", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.DASHBOARD_SPARKS_FIXTURE !== "1", "Requires the isolated loopback Auth/PostgREST fixture, never production credentials.");
  test.beforeAll(async () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54331");
    server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1:54331");
      let raw = "";
      for await (const part of req) raw += part;
      const body = raw ? JSON.parse(raw) : {};
      requests.push({ method: req.method ?? "GET", path: url.pathname, search: url.search, body });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
      if (req.method === "OPTIONS") { res.end(); return; }
      let id = a;
      const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      try { id = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub; } catch { /* No session. */ }
      if (url.pathname === "/auth/v1/user") {
        if (!token.includes("local-fixture-not-a-production-signature")) { res.statusCode = 401; res.end(JSON.stringify({ message: "No fixture session" })); return; }
        res.end(JSON.stringify(user(id))); return;
      }
      if (url.pathname === "/auth/v1/settings") { res.end(JSON.stringify({ external: { email: true } })); return; }
      if (url.pathname.includes("/.well-known/")) { res.end(JSON.stringify({ keys: [] })); return; }
      let rows: unknown[] = [];
      if (url.pathname === "/rest/v1/profiles") rows = [{ ...user(id), display_name: "Dashboard QA", username: "dashboard-qa", bio: "", city: "", region: "", country: "", public_location_granularity: "hidden" }];
      if (url.pathname === "/rest/v1/cohort_onboarding_profiles") {
        if (unavailable && req.method === "GET") { res.statusCode = 503; res.end(JSON.stringify({ message: "Deliberate fixture read failure" })); return; }
        if (url.searchParams.get("profile_id") !== `eq.${id}`) { res.statusCode = 403; res.end(JSON.stringify({ message: "Wrong fixture owner" })); return; }
        if (req.method === "PATCH") saved.set(id, body.priority_allocations);
        rows = [{ profile_id: id, priority_allocations: saved.get(id), cause_areas: [] }];
      }
      const response = String(req.headers.accept).includes("vnd.pgrst.object") ? rows[0] ?? null : rows;
      res.end(JSON.stringify(response));
    });
    await new Promise<void>((resolve) => server.listen(54331, "127.0.0.1", resolve));
    mkdirSync("/tmp/dashboard-sparks-evidence", { recursive: true });
  });
  test.afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  test.beforeEach(() => {
    unavailable = false;
    requests.length = 0;
    saved.set(a, buildPersistedProfilePriorities(allocation(4)));
    saved.set(b, buildPersistedProfilePriorities(allocation(2)));
  });

  for (const width of [1440, 390, 320]) {
    test(`opens directly on priorities with responsive controls at ${width}px`, async ({ page, context }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await signIn(context);
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto(`${origin}/dashboard`);
      await expect(page.getByRole("heading", { name: "Adjust your 100 sparks." })).toBeVisible();
      await expect(page).toHaveTitle(/Dashboard/);
      const tools = page.getByRole("navigation", { name: "Dashboard controls" });
      await expect(tools.getByRole("link", { name: "100 Sparks" })).toHaveAttribute("aria-current", "page");
      await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(serializeProfilePriorityAllocation(allocation(4)));
      await expect(page.locator("#dashboard-overview")).toHaveCount(0);
      await page.waitForTimeout(800);
      for (const path of ["/rest/v1/offers", "/rest/v1/wish_profiles", "/rest/v1/profile_payment_accounts", "/rest/v1/saved_searches"]) {
        expect(requests.filter((request) => request.path === path)).toHaveLength(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `/tmp/dashboard-sparks-evidence/dashboard-${width}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }

  test("Currency opens without a write or losing unsaved sparks and Escape closes it", async ({ page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("button", { name: `Increase ${priority.name}`, exact: true }).click();
    const draft = await page.locator('input[name="priority_allocation"]').inputValue();
    const currency = page.getByRole("navigation", { name: "Dashboard controls" }).locator("summary");
    await currency.click();
    await expect(page.getByText("An account-wide currency selector is not available.", { exact: false })).toBeVisible();
    await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(draft);
    expect(requests.some((request) => request.path === "/rest/v1/cohort_onboarding_profiles" && request.method !== "GET")).toBe(false);
    await page.screenshot({ path: "/tmp/dashboard-sparks-evidence/dashboard-currency.png" });
    await currency.press("Escape");
    await expect(currency.locator("..")).not.toHaveAttribute("open");
    await expect(currency).toBeFocused();
  });

  test("saving the actual server action remains owner-bound and returns to Dashboard", async ({ page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("button", { name: `Increase ${priority.name}`, exact: true }).click();
    const value = await page.locator('input[name="priority_allocation"]').inputValue();
    await page.getByRole("button", { name: "Save priorities", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard\?message=/);
    await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(value);
    const writes = requests.filter((request) => request.path === "/rest/v1/cohort_onboarding_profiles" && request.method === "PATCH");
    expect(writes).toHaveLength(1);
    expect(new URLSearchParams(writes[0].search).get("profile_id")).toBe(`eq.${a}`);
    await page.reload();
    await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(value);
  });

  test("unavailable priorities are not rendered as an editable zero allocation", async ({ page, context }) => {
    await signIn(context);
    unavailable = true;
    await page.goto(`${origin}/dashboard`);
    await expect(page.getByRole("alert").filter({ hasText: "Existing priority data could not be loaded" })).toBeVisible();
    await expect(page.locator('input[name="priority_allocation"]')).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Dashboard controls" })).toBeVisible();
    unavailable = false;
    await page.reload();
    await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(serializeProfilePriorityAllocation(allocation(4)));
  });

  test("guest authentication preserves Dashboard as the destination", async ({ page }) => {
    await page.goto(`${origin}/dashboard`);
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/dashboard");
    expect(requests.some((request) => request.path === "/rest/v1/cohort_onboarding_profiles")).toBe(false);
  });

  test("More controls and legacy section links still reach the existing controls", async ({ page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("navigation", { name: "Dashboard controls" }).getByRole("link", { name: "More controls" }).click();
    await expect(page).toHaveURL(/\/dashboard\?view=controls$/);
    await expect(page.locator("#account-heading")).toBeVisible();
    await page.getByRole("navigation", { name: "Dashboard controls" }).getByRole("link", { name: "100 Sparks" }).click();
    await expect(page.getByRole("heading", { name: "Adjust your 100 sparks." })).toBeVisible();
    await page.goto(`${origin}/dashboard#payment-setup`);
    await expect(page).toHaveURL(/\/dashboard\?view=controls#payment-setup$/);
    await expect(page.locator("#payment-setup")).toBeVisible();
  });

  test("separate accounts and the original priorities route keep their own saved values", async ({ browser, page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/profile/priorities?returnTo=%2Fprofile`);
    await expect(page.locator('input[name="priority_allocation"]')).toHaveValue(serializeProfilePriorityAllocation(allocation(4)));
    await expect(page.locator('input[name="success_to"]')).toHaveValue("/profile");
    const second = await browser.newContext();
    try {
      await signIn(second, b);
      const other = await second.newPage();
      await other.goto(`${origin}/dashboard`);
      await expect(other.locator('input[name="priority_allocation"]')).toHaveValue(serializeProfilePriorityAllocation(allocation(2)));
    } finally { await second.close(); }
  });
});
