import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const BASE_URL = (process.env.ACTIVATION_BASE_URL ?? "https://www.moraltrade.org").replace(/\/$/, "");
const OFFER_ID = "eab45baa-8b83-408f-9afd-ff4e3caab801";
const OFFER_PATH = `/offers/${OFFER_ID}`;
const RUN_TOKEN =
  process.env.ACTIVATION_RUN_TOKEN ||
  [process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT].filter(Boolean).join("-") ||
  String(Date.now());
const TEST_EMAIL = `caijun054+activation-gate-${RUN_TOKEN}@gmail.com`;
const TEST_PASSWORD = `${randomBytes(24).toString("base64url")}aA1!`;
const OUTPUT_DIR = "activation-gate-output";
const INJECT_OFFER_SURFACE_FIX = process.env.ACTIVATION_INJECT_OFFER_SURFACE_FIX === "1";
const MESSAGE = [
  "ACTIVATION-GATE TEST 2026-07-15.",
  "I have a real stalled collaboration about how to prioritize local public-health work versus long-term risk reduction.",
  "Without this session, the parties will continue separately and no written no-trade baseline will be produced.",
  "I can attend one 45-minute structured working session, state the no-trade baseline, and review mutually acknowledged terms within seven days.",
].join(" ");

await mkdir(OUTPUT_DIR, { recursive: true });

const result = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  offerId: OFFER_ID,
  testEmail: TEST_EMAIL,
  injectedOfferSurfaceFix: INJECT_OFFER_SURFACE_FIX,
  stages: [],
  http5xx: [],
  consoleErrors: [],
  success: false,
};

function stage(name, details = {}) {
  result.stages.push({ at: new Date().toISOString(), name, ...details });
  console.log(`ACTIVATION_GATE_STAGE=${name}`);
}

async function saveResult() {
  result.finishedAt = new Date().toISOString();
  await writeFile(`${OUTPUT_DIR}/result.json`, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: false,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

page.on("response", (response) => {
  if (response.status() >= 500) {
    result.http5xx.push({ status: response.status(), url: response.url() });
  }
});
page.on("console", (message) => {
  if (message.type() === "error") {
    const text = message.text();
    if (!text.includes("Auth session missing")) {
      result.consoleErrors.push(text.slice(0, 500));
    }
  }
});

async function hasOnboardingForm() {
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" });
  return (await page.locator('form input[name="primary_goal"]').count()) > 0;
}

async function attemptLogin() {
  await page.goto(`${BASE_URL}/login?returnTo=%2Fonboarding&method=email`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in with Email" }).click();
  await page.waitForTimeout(1800);
  return hasOnboardingForm();
}

async function elementState(locator) {
  return locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      contentVisibility: style.contentVisibility,
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  });
}

try {
  stage("signup_page_open");
  await page.goto(`${BASE_URL}/signup?returnTo=%2Fonboarding&method=email`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Create your Moral Trade account" }).waitFor();
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  stage("signup_submit");
  await page.getByRole("button", { name: "Create account with Email" }).click();
  await page.waitForTimeout(2200);
  console.log(`ACTIVATION_TEST_EMAIL=${TEST_EMAIL}`);
  const signupBanners = (await page.locator(".status-banner").allTextContents())
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  stage("signup_submitted", { banners: signupBanners, url: page.url() });

  let authenticated = await hasOnboardingForm();
  if (!authenticated) {
    stage("signup_requires_followup_login");
    console.log("ACTIVATION_GATE_CONFIRMATION_OR_LOGIN_REQUIRED=true");
    for (let attempt = 1; attempt <= 30 && !authenticated; attempt += 1) {
      await page.waitForTimeout(attempt === 1 ? 5_000 : 20_000);
      try {
        authenticated = await attemptLogin();
      } catch (error) {
        if (attempt % 5 === 0) {
          console.log(`ACTIVATION_GATE_LOGIN_RETRY=${attempt}`);
          console.log(
            `ACTIVATION_GATE_LOGIN_RETRY_ERROR=${error instanceof Error ? error.message.slice(0, 300) : "unknown"}`,
          );
        }
      }
    }
  }

  if (!authenticated) {
    throw new Error("Fresh account could not reach the authenticated onboarding form within 10 minutes.");
  }
  stage("authenticated_onboarding_open", { url: page.url() });

  await page.locator('input[name="invite_target"]').fill(
    "Activation Gate Test — structured cross-view working session",
  );
  await page.locator('input[name="referral_source"]').fill(
    "Internal activation gate 2026-07-15 — exclude from participant metrics",
  );
  await page.getByRole("button", { name: "Save and start" }).click();
  await page.waitForTimeout(2200);

  const onboardingError = await page
    .locator(".status-banner-error")
    .allTextContents()
    .catch(() => []);
  if (onboardingError.length) {
    throw new Error(`Onboarding returned an error: ${onboardingError.join(" ")}`);
  }
  if (page.url().includes("/onboarding")) {
    throw new Error("Onboarding did not route to the selected first action.");
  }
  stage("onboarding_complete", { routedTo: page.url() });

  await page.goto(`${BASE_URL}${OFFER_PATH}`, { waitUntil: "domcontentloaded" });
  if (INJECT_OFFER_SURFACE_FIX) {
    await page.addStyleTag({
      content: `
        .marketplace-app-shell > header.hero + main#main-content > .section { display: block; }
        .marketplace-app-shell > header.hero + main#main-content > .marketplace-detail-section { display: grid; }
      `,
    });
    stage("proposed_offer_surface_fix_injected");
  }

  const respondSection = page.locator("#respond");
  await respondSection.waitFor({ state: "attached" });
  const offerTextContent = (await page.locator("main").textContent()) ?? "";
  if (!offerTextContent.includes("45-minute structured working session")) {
    throw new Error("Structured cross-view working-session terms were not present in the offer DOM.");
  }

  const respondBeforeScroll = await elementState(respondSection);
  await respondSection.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1600);
  const respondAfterScroll = await elementState(respondSection);

  const messageField = respondSection.locator('textarea[name="message"]').first();
  await messageField.scrollIntoViewIfNeeded();
  await messageField.waitFor({ state: "visible" });
  stage("structured_offer_open", {
    respondBeforeScroll,
    respondAfterScroll,
    url: page.url(),
  });

  const responseForm = messageField.locator("xpath=ancestor::form[1]");
  await messageField.fill(MESSAGE);
  await responseForm.getByRole("button", { name: "Express interest" }).click();
  await page.waitForTimeout(2500);

  const responseStatus = page.locator(".status-chip-row").getByText(/Your response is/i).first();
  await responseStatus.scrollIntoViewIfNeeded();
  await responseStatus.waitFor({ state: "visible" });
  const responseStatusText = (await responseStatus.textContent())?.trim() ?? "";
  if (!/interested|accepted|pending/i.test(responseStatusText)) {
    throw new Error(`Unexpected response status: ${responseStatusText}`);
  }
  stage("substantive_response_recorded", {
    responseStatus: responseStatusText,
    url: page.url(),
  });

  result.success = true;
  stage("browser_activation_gate_passed");
  await page.screenshot({
    path: `${OUTPUT_DIR}/final-offer-response.png`,
    fullPage: true,
  });
} catch (error) {
  result.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("ACTIVATION_GATE_FAILURE", result.failure);
  await page
    .screenshot({ path: `${OUTPUT_DIR}/failure.png`, fullPage: true })
    .catch(() => undefined);
  process.exitCode = 1;
} finally {
  await saveResult();
  await context.close();
  await browser.close();
}
