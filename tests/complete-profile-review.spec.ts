import { expect, test } from "@playwright/test";
import { emptyProfileSetupValues, encodeProfileDraft, profileDraftKey, PROFILE_DRAFT_TTL_MS } from "../src/lib/profile-setup-draft";

for (const width of [1440, 390, 320]) {
  test(`profile setup is independent and optional at ${width}px`, async ({ page, context }, testInfo) => {
    await context.clearCookies(); await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/complete-profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/complete-profile$/);
    await expect(page.getByRole("heading", { name: "Set up your profile." })).toBeVisible();
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("");
    await expect(page.getByRole("heading", { name: /sparks of attention/ })).toHaveCount(0);
    await expect(page.locator('input[name="priority_allocation"]')).toHaveCount(0);
    await expect(page.getByLabel(/Remember this draft/)).not.toBeChecked();
    expect((await context.cookies()).find((cookie) => cookie.name === "mt_walkthrough_seen")).toBeUndefined();
    await page.getByText("Optional private matching preferences", { exact: true }).click();
    for (const label of ["Outcomes I care about", "What I can offer", "Limits or exclusions"]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    }
    await expect(page.getByLabel("Save the private matching notes I entered")).not.toBeChecked();
    await page.getByLabel("Outcomes I care about", { exact: true }).fill("A priority outside the suggested categories");
    await expect(page.getByRole("link", { name: "Advanced priority allocation (optional)" })).toHaveAttribute("href", "/profile/priorities");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`profile-setup-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Skip setup and browse" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/discover"); expect(errors).toEqual([]);
  });
}

test("draft recovery is opt-in, explicit, and clearable without account writes", async ({ page }) => {
  await page.goto("/complete-profile");
  await page.getByLabel("Display name", { exact: true }).fill("Guest example");
  await page.getByText("Optional private matching preferences", { exact: true }).click();
  await page.getByLabel("Outcomes I care about", { exact: true }).fill("A restored personal priority");
  await page.getByLabel("What I can offer", { exact: true }).fill("A restored capability");
  expect(await page.evaluate((key) => localStorage.getItem(key), profileDraftKey(null))).toBeNull();
  await page.getByLabel(/Remember this draft/).check();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), profileDraftKey(null))).not.toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore this draft" })).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Restore this draft" }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Guest example");
  await page.getByText("Optional private matching preferences", { exact: true }).click();
  await expect(page.getByLabel("Outcomes I care about", { exact: true })).toHaveValue("A restored personal priority");
  await expect(page.getByLabel("What I can offer", { exact: true })).toHaveValue("A restored capability");
  await expect(page.getByLabel("Save the private matching notes I entered")).not.toBeChecked();
  await page.getByRole("button", { name: "Clear device draft and reset edits" }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("");
  await expect(page.getByLabel(/Remember this draft/)).not.toBeChecked();
  expect(await page.evaluate((key) => localStorage.getItem(key), profileDraftKey(null))).toBeNull();
});

test("guest setup does not restore member drafts or the legacy unscoped profile", async ({ page }) => {
  await page.addInitScript(({ a, b, ka, kb }) => {
    localStorage.setItem(ka, a); localStorage.setItem(kb, b);
    localStorage.setItem("mt_complete_profile_refinement", JSON.stringify({ displayName: "Unowned private draft" }));
  }, { a: encodeProfileDraft("account-a", { ...emptyProfileSetupValues(), displayName: "Private A" }),
    b: encodeProfileDraft("account-b", { ...emptyProfileSetupValues(), displayName: "Private B" }),
    ka: profileDraftKey("account-a"), kb: profileDraftKey("account-b") });
  await page.goto("/complete-profile");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Restore this draft" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mt_complete_profile_refinement"))).toBeNull();
});

test("expired guest drafts do not populate a form or offer restoration", async ({ page }) => {
  const expired = encodeProfileDraft(null, { ...emptyProfileSetupValues(), displayName: "Expired" }, Date.now() - PROFILE_DRAFT_TTL_MS - 1000);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: profileDraftKey(null), value: expired });
  await page.goto("/complete-profile");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Restore this draft" })).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), profileDraftKey(null))).toBeNull();
});

test("walkthrough query parameters no longer preassign personal priorities", async ({ page }) => {
  await page.goto("/complete-profile?source=walkthrough&cause_area=Animal%20welfare&offer_type=Money&match_name=Example");
  await expect(page.getByRole("heading", { name: "Set up your profile." })).toBeVisible();
  await page.getByText("Optional private matching preferences", { exact: true }).click();
  await expect(page.getByLabel("Outcomes I care about", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Limits or exclusions", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "Create account & continue" }).click();
  await expect(page).toHaveURL(/\/signup\?method=email&returnTo=%2Fcomplete-profile/);
});

test("the profile brand still avoids rewritten-home prefetch", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname === "/" && url.searchParams.has("_rsc")) requests.push(request.url()); });
  await page.goto("/complete-profile");
  await expect(page.getByRole("heading", { name: "Set up your profile." })).toBeVisible();
  await page.waitForTimeout(500); expect(requests).toEqual([]);
});
