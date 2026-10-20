// Offline comparison baseline: exact deployed handler, public pinned bundle, no network.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dir = new URL('./source/rlhf/', import.meta.url);
const source = await readFile(new URL('index.mjs', dir));
assert.equal(createHash('sha1').update(source).digest('hex'), 'a9faf272965ec07e0d346789e39c2bcf4978d027');
const base64 = await readFile(new URL('bundle.b64', dir), 'utf8');
const compressed = Buffer.from(base64.trim(), 'base64');
assert.equal(createHash('sha256').update(compressed).digest('hex'), 'cb79993ba0cbe7c8d33efbe346789e63785f7f4d5854cb076f904190d504307a');
const bundleUrl = source.toString().match(/const BUNDLE_URL = "([^"]+)"/)[1];
let fetchCount = 0;
globalThis.fetch = async url => {
  assert.equal(String(url), bundleUrl, 'Unapproved outgoing request');
  fetchCount++;
  return new Response(base64);
};
const {default: handler} = await import(new URL('index.mjs', dir));
const tar = gunzipSync(compressed);
const paths = new Set(['/', '/index.html', '/research', '/research/', '/arguments', '/arguments/', '/reviewers', '/reviewers/', '/reviewers/index.html', '/contribute', '/contribute/', '/workspace', '/workspace/', '/reference', '/reference/']);
const text = (b, s, n) => b.subarray(s, s+n).toString().split('\0')[0];
for (let at=0; at+512<=tar.length;) {
  const h=tar.subarray(at,at+512); if(h.every(x=>x===0))break;
  const size=parseInt(text(h,124,12).trim()||'0',8);
  const name=[text(h,345,155),text(h,0,100)].filter(Boolean).join('/').replace(/^\.\//,'');
  const type=h[156];
  if((type===48||type===0)&&name.startsWith('dist/'))paths.add('/'+name.slice(5));
  at+=512+Math.ceil(size/512)*512;
}
async function invoke(url, method='GET') {
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=String(v);},end(body){this.body=Buffer.from(body??'');}};
  await handler({url,method},res);
  return {path:url,method,status:res.statusCode,headers:res.headers,bytes:res.body.length,sha256:createHash('sha256').update(res.body).digest('hex')};
}
const cases=[];
for(const p of paths){const get=await invoke(p),head=await invoke(p,'HEAD');assert.equal(get.status,200,p);assert.equal(head.status,200,p);assert.equal(head.bytes,0,p);assert.deepEqual(head.headers,get.headers,p);cases.push(get,head);}
for(const [p,expected] of [['/not-a-real-file',404],['/%zz',400],['/src/assets/LMCA_dataset.pdf',307],['/%2e%2e%2fprivate',404]]){
  const r=await invoke(p);assert.equal(r.status,expected,p);cases.push(r);
}
assert.equal(fetchCount,1,'Published bundle should be loaded once');
await writeFile(new URL('./rlhf-baseline-results.json',import.meta.url),JSON.stringify({status:'PASS_NODE_BASELINE_ONLY',sourceSha1:'a9faf272965ec07e0d346789e39c2bcf4978d027',bundleSha256:'cb79993ba0cbe7c8d33efbe346789e63785f7f4d5854cb076f904190d504307a',paths:paths.size,cases,externalRequests:0,workersTested:false},null,2)+'\n');
console.log(JSON.stringify({baseline:'PASS',paths:paths.size,cases:cases.length,externalRequests:0,workersTested:false}));
