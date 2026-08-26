import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
};
const load = (path) => JSON.parse(readFileSync(path, "utf8"));
const normalizedHost = (url) => new URL(url).hostname.replace(/^www\./, "");

async function sessionCookieValues(session, supabaseUrl, publishableKey) {
  const captured = [];
  const server = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (values) => captured.splice(0, captured.length, ...values),
    },
  });
  const { error } = await server.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return captured;
}

function browserCookies(values, baseUrl) {
  const urls = [baseUrl];
  const host = new URL(baseUrl).hostname;
  if (host === "moraltrade.org") urls.push("https://www.moraltrade.org");
  if (host === "www.moraltrade.org") urls.push("https://moraltrade.org");
  return urls.flatMap((url) =>
    values.map(({ name, value }) => ({
      name,
      value,
      url,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    })),
  );
}

async function signIn(email, password, supabaseUrl, publishableKey) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Synthetic sign-in failed: ${error?.message ?? "no session"}`);
  }
  return { client, session: data.session };
}

function assertPrivateCacheHeaders(route, response) {
  if (!response) throw new Error(`No response object for private route ${route}`);
  const headers = response.headers();
  const cacheControl = headers["cache-control"] ?? "";
  const vary = headers.vary ?? "";
  if (!/(^|,|\s)no-store(,|\s|$)/i.test(cacheControl)) {
    throw new Error(`Private route ${route} lacks Cache-Control no-store: ${cacheControl}`);
  }
  if (!/(^|,|\s)cookie(,|\s|$)/i.test(vary)) {
    throw new Error(`Private route ${route} lacks Vary: Cookie: ${vary}`);
  }
  return { cacheControl, vary };
}

const bases = required("I782_BASE_URLS").split(",").map((value) => value.trim()).filter(Boolean);
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const password = required("I782_QA_PASSWORD");
const state = load(required("I782_AUTH_STATE"));
const creator = state.users?.creator;
const probe = state.users?.[required("I782_PROBE_ROLE")];
if (!creator?.email || !probe?.email || !probe?.id) throw new Error("Missing exact synthetic identities");
const outputDir = required("I782_AUTH_UAT_DIR");
mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const routes = ["/profile", "/create", "/dashboard", "/feed"];
const privateCacheRoutes = new Set(["/profile", "/dashboard", "/feed"]);
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const markers = [creator.email, "Issue 782 synthetic creator", "QA DAC Product Creator"];
const browser = await chromium.launch({ headless: true });
const routeResults = [];
const cacheResults = [];
let probeUsed = false;

try {
  for (const baseUrl of bases) {
    const valid = await signIn(creator.email, password, supabaseUrl, publishableKey);
    const cookieValues = await sessionCookieValues(valid.session, supabaseUrl, publishableKey);
    const validCookies = browserCookies(cookieValues, baseUrl);
    let visibleIdentity = 0;

    for (const viewport of viewports) {
      const context = await browser.newContext({ baseURL: baseUrl, viewport });
      context.setDefaultTimeout(15_000);
      context.setDefaultNavigationTimeout(30_000);
      await context.addCookies([
        ...validCookies,
        ...browserCookies([{ name: "mt_walkthrough_seen", value: "1" }], baseUrl),
      ]);

      for (const route of routes) {
        const page = await context.newPage();
        const diagnostics = { consoleErrors: [], pageErrors: [], sameOriginFailures: [] };
        page.on("console", (message) => {
          if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
        page.on("requestfailed", (request) => {
          const failure = request.failure()?.errorText ?? "failed";
          if (normalizedHost(request.url()) === normalizedHost(baseUrl) && !/ERR_ABORTED/i.test(failure)) {
            diagnostics.sameOriginFailures.push(`${request.method()} ${new URL(request.url()).pathname} ${failure}`);
          }
        });

        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        if (!status || status >= 500) throw new Error(`${route} returned ${status}`);
        if (/\/(login|sign-in|signin)(?:[/?#]|$)/i.test(page.url())) {
          throw new Error(`Valid identity was treated as signed out on ${route}`);
        }
        const text = await page.locator("body").innerText();
        if (markers.some((marker) => text.includes(marker))) visibleIdentity += 1;
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 1) throw new Error(`Horizontal overflow ${overflow}px on ${route}`);
        if (diagnostics.consoleErrors.length || diagnostics.pageErrors.length || diagnostics.sameOriginFailures.length) {
          throw new Error(`Diagnostics on ${route}: ${JSON.stringify(diagnostics)}`);
        }
        if (privateCacheRoutes.has(route)) {
          cacheResults.push({
            host: new URL(baseUrl).hostname,
            viewport: viewport.name,
            route,
            ...assertPrivateCacheHeaders(route, response),
          });
        }
        await page.screenshot({
          path: join(outputDir, `${new URL(baseUrl).hostname}-${viewport.name}-${route.slice(1)}.png`),
          fullPage: true,
        });
        routeResults.push({
          host: new URL(baseUrl).hostname,
          viewport: viewport.name,
          route,
          status,
          finalPath: new URL(page.url()).pathname,
          overflow,
        });
        await page.close();
      }
      await context.close();
    }
    await valid.client.auth.signOut({ scope: "local" });
    if (visibleIdentity < 1) {
      throw new Error(`No valid private route rendered the exact synthetic profile identity on ${baseUrl}`);
    }

    const invalidContext = await browser.newContext({ baseURL: baseUrl, viewport: viewports[1] });
    await invalidContext.addCookies(
      browserCookies(cookieValues.map((cookie) => ({ ...cookie, value: "invalid-issue782-session" })), baseUrl),
    );
    const invalidPage = await invalidContext.newPage();
    const invalidResponse = await invalidPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const invalidText = await invalidPage.locator("body").innerText();
    const invalidClosed =
      /\/(login|sign-in|signin)(?:[/?#]|$)/i.test(invalidPage.url()) ||
      [401, 403].includes(invalidResponse?.status() ?? 0) ||
      /sign in|log in|authentication required/i.test(invalidText);
    if (!invalidClosed || markers.some((marker) => invalidText.includes(marker))) {
      throw new Error("Malformed session did not fail closed without private identity content");
    }
    await invalidContext.close();

    if (!probeUsed) {
      const probeSignIn = await signIn(probe.email, password, supabaseUrl, publishableKey);
      const probeCookieValues = await sessionCookieValues(probeSignIn.session, supabaseUrl, publishableKey);
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      });
      const { error } = await admin.auth.admin.signOut(probeSignIn.session.access_token, "global");
      if (error) throw new Error(`Administrative global sign-out failed: ${error.message}`);
      const expiredContext = await browser.newContext({ baseURL: baseUrl, viewport: viewports[1] });
      await expiredContext.addCookies(browserCookies(probeCookieValues, baseUrl));
      const expiredPage = await expiredContext.newPage();
      const expiredResponse = await expiredPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
      const expiredText = await expiredPage.locator("body").innerText();
      const expiredClosed =
        /\/(login|sign-in|signin)(?:[/?#]|$)/i.test(expiredPage.url()) ||
        [401, 403].includes(expiredResponse?.status() ?? 0) ||
        /sign in|log in|authentication required/i.test(expiredText);
      if (!expiredClosed || expiredText.includes(probe.email)) {
        throw new Error("Globally signed-out synthetic session did not fail closed");
      }
      await expiredContext.close();
      await probeSignIn.client.auth.signOut({ scope: "local" }).catch(() => {});
      probeUsed = true;
    }
  }
} finally {
  await browser.close();
}

const expectedCacheChecks = bases.length * viewports.length * privateCacheRoutes.size;
if (cacheResults.length !== expectedCacheChecks) {
  throw new Error(`Expected ${expectedCacheChecks} private cache checks; found ${cacheResults.length}`);
}
const summary = {
  schemaVersion: 4,
  bases: bases.map((base) => new URL(base).hostname),
  viewports,
  routeChecks: routeResults.length,
  privateCacheHeaderChecks: cacheResults.length,
  cacheControlNoStore: true,
  varyCookie: true,
  malformedSessionFailedClosed: true,
  globallySignedOutSessionFailedClosed: true,
  noUnauthorizedSyntheticIdentityFlash: true,
  completedAt: new Date().toISOString(),
};
writeFileSync(join(outputDir, "auth-uat-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, {
  mode: 0o600,
});
writeFileSync(join(outputDir, "private-cache-headers.json"), `${JSON.stringify(cacheResults, null, 2)}\n`, {
  mode: 0o600,
});
console.log(JSON.stringify(summary));
