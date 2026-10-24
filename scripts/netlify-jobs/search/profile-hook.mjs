// Synthetic runner only. Inspector Session connects in-process, never opens a port.
import {Session} from 'node:inspector';
import {existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {threadId} from 'node:worker_threads';
export function summarize(profile){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n.callFrame]));const totals=new Map();
 for(let i=0;i<(profile.samples??[]).length;i++){
  const frame=nodes.get(profile.samples[i]);if(!frame)continue;
  const key=JSON.stringify({functionName:frame.functionName,url:frame.url,line:frame.lineNumber});
  totals.set(key,(totals.get(key)??0)+(profile.timeDeltas?.[i]??0));
 }
 return {durationUs:profile.endTime-profile.startTime,samples:profile.samples?.length??0,top:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([key,selfUs])=>({...JSON.parse(key),selfUs}))};
}
const dir=process.env.NETLIFY_SYNTHETIC_PROFILE_DIR;
if(dir){
 if(process.env.NETLIFY_EMAIL_SYNTHETIC_TEST!=='1'||process.env.EMAIL_FROM!=='test@synthetic.invalid')throw Error('Synthetic profile opt-in required');
 const session=new Session();let state='idle',busy=false,timer;
 const post=(method)=>new Promise((resolve,reject)=>session.post(method,(error,result)=>error?reject(error):resolve(result)));
 const fail=error=>{state='failed';clearInterval(timer);try{session.disconnect();}catch{}writeFileSync(join(dir,`error-${process.pid}-${threadId}.json`),JSON.stringify({error:String(error.message)})+'\n');};
 const stop=async(reason)=>{
  if(state!=='running')return;
  state='stopping';clearInterval(timer);
  const {profile}=await post('Profiler.stop');session.disconnect();state='done';
  writeFileSync(join(dir,`summary-${process.pid}-${threadId}.json`),JSON.stringify({...summarize(profile),threadId,stopReason:reason})+'\n');
 };
 const tick=async()=>{
  if(busy)return;busy=true;
  try{
   if(state==='idle'&&existsSync(join(dir,'start'))&&!existsSync(join(dir,'stop'))){session.connect();await post('Profiler.enable');await post('Profiler.start');state='running';}
   if(state==='running'&&existsSync(join(dir,'stop')))await stop('marker');
  }catch(error){fail(error);}finally{busy=false;}
 };
 // Start before the worker module executes, then flush before natural worker exit.
 await tick();
 process.once('beforeExit',()=>{void stop('beforeExit').catch(fail);});
 if(!['done','failed'].includes(state)){timer=setInterval(()=>void tick(),100);timer.unref();}
}
