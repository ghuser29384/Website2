import test from 'node:test';import assert from 'node:assert/strict';
import {draftUploadPlan,functionUploadRequest,SITE_ID,PRIOR_DRAFTS} from './upload-plan.mjs';
const manifest=()=>({version:1,functions:[{name:'synthetic-search',runtime:'js',runtimeVersion:'nodejs22.x',buildData:{runtimeAPIVersion:2,bootstrapVersion:'test'},routes:[{pattern:'/offers',literal:'/offers',methods:['GET']}]}]});
const target=()=>({site:{id:SITE_ID,name:'moraltrade-rlhf-compat-20261021',account_slug:'ghuser29384'},deploys:PRIOR_DRAFTS.map(id=>({id,site_id:SITE_ID,context:'deploy-preview',state:'ready'}))});
const digest='a'.repeat(64),created=()=>({site_id:SITE_ID,id:'6ada91ae3e191165820ee550',context:'deploy-preview',required:[],required_functions:[digest]});
test('prepares only a draft and one exact hashed function upload',()=>{const p=draftUploadPlan(manifest(),digest,1000,target());assert.equal(p.create.body.draft,true);assert.equal(p.create.body.functions['synthetic-search'],digest);assert.deepEqual(p.create.body.files,{});const u=functionUploadRequest(p,created());assert.equal(u.method,'PUT');assert.match(u.url,/runtime=nodejs22.x$/);assert.equal(u.bytes,1000);assert.equal(functionUploadRequest(p,{...created(),required_functions:[]}),null);});
test('rejects unexpected capability, runtime, override and invalid archive',()=>{for(const change of [f=>f.schedule='* * * * *',f=>f.memory=2048,f=>f.runtimeVersion='nodejs20.x',f=>f.invocationMode='background']){const m=manifest();change(m.functions[0]);assert.throws(()=>draftUploadPlan(m,digest,1000,target()));}assert.throws(()=>draftUploadPlan(manifest(),'bad',1000,target()));assert.throws(()=>draftUploadPlan(manifest(),digest,50*1024*1024,target()));});
test('never uploads for another project, production, unexpected files or hashes',()=>{const p=draftUploadPlan(manifest(),digest,1000,target());for(const change of [d=>d.site_id='other',d=>d.id='../other',d=>d.context='production',d=>d.published_at='now',d=>d.required=['unknown'],d=>d.required_functions=['b'.repeat(64)],d=>d.required_edge_functions=['unknown']]){const d=created();change(d);assert.throws(()=>functionUploadRequest(p,d));}});

test('refuses a changed project or deployment inventory before creation',()=>{for(const change of [t=>t.site.published_deploy={id:'live'},t=>t.site.repo={id:'linked'},t=>t.site.account_slug='other',t=>t.deploys.pop(),t=>t.deploys[0].state='error']){const t=target();change(t);assert.throws(()=>draftUploadPlan(manifest(),digest,1000,t));}});

test('specific validation codes never include rejected private values',()=>{
 for(const [field,code] of [['account_slug','site-account'],['repo','site-unlinked'],['published_deploy','site-unpublished']]){
  const t=target();t.site[field]='private-value';
  assert.throws(()=>draftUploadPlan(manifest(),digest,1000,t),e=>e.code===code&&!e.message.includes('private-value'));
 }
 const t=target();t.deploys[0].published_at='private-value';
 assert.throws(()=>draftUploadPlan(manifest(),digest,1000,t),e=>e.code==='draft-unpublished');
});

test('accepts Netlify ordinary function priority without adding an upload override',()=>{const m=manifest();m.functions[0].priority=10;const plan=draftUploadPlan(m,digest,1000,target());assert.equal(plan.create.body.functions_config['synthetic-search'].priority,undefined);});
test('rejects generated/custom priority and keeps resource overrides blocked',()=>{for(const priority of [0,1,20,'10',null]){const m=manifest();m.functions[0].priority=priority;assert.throws(()=>draftUploadPlan(m,digest,1000,target()),e=>e.code==='manifest-priority');}for(const key of ['memory','vcpu','region','trafficRules','timeout']){const m=manifest();m.functions[0].priority=10;m.functions[0][key]=1;assert.throws(()=>draftUploadPlan(m,digest,1000,target()));}});
