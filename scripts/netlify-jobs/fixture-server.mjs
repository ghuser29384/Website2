import http from 'node:http';
import {once} from 'node:events';
export async function startFixtureServer(fixture,{port=0}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid fixture port');
 const server=http.createServer(async(req,res)=>{
  try{
   let size=0;const parts=[];
   for await(const part of req){size+=part.length;if(size>32768){res.writeHead(413);res.end();return;}parts.push(part);}
   const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
   const method=req.method||'GET';
   const request=new Request('http://127.0.0.1'+req.url,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(parts)}:{})});
   const result=await fixture.handle(request);
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(500);res.end();}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.maxHeadersCount=32;
 server.listen(port,'127.0.0.1');await once(server,'listening');
 return {origin:`http://127.0.0.1:${server.address().port}`,async close(){server.closeAllConnections();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
