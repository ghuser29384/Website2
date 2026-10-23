// Fixed synthetic loopback target; never log response bodies, headers or error messages.
export async function probeReadiness(fetchImpl=fetch,timeoutMs=5000){
 let phase='headers',status;const start=performance.now();
 try{
  const response=await fetchImpl('http://127.0.0.1:8888/favicon.ico',{signal:AbortSignal.timeout(timeoutMs)});
  status=response.status;phase='body';await response.arrayBuffer();
  return {ready:true,status,elapsedMs:Math.round(performance.now()-start)};
 }catch(error){
  const code=error?.cause?.code;
  const category=error?.name==='TimeoutError'?'timeout':error?.name==='AbortError'?'aborted':['ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH'].includes(code)?code:'other';
  return {ready:false,phase,...(status===undefined?{}:{status}),category,elapsedMs:Math.round(performance.now()-start)};
 }
}
