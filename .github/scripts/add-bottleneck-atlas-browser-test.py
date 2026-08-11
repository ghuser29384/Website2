from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one marker in {path}, found {count}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))


atlas_page = Path("src/app/bottleneck-atlas/page.tsx")
replace_once(
    atlas_page,
    '''              <article key={field.id} className={styles.fieldCard}>
''',
    '''              <article
                key={field.id}
                className={styles.fieldCard}
                data-atlas-field={field.id}
              >
''',
)
replace_once(
    atlas_page,
    '''              <article key={template.id} className={styles.templateCard}>
''',
    '''              <article
                key={template.id}
                className={styles.templateCard}
                data-synthesis-template={template.id}
              >
''',
)

candidate_page = Path("src/app/suggested-opportunities/[templateId]/page.tsx")
replace_once(
    candidate_page,
    '''    <main className={styles.page}>
''',
    '''    <main className={styles.page} data-suggested-opportunity={template.id}>
''',
)

test_file = Path("tests/bottleneck-atlas.spec.ts")
test_file.write_text('''import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth ?? 0,
        ) <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

const feedFixture = {
  authenticated: true,
  generatedAt: "2026-08-11T18:00:00.000Z",
  matchingOfferCount: 1,
  matchingOpportunityCount: 1,
  feedOpportunityCount: 2,
  synthesizedOpportunityCount: 1,
  status: "ready",
  profile: {
    causes: ["AI governance"],
    weightedCauses: [],
    openToPayment: true,
    openToPledges: true,
    signalSources: ["Profile priorities"],
    learningEnabled: true,
    explorationPercent: 12,
    browsingSignalCount: 0,
    actionFeedbackCount: 0,
  },
  recommendations: [
    {
      id: "published-opportunity-1",
      opportunityType: "offer",
      exposureRequestId: "published-exposure-1",
      href: "/offers/published-opportunity-1",
      ctaLabel: "Review proposal",
      sourceLabel: "Moral trade",
      ownerAlias: "Verified participant",
      mode: "pledge",
      offeredCause: "AI governance",
      requestedCause: "Research communication",
      offerAction: "Fund a bounded policy brief",
      requestAction: "Review the brief",
      verification: "Receipt and counterparty confirmation",
      duration: "30 days",
      benefitCauses: ["AI governance"],
      actionCauses: ["Research communication"],
      actionLabel: "Review a bounded brief",
      matchCause: "AI governance",
      reason: "Matches your AI governance priority",
      difficulty: 2,
      difficultyLabel: "Moderate",
      willingness: 70,
      actionFitLabel: "Strong fit",
      saved: false,
      updatedAt: "2026-08-11T17:59:00.000Z",
      metadata: { origin: "published" },
    },
    {
      id: "synth:ai-governance-advocacy-operations:ai-governance",
      opportunityType: "offer",
      exposureRequestId: "synth-exposure-1",
      href: "/suggested-opportunities/ai-governance-advocacy-operations?cause=AI%20governance",
      ctaLabel: "Review possibility",
      sourceLabel: "Potential mixed moral trade · Unconfirmed",
      ownerAlias: "No counterparty confirmed",
      mode: "pledge",
      offeredCause: "Stronger AI-governance execution",
      requestedCause: "Mature advocacy, coalition, and policy operations",
      offerAction: "Training, coalition playbooks, policy campaign planning, and bounded operational support",
      requestAction: "Review what you could offer and what evidence would confirm the bottleneck",
      verification: "Organization confirmation, authority, consent, additionality, and completion evidence",
      duration: "Potential opportunity · Terms not negotiated",
      benefitCauses: ["AI governance"],
      actionCauses: ["policy operations"],
      actionLabel: "Review a generated possibility",
      matchCause: "AI governance",
      reason: "The atlas identifies a plausible resource complementarity",
      difficulty: 3,
      difficultyLabel: "High",
      willingness: 62,
      actionFitLabel: "Investigate",
      saved: false,
      updatedAt: "2026-08-11T18:00:00.000Z",
      metadata: {
        origin: "platform_generated",
        moralTradeStatus: "unconfirmed",
        verifiedCounterparty: false,
        liveOffer: false,
      },
    },
  ],
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  routePlanner: {
    status: "no_live",
    checkedAt: "2026-08-11T18:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 0,
  },
};

test.describe("Bottleneck Atlas and generated feed", () => {
  test("renders the complete public atlas without horizontal overflow", async ({ page }) => {
    await page.goto("/bottleneck-atlas", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: "Bottleneck Atlas" })).toBeVisible();
    await expect(page.locator("[data-atlas-field]")).toHaveCount(18);
    await expect(page.locator("[data-synthesis-template]")).toHaveCount(9);
    await expect(page.getByText(/field evidence is a search prior/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-atlas-field]")).toHaveCount(18);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps an Atlas candidate unconfirmed and hands off to a private role-specific draft", async ({
    page,
  }) => {
    await page.goto(
      "/suggested-opportunities/ai-governance-advocacy-operations?cause=AI%20governance",
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.locator("[data-suggested-opportunity]")).toHaveAttribute(
      "data-suggested-opportunity",
      "ai-governance-advocacy-operations",
    );
    await expect(page.getByText("This is not an offer and not yet a moral trade.")).toBeVisible();
    await expect(page.getByText("No counterparty confirmed")).toBeVisible();
    const firstParty = page.getByRole("link", { name: "Draft first-party terms" }).first();
    const counterparty = page.getByRole("link", { name: "Draft counterparty terms" }).first();
    await expect(firstParty).toHaveAttribute("href", /role=first_party/);
    await expect(counterparty).toHaveAttribute("href", /role=counterparty/);
    await expectNoHorizontalOverflow(page);

    await firstParty.click();
    await expect(page).toHaveURL(/\/trades\/new\?.*source=bottleneck_atlas_synthesis/);
    await expect(page.getByText("Sign in to build a trade")).toBeVisible();
  });

  test("visually and semantically separates generated possibilities from live inventory", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true, account: { displayName: "Feed user" } }),
      }),
    );
    await page.route("**/api/live-now", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(feedFixture) }),
    );

    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const generated = page.locator('.mt-feed-card[data-generated="true"]');
    const published = page.locator('.mt-feed-card[data-generated="false"]');
    await expect(generated).toHaveCount(1);
    await expect(published).toHaveCount(1);
    await expect(generated).toContainText("Potential trade");
    await expect(generated).toContainText("No counterparty confirmed");
    await expect(generated.getByRole("link", { name: "Review possibility" })).toBeVisible();
    await expect(page.getByText(/1 live opportunity · 1 generated possibility/)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('.mt-feed-card[data-generated="true"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });
});
''')
