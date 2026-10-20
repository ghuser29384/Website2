import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { startPreview } from './preview-process.mjs';
assert.equal(process.env.CF_OFFLINE_NAMESPACE, '1');
const root = process.env.CF_RUN_ROOT, cwd = resolve(root, 'app/cloudflare');
const preview = startPreview(resolve(cwd, 'node_modules/.bin/wrangler'),
  ['dev', '--local', '--config', 'wrangler.tsa-test.json', '--ip', '127.0.0.1', '--port', '8788'], { cwd });
let diagnostic = '', exited = false;
for (const stream of [preview.child.stdout, preview.child.stderr]) stream.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-6000); });
preview.child.on('exit', () => { exited = true; });
preview.child.on('error', error => { diagnostic += error.message; exited = true; });
let result = { status: 'FAIL', productionRequests: 0, liveTsaRequests: 0 };
try {
  let ready = false;
  for (let i = 0; i < 30 && !exited; i++) {
    try { const r = await fetch('http://127.0.0.1:8788/', { signal: AbortSignal.timeout(1000) }); if (r.status === 404) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Local timestamp Worker not ready');
  const r = await fetch('http://127.0.0.1:8788/synthetic-conformance', { signal: AbortSignal.timeout(30000) });
  assert.equal(r.status, 200);
  result = await r.json();
  assert.equal(result.status, 'PASS_SYNTHETIC_CRYPTO_ONLY');
  const fixtures = JSON.parse(await readFile(resolve(cwd, 'tsa-fixtures.json'), 'utf8'));
  assert.equal(result.passedCases.length, fixtures.cases.length + 10 + fixtures.rejectedCases.length);
} catch (error) { result = { ...result, status: 'FAIL', reason: error.message, diagnostic }; process.exitCode = 1; }
finally {
  try { await preview.stop(); result.cleanup = 'PASS'; }
  catch (error) { result.status = 'FAIL'; result.cleanup = error.message; process.exitCode = 1; }
}
await writeFile(resolve(root, 'tsa-runtime-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
