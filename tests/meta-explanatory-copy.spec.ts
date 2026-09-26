import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sourceFiles = [
  "src/app/pools/page.tsx",
  "src/app/moral-goods-group-buying/page.tsx",
  "src/app/pilot/page.tsx",
] as const;

const removedPhrases = [
  "Current production inventory.",
  "Current production result",
  "No live conditional pools are open.",
  "actual marketplace state",
  "not an invitation to infer demand",
  "Only show pools that exist.",
  "No demo fallback",
  "Live group buying, without demo inventory.",
  "Read from production.",
  "Routes that exist now.",
  "Money that is actually recorded.",
  "No demo substitution",
  "No false precision",
  "What counts as live, and what is excluded",
  "The acquisition metric is intentionally conservative",
  "distinguish a serious first user",
  "conversion-critical product evidence",
] as const;

test("removes meta-explanatory inventory and internal-metric copy from source", async () => {
  const sources = await Promise.all(sourceFiles.map((path) => readFile(path, "utf8")));
  const combinedSource = sources.join("\n");

  for (const phrase of removedPhrases) {
    expect(combinedSource).not.toContain(phrase);
  }
});

test("renders concise states on the affected routes", async ({ page }) => {
  await page.goto("/pools");
  await expect(page.getByRole("heading", { level: 1, name: "Live conditional pools." })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Current production inventory.");

  await page.goto("/moral-goods-group-buying");
  await expect(page.getByRole("heading", { level: 1, name: "Live group buying." })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Current production result");

  await page.goto("/pilot");
  await expect(page).toHaveURL(/\/start(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose a real first action." }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("distinguish a serious first user");
});
