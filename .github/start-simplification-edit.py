from pathlib import Path
import sys

p = Path(sys.argv[1]).resolve()
(p/'src/lib/start-paths.ts').write_text('''import { VISITOR_PATHS, type VisitorPath } from "./visitor-paths";

// Presentation only: preserve the existing destinations and their order.
const START_COPY = {
  fund: {
    title: "Make a donation",
    description: "Support a cause through Every.org.",
  },
  create: {
    title: "Create a trade",
    description: "Propose an exchange with someone.",
  },
  pool: {
    title: "Explore funding pools",
    description: "Review opportunities to fund a cause together.",
  },
  explore: {
    title: "Browse trades",
    description: "Find an existing offer to respond to.",
  },
} satisfies Record<VisitorPath["key"], { title: string; description: string }>;

export const START_PATHS = VISITOR_PATHS.map(({ key, href }) => ({
  key,
  href,
  ...START_COPY[key],
}));

export function getStartCreateHref(isAuthenticated: boolean) {
  return isAuthenticated ? "/create" : "/signup?returnTo=/create";
}
''')
(p/'src/app/start/page.tsx').write_text('''import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getStartCreateHref, START_PATHS } from "@/lib/start-paths";

import styles from "./start.module.css";

const description = "Browse trades, create a proposal, make a donation, or explore funding pools.";

export const metadata: Metadata = {
  title: "Get started",
  description,
  alternates: { canonical: "/start" },
  openGraph: {
    title: "Get started | Moral Trade",
    description,
    url: getAbsoluteUrl("/start"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Moral Trade action paths",
  url: getAbsoluteUrl("/start"),
  itemListElement: START_PATHS.map((path, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: path.title,
    url: getAbsoluteUrl(path.href),
    description: path.description,
  })),
};

const getStartViewer = cache(() => getViewer());

function StartHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <SiteTopbar
      brandHref="/"
      links={getPrimaryNavLinks(isAuthenticated)}
      authLink={getTopbarActions(isAuthenticated).authLink}
      showSearch={false}
      showLogout={isAuthenticated}
    />
  );
}

async function StartTopbar() {
  return <StartHeader isAuthenticated={Boolean(await getStartViewer())} />;
}

type StartPath = (typeof START_PATHS)[number];

function StartPathLink({ path, href = path.href }: { path: StartPath; href?: string }) {
  return (
    <Link
      aria-describedby={`start-${path.key}-description`}
      aria-labelledby={`start-${path.key}-title`}
      className={styles.path}
      data-start-path={path.key}
      href={href}
      prefetch={false}
    >
      <span className={styles.pathCopy}>
        <span className={styles.pathTitle} id={`start-${path.key}-title`}>{path.title}</span>
        <span className={styles.pathDescription} id={`start-${path.key}-description`}>
          {path.description}
        </span>
      </span>
      <span aria-hidden="true" className={styles.arrow}>→</span>
    </Link>
  );
}

async function StartCreateLink({ path }: { path: StartPath }) {
  const viewer = await getStartViewer();
  return <StartPathLink path={path} href={getStartCreateHref(Boolean(viewer))} />;
}

export default function StartPage() {
  return (
    <div className={`page-shell ${styles.shell}`}>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <header>
        <Suspense fallback={<StartHeader />}>
          <StartTopbar />
        </Suspense>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.intro}>
          <h1>Get started</h1>
          <p>Choose a first step. Review the details before you commit.</p>
        </div>

        <nav aria-label="Ways to get started" className={styles.paths}>
          {START_PATHS.map((path) => path.key === "create" ? (
            <Suspense
              fallback={<StartPathLink path={path} href={getStartCreateHref(false)} />}
              key={path.key}
            >
              <StartCreateLink path={path} />
            </Suspense>
          ) : (
            <StartPathLink key={path.key} path={path} />
          ))}
        </nav>

        <p className={styles.note}>Choosing a path does not make a payment or accept a trade.</p>

        <details className={styles.safeguards}>
          <summary>Before you commit</summary>
          <div className={styles.safeguardCopy}>
            <p><strong>Payments.</strong> Donations are completed on Every.org. Moral Trade does not hold funds, offer escrow, or decide tax treatment.</p>
            <p><strong>Your limits.</strong> Review the money, time, actions, deadlines, conditions, and cancellation rules before accepting.</p>
            <p><strong>Evidence.</strong> Submitted or imported evidence is not automatically reviewed or verified. Disputed and unavailable evidence remain separate states.</p>
            <Link href="/status" prefetch={false}>Review service boundaries</Link>
          </div>
        </details>
      </main>

      <footer className={styles.footer}>
        <span>© 2026 Moral Trade</span>
        <nav aria-label="Footer">
          <Link href="/privacy" prefetch={false}>Privacy</Link>
          <Link href="/terms" prefetch={false}>Terms</Link>
          <Link href="/accessibility" prefetch={false}>Accessibility</Link>
          <Link href="/contact" prefetch={false}>Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
''')
(p/'src/app/start/start.module.css').write_text('''.shell {
  min-height: 100svh;
  padding-bottom: 24px;
}

.shell .main {
  width: min(100%, 640px);
  margin: clamp(24px, 5vh, 56px) auto 0;
  padding: 0;
}

.intro { margin-bottom: 28px; }
.shell .intro h1 {
  margin: 0 0 12px;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.1;
}
.intro p {
  margin: 0;
  color: var(--ink-soft, #55534e);
  font-size: 16px;
  line-height: 1.6;
}

.paths {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line, #c7c5bd);
  background: var(--surface, #fffdf8);
}
.path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 92px;
  padding: 20px 24px;
  color: var(--ink, #111111);
  border-top: 1px solid var(--line, #c7c5bd);
  text-decoration: none;
}
.path:first-child { border-top: 0; }
.path:hover { background: var(--accent-soft, #e4eaff); }
.pathCopy { display: grid; min-width: 0; gap: 5px; }
.pathTitle { font-size: 18px; font-weight: 600; line-height: 1.3; }
.pathDescription { color: var(--ink-soft, #55534e); font-size: 14px; line-height: 1.5; }
.arrow { flex: 0 0 auto; color: var(--accent, #2450ff); font-size: 23px; line-height: 1; }

.note { margin: 18px 0 24px; color: var(--ink-soft, #55534e); font-size: 13px; line-height: 1.6; }
.safeguards { border-top: 1px solid var(--line, #c7c5bd); }
.safeguards summary {
  width: fit-content;
  min-height: 44px;
  padding: 13px 0;
  color: var(--ink-soft, #55534e);
  cursor: pointer;
  font-size: 14px;
}
.safeguardCopy { padding: 0 0 12px; font-size: 14px; line-height: 1.65; }
.safeguardCopy p { margin: 0 0 12px; color: var(--ink-soft, #55534e); }
.safeguardCopy strong { color: var(--ink, #111111); }
.safeguardCopy a { display: inline-flex; align-items: center; min-height: 44px; color: var(--accent, #2450ff); text-underline-offset: 3px; }

.footer {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 24px;
  width: min(100%, 640px);
  margin: 32px auto 0;
  padding: 16px 0 0;
  color: var(--ink-soft, #55534e);
  font-size: 12px;
}
.footer nav { display: flex; flex-wrap: wrap; gap: 0 16px; }
.footer a { display: inline-flex; align-items: center; min-height: 44px; color: inherit; text-decoration: none; }
.footer a:hover { text-decoration: underline; text-underline-offset: 3px; }
.path:focus-visible, .safeguards summary:focus-visible, .safeguardCopy a:focus-visible, .footer a:focus-visible {
  outline: 2px solid var(--accent, #2450ff);
  outline-offset: 4px;
}

@media (max-width: 600px) {
  .shell .main { margin-top: 24px; }
  .intro { margin-bottom: 20px; }
  .intro p { font-size: 15px; }
  .path { min-height: 88px; padding: 18px 16px; gap: 14px; }
  .pathTitle { font-size: 17px; }
  .footer { margin-top: 20px; }
}
''')
# Update only contracts whose removed copy/metric UI is directly affected.
f=p/'src/lib/action-first-positioning.test.ts'; t=f.read_text()
t=t.replace('assert.match(start, /Make a financial contribution/);','assert.match(start, /START_PATHS/);')
a=t.index('test("the start route streams')
b=t.index('\ntest("the financial action',a)
t=t[:a]+'''test("the start route shows its action shell without waiting for optional marketplace statistics", () => {
  assert.match(start, /export default function StartPage\\(\\)/);
  assert.doesNotMatch(start, /export default async function StartPage/);
  assert.doesNotMatch(start, /getMarketplaceOverview|StartServiceSnapshot|createUnavailableMarketplaceOverview/);
  assert.match(start, /<h1>Get started<\\/h1>/);
  assert.match(start, /<Suspense/);
  assert.match(start, /getStartCreateHref\\(false\\)/);
});
''' + t[b:]
t=t.replace('assert.match(start, /No platform custody/);','assert.match(start, /Moral Trade does not hold funds, offer escrow, or decide tax treatment/);')
f.write_text(t)
f=p/'src/lib/public-route-smoke.test.ts'; t=f.read_text()
old='''  assert.match(startPage, /Choose a real first action/);
  assert.match(startPage, /Fund, create, pool, or explore/);
  assert.match(startPage, /Make a financial contribution/);
  assert.match(startPage, /Provider-hosted payment/);
  assert.match(startPage, /No platform custody/);
  assert.match(startPage, /getMarketplaceOverview/);
  assert.match(startPage, /VISITOR_PATHS\\.map/);'''
new='''  assert.match(startPage, /<h1>Get started<\\/h1>/);
  assert.match(startPage, /Ways to get started/);
  assert.match(startPage, /Donations are completed on Every\\.org/);
  assert.match(startPage, /Moral Trade does not hold funds, offer escrow/);
  assert.doesNotMatch(startPage, /getMarketplaceOverview|growth-progress-card/);
  assert.match(startPage, /START_PATHS\\.map/);
  const startPathsSource = readRepoFile("src/lib/start-paths.ts");
  assert.match(startPathsSource, /VISITOR_PATHS\\.map/);
  assert.match(startPathsSource, /Make a donation/);
  assert.match(startPathsSource, /Create a trade/);
  assert.match(startPathsSource, /Explore funding pools/);
  assert.match(startPathsSource, /Browse trades/);'''
assert t.count(old)==1
t=t.replace(old,new); f.write_text(t)
for name in ['tests/pilot-copy.spec.ts','tests/meta-explanatory-copy.spec.ts']:
 f=p/name; t=f.read_text(); assert t.count('Choose a real first action.')==1
 f.write_text(t.replace('Choose a real first action.','Get started'))
f=p/'tests/sitewide-canonical-visual-fidelity.spec.ts'; t=f.read_text()
a=t.index('test("Start service snapshot'); b=t.index('\ntest("Complete Profile',a)
t=t[:a]+'''test("Start action choices render as distinct non-overlapping rows", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/start", { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Get started" })).toBeVisible();
  const choices = page.getByRole("navigation", { name: "Ways to get started" });
  const links = choices.getByRole("link");
  await expect(links).toHaveCount(4);
  await expect(page.getByRole("complementary", { name: "Current service state" })).toHaveCount(0);
  const bounds = await rect(choices);
  let previousBottom = bounds.top;
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    const box = await rect(link);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(bounds.left);
    expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    expect(box.top).toBeGreaterThanOrEqual(previousBottom - 1);
    previousBottom = box.bottom;
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("start-choices-1440.png"), fullPage: false });
});
''' + t[b:]; f.write_text(t)
(p/'src/lib/start-paths.test.ts').write_text('''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getStartCreateHref, START_PATHS } from "./start-paths";
import { VISITOR_PATHS } from "./visitor-paths";

const page = readFileSync("src/app/start/page.tsx", "utf8");

test("the compact chooser preserves all four original destinations and their order", () => {
  assert.deepEqual(START_PATHS.map(({ key, href }) => ({ key, href })),
    VISITOR_PATHS.map(({ key, href }) => ({ key, href })));
  assert.equal(new Set(START_PATHS.map(({ href }) => href)).size, 4);
});

test("each choice has one short title and a single sentence, not multiple competing labels", () => {
  for (const path of START_PATHS) {
    assert.ok(path.title.length <= 24);
    assert.ok(path.description.length <= 60);
    assert.ok(!("fit" in path) && !("homeTitle" in path) && !("actionLabel" in path));
  }
});

test("creation preserves the existing signed-in path and guest signup return path", () => {
  assert.equal(getStartCreateHref(true), "/create");
  assert.equal(getStartCreateHref(false), "/signup?returnTo=/create");
  assert.match(page, /getStartCreateHref\\(Boolean\\(viewer\\)\\)/);
  assert.match(page, /getStartCreateHref\\(false\\)/);
});

test("the chooser remains synchronous while account-aware UI streams separately", () => {
  assert.match(page, /export default function StartPage\\(\\)/);
  assert.match(page, /cache\\(\\(\\) => getViewer\\(\\)\\)/);
  assert.doesNotMatch(page, /getMarketplaceOverview|StartServiceSnapshot|growth-progress|SiteFooter/);
});

test("selection is navigation, not a payment, profile update, or acceptance", () => {
  assert.match(page, /Choosing a path does not make a payment or accept a trade/);
  assert.doesNotMatch(page, /<form|onClick|localStorage|fetch\\(|use server/);
  assert.match(page, /prefetch=\\{false\\}/);
});

test("payment and consent boundaries stay available without an imposed wizard", () => {
  assert.match(page, /<details className=\\{styles.safeguards\\}>/);
  assert.match(page, /<summary>Before you commit<\\/summary>/);
  assert.match(page, /does not hold funds, offer escrow, or decide tax treatment/);
  assert.match(page, /cancellation rules before accepting/);
  assert.match(page, /not automatically reviewed or verified/);
  for (const href of ["/status", "/privacy", "/terms", "/accessibility", "/contact"]) {
    assert.ok(page.includes(`href="${href}"`));
  }
});

test("visible content and structured metadata use the same chooser source", () => {
  assert.equal((page.match(/START_PATHS\\.map/g) ?? []).length, 2);
  assert.match(page, /aria-label="Ways to get started"/);
  assert.match(page, /aria-labelledby=\\{`start-\\$\\{path.key\\}-title`\\}/);
});
''')
(p/'tests/start-page.spec.ts').write_text('''import { expect, test } from "@playwright/test";

const expectedPaths = [
  { title: "Make a donation", href: "/donate" },
  { title: "Create a trade", href: "/signup?returnTo=/create" },
  { title: "Explore funding pools", href: "/pools" },
  { title: "Browse trades", href: "/offers?view=live" },
];

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL) throw new Error("The Start page tests require the configured app origin.");
  await context.addCookies([{ name: "mt_analytics_opt_out", value: "1", url: baseURL, sameSite: "Lax" }]);
});

for (const width of [1440, 390, 320]) {
  test(`the compact Start chooser is readable and keyboard-operable at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/start");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Get started | Moral Trade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Get started");
    const main = page.getByRole("main");
    const choices = page.getByRole("navigation", { name: "Ways to get started" });
    await expect(choices.getByRole("link")).toHaveCount(4);
    for (const path of expectedPaths) {
      const link = choices.getByRole("link", { name: path.title, exact: true });
      await expect(link).toHaveAttribute("href", path.href);
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    await expect(page.getByRole("complementary", { name: "Current service state" })).toHaveCount(0);
    await expect(page.locator(".growth-progress-card, .growth-start-grid, .mt-site-footer")).toHaveCount(0);
    await expect(main).not.toContainText("Four live paths");
    await expect(main).not.toContainText("Use the strongest current route");
    expect((await main.innerText()).split(/\\s+/).length).toBeLessThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);

    const details = main.locator("details");
    const summary = details.locator("summary");
    const serviceLink = details.getByRole("link", { name: "Review service boundaries" });
    await expect(serviceLink).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`start-${width}.png`), fullPage: true });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(serviceLink).toBeVisible();
    await expect(details).toContainText("Moral Trade does not hold funds");
    await expect(details).toContainText("cancellation rules before accepting");
    await expect(details).toContainText("not automatically reviewed or verified");
    await page.keyboard.press("Enter");
    await expect(serviceLink).toBeHidden();

    const browse = choices.getByRole("link", { name: "Browse trades", exact: true });
    await browse.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\\/discover(?:\\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Browse trades" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the four paths and safeguards work without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/start");
    const choices = page.getByRole("navigation", { name: "Ways to get started" });
    await expect(choices.getByRole("link")).toHaveCount(4);
    await page.getByText("Before you commit", { exact: true }).click();
    await expect(page.getByRole("link", { name: "Review service boundaries" })).toBeVisible();
    await choices.getByRole("link", { name: "Create a trade", exact: true }).click();
    await expect(page).toHaveURL(/\\/signup\\?returnTo=\\/create$/);
  } finally {
    await context.close();
  }
});
''')
