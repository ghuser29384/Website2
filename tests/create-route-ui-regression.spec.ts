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

async function chooseExistentialRiskSkill(create: FrameLocator) {
  const causeButton = create.locator('.cause-choice[data-cause="Existential risk"]');
  await causeButton.click();
  await expect(create.locator("#screenRequest")).toBeVisible();
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
