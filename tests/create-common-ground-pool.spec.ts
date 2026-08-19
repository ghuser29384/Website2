import { expect, test, type Page } from "@playwright/test";

const viewer = {
  profileId: "11111111-1111-4111-8111-111111111111",
  username: "creator",
  displayName: "Creator Account",
  affiliation: "Moral Trade",
  accountType: "individual",
  verification: "identity-verified",
  publicMention: "username",
  usernameRequired: false,
};

const directory = [
  {
    profileId: "22222222-2222-4222-8222-222222222222",
    username: "alice-research",
    displayName: "Alice Researcher",
    affiliation: "Independent",
    accountType: "individual",
    verification: "identity-verified",
    publicMention: "username",
  },
  {
    profileId: "33333333-3333-4333-8333-333333333333",
    username: "bob-foundation",
    displayName: "Bob Foundation",
    affiliation: "Bob Foundation",
    accountType: "organization",
    verification: "organization-verified",
    publicMention: "pending-invitee",
  },
];

async function installParticipantDirectory(page: Page) {
  await page.route("**/api/create/participants**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("q") ?? "").toLowerCase();
    const results = query.length < 2
      ? []
      : directory.filter((entry) =>
          [entry.username, entry.displayName, entry.affiliation]
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      body: JSON.stringify({ ok: true, query, viewer, results }),
    });
  });
}

test.describe("account-bound Co-Fund participants in Create", () => {
  test("requires explicit account selection and submits an open participant-owned allocation", async ({
    page,
  }) => {
    await installParticipantDirectory(page);

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
            canonicalUrl:
              "https://www.moraltrade.org/create/submissions/create-common-ground-test",
            title: "Your submission is in review.",
            lede: "The participant-bound proposal is saved privately.",
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
      create.getByRole("heading", { name: "Who should fund one project together?" }),
    ).toBeVisible();
    await expect(create.locator("#commonGroundFields")).toBeVisible();
    await expect(create.locator("#dacCreateFields")).toBeHidden();
    await expect(create.getByRole("button", { name: /Review Co-Fund/ })).toBeDisabled();

    await create
      .getByRole("radio", { name: "No, I am organizing only" })
      .check();

    const firstSearch = create.getByRole("combobox", { name: "Participant 1" });
    await firstSearch.fill("alice");
    await expect(
      create.getByText("Type at least two characters, then explicitly select an account."),
    ).toHaveCount(2);
    await expect(create.getByRole("button", { name: /Review Co-Fund/ })).toBeDisabled();
    await expect(create.locator("#commonGroundParticipantCount")).toHaveText(
      "0 participants selected",
    );

    await expect(create.getByRole("option", { name: /@alice-research/i })).toBeVisible();
    await create.getByRole("option", { name: /@alice-research/i }).click();
    await expect(create.getByText("@alice-research", { exact: true })).toBeVisible();

    const secondSearch = create.getByRole("combobox", { name: "Participant 2" });
    await secondSearch.fill("bob");
    await expect(create.getByRole("option", { name: /@bob-foundation/i })).toBeVisible();
    await create.getByRole("option", { name: /@bob-foundation/i }).click();

    await expect(create.locator("#commonGroundParticipantCount")).toHaveText(
      "2 participants selected",
    );
    await expect(create.locator("#commonGroundFields")).toContainText(
      "You cannot enter those terms for them.",
    );
    await expect(create.getByRole("button", { name: /Review Co-Fund/ })).toBeEnabled();

    await create.getByRole("button", { name: /Review Co-Fund/ }).click();
    await expect(create.getByRole("heading", { name: "Review participants." })).toBeVisible();
    await expect(create.locator("#summaryOffers")).toContainText("@alice-research");
    await expect(create.locator("#summaryOffers")).toContainText("@bob-foundation");
    await expect(create.locator("#summaryOffers")).not.toContainText("Failure-bonus timing");
    await expect(create.getByText("Open", { exact: true })).toBeVisible();
    await expect(create.getByRole("button", { name: /Submit for review/ })).toBeDisabled();
    await expect(create.locator("#boundaryNote")).toContainText("No invitation or money moves");

    await create.locator("label.publish-confirm").click();
    await expect(create.locator("#publishConfirm")).toBeChecked();
    await create.getByRole("button", { name: /Submit for review/ }).click();
    await expect(create.getByText("Co-Fund proposal", { exact: true })).toBeVisible();
    await expect(create.locator("#publishedLede")).toContainText("No invitation was sent");

    expect(submittedPayload).toMatchObject({
      requestKind: "fund",
      fundMode: "dac",
      dacPath: "create",
      offers: [],
      pool: {
        commonGround: {
          targetAmountCents: 1_000_000,
          allocationStatus: "open",
          creatorParticipation: "organizer-only",
          privateValueEstimatesStored: false,
          participants: [
            {
              target: {
                kind: "account",
                profileId: "22222222-2222-4222-8222-222222222222",
                usernameSnapshot: "alice-research",
                isCreator: false,
              },
              participantTerms: null,
            },
            {
              target: {
                kind: "account",
                profileId: "33333333-3333-4333-8333-333333333333",
                usernameSnapshot: "bob-foundation",
                publicMention: "pending-invitee",
                isCreator: false,
              },
              participantTerms: null,
            },
          ],
        },
      },
    });
    const serialized = JSON.stringify(submittedPayload);
    expect(serialized).not.toContain("contributionCents");
    expect(serialized).not.toContain("privateValueBps");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("phone");
  });

  test("requires an unselected creator-participation decision", async ({ page }) => {
    await installParticipantDirectory(page);
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="commonGround"]').click();

    await expect(
      create.getByRole("radio", { name: "Yes, I am a participant" }),
    ).not.toBeChecked();
    await expect(
      create.getByRole("radio", { name: "No, I am organizing only" }),
    ).not.toBeChecked();
    await expect(create.locator("#commonGroundStatus")).toContainText(
      "Choose whether you are participating or organizing only.",
    );
  });

  test("stays compact without horizontal overflow on mobile", async ({ page }) => {
    await installParticipantDirectory(page);
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
