import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPreview } from './preview-process.mjs';
import { startSyntheticApi, SYNTHETIC_SERVICE_KEY } from './synthetic-api.mjs';

assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const root = process.env.CF_RUN_ROOT, cwd = resolve(root, 'app');
assert.ok(root.startsWith('/home/runner/') || root.startsWith('/tmp/'));
const config = JSON.parse(await readFile(resolve(cwd, 'wrangler.compat.json')));
assert.equal(config.main, 'cloudflare/worker.mjs');
assert.deepEqual(config.triggers.crons, ['0,15,30 * * * *']);
config.vars = { ...config.vars,
  CRON_SECRET: 'synthetic-scheduler-secret-only', MORAL_TRADE_DISABLE_SUPABASE: 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:15433', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key-only',
  SUPABASE_SERVICE_ROLE_KEY: SYNTHETIC_SERVICE_KEY, NEXT_PUBLIC_SITE_URL: 'https://synthetic.invalid',
  RESEND_API_KEY: 'synthetic-provider-key-no-valid-access', EMAIL_FROM: 'test@synthetic.invalid',
};
const configFile = resolve(cwd, 'wrangler.scheduler-test.json');
await writeFile(configFile, JSON.stringify(config));
const result = { status: 'FAIL', passedCases: [], productionRequests: 0, liveProviderRequests: 0, realDatabaseTested: false, fullFeatureParity: false };
let preview, fixture, diagnostic = '';
const request = (path, options = {}) => fetch('http://127.0.0.1:8787' + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
const check = async (name, fn) => { await fn(); result.passedCases.push(name); };
const day = new Date().toISOString().slice(0, 10);
async function scheduled(hour, minute, cron = '0,15,30 * * * *') {
  const time = Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
  const response = await request('/cdn-cgi/local/scheduled?' + new URLSearchParams({ format: 'json', cron, time: String(time) }));
  const body = await response.json(); assert.equal(typeof body.outcome, 'string'); return body;
}
try {
  fixture = await startSyntheticApi();
  preview = startPreview(resolve(cwd, 'node_modules/.bin/opennextjs-cloudflare'), ['preview', '--config', configFile, '--local', '--ip', '127.0.0.1', '--port', '8787'], { cwd });
  let exited = false;
  for (const stream of [preview.child.stdout, preview.child.stderr]) stream.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-12000); });
  preview.child.on('exit', () => { exited = true; }); preview.child.on('error', () => { exited = true; });
  let ready = false;
  for (let i = 0; i < 60 && !exited; i++) {
    try { const r = await request('/__compat_ready'); await r.arrayBuffer(); if (r.status < 500) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Workers preview did not become ready');
  await check('all seven original HTTP job routes reject missing or incorrect authorization without database calls', async () => {
    const count = fixture.events.length;
    for (const name of ['saved-searches', 'delegates', 'email', 'trade-reminders', 'background-networking', 'conditional-redirects', 'recommendation-training']) {
      for (const headers of [{}, { authorization: 'Bearer wrong' }]) {
        const r = await request('/api/jobs/' + name, { headers }); assert.equal(r.status, 401); await r.arrayBuffer();
      }
    }
    assert.equal(fixture.events.length, count);
  });
  for (const [hour, minute, expected] of [
    [9, 0, ['GET /rest/v1/saved_searches', 'PATCH /rest/v1/source_connections']],
    [9, 30, ['GET /rest/v1/personal_delegates']],
    [10, 0, ['POST /rest/v1/rpc/claim_email_outbox_v2', 'PATCH /rest/v1/source_connections']],
    [11, 0, ['GET /rest/v1/agreements', 'PATCH /rest/v1/source_connections']],
    [12, 30, ['POST /rest/v1/rpc/claim_recommendation_training_slot']],
    [1, 15, ['GET /rest/v1/conditional_redirect_offers']],
  ]) {
    await check(`scheduled ${hour}:${String(minute).padStart(2, '0')} reaches existing handlers with empty synthetic queues`, async () => {
      const start = fixture.events.length; assert.equal((await scheduled(hour, minute)).outcome, 'ok');
      const seen = fixture.events.slice(start).map(e => `${e.method} ${e.path}`);
      for (const value of expected) assert.ok(seen.includes(value), 'Missing handler evidence: ' + value);
      assert.equal(fixture.violations.length, 0);
    });
  }
  await check('repeated natural training uses the same existing duplicate-slot claim', async () => {
    assert.equal((await scheduled(12, 30)).outcome, 'ok');
    const claims = fixture.events.filter(e => e.path === '/rest/v1/rpc/claim_recommendation_training_slot');
    assert.equal(claims.length, 2); assert.equal(claims[0].slot, claims[1].slot);
  });
  await check('unused dispatcher slot and unknown trigger cause no database work', async () => {
    const start = fixture.events.length;
    assert.equal((await scheduled(4, 30)).outcome, 'ok');
    assert.notEqual((await scheduled(9, 0, '* * * * *')).outcome, 'ok');
    assert.equal(fixture.events.length, start);
  });
  await check('failed database read fails the schedule while another due job still runs', async () => {
    fixture.setFailure(true); const start = fixture.events.length;
    assert.notEqual((await scheduled(9, 0)).outcome, 'ok');
    assert.ok(fixture.events.slice(start).some(e => e.method === 'PATCH' && e.path === '/rest/v1/source_connections'));
    fixture.setFailure(false);
  });
  assert.equal(fixture.violations.length, 0);
  result.syntheticRequestCount = fixture.events.length;
  result.status = 'PASS_OPENNEXT_SCHEDULER_WITH_SYNTHETIC_API_ONLY';
} catch (error) {
  result.reason = error.message; result.diagnostic = diagnostic; process.exitCode = 1;
} finally {
  const cleanup = await Promise.allSettled([preview?.stop(), fixture?.close()]);
  result.cleanup = cleanup.every(r => r.status === 'fulfilled') ? 'PASS' : 'FAIL';
  if (result.cleanup !== 'PASS') { result.status = 'FAIL'; process.exitCode = 1; }
}
await writeFile(resolve(root, 'scheduler-runtime-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
