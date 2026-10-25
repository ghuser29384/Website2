// Offline diagnostic only; no deployment code or credentials.
import assert from 'node:assert/strict';
import {readdir,readFile,realpath} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSyntheticTransport} from './synthetic-transport.mjs';
import {createSearchFixture} from '../search/fixture.mjs';
import {resultCountDiagnostic} from '../search/result-count.mjs';
assert.equal(process.env.OFFLINE_NAMESPACE,'1');
assert.equal(process.env.NETLIFY_EMAIL_SYNTHETIC_TEST,'1');
const app=await realpath(join(process.env.ROOT,'app'));
let visited=0;const entries=[];
async function walk(dir,depth=0){
 assert.ok(depth<9&&++visited<300,'Bounded generated-entry discovery');
 for(const e of await readdir(dir,{withFileTypes:true})){
  if(e.isSymbolicLink())continue;
  const p=join(dir,e.name);
  if(e.isDirectory()&&!['node_modules','.next','dist'].includes(e.name))await walk(p,depth+1);
  if(e.isFile()&&e.name==='___netlify-server-handler.mjs')entries.push(p);
 }
}
await walk(join(app,'.netlify/functions-internal'));
assert.equal(entries.length,1,'Exactly one generated handler required');
const entry=entries[0],source=await readFile(entry,'utf8');
assert.ok(source.includes('serverHandler')&&source.includes('export default'),'Pinned generated handler contract');
const transport=createSyntheticTransport(createSearchFixture);
globalThis.fetch=transport.fetch; // Must precede module import; adapter captures fetch.
const module=await import(pathToFileURL(entry).href);
assert.equal(typeof module.default,'function');
const pending=[];
const context={account:{id:'synthetic-account'},site:{id:'synthetic-site'},deploy:{id:'synthetic-deploy'},requestId:'synthetic-request',ip:'127.0.0.1',geo:{},waitUntil(p){pending.push(Promise.resolve(p));}};
const request=new Request('https://synthetic.invalid/offers?view=live&render=server&smart=1&search=volunter&sort=best_match');
const response=await transport.runResponse(400,()=>module.default(request,context));
assert.equal(response.status,200);const html=await response.text();
assert.ok(resultCountDiagnostic(html,400,'legacy').matches,'Actual compiled rendered count');
assert.ok(html.includes('Synthetic participant'));
await Promise.race([Promise.all(pending),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Background work deadline')),1000);timer.unref();})]);
console.log(JSON.stringify({status:'COMPILED_SYNTHETIC_TRANSPORT_PASS',entry:relative(app,entry),count:400,responseBytes:Buffer.byteLength(html),hostedMeasurement:false,provesFreeFit:false}));
