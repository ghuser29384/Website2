import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = 'retirement-production-evidence';
await mkdir(output, { recursive: true });
const startedAt = new Date().toISOString();
const core = await readFile('public/moral-trade-live-core.txt');
const loader = await readFile('public/moral-trade-live.html');
const records = [];
const browser = await chromium.launch();
let failure;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    await context.addCookies([
      { name: 'mt_walkthrough_seen', value: '1', domain: 'www.moraltrade.org', path: '/' },
      { name: 'mt_analytics_opt_out', value: '1', domain: 'www.moraltrade.org', path: '/' },
    ]);
    const blocked = [];
    await context.route('**/*', route => {
      if (['GET', 'HEAD'].includes(route.request().method())) return route.continue();
      blocked.push({ method: route.request().method(), path: new URL(route.request().url()).pathname });
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function snapshot(name) {
      const text = await page.locator('body').innerText();
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
      await page.screenshot({ path: `${output}/${width}-${name}.png`, fullPage: true });
      await writeFile(`${output}/${width}-${name}.txt`, text);
      records.push({ width, name, url: page.url(), geometry, errors: [...errors], blocked: [...blocked] });
      assert.equal(errors.length, 0, `${name}: JavaScript errors`);
      assert.ok(geometry.scroll <= geometry.viewport + 1, `${name}: horizontal overflow`);
    }
    async function navigate(path) {
      const response = await page.goto(`https://www.moraltrade.org${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.ok(response && response.status() < 400, `${path}: HTTP ${response?.status()}`);
    }
    await navigate('/');
    await page.locator('[data-mt-live-now="adaptive"][data-mt-live-now-state="signed_out"]').waitFor({ state: 'visible', timeout: 30000 });
    assert.equal(await page.locator('[data-now="rules"]').count(), 0);
    await snapshot('focus');
    await page.locator('[data-now="plan"]').click();
    await page.locator('[data-mt-live-route-planner="true"]').waitFor({ state: 'visible', timeout: 30000 });
    assert.equal(await page.locator('[data-mt-custom-route]').count(), 0);
    await snapshot('plan');
    await page.locator('[data-now="focus"]').click();
    if (width === 1440) {
      await page.locator('[data-action="command"]').click();
      const drawer = page.locator('#drawer');
      assert.equal(await drawer.getByLabel('Describe the proposed exchange').inputValue(), '');
      assert.equal(await drawer.getByRole('button', { name: 'Run', exact: true }).count(), 0);
      assert.doesNotMatch(await drawer.innerText(), /Recent commands|Counter Mina/);
      await snapshot('command');
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-page="activity"]').click();
    await page.waitForURL('**/commitments', { timeout: 30000 });
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(await page.locator('[data-activity="ledger"]').count(), 0);
    await snapshot('real-commitments');
    for (const [path, target, name] of [
      ['/moral-trade-live.html#activity', '/commitments', 'legacy-activity'],
      ['/complete-verification.html?record=wild-animal-research&from=calendar', '/evidence', 'retired-verification'],
    ]) {
      await navigate(path);
      await page.waitForURL(`**${target}`, { timeout: 30000 });
      const url = new URL(page.url());
      assert.equal(url.pathname, target);
      assert.equal(url.search, '');
      await page.getByRole('heading', { level: 1 }).waitFor();
      await snapshot(name);
    }
    if (width === 1440) {
      for (const host of ['moraltrade.org', 'www.moraltrade.org']) {
        for (const [file, expected] of [['moral-trade-live-core.txt', core], ['moral-trade-live.html', loader]]) {
          const response = await context.request.get(`https://${host}/${file}?retirement=${process.env.EXPECTED_SHA}`, { timeout: 45000 });
          assert.equal(response.status(), 200, `${host}/${file}`);
          const actual = await response.body();
          assert.ok(actual.equals(expected), `${host}/${file}: published bytes differ`);
          records.push({ host, asset: file, sha256: createHash('sha256').update(actual).digest('hex'), status: response.status() });
        }
        for (const path of ['/mt-live-0d0e0f03-0a.txt', '/mt-verify-f01a8b07-a.txt', '/moral-trade-live-verification.js', '/moral-trade-live-plan-reset.js']) {
          const response = await context.request.get(`https://${host}${path}`, { timeout: 30000 });
          records.push({ host, retired: path, status: response.status() });
          assert.equal(response.status(), 404, `${host}${path} should be retired`);
        }
      }
    }
    await context.close();
  }
} catch (error) {
  failure = String(error?.stack || error);
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({
    expectedCommit: process.env.EXPECTED_SHA,
    startedAt, finishedAt: new Date().toISOString(), anonymous: true,
    blockedNonReadRequests: true, success: !failure, failure, records,
  }, null, 2));
}
if (failure) throw new Error(failure);
console.log(`Read-only production smoke passed: ${records.length} observations.`);
