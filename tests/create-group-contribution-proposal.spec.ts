import {
  expect,
  test,
  type FrameLocator,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";

const PARTICIPANT_VIEWER = {
  profileId: "11111111-1111-4111-8111-111111111111",
  username: "creator-example",
  displayName: "Creator Example",
  affiliation: "Moral Trade",
  accountType: "individual",
  verification: "identity-verified",
  publicMention: "username",
  usernameRequired: false,
};

const PARTICIPANT_RESULT = {
  profileId: "22222222-2222-4222-8222-222222222222",
  username: "ellen-example",
  displayName: "Ellen Example",
  affiliation: "Forethought",
  accountType: "individual",
  verification: "identity-verified",
  publicMention: "pending-invitee",
};

async function mockParticipantDirectory(page: Page): Promise<void> {
  await page.route("**/api/create/participants**", async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const query = requestUrl.searchParams.get("q")?.trim() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      body: JSON.stringify({
        ok: true,
        query,
        viewer: PARTICIPANT_VIEWER,
        results: query.length >= 2 ? [PARTICIPANT_RESULT] : [],
      }),
    });
  });
}

async function openConcreteOfferStep(page: Page): Promise<FrameLocator> {
  await page.goto("/trades/new");
  await page.waitForLoadState("domcontentloaded");
  const create = page.frameLocator('iframe[title="Moral Trade Create"]');

  await expect(
    create.getByRole("heading", { level: 1, name: "What do you want to improve?" }),
  ).toBeVisible();
  await create.getByRole("button", { name: "Future flourishing" }).click();
  await create.locator('[data-request-kind="commitment"]').click();
  await create.getByLabel("What commitment do you want?").fill(
    "Not eat meat for one meal per week",
  );
  await create.locator("#continueRequest").click();

  await expect(
    create.getByRole("heading", { level: 1, name: "What could you offer?" }),
  ).toBeVisible();
  await create.getByRole("button", { name: "A behavior change" }).click();
  await create.getByRole("button", { name: "Money" }).click();
  await create.locator("#continueOffers").click();

  // The enhancement mounts asynchronously after the concrete-offer editor appears.
  // Wait for that one-time DOM decoration before entering values so the test never
  // races the mount and mistakes a replaced pre-mount control for the durable field.
  await expect(create.locator("[data-mt-group-contribution-host]")).toHaveCount(2);

  const behaviorAction = create.locator(
    '[data-offer-entry-block][data-offer-id="behavior"] [data-offer-field="action"]',
  );
  const behaviorDuration = create.locator(
    '[data-offer-entry-block][data-offer-id="behavior"] [data-offer-field="duration"]',
  );
  const moneyAmount = create.locator(
    '[data-offer-entry-block][data-offer-id="money"] [data-offer-field="amount"]',
  );
  const moneyOrganization = create.locator(
    '[data-offer-entry-block][data-offer-id="money"] [data-offer-field="organization"]',
  );

  await behaviorAction.fill("Avoid meat for one meal per week");
  await behaviorAction.press("Tab");
  await expect(behaviorAction).toHaveValue("Avoid meat for one meal per week");

  await behaviorDuration.fill("once per week for 12 weeks");
  await behaviorDuration.press("Tab");
  await expect(behaviorDuration).toHaveValue("once per week for 12 weeks");

  await moneyAmount.fill("5.00");
  await moneyAmount.press("Tab");
  await expect(moneyAmount).toHaveValue("5.00");

  await moneyOrganization.fill("Existential Risk Research Project");
  await moneyOrganization.press("Tab");
  await expect(moneyOrganization).toHaveValue("Existential Risk Research Project");

  await expect(create.locator("#reviewOffers")).toBeEnabled();
  return create;
}

function behaviorHost(create: FrameLocator) {
  return create.locator(
    '[data-offer-entry-block][data-offer-id="behavior"] + [data-mt-group-contribution-host]',
  );
}

function fundingHost(create: FrameLocator) {
  return create.locator(
    '[data-offer-entry-block][data-offer-id="money"] + [data-mt-group-contribution-host]',
  );
}

test("integrates proposal-only Co-Act and Co-Fund terms into the real Create iframe submission", async ({
  page,
}, testInfo) => {
  const submissionCapture: { payload: Record<string, unknown> | null } = { payload: null };
  const paymentRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const sameSiteServerErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "127.0.0.1" && response.status() >= 500) {
      sameSiteServerErrors.push(`${response.status()} ${url.pathname}`);
    }
  });
  page.on("request", (request: Request) => {
    if (/stripe|paymentintent|checkout|\/payments?(?:\/|\?|$)|\/ach(?:\/|\?|$)/i.test(request.url())) {
      paymentRequests.push(request.url());
    }
  });
  await mockParticipantDirectory(page);
  await page.route("**/api/create/publish", async (route: Route) => {
    submissionCapture.payload = JSON.parse(
      route.request().postData() || "null",
    ) as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        submission: {
          displayId: "create-group-proposal-test",
          canonicalUrl: "https://moraltrade.org/create/submissions/create-group-proposal-test",
          title: "Your submission is in review.",
          lede: "The group terms are saved privately for review.",
          objectLabel: "Co-Act and Co-Fund proposal",
          visibility: "Private until approved",
          openStatus: "Pending Moral Trade review",
        },
      }),
    });
  });

  const create = await openConcreteOfferStep(page);

  const coAct = behaviorHost(create);
  await coAct.getByRole("button", { name: "Act together" }).click();
  await expect(coAct.getByText("PROPOSAL ONLY")).toBeVisible();
  await coAct.getByLabel("No, I am organizing only").check();
  await coAct.getByLabel("Add participant or invitee").fill("External collaborator");
  await coAct.getByRole("option", { name: /Invite “External collaborator” by private claim link/ }).click();
  await expect(coAct.getByText("External collaborator", { exact: true })).toBeVisible();
  await expect(coAct.getByText("Do this together?")).toBeVisible();
  await coAct.getByLabel("Yes, include the counterparty").check();
  await coAct.getByLabel("Maximum participants").fill("10");
  await coAct.getByRole("textbox", { name: "Duration", exact: true }).fill("12 weeks");
  await coAct.getByLabel("Frequency").fill("one meal per week");
  await expect(coAct.getByText("Group terms are complete for proposal review.")).toBeVisible();

  const coFund = fundingHost(create);
  await coFund.getByRole("button", { name: "Fund together" }).click();
  await coFund.getByLabel("Yes, I am a participant").check();
  await expect(coFund.getByText("@creator-example", { exact: true })).toBeVisible();
  await coFund.getByLabel("Add participant or invitee").fill("ellen");
  await coFund.getByRole("option", { name: /@ellen-example/ }).click();
  await expect(coFund.getByText("@ellen-example", { exact: true })).toBeVisible();
  await coFund.getByLabel("Project target").fill("50.00");
  await coFund.getByLabel("Your private maximum contribution").fill("5.00");
  await expect(coFund.getByLabel("Your private maximum contribution")).toHaveValue("5.00");
  await coFund
    .getByLabel("What would you fund instead?")
    .fill("Donate the same budget to another approved existential-risk project");
  await coFund
    .getByLabel("This Co-Fund is better by my lights than my stated default")
    .check();
  await expect(coFund.getByText("Group terms are complete for proposal review.")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-co-act-co-fund-proposal.png"),
    fullPage: true,
  });

  const hiddenPayload = await create
    .locator("input[name='groupContributionTerms']")
    .inputValue();
  const hidden = JSON.parse(hiddenPayload) as {
    execution: string;
    options: Array<{ optionKey: string; terms: { mode: string } }>;
  };
  expect(hidden.execution).toBe("proposal-only");
  expect(hidden.options.map((option) => option.optionKey).sort()).toEqual([
    "behavior:1",
    "money:1",
  ]);

  await expect(
    create.locator('[data-offer-entry-block][data-offer-id="behavior"] [data-offer-field="duration"]'),
  ).toHaveValue("once per week for 12 weeks");
  await expect(create.locator("#reviewOffers")).toBeEnabled();
  await create.locator("#reviewOffers").click();
  await expect(create.getByText("Proposed group terms", { exact: true })).toBeVisible();
  await expect(create.getByText(/CO-ACT · PROPOSAL ONLY/)).toBeVisible();
  await expect(create.getByText(/CO-FUND · PROPOSAL ONLY/)).toBeVisible();
  await create.locator("label.publish-confirm").click();
  await create.getByRole("button", { name: /Submit for review/ }).click();
  await expect(create.getByText("Co-Act and Co-Fund proposal", { exact: true })).toBeVisible();

  const submittedPayload = submissionCapture.payload;
  if (!submittedPayload) throw new Error("Expected the Create proposal payload to be captured");
  const groupTerms = submittedPayload.groupContributionTerms as {
    schemaVersion: number;
    execution: string;
    options: Array<{ optionKey: string; terms: { mode: string } }>;
  };
  expect(groupTerms.schemaVersion).toBe(1);
  expect(groupTerms.execution).toBe("proposal-only");
  expect(groupTerms.options.map((option) => option.terms.mode).sort()).toEqual([
    "co-act",
    "co-fund",
  ]);
  const submittedOptions = groupTerms.options as Array<{
    optionKey: string;
    terms: { mode: string; creatorParticipation: string; participants: Array<Record<string, unknown>> };
  }>;
  const submittedCoAct = submittedOptions.find((option) => option.terms.mode === "co-act");
  const submittedCoFund = submittedOptions.find((option) => option.terms.mode === "co-fund");
  expect(submittedCoAct?.terms.creatorParticipation).toBe("organizer-only");
  expect(submittedCoAct?.terms.participants).toEqual([
    expect.objectContaining({ kind: "external-claim", displayNameSnapshot: "External collaborator" }),
  ]);
  expect(submittedCoFund?.terms.creatorParticipation).toBe("participating");
  expect(submittedCoFund?.terms.participants).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ profileId: PARTICIPANT_VIEWER.profileId, isCreator: true }),
      expect.objectContaining({ profileId: PARTICIPANT_RESULT.profileId, isCreator: false }),
    ]),
  );
  expect(JSON.stringify(submittedPayload)).not.toMatch(
    /paymentIntent|clientSecret|activate|publishIdentities|privateValue|email|phone/i,
  );
  expect(paymentRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(sameSiteServerErrors).toEqual([]);
});

test("restores proposal-only group terms after the Create authentication handoff", async ({
  page,
}) => {
  const submissionCapture: { payload: Record<string, unknown> | null } = { payload: null };
  await page.route("**/api/create/publish", async (route: Route) => {
    submissionCapture.payload = JSON.parse(
      route.request().postData() || "null",
    ) as Record<string, unknown>;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        requiresAuth: true,
        message: "Sign in to submit this Create record.",
        loginUrl: "/trades/new?resume=create",
      }),
    });
  });

  const create = await openConcreteOfferStep(page);
  const coAct = behaviorHost(create);
  await coAct.getByRole("button", { name: "Act together" }).click();
  await coAct.getByLabel("No, I am organizing only").check();
  await coAct.getByLabel("Yes, include the counterparty").check();
  await coAct.getByLabel("Maximum participants").fill("17");
  await expect(coAct.getByText("Group terms are complete for proposal review.")).toBeVisible();

  await create.locator("#reviewOffers").click();
  await create.locator("label.publish-confirm").click();
  await create.getByRole("button", { name: /Submit for review/ }).click();
  await page.waitForURL(/\/trades\/new\?resume=create$/);

  const resumed = page.frameLocator('iframe[title="Moral Trade Create"]');
  await expect(resumed.getByRole("heading", { level: 1, name: "Ready for review." })).toBeVisible();
  await expect(resumed.getByText("CO-ACT · PROPOSAL ONLY")).toBeVisible();

const resumedDraftSnapshot = await resumed.locator("body").evaluate(() =>
  localStorage.getItem("mt:create:group-contribution-drafts:v1"),
);
expect(resumedDraftSnapshot).not.toBeNull();
const resumedDrafts = JSON.parse(resumedDraftSnapshot || "null") as {
  drafts?: Record<string, {
    mode?: string;
    participantLimit?: number;
    counterpartyParticipation?: string;
  }>;
};
expect(resumedDrafts.drafts?.["behavior:1"]).toMatchObject({
  mode: "co-act",
  participantLimit: 17,
  counterpartyParticipation: "explicitly-included",
});

  await resumed.getByRole("button", { name: "Change contributions" }).click();
  await expect(
    resumed.getByRole("heading", { level: 1, name: "What could you offer?" }),
  ).toBeVisible();
  await expect(resumed.locator("[data-mt-group-contribution-host]")).toHaveCount(2);

  const resumedCoAct = behaviorHost(resumed);
  await expect(resumedCoAct.getByRole("button", { name: "Act together" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(resumedCoAct.getByLabel("Maximum participants")).toHaveValue("17");
  await expect(resumedCoAct.getByLabel("Yes, include the counterparty")).toBeChecked();
  await expect(resumedCoAct.getByLabel("No, I am organizing only")).toBeChecked();

  const submittedPayload = submissionCapture.payload;
  if (!submittedPayload) throw new Error("Expected the authentication handoff payload");
  const groupTerms = submittedPayload.groupContributionTerms as {
    execution: string;
    options: Array<{ optionKey: string; terms: { mode: string } }>;
  };
  expect(groupTerms.execution).toBe("proposal-only");
  expect(groupTerms.options[0]?.optionKey).toBe("behavior:1");
});

test("blocks the real Create publish request while group terms are incomplete", async ({ page }) => {
  let publishRequests = 0;
  await page.route("**/api/create/publish", async (route: Route) => {
    publishRequests += 1;
    await route.abort();
  });

  const create = await openConcreteOfferStep(page);
  const coFund = fundingHost(create);
  await coFund.getByRole("button", { name: "Fund together" }).click();
  await expect(coFund.getByText("Complete these terms before continuing:")).toBeVisible();

  await create.locator("#reviewOffers").click();
  await create.locator("label.publish-confirm").click();
  await create.getByRole("button", { name: /Submit for review/ }).click();
  await expect(create.locator("#publishError")).not.toHaveText("");
  expect(publishRequests).toBe(0);
});

test("keeps real iframe group-contribution controls inside a narrow mobile viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const create = await openConcreteOfferStep(page);
  await behaviorHost(create).getByRole("button", { name: "Act together" }).click();
  await behaviorHost(create).getByLabel("No, I am organizing only").check();
  await fundingHost(create).getByRole("button", { name: "Fund together" }).click();
  await fundingHost(create).getByLabel("No, I am organizing only").check();
  await expect(fundingHost(create).getByText("PROPOSAL ONLY")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-co-act-co-fund-proposal.png"),
    fullPage: true,
  });

  const frameDimensions = await create.locator("html").evaluate((element: HTMLElement) => ({
    viewport: element.clientWidth,
    document: element.scrollWidth,
  }));
  const parentDimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(frameDimensions.document).toBeLessThanOrEqual(frameDimensions.viewport + 1);
  expect(parentDimensions.document).toBeLessThanOrEqual(parentDimensions.viewport + 1);
});
