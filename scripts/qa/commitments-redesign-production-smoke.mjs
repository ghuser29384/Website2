import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');
const out = process.env.SMOKE_OUTPUT || '/tmp/commitments-production-evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { commit: process.env.RELEASE_SHA || null, startedAt: new Date().toISOString(), scope: 'Read-only anonymous production checks; no account or financial mutations', cases: [] };
try {
  for (const host of ['www.moraltrade.org', 'moraltrade.org']) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, locale: 'en-US', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const result = { host, viewport, console: [], pageErrors: [], failedResponses: [], checks: [], status: 'running' };
      report.cases.push(result);
      page.on('pageerror', e => result.pageErrors.push(e.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.console.push({ type: message.type(), text: message.text().slice(0, 1000) }); });
      page.on('response', response => { if (response.status() >= 400) { const u = new URL(response.url()); result.failedResponses.push({ path: u.origin + u.pathname, status: response.status() }); } });
      try {
        const response = await page.goto(`https://${host}/commitments`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert(response && response.status() < 400, 'Commitments document must load');
        await page.locator('.commitments-center #commitments-heading').waitFor({ state: 'visible', timeout: 45000 });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('#commitments-heading').textContent(), 'Commitments');
        assert.match(await page.title(), /Commitments/);
        result.finalUrl = page.url();
        const state = await page.locator('.commitments-center').evaluate(el => {
          const h1 = el.querySelector('h1');
          return { text: el.textContent, background: getComputedStyle(el).backgroundColor, h1Size: parseFloat(getComputedStyle(h1).fontSize), summaryCount: el.querySelectorAll('[aria-label="Commitment summary"]').length, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        assert.match(state.text, /Track your commitments, proof, outcomes, and impact\./);
        assert.match(state.text, /Sign in to view your commitments\./);
        assert.equal(state.summaryCount, 0, 'Anonymous users must not see participant summaries');
        assert.equal(state.background, 'rgb(255, 255, 255)');
        assert(state.h1Size <= 68, 'Approved compact title');
        assert(state.overflow <= 1, 'No horizontal overflow');
        assert.equal(await page.locator('nextjs-portal [data-nextjs-dialog], #webpack-dev-server-client-overlay').count(), 0);
        result.geometry = { background: state.background, h1Size: state.h1Size, overflow: state.overflow };
        result.checks.push('Page identity', 'Resolved redesigned workspace', 'Anonymous privacy', 'White background and compact heading', 'No horizontal overflow', 'No framework overlay');
        if (viewport.width > 900) {
          const sidebar = await page.locator('.mt-v75-side-nav').evaluate(el => ({ text: el.textContent, activeRadius: getComputedStyle(el.querySelector('.mt-v75-side-link.is-active')).borderRadius }));
          assert.equal(sidebar.activeRadius, '9px');
          assert(!sidebar.text.includes('0 in planner'), 'Do not invent sidebar account totals');
          result.checks.push('Approved rounded sidebar without fabricated balances');
        }
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        const file = `${host.replaceAll('.', '-')}-${viewport.width}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: false });
        result.screenshot = file;
        for (const [label, key] of [['Ledger', 'ledger'], ['Completed', 'completed'], ['Calendar', 'calendar'], ['Portfolio', 'portfolio']]) {
          await page.locator('.commitments-center nav[aria-label="Commitments sections"]').getByRole('link', { name: label, exact: true }).click();
          await page.waitForURL(url => (url.searchParams.get('tab') || 'portfolio') === key, { timeout: 45000 });
          await page.locator('.commitments-center #commitments-heading').waitFor({ state: 'visible', timeout: 45000 });
          const active = page.locator('.commitments-center nav[aria-label="Commitments sections"] a[aria-current="page"]');
          await active.waitFor({ state: 'visible', timeout: 15000 });
          assert.equal((await active.textContent()).trim(), label);
        }
        result.checks.push('Portfolio / Ledger / Completed / Calendar navigation');
        await page.locator('.commitments-center').getByRole('link', { name: 'Sign in to continue', exact: true }).click();
        await page.waitForURL(/\/login(?:\?|$)/, { timeout: 45000 });
        const login = new URL(page.url());
        assert.equal(login.searchParams.get('returnTo'), '/commitments');
        result.checks.push('Sign-in return path');
        assert.equal(result.pageErrors.length, 0, 'No JavaScript exceptions');
        result.status = 'passed';
      } catch (error) {
        result.status = 'failed';
        result.failure = String(error.stack || error);
        await page.screenshot({ path: path.join(out, `failure-${host}-${viewport.width}.png`), fullPage: false }).catch(() => {});
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.cases.length === 4 && report.cases.every(c => c.status === 'passed');
  await writeFile(path.join(out, 'production-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (!report.passed) process.exitCode = 1;
