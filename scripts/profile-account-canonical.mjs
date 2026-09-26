import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = 'https://www.moraltrade.org';
const output = process.env.EVIDENCE_DIR || '/tmp/profile-account-canonical';
await mkdir(output, { recursive: true });
const report = { checkedAt: new Date().toISOString(), sourceSha: process.env.EXPECTED_SHA, browser: 'Chromium', state: 'signed out', passed: false, checks: [] };
const asset = 'moral-trade-live-create-router.js';
const expected = await readFile(`public/${asset}`);
for (const host of ['moraltrade.org', 'www.moraltrade.org']) {
  const response = await fetch(`https://${host}/${asset}?profile-account=${process.env.EXPECTED_SHA}`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200);
  const actual = Buffer.from(await response.arrayBuffer());
  assert.ok(expected.equals(actual), `${host} asset does not match checked-out source`);
  report.checks.push({ host, assetSha256: createHash('sha256').update(actual).digest('hex') });
}
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const response = await page.goto(`${origin}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).pathname, '/profile');
    assert.equal(await page.title(), 'Profile | Moral Trade');
    const account = page.getByTestId('profile-account');
    await account.waitFor({ state: 'visible' });
    assert.ok(await account.getByRole('heading', { name: 'Account', exact: true }).isVisible());
    const priorities = page.getByTestId('profile-priorities-card');
    assert.ok(await priorities.getByRole('link', { name: 'Adjust priorities', exact: true }).isVisible());
    const details = account.locator('details');
    const summary = details.locator('summary');
    assert.equal(await details.evaluate((e) => e.open), false);
    assert.equal(await account.getByText('Trust data unavailable', { exact: true }).isVisible(), false);
    assert.equal(await account.locator('.deal-economics-grid, .commitment-status, .button-primary').count(), 0);
    assert.equal(await account.getByRole('link', { name: 'Back to offers', exact: true }).getAttribute('href'), '/offers');
    const collapsedBox = await account.boundingBox();
    assert.ok(collapsedBox.height < (width > 540 ? 180 : 280));
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1);
    assert.equal(await page.locator('nextjs-portal').count(), 0);
    await page.screenshot({ path: `${output}/profile-${width}.png` });
    await account.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await account.screenshot({ path: `${output}/account-${width}.png` });
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await details.evaluate((e) => e.open), true);
    assert.ok(await account.getByText('Trust data unavailable', { exact: true }).isVisible());
    assert.ok(await account.getByText('Not used', { exact: true }).isVisible());
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1);
    await account.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await account.screenshot({ path: `${output}/account-${width}-expanded.png` });
    await page.keyboard.press('Space');
    assert.equal(await details.evaluate((e) => e.open), false);
    const back = account.getByRole('link', { name: 'Back to offers', exact: true });
    await back.click();
    await page.waitForURL((url) => url.pathname === '/offers', { timeout: 60000 });
    await page.goto(`${origin}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByTestId('profile-account').getByRole('link', { name: 'Sign in to continue', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/login', { timeout: 60000 });
    assert.equal(new URL(page.url()).searchParams.get('returnTo'), '/profile');
    await page.goto(`${origin}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByTestId('profile-priorities-card').getByRole('link', { name: 'Adjust priorities', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/login', { timeout: 60000 });
    const editor = new URL(new URL(page.url()).searchParams.get('returnTo'), origin);
    assert.equal(editor.pathname, '/profile/priorities');
    assert.equal(editor.searchParams.get('returnTo'), '/profile');
    assert.deepEqual(errors, []);
    report.checks.push({ width, collapsedHeight: collapsedBox.height, roleDisclosure: 'keyboard open/close passed', backToOffers: 'passed', accountLoginReturn: 'passed', priorityLoginReturn: 'passed', errors });
    await context.close();
  }
  report.passed = true;
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
