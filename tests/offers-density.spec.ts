import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http, { type Server } from "node:http";
import { type AddressInfo } from "node:net";
import path from "node:path";

const FIXTURE_ID = "offers-compact-hybrid-isolated-v1";
const DEFAULT_FIXTURE_ROW_COUNT = 29;
const requestedFixtureRowCount = Number.parseInt(
  process.env.OFFERS_DENSITY_FIXTURE_ROWS ?? String(DEFAULT_FIXTURE_ROW_COUNT),
  10,
);
const FIXTURE_ROW_COUNT = Math.min(
  40,
  Math.max(27, Number.isFinite(requestedFixtureRowCount) ? requestedFixtureRowCount : DEFAULT_FIXTURE_ROW_COUNT),
);
const VIEWER_ID = "10000000-0000-4000-8000-000000000001";
const EXTERNAL_OWNER_ID = "20000000-0000-4000-8000-000000000001";
const VIEWER_EMAIL = "offers-qa-viewer@example.test";
const VIEWER_PASSWORD = "fixture-password-only";
const ACCESS_TOKEN = createFixtureJwt();
const REFRESH_TOKEN = "offers-density-refresh-token";
const targetRoute = "/offers?mode=pledge&view=live";
const captureDirectory = path.join("test-results", "offers-density");
const evidencePath = path.join(captureDirectory, "evidence.json");

interface FixtureOffer {
  id: string;
  owner_id: string;
  owner_alias: string;
  mode: "pledge" | "offset" | "payment";
  offered_cause: string;
  requested_cause: string;
  offer_action: string;
  request_action: string;
  compromise_cause: string;
  offer_impact: number;
  min_counterparty_impact: number;
  verification: string;
  duration: string;
  payment_interval_value: number | null;
  payment_interval_unit: string | null;
  trust_level: number;
  notes: string;
  discount_note: string;
  status: "open" | "paused" | "matched" | "closed";
  created_at: string;
  updated_at: string;
}

interface GeometryEvidence {
  completeRowsAboveFold: number;
  firstAction: { x: number; y: number; width: number; height: number };
  intersectingRows: number;
  pageHeight: number;
  state: "initial" | "expanded" | "owner" | "unavailable";
  viewport: { width: number; height: number };
}

interface FixtureLedger {
  authUserReads: number;
  deleteCount: number;
  insertCount: number;
  savedOfferIds: Set<string>;
}

function createFixtureJwt() {
  const now = Math.floor(Date.now() / 1_000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      aud: "authenticated",
      email: VIEWER_EMAIL,
      exp: now + 60 * 60,
      iat: now,
      iss: "offers-density-isolated-fixture",
      role: "authenticated",
      session_id: "30000000-0000-4000-8000-000000000001",
      sub: VIEWER_ID,
    }),
    "fixture-signature",
  ].join(".");
}

function fixtureOfferId(index: number) {
  return `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

const OWNER_OFFER_ID = fixtureOfferId(4);
const SAVABLE_OFFER_ID = fixtureOfferId(0);
const fixtureOffers: FixtureOffer[] = Array.from({ length: FIXTURE_ROW_COUNT }, (_, index) => {
  const isViewerOwned = index === 4;
  const ownerId = isViewerOwned ? VIEWER_ID : EXTERNAL_OWNER_ID;
  const createdAt = new Date(Date.UTC(2026, 7, 14, 12, 0, index)).toISOString();
  return {
    id: fixtureOfferId(index),
    owner_id: ownerId,
    owner_alias: isViewerOwned ? "Fixture Viewer" : "Civic Fixture Collective",
    mode: "pledge",
    offered_cause: `Civic participation ${index + 1}`,
    requested_cause: `Community resilience ${index + 1}`,
    offer_action: `Complete ${index + 2} hours of documented civic work`,
    request_action: `Complete ${index + 1} hours of documented resilience work`,
    compromise_cause: "Local public goods",
    offer_impact: 60 + (index % 20),
    min_counterparty_impact: 40 + (index % 15),
    verification: `Named coordinator attestation and dated completion record ${index + 1}`,
    duration: `${7 + (index % 5)} days from acceptance`,
    payment_interval_value: null,
    payment_interval_unit: null,
    trust_level: 70 + (index % 25),
    notes: `Synthetic exact-term fixture ${index + 1}; no real participant or production record.`,
    discount_note: `Bounded reciprocal terms ${index + 1}`,
    status: "open",
    created_at: createdAt,
    updated_at: createdAt,
  };
});

const fixtureProfile = {
  id: VIEWER_ID,
  email: VIEWER_EMAIL,
  display_name: "Fixture Viewer",
  username: "offers-fixture-viewer",
  public_invitation_mentions_enabled: false,
  avatar_url: null,
  account_kind: "individual",
  accepts_group_invitations: false,
  organization_approval_count: 0,
  affiliation: "Isolated QA",
  city: null,
  region: null,
  country: null,
  public_location_granularity: "hidden",
  bio: "Synthetic fixture profile.",
  follower_count: 0,
  following_count: 0,
  karma: 0,
  comment_count: 0,
  rating_avg: null,
  rating_count: 0,
  offer_count: 1,
  created_at: "2026-08-14T00:00:00.000Z",
};

const fixtureOwnerProfileCard = {
  ...fixtureProfile,
  id: EXTERNAL_OWNER_ID,
  display_name: "Civic Fixture Collective",
  username: "civic-fixture-collective",
  offer_count: FIXTURE_ROW_COUNT - 1,
};

const fixtureUser = {
  id: VIEWER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: VIEWER_EMAIL,
  email_confirmed_at: "2026-08-14T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-08-14T00:00:00.000Z",
  last_sign_in_at: "2026-08-14T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Fixture Viewer" },
  identities: [],
  created_at: "2026-08-14T00:00:00.000Z",
  updated_at: "2026-08-14T00:00:00.000Z",
  is_anonymous: false,
};

const fixtureSession = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 3_600,
  expires_at: Math.floor(Date.now() / 1_000) + 3_600,
  refresh_token: REFRESH_TOKEN,
  user: fixtureUser,
};

function jsonResponse(response: http.ServerResponse, status: number, body: unknown, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function eqParam(url: URL, name: string) {
  const value = url.searchParams.get(name) ?? "";
  return value.startsWith("eq.") ? value.slice(3) : "";
}

function requestedRange(request: http.IncomingMessage, url: URL, length: number) {
  const range = request.headers.range?.match(/(\d+)-(\d+)/);
  if (range) return { start: Number(range[1]), end: Number(range[2]) };
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? String(length), 10);
  return {
    start: Number.isFinite(offset) ? offset : 0,
    end: (Number.isFinite(offset) ? offset : 0) + (Number.isFinite(limit) ? limit : length) - 1,
  };
}

function isAuthenticatedRequest(request: http.IncomingMessage) {
  return request.headers.authorization === `Bearer ${ACCESS_TOKEN}`;
}

function createFixtureServer(ledger: FixtureLedger) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end(`${FIXTURE_ID}:${fixtureOffers.length}`);
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/v1/token") {
      const body = await readJsonBody(request);
      const isRefresh = url.searchParams.get("grant_type") === "refresh_token";
      if (
        isRefresh ||
        (body.email === VIEWER_EMAIL && body.password === VIEWER_PASSWORD)
      ) {
        jsonResponse(response, 200, fixtureSession);
      } else {
        jsonResponse(response, 400, { message: "Invalid synthetic fixture credentials." });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/v1/user") {
      if (!isAuthenticatedRequest(request)) {
        jsonResponse(response, 401, { message: "Synthetic session missing." });
        return;
      }
      ledger.authUserReads += 1;
      jsonResponse(response, 200, fixtureUser);
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/v1/logout") {
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return;
    }

    if (url.pathname === "/rest/v1/offers" && request.method === "GET") {
      const mode = eqParam(url, "mode");
      if (mode === "offset") {
        jsonResponse(response, 503, { message: "Synthetic unavailable-state fixture." });
        return;
      }

      const id = eqParam(url, "id");
      let matches = fixtureOffers.filter((offer) => offer.status === "open");
      if (mode) matches = matches.filter((offer) => offer.mode === mode);
      if (id) matches = matches.filter((offer) => offer.id === id);

      const objectResponse = request.headers.accept?.includes("application/vnd.pgrst.object+json");
      if (objectResponse) {
        jsonResponse(response, 200, matches[0] ?? null);
        return;
      }

      const { start, end } = requestedRange(request, url, matches.length);
      const items = matches.slice(start, end + 1);
      const contentRange = matches.length
        ? `${start}-${Math.max(start, start + items.length - 1)}/${matches.length}`
        : "*/0";
      jsonResponse(response, 206, items, { "content-range": contentRange });
      return;
    }

    if (url.pathname === "/rest/v1/profiles" && request.method === "GET") {
      if (!isAuthenticatedRequest(request)) {
        jsonResponse(response, 401, { message: "Authentication required." });
        return;
      }
      jsonResponse(response, 200, fixtureProfile);
      return;
    }

    if (url.pathname === "/rest/v1/public_profile_cards_v1" && request.method === "GET") {
      jsonResponse(response, 200, [fixtureOwnerProfileCard, fixtureProfile]);
      return;
    }

    if (
      request.method === "GET" &&
      new Set([
        "/rest/v1/donation_offset_offers",
        "/rest/v1/donation_offset_pools",
        "/rest/v1/guest_interests",
        "/rest/v1/interests",
        "/rest/v1/offer_comments",
        "/rest/v1/offer_recommendations",
        "/rest/v1/performance_bonds",
        "/rest/v1/profile_verification_badges",
        "/rest/v1/registered_charities",
        "/rest/v1/user_follows",
        "/rest/v1/wish_profile_previews",
      ]).has(url.pathname)
    ) {
      jsonResponse(response, 200, []);
      return;
    }

    if (url.pathname === "/rest/v1/guest_interests" && request.method === "PATCH") {
      if (!isAuthenticatedRequest(request)) {
        jsonResponse(response, 401, { message: "Authentication required." });
        return;
      }
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return;
    }

    if (url.pathname === "/rest/v1/route_recommendation_profiles" && request.method === "GET") {
      if (!isAuthenticatedRequest(request)) {
        jsonResponse(response, 401, { message: "Authentication required." });
        return;
      }
      jsonResponse(response, 200, { cause_priorities: ["Civic participation"] });
      return;
    }

    if (url.pathname === "/rest/v1/offer_carts") {
      if (!isAuthenticatedRequest(request)) {
        jsonResponse(response, 401, { message: "Authentication required." });
        return;
      }

      if (request.method === "GET") {
        const selectedOfferId = eqParam(url, "offer_id");
        const savedRows = [...ledger.savedOfferIds]
          .filter((offerId) => !selectedOfferId || offerId === selectedOfferId)
          .map((offerId) => ({
            offer_id: offerId,
            user_id: VIEWER_ID,
            created_at: "2026-08-14T00:00:00.000Z",
          }));
        const objectResponse = request.headers.accept?.includes("application/vnd.pgrst.object+json");
        jsonResponse(response, 200, objectResponse ? savedRows[0] ?? null : savedRows);
        return;
      }

      if (request.method === "POST") {
        const body = await readJsonBody(request);
        const offerId = typeof body.offer_id === "string" ? body.offer_id : "";
        const userId = typeof body.user_id === "string" ? body.user_id : "";
        if (!fixtureOffers.some((offer) => offer.id === offerId) || userId !== VIEWER_ID) {
          jsonResponse(response, 400, { message: "Invalid synthetic save mutation." });
          return;
        }
        ledger.savedOfferIds.add(offerId);
        ledger.insertCount += 1;
        response.writeHead(201, { "cache-control": "no-store", "content-type": "application/json" });
        response.end("[]");
        return;
      }

      if (request.method === "DELETE") {
        const offerId = eqParam(url, "offer_id");
        ledger.savedOfferIds.delete(offerId);
        ledger.deleteCount += 1;
        response.writeHead(204, { "cache-control": "no-store" });
        response.end();
        return;
      }
    }

    jsonResponse(response, 404, {
      message: `Synthetic endpoint not implemented: ${request.method ?? "UNKNOWN"} ${url.pathname}`,
    });
  });
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  return (server.address() as AddressInfo).port;
}

async function reservePort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function waitForApp(url: string, processHandle: ChildProcessWithoutNullStreams, logs: string[]) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Isolated Next server exited early (${processHandle.exitCode}).\n${logs.slice(-30).join("\n")}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      if (response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for isolated Next server.\n${logs.slice(-30).join("\n")}`);
}

async function stopProcess(processHandle: ChildProcessWithoutNullStreams | null) {
  if (!processHandle || processHandle.exitCode !== null) return;
  processHandle.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => processHandle.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (processHandle.exitCode === null) processHandle.kill("SIGKILL");
}

async function installBrowserStubs(page: Page) {
  await page.route("**/api/funnel-events", async (route) => {
    await route.fulfill({ body: "", status: 204 });
  });
  await page.route("**/api/live-now/feedback", async (route) => {
    await route.fulfill({ body: "", status: 204 });
  });
  await page.route("**/api/offers/plane", async (route) => {
    planeRequestCount += 1;
    await route.fulfill({
      body: JSON.stringify({ items: [], liveOffersAvailable: false }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/query/interpret", async (route) => {
    const payload = route.request().postDataJSON() as { query?: string };
    const query = payload.query?.trim() ?? "";
    if (query === "under") {
      await route.fulfill({
        body: JSON.stringify({
          interpretation: {
            needsClarification: true,
            clarification: {
              field: "maxAmountCents",
              question: "What amount should the proposal stay under?",
              options: ["$50", "$100"],
            },
          },
          target: "/offers?view=live",
          usedLlm: false,
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        interpretation: { needsClarification: false },
        target: `/offers?view=live&search=${encodeURIComponent(query)}&smart=1`,
        usedLlm: false,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
}

function recordPageHealth(page: Page, pageName: string) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${pageName} ${page.url()} :: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${pageName} ${page.url()} :: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(appBaseURL)) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function ensureScreenshotFonts(page: Page) {
  const fontState = await page.evaluate(async () => {
    const renderedFonts = [
      { descriptor: '400 16px "Metropolis"', sample: "Moral Trade live proposals" },
      { descriptor: '400 48px "Source Serif 4"', sample: "Find a live proposal" },
      { descriptor: '600 12px "IBM Plex Mono"', sample: "Open participant proposals" },
    ];
    const results = await Promise.allSettled(
      renderedFonts.map(({ descriptor, sample }) => document.fonts.load(descriptor, sample)),
    );
    await document.fonts.ready;
    return {
      failures: results.flatMap((result, index) =>
        result.status === "rejected" ? [renderedFonts[index].descriptor] : [],
      ),
      loaded: renderedFonts.map(({ descriptor, sample }) => document.fonts.check(descriptor, sample)),
      status: document.fonts.status,
    };
  });
  expect(fontState.failures).toEqual([]);
  expect(fontState.loaded).not.toContain(false);
  expect(fontState.status).toBe("loaded");
}

async function capture(page: Page, filename: string) {
  await mkdir(captureDirectory, { recursive: true });
  await ensureScreenshotFonts(page);
  await page.screenshot({ fullPage: false, path: path.join(captureDirectory, filename) });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}

async function expectNoTopbarCollision(page: Page) {
  const boxes = await page.evaluate(() => {
    const selectors = [
      ".mt-site-topbar > .brand",
      ".mt-site-topbar > .topbar-links",
      ".mt-site-topbar > .topbar-search",
      ".mt-site-topbar > .topbar-actions",
    ];
    return selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element || getComputedStyle(element).display === "none") return [];
      const rect = element.getBoundingClientRect();
      return [{ selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }];
    });
  });
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const left = boxes[leftIndex];
      const right = boxes[rightIndex];
      const horizontal = Math.min(left.right, right.right) - Math.max(left.left, right.left);
      const vertical = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
      expect(
        horizontal > 0.5 && vertical > 0.5,
        `${left.selector} overlaps ${right.selector}`,
      ).toBe(false);
    }
  }
}

async function geometry(page: Page, viewport: { width: number; height: number }, state: GeometryEvidence["state"]) {
  const firstAction = page.locator('[data-testid="proposal-primary-action"]').first();
  const firstActionBox = await firstAction.boundingBox();
  expect(firstActionBox).not.toBeNull();
  const rowBoxes = await page.locator("[data-participant-offer]").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }),
  );
  const completeRowsAboveFold = rowBoxes.filter(
    (box) => box.top >= 0 && box.bottom <= viewport.height,
  ).length;
  const intersectingRows = rowBoxes.filter(
    (box) => box.bottom > 0 && box.top < viewport.height,
  ).length;
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const result: GeometryEvidence = {
    completeRowsAboveFold,
    firstAction: firstActionBox!,
    intersectingRows,
    pageHeight,
    state,
    viewport,
  };
  geometryEvidence.push(result);
  return result;
}

async function gotoDirectory(page: Page, route = targetRoute) {
  const response = await page.goto(route, { waitUntil: "commit" });
  expect(response?.ok()).toBe(true);
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.locator('form[data-smart-query-surface="offers"]'),
  ).toBeVisible();
}

let fixtureServer: Server;
let fixtureBaseURL = "";
let appBaseURL = "";
let appProcess: ChildProcessWithoutNullStreams | null = null;
let publicContext: BrowserContext;
let authenticatedContext: BrowserContext;
let publicPage: Page;
let authenticatedPage: Page;
let planeRequestCount = 0;
let noJavaScriptBoundaryEvidence: {
  bodyText: string;
  headingCount: number;
  primaryActionCount: number;
  primaryActionVisible: boolean;
  rowCount: number;
  status: number;
} | null = null;
const appLogs: string[] = [];
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const httpErrors: string[] = [];
const geometryEvidence: GeometryEvidence[] = [];
const ledger: FixtureLedger = {
  authUserReads: 0,
  deleteCount: 0,
  insertCount: 0,
  savedOfferIds: new Set<string>(),
};

test.describe("Offers compact hybrid", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    expect(fixtureOffers.length).toBeGreaterThan(0);
    expect(new Set(fixtureOffers.map((offer) => offer.id)).size).toBe(fixtureOffers.length);
    expect(fixtureOffers.every((offer) => offer.id && offer.status === "open")).toBe(true);

    fixtureServer = createFixtureServer(ledger);
    const fixturePort = await listen(fixtureServer);
    fixtureBaseURL = `http://127.0.0.1:${fixturePort}`;
    const appPort = await reservePort();
    appBaseURL = `http://127.0.0.1:${appPort}`;

    const nextBinary = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
    appProcess = spawn(
      process.execPath,
      [nextBinary, "start", "-H", "127.0.0.1", "-p", String(appPort)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MORAL_TRADE_DISABLE_DEP_REPAIR: "1",
          NEXT_PUBLIC_SITE_URL: appBaseURL,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "offers-density-public-fixture",
          NEXT_PUBLIC_SUPABASE_URL: fixtureBaseURL,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: "pipe",
      },
    );
    const collectLog = (chunk: Buffer) => {
      appLogs.push(...chunk.toString("utf8").split(/\r?\n/).filter(Boolean));
      if (appLogs.length > 200) appLogs.splice(0, appLogs.length - 200);
    };
    appProcess.stdout.on("data", collectLog);
    appProcess.stderr.on("data", collectLog);
    await waitForApp(`${appBaseURL}${targetRoute}`, appProcess, appLogs);

    publicContext = await browser.newContext({
      baseURL: appBaseURL,
      storageState: {
        cookies: [
          {
            domain: "127.0.0.1",
            expires: -1,
            httpOnly: true,
            name: "mt_walkthrough_seen",
            path: "/",
            sameSite: "Lax",
            secure: false,
            value: "1",
          },
        ],
        origins: [],
      },
    });
    authenticatedContext = await browser.newContext({ baseURL: appBaseURL });
    publicPage = await publicContext.newPage();
    authenticatedPage = await authenticatedContext.newPage();
    await installBrowserStubs(publicPage);
    await installBrowserStubs(authenticatedPage);
    recordPageHealth(publicPage, "public");
    recordPageHealth(authenticatedPage, "authenticated");
  });

  test.afterAll(async () => {
    await mkdir(captureDirectory, { recursive: true });
    await writeFile(
      evidencePath,
      `${JSON.stringify({
        fixture: {
          id: FIXTURE_ID,
          rowCount: fixtureOffers.length,
          uniqueOfferIds: new Set(fixtureOffers.map((offer) => offer.id)).size,
          productionDataUsed: false,
        },
        geometry: geometryEvidence,
        noJavaScriptBoundary: noJavaScriptBoundaryEvidence,
        mutations: {
          authUserReads: ledger.authUserReads,
          deleteCount: ledger.deleteCount,
          finalSavedOfferCount: ledger.savedOfferIds.size,
          insertCount: ledger.insertCount,
        },
      }, null, 2)}\n`,
      "utf8",
    );
    await publicContext?.close();
    await authenticatedContext?.close();
    await stopProcess(appProcess);
    await new Promise<void>((resolve) => fixtureServer?.close(() => resolve()));
  });

  test("meets three-viewport geometry and disclosure acceptance", async () => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      await publicPage.setViewportSize(viewport);
      await gotoDirectory(publicPage);
      await expect(publicPage).toHaveTitle(/Explore live proposals/i);
      await expect(publicPage.locator("nextjs-portal")).toHaveCount(0);
      await expect(publicPage.locator('[data-authoritative-directory="true"]')).toHaveCount(1);

      const rows = publicPage.locator("[data-participant-offer]");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      await expect(publicPage.locator('[data-testid="proposal-primary-action"]')).toHaveCount(rowCount);
      await expect(publicPage.locator("[data-proposal-disclosure]")).toHaveCount(rowCount);
      const renderedIds = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-offer-id")),
      );
      expect(renderedIds.every(Boolean)).toBe(true);
      expect(new Set(renderedIds).size).toBe(renderedIds.length);
      const ariaRelationships = await rows.evaluateAll((elements) =>
        elements.map((element) => {
          const labelledBy = element.getAttribute("aria-labelledby") ?? "";
          const describedBy = (element.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
          return {
            labelled: Boolean(labelledBy && document.getElementById(labelledBy)),
            described: describedBy.length >= 2 && describedBy.every((id) => Boolean(document.getElementById(id))),
          };
        }),
      );
      expect(ariaRelationships.every((relationship) => relationship.labelled && relationship.described)).toBe(true);

      const firstDisclosure = publicPage.locator("[data-proposal-disclosure]").first();
      await expect(firstDisclosure.getByRole("link", { name: "Counteroffer" })).toBeHidden();
      await expect(firstDisclosure.getByRole("link", { name: "Ask" })).toBeHidden();
      await capture(publicPage, `initial-${viewport.width}x${viewport.height}.png`);
      const initialGeometry = await geometry(publicPage, viewport, "initial");
      if (viewport.width === 1440) expect(initialGeometry.completeRowsAboveFold).toBeGreaterThanOrEqual(3);
      if (viewport.width === 1024) expect(initialGeometry.completeRowsAboveFold).toBeGreaterThanOrEqual(1);
      if (viewport.width === 390) {
        expect(initialGeometry.firstAction.y).toBeLessThan(viewport.height);
        expect(initialGeometry.firstAction.y + initialGeometry.firstAction.height).toBeGreaterThan(0);
      }

      await firstDisclosure.locator(":scope > summary").click();
      await expect(firstDisclosure).toHaveJSProperty("open", true);
      await expect(firstDisclosure.getByText("Get", { exact: true })).toBeVisible();
      await expect(firstDisclosure.getByText("Do", { exact: true })).toBeVisible();
      await capture(publicPage, `expanded-${viewport.width}x${viewport.height}.png`);
      await firstDisclosure.locator(":scope > summary").click();

      const enterDisclosure = publicPage.locator("[data-proposal-disclosure]").nth(1);
      await enterDisclosure.locator(":scope > summary").focus();
      await enterDisclosure.locator(":scope > summary").press("Enter");
      await expect(enterDisclosure).toHaveJSProperty("open", true);
      await enterDisclosure.locator(":scope > summary").press("Enter");
      await expect(enterDisclosure).toHaveJSProperty("open", false);

      const spaceDisclosure = publicPage.locator("[data-proposal-disclosure]").nth(2);
      await spaceDisclosure.locator(":scope > summary").focus();
      await spaceDisclosure.locator(":scope > summary").press("Space");
      await expect(spaceDisclosure).toHaveJSProperty("open", true);
      await spaceDisclosure.locator(":scope > summary").press("Space");

      const explorer = publicPage.locator("details").filter({ hasText: "Optional visual explorer" });
      await expect(explorer).toBeVisible();
      await expect(explorer).toHaveJSProperty("open", false);
      await explorer.locator(":scope > summary").click();
      await expect(explorer).toHaveJSProperty("open", true);
      await explorer.locator(":scope > summary").click();
      await expect(explorer).toHaveJSProperty("open", false);

      await expectNoHorizontalOverflow(publicPage);
      await expectNoTopbarCollision(publicPage);

      await gotoDirectory(publicPage, "/offers?mode=offset&view=live");
      await expect(publicPage.locator('[data-directory-state="unavailable"]')).toBeVisible();
      await expect(publicPage.locator('[data-directory-state="empty"]')).toHaveCount(0);
      await expect(publicPage.getByText(/No live proposals satisfy|No live proposals are open/)).toHaveCount(0);
      await publicPage.locator('[data-directory-state="unavailable"]').scrollIntoViewIfNeeded();
      await capture(publicPage, `unavailable-${viewport.width}x${viewport.height}.png`);
      geometryEvidence.push({
        completeRowsAboveFold: 0,
        firstAction: { x: 0, y: 0, width: 0, height: 0 },
        intersectingRows: 0,
        pageHeight: await publicPage.evaluate(() => document.documentElement.scrollHeight),
        state: "unavailable",
        viewport,
      });
    }
  });

  test("preserves search, clarification, filters, sorting, pagination, and action URLs", async () => {
    await publicPage.setViewportSize({ width: 1440, height: 900 });
    await gotoDirectory(publicPage);

    const search = publicPage.getByLabel("Search proposals", { exact: true });
    await search.fill("under");
    await publicPage.getByRole("button", { name: "Search", exact: true }).click();
    await expect(publicPage.locator('[data-testid="smart-query-clarification"]')).toBeVisible();
    await expect(publicPage.getByText("What amount should the proposal stay under?", { exact: true })).toBeVisible();
    await publicPage.getByRole("button", { name: "Keep editing" }).click();

    await search.fill("civic work");
    await publicPage.getByRole("button", { name: "Search", exact: true }).click();
    await expect(publicPage).toHaveURL(/search=civic(?:%20|\+)work/);
    expect(new URL(publicPage.url()).searchParams.get("mode")).toBe("pledge");
    await expect(publicPage.locator("[data-participant-offer]").first()).toBeVisible();

    const filterDisclosure = publicPage.locator("details").filter({ hasText: "Filter & sort" }).first();
    await filterDisclosure.locator(":scope > summary").click();
    await publicPage.getByLabel("Sort").selectOption("lowest_cost");
    await publicPage.getByRole("button", { name: "Apply filters" }).click();
    await expect(publicPage).toHaveURL(/sort=lowest_cost/);
    expect(new URL(publicPage.url()).searchParams.get("mode")).toBe("pledge");
    await expect(filterDisclosure).toContainText(
      "Pledge or reciprocal action · Lowest stated cost",
    );

    const clearAll = publicPage.getByRole("link", { name: "Clear all" });
    await expect(clearAll).toHaveAttribute("href", "/offers?view=live");
    const [clearRequest] = await Promise.all([
      publicPage.waitForRequest((request) => {
        if (!request.isNavigationRequest()) return false;
        const requestURL = new URL(request.url());
        return requestURL.pathname === "/offers" && requestURL.search === "?view=live";
      }),
      publicPage.waitForURL((url) => url.pathname === "/offers" && url.search === "?view=live"),
      clearAll.click(),
    ]);
    expect(clearRequest.resourceType()).toBe("document");
    expect(new URL(clearRequest.url()).searchParams.has("_rsc")).toBe(false);
    await expect(publicPage.getByRole("link", { name: "Clear all" })).toHaveCount(0);

    await gotoDirectory(publicPage, "/offers?mode=pledge&sort=lowest_cost&view=live");
    const pageOnePagination = publicPage.getByRole("navigation", {
      name: "Live proposal pages",
    });
    await expect(pageOnePagination).toContainText("Page 1 of 2");
    const next = pageOnePagination.getByRole("link", { name: "Next" });
    await expect(next).toHaveAttribute(
      "href",
      "/offers?view=live&mode=pledge&sort=lowest_cost&page=2",
    );
    const [nextRequest] = await Promise.all([
      publicPage.waitForRequest((request) => {
        if (!request.isNavigationRequest()) return false;
        const requestURL = new URL(request.url());
        return (
          requestURL.pathname === "/offers" &&
          requestURL.search === "?view=live&mode=pledge&sort=lowest_cost&page=2"
        );
      }),
      publicPage.waitForURL(
        (url) =>
          url.pathname === "/offers" &&
          url.search === "?view=live&mode=pledge&sort=lowest_cost&page=2",
      ),
      next.click(),
    ]);
    expect(nextRequest.resourceType()).toBe("document");
    expect(new URL(nextRequest.url()).searchParams.has("_rsc")).toBe(false);

    const pageTwoPagination = publicPage.getByRole("navigation", {
      name: "Live proposal pages",
    });
    await expect(pageTwoPagination).toContainText("Page 2 of 2");
    let url = new URL(publicPage.url());
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("mode")).toBe("pledge");
    expect(url.searchParams.get("sort")).toBe("lowest_cost");

    const previous = pageTwoPagination.getByRole("link", { name: "Previous" });
    await expect(previous).toHaveAttribute(
      "href",
      "/offers?view=live&mode=pledge&sort=lowest_cost",
    );
    const [previousRequest] = await Promise.all([
      publicPage.waitForRequest((request) => {
        if (!request.isNavigationRequest()) return false;
        const requestURL = new URL(request.url());
        return (
          requestURL.pathname === "/offers" &&
          requestURL.search === "?view=live&mode=pledge&sort=lowest_cost"
        );
      }),
      publicPage.waitForURL(
        (nextURL) =>
          nextURL.pathname === "/offers" &&
          nextURL.search === "?view=live&mode=pledge&sort=lowest_cost",
      ),
      previous.click(),
    ]);
    expect(previousRequest.resourceType()).toBe("document");
    expect(new URL(previousRequest.url()).searchParams.has("_rsc")).toBe(false);
    await expect(
      publicPage.getByRole("navigation", { name: "Live proposal pages" }),
    ).toContainText("Page 1 of 2");
    url = new URL(publicPage.url());
    expect(url.searchParams.get("page")).toBeNull();
    expect(url.searchParams.get("mode")).toBe("pledge");
    expect(url.searchParams.get("sort")).toBe("lowest_cost");

    await gotoDirectory(publicPage, "/offers?mode=payment&view=live");
    await expect(publicPage.locator('[data-directory-state="empty"]')).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(publicPage.locator('[data-directory-state="unavailable"]')).toHaveCount(0);

    const redirectResponse = await publicPage.goto("/offers?view=examples", { waitUntil: "domcontentloaded" });
    expect(redirectResponse?.ok()).toBe(true);
    await expect(publicPage).toHaveURL(/\/worked-examples$/);

    await gotoDirectory(publicPage);
    const firstRow = publicPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"]`);
    const respond = firstRow.getByRole("link", { name: "Respond" });
    await expect(respond).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent(`/offers/${SAVABLE_OFFER_ID}#respond`)}`,
    );
    await respond.click();
    await expect(publicPage).toHaveURL(new RegExp(`/login\\?returnTo=.*${SAVABLE_OFFER_ID}`));

    await gotoDirectory(publicPage);
    const disclosure = publicPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"] [data-proposal-disclosure]`);
    await disclosure.locator(":scope > summary").click();
    const counteroffer = disclosure.getByRole("link", { name: "Counteroffer" });
    await expect(counteroffer).toHaveAttribute(
      "href",
      `/signup?returnTo=${encodeURIComponent(`/offers/new?mode=pledge&source_offer=${SAVABLE_OFFER_ID}`)}`,
    );
    await counteroffer.click();
    await expect(publicPage).toHaveURL(new RegExp(`/signup\\?returnTo=.*source_offer.*${SAVABLE_OFFER_ID}`));

    await gotoDirectory(publicPage);
    const actionDisclosure = publicPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"] [data-proposal-disclosure]`);
    await actionDisclosure.locator(":scope > summary").click();
    await actionDisclosure.getByRole("link", { name: "Ask" }).click();
    await expect(publicPage).toHaveURL(`${appBaseURL}/offers/${SAVABLE_OFFER_ID}#discussion`);

    await gotoDirectory(publicPage);
    const termsDisclosure = publicPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"] [data-proposal-disclosure]`);
    await termsDisclosure.locator(":scope > summary").click();
    await termsDisclosure.getByRole("link", { name: /Open full terms/ }).click();
    await expect(publicPage).toHaveURL(`${appBaseURL}/offers/${SAVABLE_OFFER_ID}`);
  });

  test("executes isolated owner Manage and real Save/Remove saved mutations", async () => {
    const returnTo = encodeURIComponent(targetRoute);
    await authenticatedPage.goto(`/login?method=email&returnTo=${returnTo}`, { waitUntil: "domcontentloaded" });
    await authenticatedPage.getByLabel("Email").fill(VIEWER_EMAIL);
    await authenticatedPage.getByLabel("Password").fill(VIEWER_PASSWORD);
    await authenticatedPage.getByRole("button", { name: "Log in" }).click();
    await expect(authenticatedPage).toHaveURL(/\/offers\?mode=pledge&view=live/);
    await expect(authenticatedPage.locator("[data-participant-offer]").first()).toBeVisible();
    expect(ledger.authUserReads).toBeGreaterThan(0);

    const ownerRow = authenticatedPage.locator(`[data-offer-id="${OWNER_OFFER_ID}"]`);
    const manage = ownerRow.getByRole("link", { name: "Manage" });
    await expect(manage).toHaveAttribute("href", `/offers/${OWNER_OFFER_ID}`);
    await manage.click();
    await expect(authenticatedPage).toHaveURL(`${appBaseURL}/offers/${OWNER_OFFER_ID}`);

    await gotoDirectory(authenticatedPage);
    let savableRow = authenticatedPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"]`);
    await savableRow.locator("[data-proposal-disclosure] > summary").click();
    await savableRow.getByRole("button", { name: "Save", exact: true }).click();
    await expect(authenticatedPage.getByText("Saved offer.", { exact: true })).toBeVisible();
    expect(ledger.insertCount).toBe(1);
    expect(ledger.savedOfferIds.has(SAVABLE_OFFER_ID)).toBe(true);

    savableRow = authenticatedPage.locator(`[data-offer-id="${SAVABLE_OFFER_ID}"]`);
    await savableRow.locator("[data-proposal-disclosure] > summary").click();
    await savableRow.getByRole("button", { name: "Remove saved", exact: true }).click();
    await expect(authenticatedPage.getByText("Removed saved offer.", { exact: true })).toBeVisible();
    expect(ledger.deleteCount).toBe(1);
    expect(ledger.savedOfferIds.size).toBe(0);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await authenticatedPage.setViewportSize(viewport);
      await gotoDirectory(authenticatedPage);
      const ownerManage = authenticatedPage.locator(`[data-offer-id="${OWNER_OFFER_ID}"]`).getByRole("link", { name: "Manage" });
      await expect(ownerManage).toBeVisible();
      await ownerManage.scrollIntoViewIfNeeded();
      await ownerManage.evaluate((element) => {
        element.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      });
      await expect(ownerManage).toBeInViewport();
      await authenticatedPage.mouse.move(0, 0);
      await capture(authenticatedPage, `owner-${viewport.width}x${viewport.height}.png`);
      const ownerAction = await ownerManage.boundingBox();
      expect(ownerAction).not.toBeNull();
      geometryEvidence.push({
        completeRowsAboveFold: 0,
        firstAction: ownerAction!,
        intersectingRows: 0,
        pageHeight: await authenticatedPage.evaluate(() => document.documentElement.scrollHeight),
        state: "owner",
        viewport,
      });
      await expectNoHorizontalOverflow(authenticatedPage);
      await expectNoTopbarCollision(authenticatedPage);
    }
  });

  test("retains the server-rendered no-JavaScript boundary", async ({ browser }) => {
    const noJsContext = await browser.newContext({ baseURL: appBaseURL, javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    const response = await noJsPage.goto(targetRoute, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    const heading = noJsPage.locator("h1").filter({ hasText: "Find a live proposal you can evaluate quickly." });
    const rows = noJsPage.locator("[data-participant-offer]");
    const primaryActions = noJsPage.locator('[data-testid="proposal-primary-action"]');
    await expect(heading).toHaveCount(1);
    const rowCount = await rows.count();
    const primaryActionCount = await primaryActions.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(primaryActionCount).toBe(rowCount);
    await expect(noJsPage.getByText("Preparing the requested view")).toHaveCount(0);
    noJavaScriptBoundaryEvidence = {
      bodyText: (await noJsPage.locator("body").innerText()).trim(),
      headingCount: await heading.count(),
      primaryActionCount,
      primaryActionVisible: await primaryActions.first().isVisible(),
      rowCount,
      status: response!.status(),
    };
    await noJsContext.close();
  });

  test("finishes with clean browser health and zero fixture residue", async () => {
    expect(consoleErrors, JSON.stringify({ appLogs: appLogs.slice(-80), consoleErrors }, null, 2)).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(httpErrors).toEqual([]);
    expect(ledger.insertCount).toBe(1);
    expect(ledger.deleteCount).toBe(1);
    expect(ledger.savedOfferIds.size).toBe(0);
    expect(planeRequestCount).toBeGreaterThan(0);
  });
});
