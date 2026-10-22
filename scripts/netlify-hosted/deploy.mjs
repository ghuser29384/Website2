import {classifyCliFailure} from './cli-diagnostic.mjs';
import {execFileSync} from 'node:child_process';
import {appendFileSync,writeFileSync} from 'node:fs';
const token=process.env.NETLIFY_AUTH_TOKEN;
const name='moraltrade-rlhf-compat-20261021', team='ghuser29384';
if(!token)throw Error('Missing approved token');
async function api(path){
 const r=await fetch('https://api.netlify.com/api/v1'+path,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`Netlify metadata HTTP ${r.status}`);return r.json();
}
function cli(args){
 try{return JSON.parse(execFileSync(process.env.NETLIFY_BIN,args,{encoding:'utf8',timeout:300000,stdio:['ignore','pipe','pipe'],maxBuffer:2*1024*1024}));}
 catch(error){console.error(JSON.stringify({stage:'cli-failure',...classifyCliFailure(error)}));throw Error('Netlify CLI operation failed; no automatic retry. Inspect dashboard state before any further operation.');}
}
const accounts=await api('/accounts');
const account=accounts.find(a=>a.slug===team);
if(!account)throw Error('Approved team not accessible');
const id='af8b1cf6-a4dd-422b-89db-56948bc8d7e4';
const site=await api('/sites/'+id);
const existingDeploys=await api('/sites/'+id+'/deploys');
if(site.id!==id||site.name!==name||site.account_slug!==team||site.published_deploy||site.repo||existingDeploys.length!==0)throw Error('Existing test project is not the verified empty isolated target');
console.log(JSON.stringify({stage:'empty-project-verified',site_id:id,name}));
const deployed=cli(['deploy','--site',id,'--no-build','--context','deploy-preview','--dir','public','--functions','packaged-functions','--json','--timeout','180']);
const deployId=deployed.deploy_id;
if(!deployId)throw Error('Missing deployment ID');
const detail=await api('/deploys/'+encodeURIComponent(deployId));
const after=await api('/sites/'+encodeURIComponent(id));
if(detail.site_id!==id||detail.state!=='ready'||detail.context==='production'||after.published_deploy)throw Error('Draft isolation verification failed');
const origin=deployed.deploy_url;
if(new URL(origin).hostname!==`${deployId}--${name}.netlify.app`)throw Error('Unexpected draft URL');
const result={site_id:id,deploy_id:deployId,url:origin,context:detail.context,published:false};
writeFileSync(process.env.RUNNER_TEMP+'/netlify-hosted-deployment.json',JSON.stringify(result));
appendFileSync(process.env.GITHUB_OUTPUT,`origin=${origin}\n`);
console.log(JSON.stringify(result));
