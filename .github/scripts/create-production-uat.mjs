import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const EXPECTED_MAIN_SHA = process.env.CREATE_UAT_EXPECTED_MAIN_SHA;
const EXPECTED_DEPLOYMENT_ID = process.env.CREATE_UAT_EXPECTED_DEPLOYMENT_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const QA_EMAIL = process.env.CREATE_UAT_EMAIL;
const QA_PASSWORD = process.env.CREATE_UAT_PASSWORD;
const QA_USER_ID = process.env.CREATE_UAT_USER_ID;
const OUTPUT_DIR = process.env.CREATE_UAT_OUTPUT_DIR ?? "create-production-uat";
const ORIGINS = (process.env.CREATE_UAT_ORIGINS ?? "https://www.moraltrade.org,https://moraltrade.org")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

function required(name, value) {
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

required("CREATE_UAT_EXPECTED_MAIN_SHA", EXPECTED_MAIN_SHA);
required("CREATE_UAT_EXPECTED_DEPLOYMENT_ID", EXPECTED_DEPLOYMENT_ID);
required("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_KEY);
required("CREATE_UAT_EMAIL", QA_EMAIL);
required("CREATE_UAT_PASSWORD", QA_PASSWORD);
required("CREATE_UAT_USER_ID", QA_USER_ID);
if (ORIGINS.length !== 2) throw new Error("Expected exactly two canonical origins.");

const allowedHosts = new Set(ORIGINS.map((origin) => new URL(origin).host));
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

function parseRgb(value) {
  const match = value.match(/rgba?\((\d+(?:\.\d+)?)[, ]+\s*(\d+(?:\.\d+)?)[, ]+\s*(\d+(?:\.\d+)?)(?:[, /]+\s*(\d+(?:\.\d+)?))?\)/i);
  if (!match) throw new Error(`Unsupported computed color: ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function luminanceChannel(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foreground, background) {
  const fg = parseRgb(foreground);
  const bg = parseRgb(background);
  if (fg.a !== 1 || bg.a !== 1) {
    throw new Error(`Expected opaque computed colors, received ${foreground} on ${background}.`);
  }
  const left = 0.2126 * luminanceChannel(fg.r) + 0.7152 * luminanceChannel(fg.g) + 0.0722 * luminanceChannel(fg.b);
  const right = 0.2126 * luminanceChannel(bg.r) + 0.7152 * luminanceChannel(bg.g) + 0.0722 * luminanceChannel(bg.b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function diagnostics(page, label) {
  const record = {
    label,
    consoleErrors: [],
    hydrationErrors: [],
    pageErrors: [],
    failedRelevantRequests: [],
    expectedPrefetchAborts: [],
    httpErrors: [],
    mutationRequests: [],
  };

  page.on("console", (message) => {
    const text = message.text();
    if (/hydration|hydrating|server rendered html/i.test(text)) record.hydrationErrors.push(text);
    if (message.type() === "error") record.consoleErrors.push(text);
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!allowedHosts.has(url.host)) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      record.mutationRequests.push({ method: request.method(), url: request.url() });
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (!allowedHosts.has(url.host)) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    const expectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || request.headers()["next-router-prefetch"] === "1");
    const payload = {
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      errorText,
    };
    if (expectedPrefetchAbort) record.expectedPrefetchAborts.push(payload);
    else record.failedRelevantRequests.push(payload);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!allowedHosts.has(url.host) || response.status() < 400) return;
    if (url.pathname === "/favicon.ico") return;
    record.httpErrors.push({ status: response.status(), url: response.url() });
  });
  return record;
}

function assertDiagnostics(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.hydrationErrors.map((value) => `hydration: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.failedRelevantRequests.map((value) => `request: ${value.method} ${value.url} ${value.errorText}`),
    ...record.httpErrors.map((value) => `http: ${value.status} ${value.url}`),
    ...record.mutationRequests.map((value) => `mutation: ${value.method} ${value.url}`),
  ];
  if (failures.length) throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
}

function authClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn() {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email: QA_EMAIL, password: QA_PASSWORD });
  if (error || !data.session || data.user?.id !== QA_USER_ID) {
    throw new Error(`Scoped production UAT sign-in failed: ${error?.message ?? "identity mismatch"}`);
  }
  return { client, session: data.session };
}

async function sessionCookies(session, origin) {
  const captured = [];
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
  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: origin,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

async function authenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({ viewport });
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(60_000);
  const cookies = [];
  for (const origin of ORIGINS) {
    cookies.push(...(await sessionCookies(session, origin)));
    cookies.push(
      { name: "mt_walkthrough_seen", value: "1", url: origin, httpOnly: true, secure: true, sameSite: "Lax" },
      { name: "mt_analytics_opt_out", value: "1", url: origin, httpOnly: false, secure: true, sameSite: "Lax" },
    );
  }
  await context.addCookies(cookies);
  return context;
}

function redirectChain(response) {
  const chain = [];
  let request = response.request();
  while (request) {
    chain.unshift(request.url());
    request = request.redirectedFrom();
  }
  return chain;
}

async function verifyAuthenticatedOrigin(context, origin) {
  const response = await context.request.get(`${origin}/api/live-account`, { maxRedirects: 3 });
  const body = await response.json();
  if (response.status() !== 200 || body.authenticated !== true) {
    throw new Error(`${origin} did not resolve as the scoped authenticated account.`);
  }
  return {
    origin,
    status: response.status(),
    finalUrl: response.url(),
    displayName: body.account?.displayName ?? null,
    cacheControl: response.headers()["cache-control"] ?? null,
  };
}

async function openCanonicalCreate(page, origin) {
  const response = await page.goto(`${origin}/create`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) throw new Error(`${origin}/create returned ${response?.status() ?? "no response"}.`);
  await expect(page.getByRole("heading", { level: 1, name: "Create a Moral Trade" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('iframe[title="Moral Trade Create"]')).toBeVisible({ timeout: 30_000 });
  const finalUrl = new URL(page.url());
  if (!allowedHosts.has(finalUrl.host) || finalUrl.pathname !== "/create") throw new Error(`${origin}/create resolved unexpectedly to ${page.url()}.`);
  const chain = redirectChain(response);
  if (chain.length > 2) throw new Error(`${origin}/create used an unexpected redirect chain: ${chain.join(" -> ")}`);
  return { origin, finalUrl: page.url(), redirectChain: chain };
}

async function enterCanonicalDraft(page) {
  const create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.getByRole("heading", { level: 1, name: "What do you want to improve?" })).toBeVisible({ timeout: 30_000 });
  return create;
}

const CAUSES = [
  { name: "Factory farming", pattern: /factory farming|animal(?:-| )welfare|animal|plant-based|meat|vegetarian|vegan/i },
  { name: "Existential risk", pattern: /existential(?:-| )risk|x-risk|ai safety|future flourishing|future generations|longterm|catastrophic risk/i },
  { name: "Priorities research", pattern: /priorities(?:-| )research|global priorities|cause priorit|resource allocation|resources should be allocated/i },
];

async function returnToCause(create) {
  const back = create.locator(".back-link");
  if (await back.isVisible()) {
    await back.click();
    await expect(create.getByRole("heading", { level: 1, name: "What do you want to improve?" })).toBeVisible();
  }
}

async function chooseCauseAndInspect(create, cause, detailed) {
  const causeButton = create.locator(`.cause-choice[data-cause="${cause.name}"]`);
  await causeButton.click();
  await expect(create.locator("#screenRequest")).toBeVisible();
  await expect(causeButton).toHaveAttribute("aria-pressed", "true");
  await expect(create.locator(".cause-choice.selected")).toHaveCount(1);
  const pressedCount = await create.locator('.cause-choice[aria-pressed="true"]').count();
  if (pressedCount !== 1) throw new Error(`${cause.name} left ${pressedCount} causes aria-pressed.`);
  const selectedMarker = await causeButton.evaluate((element) => getComputedStyle(element, "::after").content);
  if (!selectedMarker.includes("✓")) throw new Error(`${cause.name} lacks the checked selection affordance.`);

  const requestExamples = await create.locator(".request-example").allTextContents();
  if (requestExamples.length !== 3 || !requestExamples.every((value) => cause.pattern.test(value))) {
    throw new Error(`${cause.name} request examples are not cause-specific: ${requestExamples.join(" | ")}`);
  }

  await create.locator('[data-request-kind="skill"]').click();
  const input = create.locator("#requestActionInput");
  await expect(input).toBeFocused();
  await expect(create.locator("#actionSuggestions")).toBeVisible();
  const suggestionLabels = await create.locator(".suggestion-option span:last-child").allTextContents();
  if (suggestionLabels.length !== 7 || !suggestionLabels.every((value) => cause.pattern.test(value))) {
    throw new Error(`${cause.name} suggestions are not cause-specific: ${suggestionLabels.join(" | ")}`);
  }

  await input.fill("Review");
  await expect(input).toHaveValue("Review");
  if ((await create.locator(".suggestion-option").count()) < 1) {
    throw new Error(`${cause.name} autocomplete returned no result for entered text.`);
  }
  await input.press("ArrowDown");
  const activeSuggestion = create.locator('.suggestion-option.active, .suggestion-option[aria-selected="true"]');
  await expect(activeSuggestion).toHaveCount(1);

  await input.press("Tab");
  const focusedAfterTab = create.locator(":focus");
  await expect(focusedAfterTab).toHaveCount(1);
  await focusedAfterTab.press("Shift+Tab");
  await expect(input).toBeFocused();
  await input.press("ArrowDown");
  await expect(activeSuggestion).toHaveCount(1);

  const state = await create.locator("body").evaluate(() => {
    const requiredElement = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      return element;
    };
    const rect = (selector) => {
      const value = requiredElement(selector).getBoundingClientRect();
      return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
    };
    const effectiveBackground = (element) => {
      let current = element;
      while (current instanceof HTMLElement) {
        const value = getComputedStyle(current).backgroundColor;
        if (!value.endsWith(", 0)") && value !== "rgba(0, 0, 0, 0)") return value;
        current = current.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const colorPair = (selector) => {
      const element = requiredElement(selector);
      return { foreground: getComputedStyle(element).color, background: effectiveBackground(element) };
    };
    const html = document.documentElement;
    const list = requiredElement("#actionSuggestions");
    const panel = requiredElement("#requestPrimary");
    const input = requiredElement("#requestActionInput");
    const active = requiredElement('.suggestion-option.active, .suggestion-option[aria-selected="true"]');
    const progress = [...document.querySelectorAll("#progress span")].map((bar) => ({
      label: bar.dataset.stepLabel ?? null,
      current: bar.getAttribute("aria-current"),
      visibleLabel: getComputedStyle(bar, "::after").content,
    }));
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      horizontalOverflow: html.scrollWidth - html.clientWidth,
      scrollY: window.scrollY,
      header: rect(".topbar"),
      heading: rect("#requestHeading"),
      panel: { ...rect("#requestPrimary"), tagName: panel.tagName, background: getComputedStyle(panel).backgroundColor },
      list: {
        ...rect("#actionSuggestions"),
        clientHeight: list.clientHeight,
        scrollHeight: list.scrollHeight,
        overflowY: getComputedStyle(list).overflowY,
        position: getComputedStyle(list).position,
        placement: list.dataset.placement ?? null,
      },
      requestEntry: rect(".request-entry"),
      selectedCause: colorPair("#requestCause"),
      requestLabel: colorPair(".request-entry-head label"),
      instruction: colorPair(".request-entry-head span"),
      enteredText: { foreground: getComputedStyle(input).color, background: effectiveBackground(input), value: input.value },
      suggestion: colorPair(".suggestion-option span:last-child"),
      activeSuggestion: { foreground: getComputedStyle(active).color, background: effectiveBackground(active) },
      focus: {
        activeId: document.activeElement?.id ?? null,
        boxShadow: getComputedStyle(input).boxShadow,
        outlineStyle: getComputedStyle(input).outlineStyle,
        outlineWidth: getComputedStyle(input).outlineWidth,
      },
      selectedCauseCount: document.querySelectorAll(".cause-choice.selected").length,
      progress,
    };
  });

  if (state.heading.top < state.header.bottom + 16) throw new Error(`${cause.name} heading is obscured by the sticky header.`);
  if (state.scrollY !== 0) throw new Error(`${cause.name} automatic transition left scrollY=${state.scrollY}.`);
  if (state.horizontalOverflow > 1) throw new Error(`${cause.name} has ${state.horizontalOverflow}px inner horizontal overflow.`);
  if (state.panel.tagName === "BUTTON" || state.panel.background === "rgb(20, 94, 232)") {
    throw new Error(`${cause.name} request entry still presents as a blue primary button.`);
  }
  if (state.list.right > state.viewport.width + 1 || state.list.left < -1) throw new Error(`${cause.name} autocomplete escapes the viewport.`);
  if (state.list.left < state.requestEntry.left - 1 || state.list.right > state.requestEntry.right + 1) {
    throw new Error(`${cause.name} autocomplete escapes its containing request panel.`);
  }
  if (!["auto", "scroll"].includes(state.list.overflowY)) {
  throw new Error(`${cause.name} autocomplete is not configured to scroll internally when necessary.`);
}
  if (state.selectedCauseCount !== 1) throw new Error(`${cause.name} selected-state cardinality is ${state.selectedCauseCount}.`);
  if (state.progress.map((item) => item.label).join("|") !== "Cause|Request|Offer|Review") {
    throw new Error(`${cause.name} progress labels are incomplete.`);
  }
  if (state.progress.filter((item) => item.current === "step").length !== 1 || state.progress[1]?.current !== "step") {
    throw new Error(`${cause.name} progress aria-current semantics are incorrect.`);
  }
  if (!state.progress[1]?.visibleLabel.includes("Request")) throw new Error(`${cause.name} current progress label is not visibly named.`);
  if (state.focus.activeId !== "requestActionInput" || (state.focus.boxShadow === "none" && state.focus.outlineStyle === "none")) {
    throw new Error(`${cause.name} keyboard focus is not visibly retained on request entry.`);
  }

  const contrast = {
    selectedCause: contrastRatio(state.selectedCause.foreground, state.selectedCause.background),
    requestLabel: contrastRatio(state.requestLabel.foreground, state.requestLabel.background),
    instruction: contrastRatio(state.instruction.foreground, state.instruction.background),
    enteredText: contrastRatio(state.enteredText.foreground, state.enteredText.background),
    suggestion: contrastRatio(state.suggestion.foreground, state.suggestion.background),
    activeSuggestion: contrastRatio(state.activeSuggestion.foreground, state.activeSuggestion.background),
  };
  for (const [label, ratio] of Object.entries(contrast)) {
    if (ratio < 4.5) throw new Error(`${cause.name} ${label} contrast is ${ratio.toFixed(2)}:1.`);
  }

  if (!detailed) await input.fill("");
  return { cause: cause.name, requestExamples, suggestionLabels, state, contrast };
}

async function verifyDesktop(browser, session) {
  const context = await authenticatedContext(browser, session, { width: 1644, height: 900 });
  const authentication = await Promise.all(ORIGINS.map((origin) => verifyAuthenticatedOrigin(context, origin)));
  const page = await context.newPage();
  const record = diagnostics(page, "desktop-1644x900");
  const canonical = await openCanonicalCreate(page, ORIGINS[0]);
  const create = await enterCanonicalDraft(page);

  const customInput = create.locator("#otherCauseInput");
  const customContinue = create.locator(".other-cause-submit");
  await expect(customContinue).toBeDisabled();
  await customInput.fill("Moral uncertainty");
  await expect(customContinue).toBeEnabled();
  await customInput.fill("");
  await expect(customContinue).toBeDisabled();

  const causes = [];
  for (let index = 0; index < CAUSES.length; index += 1) {
    if (index > 0) await returnToCause(create);
    causes.push(await chooseCauseAndInspect(create, CAUSES[index], index === 0));
  }
  const serializedSuggestions = causes.map((item) => JSON.stringify(item.suggestionLabels));
  if (new Set(serializedSuggestions).size !== CAUSES.length) throw new Error("Representative causes did not produce materially different suggestions.");

  await returnToCause(create);
  await create.locator('.cause-choice[data-cause="Existential risk"]').click();
  await create.locator('[data-request-kind="skill"]').click();
  const flipEvidence = [];
  for (const height of [620, 560, 500, 440]) {
    await page.setViewportSize({ width: 1644, height });
    const geometry = await create.locator("#actionSuggestions").evaluate((list) => {
      const input = document.querySelector("#requestActionInput");
      const topbar = document.querySelector(".topbar");
      if (!(input instanceof HTMLElement) || !(list instanceof HTMLElement)) throw new Error("Missing autocomplete geometry.");
      const inputRect = input.getBoundingClientRect();
      const headerBottom = topbar?.getBoundingClientRect().bottom ?? 0;
      const below = Math.max(0, window.innerHeight - inputRect.bottom - 16);
      const above = Math.max(0, inputRect.top - Math.max(0, headerBottom) - 16);
      return { height: window.innerHeight, below, above, placement: list.dataset.placement ?? null, rect: list.getBoundingClientRect().toJSON() };
    });
    flipEvidence.push(geometry);
    if (geometry.below < 160 && geometry.above > geometry.below) {
      await expect.poll(() => create.locator("#actionSuggestions").getAttribute("data-placement")).toBe("above");
      const placement = await create.locator("#actionSuggestions").getAttribute("data-placement");
      if (placement !== "above") throw new Error("Desktop autocomplete did not flip above when lower space was insufficient.");
      break;
    }
  }
  if (!flipEvidence.some((item) => item.below < 160 && item.above > item.below && item.placement === "above")) {
    const finalPlacement = await create.locator("#actionSuggestions").getAttribute("data-placement");
    const eligible = flipEvidence.find((item) => item.below < 160 && item.above > item.below);
    if (!eligible || finalPlacement !== "above") throw new Error(`Could not prove above-placement autocomplete: ${JSON.stringify(flipEvidence)}`);
  }
  await page.setViewportSize({ width: 1644, height: 900 });

  const outerOverflow = await page.locator("html").evaluate((element) => element.scrollWidth - element.clientWidth);
  if (outerOverflow > 1) throw new Error(`Desktop outer document has ${outerOverflow}px horizontal overflow.`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "create-production-desktop-1644x900.png"), fullPage: true });
  await create.locator("body").screenshot({ path: path.join(OUTPUT_DIR, "create-production-desktop-frame-1644x900.png"), animations: "disabled" });
  assertDiagnostics(record);
  await context.close();
  return { authentication, canonical, outerOverflow, causes, flipEvidence, diagnostics: record };
}

async function verifyMobile(browser, session) {
  const context = await authenticatedContext(browser, session, { width: 390, height: 844 });
  const page = await context.newPage();
  const record = diagnostics(page, "mobile-390x844");
  const canonical = await openCanonicalCreate(page, ORIGINS[0]);
  const create = await enterCanonicalDraft(page);
  const cause = await chooseCauseAndInspect(create, CAUSES[1], true);
  const mobile = await create.locator("html").evaluate((html) => {
    const list = document.querySelector("#actionSuggestions");
    const heading = document.querySelector("#requestHeading");
    const header = document.querySelector(".topbar");
    if (!(list instanceof HTMLElement) || !(heading instanceof HTMLElement) || !(header instanceof HTMLElement)) throw new Error("Missing mobile geometry.");
    const rect = list.getBoundingClientRect();
    return {
      horizontalOverflow: html.scrollWidth - html.clientWidth,
      position: getComputedStyle(list).position,
      placement: list.dataset.placement ?? null,
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      listRect: { left: rect.left, right: rect.right, bottom: rect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      headerBottom: header.getBoundingClientRect().bottom,
      headingTop: heading.getBoundingClientRect().top,
    };
  });
  if (mobile.horizontalOverflow > 1) throw new Error(`Mobile frame has ${mobile.horizontalOverflow}px horizontal overflow.`);
  if (mobile.position !== "static" || mobile.placement !== null) throw new Error(`Mobile autocomplete is not in normal document flow: ${JSON.stringify(mobile)}`);
  if (mobile.clientHeight > 240 || mobile.scrollHeight <= mobile.clientHeight) throw new Error("Mobile autocomplete height/scroll contract failed.");
  if (mobile.listRect.left < -1 || mobile.listRect.right > mobile.viewport.width + 1) throw new Error("Mobile autocomplete escapes the viewport.");
  if (mobile.headingTop < mobile.headerBottom + 16) throw new Error("Mobile sticky header obscures the request heading.");
  const outerOverflow = await page.locator("html").evaluate((element) => element.scrollWidth - element.clientWidth);
  if (outerOverflow > 1) throw new Error(`Mobile outer document has ${outerOverflow}px horizontal overflow.`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "create-production-mobile-390x844.png"), fullPage: true });
  await create.locator("body").screenshot({ path: path.join(OUTPUT_DIR, "create-production-mobile-frame-390x844.png"), animations: "disabled" });
  assertDiagnostics(record);
  await context.close();
  return { canonical, outerOverflow, cause, mobile, diagnostics: record };
}

async function verifySecondCanonical(browser, session) {
  const context = await authenticatedContext(browser, session, { width: 1280, height: 720 });
  const page = await context.newPage();
  const record = diagnostics(page, "second-canonical-domain");
  const authentication = await verifyAuthenticatedOrigin(context, ORIGINS[1]);
  const canonical = await openCanonicalCreate(page, ORIGINS[1]);
  assertDiagnostics(record);
  await context.close();
  return { authentication, canonical, diagnostics: record };
}

async function run() {
  const startedAt = new Date().toISOString();
  const evidence = {
    schemaVersion: 1,
    expectedMainSha: EXPECTED_MAIN_SHA,
    expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
    origins: ORIGINS,
    userId: QA_USER_ID,
    startedAt,
    desktop: null,
    mobile: null,
    secondCanonical: null,
    finishedAt: null,
    noOfferPaymentTradeOrSyntheticProductRecordCreated: true,
  };
  writeJson("state.json", evidence);

  let browser;
  let auth;
  try {
    auth = await signIn();
    browser = await chromium.launch({ headless: true });
    evidence.desktop = await verifyDesktop(browser, auth.session);
    evidence.mobile = await verifyMobile(browser, auth.session);
    evidence.secondCanonical = await verifySecondCanonical(browser, auth.session);
    evidence.finishedAt = new Date().toISOString();
    writeJson("evidence.json", evidence);
    writeJson("state.json", { ...evidence, completed: true });
  } finally {
    await browser?.close();
    await auth?.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
}

await run();
