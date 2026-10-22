import {rpcSql} from './rpc-sql.mjs';
export const FIXTURE_TOKEN='synthetic-netlify-email-test-only';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function createFixture({executeSql,rpcDelayMs=0,providerDelayMs=0,failProvider=false,beforeAccept}){
 for(const ms of [rpcDelayMs,providerDelayMs])if(!Number.isInteger(ms)||ms<0||ms>1000)throw Error('Invalid fixture delay');
 let requests=0,accepted=0;const receipts=new Map();
 return {counts:()=>({requests,accepted}),async handle(request){
  if(++requests>600)return Response.json({error:'Fixture request budget exceeded'},{status:429});
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  if(request.headers.get('authorization')!==`Bearer ${FIXTURE_TOKEN}`)return Response.json({error:'Synthetic authorization required'},{status:401});
  const raw=await request.text();if(Buffer.byteLength(raw)>32768)return Response.json({error:'Fixture payload too large'},{status:413});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid fixture JSON'},{status:400});}
  const path=new URL(request.url).pathname;
  if(path==='/synthetic-provider/emails'){
   if(!body||typeof body.to!=='string'||!body.to.endsWith('@synthetic.invalid')||body.from!=='test@synthetic.invalid')return Response.json({error:'Non-synthetic destination refused'},{status:400});
   const key=request.headers.get('idempotency-key');if(!key)return Response.json({error:'Idempotency key required'},{status:400});
   await delay(providerDelayMs);
   if(failProvider)return Response.json({message:'Synthetic provider unavailable'},{status:503});
   if(!receipts.has(key)){await beforeAccept?.({accepted});receipts.set(key,{id:`synthetic-message-${++accepted}`});}
   return Response.json(receipts.get(key));
  }
  const match=/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(path);
  if(!match)return Response.json({error:'Unknown fixture route'},{status:404});
  let sql;try{sql=rpcSql(match[1],body);}catch{return Response.json({error:'Disallowed synthetic RPC'},{status:400});}
  await delay(rpcDelayMs);
  try{const value=await executeSql(sql);return Response.json(match[1]==='claim_email_outbox_v2'?JSON.parse(value):match[1]==='retry_email_outbox_v2'?value:value==='t');}
  catch{return Response.json({message:'Synthetic database failure'},{status:500});}
 }};
}
