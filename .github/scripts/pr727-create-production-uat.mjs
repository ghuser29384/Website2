import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const FIXED_EXPECTED_SHA = "fd5588fc4ae7f2fed44d6b0d1ca68f24ce1b86ab";
const FIXED_EXPECTED_DEPLOYMENT_ID = "dpl_5uNGHmgrNDjraHVRukXyNPeGRgEk";
const FIXED_EXPECTED_DEPLOYMENT_URL =
  "https://moraltrade-site-6vbxdlg7e-ellen-s.vercel.app";
const FIXED_EXPECTED_SUPABASE_REF = "jnpoxvalyjtdghnperyu";

const ORIGIN = required("PR727_CANONICAL_ORIGIN", process.env.PR727_CANONICAL_ORIGIN);
const EXPECTED_SHA = required("PR727_EXPECTED_SHA", process.env.PR727_EXPECTED_SHA);
const EXPECTED_DEPLOYMENT_ID = required(
  "PR727_EXPECTED_DEPLOYMENT_ID",
  process.env.PR727_EXPECTED_DEPLOYMENT_ID,
);
const EXPECTED_DEPLOYMENT_URL = required(
  "PR727_EXPECTED_DEPLOYMENT_URL",
  process.env.PR727_EXPECTED_DEPLOYMENT_URL,
);
const EXPECTED_SUPABASE_REF = required(
  "PR727_EXPECTED_SUPABASE_REF",
  process.env.PR727_EXPECTED_SUPABASE_REF,
);
const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const SUPABASE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const QA_EMAIL = required("PR727_QA_EMAIL", process.env.PR727_QA_EMAIL);
const QA_PASSWORD = required("PR727_QA_PASSWORD", process.env.PR727_QA_PASSWORD);
const QA_USER_ID = required("PR727_QA_USER_ID", process.env.PR727_QA_USER_ID);
const QA_RUN_ID = required("PR727_QA_RUN_ID", process.env.PR727_QA_RUN_ID);
const OUTPUT_DIR = process.env.PR727_OUTPUT_DIR ?? "pr727-create-production-uat";

function required(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

if (EXPECTED_SHA !== FIXED_EXPECTED_SHA) {
  throw new Error(`Refusing unexpected production SHA ${EXPECTED_SHA}.`);
}
if (EXPECTED_DEPLOYMENT_ID !== FIXED_EXPECTED_DEPLOYMENT_ID) {
  throw new Error(`Refusing unexpected deployment ${EXPECTED_DEPLOYMENT_ID}.`);
}
if (EXPECTED_DEPLOYMENT_URL !== FIXED_EXPECTED_DEPLOYMENT_URL) {
  throw new Error(`Refusing unexpected deployment URL ${EXPECTED_DEPLOYMENT_URL}.`);
}
if (EXPECTED_SUPABASE_REF !== FIXED_EXPECTED_SUPABASE_REF) {
  throw new Error(`Refusing unexpected Supabase ref ${EXPECTED_SUPABASE_REF}.`);
}
if (new URL(ORIGIN).origin !== "https://www.moraltrade.org") {
  throw new Error(`Refusing unexpected canonical origin ${ORIGIN}.`);
}
if (new URL(SUPABASE_URL).hostname.split(".")[0] !== EXPECTED_SUPABASE_REF) {
  throw new Error("Refusing a Supabase project other than exact Moral Trade production.");
}
if (!/^pr727-create-uat-[0-9]+-[0-9]+-[a-f0-9]{12}@qa\.moraltrade\.invalid$/.test(QA_EMAIL)) {
  throw new Error(`Refusing non-run-owned QA identity ${QA_EMAIL}.`);
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(QA_USER_ID)) {
  throw new Error("Refusing malformed synthetic user id.");
}

fs.mkdirSync(path.join(OUTPUT_DIR, "screenshots"), { recursive: true, mode: 0o700 });

function writeJson(name, value) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
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

async function sessionCookies(session) {
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
  if (error) throw new Error(`Could not serialize the QA session: ${error.message}`);
  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: ORIGIN,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

function browserDiagnostics(page, label) {
  const origin = new URL(ORIGIN).origin;
  const record = {
    label,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    mutationRequests: [],
    hydrationErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    record.consoleErrors.push(text);
    if (/hydration|did not match|server rendered html/i.test(text)) {
      record.hydrationErrors.push(text);
    }
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      record.mutationRequests.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: `${url.origin}${url.pathname}`,
      });
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    const headers = request.headers();
    const expectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || headers["next-router-prefetch"] === "1");
    if (!expectedPrefetchAbort) {
      record.requestFailures.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
        errorText,
      });
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || response.status() < 400) return;
    if (url.pathname === "/favicon.ico") return;
    record.httpErrors.push({ status: response.status(), url: response.url() });
  });

  return record;
}

function assertCleanDiagnostics(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.requestFailures.map(
      (value) => `request: ${value.method} ${value.url} ${value.errorText}`,
    ),
    ...record.httpErrors.map((value) => `http: ${value.status} ${value.url}`),
    ...record.mutationRequests.map((value) => `mutation: ${value.method} ${value.url}`),
    ...record.hydrationErrors.map((value) => `hydration: ${value}`),
  ];
  if (failures.length > 0) {
    throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
  }
}

function parseRgb(value) {
  const match = value.match(
    /^rgba?\(\s*([0-9.]+)[ ,]+([0-9.]+)[ ,]+([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i,
  );
  if (!match) throw new Error(`Unsupported computed color ${value}.`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function composite(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 255, g: 255, b: 255, a: 1 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function relativeLuminance(color) {
  const convert = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(color.r) + 0.7152 * convert(color.g) + 0.0722 * convert(color.b);
}

function contrastRatio(foregroundValue, backgroundValue) {
  const foreground = composite(parseRgb(foregroundValue), parseRgb(backgroundValue));
  const background = composite(parseRgb(backgroundValue), { r: 255, g: 255, b: 255, a: 1 });
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function assertAtLeast(actual, minimum, label) {
  if (!(actual >= minimum)) {
    throw new Error(`${label} was ${actual.toFixed(2)}; expected at least ${minimum}.`);
  }
}

async function createAuthenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({
    baseURL: ORIGIN,
    viewport,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(60_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: ORIGIN,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

async function openCreate(page, label) {
  const response = await page.goto("/trades/new", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response || response.status() !== 200) {
    throw new Error(`${label} /trades/new returned ${response?.status() ?? "no response"}.`);
  }
  const current = new URL(page.url());
  if (current.origin !== new URL(ORIGIN).origin || current.pathname !== "/trades/new") {
    throw new Error(`${label} left canonical /trades/new: ${page.url()}`);
  }

  const account = await page.evaluate(async () => {
    const accountResponse = await fetch("/api/live-account", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return {
      status: accountResponse.status,
      body: await accountResponse.json(),
    };
  });
  if (account.status !== 200 || account.body?.authenticated !== true) {
    throw new Error(`${label} did not resolve as an authenticated production account.`);
  }
  if (!String(account.body?.account?.displayName ?? "").includes("PR727 Create production UAT")) {
    throw new Error(`${label} authenticated the wrong account identity.`);
  }

  const frame = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(
    frame.getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
  return { frame, account: account.body.account };
}

async function initialCauseChecks(frame) {
  const causeCatalog = await frame.locator(".cause-choice").evaluateAll((buttons) =>
    buttons.map((button) => ({
      cause: button.getAttribute("data-cause"),
      text: button.textContent?.trim() ?? "",
      pressed: button.getAttribute("aria-pressed"),
    })),
  );
  const requiredCauses = ["Animal welfare", "Existential risk", "Priorities research"];
  for (const cause of requiredCauses) {
    if (!causeCatalog.some((item) => item.cause === cause)) {
      throw new Error(`Missing required cause ${cause}; available: ${causeCatalog.map((item) => item.cause).join(", ")}`);
    }
  }
  if (causeCatalog.some((item) => item.pressed !== "false")) {
    throw new Error("Cause choices did not begin with aria-pressed=false.");
  }

  const customInput = frame.locator("#otherCauseInput");
  const customContinue = frame.locator(".other-cause-submit");
  await expect(customContinue).toBeDisabled();
  await customInput.fill("   ");
  await expect(customContinue).toBeDisabled();
  await customInput.fill("Moral uncertainty");
  await expect(customContinue).toBeEnabled();
  await customInput.fill("");
  await expect(customContinue).toBeDisabled();

  return causeCatalog;
}

async function selectCauseAndOpenSkill(frame, cause, transitionKind) {
  const causeButton = frame.locator(`.cause-choice[data-cause="${cause}"]`);
  await expect(causeButton).toBeVisible();
  await causeButton.click();
  await expect(frame.locator("#screenRequest")).toBeVisible();
  await expect(causeButton).toHaveAttribute("aria-pressed", "true");
  await expect(frame.locator('.cause-choice[aria-pressed="true"]')).toHaveCount(1);
  await expect(frame.locator("#requestCause")).toHaveText(cause);

  const transitionLayout = await frame.locator("body").evaluate((kind) => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const value = element.getBoundingClientRect();
      return { top: value.top, bottom: value.bottom, left: value.left, right: value.right };
    };
    return {
      kind,
      scrollY: window.scrollY,
      header: rect(".topbar"),
      heading: rect("#requestHeading"),
      chosenStrip: rect(".chosen-strip"),
    };
  }, transitionKind);
  if (transitionLayout.heading.top < transitionLayout.header.bottom + 16) {
    throw new Error(`${transitionKind} transition placed the request heading under the sticky header.`);
  }
  if (transitionLayout.chosenStrip.top < transitionLayout.header.bottom) {
    throw new Error(`${transitionKind} transition placed the selected cause under the sticky header.`);
  }

  const requestExamples = await frame.locator(".request-example").allTextContents();
  if (requestExamples.length !== 3) {
    throw new Error(`${cause} exposed ${requestExamples.length} request examples instead of three.`);
  }

  await frame.locator('[data-request-kind="skill"]').click();
  const input = frame.locator("#requestActionInput");
  await expect(input).toBeFocused();
  await expect(frame.locator("#actionSuggestions")).toBeVisible();
  const suggestionLabels = frame.locator(".suggestion-option span:last-child");
  await expect(suggestionLabels).toHaveCount(7);
  const suggestions = await suggestionLabels.allTextContents();

  const relevance = {
    "Animal welfare": /animal|vegetarian|meat|welfare/i,
    "Existential risk": /existential|future|risk/i,
    "Priorities research": /priorit|allocat|cause/i,
  }[cause];
  if (!relevance || !suggestions.every((value) => relevance.test(value))) {
    throw new Error(`${cause} suggestions were not consistently cause-specific: ${suggestions.join(" | ")}`);
  }
  if (cause === "Existential risk" && suggestions.some((value) => /vegetarian|GiveDirectly|Help grow Moral Trade/i.test(value))) {
    throw new Error("Existential-risk suggestions contained unrelated fixture text.");
  }

  return { causeButton, input, requestExamples, suggestions, transitionLayout };
}

async function backToCauseScreen(frame) {
  const steps = [];
  for (let index = 0; index < 2; index += 1) {
    if (await frame.locator("#screenCause").isVisible()) break;
    const activeScreen = await frame.locator(".screen.active").getAttribute("id");
    steps.push(activeScreen);
    await frame.locator(".back-link").click();
  }
  await expect(frame.locator("#screenCause")).toBeVisible();
  if (steps.length < 1 || steps.length > 2) {
    throw new Error(`Unexpected back-transition count ${steps.length}.`);
  }
  return steps;
}

async function measureRequestSurface(frame) {
  const values = await frame.locator("body").evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        bottom: value.bottom,
        left: value.left,
        right: value.right,
        width: value.width,
        height: value.height,
      };
    };
    const style = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const computed = getComputedStyle(element);
      return {
        tagName: element.tagName,
        role: element.getAttribute("role"),
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        cursor: computed.cursor,
        display: computed.display,
        boxShadow: computed.boxShadow,
      };
    };
    const html = document.documentElement;
    const selected = document.querySelector(".request-choice.selected");
    if (!(selected instanceof HTMLElement)) throw new Error("Missing selected request card");
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollY: window.scrollY,
      horizontalOverflow: html.scrollWidth - html.clientWidth,
      header: rect(".topbar"),
      heading: rect("#requestHeading"),
      selectedRequestCard: rect(".request-choice.selected"),
      requestPanel: rect("#requestPrimary"),
      requestPanelStyle: style("#requestPrimary"),
      selectedCauseStyle: style("#requestCause"),
      selectedCauseStripStyle: style(".chosen-strip"),
      requestLabelStyle: style(".request-entry-head label"),
      requestInstructionStyle: style(".request-entry-head span"),
      inputStyle: style("#requestActionInput"),
    };
  });

  if (values.heading.top < values.header.bottom + 16) {
    throw new Error("Request heading is obscured by the sticky header.");
  }
  if (values.requestPanel.top < values.header.bottom) {
    throw new Error("Request-entry panel is obscured by the sticky header.");
  }
  if (["BUTTON", "A"].includes(values.requestPanelStyle.tagName) || values.requestPanelStyle.role === "button") {
    throw new Error("Request-entry surface is still exposed as a primary button.");
  }
  if (values.requestPanelStyle.backgroundColor !== "rgb(255, 253, 248)") {
    throw new Error(`Request-entry panel background drifted to ${values.requestPanelStyle.backgroundColor}.`);
  }
  if (values.requestPanelStyle.cursor === "pointer") {
    throw new Error("Request-entry panel still has a button-like pointer cursor.");
  }
  if (values.horizontalOverflow > 1) {
    throw new Error(`Create frame has ${values.horizontalOverflow}px horizontal overflow.`);
  }

  const contrasts = {
    selectedCause: contrastRatio(
      values.selectedCauseStyle.color,
      values.selectedCauseStripStyle.backgroundColor,
    ),
    requestLabel: contrastRatio(
      values.requestLabelStyle.color,
      values.requestPanelStyle.backgroundColor,
    ),
    requestInstruction: contrastRatio(
      values.requestInstructionStyle.color,
      values.requestPanelStyle.backgroundColor,
    ),
    enteredText: contrastRatio(values.inputStyle.color, values.requestPanelStyle.backgroundColor),
  };
  for (const [label, ratio] of Object.entries(contrasts)) {
    assertAtLeast(ratio, 4.5, `${label} contrast`);
  }

  return { ...values, contrasts };
}

async function verifyProgressAndSelection(frame, causeButton) {
  const marker = await causeButton.evaluate((element) => getComputedStyle(element, "::after").content);
  if (!marker.includes("✓")) {
    throw new Error(`Selected cause marker was ${marker}, not a checked affordance.`);
  }
  const progress = await frame.locator("#progress span").evaluateAll((bars) =>
    bars.map((bar) => ({
      label: bar.dataset.stepLabel,
      ariaLabel: bar.getAttribute("aria-label"),
      current: bar.getAttribute("aria-current"),
      visibleLabel: getComputedStyle(bar, "::after").content,
      hidden: bar.hidden,
    })),
  );
  const visible = progress.filter((item) => !item.hidden);
  const expected = ["Cause", "Request", "Offer", "Review"];
  if (JSON.stringify(visible.map((item) => item.label)) !== JSON.stringify(expected)) {
    throw new Error(`Progress labels were ${JSON.stringify(visible.map((item) => item.label))}.`);
  }
  if (visible.filter((item) => item.current === "step").length !== 1 || visible[1]?.current !== "step") {
    throw new Error("Progress did not expose exactly one current Request step.");
  }
  if (visible.some((item, index) => !item.ariaLabel?.includes(expected[index]) || !item.visibleLabel.includes(expected[index]))) {
    throw new Error("Progress state was communicated without complete visible and accessible names.");
  }
  return { marker, progress };
}

async function verifyKeyboardSelectionAndContrast(frame, input) {
  await input.fill("risk");
  await expect(frame.locator("#actionSuggestions")).toBeVisible();
  await input.press("ArrowDown");
  const active = frame.locator(
    '.suggestion-option[aria-selected="true"], .suggestion-option.active',
  );
  await expect(active).toHaveCount(1);
  const activeState = await active.evaluate((element) => {
    const computed = getComputedStyle(element);
    const label = element.querySelector("span:last-child");
    if (!(label instanceof HTMLElement)) throw new Error("Missing active suggestion label");
    const labelStyle = getComputedStyle(label);
    return {
      text: label.textContent?.trim() ?? "",
      backgroundColor: computed.backgroundColor,
      color: labelStyle.color,
      ariaSelected: element.getAttribute("aria-selected"),
    };
  });
  const ratio = contrastRatio(activeState.color, activeState.backgroundColor);
  assertAtLeast(ratio, 4.5, "selected suggestion contrast");

  const focusState = await input.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      focusVisible: element.matches(":focus-visible"),
      boxShadow: computed.boxShadow,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
    };
  });
  if (!focusState.active || (!focusState.focusVisible && focusState.boxShadow === "none")) {
    throw new Error("Keyboard focus was not visibly exposed on the request input.");
  }

  await input.press("Enter");
  await expect(input).toHaveValue(activeState.text);
  return { activeState, ratio, focusState };
}

async function verifyDesktopAutocomplete(frame, input) {
  await input.fill("risk");
  await input.evaluate((element) => element.scrollIntoView({ block: "end", inline: "nearest" }));
  await input.focus();
  await expect(frame.locator("#actionSuggestions")).toHaveAttribute("data-placement", "above");

  const state = await frame.locator("body").evaluate(() => {
    const inputElement = document.querySelector("#requestActionInput");
    const list = document.querySelector("#actionSuggestions");
    const panel = document.querySelector("#requestPrimary");
    const header = document.querySelector(".topbar");
    if (
      !(inputElement instanceof HTMLElement) ||
      !(list instanceof HTMLElement) ||
      !(panel instanceof HTMLElement) ||
      !(header instanceof HTMLElement)
    ) {
      throw new Error("Missing desktop autocomplete geometry element.");
    }
    const makeRect = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    };
    list.scrollTop = list.scrollHeight;
    return {
      placement: list.dataset.placement,
      position: getComputedStyle(list).position,
      input: makeRect(inputElement),
      list: makeRect(list),
      panel: makeRect(panel),
      header: makeRect(header),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      scrollTop: list.scrollTop,
    };
  });
  if (state.placement !== "above") throw new Error("Autocomplete did not flip above the field.");
  if (state.list.bottom > state.input.top + 2) {
    throw new Error("Above-placed autocomplete overlaps or falls below the request field.");
  }
  if (state.list.left < state.panel.left - 1 || state.list.right > state.panel.right + 1) {
    throw new Error("Desktop autocomplete escaped its containing panel horizontally.");
  }
  if (state.list.top < state.header.bottom - 1 || state.list.bottom > state.viewport.height + 1) {
    throw new Error("Desktop autocomplete escaped the available viewport.");
  }
  if (state.clientHeight > 276 || state.scrollHeight <= state.clientHeight || state.scrollTop <= 0) {
    throw new Error("Desktop autocomplete is not bounded and internally scrollable.");
  }
  return state;
}

async function verifyMobileAutocomplete(frame, input) {
  await input.fill("risk");
  await input.focus();
  const state = await frame.locator("body").evaluate(() => {
    const list = document.querySelector("#actionSuggestions");
    const panel = document.querySelector("#requestPrimary");
    if (!(list instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      throw new Error("Missing mobile autocomplete geometry element.");
    }
    const makeRect = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    };
    list.scrollTop = list.scrollHeight;
    return {
      position: getComputedStyle(list).position,
      placement: list.dataset.placement ?? null,
      list: makeRect(list),
      panel: makeRect(panel),
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      scrollTop: list.scrollTop,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (state.position !== "static" || state.placement !== null) {
    throw new Error("Mobile autocomplete did not remain in normal document flow.");
  }
  if (state.list.left < state.panel.left - 1 || state.list.right > state.panel.right + 1) {
    throw new Error("Mobile autocomplete escaped its containing panel.");
  }
  if (state.clientHeight > 240 || state.scrollHeight <= state.clientHeight || state.scrollTop <= 0) {
    throw new Error("Mobile autocomplete is not bounded and internally scrollable.");
  }
  if (state.horizontalOverflow > 1) {
    throw new Error(`Mobile Create frame has ${state.horizontalOverflow}px horizontal overflow.`);
  }
  return state;
}

async function outerOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function runDesktop(browser, session) {
  const context = await createAuthenticatedContext(browser, session, { width: 1644, height: 900 });
  const page = await context.newPage();
  const diagnostics = browserDiagnostics(page, "desktop");
  const { frame, account } = await openCreate(page, "desktop");
  const causeCatalog = await initialCauseChecks(frame);

  const animal = await selectCauseAndOpenSkill(frame, "Animal welfare", "automatic");
  const manualBackSteps = await backToCauseScreen(frame);
  const existential = await selectCauseAndOpenSkill(frame, "Existential risk", "manual");
  const requestSurface = await measureRequestSurface(frame);
  const progress = await verifyProgressAndSelection(frame, existential.causeButton);
  const keyboard = await verifyKeyboardSelectionAndContrast(frame, existential.input);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "desktop-request.png"),
    animations: "disabled",
  });

  const autocomplete = await verifyDesktopAutocomplete(frame, existential.input);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "desktop-autocomplete-above.png"),
    animations: "disabled",
  });

  const priorityBackSteps = await backToCauseScreen(frame);
  const priorities = await selectCauseAndOpenSkill(frame, "Priorities research", "manual");
  const prioritySuggestions = priorities.suggestions;

  const sets = [animal.suggestions, existential.suggestions, prioritySuggestions].map((values) =>
    JSON.stringify(values),
  );
  if (new Set(sets).size !== 3) {
    throw new Error("Representative causes did not produce materially different suggestion sets.");
  }

  const frameOverflow = await frame.locator("html").evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  const pageOverflow = await outerOverflow(page);
  if (frameOverflow > 1 || pageOverflow > 1) {
    throw new Error(`Desktop overflow remained (frame ${frameOverflow}px, page ${pageOverflow}px).`);
  }

  assertCleanDiagnostics(diagnostics);
  await context.close();
  return {
    viewport: { width: 1644, height: 900 },
    account,
    causeCatalog,
    manualBackSteps,
    priorityBackSteps,
    causeEvidence: {
      animalWelfare: {
        requestExamples: animal.requestExamples,
        suggestions: animal.suggestions,
      },
      existentialRisk: {
        requestExamples: existential.requestExamples,
        suggestions: existential.suggestions,
      },
      prioritiesResearch: {
        requestExamples: priorities.requestExamples,
        suggestions: priorities.suggestions,
      },
    },
    requestSurface,
    progress,
    keyboard,
    autocomplete,
    overflow: { frame: frameOverflow, page: pageOverflow },
    diagnostics,
  };
}

async function runMobile(browser, session) {
  const context = await createAuthenticatedContext(browser, session, { width: 390, height: 844 });
  const page = await context.newPage();
  const diagnostics = browserDiagnostics(page, "mobile");
  const { frame, account } = await openCreate(page, "mobile");
  await initialCauseChecks(frame);
  const existential = await selectCauseAndOpenSkill(frame, "Existential risk", "automatic");
  const requestSurface = await measureRequestSurface(frame);
  const progress = await verifyProgressAndSelection(frame, existential.causeButton);
  const keyboard = await verifyKeyboardSelectionAndContrast(frame, existential.input);
  const autocomplete = await verifyMobileAutocomplete(frame, existential.input);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "mobile-request.png"),
    animations: "disabled",
    fullPage: false,
  });

  const frameOverflow = await frame.locator("html").evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  const pageOverflow = await outerOverflow(page);
  if (frameOverflow > 1 || pageOverflow > 1) {
    throw new Error(`Mobile overflow remained (frame ${frameOverflow}px, page ${pageOverflow}px).`);
  }

  assertCleanDiagnostics(diagnostics);
  await context.close();
  return {
    viewport: { width: 390, height: 844 },
    account,
    causeEvidence: {
      requestExamples: existential.requestExamples,
      suggestions: existential.suggestions,
    },
    requestSurface,
    progress,
    keyboard,
    autocomplete,
    overflow: { frame: frameOverflow, page: pageOverflow },
    diagnostics,
  };
}

const startedAt = new Date().toISOString();
writeJson("browser-start.json", {
  startedAt,
  expectedSha: EXPECTED_SHA,
  expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
  expectedDeploymentUrl: EXPECTED_DEPLOYMENT_URL,
  canonicalOrigin: ORIGIN,
  qaRunId: QA_RUN_ID,
  qaUserId: QA_USER_ID,
  qaEmail: QA_EMAIL,
});

const client = authClient();
const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
  email: QA_EMAIL,
  password: QA_PASSWORD,
});
if (signInError || !signInData.session || !signInData.user) {
  throw new Error(`Could not authenticate the run-owned production fixture: ${signInError?.message ?? "no session"}`);
}
if (signInData.user.id !== QA_USER_ID) {
  throw new Error(`Authenticated user ${signInData.user.id} did not match ${QA_USER_ID}.`);
}
if (signInData.user.user_metadata?.qa_scope !== "pr727_create_production_uat") {
  throw new Error("Authenticated user lacked the exact PR727 UAT scope.");
}
if (signInData.user.user_metadata?.qa_run_id !== QA_RUN_ID) {
  throw new Error("Authenticated user lacked the exact run ownership marker.");
}

const browser = await chromium.launch({ headless: true });
let result;
try {
  const desktop = await runDesktop(browser, signInData.session);
  const mobile = await runMobile(browser, signInData.session);
  result = {
    schemaVersion: 1,
    status: "passed",
    expectedSha: EXPECTED_SHA,
    expectedDeploymentId: EXPECTED_DEPLOYMENT_ID,
    expectedDeploymentUrl: EXPECTED_DEPLOYMENT_URL,
    canonicalOrigin: ORIGIN,
    supabaseRef: EXPECTED_SUPABASE_REF,
    qaRunId: QA_RUN_ID,
    qaUserId: QA_USER_ID,
    qaEmail: QA_EMAIL,
    startedAt,
    completedAt: new Date().toISOString(),
    desktop,
    mobile,
    noBrowserMutationRequests:
      desktop.diagnostics.mutationRequests.length === 0 &&
      mobile.diagnostics.mutationRequests.length === 0,
  };
  if (!result.noBrowserMutationRequests) {
    throw new Error("The production UAT emitted an unexpected browser mutation request.");
  }
  writeJson("result.json", result);
} finally {
  await browser.close();
  await client.auth.signOut({ scope: "local" });
}
