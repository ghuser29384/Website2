import assert from 'node:assert/strict';
import { startPreview } from './preview-process.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHmac, createHash } from 'node:crypto';
import { resolve } from 'node:path';
assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const target = process.env.CF_CANDIDATE, root = process.env.CF_RUN_ROOT;
assert.ok(['moraltrade', 'normativity'].includes(target));
const cwd = resolve(root, 'app', target === 'normativity' ? 'cloudflare' : '.');
const executable = resolve(cwd, 'node_modules/.bin',
  target === 'moraltrade' ? 'opennextjs-cloudflare' : 'wrangler');
const args = target === 'moraltrade'
  ? ['preview', '--config', 'wrangler.compat.json', '--local', '--ip', '127.0.0.1', '--port', '8787']
  : ['dev', '--config', 'wrangler.compat.json', '--local', '--ip', '127.0.0.1', '--port', '8787'];
let diagnostic = '', exit = null;
const preview = startPreview(executable, args, { cwd });
const { child } = preview;
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-12000); });
}
child.on('error', error => { diagnostic += error.message; exit = 1; });
child.on('exit', code => { exit = code ?? 1; });
const result = { application: target, status: 'FAIL', passedCases: [],
  productionRequests: 0, fullFeatureParity: false, databaseSuccessTested: false };
const request = (path, options = {}) => fetch('http://127.0.0.1:8787' + path,
  { ...options, redirect: 'manual', signal: AbortSignal.timeout(5000) });
const check = async (name, operation) => { await operation(); result.passedCases.push(name); };
try {
  let ready = false;
  for (let attempt = 0; attempt < 60 && exit === null; attempt++) {
    try { const response = await request('/__compat_ready'); if (response.status < 500) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Local Workers service did not become ready');
  if (target === 'normativity') {
    await check('CORS preflight preserved', async () => {
      const r = await request('/api/commitments', { method: 'OPTIONS' });
      assert.equal(r.status, 204);
      assert.match(r.headers.get('access-control-allow-methods'), /POST/);
    });
    for (const headers of [{}, { 'x-user-id': 'synthetic-admin', 'x-user-role': 'admin' }]) {
      await check(Object.keys(headers).length ? 'Forged admin headers rejected' : 'Unauthenticated request rejected', async () => {
        assert.equal((await request('/api/commitments', { headers })).status, 401);
      });
    }
    await check('JSON request parser retained', async () => {
      assert.equal((await request('/api/commitments', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken',
      })).status, 400);
    });
    const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = part({ alg: 'HS256', typ: 'JWT' }) + '.' +
      part({ sub: 'synthetic-user', role: 'user', exp: Math.floor(Date.now() / 1000) + 120 });
    const token = payload + '.' + createHmac('sha256',
      'synthetic-offline-jwt-test-key-not-a-real-secret').update(payload).digest('base64url');
    await check('Verified non-admin JWT cannot access admin route', async () => {
      assert.equal((await request('/api/commitments/admin/health', {
        headers: { authorization: 'Bearer ' + token },
      })).status, 403);
    });
    await check('Invalid JWT rejected', async () => {
      assert.equal((await request('/api/commitments/admin/health', {
        headers: { authorization: 'Bearer ' + token.slice(0, -3) + 'bad' },
      })).status, 401);
    });
    await check('Public config remains uncached and synthetic', async () => {
      const r = await request('/api/public-config');
      assert.equal(r.status, 200);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await r.json(), { supabaseUrl: '', supabaseAnonKey: '' });
    });
    await check('Audit endpoint still requires its credential', async () => {
      assert.equal((await request('/api/cron/commitment-audit')).status, 401);
    });
    result.unresolved = ['Timestamp adapter requires separate conformance result and real-provider acceptance', 'Real database operations',
      'Signed proof/storage/provider flows', 'Frontend and scheduled trigger'];
  } else {
    for (const [path, file] of [['/', 'moral-trade-live.html'], ['/discover', 'moral-trade-discover.html']]) {
      await check('Rendered asset preserved: ' + path, async () => {
        const r = await request(path);
        assert.equal(r.status, 200);
        const expected = await readFile(resolve(cwd, 'public', file));
        const hash = bytes => createHash('sha256').update(bytes).digest('hex');
        assert.equal(hash(Buffer.from(await r.arrayBuffer())), hash(expected));
        assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      });
    }
    await check('Search query redirect preserved', async () => {
      const r = await request('/offers?search=Climate');
      assert.equal(r.status, 307);
      const location = new URL(r.headers.get('location'), 'http://127.0.0.1:8787');
      assert.equal(location.pathname, '/discover');
      assert.equal(location.searchParams.get('q'), 'Climate');
      assert.equal(location.searchParams.get('domain'), 'offers');
    });
    await check('Invalid offer identifiers fail closed', async () => {
      assert.equal((await request('/offers/undefined')).status, 404);
    });
    await check('Walkthrough cookie and privacy retained', async () => {
      const r = await request('/walkthrough', { headers: { 'user-agent': 'Mozilla/5.0 synthetic-offline-check' } });
      assert.equal(r.status, 200);
      assert.ok(r.headers.get('set-cookie'));
      assert.match(r.headers.get('cache-control'), /private/);
      assert.match(r.headers.get('cache-control'), /no-store/);
    });
    result.unresolved = ['Database/search-result parity', 'Auth/session/payment/webhook flows',
      'Images, cache invalidation, document filesystem and seven scheduled jobs', 'Billed CPU and full-cycle limits'];
  }
  result.status = 'PASS_LIMITED_RUNTIME_CHECKS_ONLY';
} catch (error) {
  result.reason = error.message;
  result.diagnostic = diagnostic;
  process.exitCode = 1;
} finally {
  try {
    await preview.stop();
    result.cleanup = 'PASS';
  } catch (error) {
    result.status = 'FAIL';
    result.cleanup = error.message;
    process.exitCode = 1;
  }
}
await writeFile(resolve(root, 'runtime-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
