import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = process.argv[2];
const before = JSON.parse(await readFile(resolve(root, 'base-lock.json'), 'utf8'));
const after = JSON.parse(await readFile(resolve(root, 'app/package-lock.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'app/package.json'), 'utf8'));
const deliberate = new Map([
  ['pg', '8.23.1'], ['@types/pg', '8.23.1'], ['next', '16.4.1'], ['eslint-config-next', '16.4.1'],
  ['@opennextjs/cloudflare', '1.20.12'], ['wrangler', '4.151.2'], ['rclone.js', '0.6.6'],
]);
for (const [name, version] of deliberate) {
  assert.equal(after.packages['node_modules/' + name]?.version, version, name);
}
for (const name of Object.keys({
  ...before.packages[''].dependencies, ...before.packages[''].devDependencies,
})) {
  if (!deliberate.has(name)) {
    assert.equal(after.packages['node_modules/' + name]?.version,
      before.packages['node_modules/' + name]?.version, 'Unapproved direct dependency drift: ' + name);
  }
}
for (const kind of ['dependencies', 'devDependencies']) {
  assert.deepEqual(after.packages[''][kind], manifest[kind], 'Lock root differs from manifest');
}
console.log('Candidate lock: intended direct dependency changes only; full transitive review still required before release.');
