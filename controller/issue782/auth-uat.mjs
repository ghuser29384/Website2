import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}
function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function canonicalHost(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}
async function cookieSetFor(session, baseUrl, supabaseUrl, publishableKey) {
  const captured = [];
  const server = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() { return []; },
      setAll(values) { captured.splice(0, captured.length, ...values); },
    },
  });
  const { error } = await server.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return captured.map(({ name, value }) => ({
    name,
    value,
    url: baseUrl,
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "Lax",
  }));
}
async function signIn(email, password, supabaseUrl, publishableKey) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Synthetic sign-in failed: ${error?.message ?? "no session"}`);
  return { client, session: data.session };
}

const baseUrls = required("I782_BASE_URLS").split(",").map((value) => value.trim()).filter(Boolean);
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const password = required("I782_QA_PASSWORD");
const authStatePath = required("I782_AUTH_STATE");
const state = load(authStatePath);
const creator = state.users?.creator;
if (!creator?.email) throw new Error("Missing exact creator identity");
const probeRole = required("I782_PROBE_ROLE");
const probe = state.users?.[probeRole];
if (!probe?.email || !probe?.id) throw new Error(`Missing exact probe identity: ${probeRole}`);
const outputDir = required("I782_AUTH_UAT_DIR");
mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const routes = ["/profile", "/create", "/dashboard", "/feed"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const baseUrl of baseUrls) {
    const baseHost = canonicalHost(baseUrl);
    const valid = await signIn(creator.email, password, supabaseUrl, publishableKey);
    const cookies = await cookieSetFor(valid.session, baseUrl, supabaseUrl, publishableKey);
    let identityVisibleRoutes = 0;

    for (const viewport of viewports) {
      const context = await browser.newContext({ baseURL: baseUrl, viewport });
      context.setDefaultTimeout(15_000);
      context.setDefaultNavigationTimeout(30_000);
      await context.addCookies([
        ...cookies,
        { name: "mt_walkthrough_seen", value: "1", url: baseUrl, httpOnly: true, secure: true, sameSite: "Lax" },
      ]);
      for (const route of routes) {
        const page = await context.newPage();
        const diagnostics = { consoleErrors: [], pageErrors: [], sameOriginFailures: [] };
        page.on("console", (message) => { if (message.type() === "error") diagnostics.consoleErrors.push(message.text()); });
        page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
        page.on("requestfailed", (request) => {
          try {
            if (canonicalHost(request.url()) === baseHost) diagnostics.sameOriginFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`);
          } catch {}
        });
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        const finalUrl = page.url();
        if (status >= 500 || status === 0) throw new Error(`Auth route ${route} returned ${status}`);
        if (/\/(login|sign-in|signin)(?:[/?#]|$)/i.test(finalUrl)) throw new Error(`Valid synthetic identity was treated as signed out on ${route}`);
        const text = await page.locator("body").innerText();
        if (text.includes(creator.email) || /Issue 782 synthetic creator/i.test(text)) identityVisibleRoutes += 1;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) throw new Error(`Horizontal overflow ${overflow}px on ${route} at ${viewport.name}`);
        if (diagnostics.consoleErrors.length || diagnostics.pageErrors.length || diagnostics.sameOriginFailures.length) {
          throw new Error(`Browser diagnostics on ${route}: ${JSON.stringify(diagnostics)}`);
        }
        const safeName = route.slice(1).replaceAll("/", "-") || "root";
        await page.screenshot({ path: join(outputDir, `${new URL(baseUrl).hostname}-${viewport.name}-${safeName}.png`), fullPage: true });
        results.push({ base: new URL(baseUrl).hostname, viewport: viewport.name, route, status, finalPath: new URL(finalUrl).pathname, overflow });
        await page.close();
      }
      await context.close();
    }
    await valid.client.auth.signOut({ scope: "local" });
    if (identityVisibleRoutes < 1) throw new Error(`No authenticated route rendered the exact synthetic identity on ${baseUrl}`);

    const invalidContext = await browser.newContext({ baseURL: baseUrl, viewport: viewports[1] });
    const invalidCookies = cookies.map((cookie) => ({ ...cookie, value: "invalid-issue782-session" }));
    await invalidContext.addCookies(invalidCookies);
    const invalidPage = await invalidContext.newPage();
    const invalidResponse = await invalidPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const invalidText = await invalidPage.locator("body").innerText();
    const invalidUrl = invalidPage.url();
    const invalidClosed = /\/(login|sign-in|signin)(?:[/?#]|$)/i.test(invalidUrl)
      || [401, 403].includes(invalidResponse?.status() ?? 0)
      || /sign in|log in|authentication required/i.test(invalidText);
    if (!invalidClosed || invalidText.includes(creator.email) || /Issue 782 synthetic creator/i.test(invalidText)) {
      throw new Error("Malformed session did not fail closed without private identity content");
    }
    await invalidContext.close();

    const probeSignIn = await signIn(probe.email, password, supabaseUrl, publishableKey);
    const probeCookies = await cookieSetFor(probeSignIn.session, baseUrl, supabaseUrl, publishableKey);
    const admin = createClient(supabaseUrl, required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { error: deleteError } = await admin.auth.admin.deleteUser(probe.id, false);
    if (deleteError && !/not found/i.test(deleteError.message)) throw new Error(`Probe invalidation failed: ${deleteError.message}`);
    state.users[probeRole].deleted = true;
    state.users[probeRole].deletedAt = new Date().toISOString();
    writeFileSync(authStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    const expiredContext = await browser.newContext({ baseURL: baseUrl, viewport: viewports[1] });
    await expiredContext.addCookies(probeCookies);
    const expiredPage = await expiredContext.newPage();
    const expiredResponse = await expiredPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const expiredText = await expiredPage.locator("body").innerText();
    const expiredUrl = expiredPage.url();
    const expiredClosed = /\/(login|sign-in|signin)(?:[/?#]|$)/i.test(expiredUrl)
      || [401, 403].includes(expiredResponse?.status() ?? 0)
      || /sign in|log in|authentication required/i.test(expiredText);
    if (!expiredClosed || expiredText.includes(probe.email)) throw new Error("Deleted synthetic session did not fail closed");
    await expiredContext.close();
    await probeSignIn.client.auth.signOut({ scope: "local" }).catch(() => {});
  }
} finally {
  await browser.close();
}

const summary = {
  schemaVersion: 1,
  bases: baseUrls.map((url) => new URL(url).hostname),
  viewports,
  routeChecks: results.length,
  malformedSessionFailedClosed: true,
  deletedSessionFailedClosed: true,
  noUnauthorizedSyntheticIdentityFlash: true,
  completedAt: new Date().toISOString(),
};
writeFileSync(join(outputDir, "auth-uat-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify(summary));
