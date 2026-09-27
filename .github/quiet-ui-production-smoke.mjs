import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const expected = process.env.EXPECTED_SHA;
assert.match(expected ?? '', /^[a-f0-9]{40}$/);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expected);
const out = 'production-smoke-evidence';
await mkdir(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { expectedSha: expected, startedAt: new Date().toISOString(), assets: [], pages: [], failures: [] };
const assetPaths = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACM', 'f58ee041dfd909cad7699ed67485cc0a7db95933', expected, '--', 'public/'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const browser = await chromium.launch();
try {
  for (const host of ['moraltrade.org', 'www.moraltrade.org']) {
    for (const path of assetPaths) {
      const url = `https://${host}/${path.slice(7)}?quiet-ui-revision=${expected}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'follow' });
      assert.equal(response.status, 200, url);
      const actual = hash(Buffer.from(await response.arrayBuffer()));
      const source = hash(await readFile(path));
      report.assets.push({ requestedUrl: url, finalUrl: response.url, status: response.status, sourceSha256: source, servedSha256: actual });
      assert.equal(actual, source, `Served asset does not match ${expected}: ${url}`);
    }
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.addCookies([{ name: 'mt_walkthrough_seen', value: '1', domain: host, path: '/', secure: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      const errors = [];
      const preventedWrites = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
          const url = new URL(route.request().url());
          preventedWrites.push({ method: route.request().method(), origin: url.origin, path: url.pathname });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      for (const path of ['/', '/discover', '/trades/new', '/commitments', '/profile', '/dashboard', '/start', '/contact']) {
        const errorStart = errors.length;
        const response = await page.goto(`https://${host}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert.ok(response && response.status() < 400, `Route failed: ${host}${path}`);
        await page.waitForFunction(() => document.querySelector('.topbar, .mt-site-topbar, [aria-label="Primary"]'));
        if (path === '/') {
          await page.locator('[data-mt-live-now="adaptive"]').waitFor();
          assert.equal(await page.locator('.page .head').count(), 0);
          assert.equal(await page.locator('.page h1').count(), 0);
          assert.equal(await page.locator('.mt-home-controls').count(), 1);
          assert.ok(await page.locator('.mt-home-controls button[data-action="create"]').isVisible());
          assert.deepEqual(await page.locator('[data-mt-primary-links] > a').allTextContents(), ['Home', 'Trades', 'Commitments', 'Profile']);
          assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
          const explanation = page.locator('.mt-feed-explanation');
          if (await explanation.count()) {
            assert.equal(await explanation.getAttribute('open'), null);
            await explanation.locator('summary').click();
            assert.notEqual(await explanation.getAttribute('open'), null);
            await explanation.locator('summary').click();
          }
        }
        if (path === '/discover') {
          await page.locator('h1').first().waitFor();
          assert.deepEqual(await page.locator('[data-mt-primary-links] > a').allTextContents(), ['Home', 'Trades', 'Commitments', 'Profile']);
        }
        if (path === '/trades/new') {
          await page.frameLocator('iframe[title="Moral Trade Create"]').locator('#causeHeading').waitFor();
        }
        if (['/profile', '/dashboard'].includes(path)) {
          assert.equal(new URL(page.url()).pathname, '/login');
          await page.locator('[data-mt-surface="auth"]').waitFor();
        }
        if (path === '/start') {
          await page.getByRole('link', { name: 'Open the walkthrough', exact: true }).waitFor();
          await page.getByRole('link', { name: 'Go to sign in', exact: true }).waitFor();
        }
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 1, `${host}${path} overflow ${overflow}px at ${width}`);
        const label = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-');
        const screenshot = `${out}/${host}-${label}-${width}.png`;
        await page.screenshot({ path: screenshot, fullPage: false });
        const ownErrors = errors.slice(errorStart);
        report.pages.push({ requestedUrl: `https://${host}${path}`, finalUrl: page.url(), status: response.status(), width, overflow, screenshot, pageErrors: ownErrors });
        assert.deepEqual(ownErrors, [], `Browser errors on ${host}${path}`);
        if (path === '/contact') {
          const nav = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === '/');
          await page.getByRole('link', { name: 'Moral Trade, home', exact: true }).click();
          await nav;
          await page.locator('[data-mt-live-now="adaptive"]').waitFor();
          report.pages.push({ action: 'React brand to standalone Home', host, width, finalUrl: page.url(), passed: true });
        }
      }
      report.pages.push({ host, width, preventedNonReadRequests: preventedWrites });
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
