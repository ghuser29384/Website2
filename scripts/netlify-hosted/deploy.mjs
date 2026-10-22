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
 catch{throw Error('Netlify CLI operation failed; no automatic retry. Inspect dashboard state before any further operation.');}
}
const accounts=await api('/accounts');
const account=accounts.find(a=>a.slug===team);
if(!account)throw Error('Approved team not accessible');
const sites=await api('/sites');
if(sites.some(s=>s.name===name))throw Error('Test project already exists; stop to avoid duplicate deployment');
const made=cli(['sites:create','--name',name,'--account-slug',team,'--disable-linking','--json']);
const id=made.site_id||made.id;
if(!id)throw Error('Creation response missing project ID; inspect dashboard');
const site=await api('/sites/'+encodeURIComponent(id));
if(site.name!==name||site.account_slug!==team||site.published_deploy||site.repo)throw Error('New project identity or isolation check failed');
console.log(JSON.stringify({stage:'empty-project-created',site_id:id,name}));
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
