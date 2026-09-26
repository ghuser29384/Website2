from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()

(root / "src/app/start/page.tsx").write_text('''import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks } from "@/lib/site";

import styles from "./start.module.css";

const description =
  "Choose whether to review Moral Trade's main features or continue directly to sign in.";

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

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export default async function StartPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/feed");

  return (
    <div className={`page-shell ${styles.shell}`}>
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(false)}
          showLogout={false}
          showSearch={false}
        />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section aria-labelledby="start-heading" className={styles.content}>
          <div className={styles.intro}>
            <h1 id="start-heading">Is this your first time here?</h1>
            <p>Choose whether to review the main features or continue to sign in.</p>
          </div>

          <nav aria-label="Choose how to continue" className={styles.choices}>
            <Link
              aria-describedby="start-review-description"
              className={`${styles.choice} ${styles.reviewChoice}`}
              href="/walkthrough"
              prefetch={false}
            >
              <span className={styles.choiceTitle}>Yes — or I want a review</span>
              <span className={styles.choiceDescription} id="start-review-description">
                See the main features in the interactive walkthrough.
              </span>
              <span className={styles.choiceAction}>
                Open the walkthrough
                <ArrowIcon />
              </span>
            </Link>

            <Link
              aria-describedby="start-login-description"
              className={styles.choice}
              href="/login"
              prefetch={false}
            >
              <span className={styles.choiceTitle}>No — I know the main features</span>
              <span className={styles.choiceDescription} id="start-login-description">
                Continue to your account sign-in.
              </span>
              <span className={styles.choiceAction}>
                Go to sign in
                <ArrowIcon />
              </span>
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}
''')

(root / "src/app/start/start.module.css").write_text('''.shell {
  min-height: 100svh;
  background: var(--paper, #f5f2e9);
}

.main {
  display: grid;
  width: min(100%, 960px);
  min-height: calc(100svh - 76px);
  margin: 0 auto;
  padding: clamp(48px, 8vw, 112px) 24px 72px;
  align-items: start;
}

.content {
  width: 100%;
}

.intro {
  max-width: 680px;
  margin-bottom: 32px;
}

.intro h1 {
  margin: 0 0 14px;
  color: var(--ink, #111214);
  font-size: clamp(38px, 5vw, 60px);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.04;
}

.intro p {
  max-width: 580px;
  margin: 0;
  color: var(--ink-soft, #565750);
  font-size: 17px;
  line-height: 1.6;
}

.choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.choice {
  display: flex;
  min-width: 0;
  min-height: 240px;
  padding: 28px;
  flex-direction: column;
  border: 1px solid var(--line, #c8c6be);
  border-radius: 3px;
  background: var(--surface, #fffdf8);
  color: var(--ink, #111214);
  text-decoration: none;
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}

.choice:hover {
  border-color: var(--accent, #3158ff);
  box-shadow: 0 8px 24px rgb(17 18 20 / 8%);
}

.reviewChoice {
  border-color: color-mix(in srgb, var(--accent, #3158ff) 58%, var(--line, #c8c6be));
  background: color-mix(in srgb, var(--accent, #3158ff) 6%, var(--surface, #fffdf8));
}

.choiceTitle {
  max-width: 360px;
  font-size: clamp(21px, 2.2vw, 27px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.choiceDescription {
  max-width: 360px;
  margin-top: 12px;
  color: var(--ink-soft, #565750);
  font-size: 15px;
  line-height: 1.55;
}

.choiceAction {
  display: inline-flex;
  margin-top: auto;
  padding-top: 28px;
  align-items: center;
  gap: 9px;
  color: var(--accent, #3158ff);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
}

.choiceAction svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.choice:focus-visible {
  outline: 3px solid var(--accent, #3158ff);
  outline-offset: 4px;
}

@media (max-width: 680px) {
  .main {
    min-height: calc(100svh - 70px);
    padding: 36px 16px 48px;
  }

  .intro {
    margin-bottom: 24px;
  }

  .intro h1 {
    font-size: clamp(34px, 11vw, 46px);
  }

  .intro p {
    font-size: 15px;
  }

  .choices {
    grid-template-columns: minmax(0, 1fr);
  }

  .choice {
    min-height: 188px;
    padding: 22px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .choice {
    transition: none;
  }
}
''')

(root / "src/lib/start-entry-router.test.ts").write_text('''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/start/page.tsx", "utf8");
const styles = readFileSync("src/app/start/start.module.css", "utf8");

test("Get Started asks one guest-routing question with exactly two destinations", () => {
  assert.match(page, /<h1 id="start-heading">Is this your first time here\?<\/h1>/);
  assert.match(page, /href="\/walkthrough"/);
  assert.match(page, /href="\/login"/);
  assert.equal((page.match(/className=\{styles\.choice\}|className=\{`\$\{styles\.choice\}/g) ?? []).length, 2);
  assert.ok(page.indexOf('href="/walkthrough"') < page.indexOf('href="/login"'));
});

test("new or reviewing visitors go to the walkthrough and informed visitors go to login", () => {
  assert.match(page, /Yes — or I want a review/);
  assert.match(page, /Open the walkthrough/);
  assert.match(page, /No — I know the main features/);
  assert.match(page, /Go to sign in/);
});

test("authenticated visitors never see the guest Get Started decision", () => {
  assert.match(page, /const viewer = await getViewer\(\)/);
  assert.match(page, /if \(viewer\) redirect\("\/feed"\)/);
});

test("the page does not repeat its own Get Started action or run marketplace logic", () => {
  assert.doesNotMatch(page, /getTopbarActions|primaryAction|getMarketplaceOverview|VISITOR_PATHS|QuickWalkthrough/);
  assert.match(page, /showSearch=\{false\}/);
  assert.doesNotMatch(page, /<form|useState|onClick|fetch\(/);
});

test("the two choices remain native, non-mutating links", () => {
  assert.equal((page.match(/prefetch=\{false\}/g) ?? []).length, 2);
  assert.doesNotMatch(page, /server action|use server|localStorage|sessionStorage/);
  assert.match(page, /aria-label="Choose how to continue"/);
});

test("the layout collapses to one column and retains visible focus", () => {
  assert.match(styles, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /\.choice:focus-visible/);
  assert.match(styles, /min-height:\s*188px/);
});
''')

(root / "tests/start-entry-router.spec.ts").write_text('''import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`Get Started presents two clear guest paths at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const response = await page.goto("/start", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page).toHaveTitle("Get started | Moral Trade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Is this your first time here?",
    );

    const chooser = page.getByRole("navigation", { name: "Choose how to continue" });
    const review = chooser.getByRole("link", { name: /Yes — or I want a review/ });
    const login = chooser.getByRole("link", { name: /No — I know the main features/ });
    await expect(chooser.getByRole("link")).toHaveCount(2);
    await expect(review).toHaveAttribute("href", "/walkthrough");
    await expect(login).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Get started", exact: true })).toHaveCount(0);

    for (const link of [review, login]) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 1,
    );
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`get-started-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("the review choice opens the full walkthrough", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("link", { name: /Yes — or I want a review/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/walkthrough");
});

test("the informed-user choice opens login", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("link", { name: /No — I know the main features/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
});

test("the decision works without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/start");
    const chooser = page.getByRole("navigation", { name: "Choose how to continue" });
    await expect(chooser.getByRole("link")).toHaveCount(2);
    await chooser.getByRole("link", { name: /No — I know the main features/ }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  } finally {
    await context.close();
  }
});
''')

# Update the existing source contracts to describe the new routing role.
action_path = root / "src/lib/action-first-positioning.test.ts"
action = action_path.read_text()
action = action.replace(
  '  assert.match(start, /Make a financial contribution/);',
  '  assert.match(start, /Open the walkthrough/);\n  assert.match(start, /Go to sign in/);',
)
old_stream = '''test("the start route streams its critical action shell before optional live state", () => {
  assert.match(start, /export default function StartPage\\(\\)/);
  assert.doesNotMatch(start, /export default async function StartPage/);
  assert.match(start, /createUnavailableMarketplaceOverview\\(\\)/);
  assert.ok(
    start.indexOf("<h1>Choose a real first action.</h1>") <
      start.indexOf("<StartServiceSnapshot />"),
  );
});'''
new_stream = '''test("the start route sends guests to review or login and redirects existing users", () => {
  assert.match(start, /export default async function StartPage\\(\\)/);
  assert.match(start, /const viewer = await getViewer\\(\\)/);
  assert.match(start, /if \\(viewer\\) redirect\\("\\/feed"\\)/);
  assert.match(start, /href="\\/walkthrough"/);
  assert.match(start, /href="\\/login"/);
  assert.doesNotMatch(start, /getMarketplaceOverview|StartServiceSnapshot|VISITOR_PATHS/);
});'''
assert old_stream in action
action = action.replace(old_stream, new_stream)
action = action.replace(
  '  assert.match(start, /No platform custody/);',
  '  assert.doesNotMatch(start, /Make a financial contribution|EveryOrgDonateButton/);',
)
action_path.write_text(action)

public_path = root / "src/lib/public-route-smoke.test.ts"
public = public_path.read_text()
old_public = '''  assert.match(startPage, /Choose a real first action/);
  assert.match(startPage, /Fund, create, pool, or explore/);
  assert.match(startPage, /Make a financial contribution/);
  assert.match(startPage, /Provider-hosted payment/);
  assert.match(startPage, /No platform custody/);
  assert.match(startPage, /getMarketplaceOverview/);
  assert.match(startPage, /VISITOR_PATHS\\.map/);'''
new_public = '''  assert.match(startPage, /Is this your first time here\\?/);
  assert.match(startPage, /href="\\/walkthrough"/);
  assert.match(startPage, /href="\\/login"/);
  assert.match(startPage, /if \\(viewer\\) redirect\\("\\/feed"\\)/);
  assert.doesNotMatch(startPage, /getMarketplaceOverview|VISITOR_PATHS\\.map|Make a financial contribution/);'''
assert old_public in public
public_path.write_text(public.replace(old_public, new_public))

pilot_path = root / "tests/pilot-copy.spec.ts"
pilot = pilot_path.read_text()
pilot = pilot.replace("redirects to the action-first start page", "redirects to the guest Get Started choice page")
pilot = pilot.replace('name: "Choose a real first action."', 'name: "Is this your first time here?"')
pilot_path.write_text(pilot)

meta_path = root / "tests/meta-explanatory-copy.spec.ts"
meta = meta_path.read_text()
meta = meta.replace('name: "Choose a real first action."', 'name: "Is this your first time here?"')
meta_path.write_text(meta)

visual_path = root / "tests/sitewide-canonical-visual-fidelity.spec.ts"
visual = visual_path.read_text()
start = visual.index('test("Start service snapshot')
end = visual.index('\ntest("Complete Profile', start)
replacement = '''test("Start choice routes render as distinct non-overlapping cards", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/start", { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Is this your first time here?" })).toBeVisible();

  const chooser = page.getByRole("navigation", { name: "Choose how to continue" });
  const choices = chooser.getByRole("link");
  await expect(choices).toHaveCount(2);
  const chooserRect = await rect(chooser);
  const first = await rect(choices.nth(0));
  const second = await rect(choices.nth(1));
  expect(first.height).toBeGreaterThanOrEqual(44);
  expect(second.height).toBeGreaterThanOrEqual(44);
  expect(first.left).toBeGreaterThanOrEqual(chooserRect.left - 1);
  expect(second.right).toBeLessThanOrEqual(chooserRect.right + 1);
  expect(first.right + 8).toBeLessThanOrEqual(second.left);

  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("start-choice-router-1440.png"),
    fullPage: false,
  });
});
'''
visual_path.write_text(visual[:start] + replacement + visual[end:])
