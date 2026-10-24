import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
export async function startAuthority(directory) {
 let mode='valid',calls=0;
 const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/timestamp'){res.writeHead(404).end();return;}
  calls++;
  if(mode==='unavailable'){res.writeHead(503).end();return;}
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('oversize');chunks.push(chunk);}
   const query=join(directory,'incoming.tsq'),response=join(directory,'outgoing.tsr');
   writeFileSync(query,Buffer.concat(chunks),{mode:0o600});
   execFileSync(process.env.OPENSSL_BIN||'openssl',['ts','-reply','-config',join(directory,'rsa-sha256.cnf'),'-queryfile',query,'-out',response],{timeout:5000,stdio:'pipe'});
   let bytes=readFileSync(response);
   if(mode==='corrupt')bytes=Buffer.from('invalid synthetic proof');
   res.writeHead(200,{'content-type':'application/timestamp-reply'}).end(bytes);
  }catch{res.writeHead(500).end('synthetic authority failure');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}/timestamp`,setMode(value){if(!['valid','corrupt','unavailable'].includes(value))throw Error('unknown mode');mode=value;},get calls(){return calls;},async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
