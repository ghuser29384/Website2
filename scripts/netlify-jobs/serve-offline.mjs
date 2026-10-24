import {runDiscoverSourceStates} from './discover/source-state-probe.mjs';
import {runOffsetEvidenceSearch} from './discover/evidence-probe.mjs';
import {runDiscoverBaseline} from './discover/probe.mjs';
import {runSearchCases} from './search/probe.mjs';
import {runBackgroundCase} from './background/probe.mjs';
import {diagnosePaths} from './path-diagnostic.mjs';
import {probeReadiness} from './readiness.mjs';
import {runStage,failureTail} from './process-stage.mjs';
import {spawn} from 'node:child_process';import {open,writeFile,readFile,mkdir,readdir} from 'node:fs/promises';import {join} from 'node:path';
import assert from 'node:assert/strict';import {startSyntheticPostgres} from './postgres.mjs';import {runJobCases} from './runtime-probe.mjs';import {FIXTURE_TOKEN} from './http-fixture.mjs';
const root=process.env.ROOT,kind=process.env.CANDIDATE;assert.ok(['canonical','legacy'].includes(kind));assert.equal(process.env.OFFLINE_NAMESPACE,'1');
const profileDir=join(root,'search-profiles');await mkdir(profileDir);
const app=join(root,'app'),report={candidate:kind,variant:process.env.DISCOVER_LOADER_VARIANT,hostedMeasurement:false,provesFreeFit:false,status:'INCOMPLETE'};
const base={...process.env,NETLIFY:'true',CONTEXT:'deploy-preview',CI:'true',BROWSER:'none',NETLIFY_TELEMETRY_DISABLED:'1',NEXT_TELEMETRY_DISABLED:'1',MORAL_TRADE_DISABLE_DEP_REPAIR:'1'};
let pg,child,log;
async function stage(name){report.stage=name;await writeFile(join(root,'jobs-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({candidate:kind,stage:name,status:report.status}));}
try{
 for(const [name,cmd,args]of [['unit','npm',['test']],['typecheck',join(app,'node_modules/.bin/tsc'),['--noEmit']]]){
  await stage(name);
  const logPath=join(root,name+'.log');const r=await runStage(cmd,args,{cwd:app,env:base,logPath});
  report[name]=r;console.log(JSON.stringify({candidate:kind,stage:name,...r}));
  if(r.code!==0||r.timedOut)console.log(await failureTail(logPath));
  assert.ok(r.code===0&&!r.timedOut,name+' failed'+(r.timedOut?' (timeout)':''));
 }
 // Build-time disabling is scoped to the build command, runtime stays enabled with synthetic-only values.
 const config=await readFile(join(app,'netlify.toml'),'utf8');assert.ok(config.includes('command = "npm run build"'));
 await writeFile(join(app,'netlify.toml'),config.replace('command = "npm run build"','command = "MORAL_TRADE_DISABLE_SUPABASE=true npm run build"'));
 await stage('postgres');
 pg=startSyntheticPostgres(process.env.PG_BIN,app);
 const env={...base,NETLIFY_SYNTHETIC_PROFILE_DIR:profileDir,EMAIL_BACKGROUND_URL:'http://127.0.0.1:8888/.netlify/functions/email-background',NETLIFY_DEV:'true',EMAIL_DISPATCH_PROJECT:kind==='legacy'?'website2':'moraltrade-site',MORAL_TRADE_DISABLE_SUPABASE:'false',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:15433',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-only',SUPABASE_SERVICE_ROLE_KEY:FIXTURE_TOKEN,CRON_SECRET:'synthetic-cron-secret',RESEND_API_KEY:FIXTURE_TOKEN,EMAIL_FROM:'test@synthetic.invalid',NEXT_PUBLIC_SITE_URL:'https://synthetic.invalid',NETLIFY_EMAIL_SYNTHETIC_TEST:'1',NETLIFY_EMAIL_FIXTURE_ORIGIN:'http://127.0.0.1:15433',NODE_OPTIONS:'--max-old-space-size=6144 --import='+join(root,'jobs/runtime-hook.mjs')};
 await stage('compiled-runtime-startup');
 log=await open(join(root,'serve.log'),'w');
 child=spawn(join(root,'tools/node_modules/.bin/netlify'),['serve','--offline','--context','deploy-preview','--port','8888','--geo','mock'],{cwd:app,env,stdio:['ignore',log.fd,log.fd],detached:true});
 let ready=false;
 const startupDeadline=Date.now()+900000;
 const diagnosticAt=Date.now()+300000;let diagnosed=false;
 for(let i=0;Date.now()<startupDeadline;i++){
  if(i%30===0)console.log(JSON.stringify({candidate:kind,stage:report.stage,waiting:true}));
  if(child.exitCode!==null)break;
  const probe=await probeReadiness();report.lastReadiness=probe;
  if(i%30===0)console.log(JSON.stringify({candidate:kind,readiness:probe}));
  if(probe.ready){ready=true;break;}
  if(!diagnosed&&Date.now()>=diagnosticAt){diagnosed=true;report.pathDiagnostic=await diagnosePaths();console.log(JSON.stringify({candidate:kind,pathDiagnostic:report.pathDiagnostic}));}
  await new Promise(r=>setTimeout(r,1000));
 }
 if(!ready)console.log(await failureTail(join(root,'serve.log')));
 assert.ok(ready,'Built Netlify serve unavailable; no source fallback permitted');
 await stage('email-scenarios');
 report.results=await runJobCases({origin:'http://127.0.0.1:8888',pg,onDiagnostic:event=>console.log(JSON.stringify({candidate:kind,emailDiagnostic:event}))});report.background=await runBackgroundCase({origin:'http://127.0.0.1:8888',pg,project:kind==='legacy'?'website2':'moraltrade-site'});await stage('search-scenarios');await writeFile(join(profileDir,'start'),'');await new Promise(r=>setTimeout(r,400));report.search=await runSearchCases({origin:'http://127.0.0.1:8888',candidate:kind,processGroup:child.pid});await writeFile(join(profileDir,'stop'),'');await new Promise(r=>setTimeout(r,1500));const profiles=await readdir(profileDir);assert.ok(!profiles.some(f=>f.startsWith('error-')),'Synthetic profiler failed');const summaries=profiles.filter(f=>f.startsWith('summary-'));assert.ok(summaries.length>0,'No synthetic profiles collected');report.searchProfiles=await Promise.all(summaries.map(async f=>JSON.parse(await readFile(join(profileDir,f),'utf8'))));if(kind==='canonical'){await stage('discover-scenarios');report.discover=await runDiscoverBaseline({origin:'http://127.0.0.1:8888'});await stage('discover-source-states');report.discoverSources=await runDiscoverSourceStates({origin:'http://127.0.0.1:8888'});await stage('discover-offset-evidence');report.discoverEvidence=await runOffsetEvidenceSearch({origin:'http://127.0.0.1:8888'});}report.status='SYNTHETIC_BUILT_RUNTIME_PASS';
}catch(e){report.status='FAILED';report.reason=e.message;process.exitCode=1;if(['email-scenarios','search-scenarios'].includes(report.stage)&&log)try{console.log(await failureTail(join(root,'serve.log')));}catch{console.log('Synthetic server log unavailable');}}
finally{
 if(child){
  try{process.kill(-child.pid,'SIGTERM');}catch{}
  await new Promise(r=>setTimeout(r,1500));
  try{process.kill(-child.pid,'SIGKILL');}catch{}
 }
 if(log)await log.close();if(pg)pg.stop();
 await writeFile(join(root,'jobs-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
