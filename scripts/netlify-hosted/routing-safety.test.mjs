import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SITE_ID,PRIOR_DRAFT,PRIOR_DRAFTS,verifyDisposableTarget,draftArgs} from './deployment-guard.mjs';
import {runHostedTest} from './hosted-test.mjs';
import serve from './netlify/functions/public.mjs';
const site={id:SITE_ID,name:'moraltrade-rlhf-compat-20261021',account_slug:'ghuser29384',published_deploy:null,repo:null};
const draft={id:PRIOR_DRAFT,site_id:SITE_ID,context:'deploy-preview',published_at:null,state:'ready'};
const otherDraft={...draft,id:PRIOR_DRAFTS[1]};
const origin=`https://${PRIOR_DRAFT}--moraltrade-rlhf-compat-20261021.netlify.app`;
const {cases}=JSON.parse(await readFile(new URL('./baseline.json',import.meta.url),'utf8'));
test('accept only known isolated project and draft',()=>verifyDisposableTarget(site,[draft,otherDraft]));
for(const [key,value] of Object.entries({id:'other',name:'other',account_slug:'other',published_deploy:{id:'published'},repo:{id:'linked'}}))test(`reject project ${key}`,()=>assert.throws(()=>verifyDisposableTarget({...site,[key]:value},[draft,otherDraft])));
for(const [key,value] of Object.entries({id:'other',site_id:'other',context:'production',published_at:'now',state:'error'}))test(`reject draft ${key}`,()=>assert.throws(()=>verifyDisposableTarget(site,[{...draft,[key]:value},otherDraft])));
test('reject missing or additional deployments',()=>{assert.throws(()=>verifyDisposableTarget(site,[]));assert.throws(()=>verifyDisposableTarget(site,[draft,draft]));});
test('source packaging skips stale cache and keeps draft flags',()=>{const a=draftArgs();assert.equal(a[a.indexOf('--functions')+1],'netlify/functions');assert(a.includes('--skip-functions-cache'));assert(a.includes('--no-build'));assert(!a.some(x=>['--prod','--prod-if-unlocked','--context','--upload-source'].includes(x)));});
test('94 unchanged cases pass in-process without network',async()=>{const r=await runHostedTest(origin,cases,(u,i)=>serve(new Request(u,i)));assert.equal(r.status,'PASS');assert.equal(r.passed,94);});
test('retain observed HTTP status without response body',async()=>{const r=await runHostedTest(origin,cases,async()=>new Response('private diagnostic body',{status:503}));assert.equal(r.attempted,94);assert.equal(r.failures[0].actualStatus,503);assert.equal(r.failures[0].expectedStatus,cases[0].status);assert(!JSON.stringify(r).includes('private diagnostic body'));});
test('stop once on error and never log error message',async()=>{let n=0;const r=await runHostedTest(origin,cases,async()=>{n++;throw new DOMException('secret token text','TimeoutError');});assert.equal(n,1);assert.equal(r.status,'STOP');assert.equal(r.errorClass,'TimeoutError');assert(!JSON.stringify(r).includes('secret token'));});

const {validateManifest}=await import('./manifest-preflight.mjs');
const manifest={version:1,functions:[{name:'public',runtime:'js',buildData:{runtimeAPIVersion:2},routes:[{pattern:'/*',expression:'^/.*$'}]}]};
test('manifest accepts catch-all Web API function',()=>assert.equal(validateManifest(manifest).name,'public'));
for(const [name,mutate] of [
 ['missing route',m=>delete m.functions[0].routes],
 ['wrong runtime',m=>m.functions[0].buildData.runtimeAPIVersion=1],
 ['extra function',m=>m.functions.push(m.functions[0])],
 ['narrow expression',m=>m.functions[0].routes[0].expression='^/research$'],
 ['schedule',m=>m.functions[0].schedule='* * * * *'],
 ['excluded route',m=>m.functions[0].excludedRoutes=[{pattern:'/research'}]]
])test(`manifest rejects ${name}`,()=>{const m=structuredClone(manifest);mutate(m);assert.throws(()=>validateManifest(m));});

test('accept reversed exact history and reject extra deployment',()=>{verifyDisposableTarget(site,[otherDraft,draft]);assert.throws(()=>verifyDisposableTarget(site,[draft,otherDraft,{...draft,id:'extra'}]));});
