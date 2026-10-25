// No top-level I/O. Calling this requires separate hosted-deployment approval.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {draftUploadPlan,functionUploadRequest,SITE_ID,PRIOR_DRAFTS} from './upload-plan.mjs';
import {validateCompletion} from './completion.mjs';
const API='https://api.netlify.com/api/v1';
function draftIdentity(d){assert.equal(d.site_id,SITE_ID);assert.match(d.id,/^[a-f0-9]{24}$/);assert.equal(d.context,'deploy-preview');assert.ok(!d.published_at);}
export async function uploadVerifiedDraft({approval,manifest,archive,evidence,api,wait,onCreated}){
 assert.equal(approval,'one-disposable-search-draft');
 assert.ok(Buffer.isBuffer(archive)&&archive.length>0&&archive.length<50*1024*1024);
 const proof=validateCompletion(JSON.stringify(evidence));
 const digest=createHash('sha256').update(archive).digest('hex');
 assert.equal(digest,proof.providerPackage.archiveSha256);assert.equal(archive.length,proof.providerPackage.archiveBytes);
 assert.equal(typeof api,'function');assert.equal(typeof wait,'function');assert.equal(typeof onCreated,'function');
 const site=await api('GET',`${API}/sites/${SITE_ID}`);
 const deploys=await api('GET',`${API}/sites/${SITE_ID}/deploys?per_page=100`);
 const plan=draftUploadPlan(manifest,digest,archive.length,{site,deploys});
 // Exactly one create attempt. Any unknown outcome stops; never blindly retry a write.
 let draft=await api('POST',plan.create.url,{json:plan.create.body});
 draftIdentity(draft);assert.ok(!PRIOR_DRAFTS.includes(draft.id),'Create returned a prior draft');const deployId=draft.id;await onCreated({site_id:SITE_ID,deploy_id:draft.id});
 const detailURL=`${API}/deploys/${draft.id}`;
 for(let attempt=0;!Array.isArray(draft.required_functions)&&attempt<12;attempt++){
  if(['error','failed','canceled'].includes(draft.state))throw Error('Draft preparation failed');
  await wait(5000);draft=await api('GET',detailURL);draftIdentity(draft);assert.equal(draft.id,deployId);
 }
 const upload=functionUploadRequest(plan,draft);
 if(upload)await api('PUT',upload.url,{binary:archive});
 for(let attempt=0;draft.state!=='ready'&&attempt<18;attempt++){
  if(['error','failed','canceled'].includes(draft.state))throw Error('Draft processing failed');
  await wait(5000);draft=await api('GET',detailURL);draftIdentity(draft);assert.equal(draft.id,deployId);
 }
 assert.equal(draft.state,'ready','Draft did not become ready within observation bound');
 const after=await api('GET',`${API}/sites/${SITE_ID}`);
 assert.equal(after.id,SITE_ID);assert.equal(after.name,site.name);assert.equal(after.account_slug,site.account_slug);assert.ok(!after.published_deploy&&!after.repo);
 const url=`https://${draft.id}--moraltrade-rlhf-compat-20261021.netlify.app`;
 if(draft.deploy_ssl_url)assert.equal(draft.deploy_ssl_url,url);
 return {site_id:SITE_ID,deploy_id:draft.id,url,context:draft.context,published:false,archiveSha256:digest,hostedRequestsMade:0};
}
