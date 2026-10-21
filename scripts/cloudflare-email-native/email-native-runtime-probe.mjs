import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { startPreview } from './preview-process.mjs';
import { SERVICE_KEY, PROVIDER_KEY } from './nonempty-fixture.mjs';
import { startNativeFixture, countNativeQueries } from './email-native-fixture.mjs';
import * as database from './email-database-fixture.mjs';
import { connectProfiler, describeProfilerFailure } from './cpu-profile.mjs';

assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const root = process.env.CF_RUN_ROOT, cwd = resolve(root, 'app');
assert.ok(root.startsWith('/home/runner/') || root.startsWith('/tmp/'));
database.verifyDatabase();
const config = JSON.parse(await readFile(resolve(cwd, 'wrangler.compat.json')));
assert.equal(config.main, 'cloudflare/worker.mjs');
assert.deepEqual(config.triggers.crons, ['0,15,30 * * * *']);
config.main = 'cloudflare/offline-worker.mjs';
config.dev = { ip: '127.0.0.1', port: 8787, inspector_port: 9229 };
config.vars = { ...config.vars, CRON_SECRET: 'synthetic-scheduler-secret-only', MORAL_TRADE_DISABLE_SUPABASE: 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:15433', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key-only', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, NEXT_PUBLIC_SITE_URL: 'https://synthetic.invalid', RESEND_API_KEY: PROVIDER_KEY, EMAIL_FROM: 'test@synthetic.invalid', EMAIL_OUTBOX_TRANSPORT: 'hyperdrive' };
// Local binding only: no hosted Hyperdrive configuration is created or queried.
config.hyperdrive = [{ binding: 'EMAIL_OUTBOX_DB', id: '00000000000000000000000000000000', localConnectionString: 'postgres://mt_email_job:synthetic-only@127.0.0.1:15442/postgres' }];
const identity = randomUUID();
await writeFile(resolve(cwd, 'cloudflare/offline-worker.mjs'), (await readFile(resolve(root, 'harness/offline-worker.mjs'), 'utf8')).replace('__CPU_PROFILE_IDENTITY__', identity));
await copyFile(resolve(root, 'harness/offline-provider.mjs'), resolve(cwd, 'cloudflare/offline-provider.mjs'));
const configFile = resolve(cwd, 'wrangler.email-native-test.json');
await writeFile(configFile, JSON.stringify(config));
const result = { status: 'FAIL', measurements: [], actualPgDriver: true, realDisposablePostgres: true, hostedHyperdriveTested: false, productionRequests: 0, liveProviderRequests: 0, cpuFreeFit: 'UNVERIFIED', hostedSubrequestFit: 'UNVERIFIED' };
let preview, fixture, profiler, diagnostic = '';
const request = (path, options = {}) => fetch('http://127.0.0.1:8787' + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(30000) });
async function job(method = 'GET', authenticated = true) {
  const response = await request('/api/jobs/email', { method, headers: authenticated ? { authorization: 'Bearer synthetic-scheduler-secret-only' } : {} });
  assert.equal(response.status, authenticated ? 200 : 401);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  return response.json();
}
const rowsIn = status => database.snapshot().filter(row => row.status === status);
async function check(name, scenario, expectedHttp, expectedQueries, action) {
  fixture.reset(scenario);
  const logPath = resolve(root, 'email-postgres.log');
  const before = (await readFile(logPath)).length;
  await profiler.start(); const started = performance.now();
  await action();
  const wallTimeMs = performance.now() - started;
  const cpuProfile = await profiler.stop();
  assert.ok(cpuProfile.sampleCount > 0, 'Every native case requires an inspector profile');
  assert.deepEqual(fixture.violations, []);
  assert.equal(fixture.events.length, expectedHttp, 'Unexpected HTTP request count');
  const queries = countNativeQueries((await readFile(logPath)).subarray(before).toString());
  assert.equal(queries, expectedQueries, 'Unexpected native database query count');
  result.measurements.push({ name, httpRequests: fixture.events.length, nativeDatabaseQueries: queries, acceptedEmails: fixture.provider.size, wallTimeMs, cpuProfile });
}
try {
  fixture = await startNativeFixture(database);
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
  try { profiler = await connectProfiler(identity); }
  catch (error) { result.profilerFailure = describeProfilerFailure(error); throw error; }
  await check('25 emails preserve immediate delivery receipts', 'full', 25, 26, async () => { const b = await job(); assert.equal(b.sent, 25); assert.equal(rowsIn('sent').length, 25); });
  await check('POST preserves the 25-email batch', 'post', 25, 26, async () => { assert.equal((await job('POST')).sent, 25); });
  await check('empty queue does not contact the provider', 'empty', 0, 1, async () => { assert.equal((await job()).claimed, 0); });
  await check('30 queued emails still claim only 25', 'overfull', 25, 26, async () => { assert.equal((await job()).sent, 25); assert.equal(rowsIn('queued').length, 5); });
  await check('all unsafe messages remain suppressed', 'unsafe', 0, 26, async () => { assert.equal((await job()).suppressed, 25); assert.equal(rowsIn('suppressed').length, 25); });
  await check('provider failures preserve all retries', 'provider-error', 25, 26, async () => { assert.equal((await job()).retrying, 25); assert.equal(rowsIn('retry').length, 25); });
  await check('completion error reconnects for normal retry without replaying the send', 'completion-error', 25, 27, async () => { const b = await job(); assert.equal(b.sent, 24); assert.equal(b.retrying, 1); assert.equal(fixture.provider.size, 25); assert.equal(rowsIn('retry').length, 1); });
  await check('repeat invocation does not resend completed messages', 'full', 25, 27, async () => { assert.equal((await job()).sent, 25); assert.equal((await job()).claimed, 0); });
  await check('unauthorized request does no database or provider work', 'full', 0, 0, async () => { await job('GET', false); assert.equal(rowsIn('queued').length, 25); });
  // Same scheduler invocation: full email batch plus nonempty hourly digest fixture.
  // Derive the exact background HTTP count from the existing source fixture separately;
  // do not treat these HTTP counts as Cloudflare's hosted quota accounting.
  const priorCheck = result.measurements.length;
  const backgroundHttpCount = 12;
  await check('10:00 UTC scheduler retains full email batch and nonempty background job', 'scheduled', 25 + backgroundHttpCount, 26, async () => {
    const day = new Date().toISOString().slice(0, 10), time = Date.parse(`${day}T10:00:00.000Z`);
    const r = await request('/cdn-cgi/local/scheduled?' + new URLSearchParams({ format: 'json', cron: '0,15,30 * * * *', time: String(time) }));
    assert.equal((await r.json()).outcome, 'ok');
    assert.equal(rowsIn('sent').length, 25); assert.equal(fixture.background.queued.length, 1);
  });
  assert.equal(result.measurements.length, priorCheck + 1);
  result.status = 'PASS_LOCAL_WORKERS_DRIVER_INTEGRATION_NOT_HOSTED_FREE_ACCEPTANCE';
} catch (error) {
  result.reason = error.message; result.diagnostic = diagnostic; result.fixtureViolations = fixture?.violations; process.exitCode = 1;
} finally {
  profiler?.close();
  const cleanup = await Promise.allSettled([preview?.stop(), fixture?.close()]);
  result.cleanup = cleanup.every(r => r.status === 'fulfilled') ? 'PASS' : 'FAIL';
  if (result.cleanup !== 'PASS') { result.status = 'FAIL'; process.exitCode = 1; }
}
await writeFile(resolve(root, 'email-native-runtime-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
