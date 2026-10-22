import { expect, test } from "@playwright/test";

function feedFixture(authenticated: boolean) {
  return {
    authenticated,
    status: authenticated ? "no_matches" : "signed_out",
    generatedAt: "2026-09-25T12:00:00Z",
    profile: {
      causes: authenticated ? ["Community gardens", "Open education"] : [],
      weightedCauses: [],
      learningEnabled: false,
    },
    recommendations: [],
    ownedOpportunityCount: authenticated ? 1 : 0,
    ownedOpportunities: authenticated ? [{
      id: "fa300000-0000-4000-8000-000000000001",
      opportunityType: "offer", mode: "pledge",
      offeredCause: "Community gardens", requestedCause: "Open education",
      offerAction: "Help at a local garden for two afternoons.",
      requestAction: "Proofread a short educational guide.",
      ownerAlias: "QA participant", sourceLabel: "Your live offer",
      href: "/trades/fa300000-0000-4000-8000-000000000001/manage",
      ctaLabel: "Manage & invite", duration: "Two weeks",
      verification: "Share a brief completion summary.",
      summary: "Synthetic browser-test record, not a real listing.",
      metadata: { mechanism: "published_offer", origin: "published" },
    }] : [],
    routePlanner: {
      status: "unavailable", checkedAt: "2026-09-25T12:00:00Z", profile: {},
      needsMoreInput: [], routes: [], comparison: null, candidateCount: 0,
    },
    feedDiagnostics: authenticated ? {
      version: "hybrid-reciprocal-v1",
      inventorySemanticsVersion: "external-candidate-funnel-v1",
      checkedAt: "2026-09-25T12:00:00Z", platformInventoryCount: 1,
      viewerOwnedExcludedCount: 1, externalInventoryCount: 0,
      evaluatedCandidateCount: 0, checkedInventoryCount: 0, selectedCount: 0,
      directCount: 0, nearMatchCount: 0, adjacentCount: 0, discoveryCount: 0,
      eligibleCount: 0, retrievalPoolCount: 0, semanticCandidateCount: 0,
      retrievalMode: "deterministic_fallback", excludedByReason: {},
      softBlockers: {}, knownConstraintBlockers: {},
    } : undefined,
  };
}

for (const authenticated of [true, false]) {
  for (const width of [390, 820, 821, 1024, 1180, 1440]) {
    test(`production Feed loader: ${authenticated ? "own listings" : "signed out"}, ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      const browserErrors: string[] = [];
      const unexpectedRequests: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        if (request.method() === "GET" && pathname === "/api/live-account") {
          await route.fulfill({ json: { authenticated, displayName: authenticated ? "QA participant" : null } });
        } else if (request.method() === "GET" && pathname === "/api/live-now") {
          await route.fulfill({ json: feedFixture(authenticated) });
        } else {
          // Never deliver a mutation or other API call to a backend from this test.
          unexpectedRequests.push(`${request.method()} ${pathname}`);
          await route.fulfill({ status: 503, json: { status: "unavailable", authenticated: false } });
        }
      });
      const response = await page.goto("/feed");
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("http://127.0.0.1:3211/feed");
      await expect(page).toHaveTitle("Moral Trade — Live");
      const root = page.locator(".mt-feed-empty-layout");
      await expect(root).toBeVisible();
      await expect(root.locator(".mt-feed-context")).not.toHaveAttribute("open", "");
      await expect(page.getByRole("heading", { name: "What needs you now." })).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);
      const checkBounds = async () => {
        const bounds = await page.evaluate(() => ({
          viewport: innerWidth, document: document.documentElement.scrollWidth,
          outside: [...document.querySelectorAll(".topbar :is(a, button), .mt-feed-empty-layout :is(a, button, summary)")]
            .filter((node) => (node as HTMLElement).checkVisibility())
            .filter((node) => { const box = node.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1; })
            .map((node) => node.textContent),
        }));
        expect(bounds.document, JSON.stringify(bounds)).toBeLessThanOrEqual(width + 1);
        expect(bounds.outside).toEqual([]);
      };
      await checkBounds();
      if (authenticated) {
        await expect(root.locator(".urgent h2")).toHaveText("No external opportunities are available yet.");
        await expect(root.locator(".mt-owned-card")).toHaveCount(1);
        await expect(root.getByRole("link", { name: "Manage & invite" })).toHaveAttribute("href", "/trades/fa300000-0000-4000-8000-000000000001/manage");
        await page.screenshot({ path: testInfo.outputPath(`feed-server-${width}-viewport.png`) });
        await page.screenshot({ path: testInfo.outputPath(`feed-server-${width}.png`), fullPage: true });
      } else {
        await expect(root.locator(".urgent a").first()).toHaveAttribute("href", /\/login/);
        await expect(root.locator(".mt-owned-card")).toHaveCount(0);
      }
      await root.locator(".mt-feed-context > summary").focus();
      await page.keyboard.press("Enter");
      await expect(root.getByText("No guessed priorities", { exact: true })).toBeVisible();
      if (authenticated) {
        await root.locator(".mt-feed-empty-diagnostics > summary").click();
        await expect(root.getByText("Platform live inventory", { exact: true })).toBeVisible();
      }
      await checkBounds();
      await page.getByRole("button", { name: "Plan resources", exact: true }).click();
      await expect(page.locator(".mt-feed-context")).toHaveCount(0);
      await page.getByRole("button", { name: "Focus", exact: true }).click();
      await expect(page.locator(".mt-feed-context")).toHaveCount(1);
      await checkBounds();
      expect(browserErrors).toEqual([]);
      expect(unexpectedRequests).toEqual([]);
      await testInfo.attach("browser-errors-and-api-guard", {
        body: JSON.stringify({ browserErrors, unexpectedRequests }), contentType: "application/json",
      });
    });
  }
}
