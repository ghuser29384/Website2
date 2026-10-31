// Pure preparation only. Does not read credentials, invoke fetch or create deployments.
import assert from 'node:assert/strict';
import {validateSearchManifest} from './package-policy.mjs';
export const SITE_ID='af8b1cf6-a4dd-422b-89db-56948bc8d7e4';
const API='https://api.netlify.com/api/v1';
export const PRIOR_DRAFTS=['6ad97f280b56b8ca68b01d40','6ada8d91eff07a88b09c52c9','6ada91ae3e191165820ee550'];
export class UploadValidationError extends Error {
 constructor(code){super('Upload validation rejected');this.code=code;}
}
function guard(code,check){try{check();}catch{throw new UploadValidationError(code);}}
export function verifyDisposableTarget({site,deploys}){
 guard('site-id',()=>assert.equal(site.id,SITE_ID));
 guard('site-name',()=>assert.equal(site.name,'moraltrade-rlhf-compat-20261021'));
 guard('site-account',()=>assert.equal(site.account_slug,'ghuser29384'));
 guard('site-unpublished',()=>assert.ok(!site.published_deploy));
 guard('site-unlinked',()=>assert.ok(!site.repo));
 guard('draft-count',()=>assert.ok(Array.isArray(deploys)&&deploys.length===PRIOR_DRAFTS.length));
 const expected=new Set(PRIOR_DRAFTS);
 for(const d of deploys){
  guard('draft-id',()=>assert.ok(expected.delete(d.id)));
  guard('draft-site',()=>assert.equal(d.site_id,SITE_ID));
  guard('draft-context',()=>assert.equal(d.context,'deploy-preview'));
  guard('draft-ready',()=>assert.equal(d.state,'ready'));
  guard('draft-unpublished',()=>assert.ok(!d.published_at));
 }
 guard('draft-inventory',()=>assert.equal(expected.size,0));
}
export function draftUploadPlan(manifest,archiveSha256,archiveBytes,target){
 verifyDisposableTarget(target);
 guard('manifest-capability',()=>validateSearchManifest(manifest));
 assert.match(archiveSha256,/^[a-f0-9]{64}$/);
 assert.ok(Number.isInteger(archiveBytes)&&archiveBytes>0&&archiveBytes<50*1024*1024);
 const f=manifest.functions[0];
 guard('manifest-invocation',()=>assert.ok(!f.invocationMode||f.invocationMode==='stream'));
 for(const key of ['memory','vcpu','region','trafficRules','timeout'])guard('manifest-override-'+key,()=>assert.equal(f[key],undefined));
 // Netlify ZISI assigns ordinary user functions priority 10; it is not a paid resource override.
 guard('manifest-priority',()=>assert.ok(f.priority===undefined||f.priority===10));
 guard('manifest-runtime',()=>assert.ok(f.runtimeVersion===undefined||f.runtimeVersion==='nodejs22.x'));
 const body={draft:true,files:{},functions:{'synthetic-search':archiveSha256},functions_config:{'synthetic-search':{routes:f.routes,build_data:f.buildData}}};
 return {create:{method:'POST',url:`${API}/sites/${SITE_ID}/deploys`,body},runtime:f.runtimeVersion??'js',archiveSha256,archiveBytes,invocationMode:f.invocationMode};
}
export function functionUploadRequest(plan,created){
 assert.equal(created.site_id,SITE_ID);assert.match(created.id,/^[a-f0-9]{24}$/);
 assert.ok(!created.published_at&&created.context!=='production','Unexpected production deployment');
 assert.ok(Array.isArray(created.required)&&created.required.length===0,'Unexpected static upload');
 assert.ok(!created.required_edge_functions?.length&&!created.required_server?.length,'Unexpected additional runtime');
 assert.ok(Array.isArray(created.required_functions)&&created.required_functions.length<=1);
 if(!created.required_functions.length)return null;
 assert.equal(created.required_functions[0],plan.archiveSha256);
 const url=new URL(`${API}/deploys/${created.id}/functions/synthetic-search`);url.searchParams.set('runtime',plan.runtime);
 if(plan.invocationMode)url.searchParams.set('invocation_mode',plan.invocationMode);
 return {method:'PUT',url:url.href,contentType:'application/octet-stream',bytes:plan.archiveBytes};
}
