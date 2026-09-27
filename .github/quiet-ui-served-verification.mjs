import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const expected = process.env.EXPECTED_SHA;
assert.match(expected ?? '', /^[a-f0-9]{40}$/);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expected);
const origins = JSON.parse(process.env.BASE_URLS ?? '[]');
assert.ok(Array.isArray(origins) && origins.length > 0 && origins.length <= 2);
for (const origin of origins) {
  const url = new URL(origin);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.origin, origin);
  assert.ok(['moraltrade.org', 'www.moraltrade.org'].includes(url.hostname) || /^moraltrade-site-[a-z0-9-]+\.vercel\.app$/.test(url.hostname));
}
const out = 'quiet-ui-served-evidence';
await mkdir(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { expectedSha: expected, tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), assets: [], pages: [], failures: [] };
const assets = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACM', 'caa25edccad0a444d4d18b45046a9e3fdfc1abf8', expected, '--', 'public/'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
assert.ok(assets.length > 0);
const browser = await chromium.launch();
try {
  for (const origin of origins) {
    const hostname = new URL(origin).hostname;
    for (const path of assets) {
      const response = await fetch(`${origin}/${path.slice(7)}?quiet-ui-revision=${expected}`, { signal: AbortSignal.timeout(30000), redirect: 'follow' });
      assert.equal(response.status, 200, `Cannot read served asset ${hostname}/${path}`);
      const servedSha256 = hash(Buffer.from(await response.arrayBuffer()));
      const sourceSha256 = hash(await readFile(path));
      report.assets.push({ origin, path, finalUrl: response.url, status: response.status, servedSha256, sourceSha256 });
      assert.equal(servedSha256, sourceSha256, `Stale or different asset: ${hostname}/${path}`);
    }
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const domains = hostname.endsWith('moraltrade.org') ? ['moraltrade.org', 'www.moraltrade.org'] : [hostname];
      await context.addCookies(domains.map(domain => ({ name: 'mt_walkthrough_seen', value: '1', domain, path: '/', secure: true, sameSite: 'Lax' })));
      const page = await context.newPage();
      const pageErrors = [], consoleErrors = [], preventedWrites = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        // This source-reviewed POST endpoint only searches public inventory.
        const readOnlySearch = request.method() === 'POST' && url.pathname === '/api/discover/search' && domains.includes(url.hostname);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !readOnlySearch) {
          preventedWrites.push({ method: request.method(), origin: url.origin, path: url.pathname });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      for (const path of ['/', '/discover', '/trades/new', '/commitments', '/profile', '/dashboard', '/start', '/contact']) {
        const errorsBefore = pageErrors.length;
        const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert.ok(response && response.status() < 400, `Failed route ${origin}${path}`);
        if (path === '/') {
          await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
          await expect(page.locator('.page .head, .page h1')).toHaveCount(0);
          await expect(page.locator('.mt-home-controls')).toBeVisible();
          await expect(page.locator('.mt-home-controls button[data-action="create"]')).toBeVisible();
          assert.deepEqual(await page.locator('[data-mt-primary-links] > a').allTextContents(), ['Home', 'Trades', 'Commitments', 'Profile']);
          await expect(page.locator('body')).toHaveCSS('background-image', 'none');
          const explanation = page.locator('.mt-feed-explanation');
          if (await explanation.count()) {
            await expect(explanation).not.toHaveAttribute('open', '');
            await explanation.locator('summary').click();
            await expect(explanation).toHaveAttribute('open', '');
            await explanation.locator('summary').click();
          }
        } else if (path === '/discover') {
          await expect(page.getByRole('heading', { name: 'Browse trades', exact: true })).toBeVisible();
          assert.deepEqual(await page.locator('[data-mt-primary-links] > a').allTextContents(), ['Home', 'Trades', 'Commitments', 'Profile']);
          await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
          await page.locator('#command-input').fill('research');
          await page.locator('#command-form').getByRole('button', { name: 'Search', exact: true }).click();
          await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
          report.pages.push({ origin, width, action: 'Search current trades', state: await page.locator('#search-status').innerText() });
          await page.locator('#clear-search').click();
          await expect(page.locator('#command-input')).toHaveValue('');
        } else if (path === '/trades/new') {
          const create = page.frameLocator('iframe[title="Moral Trade Create"]');
          await expect(create.locator('#causeHeading')).toBeVisible();
          await expect(create.locator('body')).toHaveCSS('background-image', 'none');
          const size = await create.locator('#causeHeading').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
          assert.ok(size >= 28 && size <= 32);
        } else if (path === '/commitments') {
          await expect(page.getByRole('heading', { name: 'Commitments', exact: true })).toBeVisible();
          await expect(page.getByRole('heading', { name: 'Sign in to view your commitments.', exact: true })).toBeVisible({ timeout: 15000 });
          await expect(page.locator('[aria-label="Commitment summary"]')).toHaveCount(0);
        } else if (path === '/profile') {
          await expect(page.locator('[data-testid="profile-priorities-card"]')).toBeVisible();
          await expect(page.getByRole('link', { name: 'Adjust priorities' })).toBeVisible();
        } else if (path === '/dashboard') {
          await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
          await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
        } else if (path === '/start') {
          await expect(page.getByRole('link', { name: 'Open the walkthrough', exact: true })).toBeVisible();
          await expect(page.getByRole('link', { name: 'Go to sign in', exact: true })).toBeVisible();
        } else {
          await expect(page.locator('.mt-refined-header')).toBeVisible();
        }
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 1, `${origin}${path} overflows ${overflow}px at ${width}`);
        const label = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-');
        const screenshot = `${out}/${hostname}-${label}-${width}.png`;
        await page.screenshot({ path: screenshot, fullPage: false });
        const errors = pageErrors.slice(errorsBefore);
        report.pages.push({ requestedUrl: `${origin}${path}`, finalUrl: page.url(), status: response.status(), width, overflow, screenshot, pageErrors: errors });
        assert.deepEqual(errors, [], `Uncaught browser exception on ${origin}${path}`);
        if (path === '/') {
          await page.locator('.mt-home-controls button[data-action="create"]').click();
          await expect(page).toHaveURL(/\/trades\/new/);
          await expect(page.frameLocator('iframe[title="Moral Trade Create"]').locator('#causeHeading')).toBeVisible();
          report.pages.push({ origin, width, action: 'Home Create opens the real creation flow', passed: true });
        }
        if (path === '/profile') {
          await page.getByRole('link', { name: 'Adjust priorities' }).click();
          await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 15000 });
          await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
          report.pages.push({ origin, width, action: 'Profile priorities preserves sign-in boundary', finalUrl: page.url(), passed: true });
        }
        if (path === '/contact') {
          const navigation = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === '/');
          await page.locator('.mt-refined-header').getByRole('link', { name: 'Moral Trade, home', exact: true }).click();
          await navigation;
          await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
          report.pages.push({ origin, width, action: 'React brand uses document navigation to Home', finalUrl: page.url(), passed: true });
        }
      }
      report.pages.push({ origin, width, consoleErrors, preventedNonReadRequests: preventedWrites });
      await context.close();
    }
  }
} catch (error) {
  report.failures.push(error.stack ?? String(error));
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
