import assert from 'node:assert/strict';
import {checkPackagedPrisma} from './check-packaged-prisma.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [root,kind]=process.argv.slice(2),origin='http://127.0.0.1:8888';
let checks=0;
if(kind==='rlhf'){
 const baseline=JSON.parse(await readFile(root+'/harness/cloudflare-compatibility-20261019/rlhf-baseline-results.json'));
 for(const c of baseline.cases){
  const r=await fetch(origin+c.path,{method:c.method,redirect:'manual'});
  assert.equal(r.status,c.status,c.path);
  for(const [k,v]of Object.entries(c.headers))assert.equal(r.headers.get(k),v,`${c.path}: ${k}`);
  assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),c.sha256,c.path);checks++;
 }
}else if(kind==='normativity'){
 const r=await fetch(origin+'/api/public-config?test=synthetic');console.log(JSON.stringify(checkPackagedPrisma(root+'/app/.netlify/functions-serve/api')));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{supabaseUrl:'',supabaseAnonKey:''});checks++;
 const bad=await fetch(origin+'/api/cron/commitment-audit',{headers:{authorization:'Bearer invalid'}});assert.equal(bad.status,401);checks++;
}else{
 for(const [path,file]of [['/feed','moral-trade-live.html'],['/discover','moral-trade-discover.html'],['/walkthrough','moral-trade-production.html']]){
  const expected=await readFile(root+'/app/public/'+file);
  for(const method of ['GET','HEAD']){
   const r=await fetch(origin+path+'?kept=1',{method,redirect:'manual'});assert.equal(r.status,200,path);
   const body=Buffer.from(await r.arrayBuffer());assert.deepEqual(body,method==='HEAD'?Buffer.alloc(0):expected,path);checks++;
  }
 }
}
console.log(JSON.stringify({checks,status:'PASS_BOUNDED_RUNTIME_ONLY'}));
