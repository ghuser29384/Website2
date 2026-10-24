import {verifyStatic} from './static-probe.mjs';
import {verifyBackground} from './background-probe.mjs';
import {verifyScheduler} from './scheduler-probe.mjs';
import {startAuthority} from './tsa-server.mjs';
import {verifyTimestamps} from './timestamp-probe.mjs';
import {startDatabase} from './persistence-postgres.mjs';
import {verifyPersistence} from './persistence-probe.mjs';
import {spawnSync,spawn} from 'node:child_process';
import {writeFile,readFile,open} from 'node:fs/promises';
import {join} from 'node:path';
import {emulatorDiagnostic,redactDiagnostic} from './diagnostics.mjs';
const [root,kind]=process.argv.slice(2),app=join(root,'app');
if(kind!=='normativity'||process.env.OFFLINE_NAMESPACE!=='1')throw Error('This persistence runner requires isolated Normativity');
const next=false;
const report={candidate:kind,stages:[],hostedAcceptance:false,fullFeatureParity:false,externalRuntimeRequests:0,unverified:['hosted quotas and credits','complete batch elapsed-time and retry acceptance','provider and authenticated end-to-end behavior','production domain cutover'],status:'INCOMPLETE'};
const env={...process.env,NETLIFY:'true',CONTEXT:'deploy-preview',MORAL_TRADE_DISABLE_DEP_REPAIR:'1',NETLIFY_TELEMETRY_DISABLED:'1',NEXT_TELEMETRY_DISABLED:'1',CI:'true',NODE_OPTIONS:'--max-old-space-size=6144 --import='+join(root,'harness/fetch-diagnostic.mjs'),MORAL_TRADE_DISABLE_SUPABASE:'false',CRON_SECRET:'synthetic-cron-secret',DATABASE_URL:'postgresql://postgres:synthetic@127.0.0.1:15439/synthetic'};
Object.assign(env,{NODE_ENV:'production',ALLOW_DEVELOPMENT_AUTH_HEADERS:'false',AUTH_JWT_SECRET:'synthetic-auth-secret-for-persistence',COMMITMENT_JWS_SECRET:'synthetic-signing-secret-for-persistence',COMMITMENT_STRUCTURED_LOGS:'false',DIRECT_URL:env.DATABASE_URL});
let database,authority;
async function stage(name,cmd,args,extra={}){
 const r=spawnSync(cmd,args,{cwd:app,env:{...env,...extra},encoding:'utf8',timeout:30*60*1000,maxBuffer:24*1024*1024});
 await writeFile(join(root,name+'.log'),(r.stdout||'')+(r.stderr||''));
 report.stages.push({name,status:r.status===0?'PASS':'FAIL',exit:r.status,error:r.error?.code});
 console.log(name,r.status===0?'PASS':'FAIL');
 if(r.status!==0)console.log(redactDiagnostic((r.stdout||'')+(r.stderr||'')).slice(-8000));
 return r.status===0;
}
try{
 if(next){
  if(!await stage('unit-tests','npm',['test']))throw Error('unit-tests failed');
  if(!await stage('typecheck',join(app,'node_modules/.bin/tsc'),['--noEmit']))throw Error('typecheck failed');
 }
 // No server, provider credential, or account is supplied. Builds may fail closed offline.
 env.MORAL_TRADE_DISABLE_SUPABASE='true';
 env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:15433';
 env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic-public-only';
 env.NEXT_PUBLIC_SITE_URL='https://synthetic.invalid';
 if(!await stage('netlify-build',join(root,'tools/node_modules/.bin/netlify'),['build','--offline','--context','deploy-preview']))throw Error('Netlify build failed; no fallback labelled as Netlify success');
 if(kind==='rlhf'){
  // Load only the public pinned fixture in the emulated function process.
  env.NODE_OPTIONS+=' --import='+join(root,'harness/fixture-hook.mjs');
  env.NETLIFY_FIXTURE_ROOT=root;
 }
 database=startDatabase(process.env.PG_BIN,app,{listen:true});
 for(const name of ['dispatch-ledger.sql','dispatch-owner.sql','dispatch-proof.sql','dispatch-finish.sql'])database.raw(await readFile(join(root,'harness',name),'utf8'));
 const log=await open(join(root,'emulator.log'),'w');
 let child;
 const startServer=()=>child=spawn(join(root,'tools/node_modules/.bin/netlify'),['dev','--offline','--port','8888','--no-open'],{cwd:app,env,stdio:['ignore',log.fd,log.fd],detached:true});
 const stopServer=async()=>{if(!child)return;const pid=child.pid;const alive=()=>{try{process.kill(-pid,0);return true;}catch{return false;}};try{process.kill(-pid,'SIGTERM');}catch{}for(let i=0;i<50&&alive();i++)await new Promise(r=>setTimeout(r,100));if(alive()){try{process.kill(-pid,'SIGKILL');}catch{}for(let i=0;i<50&&alive();i++)await new Promise(r=>setTimeout(r,100));}if(alive())throw Error('Synthetic server process group did not stop');};
 const readyServer=async()=>{
  let ready=false;
  for(let i=0;i<30;i++){
   if(child.exitCode!==null)break;
   try{await fetch('http://127.0.0.1:8888/',{signal:AbortSignal.timeout(500)});ready=true;break;}catch{}
   await new Promise(r=>setTimeout(r,1000));
  }
  if(!ready){
   report.emulator=await emulatorDiagnostic(join(root,'emulator.log'),child.exitCode,child.signalCode);
   console.log(JSON.stringify(report.emulator));
   throw Error('Offline Netlify emulator unavailable; runtime acceptance pending');
  }
 };
 try{
  startServer();await readyServer();
  if(!await stage('runtime',process.execPath,[join(root,'harness/runtime.mjs'),root,kind])){
   report.emulator=await emulatorDiagnostic(join(root,'emulator.log'),child.exitCode,child.signalCode);
   console.log(JSON.stringify(report.emulator));
   throw Error('Runtime comparison failed');
  }
  report.static=await verifyStatic({root,request:path=>fetch('http://127.0.0.1:8888'+path,{signal:AbortSignal.timeout(10000)})});
  report.persistence=await verifyPersistence({request:(path,options={})=>fetch('http://127.0.0.1:8888'+path,{...options,signal:AbortSignal.timeout(20000)}),sql:database.sql,restart:async()=>{await stopServer();database.restart();startServer();await readyServer();},jwtSecret:env.AUTH_JWT_SECRET,signingSecret:env.COMMITMENT_JWS_SECRET,cronSecret:env.CRON_SECRET});
  if(!await stage('timestamp-fixtures',process.execPath,[join(root,'harness/tsa-fixtures.mjs'),join(root,'timestamp-fixtures')]))throw Error('Synthetic timestamp setup failed');
  authority=await startAuthority(join(root,'timestamp-fixtures'));
  env.TSA_URL=authority.url;
  const trust=async(valid)=>{await stopServer();env.TSA_CA_PEM=await readFile(join(root,'timestamp-fixtures',valid?'root.pem':'other.pem'),'utf8');startServer();await readyServer();};
  await trust(true);
  report.timestamps=await verifyTimestamps({request:(path,options={})=>fetch('http://127.0.0.1:8888'+path,{...options,signal:AbortSignal.timeout(20000)}),sql:database.sql,authority,trust,cronSecret:env.CRON_SECRET});
  report.scheduler=await verifyScheduler({request:(path,options={})=>fetch('http://127.0.0.1:8888'+path,{...options,signal:AbortSignal.timeout(35000)}),sql:database.sql,jwtSecret:env.AUTH_JWT_SECRET});
  report.background=await verifyBackground({request:(path,options={})=>fetch('http://127.0.0.1:8888'+path,{...options,signal:AbortSignal.timeout(35000)}),sql:database.sql,raw:database.raw,authority,secret:env.CRON_SECRET});
 }finally{await stopServer();await log.close();}
 report.status='PACKAGING_AND_BOUNDED_RUNTIME_PASS';
}catch(e){report.status='BLOCKED_OR_FAILED';report.reason=e.message;process.exitCode=1;}
finally{await authority?.close();database?.stop();await writeFile(join(root,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
