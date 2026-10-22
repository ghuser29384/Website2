import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = process.env.APP_ROOT || process.env.GITHUB_WORKSPACE;
const out = process.env.EVIDENCE_DIR;
const sha = process.env.EXPECTED_SHA;
assert.ok(root && out && /^[a-f0-9]{40}$/.test(sha || ''));
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const result = { revision: sha, startedAt: new Date().toISOString(), assets: [], viewports: [], errors: [], blockedWrites: [] };
mkdirSync(out, { recursive: true });
for (const host of ['moraltrade.org', 'www.moraltrade.org']) {
  for (const file of ['moral-trade-live-navigation.js', 'moral-trade-discover.html']) {
    const expected = digest(readFileSync(path.join(root, 'public', file)));
    const url = `https://${host}/${file}?selected_ui_release=${sha}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, url);
    const actual = digest(Buffer.from(await response.arrayBuffer()));
    assert.equal(actual, expected, `Published asset differs: ${url}`);
    result.assets.push({ host, file, sha256: actual, finalUrl: response.url });
  }
}
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', (route) => {
      const request = route.request();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        result.blockedWrites.push({ method: request.method(), path: new URL(request.url()).pathname });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(60000);
    const pageErrors = [];
    const interpreter = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') result.errors.push({ width, url: page.url(), text: message.text() });
    });
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/query/interpret') interpreter.push(request.url());
    });
    const response = await page.goto('https://www.moraltrade.org/contact', { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('.mt-refined-header').first().waitFor();
    assert.equal(await page.title(), 'Contact | Moral Trade');
    const header = page.locator('.mt-refined-header').first();
    assert.deepEqual(await header.locator('[data-mt-primary-links] > a').allTextContents(), ['Feed', 'Discover', 'Messages', 'Commitments']);
    const form = header.locator('form[role="search"]');
    assert.equal(await form.getAttribute('action'), '/offers');
    assert.equal(await form.getAttribute('method'), 'get');
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    await header.screenshot({ path: path.join(out, `live-header-${width}.png`) });
    const more = header.locator('summary').filter({ hasText: 'More' });
    await more.focus();
    await page.keyboard.press('Enter');
    const evidence = header.getByRole('link', { name: 'Evidence', exact: true });
    await evidence.waitFor({ state: 'visible' });
    assert.equal(await evidence.getAttribute('href'), '/evidence');
    assert.equal(await header.getByRole('link', { name: 'Tour', exact: true }).getAttribute('href'), '/walkthrough');
    await evidence.locator('..').screenshot({ path: path.join(out, `live-more-${width}.png`) });
    await page.keyboard.press('Escape');
    await evidence.waitFor({ state: 'hidden' });
    assert.ok(await more.evaluate((node) => node === document.activeElement));
    const footer = page.locator('.mt-site-footer');
    assert.equal(await footer.locator('.mt-footer-links li a').count(), 15);
    assert.match(await footer.innerText(), /Offer an action in exchange for an action you value\./);
    assert.match(await footer.innerText(), /Moral Trade does not provide legal, tax, investment, or blanket impact certification\./);
    assert.equal(await footer.locator('a[href="/bottleneck-atlas"]').count(), 0);
    await footer.screenshot({ path: path.join(out, `live-footer-${width}.png`) });
    await header.getByRole('searchbox', { name: 'Search offers' }).fill('animal welfare');
    await header.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/offers' && url.searchParams.get('search') === 'animal welfare');
    assert.deepEqual(interpreter, []);
    await page.goto('https://www.moraltrade.org/feed', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-mt-primary-links] > a').first().waitFor();
    assert.deepEqual(await page.locator('[data-mt-primary-links] > a').allTextContents(), ['Feed', 'Discover', 'Messages', 'Commitments']);
    await page.locator('.header-more > summary').click();
    await page.locator('.header-more').getByRole('link', { name: 'Evidence', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('.header-more').getByRole('link', { name: 'Tour', exact: true }).getAttribute('href'), '/walkthrough');
    await page.goto('https://www.moraltrade.org/about', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1, name: 'A service for cooperation across moral disagreement.' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/about');
    assert.deepEqual(pageErrors, []);
    result.viewports.push({ width, header: 'pass', more: 'pass', search: 'pass', footer: 'pass', legacyNavigation: 'pass', aboutUnchanged: 'pass', pageErrors });
    await context.close();
  }
  result.status = 'passed';
} finally {
  result.finishedAt = new Date().toISOString();
  await browser.close();
  writeFileSync(path.join(out, 'live-verification.json'), JSON.stringify(result, null, 2));
}
