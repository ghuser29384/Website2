import { expect, test } from "@playwright/test";

test.describe("compact Co-Fund in Create", () => {
  test("builds and submits the worked split without the advanced threshold editor", async ({ page }) => {
    let submittedPayload: unknown = null;
    await page.route("**/api/create/publish", async (route) => {
      submittedPayload = JSON.parse(route.request().postData() || "null") as unknown;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          submission: {
            displayId: "create-common-ground-test",
            canonicalUrl: "https://www.moraltrade.org/create/submissions/create-common-ground-test",
            title: "Your submission is in review.",
            lede: "The shared-project split is saved privately.",
            objectLabel: "Co-Fund proposal",
            visibility: "Private until approved",
            openStatus: "Pending Moral Trade review",
          },
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="commonGround"]').click();

    await expect(
      create.getByRole("heading", { name: "What should everyone fund together?" }),
    ).toBeVisible();
    await expect(create.locator("#commonGroundFields")).toBeVisible();
    await expect(create.locator("#dacCreateFields")).toBeHidden();
    await expect(
      create.getByText(/Both gain \$1,000 by their own estimates\./),
    ).toBeVisible();
    await expect(create.getByRole("button", { name: /Review pool/ })).toBeDisabled();

    const visibleWords = await create.locator("#commonGroundFields").evaluate((element) =>
      (element.textContent || "").trim().split(/\s+/).filter(Boolean).length,
    );
    expect(visibleWords).toBeLessThanOrEqual(95);

    await create.getByLabel("These are honest no-pool defaults.").check();
    await expect(create.getByRole("button", { name: /Review pool/ })).toBeEnabled();
    await create.getByRole("button", { name: /Review pool/ }).click();

    await expect(create.getByRole("heading", { name: "Review the split." })).toBeVisible();
    await expect(create.locator("#summaryOffers")).not.toContainText("Failure-bonus timing");
    await expect(
      create.getByText("Private value estimates are not submitted.", { exact: true }),
    ).toBeVisible();
    await expect(create.getByRole("button", { name: /Submit for review/ })).toBeDisabled();

    await create
      .getByLabel("What happens without this proposal?")
      .fill(
        "Without this proposal, each participant will fund only the separate project recorded as their no-pool default.",
      );
    await create.getByLabel("The stated baseline is genuine.").check();
    await create
      .getByLabel("No harm or costly baseline was manufactured or escalated for leverage.")
      .check();
    await create
      .getByLabel("Could someone outside the proposal bear a material cost?")
      .selectOption("none_identified");
    await create.getByLabel("I am acting only in my individual capacity.").check();

    await create.locator("label.publish-confirm").click();
    await expect(create.locator("#publishConfirm")).toBeChecked();
    await create.getByRole("button", { name: /Submit for review/ }).click();
    await expect(create.getByText("Co-Fund proposal", { exact: true })).toBeVisible();

    expect(submittedPayload).toMatchObject({
      requestKind: "fund",
      fundMode: "dac",
      dacPath: "create",
      offers: [],
      safeguards: {
        noTradeBaseline:
          "Without this proposal, each participant will fund only the separate project recorded as their no-pool default.",
        baselineConfirmed: true,
        noManufacturedLeverage: true,
        affectedPartyStatus: "none_identified",
        affectedPartyPlan: "",
        capacity: "individual",
      },
      pool: {
        commonGround: {
          targetAmountCents: 1_000_000,
          calculationPolicy: "balanced_surplus_v1",
          privateValueEstimatesStored: false,
          participantGainChecked: true,
          baselineConfirmed: true,
          participants: [
            {
              name: "Participant A",
              defaultProject: "Animal-welfare project",
              budgetCents: 1_000_000,
              contributionCents: 500_000,
            },
            {
              name: "Participant B",
              defaultProject: "Long-term-future project",
              budgetCents: 1_000_000,
              contributionCents: 500_000,
            },
          ],
        },
      },
    });
    expect(JSON.stringify(submittedPayload)).not.toContain("privateValueBps");
  });

  test("stays compact without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="commonGround"]').click();
    await expect(create.locator("#commonGroundFields")).toBeVisible();

    const hasHorizontalOverflow = await create.locator("html").evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
