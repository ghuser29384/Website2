import {syntheticCacheContext} from './cache-context.mjs';
export function cacheRouting(fixtureFetch,nativeFetch,origin){
 syntheticCacheContext(origin); // validates exact loopback-only contract
 let requests=0;
 return async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(url.origin!==origin)return fixtureFetch(request);
  if(++requests>200)throw Error('Synthetic cache request cap');
  if(url.username||url.password)throw Error('Cache URL credentials rejected');
  const response=await nativeFetch(new Request(request,{redirect:'manual',signal:AbortSignal.timeout(30000)}));
  if(response.status>=300&&response.status<400){await response.body?.cancel();throw Error('Synthetic cache redirect rejected');}
  return response;
 };
}
