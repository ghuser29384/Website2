import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sourceFiles = [
  "src/app/pools/page.tsx",
  "src/app/moral-goods-group-buying/page.tsx",
  "src/app/pilot/page.tsx",
  "src/app/offers/[offerId]/credibility/page.tsx",
  "src/app/credibility/page.tsx",
  "src/components/credibility/credibility-passport.tsx",
  "src/components/core-trade/trade-outcome-feedback.tsx",
  "src/app/sources/page.tsx",
  "src/app/team/page.tsx",
  "src/app/research/page.tsx",
  "src/app/funding-rounds/[roundId]/page.tsx",
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
  "estimate.caveat",
  "This view uses the participant",
  "Version one is deployed but not yet statistically calibrated",
  "Evidence decays with a 365-day half-life in model v1.",
  "minimum-data and calibration gates",
  "This page gives",
  "This surface states the current operating reality",
  "This page keeps the research agenda",
  "Backend work required before live funding",
] as const;

test("removes meta-explanatory inventory and internal-metric copy from source", async () => {
  const sources = await Promise.all(sourceFiles.map((path) => readFile(path, "utf8")));
  const combinedSource = sources.join("\n");

  for (const phrase of removedPhrases) {
    expect(combinedSource).not.toContain(phrase);
  }
});

test("renders concise states on the affected routes", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/pools");
  await expect(page.getByRole("heading", { level: 1, name: "Live conditional pools." })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Current production inventory.");

  await page.goto("/moral-goods-group-buying");
  await expect(page).toHaveURL(url => url.pathname === "/discover" && url.searchParams.get("offerKind") === "co-fund");
  await expect(page.getByRole("heading", { level: 1, name: "Browse trades" })).toBeVisible();
  await expect(page.getByLabel("Trade type", { exact: true })).toHaveValue("co-fund");

  await page.goto("/pilot");
  await expect(page).toHaveURL(/\/start(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Is this your first time here?" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("distinguish a serious first user");

  await page.goto("/credibility");
  await expect(page.getByRole("heading", { name: "Provisional estimates", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("statistically calibrated");
  await expect(page.getByRole("link", { name: "Review validation policy" })).toBeVisible();

  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: "Primary references", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("This page gives");

  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Who is accountable for Moral Trade.", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact operators", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Do not invent social proof");
});
