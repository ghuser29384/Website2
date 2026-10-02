import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.CREATE_ROUTE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "create-route-visual");
const existentialRiskPattern = /existential(?:-| )risk/i;

async function openCreate(page: import("@playwright/test").Page) {
  await page.goto("/trades/new");
  const create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(
    create.getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
  return create;
}

async function expectRequestTransitionClear(create: FrameLocator, expectedCause: string) {
  await expect(create.locator("#screenRequest")).toBeVisible();
  await expect(create.locator("#requestHeading")).toHaveText("What would you like help with?");
  await expect(create.locator("#requestCause")).toHaveText(expectedCause);

  await expect
    .poll(() =>
      create.locator("body").evaluate(() => {
        const requiredRect = (selector: string) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
          return element.getBoundingClientRect();
        };
        const header = requiredRect(".topbar");
        const heading = requiredRect("#requestHeading");
        const chosen = requiredRect(".chosen-strip");
        return (
          window.scrollY === 0
          && heading.top >= header.bottom + 16
          && chosen.top >= header.bottom + 16
        );
      }),
    )
    .toBe(true);

  const transition = await create.locator("body").evaluate(() => {
    const requiredRect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const value = element.getBoundingClientRect();
      return { top: value.top, bottom: value.bottom };
    };
    return {
      scrollY: window.scrollY,
      header: requiredRect(".topbar"),
      heading: requiredRect("#requestHeading"),
      chosen: requiredRect(".chosen-strip"),
    };
  });

  expect(transition.scrollY).toBe(0);
  expect(transition.heading.top).toBeGreaterThanOrEqual(transition.header.bottom + 16);
  expect(transition.chosen.top).toBeGreaterThanOrEqual(transition.header.bottom + 16);
  return transition;
}

async function chooseExistentialRisk(create: FrameLocator) {
  const causeButton = create.locator('.cause-choice[data-cause="Existential risk"]');
  await causeButton.scrollIntoViewIfNeeded();
  await causeButton.click();
  await expectRequestTransitionClear(create, "Existential risk");
  return causeButton;
}

async function chooseExistentialRiskSkill(create: FrameLocator) {
  const causeButton = await chooseExistentialRisk(create);
  await create.locator('[data-request-kind="skill"]').click();
  await expect(create.locator("#requestActionInput")).toBeFocused();
  await expect(create.locator("#actionSuggestions")).toBeVisible();
  return causeButton;
}

async function openContributionChoice(page: Page) {
  const create = await openCreate(page);
  await create.getByRole("button", { name: "Building altruism", exact: true }).click();
  await create.locator('[data-request-kind="commitment"]').click();
  await create.locator("#requestActionInput").fill("Read one introduction to building altruism");
  await create.locator("#continueRequest").click();
  await expect(create.locator("#offerHeading")).toHaveText("How would you like to contribute?");
  await expect(create.locator("#offerSelectView")).toBeVisible();
  return create;
}

function contributionField(create: FrameLocator, type: string, index: number, field: string) {
  return create.locator(
    `[data-offer-entry-block][data-offer-id="${type}"][data-entry-index="${index}"] [data-offer-field="${field}"]`,
  );
}

async function fillContributionPair(create: FrameLocator, index = 0) {
  // Mounting the group-contribution enhancement can replace the initial controls.
  await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount((index + 1) * 2);
  await contributionField(create, "behavior", index, "action").fill(
    index === 0 ? "Read one public article" : "Attend one community discussion",
  );
  await contributionField(create, "behavior", index, "duration").fill(
    index === 0 ? "Within one week" : "Once this month",
  );
  await contributionField(create, "cause", index, "cause").fill(
    index === 0 ? "Global health" : "Wild animal suffering",
  );
  await contributionField(create, "cause", index, "support").fill(
    index === 0 ? "Volunteer for two hours" : "Read one research summary",
  );
}

async function expectContributionLayout(create: FrameLocator, view: "choice" | "details" | "summary") {
  const summary = view === "summary";
  await create.locator("body").evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  const layout = await create.locator("body").evaluate((_body, { summary, view }) => {
    const required = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      return element;
    };
    const root = required(summary ? "#screenSummary" : "#screenOffer");
    const intro = required(summary ? ".summary-head" : "#screenOffer .intro");
    const heading = required(summary ? "#summaryHeading" : "#offerHeading");
    const introRect = intro.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const headingStyle = getComputedStyle(heading);
    const contentFits = (element: Element, container: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const bounds = container.getBoundingClientRect();
      return [...range.getClientRects()].every((rect) =>
        rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
        && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1,
      );
    };
    const visible = (element: Element) => element.getClientRects().length > 0;
    const clipped = (selector: string, containerSelector: string) =>
      [...root.querySelectorAll(selector)].filter(visible).filter((element) => {
        const container = element.closest(containerSelector);
        return !container || !contentFits(element, container);
      }).map((element) => element.textContent);
    const parseColor = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) || [];
      if (channels.length < 3) throw new Error(`Unsupported color ${value}`);
      return [channels[0], channels[1], channels[2], channels[3] ?? 1];
    };
    const luminance = (color: number[]) => color.slice(0, 3).reduce((sum, channel, index) => {
      const value = channel / 255;
      return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const contrast = (element: HTMLElement) => {
      const ancestors: HTMLElement[] = [];
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        ancestors.unshift(ancestor);
      }
      let background = [255, 255, 255];
      for (const ancestor of ancestors) {
        const color = parseColor(getComputedStyle(ancestor).backgroundColor);
        background = background.map((channel, index) => color[index] * color[3] + channel * (1 - color[3]));
      }
      const foreground = parseColor(getComputedStyle(element).color);
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const summaryCopy = summary ? required("#summaryIntro") : null;
    return {
      width: window.innerWidth,
      fontSize: parseFloat(headingStyle.fontSize),
      lineHeight: parseFloat(headingStyle.lineHeight),
      headingHeight: headingRect.height,
      headingLeftInset: headingRect.left - introRect.left,
      headingRightInset: introRect.right - headingRect.right,
      headingFits: contentFits(heading, intro),
      introHeight: introRect.height,
      introContentHeight: summary ? null : required("#screenOffer .context-card").getBoundingClientRect().bottom
        - required("#offerStepLabel").getBoundingClientRect().top,
      headingContrast: contrast(heading),
      summaryCopyContrast: summaryCopy ? contrast(summaryCopy) : null,
      summaryCopyFits: summaryCopy ? contentFits(summaryCopy, intro) : null,
      summaryCopyLeftInset: summaryCopy ? summaryCopy.getBoundingClientRect().left - introRect.left : null,
      summaryCopyRightInset: summaryCopy ? introRect.right - summaryCopy.getBoundingClientRect().right : null,
      contextStrongColors: summary ? [] : [...root.querySelectorAll(".context-card strong")]
        .map((element) => getComputedStyle(element).color),
      contextBackgrounds: summary ? [] : [...root.querySelectorAll(".context-card-row")]
        .map((element) => getComputedStyle(element).backgroundColor),
      contextMutedColors: summary ? [] : [...root.querySelectorAll(".context-meta")]
        .map((element) => getComputedStyle(element).color),
      clippedCardText: view === "choice" ? clipped(".offer-choice strong, .offer-choice small", ".offer-choice")
        : view === "details" ? clipped(".offer-detail-card h3, .offer-field label, .add-offer-option", ".offer-detail-card")
          : clipped(".seed-offer-title, .seed-offer-detail", ".seed-side"),
      outOfBoundsControls: [...root.querySelectorAll("button, input, select")].filter(visible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        }).map((element) => element.id || element.textContent),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, { summary, view });

  expect(layout.fontSize).toBeGreaterThanOrEqual(32);
  expect(layout.fontSize).toBeLessThanOrEqual(44);
  expect(layout.lineHeight).toBeGreaterThanOrEqual(layout.fontSize * 1.04);
  expect(layout.headingHeight).toBeLessThanOrEqual(layout.lineHeight * 5 + 1);
  expect(layout.headingLeftInset).toBeGreaterThanOrEqual(23);
  expect(layout.headingRightInset).toBeGreaterThanOrEqual(23);
  expect(layout.headingFits).toBe(true);
  expect(layout.headingContrast).toBeGreaterThanOrEqual(4.5);
  expect(layout.clippedCardText).toEqual([]);
  expect(layout.outOfBoundsControls).toEqual([]);
  expect(layout.horizontalOverflow).toBe(false);
  if (summary) {
    expect(layout.introHeight).toBeLessThan(480);
    expect(layout.summaryCopyContrast).toBeGreaterThanOrEqual(4.5);
    expect(layout.summaryCopyFits).toBe(true);
    expect(layout.summaryCopyLeftInset).toBeGreaterThanOrEqual(23);
    expect(layout.summaryCopyRightInset).toBeGreaterThanOrEqual(23);
  } else {
    // A full-height desktop dark column may stretch alongside all six cards.
    // Its actual introductory content must remain compact in either phase.
    expect(layout.introContentHeight).toBeLessThan(layout.width > 1180 ? 560 : 620);
    expect(layout.contextStrongColors).toEqual(["rgb(17, 17, 17)", "rgb(17, 17, 17)"]);
    expect(layout.contextBackgrounds).toEqual(["rgb(255, 253, 248)", "rgb(255, 253, 248)"]);
    expect(layout.contextMutedColors).toEqual(["rgb(77, 75, 70)", "rgb(77, 75, 70)"]);
  }
}

test.describe("Create route UI regression repairs", () => {
  test("keeps the desktop request step anchored, legible, scoped, and viewport-bounded", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1644, height: 900 });
    const create = await openCreate(page);

    const customCauseInput = create.locator("#otherCauseInput");
    const customCauseContinue = create.locator(".other-cause-submit");
    await expect(customCauseContinue).toBeDisabled();
    await customCauseInput.fill("Moral uncertainty");
    await expect(customCauseContinue).toBeEnabled();
    await customCauseInput.fill("");
    await expect(customCauseContinue).toBeDisabled();

    const causeButton = await chooseExistentialRiskSkill(create);
    await expect(causeButton).toHaveAttribute("aria-pressed", "true");

    await expect
      .poll(() => create.locator("html").evaluate(() => window.scrollY))
      .toBe(0);

    const requestExamples = create.locator(".request-example");
    await expect(requestExamples).toHaveCount(3);
    const requestExampleText = (await requestExamples.allTextContents()).join("\n");
    expect(requestExampleText).not.toMatch(/vegetarian|Help grow Moral Trade|GiveDirectly/i);
    expect(
      (await requestExamples.allTextContents()).every((example) => existentialRiskPattern.test(example)),
    ).toBe(true);

    const suggestionLabels = create.locator(".suggestion-option span:last-child");
    await expect(suggestionLabels).toHaveCount(7);
    const suggestionText = (await suggestionLabels.allTextContents()).join("\n");
    expect(suggestionText).toMatch(existentialRiskPattern);
    expect(suggestionText).not.toMatch(/vegetarian|Help grow Moral Trade/i);
    expect(
      (await suggestionLabels.allTextContents()).every((label) => existentialRiskPattern.test(label)),
    ).toBe(true);

    const layout = await create.locator("body").evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return element.getBoundingClientRect();
      };
      const color = (selector: string) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return getComputedStyle(element).color;
      };
      const background = (selector: string) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return getComputedStyle(element).backgroundColor;
      };
      const list = document.querySelector("#actionSuggestions");
      if (!(list instanceof HTMLElement)) throw new Error("Missing suggestion list");

      return {
        viewportHeight: window.innerHeight,
        headerBottom: rect(".topbar").bottom,
        headingTop: rect("#requestHeading").top,
        listBottom: rect("#actionSuggestions").bottom,
        listClientHeight: list.clientHeight,
        listScrollHeight: list.scrollHeight,
        selectedCauseColor: color("#requestCause"),
        requestPanelBackground: background("#requestPrimary"),
        suggestionColor: color(".suggestion-option span:last-child"),
        suggestionBackground: background("#actionSuggestions"),
        instructionColor: color(".request-entry-head span"),
      };
    });

    expect(layout.headingTop).toBeGreaterThanOrEqual(layout.headerBottom + 16);
    expect(layout.listBottom).toBeLessThanOrEqual(layout.viewportHeight - 12);
    expect(layout.listClientHeight).toBeLessThanOrEqual(276);
    expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
    expect(layout.selectedCauseColor).toBe("rgb(17, 17, 17)");
    expect(layout.requestPanelBackground).toBe("rgb(255, 253, 248)");
    expect(layout.suggestionColor).toBe("rgb(17, 17, 17)");
    expect(layout.suggestionBackground).toBe("rgb(255, 253, 248)");
    expect(layout.instructionColor).toBe("rgb(77, 75, 70)");

    const selectedMarker = await causeButton.evaluate(
      (element) => getComputedStyle(element, "::after").content,
    );
    expect(selectedMarker).toContain("✓");

    const progressLabels = await create.locator("#progress span").evaluateAll((bars) =>
      bars.map((bar) => ({
        label: (bar as HTMLElement).dataset.stepLabel,
        current: bar.getAttribute("aria-current"),
        visibleLabel: getComputedStyle(bar, "::after").content,
      })),
    );
    expect(progressLabels.map((item) => item.label)).toEqual([
      "Cause",
      "Request",
      "Offer",
      "Review",
    ]);
    expect(progressLabels[1]?.current).toBe("step");
    expect(progressLabels[1]?.visibleLabel).toContain("Request");

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await create.locator("body").screenshot({
        animations: "disabled",
        path: path.join(captureDirectory, "request-suggestions-repaired-desktop.png"),
      });
    }
  });

  test("keeps listed and custom cause transitions clear of the sticky header on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let create = await openCreate(page);

    await chooseExistentialRisk(create);
    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await create.locator("body").screenshot({
        animations: "disabled",
        path: path.join(captureDirectory, "request-transition-listed-mobile.png"),
      });
    }

    create = await openCreate(page);
    const customCauseInput = create.locator("#otherCauseInput");
    const customCauseContinue = create.locator(".other-cause-submit");
    await customCauseInput.scrollIntoViewIfNeeded();
    await customCauseInput.fill("Moral uncertainty");
    await expect(customCauseContinue).toBeEnabled();
    await customCauseContinue.click();
    await expectRequestTransitionClear(create, "Moral uncertainty");

    if (captureVisuals) {
      await create.locator("body").screenshot({
        animations: "disabled",
        path: path.join(captureDirectory, "request-transition-custom-mobile.png"),
      });
    }
  });

  test("keeps the repaired request interaction usable without horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const create = await openCreate(page);
    await chooseExistentialRiskSkill(create);

    const suggestionLabels = create.locator(".suggestion-option span:last-child");
    await expect(suggestionLabels).toHaveCount(7);
    const suggestionText = (await suggestionLabels.allTextContents()).join("\n");
    expect(suggestionText).not.toMatch(/vegetarian|Help grow Moral Trade/i);
    expect(
      (await suggestionLabels.allTextContents()).every((label) => existentialRiskPattern.test(label)),
    ).toBe(true);

    const mobileState = await create.locator("html").evaluate((element) => {
      const list = document.querySelector("#actionSuggestions");
      const firstOption = document.querySelector(".suggestion-option span:last-child");
      if (!(list instanceof HTMLElement) || !(firstOption instanceof HTMLElement)) {
        throw new Error("Missing mobile suggestions");
      }
      return {
        horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
        listPosition: getComputedStyle(list).position,
        listClientHeight: list.clientHeight,
        optionColor: getComputedStyle(firstOption).color,
      };
    });

    expect(mobileState.horizontalOverflow).toBe(false);
    expect(mobileState.listPosition).toBe("static");
    expect(mobileState.listClientHeight).toBeLessThanOrEqual(240);
    expect(mobileState.optionColor).toBe("rgb(17, 17, 17)");

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await create.locator("body").screenshot({
        animations: "disabled",
        path: path.join(captureDirectory, "request-suggestions-repaired-mobile.png"),
      });
    }
  });
});

test.describe("Cause-step proportions", () => {
  for (const width of [320, 375, 390, 768, 820, 900, 901, 1024, 1180, 1181, 1440, 1644]) {
    test(`keeps the heading padded and all cause controls bounded at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const create = await openCreate(page);
      await expect(create.locator(".cause-choice")).toHaveCount(14);
      await create.locator("body").evaluate(() => document.fonts.ready.then(() => null));

      const layout = await create.locator("body").evaluate(() => {
        const required = (selector: string) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
          return element;
        };
        const intro = required("#screenCause .intro");
        const heading = required("#causeHeading");
        const panel = required("#screenCause .cause-panel");
        const introRect = intro.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const headingStyle = getComputedStyle(heading);
        const textFitsInside = (element: Element, container: Element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const box = container.getBoundingClientRect();
          return [...range.getClientRects()].every((rect) =>
            rect.left >= box.left - 1
            && rect.right <= box.right + 1
            && rect.top >= box.top - 1
            && rect.bottom <= box.bottom + 1,
          );
        };
        const labels = [...document.querySelectorAll("#screenCause .cause-choice strong")];
        const controls = [...document.querySelectorAll("#screenCause button, #screenCause input")];
        return {
          viewportWidth: window.innerWidth,
          fontSize: parseFloat(headingStyle.fontSize),
          lineHeight: parseFloat(headingStyle.lineHeight),
          headingHeight: headingRect.height,
          headingLeftInset: headingRect.left - introRect.left,
          headingRightInset: introRect.right - headingRect.right,
          headingFits: textFitsInside(heading, intro),
          introHeight: introRect.height,
          introWidth: introRect.width,
          panelHeight: panelRect.height,
          panelWidth: panelRect.width,
          panelTop: panelRect.top,
          introBottom: introRect.bottom,
          columnCount: getComputedStyle(required("#causeGrid")).gridTemplateColumns.split(" ").length,
          clippedLabels: labels.filter((label) => {
            const button = label.closest("button");
            return !button || !textFitsInside(label, button);
          }).map((label) => label.textContent),
          outOfBoundsControls: controls.filter((control) => {
            const rect = control.getBoundingClientRect();
            return rect.left < -1 || rect.right > window.innerWidth + 1;
          }).map((control) => control.id || control.textContent),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      expect(layout.fontSize).toBeLessThanOrEqual(56.1);
      expect(layout.fontSize).toBeGreaterThanOrEqual(32);
      expect(layout.lineHeight).toBeGreaterThanOrEqual(layout.fontSize * 1.04);
      expect(layout.headingHeight).toBeLessThanOrEqual(layout.lineHeight * 3 + 1);
      expect(layout.headingLeftInset).toBeGreaterThanOrEqual(23);
      expect(layout.headingRightInset).toBeGreaterThanOrEqual(23);
      expect(layout.headingFits).toBe(true);
      expect(layout.clippedLabels).toEqual([]);
      expect(layout.outOfBoundsControls).toEqual([]);
      expect(layout.horizontalOverflow).toBe(false);
      const expectedColumns = layout.viewportWidth > 1180 ? 4
        : layout.viewportWidth > 900 ? 3
          : layout.viewportWidth >= 360 ? 2 : 1;
      expect(layout.columnCount).toBe(expectedColumns);
      if (layout.viewportWidth <= 900) {
        expect(layout.introHeight).toBeLessThan(300);
        expect(layout.panelTop).toBeGreaterThanOrEqual(layout.introBottom - 1);
      } else {
        expect(layout.panelWidth).toBeGreaterThan(layout.introWidth);
        expect(Math.abs(layout.panelHeight - layout.introHeight)).toBeLessThanOrEqual(1);
      }

      if (captureVisuals && [320, 390, 901, 1440, 1644].includes(width)) {
        await mkdir(captureDirectory, { recursive: true });
        await create.locator("body").screenshot({
          animations: "disabled",
          path: path.join(captureDirectory, `cause-proportions-${width}.png`),
        });
      }
    });
  }

  test("preserves keyboard cause selection and the custom-cause transition", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    let create = await openCreate(page);
    const listedCause = create.locator('.cause-choice[data-cause="Wild animal suffering"]');
    await listedCause.focus();
    await expect(listedCause).toBeFocused();
    await listedCause.press("Enter");
    await expectRequestTransitionClear(create, "Wild animal suffering");

    create = await openCreate(page);
    const input = create.locator("#otherCauseInput");
    const submit = create.locator(".other-cause-submit");
    await expect(submit).toBeDisabled();
    await input.fill("Moral uncertainty");
    await expect(submit).toBeEnabled();
    await input.press("Enter");
    await expectRequestTransitionClear(create, "Moral uncertainty");
  });
});

test.describe("Create wordmark and Request-step proportions", () => {
  for (const width of [320, 375, 768, 900, 901, 1024, 1100, 1101, 1180, 1181, 1440, 1644, 2048]) {
    test(`keeps the canonical header and Request form balanced at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const create = await openCreate(page);
      const brand = create.locator(".create-brand-wordmark");
      await expect(brand).toHaveAttribute("data-mt-brand-canonical", "true");
      await expect(brand.locator(".mt-canonical-wordmark-label")).toHaveText("Moral Trade");
      await expect(brand.locator('path[d="M160 784 784 160 864 240 240 864Z"]')).toHaveCount(1);
      await expect(brand.locator('path[d="M80 784h160v160H80z"]')).toHaveCount(1);
      await expect(brand.locator('path[d="M784 80h160v160H784z"]')).toHaveAttribute("fill", "#3158ff");
      await expect(brand).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(create.locator(".brand-title")).toHaveText("Create");
      await create.getByRole("button", { name: "Building altruism", exact: true }).click();
      await expectRequestTransitionClear(create, "Building altruism");

      const layout = await create.locator("body").evaluate(() => {
        const required = (selector: string) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
          return element;
        };
        const box = (selector: string) => required(selector).getBoundingClientRect();
        const intro = box("#screenRequest .intro");
        const heading = box("#requestHeading");
        const panel = box("#screenRequest .request-panel");
        const cards = box("#requestKindGrid");
        const header = box(".topbar");
        const brand = box(".brand-heading");
        const back = box("#backToTrade");
        const progress = required("#progress");
        const nextHeaderControl = getComputedStyle(progress).display === "none"
          ? back : progress.getBoundingClientRect();
        const headingStyle = getComputedStyle(required("#requestHeading"));
        const contentFits = (element: Element, container: Element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const bounds = container.getBoundingClientRect();
          return [...range.getClientRects()].every((rect) =>
            rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
            && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1,
          );
        };
        return {
          width: window.innerWidth,
          fontSize: parseFloat(headingStyle.fontSize),
          lineHeight: parseFloat(headingStyle.lineHeight),
          headingHeight: heading.height,
          headingInset: heading.left - intro.left,
          headingFits: contentFits(required("#requestHeading"), required("#screenRequest .intro")),
          introTop: intro.top,
          introBottom: intro.bottom,
          introHeight: intro.height,
          panelTop: panel.top,
          cardsTop: cards.top,
          cardsBottom: cards.bottom,
          cardCount: document.querySelectorAll("#requestKindGrid button").length,
          clippedLabels: [...document.querySelectorAll("#requestKindGrid strong")]
            .filter((label) => !contentFits(label, label.closest("button")!))
            .map((label) => label.textContent),
          brandFits: brand.left >= 0 && brand.right <= nextHeaderControl.left - 8
            && brand.top >= header.top && brand.bottom <= header.bottom
            && contentFits(required(".mt-canonical-wordmark-label"), required(".brand-heading"))
            && contentFits(required(".brand-title"), required(".brand-heading")),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      expect(layout.fontSize).toBeGreaterThanOrEqual(32);
      expect(layout.fontSize).toBeLessThanOrEqual(44);
      expect(layout.lineHeight).toBeGreaterThanOrEqual(layout.fontSize * 1.04);
      expect(layout.headingHeight).toBeLessThanOrEqual(layout.lineHeight * 5 + 1);
      expect(layout.headingInset).toBeGreaterThanOrEqual(23);
      expect(layout.headingFits).toBe(true);
      expect(layout.cardCount).toBe(3);
      expect(layout.clippedLabels).toEqual([]);
      expect(layout.brandFits).toBe(true);
      expect(layout.horizontalOverflow).toBe(false);
      if (layout.width > 1180) {
        expect(layout.panelTop).toBeCloseTo(layout.introTop, 0);
        expect(layout.cardsTop - layout.introTop).toBeLessThanOrEqual(29);
        expect(layout.introHeight).toBeLessThan(560);
        expect(layout.cardsBottom).toBeLessThan(900);
      } else {
        expect(layout.panelTop).toBeGreaterThanOrEqual(layout.introBottom - 1);
      }
      expect(pageErrors).toEqual([]);

      if (captureVisuals) {
        await mkdir(captureDirectory, { recursive: true });
        await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
        await page.screenshot({
          animations: "disabled",
          path: path.join(captureDirectory, `request-proportions-${width}.png`),
        });
        await create.locator(".topbar").screenshot({
          animations: "disabled",
          path: path.join(captureDirectory, `create-wordmark-${width}.png`),
        });
      }
    });
  }

  for (const width of [320, 375, 768, 1440]) {
    test(`preserves selection, interrupted editing, and all four Create steps at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      let publishes = 0;
      page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/api/create/publish") publishes += 1;
      });
      const create = await openCreate(page);
      const expectStepHeader = async (step: string) => {
        await expect(create.locator(`#screen${step}`)).toBeVisible();
        await expect(create.locator(".mt-canonical-wordmark-label")).toHaveText("Moral Trade");
        await expect(create.locator("#backToTrade")).toBeVisible();
        expect(await create.locator("html").evaluate((element) =>
          element.scrollWidth > element.clientWidth + 1,
        )).toBe(false);
        if (captureVisuals) {
          await mkdir(captureDirectory, { recursive: true });
          await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
          await page.screenshot({
            animations: "disabled",
            path: path.join(captureDirectory, `create-${step.toLowerCase()}-${width}.png`),
          });
        }
      };
      await expectStepHeader("Cause");
      await create.getByRole("button", { name: "Building altruism", exact: true }).click();
      await expectStepHeader("Request");
      await create.locator('[data-request-kind="commitment"]').click();
      await create.locator("#requestActionInput").fill("Read one introduction to building altruism");
      await create.locator("#continueRequest").click();
      await expectStepHeader("Offer");
      await create.locator('.offer-choice[data-offer="behavior"]').click();
      await create.locator("#continueOffers").click();
      const action = create.locator('[data-offer-entry-block][data-offer-id="behavior"] [data-offer-field="action"]');
      const duration = create.locator('[data-offer-entry-block][data-offer-id="behavior"] [data-offer-field="duration"]');
      await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount(1);
      await action.fill("Read one public article");
      await duration.fill("Within one week");
      await duration.press("Tab");
      await create.locator("#reviewOffers").click();
      await expectStepHeader("Summary");
      await create.locator("#changeRequest").click();
      await expect(create.locator('[data-request-kind="commitment"]')).toHaveAttribute("aria-pressed", "true");
      await expect(create.locator("#requestActionInput")).toHaveValue("Read one introduction to building altruism");
      await create.locator("#continueRequest").click();
      await expect(action).toHaveValue("Read one public article");
      await expect(duration).toHaveValue("Within one week");
      await action.press("Escape");
      await expect(create.locator("#offerSelectView")).toBeVisible();
      await expect(create.locator('.offer-choice[data-offer="behavior"]')).toHaveAttribute("aria-pressed", "true");
      await create.locator("#continueOffers").click();
      await expect(action).toHaveValue("Read one public article");
      await create.locator("#reviewOffers").click();
      await expect(create.locator("#screenSummary")).toBeVisible();
      expect(publishes).toBe(0);
    });
  }
});


test.describe("Offer and Review tone and proportions", () => {
  for (const width of [320, 390, 768, 1180, 1181, 1440, 2048]) {
    test(`keeps contribution choice, details, and review readable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const pageErrors: string[] = [];
      const submissionRequests: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("request", (request) => {
        if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/create/")) {
          submissionRequests.push(request.url());
        }
      });
      const create = await openContributionChoice(page);
      const capture = async (view: string) => {
        if (!captureVisuals || ![390, 1440].includes(width)) return;
        await mkdir(captureDirectory, { recursive: true });
        await create.locator("body").screenshot({
          animations: "disabled",
          path: path.join(captureDirectory, `offer-review-${view}-${width}.png`),
        });
        await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
        await page.screenshot({
          animations: "disabled",
          path: path.join(captureDirectory, `offer-review-${view}-${width}-viewport.png`),
        });
      };

      await expect(create.locator("#offerGrid .offer-choice")).toHaveCount(6);
      await expect(create.locator("#continueOffers")).toBeDisabled();
      await expectContributionLayout(create, "choice");
      await capture("choice");
      await create.locator('.offer-choice[data-offer="behavior"]').click();
      await create.locator('.offer-choice[data-offer="cause"]').click();
      await expect(create.locator("#offerCount")).toHaveText("2 types selected");
      await create.locator("#continueOffers").click();
      await expect(create.locator("#offerHeading")).toHaveText("Add a few details");
      await expect(create.locator(".offer-details-head h2")).toHaveText("Describe your contribution");
      await expect(create.locator("#offerDetailsView")).toBeVisible();
      await expect(create.locator("#reviewOffers")).toBeDisabled();
      await fillContributionPair(create);
      await expect(create.locator("#reviewOffers")).toBeEnabled();
      await expectContributionLayout(create, "details");
      await capture("details");

      await create.locator("#reviewOffers").click();
      await expect(create.locator("#screenSummary")).toBeVisible();
      await expect(create.locator("#summaryHeading")).toHaveText("Take a look before review");
      await expect(create.locator("#summaryIntro")).toContainText("private and non-binding");
      await expect(create.locator("#summaryOffers .seed-offer-item")).toHaveCount(2);
      await expect(create.locator("#summaryOffers")).toContainText("Read one public article");
      await expect(create.locator("#summaryOffers")).toContainText("Global health");
      await expect(create.locator("#publishOffer")).toHaveText("Submit for review →");
      await expect(create.locator("#publishOffer")).toBeDisabled();
      await expect(create.locator("#publishConfirm")).not.toBeChecked();
      await expectContributionLayout(create, "summary");
      await capture("summary");
      expect(await page.locator("html").evaluate((element) =>
        element.scrollWidth > element.clientWidth + 1,
      )).toBe(false);
      expect(submissionRequests).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const width of [390, 1440]) {
    test(`preserves multiple alternatives through change types, Escape, and repeated review at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const submissionRequests: string[] = [];
      page.on("request", (request) => {
        if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/create/")) {
          submissionRequests.push(request.url());
        }
      });
      const create = await openContributionChoice(page);
      const behavior = create.locator('.offer-choice[data-offer="behavior"]');
      const cause = create.locator('.offer-choice[data-offer="cause"]');
      await behavior.focus();
      await behavior.press("Space");
      await cause.click();
      await expect(behavior).toHaveAttribute("aria-pressed", "true");
      await expect(cause).toHaveAttribute("aria-pressed", "true");
      await create.locator("#continueOffers").click();
      await fillContributionPair(create);
      await expect(create.locator("#reviewOffers")).toBeEnabled();

      await create.locator('[data-add-offer-option="behavior"]').click();
      await expect(create.locator("#reviewOffers")).toBeDisabled();
      await create.locator('[data-add-offer-option="cause"]').click();
      await fillContributionPair(create, 1);
      await expect(create.locator("[data-offer-entry-block]")).toHaveCount(4);
      await expect(create.locator("#offerDetailStatus")).toHaveText("4 of 4 contribution options complete");
      await expect(create.locator("#reviewOffers")).toBeEnabled();

      await create.locator("#changeOfferTypes").click();
      await expect(create.locator("#offerHeading")).toHaveText("How would you like to contribute?");
      await expect(behavior).toHaveAttribute("aria-pressed", "true");
      await expect(cause).toHaveAttribute("aria-pressed", "true");
      await cause.click();
      await expect(cause).toHaveAttribute("aria-pressed", "false");
      await cause.click();
      await expect(create.locator("#offerCount")).toHaveText("2 types selected");
      await create.locator("#continueOffers").click();
      await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount(4);
      await expect(contributionField(create, "cause", 1, "cause")).toHaveValue("Wild animal suffering");
      await expect(contributionField(create, "behavior", 1, "action")).toHaveValue("Attend one community discussion");

      await contributionField(create, "behavior", 0, "action").press("Escape");
      await expect(create.locator("#offerSelectView")).toBeVisible();
      await expect(create.locator("#offerHeading")).toHaveText("How would you like to contribute?");
      await create.locator("#continueOffers").press("Escape");
      await expect(create.locator("#screenRequest")).toBeVisible();
      await expect(create.locator("#requestActionInput")).toHaveValue("Read one introduction to building altruism");
      await create.locator("#continueRequest").click();
      await expect(behavior).toHaveAttribute("aria-pressed", "true");
      await expect(cause).toHaveAttribute("aria-pressed", "true");
      await create.locator("#continueOffers").click();
      await expect(create.locator("[data-offer-entry-block]")).toHaveCount(4);
      await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount(4);

      for (const action of ["Read two public articles", "Read three public articles"]) {
        await contributionField(create, "behavior", 0, "action").fill(action);
        await create.locator("#reviewOffers").click();
        await expect(create.locator("#summaryHeading")).toHaveText("Take a look before review");
        await expect(create.locator("#summaryOffers .seed-offer-item")).toHaveCount(2);
        await expect(create.locator("#summaryOffers .seed-offer-detail")).toHaveCount(4);
        await expect(create.locator("#summaryOffers .seed-offer-or")).toHaveCount(2);
        await expect(create.locator("#summaryOffers")).toContainText(action);
        await expect(create.locator("#summaryOffers")).toContainText("Wild animal suffering");
        await expect(create.locator("#publishOffer")).toBeDisabled();
        await create.locator("#publishConfirm").check();
        await expect(create.locator("#publishOffer")).toBeEnabled();
        await create.locator("#changeOffer").click();
        await expect(create.locator("#offerHeading")).toHaveText("Add a few details");
        await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount(4);
        await expect(contributionField(create, "behavior", 0, "action")).toHaveValue(action);
        await expect(contributionField(create, "cause", 1, "support")).toHaveValue("Read one research summary");
      }

      await create.locator('[data-add-offer-option="behavior"]').click();
      await expect(create.locator("#reviewOffers")).toBeDisabled();
      await create.locator('[data-remove-offer-option="behavior"][data-remove-entry="2"]').click();
      await expect(create.locator("[data-offer-entry-block]")).toHaveCount(4);
      await expect(create.locator("#reviewOffers")).toBeEnabled();
      await create.locator("#reviewOffers").click();
      await expect(create.locator("#publishConfirm")).not.toBeChecked();
      await expect(create.locator("#publishOffer")).toBeDisabled();
      await create.locator("#changeRequest").click();
      await expect(create.locator("#requestActionInput")).toHaveValue("Read one introduction to building altruism");
      await create.locator("#continueRequest").click();
      await expect(create.locator("#offerDetailsView")).toBeVisible();
      await expect(contributionField(create, "behavior", 0, "action")).toHaveValue("Read three public articles");
      await create.locator("#reviewOffers").click();
      await expect(create.locator("#summaryOffers .seed-offer-detail")).toHaveCount(4);
      expect(submissionRequests).toEqual([]);
    });
  }
});

test("keeps the Create shell usable after browser Back and Forward", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/create");
  let create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.locator("#screenCause")).toBeVisible();
  await page.goto("/trades/new");
  create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await create.getByRole("button", { name: "Building altruism", exact: true }).click();
  await expectRequestTransitionClear(create, "Building altruism");
  await page.goBack();
  await expect(page).toHaveURL(/\/create$/);
  create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.locator("#screenCause")).toBeVisible();
  await expect(create.locator(".mt-canonical-wordmark-label")).toHaveText("Moral Trade");
  await page.goForward();
  await expect(page).toHaveURL(/\/trades\/new$/);
  create = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(create.locator("#screenCause")).toBeVisible();
  await create.getByRole("button", { name: "Building altruism", exact: true }).click();
  await create.locator('[data-request-kind="skill"]').click();
  await expect(create.locator('[data-request-kind="skill"]')).toHaveAttribute("aria-pressed", "true");
  await expect(create.locator("#requestActionInput")).toBeFocused();
});
