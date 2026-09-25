const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { chromium, expect } = require('@playwright/test');

(async () => {
  const expectedSha = process.env.EXPECTED_SHA;
  assert.match(expectedSha || '', /^[0-9a-f]{40}$/);
  fs.mkdirSync('header-live-evidence', { recursive: true });
  const results = { expectedSha, startedAt: new Date().toISOString(), assets: [], pages: [], writesPerformed: false };
  const origins = ['https://moraltrade.org', 'https://www.moraltrade.org'];
  const browser = await chromium.launch();
  try {
    for (const origin of origins) {
      for (const asset of ['moral-trade-refined-header.css', 'moral-trade-live-navigation.js']) {
        const response = await fetch(`${origin}/${asset}`, { headers: { 'Cache-Control': 'no-cache' } });
        assert.equal(response.status, 200, `${origin}/${asset}`);
        const actual = crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
        const expected = crypto.createHash('sha256').update(fs.readFileSync(`public/${asset}`)).digest('hex');
        assert.equal(actual, expected, `Canonical asset does not match ${expectedSha}: ${asset}`);
        results.assets.push({ origin, asset, sha256: actual, finalUrl: response.url });
      }
    }
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, extraHTTPHeaders: { DNT: '1' } });
      await context.addCookies(origins.map(url => ({ name: 'mt_analytics_opt_out', value: '1', url, sameSite: 'Lax' })));
      for (const route of ['/feed', '/discover', '/profile']) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(`${origins[1]}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert.ok(response && response.status() < 400, `Page response: ${route}`);
        const header = page.locator('.mt-refined-header').first();
        await expect(header).toBeVisible({ timeout: 45000 });
        await expect(header).toHaveCSS('background-color', 'rgb(17, 18, 20)');
        const nav = header.locator('[data-mt-primary-links]');
        await expect(nav.locator(':scope > a')).toHaveText(['Home', 'Trades', 'Commitments', 'Profile']);
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(header.locator('.brand')).toBeVisible();
        const start = header.locator('.header-start, .button-nav:not(.button-secondary)');
        await expect(start).toBeVisible();
        await expect(start).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${route} ${width}`);
        if (route === '/profile') await expect(page.getByRole('link', { name: 'Adjust priorities' })).toBeVisible();
        const screenshot = `header-live-evidence/${route.slice(1)}-${width}.png`;
        await page.screenshot({ path: screenshot });
        if (route === '/feed' || route === '/profile') {
          const summary = header.locator('summary').filter({ hasText: 'More' });
          await summary.focus();
          await page.keyboard.press('Enter');
          await expect(header.getByRole('link', { name: 'Messages', exact: true })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(summary).toBeFocused();
          await expect(header.getByRole('link', { name: 'Messages', exact: true })).not.toBeVisible();
        }
        results.pages.push({ route, width, finalUrl: page.url(), status: response.status(), screenshot, pageErrors: errors });
        assert.deepEqual(errors, [], `Browser errors at ${route}`);
        await page.close();
      }
      await context.close();
    }
    const context = await browser.newContext();
    await context.addCookies(origins.map(url => ({ name: 'mt_analytics_opt_out', value: '1', url, sameSite: 'Lax' })));
    const page = await context.newPage();
    await page.goto(`${origins[1]}/profile`);
    await page.getByRole('link', { name: 'Adjust priorities' }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    assert.ok(decodeURIComponent(page.url()).includes('/profile/priorities'));
    await page.goto(`${origins[1]}/100-sparks`);
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    assert.ok(decodeURIComponent(page.url()).includes('/profile/priorities'));
    results.guestPriorityBoundary = 'Profile entry and legacy redirect preserve authenticated priority editor; no values saved';
    await context.close();
    results.completedAt = new Date().toISOString();
    results.passed = true;
  } catch (error) {
    results.completedAt = new Date().toISOString();
    results.passed = false;
    results.error = String(error.stack || error);
    throw error;
  } finally {
    fs.writeFileSync('header-live-evidence/result.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
