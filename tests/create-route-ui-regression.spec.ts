import { expect, test, type FrameLocator } from "@playwright/test";
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
