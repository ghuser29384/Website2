import { appendFile, writeFile } from "node:fs/promises";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";

const BASE_URL = process.env.PR710_BASE_URL ?? "http://127.0.0.1:3212";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const QA_PASSWORD = process.env.PR710_QA_PASSWORD ?? "";
const SUMMARY_PATH = "pr710-rendered-summary.jsonl";
const OFFER_ID = "82000000-0000-4000-8000-000000000001";
const OFFER_PATH = `/offers/${OFFER_ID}`;

const COPY = {
  context: "Check evidence status and safeguards before responding",
  evidenceShortcut: "Review evidence status and safeguards",
  commitmentShortcut: "Jump to commitment terms",
  owner: "QA Core Loop Owner",
  offeredCause: "Evaluator core-loop verification",
  requestedCause: "Private QA response verification",
  offerAction: "Exercise one synthetic, QA-only evaluator checkpoint.",
  requestAction: "Submit one synthetic, QA-only private attestation for review.",
  notes:
    "Synthetic isolated-QA fixture. Not an offer to transact. No payment, custody, production data, or production deployment.",
  verification: "Private QA-only attestation reviewed against frozen terms.",
  duration: "One isolated QA browser session",
} as const;

const VIEWPORTS = [
  { height: 1000, label: "desktop-1440x1000", width: 1440 },
  { height: 844, label: "mobile-390x844", width: 390 },
  { height: 568, label: "mobile-320x568", width: 320 },
] as const;

type FailureMonitor = {
  console: string[];
  page: string[];
  request: string[];
  response: string[];
};

test.describe.configure({ mode: "serial" });

let responderSession: Session;

async function record(payload: Record<string, unknown>) {
  await appendFile(SUMMARY_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(`[pr710-rendered] ${JSON.stringify(payload)}`);
}

async function signInResponder() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !QA_PASSWORD) {
    throw new Error("The isolated-QA Supabase URL, publishable key, and ephemeral password are required.");
  }

  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: "evaluator-core-loop-responder@qa.invalid",
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed: ${error?.message ?? "no session"}`);
  }
  return data.session;
}

async function sessionCookies(session: Session) {
  const captured: Array<{ name: string; value: string }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(values) {
        captured.splice(0, captured.length, ...values);
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;

  return captured.map(({ name, value }) => ({
    httpOnly: true,
    name,
    sameSite: "Lax" as const,
    secure: false,
    url: BASE_URL,
    value,
  }));
}

async function authenticatedContext(
  browser: Browser,
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  await context.addCookies([
    ...(await sessionCookies(responderSession)),
    {
      httpOnly: true,
      name: "mt_walkthrough_seen",
      sameSite: "Lax" as const,
      secure: false,
      url: BASE_URL,
      value: "1",
    },
  ]);
  return context;
}

function monitor(page: Page): FailureMonitor {
  const failures: FailureMonitor = { console: [], page: [], request: [], response: [] };
  const expectedOrigin = new URL(BASE_URL).origin;

  page.on("console", (message) => {
    if (message.type() === "error") failures.console.push(message.text());
  });
  page.on("pageerror", (error) => failures.page.push(error.message));
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin === expectedOrigin) {
      failures.request.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`);
    }
  });
  page.on("response", (response) => {
    if (new URL(response.url()).origin === expectedOrigin && response.status() >= 400) {
      failures.response.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  return failures;
}

async function expectNoRuntimeFailures(failures: FailureMonitor) {
  expect(failures.console, "console errors").toEqual([]);
  expect(failures.page, "page errors").toEqual([]);
  expect(failures.request, "same-origin request failures").toEqual([]);
  expect(failures.response, "same-origin HTTP failures").toEqual([]);
}

async function gotoOffer(page: Page) {
  const response = await page.goto(OFFER_PATH, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `offer response status ${response?.status()}`).toBe(true);
  await expect(page).toHaveURL(new RegExp(`${OFFER_PATH.replaceAll("/", "\\/")}$`));
  await expect(page).toHaveTitle(new RegExp(`${COPY.offeredCause} for ${COPY.requestedCause}`, "i"));
}

async function expectFrameworkHealthy(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  await expect(page.locator('[data-nextjs-dialog-overlay], [data-next-badge-root]')).toHaveCount(0);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error|Internal Server Error/i);
  expect(bodyText.trim().length).toBeGreaterThan(500);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "horizontal overflow",
  ).toBe(true);
}

async function expectOfferIdentityAndContent(page: Page) {
  await expect(page.getByText(COPY.context, { exact: false })).toBeVisible();
  await expect(page.getByText(COPY.owner, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(COPY.offerAction, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(COPY.requestAction, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(COPY.notes, { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(new RegExp(COPY.verification.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first(),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(COPY.duration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first(),
  ).toBeVisible();
  await expect(page.getByText("Public record", { exact: true })).toBeVisible();
  await expect(page.getByText("Owner profile", { exact: true })).toBeVisible();
  await expect(page.getByText("Interest and saved-offer activity", { exact: true })).toBeVisible();
  await expect(page.getByText("Commentary and recommendations", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { exact: true, name: "Commitment preview" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Evaluator core-loop verification pledge.*Private QA response verification donation/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { exact: true, name: "Guarantees and limits" })).toBeVisible();
}

async function expectShortcutContract(page: Page) {
  const evidence = page.getByRole("link", { exact: true, name: COPY.evidenceShortcut });
  const commitment = page.getByRole("link", { exact: true, name: COPY.commitmentShortcut });
  await expect(evidence).toBeVisible();
  await expect(evidence).toHaveAttribute("href", `${OFFER_PATH}/credibility`);
  await expect(commitment).toBeVisible();
  await expect(commitment).toHaveAttribute("href", "#marketplace-commitment");
}

async function expectNoRelevantClippingOrCollision(page: Page, width: number) {
  const selectors = [
    ".offer-record-context-banner",
    ".offer-record-context-copy",
    ".offer-record-context-actions",
    ".hero-copy h1",
  ];
  const metrics = await page.evaluate((checkedSelectors) => {
    return checkedSelectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return { found: false, selector };
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        found: true,
        left: rect.left,
        right: rect.right,
        scrollWidth: element.scrollWidth,
        selector,
      };
    });
  }, selectors);
  for (const metric of metrics) {
    expect(metric.found, `${metric.selector} exists`).toBe(true);
    expect(metric.left ?? 0, `${metric.selector} left edge`).toBeGreaterThanOrEqual(-1);
    expect(metric.right ?? width, `${metric.selector} right edge`).toBeLessThanOrEqual(width + 1);
    expect(metric.scrollWidth ?? 0, `${metric.selector} text clipping`).toBeLessThanOrEqual(
      (metric.clientWidth ?? 0) + 1,
    );
  }

  const actionBoxes = await page.locator(".hero-copy .hero-actions > *").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      }),
  );
  for (let first = 0; first < actionBoxes.length; first += 1) {
    for (let second = first + 1; second < actionBoxes.length; second += 1) {
      const a = actionBoxes[first];
      const b = actionBoxes[second];
      const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      expect(overlapWidth > 1 && overlapHeight > 1, `hero action ${first}/${second} collision`).toBe(false);
    }
  }

  const canScroll = await page.evaluate(() => {
    const original = window.scrollY;
    window.scrollTo(0, document.documentElement.scrollHeight);
    const moved = window.scrollY > original;
    window.scrollTo(0, 0);
    return moved;
  });
  expect(canScroll, "document remains vertically scrollable").toBe(true);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ fullPage: false, path });
  await testInfo.attach(name, { contentType: "image/png", path });
}

async function commitmentResult(page: Page, input: "keyboard" | "pointer") {
  await expect(page).toHaveURL(new RegExp(`${OFFER_PATH.replaceAll("/", "\\/")}#marketplace-commitment$`));
  const target = page.locator("#marketplace-commitment");
  await expect(target).toHaveCount(1);
  await expect(target).toBeInViewport();
  await expect(target).toHaveAttribute("aria-labelledby", "marketplace-detail-section-heading");
  await expect(target.locator("#marketplace-detail-section-heading")).toHaveText("Commitment preview");
  await expect(
    target.getByRole("heading", {
      name: /Evaluator core-loop verification pledge.*Private QA response verification donation/i,
    }),
  ).toBeVisible();
  await expect(target.getByRole("heading", { exact: true, name: "Guarantees and limits" })).toBeVisible();
  const state = await target.evaluate((element) => ({
    activeElementTag: document.activeElement?.tagName ?? null,
    activeElementId: (document.activeElement as HTMLElement | null)?.id ?? null,
    focusWithin: element === document.activeElement || element.contains(document.activeElement),
    fragment: window.location.hash,
    targetTabIndex: (element as HTMLElement).tabIndex,
  }));
  await record({ input, kind: "commitment-focus", ...state });
  return state;
}

test.beforeAll(async () => {
  await writeFile(SUMMARY_PATH, "", "utf8");
  responderSession = await signInResponder();
  await record({
    authenticatedAs: "evaluator-core-loop-responder@qa.invalid",
    kind: "suite-start",
    offerId: OFFER_ID,
  });
});

for (const viewport of VIEWPORTS) {
  test(`${viewport.label}: authenticated offer, pointer and keyboard shortcuts`, async ({ browser }, testInfo) => {
    const context = await authenticatedContext(browser, viewport);

    const initial = await context.newPage();
    const initialFailures = monitor(initial);
    await gotoOffer(initial);
    await expectFrameworkHealthy(initial);
    await expectOfferIdentityAndContent(initial);
    await expectShortcutContract(initial);
    await expectNoRelevantClippingOrCollision(initial, viewport.width);
    await expect(initial.locator(".offer-record-context-banner")).toBeInViewport();
    await expect(initial.locator(".hero-copy h1")).toBeInViewport();
    await capture(initial, testInfo, `${viewport.label}-first-viewport`);
    await expectNoRuntimeFailures(initialFailures);
    await initial.close();

    const evidencePointer = await context.newPage();
    const evidencePointerFailures = monitor(evidencePointer);
    await gotoOffer(evidencePointer);
    await evidencePointer.getByRole("link", { exact: true, name: COPY.evidenceShortcut }).click();
    await expect(evidencePointer).toHaveURL(`${BASE_URL}${OFFER_PATH}/credibility`);
    await expect(evidencePointer).toHaveTitle(new RegExp(`Credibility: ${COPY.offeredCause}`, "i"));
    await expect(evidencePointer.getByRole("heading", { name: /contextual credibility for this offer/i })).toBeVisible();
    await expectFrameworkHealthy(evidencePointer);
    expect(
      await evidencePointer.locator(".offer-record-context-banner + .offer-record-route .marketplace-app-shell").count(),
      "offer-record marketplace overrides must not match the nested credibility page",
    ).toBe(0);
    await capture(evidencePointer, testInfo, `${viewport.label}-evidence-pointer`);
    await expectNoRuntimeFailures(evidencePointerFailures);
    await evidencePointer.close();

    const evidenceKeyboard = await context.newPage();
    const evidenceKeyboardFailures = monitor(evidenceKeyboard);
    await gotoOffer(evidenceKeyboard);
    const evidenceKeyboardLink = evidenceKeyboard.getByRole("link", {
      exact: true,
      name: COPY.evidenceShortcut,
    });
    await evidenceKeyboardLink.focus();
    await expect(evidenceKeyboardLink).toBeFocused();
    await evidenceKeyboardLink.press("Enter");
    await expect(evidenceKeyboard).toHaveURL(`${BASE_URL}${OFFER_PATH}/credibility`);
    await expectFrameworkHealthy(evidenceKeyboard);
    await expectNoRuntimeFailures(evidenceKeyboardFailures);
    await record({ input: "keyboard", kind: "evidence-shortcut", viewport: viewport.label });
    await evidenceKeyboard.close();

    const commitmentPointer = await context.newPage();
    const commitmentPointerFailures = monitor(commitmentPointer);
    await gotoOffer(commitmentPointer);
    await commitmentPointer.getByRole("link", { exact: true, name: COPY.commitmentShortcut }).click();
    const pointerFocus = await commitmentResult(commitmentPointer, "pointer");
    await expectFrameworkHealthy(commitmentPointer);
    await expectNoRuntimeFailures(commitmentPointerFailures);
    await record({ ...pointerFocus, input: "pointer", kind: "commitment-result", viewport: viewport.label });
    await commitmentPointer.close();

    const commitmentKeyboard = await context.newPage();
    const commitmentKeyboardFailures = monitor(commitmentKeyboard);
    await gotoOffer(commitmentKeyboard);
    const commitmentKeyboardLink = commitmentKeyboard.getByRole("link", {
      exact: true,
      name: COPY.commitmentShortcut,
    });
    await commitmentKeyboardLink.focus();
    await expect(commitmentKeyboardLink).toBeFocused();
    await commitmentKeyboardLink.press("Enter");
    const keyboardFocus = await commitmentResult(commitmentKeyboard, "keyboard");
    await capture(commitmentKeyboard, testInfo, `${viewport.label}-commitment-keyboard`);
    await expectFrameworkHealthy(commitmentKeyboard);
    await expectNoRuntimeFailures(commitmentKeyboardFailures);
    await record({ ...keyboardFocus, input: "keyboard", kind: "commitment-result", viewport: viewport.label });
    await commitmentKeyboard.close();

    await record({
      firstViewport: true,
      inputPaths: 4,
      kind: "viewport-pass",
      viewport: viewport.label,
    });
    await context.close();
  });
}
