import {FIXTURE_TOKEN} from './http-fixture.mjs';
export function providerRouting(originalFetch,origin){
 const target=new URL(origin);
 if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw Error('Fixture must be loopback only');
 return async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(url.href==='https://api.resend.com/emails'){
   if(request.headers.get('authorization')!==`Bearer ${FIXTURE_TOKEN}`)throw Error('Only synthetic provider credentials permitted');
   return originalFetch(new Request(new URL('/synthetic-provider/emails',target),request));
  }
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('External network forbidden in synthetic runtime');
  return originalFetch(request);
 };
}
