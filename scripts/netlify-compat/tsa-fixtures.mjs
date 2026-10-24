// Synthetic certificates only. No network, app credentials, production data or
// installations. Keep the generated private key directory out of every patch.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createTimestampQuery } from './tsa-client.mjs';

const directory = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('A new synthetic fixture directory is required');
await mkdir(directory, { recursive: false, mode: 0o700 });
const file = name => resolve(directory, name);
const write = (name, text) => writeFile(file(name), text, { mode: 0o600, flag: 'wx' });
function openssl(args, input) {
  const result = spawnSync(process.env.OPENSSL_BIN || 'openssl', args, {
    cwd: directory, input, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) throw new Error('Synthetic OpenSSL operation failed: ' + args[0] + ': ' + result.stderr);
  return result.stdout;
}
await write('root.cnf', '[req]\ndistinguished_name=dn\nx509_extensions=ca\nprompt=no\n[dn]\nCN=Synthetic timestamp test root ONLY\n[ca]\nbasicConstraints=critical,CA:true\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always\n');
openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('root.key'), '-out', file('root.pem'), '-days', '30', '-config', file('root.cnf')]);
openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('other.key'), '-out', file('other.pem'), '-days', '30', '-config', file('root.cnf')]);
await write('tsa.ext', 'basicConstraints=critical,CA:false\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=critical,timeStamping\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n');
const rootHash = createHash('sha256').update('synthetic Normativity checkpoint only').digest('hex');
const query = createTimestampQuery(rootHash, Uint8Array.from([128, 1, 2, 3, 4, 5, 6, 7]));
await write('request.tsq', query);
const description = openssl(['ts', '-query', '-in', file('request.tsq'), '-text']);
if (!description.includes('Hash Algorithm: sha256') || !description.includes('Certificate required: yes')) throw new Error('Query interoperability failed');
const cases = [];
for (const [name, keyArgs, ess] of [
  ['rsa-sha256', ['rsa:2048'], 'sha256'],
  ['rsa-ess-sha1', ['rsa:2048'], 'sha1'],
  ['ecdsa-sha256', ['ec', '-pkeyopt', 'ec_paramgen_curve:P-256'], 'sha256'],
]) {
  openssl(['req', '-new', '-newkey', ...keyArgs, '-nodes', '-subj', '/CN=Synthetic TSA ONLY', '-keyout', file(name + '.key'), '-out', file(name + '.csr')]);
  openssl(['x509', '-req', '-in', file(name + '.csr'), '-CA', file('root.pem'), '-CAkey', file('root.key'), '-set_serial', String(cases.length + 2), '-days', '30', '-extfile', file('tsa.ext'), '-out', file(name + '.pem')]);
  await write(name + '.serial', '01\n');
  await write(name + '.cnf', `[tsa]\ndefault_tsa=tsa_config\n[tsa_config]\nserial=${file(name + '.serial')}\ncrypto_device=builtin\nsigner_cert=${file(name + '.pem')}\ncerts=${file('root.pem')}\nsigner_key=${file(name + '.key')}\nsigner_digest=sha256\ndefault_policy=1.2.3.4.1\nother_policies=1.2.3.4.2\ndigests=sha256\naccuracy=secs:1\nordering=no\ntsa_name=yes\ness_cert_id_chain=yes\ness_cert_id_alg=${ess}\n`);
  openssl(['ts', '-reply', '-config', file(name + '.cnf'), '-queryfile', file('request.tsq'), '-out', file(name + '.tsr')]);
  const check = openssl(['ts', '-verify', '-queryfile', file('request.tsq'), '-in', file(name + '.tsr'), '-CAfile', file('root.pem')]);
  if (!check.includes('Verification: OK')) throw new Error('OpenSSL golden verification failed');
  cases.push({ name, responseBase64: (await readFile(file(name + '.tsr'))).toString('base64'), opensslVerified: true });
}
const fixtures = {
  syntheticOnly: true, rootHash, queryBase64: query.toString('base64'),
  trustedCaPem: await readFile(file('root.pem'), 'utf8'), untrustedCaPem: await readFile(file('other.pem'), 'utf8'),
  cases, generatedAt: new Date().toISOString(), opensslVersion: openssl(['version']).trim(),
};
await write('fixtures.json', JSON.stringify(fixtures, null, 2) + '\n');
console.log(JSON.stringify({ syntheticOnly: true, signedCases: cases.length, opensslVerified: cases.length,
  queryInteroperability: 'PASS', publishedFixtureContainsPrivateKeys: false }));
