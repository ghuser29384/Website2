import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { startPreview } from './preview-process.mjs';

async function ready(child) {
  let text = '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    while (!text.includes('READY')) {
      const [chunk] = await once(child.stdout, 'data', { signal: controller.signal });
      text += chunk;
    }
  } finally { clearTimeout(timer); }
}

test('stops a running preview and closes both pipes', { timeout: 6000 }, async t => {
  const preview = startPreview(process.execPath, ['-e', 'console.log("READY"); setInterval(() => {}, 1000)']);
  t.after(() => preview.stop());
  await ready(preview.child);
  await preview.stop();
  assert.ok(preview.child.signalCode);
  assert.ok(preview.child.stdout.destroyed && preview.child.stderr.destroyed);
});

test('kills a TERM-resistant descendant after its launcher exits', { timeout: 6000 }, async t => {
  const descendant = 'process.on("SIGTERM", () => {}); console.log("READY"); setInterval(() => {}, 1000)';
  const launcher = `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:['ignore',process.stdout,process.stderr]}); child.unref();`;
  const preview = startPreview(process.execPath, ['-e', launcher]);
  t.after(() => preview.stop());
  await ready(preview.child);
  if (preview.child.exitCode === null) await once(preview.child, 'exit');
  assert.equal(preview.child.exitCode, 0);
  assert.equal(preview.child.stdout.destroyed, false, 'Descendant keeps the launcher pipe open');
  const started = Date.now();
  await preview.stop();
  assert.ok(Date.now() - started < 2500, 'Shutdown is bounded');
  assert.ok(preview.child.stdout.destroyed && preview.child.stderr.destroyed);
  await preview.stop(); // Cleanup is safe to call again after an assertion failure.
});

test('cleanup also completes when the executable cannot start', { timeout: 6000 }, async () => {
  const preview = startPreview('/nonexistent-cloudflare-preview-test', []);
  const [error] = await once(preview.child, 'error');
  assert.equal(error.code, 'ENOENT');
  await preview.stop();
});
