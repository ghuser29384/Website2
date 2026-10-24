import {signEmailDispatch} from './dispatch.mjs';
export async function dispatchScheduledEmail({project,nextRun,secret,url,transport=fetch,development=false}) {
 const target=new URL(url);
 if(target.username||target.password||target.search||target.hash||target.pathname!=='/.netlify/functions/email-background')throw Error('Invalid background destination');
 if(target.protocol!=='https:'&&!(development&&target.protocol==='http:'&&target.hostname==='127.0.0.1'))throw Error('Secure background destination required');
 const signed=signEmailDispatch(project,nextRun,secret);
 const response=await transport(target,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-email-dispatch-signature':signed.signature},body:signed.body,signal:AbortSignal.timeout(10000)});
 if(response.status!==202)throw Error('Background request not accepted');
 // Admission to Netlify is not proof the worker claimed or completed the batch.
 return {accepted:true,completed:false};
}
