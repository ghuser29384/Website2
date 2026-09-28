import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.env.APP_ROOT;
const out = process.env.EVIDENCE_DIR;
const sha = process.env.EXPECTED_SHA;
assert.ok(root && out && /^[a-f0-9]{40}$/.test(sha || ''));
const require = createRequire(path.join(root, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const origin = 'https://www.moraltrade.org';
const digest = (data) => createHash('sha256').update(data).digest('hex');
const result = { revision: sha, startedAt: new Date().toISOString(), assets: [], checks: [], pages: [], blockedWrites: [], consoleErrors: [] };
mkdirSync(out, { recursive: true });
let browser;
async function fetchPublic(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), ...options });
  return response;
}
function availability(data) {
  assert.deepEqual(Object.keys(data), ['available']);
  assert.equal(typeof data.available, 'boolean');
  return data.available;
}
try {
  const about = await fetchPublic(`${origin}/about`, { redirect: 'manual' });
  assert.equal(about.status, 308);
  assert.equal(new URL(about.headers.get('location'), origin).href, `${origin}/feed`);
  const profile = await fetchPublic(`${origin}/profile?notice=cleanup-check`, { redirect: 'manual' });
  assert.equal(profile.status, 308);
  assert.equal(new URL(profile.headers.get('location'), origin).href, `${origin}/dashboard?notice=cleanup-check`);
  const api = await fetchPublic(`${origin}/api/navigation/evidence`);
  assert.equal(api.status, 200);
  assert.match(api.headers.get('cache-control') || '', /no-store/);
  result.checks.push({ about: '308 to /feed', profile: 'existing 308 to Dashboard with query preserved', publicEvidenceAvailable: availability(await api.json()) });
  const sitemap = await fetchPublic(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.ok(!xml.includes('<loc>https://www.moraltrade.org/about</loc>'));
  assert.ok(xml.includes('/mpgf/about</loc>'));
  for (const host of ['moraltrade.org', 'www.moraltrade.org']) {
    for (const file of ['moral-trade-evidence-navigation.js', 'moral-trade-live-navigation.js', 'moral-trade-discover.html']) {
      const expected = digest(readFileSync(path.join(root, 'public', file)));
      const response = await fetchPublic(`https://${host}/${file}?cleanup=${sha}`);
      assert.equal(response.status, 200);
      const actual = digest(Buffer.from(await response.arrayBuffer()));
      assert.equal(actual, expected, `${host}/${file}`);
      result.assets.push({ host, file, sha256: actual });
    }
  }
  browser = await chromium.launch();
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', (route) => {
      const request = route.request();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        result.blockedWrites.push({ width, method: request.method(), path: new URL(request.url()).pathname });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    const pageErrors = [];
    const interpreterRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') result.consoleErrors.push({ width, page: new URL(page.url()).pathname, text: message.text(), location: message.location() });
    });
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/query/interpret') interpreterRequests.push(request.method());
    });
    for (const routePath of ['/contact', '/feed', '/discover']) {
      const reading = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/navigation/evidence');
      const response = await page.goto(origin + routePath, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      const visibilityResponse = await reading;
      assert.equal(visibilityResponse.status(), 200);
      const show = availability(await visibilityResponse.json());
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('body')).not.toHaveText('');
      assert.ok((await page.locator('body').innerText()).length > 100);
      assert.equal(await page.locator('nextjs-portal').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${routePath} ${width}`);
      if (routePath === '/contact') {
        await expect(page).toHaveTitle('Contact | Moral Trade');
        const header = page.locator('.mt-site-topbar').first();
        await expect(header.locator('[data-mt-primary-links] > a')).toHaveText(['Feed', 'Discover', 'Messages', 'Commitments']);
        const more = header.locator('summary').filter({ hasText: 'More' });
        await more.focus();
        await page.keyboard.press('Enter');
        await expect(header.locator('a[href="/evidence"]')).toHaveCount(show ? 1 : 0);
        await expect(header.getByRole('link', { name: 'Saved offers', exact: true })).toBeVisible();
        await expect(header.locator('a[href="/cart"]')).toHaveCount(1);
        await expect(header.getByText('Favourites', { exact: true })).toHaveCount(0);
        await expect(header.getByRole('link', { name: 'Tour', exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(out, `live-more-${width}.png`), fullPage: false });
        await more.locator('..').locator('.topbar-menu-panel').screenshot({ path: path.join(out, `live-menu-${width}.png`) });
        await page.keyboard.press('Escape');
        await expect(more).toBeFocused();
        await header.screenshot({ path: path.join(out, `live-header-${width}.png`) });
        const footer = page.locator('.mt-site-footer');
        await expect(footer.locator('.mt-footer-links li a')).toHaveCount(show ? 15 : 14);
        await expect(footer.locator('a[href="/evidence"]')).toHaveCount(show ? 1 : 0);
        await expect(footer.locator('a[href="/safety"]')).toBeAttached();
        await footer.screenshot({ path: path.join(out, `live-footer-${width}.png`) });
        await header.getByRole('searchbox', { name: 'Search offers' }).fill('animal welfare');
        await header.getByRole('button', { name: 'Search', exact: true }).click();
        await page.waitForURL((url) => url.pathname === '/offers' && url.searchParams.get('search') === 'animal welfare');
        assert.deepEqual(interpreterRequests, []);
      } else if (routePath === '/feed') {
        await expect(page.locator('[data-mt-primary-links] > a')).toHaveText(['Feed', 'Discover', 'Messages', 'Commitments']);
        await page.locator('.header-more > summary').click();
        await expect(page.locator('.header-more a[href="/evidence"]')).toHaveCount(show ? 1 : 0);
      } else {
        await expect(page.locator('.discover-footer a[href="/evidence"]')).toHaveCount(show ? 1 : 0);
      }
      result.pages.push({ width, route: routePath, available: show, passed: true });
    }
    await page.goto(`${origin}/about`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(`${origin}/feed`);
    await expect(page.getByRole('heading', { name: 'A service for cooperation across moral disagreement.' })).toHaveCount(0);
    assert.deepEqual(pageErrors, []);
    await context.close();
  }
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.failure = String(error);
  throw error;
} finally {
  if (browser) await browser.close();
  result.finishedAt = new Date().toISOString();
  writeFileSync(path.join(out, 'live-verification.json'), JSON.stringify(result, null, 2));
}
