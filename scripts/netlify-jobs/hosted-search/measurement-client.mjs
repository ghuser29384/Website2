// No top-level requests. Caller must separately obtain hosted-test authorization.
import {plan,requestURL} from './measurement-plan.mjs';
import {resultCountDiagnostic} from '../search/result-count.mjs';
export async function measureSyntheticSearch(origin,fetchImpl,{timeoutMs=plan.timeoutMs}={}){
 if(typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>plan.timeoutMs)throw Error('Invalid measurement configuration');
 const startedAtUtc=new Date().toISOString(),results=[];let totalBytes=0;
 for(const c of plan.cases){
  const url=requestURL(origin,c),controller=new AbortController();let timer,reader;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Measurement deadline'));},timeoutMs);});
  const requestedAtUtc=new Date().toISOString(),start=performance.now();
  try{
   const response=await Promise.race([fetchImpl(url,{method:'GET',redirect:'manual',credentials:'omit',signal:controller.signal,headers:{'x-synthetic-offer-count':String(c.count)}}),deadline]);
   if(response.status!==200||response.redirected)throw Error('Unexpected measurement response');
   if(!response.headers.get('content-type')?.includes('text/html'))throw Error('Expected rendered HTML');
   reader=response.body?.getReader();if(!reader)throw Error('Missing rendered response');
   const decoder=new TextDecoder();let html='',bytes=0;
   while(true){const item=await Promise.race([reader.read(),deadline]);if(item.done)break;bytes+=item.value.byteLength;totalBytes+=item.value.byteLength;if(bytes>plan.maxResponseBytes||totalBytes>plan.maxTotalBytes)throw Error('Measurement byte cap');html+=decoder.decode(item.value,{stream:true});}
   html+=decoder.decode();
   if(!resultCountDiagnostic(html,c.expectedMatches,'legacy').matches||(c.expectedMatches>0&&!html.includes('Synthetic participant')))throw Error('Synthetic result mismatch');
   const requestId=response.headers.get('x-nf-request-id');
   results.push({...c,requestedAtUtc,responseBytes:bytes,clientElapsedMs:performance.now()-start,providerRequestId:requestId&&/^[A-Za-z0-9_-]{8,128}$/.test(requestId)?requestId:null,providerDurationVerified:false});
  }finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 return {startedAtUtc,finishedAtUtc:new Date().toISOString(),cases:results,totalBytes,hostedComputeVerified:false,provesFreeFit:false};
}
