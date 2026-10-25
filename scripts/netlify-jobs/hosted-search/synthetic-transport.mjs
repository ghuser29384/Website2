// Test preparation only. Not installed in or deployed with any application.
import {AsyncLocalStorage} from 'node:async_hooks';
const origin='http://127.0.0.1:15433';
export function createSyntheticTransport(createFixture){
 const contexts=new AsyncLocalStorage();
 async function fetch(input,init){
  const state=contexts.getStore();
  if(!state||state.closed)throw Error('No active synthetic request');
  const request=new Request(input,init),url=new URL(request.url);
  if(url.origin!==origin||url.username||url.password||request.method!=='GET')throw Error('Synthetic transport denies destination or method');
  if(!['/rest/v1/offers','/rest/v1/donation_offset_offers','/auth/v1/user'].includes(url.pathname))throw Error('Synthetic transport denies path');
  if(request.headers.has('cookie'))throw Error('Cookies forbidden in synthetic transport');
  // Authorization is intentionally not forwarded: fixture has no network transport.
  const headers=new Headers(request.headers);headers.delete('authorization');headers.delete('apikey');
  return state.fixture.handle(new Request(request,{headers}));
 }
 async function run(count,action){
  if(![400,2000].includes(count))throw Error('Unsupported synthetic row count');
  if(contexts.getStore())throw Error('Nested synthetic requests forbidden');
  const state={fixture:createFixture({count}),closed:false};
  return contexts.run(state,async()=>{
   try{return {value:await action(fetch),fixtureRequests:state.fixture.requests()};}
   finally{state.closed=true;}
  });
 }
 async function runResponse(count,action,{timeoutMs=30000}={}){
  if(![400,2000].includes(count)||contexts.getStore()||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Invalid response context');
  const state={fixture:createFixture({count}),closed:false};
  let reader,output,timer;
  const close=()=>{state.closed=true;clearTimeout(timer);};
  const cancelSource=reason=>{
   if(reader)void reader.cancel(reason).catch(()=>{}).finally(()=>{try{reader.releaseLock();}catch{}});
  };
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
   const error=Error('Synthetic response deadline');close();cancelSource(error);output?.error(error);reject(error);
  },timeoutMs);});
  // A deadline may fire while nobody reads the response; always observe rejection.
  deadline.catch(()=>{});
  let response;
  const actionPromise=contexts.run(state,()=>Promise.resolve().then(()=>action(fetch)));
  actionPromise.then(value=>{if(state.closed&&value instanceof Response)void value.body?.cancel().catch(()=>{});},()=>{});
  try{response=await Promise.race([actionPromise,deadline]);if(!(response instanceof Response))throw Error('Expected Response');}
  catch(error){close();throw error;}
  if(!response.body){close();return response;}
  reader=response.body.getReader();let bytes=0;
  const stream=new ReadableStream({
   start(controller){output=controller;},
   async pull(controller){
    try{const item=await Promise.race([contexts.run(state,()=>reader.read()),deadline]);
     if(state.closed)return;
     if(item.done){close();reader.releaseLock();controller.close();return;}
     bytes+=item.value.byteLength;if(bytes>8*1024*1024)throw Error('Response byte cap');
     controller.enqueue(item.value);
    }catch(error){if(!state.closed){close();cancelSource(error);controller.error(error);}}
   },
   cancel(reason){close();cancelSource(reason);}
  },{highWaterMark:0});
  return new Response(stream,{status:response.status,statusText:response.statusText,headers:response.headers});
 }
 return {run,runResponse,fetch};
}
