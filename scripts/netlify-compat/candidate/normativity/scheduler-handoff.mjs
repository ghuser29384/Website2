import {createDispatch} from './audit-dispatch.mjs';
// Candidate transport. register() must durably save the original identity first.
export async function handoffAudit({nextRun,secret,target,register,allowLocal=false,fetchImpl=fetch}) {
 const url=new URL(target);
 const local=allowLocal&&url.protocol==='http:'&&url.hostname==='127.0.0.1';
 if((url.protocol!=='https:'&&!local)||url.username||url.password||url.search||url.hash||url.pathname!=='/.netlify/functions/timestamp-background')throw Error('Invalid configured background URL');
 const signed=createDispatch(nextRun,secret);
 const payload=JSON.parse(signed.body);
 const id=payload.job+':'+payload.nextRun;
 const registration=await register(id,signed.body);
 if(registration?.completed===true)return {id,state:'already-completed'};
 const response=await fetchImpl(url.href,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-audit-signature':signed.signature},body:signed.body,signal:AbortSignal.timeout(10000)});
 if(response.status!==202){await response.body?.cancel();throw Error('Background admission failed');}
 await response.body?.cancel();
 return {id,state:'accepted-not-completed'};
}
