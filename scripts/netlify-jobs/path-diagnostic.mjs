// Fixed loopback targets only. Diagnostic observations never satisfy readiness.
export async function diagnosePaths(fetchImpl=fetch){
 const results=[];
 for(const [target,port] of [['static',3999],['proxy',8888]]){
  const start=performance.now();let phase='headers';
  try{
   const r=await fetchImpl(`http://127.0.0.1:${port}/favicon.ico`,{redirect:'manual',signal:AbortSignal.timeout(5000)});
   const result={target,status:r.status};
   if(r.status>=300&&r.status<400){
    const location=r.headers.get('location');
    try{const u=new URL(location,`http://127.0.0.1:${port}`);result.redirect=location===null?'missing':u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)?'loopback':'external';}catch{result.redirect='invalid';}
   }
   phase='body';await r.arrayBuffer();results.push({...result,complete:true,elapsedMs:Math.round(performance.now()-start)});
  }catch(e){const c=e?.cause?.code;results.push({target,complete:false,phase,category:e?.name==='TimeoutError'?'timeout':['ECONNREFUSED','ECONNRESET'].includes(c)?c:'other',elapsedMs:Math.round(performance.now()-start)});}
 }
 return results;
}
