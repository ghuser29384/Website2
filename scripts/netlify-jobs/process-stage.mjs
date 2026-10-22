import {spawn} from 'node:child_process';
import {open} from 'node:fs/promises';

// Only owns the new detached child group; never signals the caller's group.
export async function runStage(command,args,{logPath,timeoutMs=900000,graceMs=1500,...options}) {
 const log=await open(logPath,'w');
 let child,timer,killTimer,timedOut=false,forceSent=false;
 try {
  child=spawn(command,args,{...options,detached:true,stdio:['ignore',log.fd,log.fd]});
  const signalGroup=signal=>{if(child.pid)try{process.kill(-child.pid,signal);}catch(e){if(e.code!=='ESRCH')throw e;}};
  const result=await new Promise((resolve,reject)=>{
   child.once('error',reject);
   child.once('exit',(code,signal)=>resolve({code,signal}));
   timer=setTimeout(()=>{
    timedOut=true; signalGroup('SIGTERM');
    killTimer=setTimeout(()=>{forceSent=true;signalGroup('SIGKILL');},graceMs);
   },timeoutMs);
  });
  // A shell can exit while its descendants retain pipes or continue running.
  clearTimeout(timer);
  if(timedOut)await new Promise(r=>setTimeout(r,graceMs));
  if(!forceSent)signalGroup('SIGKILL');
  return {...result,timedOut};
 } finally {clearTimeout(timer);clearTimeout(killTimer);await log.close();}
}

export async function failureTail(path,maxBytes=6000){
 const file=await open(path,'r');
 try{
  const {size}=await file.stat();const data=Buffer.alloc(Math.min(size,maxBytes));
  await file.read(data,0,data.length,Math.max(0,size-data.length));
  return data.toString().replace(/\u001b\[[0-9;]*m/g,'')
   .replace(/https?:\/\/[^\s"'<>]+/g,raw=>{try{return new URL(raw).origin+'/[path omitted]';}catch{return '[URL omitted]';}})
   .replace(/\bBearer\s+\S+/gi,'Bearer [REDACTED]')
   .replace(/\b(?:sbp_|sk_live_|sk_test_)[A-Za-z0-9_-]+/g,'[REDACTED]')
   .replace(/((?:token|password|secret|authorization)\s*[=:]\s*)[^\s,;]+/gi,'$1[REDACTED]');
 }finally{await file.close();}
}
