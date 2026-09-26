const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const requireFromApp = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = requireFromApp('playwright');

const origin = 'https://www.moraltrade.org';
const out = '/tmp/quiet-ui-production';
const report = { origin, checkedAt: new Date().toISOString(), expectedCommit: process.env.EXPECTED_SHA, assets: [], pages: [], pageErrors: [], console: [] };
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  assert.match(report.expectedCommit || '', /^[a-f0-9]{40}$/);
  await fs.mkdir(out, { recursive: true });
  for (const asset of ['moral-trade-live-core.txt', 'moral-trade-live.html', 'moral-trade-live-now.js', 'moral-trade-live-feed.css', 'moral-trade-canonical-static.css', 'moral-trade-create/ui-repairs.css', 'moral-trade-discover.css']) {
    const response = await fetch(`${origin}/${asset}`, { cache: 'no-store', signal: AbortSignal.timeout(45000) });
    assert.equal(response.status, 200, asset);
    const actual = hash(Buffer.from(await response.arrayBuffer()));
    const expected = hash(await fs.readFile(path.join('public', asset)));
    assert.equal(actual, expected, `${asset} must match the released source`);
    report.assets.push({ asset, sha256: actual, status: response.status });
  }
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies([{ name: 'mt_analytics_opt_out', value: '1', url: origin, sameSite: 'Lax' }]);
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.on('pageerror', error => report.pageErrors.push({ width, url: page.url(), message: error.message }));
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) report.console.push({ width, url: page.url(), level: message.type(), text: message.text() });
      });
      async function check(label, route) {
        if (route) await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
        assert.match(await page.title(), /Moral Trade/i);
        assert.ok((await page.locator('body').innerText()).trim().length > 80, label);
        assert.equal(await page.locator('nextjs-portal').count(), 0, label);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), `${label} overflow`);
        report.pages.push({ width, label, url: page.url(), title: await page.title() });
      }
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-mt-live-now="adaptive"]').waitFor();
      await page.locator('.mt-feed-empty').waitFor();
      await check('Home');
      assert.equal(await page.locator('.head').count(), 0);
      assert.equal(await page.locator('.page h1').count(), 0);
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
      for (const section of ['plan', 'focus']) {
        await page.locator(`[data-now="${section}"]`).click();
        assert.equal(await page.locator('.head').count(), 0);
      }
      const explanation = page.locator('.mt-feed-explanation');
      await explanation.locator('summary').click();
      assert.equal(await explanation.getAttribute('open'), '');
      await explanation.locator('summary').click();
      await page.screenshot({ path: `${out}/home-${width}.png` });
      await page.locator('[data-home-create="true"]').click();
      await page.waitForURL('**/trades/new');
      const frame = page.frameLocator('iframe[title="Moral Trade Create"]');
      await frame.locator('#causeHeading').waitFor();
      const font = await frame.locator('#causeHeading').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      assert.ok(font >= 28 && font <= 32, 'operational heading scale');
      assert.equal(await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
      await check('Create');
      await page.screenshot({ path: `${out}/create-${width}.png` });
      await frame.locator('.cause-choice[data-cause="Global health"]').click();
      await frame.locator('#screenRequest').waitFor();
      assert.equal(await frame.locator('#requestCause').innerText(), 'Global health');
      await page.screenshot({ path: `${out}/create-request-${width}.png` });
      await check('Trades directory', '/discover');
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(247, 248, 250)');
      await page.screenshot({ path: `${out}/trades-${width}.png` });
      await page.goto(origin + '/profile', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('profile-priorities-card').waitFor();
      await check('Profile');
      await page.screenshot({ path: `${out}/profile-${width}.png` });
      if (width === 1440) {
        await page.goto(origin + '/dashboard', { waitUntil: 'domcontentloaded' });
        await page.waitForURL(url => url.pathname === '/login');
        const login = new URL(page.url());
        assert.match(login.searchParams.get('returnTo'), /^\/profile\/priorities\?/);
        await check('Dashboard authentication boundary');
        await page.goto(origin + '/commitments', { waitUntil: 'domcontentloaded' });
        await page.locator('#commitments-heading').waitFor();
        await check('Commitments');
        await page.screenshot({ path: `${out}/commitments-${width}.png` });
        await check('About', '/about');
        await page.screenshot({ path: `${out}/about-${width}.png` });
      }
      await context.close();
    }
    assert.deepEqual(report.pageErrors, []);
  } finally {
    await browser.close();
    await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  }
}
main().catch(async error => {
  report.failure = error.stack;
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.error(error);
  process.exitCode = 1;
});
