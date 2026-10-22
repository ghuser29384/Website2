import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const core = readFileSync("public/moral-trade-live-core.txt", "utf8");
const scriptNames = [...loader.matchAll(/<script src="\/([^"<>]+\.js)"/g)].map((match) => match[1]);
const styleNames = [...loader.matchAll(/href="\/([^"<>]+\.css)"/g)].map((match) => match[1]);
const emptyStates = ["no_matches", "signed_out", "profile_incomplete", "unavailable"];

function asset(name: string, baseline = false) {
  const directory = baseline && name.startsWith("moral-trade-live-feed-diagnostics.")
    ? process.env.FEED_LAYOUT_BASELINE_DIR || "public"
    : "public";
  return readFileSync(path.join(directory, name), "utf8");
}

function fixture(status = "no_matches", external = 0, evaluated = 0) {
  const opportunities = [
    ["fa300000-0000-4000-8000-000000000001", "Community gardens", "Help at a local garden for two afternoons.", "Review an educational resource and share written feedback."],
    ["fa300000-0000-4000-8000-000000000002", "Open education", "Proofread a short educational guide.", "Contribute two hours to a community project."],
  ].map(([id, cause, offerAction, requestAction]) => ({
    id, opportunityType: "offer", mode: "pledge", offeredCause: cause,
    requestedCause: "Community service", offerAction, requestAction,
    ownerAlias: "QA participant", sourceLabel: "Your live offer",
    href: `/trades/${id}/manage`, ctaLabel: "Manage & invite",
    duration: "Two weeks", verification: "Share a brief completion summary.",
    summary: "Synthetic layout-test listing; not a real offer.",
    metadata: { mechanism: "published_offer", origin: "published" },
  }));
  return {
    authenticated: status !== "signed_out", status,
    generatedAt: "2026-09-25T12:00:00Z",
    profile: {
      causes: status === "signed_out" || status === "profile_incomplete" ? [] : [
        "Community gardens", "Open education", "Public libraries", "Scientific research",
        "Clean water", "Community service", "Conservation", "Accessible learning",
        "Arts education", "Long-term community projects and educational resources",
      ],
      weightedCauses: [], learningEnabled: false,
    },
    recommendations: status === "ready" ? [{ ...opportunities[0], href: `/offers/${opportunities[0].id}`, ctaLabel: "Review proposal", matchClass: "near" }] : [],
    ownedOpportunities: status === "signed_out" ? [] : opportunities,
    ownedOpportunityCount: status === "signed_out" ? 0 : 42,
    routePlanner: { status: "unavailable", checkedAt: "2026-09-25T12:00:00Z", profile: {}, needsMoreInput: [], routes: [], comparison: null, candidateCount: 0 },
    feedDiagnostics: status === "no_matches" || status === "ready" ? {
      version: "hybrid-reciprocal-v1", inventorySemanticsVersion: "external-candidate-funnel-v1",
      checkedAt: "2026-09-25T12:00:00Z", platformInventoryCount: 42 + external,
      viewerOwnedExcludedCount: 42, externalInventoryCount: external,
      evaluatedCandidateCount: evaluated, checkedInventoryCount: evaluated,
      selectedCount: status === "ready" ? 1 : 0, directCount: 0,
      nearMatchCount: status === "ready" ? 1 : 0, adjacentCount: 0, discoveryCount: 0,
      eligibleCount: evaluated, retrievalPoolCount: evaluated,
      semanticCandidateCount: evaluated, retrievalMode: "deterministic_fallback",
      excludedByReason: {}, softBlockers: {}, knownConstraintBlockers: {},
    } : undefined,
  };
}

async function loadFeed(page: Page, data = fixture(), baseline = false) {
  await page.route("**/*", (route) => route.abort());
  await page.goto("about:blank");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  // No production network access: controls retain their destinations, but requests
  // are never delivered. Unrecognized API calls fail closed, not as mock successes.
  const bootstrap = `<script>
    window.__MT_LIVE_NOW_BOOTSTRAP__=${JSON.stringify(data).replace(/</g, "\\u003c")};
    window.__MT_LIVE_ACCOUNT_BOOTSTRAP__={authenticated:true,displayName:"QA participant"};
    window.__QA_REQUESTS__=[];
    window.fetch=async (url, options={}) => {
      window.__QA_REQUESTS__.push({url:String(url),method:options.method||"GET"});
      return new Response(JSON.stringify({authenticated:false,status:"unavailable"}),{status:503,headers:{"Content-Type":"application/json"}});
    };
  </script>`;
  const styles = styleNames.map((name) => `<style>${asset(name, baseline)}</style>`).join("");
  const scripts = scriptNames.map((name) => `<script>${asset(name, baseline).replace(/<\/script/gi, "<\\/script")}</script>`);
  // Match the real loader's two identity scripts in head and its enhancement order.
  const html = core
    .replace("</head>", () => `${bootstrap}${styles}${scripts.slice(0, 2).join("")}</head>`)
    .replace("</body>", () => `${scripts.slice(2).join("")}</body>`);
  await page.setContent(html, { waitUntil: "load" });
  await expect(page.locator(`[data-mt-live-now-state="${data.status}"]`)).toHaveCount(1);
  if (emptyStates.includes(data.status) && !baseline) {
    await expect(page.locator(".mt-feed-context")).toHaveCount(1);
  }
  return errors;
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const boxes = await page.locator(".mt-feed-empty-layout :is(a, button, summary)").evaluateAll((nodes) => nodes
    .filter((node) => (node as HTMLElement).checkVisibility())
    .map((node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  expect(boxes.every((box) => box.left >= -1 && box.right <= (page.viewportSize()?.width || 1440) + 1)).toBe(true);
}

test("uses the real static loader assets and retains its integrity gate", () => {
  expect(scriptNames).toContain("moral-trade-live-feed-diagnostics.js");
  expect(styleNames).toContain("moral-trade-live-feed-diagnostics.css");
  expect(scriptNames.length).toBeGreaterThan(12);
});

for (const width of [320, 375, 390, 480, 768, 1024, 1440, 1652]) {
  test(`empty feed reflows at ${width}px, preserving details and action destinations`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = await loadFeed(page);
    const root = page.locator(".mt-feed-empty-layout");
    await expect(root.locator(".urgent h2")).toHaveText("No external opportunities are available yet.");
    await expect(root.locator(".urgent .terms")).toHaveCount(0);
    await expect(root.locator(".mt-feed-context")).not.toHaveAttribute("open", "");
    await expect(root.getByRole("link", { name: "Browse all opportunities" })).toHaveAttribute("href", /\/offers\?/);
    await expect(root.getByRole("link", { name: "Adjust priorities" })).toHaveAttribute("href", "/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now");
    await expect(root.locator(".mt-owned-card")).toHaveCount(2);
    await noOverflow(page);
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: testInfo.outputPath(`feed-${width}.png`), fullPage: true });
      await page.screenshot({ path: testInfo.outputPath(`feed-${width}-viewport.png`) });
    }
    const toggle = root.locator(".mt-feed-context > summary");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(root.getByText("No guessed priorities", { exact: true })).toBeVisible();
    await expect(root.locator(".mt-feed-empty-diagnostics ol")).not.toBeVisible();
    await root.locator(".mt-feed-empty-diagnostics > summary").click();
    await expect(root.getByText("Platform live inventory", { exact: true })).toBeVisible();
    await noOverflow(page);
    // Repeated enhancement events must not duplicate or collapse user-opened context.
    await page.evaluate(() => { for (let i = 0; i < 10; i++) window.dispatchEvent(new Event("mt:live-now-ready")); });
    await expect(root.locator(".mt-feed-context")).toHaveCount(1);
    await expect(root.locator(".mt-feed-context")).toHaveAttribute("open", "");
    await expect(root.locator(".mt-feed-empty-diagnostics")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

for (const state of ["signed_out", "profile_incomplete", "unavailable"]) {
  test(`${state} keeps its own message and primary action without diagnostics`, async ({ page }) => {
    const errors = await loadFeed(page, fixture(state));
    const root = page.locator(".mt-feed-empty-layout");
    await expect(root.locator(".urgent h2")).not.toHaveText("No external opportunities are available yet.");
    await expect(root.locator(".urgent a").first()).toHaveAttribute("href", state === "signed_out" ? /\/login/ : state === "profile_incomplete" ? "/complete-profile" : /moral-trade-live\.html/);
    await root.locator(".mt-feed-context > summary").click();
    await expect(root.locator(".mt-feed-empty-facts strong")).toHaveCount(2);
    await expect(root.locator(".mt-feed-empty-diagnostics")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const [external, evaluated, title] of [
  [12, 0, "External opportunities exist, but none were eligible to evaluate."],
  [12, 8, "No direct match currently clears your criteria."],
] as const) {
  test(`retains inventory semantics for ${external} external, ${evaluated} evaluated`, async ({ page }) => {
    await loadFeed(page, fixture("no_matches", external, evaluated));
    await expect(page.locator(".urgent h2")).toHaveText(title);
    await page.locator(".mt-feed-context > summary").click();
    await expect(page.locator(".mt-feed-empty-facts strong").first()).toContainText(String(evaluated || external));
  });
}

test("a ready feed is not rearranged and still exposes its matching diagnostics", async ({ page }) => {
  const errors = await loadFeed(page, fixture("ready", 12, 8));
  await expect(page.locator(".mt-feed-empty-layout")).toHaveCount(0);
  await expect(page.locator(".mt-feed-context")).toHaveCount(0);
  await expect(page.locator(".mt-feed-diagnostics")).toHaveCount(1);
  await expect(page.locator(".mt-feed-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Focus → Plan resources → Focus rebuilds a single compact context", async ({ page }) => {
  const errors = await loadFeed(page);
  await page.getByRole("button", { name: "Plan resources", exact: true }).click();
  await expect(page.locator(".mt-feed-context")).toHaveCount(0);
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.locator(".mt-feed-context")).toHaveCount(1);
  await expect(page.locator(".mt-owned-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("desktop comparison brings the first own listing substantially higher", async ({ page }, testInfo) => {
  test.skip(!process.env.FEED_LAYOUT_BASELINE_DIR, "Provide exact-base assets for the before/after comparison.");
  await loadFeed(page, fixture(), true);
  const before = (await page.locator(".mt-owned-card").first().boundingBox())!.y;
  await page.screenshot({ path: testInfo.outputPath("feed-before.png"), fullPage: true });
  await loadFeed(page);
  const after = (await page.locator(".mt-owned-card").first().boundingBox())!.y;
  expect(before - after).toBeGreaterThan(150);
  expect(after).toBeLessThan(650);
  await testInfo.attach("layout-comparison", { body: JSON.stringify({ before, after, pixelsSaved: before - after }), contentType: "application/json" });
});
