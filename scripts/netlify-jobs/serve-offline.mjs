import {spawn,spawnSync} from 'node:child_process';import {open,writeFile,readFile} from 'node:fs/promises';import {join} from 'node:path';
import assert from 'node:assert/strict';import {startSyntheticPostgres} from './postgres.mjs';import {runJobCases} from './runtime-probe.mjs';import {FIXTURE_TOKEN} from './http-fixture.mjs';
const root=process.env.ROOT,kind=process.env.CANDIDATE;assert.ok(['canonical','legacy'].includes(kind));assert.equal(process.env.OFFLINE_NAMESPACE,'1');
const app=join(root,'app'),report={candidate:kind,hostedMeasurement:false,provesFreeFit:false,status:'INCOMPLETE'};
const base={...process.env,NETLIFY:'true',CONTEXT:'deploy-preview',CI:'true',BROWSER:'none',NETLIFY_TELEMETRY_DISABLED:'1',NEXT_TELEMETRY_DISABLED:'1',MORAL_TRADE_DISABLE_DEP_REPAIR:'1'};
let pg,child,log;
try{
 for(const [name,cmd,args]of [['unit','npm',['test']],['typecheck',join(app,'node_modules/.bin/tsc'),['--noEmit']]]){
  const r=spawnSync(cmd,args,{cwd:app,env:base,encoding:'utf8',timeout:900000,maxBuffer:24*1024*1024});await writeFile(join(root,name+'.log'),(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,name+' failed');
 }
 // Build-time disabling is scoped to the build command, runtime stays enabled with synthetic-only values.
 const config=await readFile(join(app,'netlify.toml'),'utf8');assert.ok(config.includes('command = "npm run build"'));
 await writeFile(join(app,'netlify.toml'),config.replace('command = "npm run build"','command = "MORAL_TRADE_DISABLE_SUPABASE=true npm run build"'));
 pg=startSyntheticPostgres(process.env.PG_BIN,app);
 const env={...base,MORAL_TRADE_DISABLE_SUPABASE:'false',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:15433',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-only',SUPABASE_SERVICE_ROLE_KEY:FIXTURE_TOKEN,CRON_SECRET:'synthetic-cron-secret',RESEND_API_KEY:FIXTURE_TOKEN,EMAIL_FROM:'test@synthetic.invalid',NEXT_PUBLIC_SITE_URL:'https://synthetic.invalid',NETLIFY_EMAIL_SYNTHETIC_TEST:'1',NETLIFY_EMAIL_FIXTURE_ORIGIN:'http://127.0.0.1:15433',NODE_OPTIONS:'--max-old-space-size=6144 --import='+join(root,'jobs/runtime-hook.mjs')};
 log=await open(join(root,'serve.log'),'w');
 child=spawn(join(root,'tools/node_modules/.bin/netlify'),['serve','--offline','--context','deploy-preview','--port','8888','--geo','mock'],{cwd:app,env,stdio:['ignore',log.fd,log.fd],detached:true});
 let ready=false;
 for(let i=0;i<900;i++){
  if(child.exitCode!==null)break;
  try{const r=await fetch('http://127.0.0.1:8888/favicon.ico',{signal:AbortSignal.timeout(500)});await r.arrayBuffer();ready=true;break;}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(ready,'Built Netlify serve unavailable; no source fallback permitted');
 report.results=await runJobCases({origin:'http://127.0.0.1:8888',pg});report.status='SYNTHETIC_BUILT_RUNTIME_PASS';
}catch(e){report.status='FAILED';report.reason=e.message;process.exitCode=1;}
finally{
 if(child){
  try{process.kill(-child.pid,'SIGTERM');}catch{}
  await new Promise(r=>setTimeout(r,1500));
  try{process.kill(-child.pid,'SIGKILL');}catch{}
 }
 if(log)await log.close();if(pg)pg.stop();
 await writeFile(join(root,'jobs-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
