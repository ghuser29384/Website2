import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createFixture,FIXTURE_TOKEN} from '../http-fixture.mjs';import {startFixtureServer} from '../fixture-server.mjs';import {seedEmails} from '../postgres.mjs';import {signEmailDispatch} from './dispatch.mjs';
export async function runBackgroundCase({origin,pg,project}){
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 pg.query('create role anon;create role authenticated;');
 for(const f of ['guard.sql','admission.sql','api-wrappers.sql'])pg.query(readFileSync(new URL(f,import.meta.url),'utf8'));
 seedEmails(pg);
 const fixture=createFixture({executeSql:sql=>pg.query(sql,'service_role'),rpcDelayMs:400,providerDelayMs:800});
 const server=await startFixtureServer({counts:fixture.counts,async handle(request){
  const name=new URL(request.url).pathname.split('/').pop();
  if(!['admit_email_dispatch_probe','finish_email_dispatch_probe'].includes(name))return fixture.handle(request);
  assert.equal(request.headers.get('authorization'),`Bearer ${FIXTURE_TOKEN}`);assert.equal(request.method,'POST');
  const b=await request.json();assert.equal(b.p_slot,'2026-10-24T10:00:00.000Z');assert.match(b.p_token,/^[0-9a-f-]{36}$/);
  let sql=`select public.${name}('${b.p_slot}','${b.p_token}'`;
  if(name==='finish_email_dispatch_probe'){
   assert.deepEqual(Object.keys(b.p_result).sort(),['claimed','failed','retrying','sent','suppressed']);
   for(const n of Object.values(b.p_result))assert.ok(Number.isInteger(n)&&n>=0&&n<=25);
   sql+=`,'${JSON.stringify(b.p_result)}'::jsonb`;
  }
  const value=pg.query(sql+');','service_role');return Response.json(name==='admit_email_dispatch_probe'?JSON.parse(value):value==='t');
 }},{port:15433});
 try{
  const d=signEmailDispatch(project,'2026-10-24T10:00:00Z','synthetic-cron-secret');
  const call=()=>fetch(new URL('/.netlify/functions/email-background',origin),{method:'POST',body:d.body,headers:{'x-email-dispatch-signature':d.signature},signal:AbortSignal.timeout(10000)});
  const started=performance.now();assert.equal((await call()).status,202);
  let finished=false;
  for(let i=0;i<90;i++){if(pg.query('select count(*) from moral_trade_private.email_dispatch_probe where finished_at is not null;')==='1'){finished=true;break;}await new Promise(r=>setTimeout(r,1000));}
  assert.ok(finished,'Background never recorded completion');
  const elapsedMs=performance.now()-started;assert.ok(elapsedMs>30000,'Slow case must exceed synchronous limit');
  assert.equal(pg.query("select count(*) from public.email_outbox where status='sent' and lock_token is null and body='[private invitation link removed after delivery]';"),'25');
  assert.equal(fixture.counts().accepted,25);
  assert.equal((await call()).status,202);await new Promise(r=>setTimeout(r,2000));assert.equal(fixture.counts().accepted,25);
  return {case:'compiled-background-slow25',elapsedMs,accepted:25,finished:true,duplicateAdditionalSends:0,hostedMeasurement:false,provesFreeFit:false};
 }finally{await server.close();}
}
