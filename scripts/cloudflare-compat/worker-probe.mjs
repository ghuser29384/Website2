// Run only in the disconnected disposable runner namespace.
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const target=process.argv[2];
if(!['rlhf','normativity'].includes(target))throw new Error('Unknown probe target');
const root=process.env.CF_PROBE_ROOT;
if(!root||process.env.CF_OFFLINE_NAMESPACE!=='1')throw new Error('Offline namespace required');
const cwd=resolve(root,target), executable=resolve(root,'tools/node_modules/.bin/wrangler');
let diagnostic='';
const child=spawn(executable,['dev','--local','--ip','127.0.0.1','--port','8787','--config','wrangler.json'],{cwd,stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-16000);});
let started=false, exit=null;
child.once('exit',code=>{exit=code??1;});
const result={target,stage:'Workers local-runtime probe',status:'BLOCKED',cases:0,productionRequests:0,fullFeatureParity:false};
try{
  for(let i=0;i<45;i++){
    if(exit!==null)break;
    try{const r=await fetch('http://127.0.0.1:8787/__compat_ready',{signal:AbortSignal.timeout(600)});if(r.status<500){started=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,1000));
  }
  if(!started){result.reason='Runtime did not start or returned server errors';result.diagnostic=diagnostic;}
  else if(target==='rlhf'){
    const baseline=JSON.parse(await readFile(resolve(root,'rlhf-baseline-results.json'),'utf8'));
    const failures=[];
    for(const c of baseline.cases){
      const r=await fetch('http://127.0.0.1:8787'+c.path,{method:c.method,redirect:'manual',signal:AbortSignal.timeout(5000)});
      const body=Buffer.from(await r.arrayBuffer());
      const reasons=[];
      if(r.status!==c.status)reasons.push('status');
      if(createHash('sha256').update(body).digest('hex')!==c.sha256)reasons.push('body');
      for(const [k,v] of Object.entries(c.headers))if(r.headers.get(k)!==v)reasons.push('header:'+k);
      if(reasons.length)failures.push({path:c.path,method:c.method,reasons});
      result.cases++;
    }
    result.status=failures.length?'FAIL':'PASS_ROUTE_PARITY_ONLY';result.failures=failures;
    result.limit='Runtime route/body/header parity only; browser interactions, external integrations and paid deployment behavior are not established.';
  }else{
    const checks=[];
    for(const [path,method] of [['/api/commitments','GET'],['/api/commitments','OPTIONS']]){
      const r=await fetch('http://127.0.0.1:8787'+path,{method,redirect:'manual',signal:AbortSignal.timeout(5000)});
      checks.push({path,method,status:r.status});
    }
    result.status='STARTED_NOT_COMPATIBILITY_PASS';result.checks=checks;result.cases=checks.length;
    result.limit='No authenticated/database/proof/job success is claimed. Existing native Prisma engine still requires a Workers-compatible driver design and isolated database test.';
  }
}catch(e){result.status='FAIL';result.reason=String(e.message);result.diagnostic=diagnostic;}
finally{
  if(exit===null){child.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));if(exit===null)child.kill('SIGKILL');}
}
await writeFile(resolve(root,target+'-runtime-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
// A successful harness execution is not application compatibility acceptance.
