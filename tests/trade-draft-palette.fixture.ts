import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

// The seven-step authenticated builder, mounted in a read-only local fixture.
// Scope field labels to the active article: progress markers reuse step names.
// This deliberately does not exercise the separate four-step /create surface.
const headings = [
  "What priorities are being exchanged?",
  "What will you do?",
  "What will the other participant do?",
  "What happens without the trade?",
  "When does this trade happen?",
  "What evidence will show completion?",
  "Review the complete record.",
];
const terms = {
  offered: "Neighborhood green-space restoration",
  requested: "Community access to science books",
  action: "Restore two raised garden beds with the community group.",
  reciprocal: "Catalog twelve donated science books at the community library.",
  baseline: "Both groups keep their existing schedules without these extra activities.",
  duration: "Four Saturday sessions",
  evidence: "A dated activity log shared privately with the assigned reviewer.",
  privacy: "Activity logs and identities stay private. Only safe completion metadata may be public.",
  exit: "Either person may end future sessions by privately notifying the other person.",
  notes: "Fixture example only. No invitation, agreement, payment, or real data write.",
};
const runtimeErrors = new WeakMap<Page, string[]>();

async function openFixture(page: Page, scenario = "empty") {
  await page.goto(`/trades/new?scenario=${scenario}`);
  await expect(page).toHaveTitle("Trade builder palette fixture");
  await expect(page).toHaveURL(new RegExp(`/trades/new\\?scenario=${scenario}$`));
  await expect(page.getByRole("heading", { name: headings[0], exact: true })).toBeVisible();
  await expect(page.locator("article").getByLabel(/^Priority you advance/)).toHaveAttribute("data-mt-autocomplete-ready", "true");
  await expect(page.locator("nextjs-portal, #webpack-dev-server-client-overlay")).toHaveCount(0);
}

async function expectStep(page: Page, index: number) {
  await expect(page.getByRole("heading", { name: headings[index], exact: true })).toBeVisible();
  await expect(page.getByText(`Step ${index + 1} / 7 · Build`, { exact: true })).toBeVisible();
  await expect(page.locator('[aria-label="Draft progress"] i')).toHaveCount(7);
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator('[class*="ghostCard"]')).toHaveCount(0);
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    article: document.querySelector("article")!.scrollWidth,
    card: document.querySelector("article")!.clientWidth,
  }));
  expect(widths.page, "No horizontal page overflow").toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.article, "No clipped card fields").toBeLessThanOrEqual(widths.card + 1);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string, fullPage = true, dismissSuggestions = true) {
  if (dismissSuggestions) await page.keyboard.press("Escape");
  if (fullPage) {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector("article")?.scrollTo(0, 0);
    });
  }
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

// Input assist can enhance these textareas into comboboxes after focus. The
// accessible name excludes a controlled textarea's initial text content.
function textControl(page: Page, name: string) {
  const article = page.locator("article");
  return article.getByRole("textbox", { name, exact: true })
    .or(article.getByRole("combobox", { name, exact: true }));
}

async function clickOutsideSuggestions(page: Page, control: Locator) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await control.click();
}

async function navigateStep(page: Page, name: "Next" | "Back") {
  await clickOutsideSuggestions(page, page.getByRole("button", { name, exact: true }));
}

async function goToReview(page: Page) {
  for (let step = 1; step < headings.length; step += 1) {
    await navigateStep(page, "Next");
    await expectStep(page, step);
  }
}

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Unsupported computed color: ${color}`);
  const linear = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function expectTextContrast(locator: Locator, minimum = 4.5) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(contrast(colors.color, colors.background), JSON.stringify(colors)).toBeGreaterThanOrEqual(minimum);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(message.text());
  });
  await page.clock.setFixedTime(new Date("2031-01-02T12:00:00Z"));
  // Even an accidentally introduced production request must fail closed.
  await page.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:3247" || !["GET", "HEAD"].includes(request.method())) {
      errors.push(`Blocked unexpected request: ${request.method()} ${url.origin}${url.pathname}`);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), "No browser errors, warnings, or external/write requests").toEqual([]);
});

test("all seven steps preserve terms, validate omissions, and gate in-memory submission", async ({ page }, testInfo) => {
  await openFixture(page);
  const next = page.getByRole("button", { name: "Next", exact: true });
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toBeDisabled();
  await expectStep(page, 0);
  await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(244, 246, 248)");
  await expect(page.locator("article")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("form > header")).toHaveCSS("background-color", "rgb(32, 39, 51)");
  await expect(page.locator("form > footer")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expectTextContrast(next);
  await expect(next).toHaveCSS("background-color", "rgb(49, 87, 183)");
  await expectTextContrast(back);
  await expect(page.locator("article input").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await screenshot(page, testInfo, "step-1-empty");

  await navigateStep(page, "Next");
  await expect(page.getByRole("alert")).toHaveText("Name both priorities before continuing.");
  await expectTextContrast(page.getByRole("alert"));
  await screenshot(page, testInfo, "step-1-validation");
  await page.locator("article").getByLabel(/^Priority you advance/).fill(terms.offered);
  await page.locator("article").getByLabel(/^Priority you want advanced/).fill(terms.requested);
  await navigateStep(page, "Next");
  await expectStep(page, 1);
  await navigateStep(page, "Back");
  await expect(page.locator("article").getByLabel(/^Priority you advance/)).toHaveValue(terms.offered);
  await expect(page.locator("article").getByLabel(/^Priority you want advanced/)).toHaveValue(terms.requested);
  await navigateStep(page, "Next");

  for (const [step, label, value, error] of [
    [1, /^Your commitment/, terms.action, "State the concrete action you are willing to take."],
    [2, /^Counterparty commitment/, terms.reciprocal, "State the concrete action requested from the other participant."],
    [3, /^No-trade baseline/, terms.baseline, "Describe what both sides would actually do without this trade."],
  ] as const) {
    await expectStep(page, step);
    await navigateStep(page, "Next");
    await expect(page.getByRole("alert")).toHaveText(error);
    await page.locator("article").getByLabel(label).fill(value);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await screenshot(page, testInfo, `step-${step + 1}-filled`);
    await navigateStep(page, "Next");
    await navigateStep(page, "Back");
    await expect(page.locator("article").getByLabel(label)).toHaveValue(value);
    await navigateStep(page, "Next");
  }

  await expectStep(page, 4);
  await expect(page.getByRole("button", { name: "Set a stricter limit" })).toBeDisabled();
  await navigateStep(page, "Next");
  await expect(page.getByRole("alert")).toHaveText("Add the duration and commitment limit before continuing.");
  await page.locator("article").getByLabel(/^Duration/).fill(terms.duration);
  await page.locator("article").getByLabel("Start date", { exact: true }).fill("2031-01-15");
  await page.locator("article").getByLabel("Evidence due", { exact: true }).fill("2031-02-15");
  await clickOutsideSuggestions(page, page.getByRole("button", { name: "Set a stricter limit" }));
  await textControl(page, "Stricter commitment limit").fill("A maximum of two hours at each session; no additional work.");
  await screenshot(page, testInfo, "step-5-custom-limit");
  await navigateStep(page, "Next");
  await navigateStep(page, "Back");
  await expect(page.locator("article").getByLabel(/^Duration/)).toHaveValue(terms.duration);
  await expect(page.locator("article").getByLabel("Start date", { exact: true })).toHaveValue("2031-01-15");
  await expect(page.locator("article").getByLabel("Evidence due", { exact: true })).toHaveValue("2031-02-15");
  await expect(textControl(page, "Stricter commitment limit")).toHaveValue("A maximum of two hours at each session; no additional work.");
  await clickOutsideSuggestions(page, page.getByRole("button", { name: "Use the generated limit" }));
  await expect(page.locator('input[name="maximum_burden"]')).toHaveValue(new RegExp(`Limited to these two commitments for ${terms.duration}`));
  await navigateStep(page, "Next");

  await expectStep(page, 5);
  await navigateStep(page, "Next");
  await expect(page.getByRole("alert")).toHaveText("Add the evidence and privacy scope before continuing.");
  await page.locator('textarea[data-mt-autocomplete="evidence"]').fill(terms.evidence);
  await textControl(page, "Evidence privacy and public metadata").fill("");
  await navigateStep(page, "Next");
  await expect(page.getByRole("alert")).toHaveText("Add the evidence and privacy scope before continuing.");
  await textControl(page, "Evidence privacy and public metadata").fill(terms.privacy);
  await screenshot(page, testInfo, "step-6-evidence");
  await navigateStep(page, "Next");
  await navigateStep(page, "Back");
  await expect(page.locator('textarea[data-mt-autocomplete="evidence"]')).toHaveValue(terms.evidence);
  await expect(textControl(page, "Evidence privacy and public metadata")).toHaveValue(terms.privacy);
  await navigateStep(page, "Next");

  await expectStep(page, 6);
  const save = page.getByRole("button", { name: "Save private draft", exact: true });
  const submit = page.getByRole("button", { name: "Submit for review", exact: true });
  await expect(save).toBeDisabled();
  await expect(submit).toBeDisabled();
  await expectTextContrast(submit);
  await expect(submit).toHaveCSS("background-color", "rgb(237, 240, 244)");
  await page.locator("article").getByLabel(/^Exit conditions/).fill(terms.exit);
  await textControl(page, "Context or constraints (optional)").fill(terms.notes);
  await expect(save).toBeEnabled();
  await expect(submit).toBeDisabled();
  await expect(page.locator("article dl")).toContainText(terms.action);
  await expect(page.locator("article dl")).toContainText(terms.reciprocal);
  await screenshot(page, testInfo, "step-7-review");
  const certification = page.getByRole("checkbox", { name: /^This proposal is voluntary/ });
  await certification.check();
  await expect(submit).toBeEnabled();
  await certification.scrollIntoViewIfNeeded();
  await screenshot(page, testInfo, "step-7-certification", false);
  await navigateStep(page, "Back");
  await navigateStep(page, "Next");
  await expect(page.locator("article").getByLabel(/^Exit conditions/)).toHaveValue(terms.exit);
  await expect(textControl(page, "Context or constraints (optional)")).toHaveValue(terms.notes);
  await expect(certification).toBeChecked();
  await clickOutsideSuggestions(page, submit);
  await expect(page.getByRole("button", { name: "Submitting for review...", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Saving private draft...", exact: true })).toBeDisabled();
  await screenshot(page, testInfo, "step-7-pending", false);
  const submissions = await page.evaluate(() => window.__tradeDraftFixture.submissions);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    submission_key: "palette-fixture-only",
    offered_cause: terms.offered,
    requested_cause: terms.requested,
    proposed_action: terms.action,
    requested_action: terms.reciprocal,
    no_trade_baseline: terms.baseline,
    duration: terms.duration,
    start_date: "2031-01-15",
    evidence_due_date: "2031-02-15",
    evidence_rule: terms.evidence,
    privacy_scope: terms.privacy,
    exit_conditions: terms.exit,
    notes: terms.notes,
    voluntary_certification: "on",
    intent: "submit",
  });
  await page.evaluate(() => window.__tradeDraftFixture.finishSave("success"));
  await expect(page.getByRole("status")).toHaveText("Successful fixture response. No real data was saved.");
  await expectTextContrast(page.getByRole("status"));
});

test("keyboard, focus, hover, field boundaries, and actual input suggestions remain usable", async ({ page }, testInfo) => {
  await openFixture(page);
  const offered = page.locator("article").getByLabel(/^Priority you advance/);
  await expect(offered).toBeFocused();
  await offered.fill("Animal");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await screenshot(page, testInfo, "priority-suggestions", false, false);
  await offered.press("ArrowDown");
  await offered.press("Enter");
  await expect(offered).not.toHaveValue("Animal");
  await page.keyboard.press("Tab");
  const requested = page.locator("article").getByLabel(/^Priority you want advanced/);
  await expect(requested).toBeFocused();
  await page.keyboard.press("Escape");
  const focus = await requested.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, border: style.borderColor };
  });
  expect(focus.outline).toBe("solid");
  expect(focus.color).toBe("rgb(49, 87, 183)");
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);
  expect(contrast(focus.color, "rgb(255, 255, 255)")).toBeGreaterThanOrEqual(3);
  await screenshot(page, testInfo, "keyboard-input-focus", false);
  await page.keyboard.press("Tab");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS("outline-style", "solid");
  await screenshot(page, testInfo, "keyboard-button-focus", false);
  await next.hover();
  await expect(next).toHaveCSS("background-color", "rgb(38, 70, 147)");
  await expectTextContrast(next);
  await screenshot(page, testInfo, "primary-button-hover", false);
  // Check unfocused border and placeholder contrast against the white field.
  const colors = await requested.evaluate((element) => ({
    border: getComputedStyle(element).borderColor,
    placeholder: getComputedStyle(element, "::placeholder").color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(contrast(colors.border, colors.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(colors.placeholder, colors.background)).toBeGreaterThanOrEqual(4.5);
});

test("command handoff is neutral and explicitly unsaved", async ({ page }, testInfo) => {
  await openFixture(page, "command");
  const message = page.getByRole("status");
  await expect(message).toContainText("No draft has been saved yet.");
  await expect(message).toHaveCSS("background-color", "rgb(238, 243, 255)");
  await expect(message).toHaveCSS("color", "rgb(52, 74, 112)");
  await expectTextContrast(message);
  await expect(page.locator("article").getByLabel(/^Priority you advance/)).toHaveValue(terms.offered);
  expect(await page.evaluate(() => sessionStorage.getItem("moral-trade.command-center.handoff.v1"))).toBeNull();
  expect(await page.evaluate(() => window.__tradeDraftFixture.submissions)).toEqual([]);
  await expectStep(page, 0);
  await screenshot(page, testInfo, "command-loaded-unsaved");
  for (const step of [1, 2]) {
    await navigateStep(page, "Next");
    await expectStep(page, step);
  }
  await expect(page.locator("article").getByLabel(/^Counterparty commitment/)).toHaveValue(terms.reciprocal);
  await expect(message).toContainText("No draft has been saved yet.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, testInfo, "command-loaded-step-3-reference", false);
});

test("template notice is neutral and unresolved terms still block progress", async ({ page }, testInfo) => {
  await openFixture(page, "template");
  const message = page.getByRole("status");
  await expect(message).toHaveText("Fixture template loaded as an editable starting point. Review every field before saving or submitting.");
  await expect(message).toHaveCSS("background-color", "rgb(238, 243, 255)");
  await expectTextContrast(message);
  await navigateStep(page, "Next");
  await expect(page.getByRole("alert")).toContainText("Replace every [Replace: ...] template prompt");
  await expectStep(page, 0);
  await screenshot(page, testInfo, "template-needs-review");
  await page.locator("article").getByLabel(/^Priority you advance/).fill(terms.offered);
  await navigateStep(page, "Next");
  await expectStep(page, 1);
});

test("unavailable handoff keeps the no-draft error message", async ({ page }, testInfo) => {
  await openFixture(page, "unavailable");
  const message = page.getByRole("alert");
  await expect(message).toHaveText("The command could not be restored. Enter the terms below. No draft was created.");
  await expect(message).toHaveCSS("background-color", "rgb(255, 243, 243)");
  await expectTextContrast(message);
  await screenshot(page, testInfo, "command-unavailable-error");
});

for (const scenario of ["success", "error"] as const) {
  test(`${scenario} formMessage has its own readable semantic treatment`, async ({ page }, testInfo) => {
    await openFixture(page, scenario);
    const message = page.getByRole("status");
    await expect(message).toContainText("No real data was saved.");
    await expect(message).toHaveCSS("color", scenario === "success" ? "rgb(36, 98, 69)" : "rgb(155, 52, 52)");
    await expect(message).toHaveCSS("background-color", scenario === "success" ? "rgb(237, 247, 241)" : "rgb(255, 243, 243)");
    await expectTextContrast(message);
    await screenshot(page, testInfo, `form-message-${scenario}`);
  });
}

test("source context, imported confirmations, and duplicate acknowledgement remain enforced", async ({ page }, testInfo) => {
  await openFixture(page, "source");
  const source = page.getByRole("region", { name: "Feed source context" });
  await expect(source).toContainText("Nothing has been sent");
  await expect(source).toContainText("Fixture terms match");
  await expect(source.getByRole("link", { name: "View original" })).toHaveAttribute("href", "/offers/fixture-source");
  await expect(source).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expectStep(page, 0);
  await screenshot(page, testInfo, "source-context");
  await goToReview(page);
  const save = page.getByRole("button", { name: "Save private draft", exact: true });
  const submit = page.getByRole("button", { name: "Submit for review", exact: true });
  await expect(save).toBeDisabled();
  const review = page.getByRole("region", { name: "Confirm each material field separately." });
  const reviews = review.getByRole("checkbox");
  await expect(reviews).toHaveCount(8);
  for (let index = 0; index < 7; index += 1) await reviews.nth(index).check();
  await expect(save).toBeDisabled();
  await reviews.nth(7).check();
  await expect(save).toBeEnabled();
  await expect(submit).toBeDisabled();
  await review.scrollIntoViewIfNeeded();
  await screenshot(page, testInfo, "source-imported-review", false);

  // Editing one imported field revokes only that field's stored confirmation.
  await navigateStep(page, "Back");
  await page.locator('textarea[data-mt-autocomplete="evidence"]').fill("An updated private activity log for the assigned reviewer.");
  await navigateStep(page, "Next");
  await expect(review.getByRole("checkbox", { name: /^Evidence requirements/ })).not.toBeChecked();
  await expect(review.getByRole("checkbox", { name: /^Duration/ })).toBeChecked();
  await expect(save).toBeDisabled();
  await review.getByRole("checkbox", { name: /^Evidence requirements/ }).check();
  await clickOutsideSuggestions(page, save);
  await expect(page.getByRole("button", { name: "Saving private draft...", exact: true })).toBeDisabled();
  const submissions = await page.evaluate(() => window.__tradeDraftFixture.submissions);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    intent: "draft",
    source_opportunity_id: "fixture-source",
    source_terms_version: "3",
    duplicate_acknowledged: "true",
    review_evidence_rule: "true",
  });
  expect(submissions[0]).not.toHaveProperty("voluntary_certification");
  expect(Object.keys(submissions[0]).some((key) => /reason|score|match/.test(key))).toBe(false);
  await page.evaluate(() => window.__tradeDraftFixture.finishSave("error"));
  await expect(page.getByRole("status").filter({ hasText: "Failed fixture response" })).toBeVisible();
  await expect(save).toBeEnabled();
});
