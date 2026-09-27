import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const origins = JSON.parse(process.env.SMOKE_ORIGINS || '[]');
if (!origins.length) throw new Error('Explicit deployment origins are required.');
for (const origin of origins) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || !(url.hostname === 'moraltrade.org' || url.hostname === 'www.moraltrade.org' || /^moraltrade-site-[a-z0-9]+-ellen-s\.vercel\.app$/.test(url.hostname))) {
    throw new Error('Unexpected deployment origin.');
  }
}
mkdirSync('evidence/screens', { recursive: true });
const report = { commit: process.env.CANDIDATE_SHA, deployment: process.env.DEPLOYMENT_ID, startedAt: new Date().toISOString(), assets: [], pages: [], errors: [] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const persist = () => writeFileSync('evidence/rendered-deployment.json', JSON.stringify(report, null, 2));
const browser = await chromium.launch();
let failure;
try {
  for (const origin of origins) {
    for (const asset of ['moral-trade-live-core.txt', 'moral-trade-live.html', 'moral-trade-live-feed.css', 'moral-trade-discover.html', 'moral-trade-discover.css', 'moral-trade-create/ui-repairs.css']) {
      const response = await fetch(`${origin}/${asset}?verify=${process.env.CANDIDATE_SHA}`, { signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) throw new Error(`Asset HTTP ${response.status()}: ${origin}/${asset}`);
      const expected = sha(readFileSync(`public/${asset}`));
      const actual = sha(Buffer.from(await response.arrayBuffer()));
      report.assets.push({ origin, asset, expected, actual });
      persist();
      expect(actual, `Published bytes for ${asset}`).toBe(expected);
    }
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ baseURL: origin, viewport: { width, height: 1000 } });
      await context.addCookies([
        { name: 'mt_walkthrough_seen', value: '1', url: origin },
        { name: 'mt_analytics_opt_out', value: '1', url: origin },
      ]);
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(60000);
      const errors = [];
      const serverErrors = [];
      const consoleErrors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('response', response => {
        if (response.status() >= 500 && new URL(response.url()).origin === origin) serverErrors.push({ path: new URL(response.url()).pathname, status: response.status() });
      });
      async function capture(name) {
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        const screenshot = `evidence/screens/${new URL(origin).hostname}-${name}-${width}.png`;
        await page.screenshot({ path: screenshot });
        report.pages.push({ origin, name, width, url: page.url(), title: await page.title(), geometry, screenshot, errors: [...errors], serverErrors: [...serverErrors], consoleErrors: [...consoleErrors] });
        persist();
        expect(geometry.document, `${name}: horizontal overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(errors, `${name}: uncaught browser errors`).toEqual([]);
        expect(serverErrors, `${name}: same-origin server errors`).toEqual([]);
      }
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
        await expect(page.locator('.mt-home-controls')).toBeVisible();
        await expect(page.locator('.page .head')).toHaveCount(0);
        await expect(page.locator('.page h1')).toHaveCount(0);
        await expect(page.locator('body')).toHaveCSS('background-image', 'none');
        await expect(page.locator('.mt-refined-header [data-mt-primary-links] > a').first()).toHaveText('Home');
        await capture('home');
        await page.locator('.mt-home-controls button[data-action="create"]').click();
        await expect(page).toHaveURL(/\/trades\/new/);
        const create = page.frameLocator('iframe[title="Moral Trade Create"]');
        await expect(create.locator('#causeHeading')).toBeVisible();
        const fontSize = await create.locator('#causeHeading').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeGreaterThanOrEqual(28);
        expect(fontSize).toBeLessThanOrEqual(32);
        await capture('create');

        await page.goto('/discover', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#command-input')).toBeVisible();
        await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
        const nav = page.locator('.mt-refined-header [data-mt-primary-links]').first();
        await expect(nav.locator(':scope > a')).toHaveText(['Home', 'Trades', 'Commitments', 'Profile']);
        await capture('trades');
        await nav.getByRole('link', { name: 'Commitments', exact: true }).click();
        await expect(page.locator('#commitments-heading')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Sign in to view your commitments.' })).toBeVisible();
        await capture('commitments-signed-out');

        await page.locator('.mt-refined-header [data-mt-primary-links]').first().getByRole('link', { name: 'Profile', exact: true }).click();
        await expect(page.locator('#profile-heading')).toBeVisible();
        await expect(page.getByRole('link', { name: /Adjust priorities/ })).toBeVisible();
        await capture('profile');
        await page.getByRole('link', { name: /Adjust priorities/ }).click();
        await expect(page).toHaveURL(/\/login\?returnTo=/);
        await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
        expect(decodeURIComponent(page.url())).toContain('/profile/priorities');
        await capture('priorities-auth');
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard/);
        await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
        await capture('dashboard-auth');

        await page.goto('/moral-trade/technical-spec', { waitUntil: 'domcontentloaded' });
        const card = page.locator('.protocol-contract-card').first();
        await expect(card).toBeVisible();
        await card.scrollIntoViewIfNeeded();
        await capture('technical-contracts');
        const overflowingCards = await page.locator('.protocol-contract-card').evaluateAll(cards => cards.filter(card => card.scrollWidth > card.clientWidth + 1).length);
        expect(overflowingCards).toBe(0);
        await page.goto('/about', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.hero-copy h1')).toBeVisible();
        await capture('about');
        const more = page.locator('.mt-refined-header summary').filter({ hasText: 'More' });
        await more.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.mt-refined-header details[open]')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(more).toBeFocused();
        await page.locator('.mt-refined-header').getByRole('link', { name: 'Moral Trade, home', exact: true }).click();
        await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
      } catch (error) {
        await page.screenshot({ path: `evidence/screens/failure-${new URL(origin).hostname}-${width}.png` }).catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} catch (error) {
  failure = error;
  report.errors.push({ message: error.message, stack: error.stack });
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  persist();
}
if (failure) throw failure;
