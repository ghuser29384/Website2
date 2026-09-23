import type { Page, Route } from "@playwright/test";

export type BrowseRequest = {
  query: string;
  normalizedQuery?: string;
  offerKind: string;
  domain: string;
  page: number;
  manual: { maximumOfferAmountCents: number | null; causes: string[] };
  excludedConstraints: string[];
};

export function liveOffer(id = "test-trade", title = "Test fixture: paper review for a donation") {
  return {
    kind: "offer", offerKind: "individual", id, title, cause: "Animal welfare",
    status: "Manual review required", youOffer: ["Donate $10 to the agreed charity", "Provide the receipt"],
    youGet: ["Read the agreed paper and provide a written summary"],
    offerFlexibility: "Fixed", returnFlexibility: "Fixed", providerName: "Test counterparty",
    providerRole: "Offer maker", evidenceLabel: "Receipt and written summary", completionLabel: "Complete within 30 days",
    href: `/offers/${id}`, exactMatchLabel: "Request exact match", counteroffersAllowed: true,
    createdAt: "2026-09-01T00:00:00Z", score: 1,
  };
}

export function responseFor(body: BrowseRequest, overrides: Record<string, unknown> = {}) {
  return {
    ok: true, checkedAt: new Date().toISOString(), query: body.query, normalizedQuery: body.normalizedQuery || body.query,
    domain: "offers", offerKind: body.offerKind, sort: "best-fit", clarification: null,
    constraints: [], items: [liveOffer()], total: 1, page: body.page, pageSize: 50, hasMore: false,
    sourceStatus: { offers: "live", pools: "unavailable", people: "not_requested" },
    ...overrides,
  };
}

export async function fulfill(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

export async function mockAccount(page: Page) {
  await page.route("**/api/live-account", (route) => fulfill(route, { authenticated: false }));
}

export async function mockInventory(page: Page, resolve: (body: BrowseRequest) => Record<string, unknown> = (body) => responseFor(body)) {
  const requests: BrowseRequest[] = [];
  await mockAccount(page);
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as BrowseRequest;
    requests.push(body);
    await fulfill(route, resolve(body));
  });
  return requests;
}
