import { expect, test } from "@playwright/test";

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "narrow mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`Create requires and submits contextual safeguards on ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    let requestPayload: Record<string, unknown> | null = null;
    await page.route("**/api/create/publish", async (route) => {
      requestPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          submission: {
            displayId: "QA-SAFEGUARDS-001",
            canonicalUrl: "https://example.invalid/create/submissions/QA-SAFEGUARDS-001",
            title: "Safeguarded proposal submitted.",
            lede: "This mocked receipt confirms that the rendered Create flow reached its durable submission boundary.",
            objectLabel: "Pledge-swap proposal",
            visibility: "Private until approved",
            openStatus: "Pending Moral Trade review",
          },
        }),
      });
    });

    await page.goto("/trades/new", { waitUntil: "domcontentloaded" });
    const frame = page.frameLocator('iframe[data-create-interface-frame="true"]');

    await frame.locator('[data-cause="Factory farming"]').click();
    await frame.locator('[data-request-kind="commitment"]').click();
    await frame.locator("#requestActionInput").fill("Avoid one factory-farmed meal this week");
    await expect(frame.locator("#continueRequest")).toBeEnabled();
    await frame.locator("#continueRequest").click();

    await frame.locator('[data-offer="money"]').click();
    await expect(frame.locator("#continueOffers")).toBeEnabled();
    await frame.locator("#continueOffers").click();
    await frame.locator("#offer-money-0-amount").fill("25.00");
    await frame.locator("#offer-money-0-organization").fill("The Humane League");
    await expect(frame.locator("#reviewOffers")).toBeEnabled();
    await frame.locator("#reviewOffers").click();

    await expect(
      frame.getByRole("heading", {
        name: "Record the no-deal baseline and safety boundary.",
      }),
    ).toBeVisible();
    await expect(frame.getByText(/do not approve the proposal/i)).toBeVisible();
    await expect(frame.getByText(/acting only in my individual capacity/i)).toBeVisible();

    await frame.locator("#publishConfirm").check();
    await expect(frame.locator("#publishOffer")).toBeEnabled();
    await frame.locator("#publishOffer").click();
    await expect(frame.locator("#createSafeguardsError")).toContainText(
      "Describe the specific no-deal baseline",
    );
    expect(requestPayload).toBeNull();

    const baseline =
      "Without this proposal, the counterparty expects to buy the same factory-farmed meal and I would not make this donation.";
    await frame.locator("#createNoTradeBaseline").fill(baseline);
    await frame.locator("#createBaselineConfirmed").check();
    await frame.locator("#createNoManufacturedLeverage").check();
    await frame.locator("#createAffectedPartyStatus").selectOption("none_identified");
    await frame.locator("#createIndividualCapacity").check();
    await frame.locator("#publishOffer").click();

    await expect(
      frame.getByRole("heading", { name: "Safeguarded proposal submitted." }),
    ).toBeVisible();
    expect(requestPayload).not.toBeNull();
    expect(requestPayload?.safeguards).toEqual({
      noTradeBaseline: baseline,
      baselineConfirmed: true,
      noManufacturedLeverage: true,
      affectedPartyStatus: "none_identified",
      affectedPartyPlan: "",
      capacity: "individual",
    });
  });
}
