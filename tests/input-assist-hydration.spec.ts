import { expect, test } from "@playwright/test";

interface HydrationScenario {
  route: string;
  control: string;
  context: string;
  dateControl?: string;
}

const cases: readonly HydrationScenario[] = [
  {
    route: "/paid-action-offers",
    control: 'input[placeholder="Search offers, people, pools, or evidence"]',
    context: "search",
  },
  {
    route: "/people",
    control: 'input[name="search"]',
    context: "search",
  },
  {
    route: "/cohort",
    control: '[name="target_context"]',
    context: "priorities",
  },
  {
    route: "/mpgf/pools",
    control: 'input[name="q"]',
    context: "search",
    dateControl: 'input[type="date"]',
  },
];

function isHydrationMismatch(message: string) {
  return (
    message.includes("hydrated but some attributes of the server rendered HTML didn't match") ||
    message.includes("Hydration failed because the server rendered HTML didn't match")
  );
}

test("lazy input assist enhances topbar and route controls without racing React hydration", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const hydrationErrors: string[] = [];

  await page.route("**/moral-trade-input-standards.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });

  page.on("console", (message) => {
    if (message.type() === "error" && isHydrationMismatch(message.text())) {
      hydrationErrors.push(`${page.url()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    if (isHydrationMismatch(error.message)) {
      hydrationErrors.push(`${page.url()}: ${error.stack || error.message}`);
    }
  });

  for (let pass = 0; pass < 3; pass += 1) {
    for (const scenario of cases) {
      const errorCountBeforeNavigation = hydrationErrors.length;
      await page.goto(scenario.route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load");

      const control = page.locator(scenario.control).first();
      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute("data-mt-autocomplete-context", scenario.context, {
        timeout: 15_000,
      });
      await expect(control).toHaveAttribute("data-mt-autocomplete-ready", "true");
      await expect(control).toHaveAttribute("aria-autocomplete", "list");
      await expect(control).toHaveAttribute("aria-haspopup", "listbox");

      if (scenario.dateControl) {
        await expect(page.locator(scenario.dateControl).first()).toHaveAttribute(
          "min",
          /^\d{4}-\d{2}-\d{2}$/,
          { timeout: 15_000 },
        );
      }

      await page.waitForTimeout(250);
      expect(
        hydrationErrors.slice(errorCountBeforeNavigation),
        `hydration diagnostics while loading ${scenario.route} on pass ${pass + 1}`,
      ).toEqual([]);
    }
  }

  expect(hydrationErrors).toEqual([]);
});
