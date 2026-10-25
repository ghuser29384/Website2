import {packageMeasurementEntry} from './package-entry.mjs';
import {buildMeasurementEntry} from './build-entry.mjs';
import {prepareSyntheticEnvironment} from './runtime-environment.mjs';
import {stageBundle} from './stage-bundle.mjs';
import {writeSync} from 'node:fs';
// Offline diagnostic only; no deployment code or credentials.
import assert from 'node:assert/strict';
import {readdir,readFile,realpath,mkdir} from 'node:fs/promises';
import {join,relative,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {resultCountDiagnostic} from '../search/result-count.mjs';
assert.equal(process.env.OFFLINE_NAMESPACE,'1');
assert.equal(process.env.NETLIFY_EMAIL_SYNTHETIC_TEST,'1');
prepareSyntheticEnvironment(process.env);
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
const stagedParent=join(process.env.ROOT,'staged-generated-search');
await mkdir(stagedParent);
const staged=join(stagedParent,'synthetic-search');
const stagedInventory=await stageBundle(dirname(entry),staged);
const packaging=await buildMeasurementEntry(staged,join(process.env.ROOT,'tools'));
const providerPackage=await packageMeasurementEntry(staged,join(process.env.ROOT,'tools'),join(process.env.ROOT,'packaged-synthetic-search'),stagedInventory.inventory);
try{
const module=await import(pathToFileURL(join(staged,'synthetic-search.mjs')).href);
assert.equal(typeof module.default,'function');
const measurementHandler=module.default;
const cases=[];let totalBytes=0;
for(const count of [400,2000])for(const search of ['volunter','unmatchedxyz'])for(const sort of ['best_match','lowest_cost'])for(let repetition=0;repetition<2;repetition++){
 const pending=[];
 const context={account:{id:'synthetic-account'},site:{id:'synthetic-site'},deploy:{id:'synthetic-deploy'},requestId:`synthetic-${cases.length}`,ip:'127.0.0.1',geo:{},waitUntil(p){pending.push(Promise.resolve(p));}};
 const url=new URL('https://synthetic.invalid/offers');url.search=new URLSearchParams({view:'live',render:'server',smart:'1',search,sort});
 const request=new Request(url,{headers:{'x-synthetic-offer-count':String(count)}});
 const beforeReads=module.diagnosticSnapshot().fixtureReads;
 const response=await measurementHandler(request,context);
 assert.equal(response.status,200);const html=await response.text(),expected=search==='volunter'?count:0;
 assert.ok(resultCountDiagnostic(html,expected,'legacy').matches,'Actual compiled rendered count');
 if(expected)assert.ok(html.includes('Synthetic participant'));
 const fixtureRequests=module.diagnosticSnapshot().fixtureReads-beforeReads;
 assert.ok(fixtureRequests>0&&fixtureRequests<=200,'Actual fixture access required');
 let timer;try{await Promise.race([Promise.all(pending),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Background work deadline')),1000);})]);}finally{clearTimeout(timer);}
 const responseBytes=Buffer.byteLength(html);totalBytes+=responseBytes;assert.ok(totalBytes<=128*1024*1024);
 cases.push({count,search,sort,repetition,expected,fixtureRequests,responseBytes});
}
writeSync(1,JSON.stringify({status:'COMPILED_SYNTHETIC_TRANSPORT_PASS',entry:relative(process.env.ROOT,join(staged,'synthetic-search.mjs')),packaging,providerPackage,count:400,fixtureRequests:cases[0].fixtureRequests,responseBytes:cases[0].responseBytes,cases,staging:{files:stagedInventory.stagedFiles,bytes:stagedInventory.bytes},hostedMeasurement:false,provesFreeFit:false})+'\n');
// This owns the disposable probe process and its local cache sockets.
process.exit(0);
}catch(error){writeSync(2,JSON.stringify({status:'COMPILED_SYNTHETIC_TRANSPORT_FAILED',reason:String(error?.message??error).slice(0,600)})+'\n');process.exit(1);}
