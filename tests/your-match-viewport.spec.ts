import { expect, test } from "@playwright/test";

const shortDesktopViewports = [
  { name: "reported 1662x934 viewport", width: 1662, height: 934 },
  { name: "compact 1366x768 viewport", width: 1366, height: 768 },
];

for (const viewport of shortDesktopViewports) {
  test(`Your Match keeps its title, cards, and action visible at the ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-walkthrough-ready="true"]')).toBeVisible({
      timeout: 15_000,
    });

    const matchTab = page.getByRole("tab", { name: /Your match/i });
    await expect(matchTab).toBeVisible({ timeout: 15_000 });
    await matchTab.click();
    await page.getByRole("button", { name: /^Money\b/ }).click();

    const title = page.getByRole("heading", {
      name: "Someone may want exactly what you can offer.",
    });
    const cards = page.locator(".mtw-match-card");

    await expect(title).toBeVisible();
    await expect(cards).toHaveCount(3);

    // Selecting a card adds the final action and reproduces the tallest state.
    await cards.nth(2).click();
    await expect(page.getByRole("button", { name: "Open this match" })).toBeVisible();

    const geometry = await page.locator(".mtw-experience").evaluate((experience) => {
      const titleElement = experience.querySelector<HTMLElement>(
        ".mtw-match-scene .mtw-scene-title",
      );
      const actionElement = experience.querySelector<HTMLElement>(
        ".mtw-match-scene .mtw-primary-action",
      );
      const notes = Array.from(
        experience.querySelectorAll<HTMLElement>(".mtw-match-scene .mtw-match-card small"),
      );

      if (!titleElement || !actionElement || notes.length !== 3) {
        throw new Error("Your Match result geometry could not be measured");
      }

      const experienceBox = experience.getBoundingClientRect();
      const titleBox = titleElement.getBoundingClientRect();
      const actionBox = actionElement.getBoundingClientRect();
      const noteBottom = Math.max(...notes.map((note) => note.getBoundingClientRect().bottom));

      return {
        experienceTop: experienceBox.top,
        experienceBottom: experienceBox.bottom,
        titleTop: titleBox.top,
        contentBottom: Math.max(noteBottom, actionBox.bottom),
      };
    });

    expect(geometry.titleTop).toBeGreaterThanOrEqual(geometry.experienceTop + 1);
    expect(geometry.contentBottom).toBeLessThanOrEqual(geometry.experienceBottom - 1);
  });
}
