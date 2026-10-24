import {randomUUID} from 'node:crypto';
import {verifyEmailDispatch} from './dispatch.mjs';
import {executeEmailDispatch} from './execute.mjs';
async function boundedBody(request){
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512)throw Error('Oversized body');chunks.push(value);}}
 finally{await reader.cancel();reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
export function createEmailBackgroundHandler({project,secret,createDeadline,createClient,processEmailOutbox}){
 return async request=>{
  if(request.method!=='POST')return new Response(null,{status:405});
  let payload;
  try{payload=verifyEmailDispatch(await boundedBody(request),request.headers.get('x-email-dispatch-signature'),secret,project);}
  catch{return new Response(null,{status:401});}
  const deadline=createDeadline(),workerToken=randomUUID();
  try{
   const client=createClient(deadline.fetch);
   const rpc=async(name,args)=>{deadline.check();const result=await client.rpc(name,args);deadline.check();if(result.error)throw Error('Email dispatch database operation failed');return result.data;};
   const outcome=await executeEmailDispatch({
    admit:()=>rpc('admit_email_dispatch_probe',{p_slot:payload.nextRun,p_token:workerToken}),
    process:async rows=>{
     let claimed=false;
     const scoped={rpc(name,args){
      deadline.check();
      if(args.p_worker_token!==workerToken)throw Error('Wrong execution owner');
      if(name==='claim_email_outbox_v2'){
       if(claimed||args.p_limit!==25)throw Error('Invalid repeated claim');claimed=true;return Promise.resolve({data:rows,error:null});
      }
      if(!['complete_email_outbox_v2','retry_email_outbox_v2','suppress_email_outbox_v2'].includes(name))throw Error('Unexpected email operation');
      return client.rpc(name,args);
     }};
     const internal=new Request('https://internal.invalid/api/jobs/email',{method:'POST',headers:{authorization:`Bearer ${secret}`}});
     return processEmailOutbox(internal,{createClient:()=>scoped,workerToken,signal:deadline.signal,check:deadline.check});
    },
    finish:result=>rpc('finish_email_dispatch_probe',{p_slot:payload.nextRun,p_token:workerToken,p_result:result}),
   });
   // Netlify ignores a background response body; durable state is authoritative.
   return Response.json({duplicate:outcome.duplicate,finished:outcome.finished});
  }finally{deadline.close();}
 };
}
