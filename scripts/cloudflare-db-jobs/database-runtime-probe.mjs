import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startPreview } from './preview-process.mjs';

assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const root = process.env.CF_RUN_ROOT, cwd = resolve(root, 'app/cloudflare');
assert.ok(root.startsWith('/home/runner/') || root.startsWith('/tmp/'));
const require = createRequire(resolve(cwd, 'package.json'));
const { Client } = require('pg');
const databaseUrl = 'postgresql://synthetic:synthetic@127.0.0.1:15432/synthetic';
assert.equal(process.env.DATABASE_URL, databaseUrl);
const config = JSON.parse(await readFile(resolve(cwd, 'wrangler.compat.json')));
config.vars.COMMITMENT_JWS_SECRET = 'synthetic-offline-signing-key-never-used-in-production';
config.vars.COMMITMENT_STRUCTURED_LOGS = 'false';
config.vars.CF_COMPAT_TEST = '1';
// TSA is deliberately unconfigured for the application scheduling test. The
// separate previously passing crypto suite covers verified response formats.
assert.equal(config.vars.TSA_URL, undefined);
const configFile = resolve(cwd, 'wrangler.persistence-test.json');
await writeFile(configFile, JSON.stringify(config));
const result = { status: 'FAIL', passedCases: [], productionRequests: 0, liveProviderRequests: 0, fullFeatureParity: false };
let preview, binaryPreview, diagnostic = '';
const sql = async (text, values = []) => {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try { return (await client.query(text, values)).rows; } finally { await client.end(); }
};
const check = async (name, fn) => { await fn(); result.passedCases.push(name); };
const request = (path, options = {}) => fetch('http://127.0.0.1:8787' + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15000) });
const token = (id, role = 'user') => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: id, handle: id, role, exp: Math.floor(Date.now()/1000)+600 });
  return body + '.' + createHmac('sha256', config.vars.AUTH_JWT_SECRET).update(body).digest('base64url');
};
const auth = (id, role) => ({ authorization: 'Bearer ' + token(id, role) });
const pledge = id => request('/api/commitments/pledges/signatures', { method: 'POST', headers: { ...auth(id), 'content-type': 'application/json' }, body: JSON.stringify({ version: 'synthetic-v1', statementHash: 'synthetic-statement-hash', consentPayload: { fixture: true, value: [1, null, 'test'] } }) });
const counts = async () => (await sql('SELECT (SELECT count(*)::int FROM "User") AS users, (SELECT count(*)::int FROM "PledgeSignature") AS pledges, (SELECT count(*)::int FROM "AuditEvent") AS events'))[0];
async function start(configName, port) {
  const instance = startPreview(resolve(cwd, 'node_modules/.bin/wrangler'), ['dev', '--local', '--config', configName, '--ip', '127.0.0.1', '--port', String(port)], { cwd });
  let exited = false;
  for (const stream of [instance.child.stdout, instance.child.stderr]) stream.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-6000); });
  instance.child.on('exit', () => { exited = true; });
  instance.child.on('error', () => { exited = true; });
  try {
    for (let i=0; i<40 && !exited; i++) {
      try { const response = await fetch(`http://127.0.0.1:${port}/__ready`, { signal: AbortSignal.timeout(1000) }); if (response.status === 404) return instance; } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Local preview did not become ready');
  } catch (error) { await instance.stop(); throw error; }
}
async function invokeScheduled() {
  const response = await request('/cdn-cgi/local/scheduled?' + new URLSearchParams({ format: 'json', cron: '0 8 * * *', time: String(Date.UTC(2026,9,20,8)) }));
  const body = await response.json();
  return body;
}
async function scheduled() { const body = await invokeScheduled(); assert.equal(body.outcome, 'ok'); return body; }
const pgctl = args => execFileSync('/usr/lib/postgresql/16/bin/pg_ctl', ['-D', resolve(root, 'pgdata'), ...args], { stdio: 'pipe', timeout: 20000 });
try {
  assert.deepEqual(await counts(), { users: 0, pledges: 0, events: 0 });
  preview = await start(configFile, 8787);
  await check('empty scheduled audit succeeds without creating checkpoint data', async () => {
    await scheduled(); assert.equal((await sql('SELECT count(*)::int AS n FROM "AuditCheckpoint"'))[0].n, 0);
  });
  await check('unauthenticated write is rejected and persists nothing', async () => {
    assert.equal((await request('/api/commitments/pledges/signatures', { method: 'POST' })).status, 401);
    assert.deepEqual(await counts(), { users: 0, pledges: 0, events: 0 });
  });
  let firstPledge;
  await check('real authenticated transaction persists user, pledge, JSON and signed audit event', async () => {
    const response = await pledge('synthetic_a'); assert.equal(response.status, 201);
    const body = await response.json(); firstPledge = body.pledge.id;
    assert.equal(typeof body.auditEvent.sequence, 'string');
    assert.deepEqual(await counts(), { users: 1, pledges: 1, events: 1 });
    const row = (await sql('SELECT "consentPayload", "signatureJws" FROM "PledgeSignature" WHERE id=$1', [firstPledge]))[0];
    assert.deepEqual(row.consentPayload, { fixture: true, value: [1, null, 'test'] });
    for (const signed of [row.signatureJws, body.auditEvent.jws]) {
      const parts = signed.split('.'); assert.equal(parts.length, 3);
      assert.equal(parts[2], createHmac('sha256', config.vars.COMMITMENT_JWS_SECRET).update(parts[0]+'.'+parts[1]).digest('base64url'));
    }
  });
  await check('database failure late in transaction rolls back all earlier writes', async () => {
    await sql(`CREATE FUNCTION synthetic_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.payload->>'userId' = 'synthetic_rollback' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER synthetic_rollback_check BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION synthetic_reject_audit();`);
    assert.equal((await pledge('synthetic_rollback')).status, 500);
    assert.deepEqual(await counts(), { users: 1, pledges: 1, events: 1 });
    assert.equal((await sql('SELECT count(*)::int AS n FROM "User" WHERE id=$1', ['synthetic_rollback']))[0].n, 0);
  });
  await check('concurrent authenticated requests retain separate data and connections', async () => {
    const responses = await Promise.all([pledge('synthetic_b'), pledge('synthetic_c')]);
    for (const response of responses) { assert.equal(response.status, 201); await response.arrayBuffer(); }
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 3 });
  });
  await check('scheduled checkpoint persists and a repeat does not duplicate it', async () => {
    await scheduled(); await scheduled();
    const checkpoints = await sql('SELECT * FROM "AuditCheckpoint"');
    assert.equal(checkpoints.length, 1); assert.equal(checkpoints[0].treeSize, 3);
    assert.equal((await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n, 0);
    const response = await request('/api/cron/commitment-audit', { headers: { authorization: 'Bearer ' + config.vars.CRON_SECRET } });
    assert.equal(response.status, 200); assert.equal(typeof (await response.json()).checkpoint.toSequence, 'string');
  });
  await check('another participant cannot read the persisted private audit object', async () => {
    assert.equal((await request(`/api/commitments/audit/pledge_signature/${firstPledge}`, { headers: auth('synthetic_b') })).status, 404);
    const response = await request(`/api/commitments/audit/pledge_signature/${firstPledge}`, { headers: auth('synthetic_a') });
    assert.equal(response.status, 200); assert.equal((await response.json()).events.length, 1);
  });
  await check('restart of both PostgreSQL and Worker preserves data and read access', async () => {
    await preview.stop(); preview = undefined;
    pgctl(['stop', '-m', 'fast', '-w']); pgctl(['start', '-l', resolve(root, 'postgres.log'), '-w']);
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 3 });
    preview = await start(configFile, 8787);
    const response = await request('/api/commitments/admin/health', { headers: auth('synthetic_admin', 'admin') });
    assert.equal(response.status, 200); assert.equal((await response.json()).health.latestCheckpoint.treeSize, 3);
  });
  await check('an additional write creates a linked checkpoint and retains the pledge upsert contract', async () => {
    const response = await pledge('synthetic_a'); assert.equal(response.status, 201); await response.arrayBuffer();
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 4 }); await scheduled();
    const rows = await sql('SELECT * FROM "AuditCheckpoint" ORDER BY "toSequence"');
    assert.equal(rows.length, 2); assert.equal(rows[1].priorCheckpointId, rows[0].id); assert.equal(rows[1].treeSize, 4);
  });
  await check('Workers PostgreSQL adapter preserves bytea, large BigInt and explicit rollback', async () => {
    binaryPreview = await start('wrangler.db-test.json', 8789);
    const response = await fetch('http://127.0.0.1:8789/synthetic-database', { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'PASS', rollback: true, bigint: true, binary: true, unverifiedRemainsNull: true });
    await binaryPreview.stop(); binaryPreview = undefined;
  });
  await check('completed requests and schedules leave no pooled app connections behind', async () => {
    let remaining;
    for (let i=0; i<10; i++) {
      remaining = (await sql("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname='synthetic' AND pid <> pg_backend_pid() AND backend_type='client backend'"))[0].n;
      if (remaining === 0) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(remaining, 0);
  });
  await check('database outage rejects the scheduled job instead of reporting success', async () => {
    pgctl(['stop', '-m', 'fast', '-w']);
    try { const body = await invokeScheduled(); assert.equal(typeof body.outcome, 'string'); assert.notEqual(body.outcome, 'ok'); }
    finally { pgctl(['start', '-l', resolve(root, 'postgres.log'), '-w']); }
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 4 });
  });
  result.status = 'PASS_SYNTHETIC_POSTGRES_AND_SCHEDULE_ONLY';
} catch (error) {
  result.reason = error.message; result.diagnostic = diagnostic; process.exitCode = 1;
} finally {
  const cleanup = await Promise.allSettled([binaryPreview, preview].filter(Boolean).map(instance => instance.stop()));
  result.cleanup = cleanup.every(item => item.status === 'fulfilled') ? 'PASS' : 'FAIL';
  if (result.cleanup !== 'PASS') { result.status = 'FAIL'; process.exitCode = 1; }
}
await writeFile(resolve(root, 'database-runtime-result.json'), JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify(result, null, 2));
