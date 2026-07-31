import { expect, test } from "@playwright/test";

const viewports = [
  { label: "desktop", width: 1440, height: 1000 },
  { label: "narrow mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`Create fails closed and submits contextual safeguards on ${viewport.label}`, async ({
    page,
  }) => {
    let publishRequestCount = 0;
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/create/publish", async (route) => {
      publishRequestCount += 1;
      submittedPayload = JSON.parse(route.request().postData() || "null") as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          submission: {
            displayId: "create-safeguards-test",
            canonicalUrl:
              "https://www.moraltrade.org/create/submissions/create-safeguards-test",
            title: "Your submission is in review.",
            lede: "The shared-project split and safeguards are saved privately.",
            objectLabel: "Co-Fund proposal",
            visibility: "Private until approved",
            openStatus: "Pending Moral Trade review",
          },
        }),
      });
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="commonGround"]').click();
    await create.getByLabel("These are honest no-pool defaults.").check();
    await create.getByRole("button", { name: /Review pool/ }).click();

    await expect(
      create.getByRole("heading", {
        name: "Record the no-deal baseline and safety boundary.",
      }),
    ).toBeVisible();
    await expect(create.locator("[data-create-safeguards-v1]")).toHaveCount(1);

    await create.locator("label.publish-confirm").click();
    await expect(create.locator("#publishConfirm")).toBeChecked();
    await create.getByRole("button", { name: /Submit for review/ }).click();

    expect(publishRequestCount).toBe(0);
    await expect(create.locator("#createSafeguardsError")).toContainText(
      "Describe the specific no-deal baseline",
    );

    await create
      .getByLabel("What happens without this proposal?")
      .fill(
        "Without this proposal, each named participant will fund only the separate project recorded as their no-pool default.",
      );
    await create.getByLabel("The stated baseline is genuine.").check();
    await create
      .getByLabel("No harm or costly baseline was manufactured or escalated for leverage.")
      .check();
    await create
      .getByLabel("Could someone outside the proposal bear a material cost?")
      .selectOption("none_identified");
    await create.getByLabel("I am acting only in my individual capacity.").check();

    await create.getByRole("button", { name: /Submit for review/ }).click();

    await expect(create.getByText("Co-Fund proposal", { exact: true })).toBeVisible();
    expect(publishRequestCount).toBe(1);
    expect(submittedPayload).toMatchObject({
      requestKind: "fund",
      safeguards: {
        noTradeBaseline:
          "Without this proposal, each named participant will fund only the separate project recorded as their no-pool default.",
        baselineConfirmed: true,
        noManufacturedLeverage: true,
        affectedPartyStatus: "none_identified",
        affectedPartyPlan: "",
        capacity: "individual",
      },
    });

    const frameHasHorizontalOverflow = await create.locator("html").evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    const parentHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(frameHasHorizontalOverflow).toBe(false);
    expect(parentHasHorizontalOverflow).toBe(false);
  });
}
