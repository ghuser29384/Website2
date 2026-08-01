import { expect, test } from "@playwright/test";

async function mountSyntheticOfferStep(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/trades/new");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => {
    document.body.innerHTML = `
      <main style="max-width: 980px; margin: 0 auto; padding: 24px;">
        <aside>
          <div>YOU WANT SOMEONE TO</div>
          <p>Not eat meat for one meal per week</p>
        </aside>
        <h1>What could you offer?</h1>
        <form id="proposal-form">
          <section>
            <h2>A behavior change</h2>
            <div style="border: 1px solid #aaa; padding: 16px;">
              <span>OPTION 01</span>
              <label>Behavior change <input value="Avoid meat for one meal per week"></label>
            </div>
          </section>
          <section>
            <h2>Funding</h2>
            <div style="border: 1px solid #aaa; padding: 16px;">
              <span>OPTION 01</span>
              <label>Project <input value="Commission an existential-risk research brief"></label>
            </div>
          </section>
          <button type="submit">Continue</button>
        </form>
      </main>`;
  });
  await expect(page.locator("[data-mt-group-contribution-host]")).toHaveCount(2);
}

test("renders proposal-only Co-Act and Co-Fund controls and serializes validated terms", async ({
  page,
}) => {
  const paymentRequests: string[] = [];
  page.on("request", (request) => {
    if (/stripe|paymentintent|checkout|card|ach/i.test(request.url())) {
      paymentRequests.push(request.url());
    }
  });

  await mountSyntheticOfferStep(page);

  const behaviorHost = page.locator("[data-mt-group-contribution-host]").nth(0);
  await behaviorHost.getByRole("button", { name: "Act together" }).click();
  await expect(behaviorHost.getByText("PROPOSAL ONLY")).toBeVisible();
  await expect(behaviorHost.getByText("Do this together?")).toBeVisible();
  await behaviorHost.getByLabel("Yes, include the counterparty").check();
  await behaviorHost.getByLabel("Maximum participants").fill("10");
  await behaviorHost.getByLabel("Duration").fill("12 weeks");
  await behaviorHost.getByLabel("Frequency").fill("one meal per week");
  await expect(behaviorHost.getByText("Group terms are complete for proposal review.")).toBeVisible();

  const fundingHost = page.locator("[data-mt-group-contribution-host]").nth(1);
  await fundingHost.getByRole("button", { name: "Fund together" }).click();
  await fundingHost.getByLabel("Project target").fill("50.00");
  await fundingHost.getByLabel("Your maximum budget").fill("5.00");
  await fundingHost
    .getByLabel("What would you fund instead?")
    .fill("Donate the same budget to another approved existential-risk project");
  await fundingHost
    .getByLabel("This Co-Fund is better by my lights than my stated default")
    .check();
  await expect(fundingHost.getByText("Group terms are complete for proposal review.")).toBeVisible();

  const payload = await page.locator("input[name='groupContributionTerms']").inputValue();
  const parsed = JSON.parse(payload) as {
    execution: string;
    options: Array<{ optionKey: string; terms: Record<string, unknown> }>;
  };
  expect(parsed.execution).toBe("proposal-only");
  expect(parsed.options).toHaveLength(2);
  expect(parsed.options.map((option) => option.terms.mode).sort()).toEqual(["co-act", "co-fund"]);
  expect(payload).not.toMatch(/paymentIntent|clientSecret|activate|publishIdentities|privateValue/);
  expect(paymentRequests).toEqual([]);
});

test("keeps the group-contribution controls inside a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountSyntheticOfferStep(page);
  await page.locator("[data-mt-group-contribution-host]").first().getByRole("button", {
    name: "Act together",
  }).click();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
