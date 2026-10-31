// Explicit API transport only; never reads credentials or sends a request on import.
import assert from 'node:assert/strict';import {SITE_ID} from './upload-plan.mjs';
export function makeNetlifyApi(token,fetchImpl,observe=()=>{}){
 assert.ok(typeof token==='string'&&token.length>0);assert.equal(typeof fetchImpl,'function');
 return async(method,address,payload={})=>{
  const url=new URL(address);assert.equal(url.origin,'https://api.netlify.com');assert.ok(!url.username&&!url.password&&!url.hash);
  const site=`/api/v1/sites/${SITE_ID}`;
  const allowed=method==='GET'&&((url.pathname===site&&!url.search)||(url.pathname===site+'/deploys'&&url.search==='?per_page=100')||(/^\/api\/v1\/deploys\/[a-f0-9]{24}$/.test(url.pathname)&&!url.search))
   ||method==='POST'&&url.pathname===site+'/deploys'&&!url.search&&payload.json?.draft===true
   ||method==='PUT'&&/^\/api\/v1\/deploys\/[a-f0-9]{24}\/functions\/synthetic-search$/.test(url.pathname)&&['js','nodejs22.x'].includes(url.searchParams.get('runtime'))&&[...url.searchParams.keys()].every(k=>['runtime','invocation_mode'].includes(k))&&(!url.searchParams.has('invocation_mode')||url.searchParams.get('invocation_mode')==='stream');
  assert.ok(allowed,'Unapproved API operation');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);let reader;
  try{
   const headers={authorization:`Bearer ${token}`};let body;
   if(payload.binary){assert.ok(Buffer.isBuffer(payload.binary)&&payload.binary.length<50*1024*1024);headers['content-type']='application/octet-stream';body=payload.binary;}
   else if(payload.json){headers['content-type']='application/json';body=JSON.stringify(payload.json);}
   observe({phase:'request',method});
   const response=await fetchImpl(url,{method,headers,body,signal:controller.signal,redirect:'error'});
   observe({phase:'response',method,status:response.status});
   if(!response.ok)throw Error('Request failed');
   reader=response.body?.getReader();if(!reader)throw Error('Missing response');
   const chunks=[];let size=0;
   while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)throw Error('Metadata bound exceeded');chunks.push(Buffer.from(value));}
   return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch{throw Error('Netlify API request failed; inspect destination before any retry');}
  finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 };
}
