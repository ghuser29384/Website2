import { expect, test, type Page, type Route } from "@playwright/test";

interface DiscoverSearchRequest {
  query: string;
  domain?: "offers" | "pools" | "people";
  sort?: string;
  manual?: {
    causes?: string[];
    verifiedOnly?: boolean;
    maximumOfferAmountCents?: number | null;
    minimumReturnAmountCents?: number | null;
    offerTypes?: string[];
    returnTypes?: string[];
    recipient?: string;
    evidence?: string;
    flexibilities?: string[];
    deadlineBefore?: string | null;
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function emptyResponse(request: DiscoverSearchRequest) {
  const domain = request.domain ?? "offers";
  return {
    ok: true,
    checkedAt: "2026-07-31T11:45:00.000Z",
    query: request.query,
    normalizedQuery: request.query,
    domain,
    sort: request.sort ?? "best-fit",
    requiresSharedInterpretation: false,
    clarification: null,
    constraints: [
      {
        key: "manual-cause:wild-animal-suffering",
        label: "Cause: Wild animal suffering",
        source: "manual",
      },
      {
        key: "manual-verified",
        label: "Verified only",
        source: "manual",
      },
      {
        key: "manual-offer-max",
        label: "You offer ≤ $75",
        source: "manual",
      },
      {
        key: "manual-recipient",
        label: "Recipient: Wild Animal Initiative",
        source: "manual",
      },
    ],
    counts: { offers: 0, pools: 0, people: 0 },
    total: 0,
    items: [],
    truncated: false,
    sourceStatus: { offers: "live", pools: "live", people: "live" },
  };
}

async function openDiscover(page: Page) {
  await page.goto("/discover?domain=offers&view=list", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        preflight: Boolean(
          (
            window as Window & {
              __moralTradeDiscoverSearchPreflightLoaded?: boolean;
            }
          ).__moralTradeDiscoverSearchPreflightLoaded,
        ),
        controller: Boolean(
          (
            window as Window & {
              __moralTradeDiscoverSearchLoaded?: boolean;
            }
          ).__moralTradeDiscoverSearchLoaded,
        ),
      })),
    )
    .toEqual({ preflight: true, controller: true });
  await expect(page.locator("#command-form")).toBeVisible();
}

test("filters selected before the first query are snapshotted into the request, URL, and history state", async ({
  page,
}) => {
  const requests: DiscoverSearchRequest[] = [];
  await page.route("**/api/discover/search", async (route) => {
    const request = route.request().postDataJSON() as DiscoverSearchRequest;
    requests.push(request);
    await fulfillJson(route, emptyResponse(request));
  });

  await openDiscover(page);

  const filters = page
    .locator('.left-rail details[data-details="filters"]')
    .first();
  await filters.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await filters
    .locator(
      'input[data-filter="cause"][value="wild-animal-suffering"]',
    )
    .check();

  await filters.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await filters.locator('input[data-filter="verified"]').check();

  await filters.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await filters.locator('input[data-filter="max"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "75";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await filters.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await filters
    .locator('input[data-filter="recipient"]')
    .fill("Wild Animal Initiative");
  await page.locator('select[data-filter="sort"]').selectOption("newest");

  await page.locator("#command-input").fill("animal welfare opportunities");
  // The source renderer debounces range and text filters, then replaces the
  // command form. The user's explicit draft must survive those delayed renders.
  await page.waitForTimeout(400);
  await expect(page.locator("#command-input")).toHaveValue(
    "animal welfare opportunities",
  );
  expect(requests).toHaveLength(0);

  await page.getByRole("button", { name: "Search", exact: true }).click();
  const zeroState = page.locator(
    '.transaction-list[data-live-search-results="true"] [data-live-search-zero="true"]',
  );
  await expect(zeroState).toContainText("No active offers match");
  await expect(
    zeroState.locator(".discover-live-zero-actions"),
  ).toBeVisible();
  await page.waitForTimeout(300);
  await expect(zeroState).toContainText("No active offers match");

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    query: "animal welfare opportunities",
    domain: "offers",
    sort: "newest",
    manual: {
      causes: ["wild-animal-suffering"],
      verifiedOnly: true,
      maximumOfferAmountCents: 7_500,
      minimumReturnAmountCents: null,
      offerTypes: [],
      returnTypes: [],
      recipient: "Wild Animal Initiative",
      evidence: "",
      flexibilities: [],
      deadlineBefore: null,
    },
  });

  const currentUrl = new URL(page.url());
  expect(currentUrl.searchParams.get("causeFilter")).toBe(
    "wild-animal-suffering",
  );
  expect(currentUrl.searchParams.get("verified")).toBe("1");
  expect(currentUrl.searchParams.get("max")).toBe("75");
  expect(currentUrl.searchParams.get("recipient")).toBe(
    "Wild Animal Initiative",
  );
  expect(currentUrl.searchParams.get("sort")).toBe("newest");

  const savedState = await page.evaluate(() =>
    (
      history.state as {
        discoverLiveSearch?: DiscoverSearchRequest;
      } | null
    )?.discoverLiveSearch,
  );
  expect(savedState).toMatchObject({
    domain: "offers",
    sort: "newest",
    manual: {
      causes: ["wild-animal-suffering"],
      verifiedOnly: true,
      maximumOfferAmountCents: 7_500,
      recipient: "Wild Animal Initiative",
    },
  });
});
