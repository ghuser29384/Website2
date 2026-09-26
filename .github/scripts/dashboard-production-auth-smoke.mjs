// One-use operational QA, not application code. Authentication/session pattern:
// .github/scripts/pr552-authenticated-preview-mfa-db.mjs at 928a81e3 and
// the production specialization at f187a322. No existing user is enumerated,
// impersonated, reset, or edited. Auth creates and deletes only this run's fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const SHA = '464e61299896216ddc77e65bfa2211664aa875ee';
const DEPLOYMENT = 'dpl_9i538KGtBQ42exWuDrpyU59EDYRs';
const PROJECT = 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7';
const TEAM = 'team_ySu6sF3Uho1E1GnJtCQPVEuJ';
const REF = 'jnpoxvalyjtdghnperyu';
const SCOPE = 'dashboard-production-smoke-20260926';
const origins = ['https://moraltrade.org', 'https://www.moraltrade.org'];
const runId = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
const out = path.resolve('dashboard-auth-evidence');
const privatePath = path.join(process.env.RUNNER_TEMP, 'dashboard-auth-private.json');
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const env = parseEnv(fs.readFileSync('.vercel/.env.production.local', 'utf8'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal(new URL(url).hostname, `${REF}.supabase.co`);
assert.ok(key && serviceKey && process.env.VERCEL_TOKEN, 'Required server-side QA access is unavailable');
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, options);
const client = createClient(url, key, options);
let state = fs.existsSync(privatePath) ? JSON.parse(fs.readFileSync(privatePath, 'utf8')) : null;
let report = fs.existsSync(`${out}/report.json`) ? JSON.parse(fs.readFileSync(`${out}/report.json`, 'utf8')) : {
  sourceSha: SHA, deploymentId: DEPLOYMENT, runId, startedAt: new Date().toISOString(),
  browser: 'Playwright Chromium; Browser plugin unavailable', checks: [], aliasChecks: [],
  scenarios: [], cleanup: null, status: 'running', provisioning: 'real Auth API; fresh run-owned QA only',
};
const persist = () => fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
const persistPrivate = () => fs.writeFileSync(privatePath, JSON.stringify(state), { mode: 0o600 });
function safeError(error) {
  let text = String(error?.message || error);
  for (const secret of [key, serviceKey, process.env.VERCEL_TOKEN, state?.password, state?.email]) {
    if (secret) text = text.replaceAll(secret, '[redacted]');
  }
  return text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]').slice(0, 5000);
}
async function vercel(endpoint) {
  const response = await fetch(`https://api.vercel.com${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${TEAM}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, `Vercel read failed (${response.status})`);
  return response.json();
}
async function verifyAliases(stage) {
  const deployment = await vercel(`/v13/deployments/${DEPLOYMENT}`);
  assert.equal(deployment.readyState, 'READY');
  assert.equal(deployment.target, 'production');
  assert.equal(deployment.projectId || deployment.project?.id, PROJECT);
  assert.equal(deployment.meta.githubCommitSha, SHA);
  for (const origin of origins) {
    const domain = new URL(origin).hostname;
    const alias = await vercel(`/v4/aliases/${domain}?projectId=${PROJECT}`);
    assert.equal(alias.projectId, PROJECT);
    assert.equal(alias.deploymentId || alias.deployment?.id || alias.deployment?.uid, DEPLOYMENT);
    report.aliasChecks.push({ stage, domain, deploymentId: DEPLOYMENT, sha: SHA, checkedAt: new Date().toISOString() });
  }
  persist();
}
async function assertOwned() {
  assert.equal(state?.scope, SCOPE);
  assert.equal(state?.runId, runId);
  assert.match(state.email, /^dashboard-smoke-[0-9]+-[0-9]+-[a-f0-9]{12}@qa\.moraltrade\.invalid$/);
  const { data, error } = await admin.auth.admin.getUserById(state.userId);
  if (error?.status === 404) return null;
  assert.ifError(error);
  assert.equal(data.user.id, state.userId);
  assert.equal(data.user.email, state.email);
  assert.equal(data.user.user_metadata.qa_scope, SCOPE);
  assert.equal(data.user.user_metadata.qa_run_id, runId);
  return data.user;
}
async function cleanup() {
  if (!state) { report.cleanup = { noFixtureCreated: true }; persist(); return; }
  const owned = await assertOwned();
  if (owned) {
    const { error } = await admin.auth.admin.deleteUser(state.userId);
    assert.ifError(error);
  }
  const residue = {};
  for (const table of ['profiles', 'cohort_onboarding_profiles', 'profile_syntheses', 'wish_profiles', 'saved_searches']) {
    const column = table === 'profiles' ? 'id' : 'profile_id';
    const { count, error } = await admin.from(table).select(column, { count: 'exact', head: true }).eq(column, state.userId);
    assert.ifError(error);
    assert.equal(count, 0, `Run-owned residue remains in ${table}`);
    residue[table] = count;
  }
  const absent = await admin.auth.admin.getUserById(state.userId);
  assert.ok(absent.error?.status === 404 && !absent.data?.user, 'QA Auth identity still exists');
  report.cleanup = { authIdentityDeleted: true, exactRunOwnershipChecked: true, residue, completedAt: new Date().toISOString() };
  fs.rmSync(privatePath, { force: true });
  persist();
}
async function cookies(session) {
  let captured = [];
  const ssr = createServerClient(url, key, { cookies: { getAll: () => [], setAll: values => { captured = values; } } });
  const { error } = await ssr.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  assert.ifError(error);
  return origins.flatMap(origin => [
    ...captured.map(({ name, value }) => ({ name, value, url: origin, httpOnly: true, secure: true, sameSite: 'Lax' })),
    { name: 'mt_analytics_opt_out', value: '1', url: origin, secure: true, sameSite: 'Lax' },
    { name: 'mt_walkthrough_seen', value: '1', url: origin, secure: true, sameSite: 'Lax' },
  ]);
}
async function row() {
  const { data, error } = await client.from('cohort_onboarding_profiles').select('profile_id,priority_allocations').eq('profile_id', state.userId).maybeSingle();
  assert.ifError(error);
  if (data) assert.equal(data.profile_id, state.userId);
  return data;
}
async function noOverflow(page, label) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth), { timeout: 10000, message: label }).toBeLessThanOrEqual(1);
}
const workspace = page => page.locator('section[aria-labelledby="profile-priorities-heading"]');
async function editor(page) {
  const active = workspace(page);
  await expect(active).toHaveCount(1);
  await expect(active).toBeVisible();
  await expect(active.getByRole('heading', { name: 'Adjust your 100 sparks.', exact: true, level: 1 })).toHaveCount(1);
  await expect(active.getByRole('heading', { name: 'Adjust your 100 sparks.', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('#dashboard-overview')).toHaveCount(0);
  return active;
}
async function navigation(page) {
  const nav = page.locator('[data-mt-primary-links]');
  await expect(nav).toHaveCount(1);
  await expect(nav.locator(':scope > a')).toHaveText(['Home', 'Trades', 'Commitments', 'Profile']);
  await expect(nav.getByText('100 Sparks', { exact: true })).toHaveCount(0);
  for (const link of await nav.locator(':scope > a').all()) {
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= page.viewportSize().width + 1 && box.height >= 44);
  }
}
async function scenario(browser, session, origin, width) {
  await verifyAliases(`before-${new URL(origin).hostname}-${width}`);
  const record = { origin, width, checks: [], pageErrors: [], consoleErrors: [], httpErrors: [], blockedMutations: [], savePosts: 0 };
  const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  context.setDefaultTimeout(30000);
  context.setDefaultNavigationTimeout(60000);
  await context.addCookies(await cookies(session));
  let saving = false;
  await context.route('**/*', async route => {
    const request = route.request();
    const destination = new URL(request.url());
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      if (saving && origins.includes(destination.origin) && ['/dashboard', '/profile/priorities'].includes(destination.pathname) && request.method() === 'POST' && request.headers()['next-action']) {
        record.savePosts++;
      } else {
        record.blockedMutations.push({ method: request.method(), path: destination.pathname });
        await route.abort(); return;
      }
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => record.pageErrors.push(safeError(error)));
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(safeError(message.text())); });
  page.on('response', response => {
    const u = new URL(response.url());
    if (origins.includes(u.origin) && response.status() >= 400) record.httpErrors.push({ status: response.status(), path: u.pathname });
  });
  try {
    await page.goto(`${origin}/dashboard`, { waitUntil: 'domcontentloaded' });
    const active = await editor(page);
    await expect(page).toHaveTitle(/Dashboard/);
    const tools = page.getByRole('navigation', { name: 'Dashboard controls' });
    await expect(tools.getByRole('link', { name: '100 Sparks', exact: true })).toHaveAttribute('aria-current', 'page');
    const before = await row();
    const beforeValue = await active.locator('input[name="priority_allocation"]').inputValue();
    await active.getByRole('button', { name: /^Increase / }).first().click();
    const draft = await active.locator('input[name="priority_allocation"]').inputValue();
    assert.notEqual(draft, beforeValue);
    const currency = tools.locator('summary').filter({ hasText: 'Currency' });
    await currency.focus(); await currency.press('Enter');
    await expect(tools.getByRole('link', { name: 'Payment setup', exact: true })).toBeVisible();
    await expect(active.locator('input[name="priority_allocation"]')).toHaveValue(draft);
    await currency.press('Escape'); await expect(currency).toBeFocused();
    await expect(tools.getByRole('link', { name: 'Payment setup', exact: true })).not.toBeVisible();
    assert.deepEqual(await row(), before);
    record.checks.push('unique active editor; default priorities; secondary Currency; keyboard Enter/Escape and focus; unsaved draft preserved; no navigation write');
    await noOverflow(page, 'Dashboard editor overflow');
    saving = true;
    try {
      await active.locator('header').getByRole('button', { name: 'Save priorities', exact: true }).click();
      await page.waitForURL(u => u.pathname === '/dashboard' && u.searchParams.has('message'));
      await expect(page.getByRole('status').filter({ hasText: 'Priorities saved.' })).toBeVisible();
    } finally { saving = false; }
    await expect((await editor(page)).locator('input[name="priority_allocation"]')).toHaveValue(draft);
    const after = await row();
    assert.ok(after?.priority_allocations?.length > 0);
    assert.notDeepEqual(after, before);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect((await editor(page)).locator('input[name="priority_allocation"]')).toHaveValue(draft);
    await noOverflow(page, 'Saved Dashboard overflow');
    record.checks.push('real server-action save; success feedback; authenticated database readback; reload persistence');
    const tag = `${new URL(origin).hostname}-${width}`;
    await page.screenshot({ path: `${out}/${tag}-editor.png`, fullPage: true });
    await tools.getByRole('link', { name: 'More controls', exact: true }).click();
    await page.waitForURL(u => u.pathname === '/dashboard' && u.searchParams.get('view') === 'controls');
    await expect(page.locator('#account-heading')).toBeVisible();
    await expect(workspace(page)).toHaveCount(0);
    await expect(page.locator('#account-security')).toBeVisible();
    await noOverflow(page, 'Account workspace overflow');
    await page.screenshot({ path: `${out}/${tag}-controls.png`, fullPage: false });
    for (const [label, id] of [['Privacy', 'privacy-controls'], ['Notifications', 'notifications']]) {
      await tools.getByRole('link', { name: label, exact: true }).click();
      await expect(page.locator(`#${id}`)).toBeVisible();
      await noOverflow(page, `${label} overflow`);
    }
    await currency.click();
    await tools.getByRole('link', { name: 'Payment setup', exact: true }).click();
    await expect(page.locator('#payment-setup')).toBeVisible();
    await tools.getByRole('link', { name: '100 Sparks', exact: true }).click();
    await editor(page);
    assert.deepEqual(await row(), after);
    record.checks.push('controls view; account security; Privacy; Notifications; Payment setup entry; return to editor without changing settings');
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^(What needs you now\.?|Dashboard|Feed)$/ })).toHaveCount(0);
    await navigation(page); await noOverflow(page, 'Homepage/navigation overflow');
    record.checks.push('live homepage/feed without removed introduction; four bounded primary links; no top-level Sparks item');
    await page.goto(`${origin}/profile`, { waitUntil: 'domcontentloaded' });
    const entry = page.getByRole('link', { name: /Adjust priorities/ });
    await expect(entry).toHaveCount(1); await expect(entry).toBeVisible();
    await navigation(page); await noOverflow(page, 'Profile overflow');
    await entry.click();
    await expect(workspace(page)).toBeVisible();
    await expect(workspace(page).locator('input[name="priority_allocation"]')).toHaveValue(draft);
    await expect(workspace(page).locator('input[name="success_to"]')).toHaveValue('/profile');
    if (width === 1440) {
      saving = true;
      try {
        await workspace(page).locator('header').getByRole('button', { name: 'Save priorities', exact: true }).click();
        await page.waitForURL(u => u.pathname === '/profile' && u.searchParams.has('message'));
        await expect(page.getByRole('status').filter({ hasText: 'Priorities saved.' })).toBeVisible();
      } finally { saving = false; }
      record.checks.push('original Profile priority save and return feedback');
    }
    record.checks.push('Profile priority entry reaches the same saved allocation');
    assert.equal(record.savePosts, width === 1440 ? 2 : 1);
    assert.deepEqual(record.blockedMutations, []);
    assert.deepEqual(record.pageErrors, []);
    assert.deepEqual(record.consoleErrors, []);
    assert.deepEqual(record.httpErrors, []);
    record.status = 'passed';
  } catch (error) {
    record.status = 'failed'; record.error = safeError(error);
    await page.screenshot({ path: `${out}/${new URL(origin).hostname}-${width}-failure.png`, fullPage: false }).catch(() => {});
    throw error;
  } finally {
    report.scenarios.push(record); persist(); await context.close();
  }
}

if (process.argv.includes('--cleanup-only')) {
  try { await cleanup(); } catch (error) { report.cleanup = { failed: true, error: safeError(error) }; persist(); process.exitCode = 1; }
} else {
  let browser;
  try {
    await verifyAliases('initial');
    assert.equal(state, null, 'Refusing reuse or takeover of a prior identity');
    const nonce = randomBytes(6).toString('hex');
    state = { scope: SCOPE, runId, userId: randomUUID(), email: `dashboard-smoke-${runId}-${nonce}@qa.moraltrade.invalid`, password: randomBytes(32).toString('base64url') };
    persistPrivate();
    const created = await admin.auth.admin.createUser({ id: state.userId, email: state.email, password: state.password, email_confirm: true,
      user_metadata: { display_name: 'Dashboard production QA', qa_scope: SCOPE, qa_run_id: runId } });
    assert.ifError(created.error);
    assert.equal(created.data.user.id, state.userId);
    await assertOwned();
    const profile = await admin.from('profiles').update({ display_name: 'Dashboard production QA', username: `dashqa${nonce}` }).eq('id', state.userId).select('id').single();
    assert.ifError(profile.error); assert.equal(profile.data.id, state.userId);
    const signed = await client.auth.signInWithPassword({ email: state.email, password: state.password });
    assert.ifError(signed.error); assert.equal(signed.data.user.id, state.userId); assert.ok(signed.data.session);
    report.checks.push('Server-side access verified; real password authentication for a fresh run-owned test identity; no forged session or existing-account changes'); persist();
    browser = await chromium.launch();
    for (const origin of origins) for (const width of [1440, 320]) await scenario(browser, signed.data.session, origin, width);
    await verifyAliases('final');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.error = safeError(error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    try { await cleanup(); } catch (error) { report.cleanup = { failed: true, error: safeError(error) }; report.status = 'failed'; process.exitCode = 1; }
    report.finishedAt = new Date().toISOString(); persist();
    console.log(JSON.stringify({ status: report.status, sourceSha: SHA, deploymentId: DEPLOYMENT, scenarios: report.scenarios.map(({ origin, width, status }) => ({ origin, width, status })), cleanup: report.cleanup, error: report.error || null }, null, 2));
  }
}
