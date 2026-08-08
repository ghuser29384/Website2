import {
  expect,
  test,
  type FrameLocator,
  type Page,
} from "@playwright/test";

test.setTimeout(90_000);

function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function openCurrentCreate(page: Page): Promise<FrameLocator> {
  await page.goto("/moral-trade-live.html#trade", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/trades\/new(?:[?#]|$)/, {
    timeout: 30_000,
  });
  await expect(page).toHaveTitle(/Moral Trade/i);

  const iframe = page.locator('iframe[title="Moral Trade Create"]');
  await expect(iframe).toBeVisible({ timeout: 30_000 });
  const create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.locator("body")).toBeVisible({ timeout: 30_000 });
  return create;
}

async function reachCommitmentRequest(page: Page) {
  const create = await openCurrentCreate(page);
  const cause = create
    .locator("button.cause-choice")
    .filter({ hasText: "Wild animal suffering" });
  await expect(cause).toHaveCount(1);
  await cause.click();

  await expect(
    create.getByRole("heading", {
      name: "What do you want other people to do?",
    }),
  ).toBeVisible({ timeout: 10_000 });

  const commitment = create
    .locator("button.request-choice")
    .filter({ hasText: "Commitment" });
  await expect(commitment).toHaveCount(1);
  await commitment.click();

  const input = create.locator("#requestActionInput");
  const list = create.locator("#actionSuggestions");
  await expect(input).toBeVisible({ timeout: 10_000 });
  return { create, input, list };
}

test("the retired Trade entry exposes the current ranked action autocomplete", async ({
  page,
}, testInfo) => {
  const runtimeErrors = captureRuntimeErrors(page);
  const { create, input, list } = await reachCommitmentRequest(page);

  await expect(create.locator(".clause")).toHaveCount(0);
  await expect(
    create.locator('.token[contenteditable="true"]'),
  ).toHaveCount(0);
  await expect(create.locator("[data-mt-offer-type]")).toHaveCount(0);

  await expect(input).toHaveAttribute("role", "combobox");
  await expect(input).toHaveAttribute("aria-autocomplete", "list");
  await expect(input).toHaveAttribute("aria-controls", "actionSuggestions");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(input).toHaveAttribute(
    "placeholder",
    "e.g. Not eat meat for one meal",
  );
  await expect(list).toHaveAttribute("role", "listbox");
  await expect(list).toHaveAttribute("aria-label", "Suggested actions");
  await expect(list).toBeVisible();
  await expect(list.getByRole("option")).toHaveCount(7);

  await input.fill("read");
  await expect(list).toBeVisible();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  const options = list.getByRole("option");
  await expect(options).toHaveCount(2);
  await expect(
    list.locator(".suggestion-option > span:last-child"),
  ).toHaveText([
    "Read a 30-minute introduction to wild animal suffering",
    "Read a short introduction to Wild animal suffering",
  ]);

  await page.screenshot({
    path: testInfo.outputPath("current-action-autocomplete-open.png"),
    fullPage: true,
  });

  await options.nth(1).click();
  await expect(input).toHaveValue(
    "Read a short introduction to Wild animal suffering",
  );
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await expect(create.locator("#continueRequest")).toBeEnabled();
  expect(runtimeErrors).toEqual([]);
});

test("keyboard selection and dismissal remain inside the request step", async ({
  page,
}, testInfo) => {
  const runtimeErrors = captureRuntimeErrors(page);
  const { create, input, list } = await reachCommitmentRequest(page);

  await input.fill("read");
  await expect(list).toBeVisible();
  const options = list.getByRole("option");
  await input.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(input).toHaveValue(
    "Read a 30-minute introduction to wild animal suffering",
  );
  await expect(list).toBeHidden();

  await input.fill("spend");
  await expect(list).toBeVisible();
  await input.press("Escape");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("spend");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await expect(create.locator("#screenRequest")).toHaveClass(/active/);
  await expect(
    create.getByRole("heading", {
      name: "What do you want other people to do?",
    }),
  ).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("escape-keeps-request-step.png"),
    fullPage: true,
  });

  await input.fill("read");
  await expect(list).toBeVisible();
  await create.locator("#requestHeading").click();
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("read");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await expect(create.locator("#screenRequest")).toHaveClass(/active/);
  expect(runtimeErrors).toEqual([]);
});

test("the mobile current flow reaches the six-type contribution palette without overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = captureRuntimeErrors(page);
  const { create, input, list } = await reachCommitmentRequest(page);

  await input.fill("read");
  await expect(list).toBeVisible();
  await list.getByRole("option").first().click();
  const continueButton = create.locator("#continueRequest");
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(
    create.getByRole("heading", { name: "What could you offer?" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(create.locator(".offer-choice strong")).toHaveText([
    "Money",
    "Time",
    "A behavior change",
    "Skilled work",
    "An introduction",
    "Support another cause",
  ]);
  await expect(create.locator("[data-mt-offer-type]")).toHaveCount(0);

  await create
    .locator("button.offer-choice")
    .filter({ hasText: "A behavior change" })
    .click();
  await create
    .locator("button.offer-choice")
    .filter({ hasText: "Skilled work" })
    .click();
  await expect(create.locator("#offerCount")).toHaveText(
    "2 types selected",
  );
  await expect(create.locator("#continueOffers")).toBeEnabled();

  const frameDimensions = await create.locator("body").evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(frameDimensions.clientWidth).toBe(frameDimensions.innerWidth);
  expect(frameDimensions.scrollWidth).toBeLessThanOrEqual(
    frameDimensions.innerWidth + 1,
  );

  const outerDimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(outerDimensions.clientWidth).toBe(outerDimensions.innerWidth);
  expect(outerDimensions.scrollWidth).toBeLessThanOrEqual(
    outerDimensions.innerWidth + 1,
  );

  await page.screenshot({
    path: testInfo.outputPath("mobile-current-contribution-palette.png"),
    fullPage: true,
  });
  expect(runtimeErrors).toEqual([]);
});
