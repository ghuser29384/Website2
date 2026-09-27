import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium, expect } = require('@playwright/test');
const origin = 'https://www.moraltrade.org';
const output = '/tmp/audit-live-evidence';
await mkdir(output, { recursive: true });
const evidence = { origin, startedAt: new Date().toISOString(), expectedCommit: process.env.EXPECTED_RELEASE_SHA, assets: [], routes: [], errors: [], console: [] };
let browser;
try {
  // Check deployed bytes, not only an HTTP success response. Public files contain no secrets.
  for (const asset of ['moral-trade-live.html', 'moral-trade-account-identity.js', 'moral-trade-live-account.js', 'moral-trade-live-now.js', 'moral-trade-live-route-recommendations.js']) {
    const response = await fetch(`${origin}/${asset}`, { signal: AbortSignal.timeout(45000), cache: 'no-store' });
    assert.equal(response.status, 200, asset);
    const actual = Buffer.from(await response.arrayBuffer());
    const expected = await readFile(path.join('public', asset));
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    evidence.assets.push({ asset, status: response.status, expectedSha256: hash(expected), actualSha256: hash(actual) });
    assert.equal(hash(actual), hash(expected), `${asset} is not the exact released file`);
  }
  const apex = await fetch('https://moraltrade.org/commitments', { redirect: 'follow', signal: AbortSignal.timeout(45000) });
  assert.equal(new URL(apex.url).hostname, 'www.moraltrade.org');
  assert.equal(apex.status, 200);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', timezoneId: 'America/Los_Angeles' });
  await context.addCookies([{ name: 'mt_analytics_opt_out', value: '1', domain: 'www.moraltrade.org', path: '/' }]);
  const page = await context.newPage();
  page.on('pageerror', e => evidence.errors.push(e.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) evidence.console.push({type: message.type(), text: message.text()}); });
  async function loaded(route, width = 1440) {
    await page.setViewportSize({ width, height: 950 });
    const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.ok(response && response.status() < 400, `${route} failed`);
    await expect(page.locator('body')).not.toHaveText('');
    await expect(page.locator('html')).toHaveAttribute('lang', /^en(?:-|$)/i);
    const text = await page.locator('body').innerText();
    assert.ok(!/Application error:|Unhandled Runtime Error|Failed to compile/.test(text), route);
    evidence.routes.push({ requested: route, url: page.url(), title: await page.title(), status: response.status(), width });
  }
  for (const width of [1440, 390]) {
    await loaded('/commitments', width);
    await expect(page.locator('#commitments-heading')).toHaveText('Commitments');
    await expect(page.getByRole('heading', {name: 'Sign in to view your commitments.', exact: true})).toBeVisible();
    await expect(page.locator('[data-marketplace-left-nav], .mt-v75-side-plan')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Commitment summary', exact: true})).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Commitments overflow');
    await page.screenshot({ path: `${output}/commitments-guest-${width}.png`, fullPage: false });
    await page.getByRole('navigation', {name: 'Commitments sections', exact: true}).getByRole('link', {name:'Ledger', exact:true}).click();
    await expect(page).toHaveURL(/\/commitments\?tab=ledger/);
    await expect(page.getByRole('navigation', {name:'Commitments sections', exact:true}).getByRole('link', {name:'Ledger', exact:true})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', {name:'Sign in to view your commitments.', exact:true})).toBeVisible();
  }
  await loaded('/offers?view=live&verified=1');
  await expect(page.getByTestId('proposal-search-boundary')).toContainText('not verified outcomes');
  await expect(page.getByTestId('proposal-row')).toHaveCount(0);
  await page.screenshot({ path: `${output}/outcome-filter-boundary.png`, fullPage: false });
  await loaded('/offers?view=live');
  await expect(page.getByLabel('Search proposals', {exact:true})).toBeVisible();
  const filters = page.locator('details').filter({has: page.locator('summary').filter({hasText:'Filter & sort'})}).first();
  await filters.locator(':scope > summary').click();
  await expect(filters).toHaveJSProperty('open', true);
  await expect(page.getByLabel('Sort', {exact:true})).toBeVisible();
  await page.screenshot({ path: `${output}/offers-live.png`, fullPage: false });
  await loaded('/start');
  await expect(page.locator('#start-heading')).toHaveText('Is this your first time here?');
  const choices = page.getByRole('navigation', {name:'Choose how to continue', exact:true});
  await expect(choices.locator('a[href="/walkthrough"]')).toBeVisible();
  await expect(choices.locator('a[href="/login"]')).toBeVisible();
  await choices.locator('a[href="/login"]').click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
  await loaded('/');
  await expect(page.getByRole('navigation', {name:'Primary', exact:true})).toBeVisible({timeout:45000});
  await page.screenshot({ path: `${output}/homepage.png`, fullPage: false });
  assert.deepEqual(evidence.errors, [], 'Unresolved browser page errors');
  evidence.passed = true;
} catch (error) {
  evidence.passed = false;
  evidence.failure = String(error?.stack || error);
  process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  await browser?.close();
}
