export function boundedRequest(origin,fetchImpl=fetch,{requests=100,bytes=10_000_000,timeout=10_000}={}){
 let count=0,received=0,stopped=false;
 const target=new URL(origin);if(target.protocol!=='https:'||target.pathname!=='/'||target.search||target.username||target.password)throw Error('Invalid test origin');
 return async c=>{
  if(stopped||count>=requests)throw Error('Test budget exhausted');
  const url=new URL(c.path,origin);if(url.origin!==target.origin)throw Error('Cross-origin test blocked');
  count++;
  try{
   const response=await fetchImpl(url,{method:c.method,redirect:'manual',signal:AbortSignal.timeout(timeout)});
   const chunks=[];const reader=response.body?.getReader();
   if(reader)for(;;){const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(received>bytes){stopped=true;await reader.cancel();throw Error('Response budget exceeded');}chunks.push(value);}
   return new Response(chunks.length?Buffer.concat(chunks):null,{status:response.status,headers:response.headers});
  }catch(e){stopped=true;throw e;}
 };
}
