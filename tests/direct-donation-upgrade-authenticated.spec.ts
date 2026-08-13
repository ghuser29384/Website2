import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.DIRECT_UPGRADE_RENDERED_BASE_URL ?? "http://127.0.0.1:3211";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_EMAIL = "direct-upgrade-rendered-creator@qa.invalid";
const QA_PASSWORD = process.env.DIRECT_UPGRADE_RENDERED_QA_PASSWORD ?? "";
const PROPOSER_DETAIL_FIXTURE_ID = "d2000000-0000-4000-8000-000000000002";
const CREATOR_DETAIL_FIXTURE_ID = "d3000000-0000-4000-8000-000000000003";
const EXPIRED_DETAIL_FIXTURE_ID = "d4000000-0000-4000-8000-000000000004";
const REVISION_DETAIL_FIXTURE_ID = "d5000000-0000-4000-8000-000000000005";
const ACCEPTED_REVISION_FIXTURE_ID = "d5100000-0000-4000-8000-000000000051";
const SAFE_BROWSER_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
] as const;

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
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed: ${error?.message ?? "no session"}`);
  }
  return data.session;
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
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
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "Lax" as const,
  }));
}

async function authenticatedContext(
  browser: Browser,
  session: Session,
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: BASE_URL.startsWith("https://"),
      sameSite: "Lax",
    },
  ]);
  return context;
}

async function chooseRecipient(page: Page, legend: string, query: string, result: string) {
  const fieldset = page.getByRole("group", { name: legend, exact: true });
  await expect(fieldset).toHaveCount(1);
  const search = fieldset.getByRole("searchbox", {
    name: "Search by nonprofit name, slug, or EIN",
  });
  await search.fill(query);
  const choice = fieldset.getByRole("option", {
    name: `Select ${result}`,
    exact: true,
  });
  await expect(choice).toBeVisible({ timeout: 20_000 });
  await choice.click();
  await expect(fieldset.getByRole("heading", { name: result, exact: true })).toBeVisible();
}

function splitValue(page: Page, label: string) {
  const splitFieldset = page.getByRole("group", {
    name: "How much of your planned donation moves?",
    exact: true,
  });
  return splitFieldset
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd");
}

async function expectSplitPreview(
  page: Page,
  expected: {
    matcher: string;
    redirected: string;
    retained: string;
    share: string;
  },
) {
  await expect(splitValue(page, "Stays with the original recipient")).toHaveText(
    expected.retained,
  );
  await expect(splitValue(page, "Moves to the upgraded recipient")).toHaveText(
    expected.redirected,
  );
  await expect(splitValue(page, "Redirected share")).toHaveText(expected.share);
  await expect(splitValue(page, "Matcher adds")).toHaveText(expected.matcher);
}

function prohibitedBrowserRequest(method: string, rawUrl: string) {
  const normalizedMethod = method.toUpperCase();
  const url = new URL(rawUrl);
  const providerHost =
    /(^|\.)stripe\.com$/i.test(url.hostname) ||
    /(^|\.)every\.org$/i.test(url.hostname);
  const sensitiveApplicationPath =
    /^\/api\/(?:connectors\/every-org|jobs\/donation-upgrades|stripe)(?:\/|$)/i.test(
      url.pathname,
    );

  if (!SAFE_BROWSER_METHODS.has(normalizedMethod)) return "mutation";
  if (providerHost) return "payment-or-donation-provider";
  if (sensitiveApplicationPath) return "webhook-or-payment-endpoint";
  return "";
}

async function moveRangeInput(page: Page, value: string) {
  const slider = page.getByRole("slider", {
    name: "Redirect percentage slider",
    exact: true,
  });
  await slider.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function expectNoHorizontallyClippedControls(page: Page) {
  const clippedControls = await page
    .locator("input, select, textarea, button")
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        if (!visible || (rect.left >= -1 && rect.right <= window.innerWidth + 1)) return [];
        return [
          `${element.tagName.toLowerCase()}[name="${
            element.getAttribute("name") ?? ""
          }"]:${Math.round(rect.left)}..${Math.round(rect.right)}`,
        ];
      }),
    );
  expect(clippedControls).toEqual([]);
}

async function expectStableResponsivePage(page: Page) {
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
  await expectNoHorizontallyClippedControls(page);
}

async function exerciseNoChargeForm(
  context: BrowserContext,
  viewportName: "desktop" | "mobile",
) {
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const prohibitedRequests: string[] = [];
  let caughtFailure: unknown;

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.type() === "warning") consoleWarnings.push(message.text());
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const reason = prohibitedBrowserRequest(request.method(), request.url());
    if (reason) {
      prohibitedRequests.push(`${reason}: ${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  try {
    await page.goto("/trades/new");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Create/);
    await expect(page).toHaveURL(/\/trades\/new$/);
    const createFrame = page.frameLocator('iframe[title="Moral Trade Create"]');
    await createFrame.getByRole("button", { name: "Future flourishing" }).click();
    await createFrame.locator('[data-request-kind="fund"]').click();
    await createFrame.locator('[data-fund-mode="conditional"]').click();
    await expect(
      createFrame.getByRole("link", { name: "Managed conditional donation →" }),
    ).toHaveAttribute("href", "/trades/new?structure=conditional-donation");
    await Promise.all([
      page.waitForURL(
        /\/trades\/new\?structure=conditional-donation&rail=direct$/,
      ),
      createFrame
        .getByRole("button", { name: "Set up direct Donation Upgrade →" })
        .click(),
    ]);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/Create/);
    await expect(page).toHaveURL(
      /\/trades\/new\?structure=conditional-donation&rail=direct$/,
    );
    await expect(
      page.getByRole("heading", {
        name: "Turn a planned donation into a larger donation to a more effective recipient.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Commit and publish", { exact: true })).toBeVisible();
    await expect(page.getByText("Authorize and publish", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/No card or bank information is collected now\./)).toBeVisible();
    await expect(
      page.getByText(/first eligible matcher who accepts the exact published terms becomes primary/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        "With a match: no retained creator obligation is created; $10.00 moves to GiveWell Top Charities Fund; the matcher adds $15.00 there.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByText(/\$0\.00 (?:stays|remains) with/)).toHaveCount(0);

    const creatorAmount = page.locator('input[name="creator_amount"]');
    const matcherAmount = page.locator('input[name="matcher_amount"]');
    const redirectPercentage = page.locator('input[name="redirect_percentage"]');
    await expect(creatorAmount).toHaveValue("10.00");
    await expect(matcherAmount).toHaveValue("10.00");
    await expect(redirectPercentage).toHaveValue("100");
    await creatorAmount.fill("12.00");
    await expectSplitPreview(page, {
      retained: "$0.00 — no retained obligation",
      redirected: "$12.00",
      share: "100%",
      matcher: "$10.00",
    });
    await creatorAmount.fill("10.00");
    await expectSplitPreview(page, {
      retained: "$0.00 — no retained obligation",
      redirected: "$10.00",
      share: "100%",
      matcher: "$10.00",
    });

    await matcherAmount.fill("0.50");
    await expect(matcherAmount).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "The matcher donation must be between $1.00 and $50,000.00.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(splitValue(page, "Matcher adds")).toHaveText(
      "Enter $1.00 to $50,000.00",
    );
    await matcherAmount.fill("10.00");
    await expect(matcherAmount).not.toHaveAttribute("aria-invalid", "true");

    await moveRangeInput(page, "20");
    await expect(redirectPercentage).toHaveValue("20");
    await expectSplitPreview(page, {
      retained: "$8.00",
      redirected: "$2.00",
      share: "20%",
      matcher: "$10.00",
    });

    await redirectPercentage.fill("100");
    await expectSplitPreview(page, {
      retained: "$0.00 — no retained obligation",
      redirected: "$10.00",
      share: "100%",
      matcher: "$10.00",
    });

    await redirectPercentage.fill("0.01");
    await expect(
      page.getByText("The redirected portion must be at least $1.00.", { exact: true }),
    ).toBeVisible();
    await redirectPercentage.fill("95");
    await expect(redirectPercentage).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "The portion remaining with the original recipient must be either $0.00 or at least $1.00.",
        { exact: true },
      ),
    ).toBeVisible();
    await redirectPercentage.fill("99.99");
    await expect(redirectPercentage).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "Only an exact 100% redirect may create no retained obligation.",
        { exact: true },
      ),
    ).toBeVisible();
    await redirectPercentage.fill("20");
    await expect(redirectPercentage).not.toHaveAttribute("aria-invalid", "true");
    await expectSplitPreview(page, {
      retained: "$8.00",
      redirected: "$2.00",
      share: "20%",
      matcher: "$10.00",
    });

    await chooseRecipient(
      page,
      "Original recipient",
      "Homeward Pet",
      "Homeward Pet Adoption Center",
    );
    await chooseRecipient(
      page,
      "Upgraded recipient",
      "GiveWell Top Charities Fund",
      "GiveWell Top Charities Fund",
    );

    const originalIdentifier = page.locator('input[name="original_recipient_identifier"]');
    const upgradedIdentifier = page.locator('input[name="upgraded_recipient_identifier"]');
    await expect(originalIdentifier).not.toHaveValue("");
    await expect(upgradedIdentifier).not.toHaveValue("");
    expect(await originalIdentifier.inputValue()).not.toBe(await upgradedIdentifier.inputValue());

    await page
      .locator('textarea[name="baseline_details"]')
      .fill(
        "I had budgeted this $10 local-charity donation before opening Moral Trade and planned to complete it this week.",
      );
    await page.locator('input[name="baseline_confirmed"]').check();

    const privacy = page.locator('select[name="privacy_mode"]');
    await expect(privacy).toHaveValue("public");
    await privacy.selectOption("private_until_completed");
    await expect(privacy).toHaveValue("private_until_completed");

    const submit = page.getByRole("button", { name: "Commit and publish", exact: true });
    await expect(submit).toBeEnabled();

    await expectStableResponsivePage(page);
    await page.screenshot({
      path: `direct-upgrade-rendered-${viewportName}-create.png`,
      fullPage: true,
    });

    await page.goto(`/donation-upgrades/${PROPOSER_DETAIL_FIXTURE_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Donation Upgrade/);
    await expect(page).toHaveURL(
      new RegExp(`/donation-upgrades/${PROPOSER_DETAIL_FIXTURE_ID}$`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Accept the current terms or send a binding counteroffer.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/submitting it records a binding advance commitment/i),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: /If selected, I will donate exactly \$15\.00 directly to GiveWell Top Charities Fund within seven days\. I accept the frozen 20% creator redirect\./,
      }),
    ).toBeVisible();
    const proposedPercentage = page.locator(
      'input[name="proposed_redirect_percentage"]',
    );
    const proposedMatcherAmount = page.locator(
      'input[name="proposed_matcher_amount"]',
    );
    await proposedPercentage.fill("99.99");
    await expect(proposedPercentage).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "Only an exact 100% redirect may create no retained obligation.",
        { exact: true },
      ),
    ).toBeVisible();
    await proposedPercentage.fill("40");
    await expect(proposedPercentage).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await proposedMatcherAmount.fill("25.00");
    await expect(
      page.getByText(
        "Proposed matched branch: $6.00 stays with the original recipient; $4.00 moves to the upgraded recipient; you add $25.00.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send counteroffer", exact: true }),
    ).toBeEnabled();
    await proposedMatcherAmount.fill("0.50");
    await expect(proposedMatcherAmount).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "The proposed matcher donation must be between $1.00 and $50,000.00.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByText(/^Proposed matched branch:/)).toHaveCount(0);
    await proposedMatcherAmount.fill("25.00");
    await expectStableResponsivePage(page);
    await page.screenshot({
      path: `direct-upgrade-rendered-${viewportName}-counteroffer.png`,
      fullPage: true,
    });

    await page.goto(`/donation-upgrades/${CREATOR_DETAIL_FIXTURE_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Donation Upgrade/);
    await expect(page).toHaveURL(
      new RegExp(`/donation-upgrades/${CREATOR_DETAIL_FIXTURE_ID}$`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Review exact alternative splits.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(/pending · QA Pending Proposer/i)).toBeVisible();
    await expect(page.getByText(/rejected · QA Rejected Proposer/i)).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Accept and create matched revision",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/This atomically cancels this revision as superseded/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Creator response: The creator kept the current split.",
        { exact: true },
      ),
    ).toBeVisible();
    await expectStableResponsivePage(page);
    await page.screenshot({
      path: `direct-upgrade-rendered-${viewportName}-creator-review.png`,
      fullPage: true,
    });

    await page.goto(`/donation-upgrades/${EXPIRED_DETAIL_FIXTURE_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Donation Upgrade/);
    await expect(page).toHaveURL(
      new RegExp(`/donation-upgrades/${EXPIRED_DETAIL_FIXTURE_ID}$`),
    );
    await expect(
      page.getByText(
        "The matching deadline has passed. This offer is awaiting its lifecycle update and cannot be accepted or negotiated.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Accept current terms", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Send counteroffer", exact: true }),
    ).toHaveCount(0);
    await expectStableResponsivePage(page);

    await page.goto(`/donation-upgrades/${REVISION_DETAIL_FIXTURE_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Donation Upgrade/);
    await expect(
      page.getByText(
        "no retained creator obligation is created; $10.00 moves to GiveWell Top Charities Fund.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Replaced by accepted terms", exact: true }),
    ).toHaveAttribute(
      "href",
      `/donation-upgrades/${ACCEPTED_REVISION_FIXTURE_ID}`,
    );
    await expect(
      page.getByRole("link", { name: "View accepted revision", exact: true }),
    ).toHaveAttribute(
      "href",
      `/donation-upgrades/${ACCEPTED_REVISION_FIXTURE_ID}`,
    );
    await expectStableResponsivePage(page);
    await page.screenshot({
      path: `direct-upgrade-rendered-${viewportName}-accepted-revision.png`,
      fullPage: true,
    });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(consoleWarnings).toEqual([]);
    expect(prohibitedRequests).toEqual([]);
  } catch (error) {
    caughtFailure = error;
    throw error;
  } finally {
    try {
      await page.screenshot({
        path: `direct-upgrade-rendered-${viewportName}.png`,
        fullPage: true,
      });
    } catch (screenshotError) {
      if (!caughtFailure) throw screenshotError;
    }
    await context.close();
  }

  // Deliberately stop here: no form submission, provider checkout, webhook, mandate, or payment.
}

test.describe("authenticated direct Donation Upgrade no-charge rendered smoke", () => {
  for (const scenario of VIEWPORTS) {
    test(`exercises the exact-cent split and no-charge form on ${scenario.name}`, async ({
      browser,
    }) => {
      test.setTimeout(4 * 60_000);
      test.skip(!QA_PASSWORD, "DIRECT_UPGRADE_RENDERED_QA_PASSWORD is required.");

      const session = await signIn();
      await exerciseNoChargeForm(
        await authenticatedContext(browser, session, scenario.viewport),
        scenario.name,
      );
    });
  }
});
