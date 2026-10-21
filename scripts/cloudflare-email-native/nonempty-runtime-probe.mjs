import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { startPreview } from './preview-process.mjs';
import { startFixture, SERVICE_KEY, PROVIDER_KEY } from './nonempty-fixture.mjs';
import { connectProfiler, describeProfilerFailure } from './cpu-profile.mjs';

assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const root = process.env.CF_RUN_ROOT, cwd = resolve(root, 'app');
assert.ok(root.startsWith('/home/runner/') || root.startsWith('/tmp/'));
const config = JSON.parse(await readFile(resolve(cwd, 'wrangler.compat.json')));
assert.equal(config.main, 'cloudflare/worker.mjs');
assert.deepEqual(config.triggers.crons, ['0,15,30 * * * *']);
config.main = 'cloudflare/offline-worker.mjs';
config.dev = { ip: '127.0.0.1', port: 8787, inspector_port: 9229 };
config.vars = { ...config.vars, CRON_SECRET: 'synthetic-scheduler-secret-only', MORAL_TRADE_DISABLE_SUPABASE: 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:15433', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key-only', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, NEXT_PUBLIC_SITE_URL: 'https://synthetic.invalid', RESEND_API_KEY: PROVIDER_KEY, EMAIL_FROM: 'test@synthetic.invalid' };
const profileIdentity = randomUUID();
await writeFile(resolve(cwd, 'cloudflare/offline-worker.mjs'), (await readFile(resolve(root, 'harness/offline-worker.mjs'), 'utf8')).replace('__CPU_PROFILE_IDENTITY__', profileIdentity));
await copyFile(resolve(root, 'harness/offline-provider.mjs'), resolve(cwd, 'cloudflare/offline-provider.mjs'));
const configFile = resolve(cwd, 'wrangler.nonempty-test.json');
await writeFile(configFile, JSON.stringify(config));
const result = { status: 'FAIL', passedCases: [], measurements: [], productionRequests: 0, liveProviderRequests: 0, realDatabaseTested: false, fullFeatureParity: false, cpuFreeFit: 'UNVERIFIED', subrequestFreeFit: 'NOT_YET_MEASURED' };
let preview, fixture, profiler, diagnostic = '';
const request = (path, options = {}) => fetch('http://127.0.0.1:8787' + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(30000) });
async function job(name) {
  const r = await request('/api/jobs/' + name, { headers: { authorization: 'Bearer synthetic-scheduler-secret-only', 'x-vercel-cron-schedule': '30 12 * * *' } });
  const body = await r.json(); assert.equal(r.status, 200, 'Job response failed'); return body;
}
async function scheduled(hour, minute) {
  const day = new Date().toISOString().slice(0, 10), time = Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
  const r = await request('/cdn-cgi/local/scheduled?' + new URLSearchParams({ format: 'json', cron: '0,15,30 * * * *', time: String(time) }));
  assert.equal((await r.json()).outcome, 'ok');
}
async function check(name, options, fn) {
  fixture.reset(options);
  let recording = false;
  if (profiler) {
    try { await profiler.start(); recording = true; }
    catch (error) {
      result.profilerFailure = { phase: 'start', caseNumber: result.measurements.length + 1, ...describeProfilerFailure(error) };
      result.profilerStatus = 'UNAVAILABLE'; profiler.close(); profiler = null;
    }
  }
  const start = performance.now();
  await fn();
  const wall = performance.now() - start;
  assert.deepEqual(fixture.violations, []);
  const measurement = { name, wallTimeMs: wall, externalOperations: fixture.events.length, fixtureScenario: options.scenario, count: options.count ?? 1 };
  if (recording) {
    try { measurement.cpuProfile = await profiler.stop(); }
    catch (error) {
      result.profilerFailure = { phase: 'stop', caseNumber: result.measurements.length + 1, ...describeProfilerFailure(error) };
      result.profilerStatus = 'PARTIAL_OR_UNAVAILABLE'; profiler.close(); profiler = null;
    }
  }
  result.measurements.push(measurement); result.passedCases.push(name);
}
try {
  fixture = await startFixture();
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
  try { profiler = await connectProfiler(profileIdentity); result.profilerStatus = 'CONNECTED'; }
  catch (error) { result.profilerStatus = 'UNAVAILABLE'; result.profilerFailure = { phase: 'connect', ...describeProfilerFailure(error) }; }
  await check('one safe email completes its lease', { scenario: 'email' }, async () => { assert.equal((await job('email')).sent, 1); assert.deepEqual([...fixture.state.emails.values()], ['sent']); });
  await check('full 25-email batch needs 51 outbound requests', { scenario: 'email', count: 25 }, async () => { assert.equal((await job('email')).sent, 25); assert.equal(fixture.events.length, 51); assert.equal(fixture.state.provider.size, 25); });
  await check('sensitive email is suppressed without provider access', { scenario: 'email', unsafe: true }, async () => { assert.equal((await job('email')).suppressed, 1); assert.equal(fixture.state.provider.size, 0); });
  await check('provider failure preserves retry state', { scenario: 'email', providerFailure: true }, async () => { assert.equal((await job('email')).retrying, 1); assert.deepEqual([...fixture.state.emails.values()], ['queued']); });
  await check('accepted message with failed lease completion remains retryable', { scenario: 'email', completionFailure: true }, async () => { assert.equal((await job('email')).retrying, 1); assert.equal(fixture.state.provider.size, 1); });
  await check('overdue reminder updates both parties and deduplicates a repeated run', { scenario: 'trade' }, async () => {
    const a = await job('trade-reminders'); assert.equal(a.agreementsMarkedDue, 1); assert.equal(a.notificationsCreated, 2); assert.equal(a.emailsQueued, 2);
    const b = await job('trade-reminders'); assert.equal(b.notificationsCreated, 0); assert.equal(b.emailsQueued, 0); assert.equal(fixture.state.queued.length, 2);
  });
  await check('ten overdue reminders use three database requests', { scenario: 'trade', count: 10 }, async () => { assert.equal((await job('trade-reminders')).emailsQueued, 20); assert.equal(fixture.events.length, 3); });
  await check('full 200-agreement batch queues 400 reminders with three database requests', { scenario: 'trade', count: 200 }, async () => { assert.equal((await job('trade-reminders')).emailsQueued, 400); assert.equal(fixture.events.length, 3); });
  await check('nonempty digest respects opt-out and deduplication', { scenario: 'background' }, async () => {
    const a = await job('background-networking'); assert.equal(a.digestEmailsQueued, 1); assert.equal(a.expiredSourceConnections, 1); assert.equal(a.autonomousOutreachSent, false);
    assert.equal((await job('background-networking')).digestEmailsQueued, 0); assert.equal(fixture.state.queued.length, 1);
  });
  await check('nonempty redirect arbitration and creator cancellation retain outcome semantics', { scenario: 'conditional' }, async () => { const r = await job('conditional-redirects'); assert.deepEqual(r.outcomes.map(o => o.status), ['winner_selected', 'arbitration_failed', 'cancelled_after_creator_recovery']); assert.equal(fixture.state.writes.length, 3); });
  await check('due saved search without profile safely advances scan time', { scenario: 'saved' }, async () => { await job('saved-searches'); assert.equal(fixture.state.writes.length, 1); });
  await check('delegate missing prerequisites records risks without outreach', { scenario: 'delegate' }, async () => { const r = await job('delegates'); assert.equal(r.riskSignalsCreated, 2); assert.equal(r.delegatesProcessed, 1); assert.equal(r.helperRunsCreated, 0); });
  await check('training with eight exposures persists a cold-start model and skips the duplicate slot', { scenario: 'training', count: 8 }, async () => {
    const r = await job('recommendation-training'); assert.equal(r.outcomeCount, 8); assert.equal(r.skipped, false); assert.equal(fixture.state.slotDone, true);
    const n = fixture.state.writes.length; assert.equal((await job('recommendation-training')).skipped, true); assert.equal(fixture.state.writes.length, n);
  });
  await check('training with 1000 synthetic exposures retains activation safeguards', { scenario: 'training', count: 1000 }, async () => { const r = await job('recommendation-training'); assert.equal(r.outcomeCount, 1000); assert.equal(r.status, 'cold_start'); assert.equal(fixture.state.slotDone, true); });
  for (const [scenario, hour, minute, verify] of [
    ['email', 10, 0, () => assert.equal(fixture.state.provider.size, 1)],
    ['trade', 11, 0, () => assert.equal(fixture.state.queued.length, 2)],
    ['background', 1, 0, () => assert.equal(fixture.state.queued.length, 1)],
    ['conditional', 1, 15, () => assert.equal(fixture.state.writes.length, 3)],
    ['saved', 9, 0, () => assert.equal(fixture.state.writes.length, 1)],
    ['delegate', 9, 30, () => assert.equal(fixture.state.writes.length, 3)],
    ['training', 12, 30, () => assert.equal(fixture.state.slotDone, true)],
  ]) await check(`scheduled ${scenario} preserves the same nonempty effects`, { scenario, count: 1 }, async () => { await scheduled(hour, minute); verify(); });
  assert.equal(result.profilerStatus, 'CONNECTED', 'CPU profiler must connect in this repair test');
  assert.ok(result.measurements.every(m => m.cpuProfile?.sampleCount > 0), 'Every case requires a CPU profile');
  result.subrequestFreeFit = 'DOES_NOT_FIT_EXISTING_EMAIL_BATCH';
  result.status = 'PASS_BOUNDED_NONEMPTY_CASES_NOT_FREE_PLAN_ACCEPTANCE';
} catch (error) {
  result.reason = error.message; result.fixtureViolations = fixture?.violations; result.diagnostic = diagnostic; process.exitCode = 1;
} finally {
  profiler?.close();
  const cleanup = await Promise.allSettled([preview?.stop(), fixture?.close()]);
  result.cleanup = cleanup.every(r => r.status === 'fulfilled') ? 'PASS' : 'FAIL';
  if (result.cleanup !== 'PASS') { result.status = 'FAIL'; process.exitCode = 1; }
}
await writeFile(resolve(root, 'nonempty-runtime-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
