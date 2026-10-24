import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createFixture,FIXTURE_TOKEN} from '../http-fixture.mjs';import {startFixtureServer} from '../fixture-server.mjs';import {seedEmails} from '../postgres.mjs';import {signEmailDispatch} from './dispatch.mjs';
async function runOne({origin,pg,project,scenario}){
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 seedEmails(pg,scenario.attempt);
 const fixture=createFixture({executeSql:sql=>pg.query(sql,'service_role'),rpcDelayMs:scenario.rpcDelayMs,providerDelayMs:scenario.providerDelayMs,failProvider:scenario.failProvider});
 const server=await startFixtureServer({counts:fixture.counts,async handle(request){
  const name=new URL(request.url).pathname.split('/').pop();
  if(!['admit_email_dispatch_probe','finish_email_dispatch_probe'].includes(name))return fixture.handle(request);
  assert.equal(request.headers.get('authorization'),`Bearer ${FIXTURE_TOKEN}`);assert.equal(request.method,'POST');
  const b=await request.json();assert.equal(b.p_slot,scenario.slot);assert.match(b.p_token,/^[0-9a-f-]{36}$/);
  let sql=`select public.${name}('${b.p_slot}','${b.p_token}'`;
  if(name==='finish_email_dispatch_probe'){
   assert.deepEqual(Object.keys(b.p_result).sort(),['claimed','failed','retrying','sent','suppressed']);
   for(const n of Object.values(b.p_result))assert.ok(Number.isInteger(n)&&n>=0&&n<=25);
   sql+=`,'${JSON.stringify(b.p_result)}'::jsonb`;
  }
  const value=pg.query(sql+');','service_role');return Response.json(name==='admit_email_dispatch_probe'?JSON.parse(value):value==='t');
 }},{port:15433});
 try{
  const d=signEmailDispatch(project,scenario.slot,'synthetic-cron-secret');
  const call=()=>fetch(new URL('/.netlify/functions/email-background',origin),{method:'POST',body:d.body,headers:{'x-email-dispatch-signature':d.signature},signal:AbortSignal.timeout(10000)});
  const started=performance.now();assert.equal((await call()).status,202);
  let finished=false;
  for(let i=0;i<90;i++){if(pg.query(`select count(*) from moral_trade_private.email_dispatch_probe where slot='${scenario.slot}' and finished_at is not null;`)==='1'){finished=true;break;}await new Promise(r=>setTimeout(r,1000));}
  assert.ok(finished,'Background never recorded completion');
  const elapsedMs=performance.now()-started;if(scenario.slow)assert.ok(elapsedMs>30000,'Slow case must exceed synchronous limit');
  const expectedStatus=scenario.failProvider?(scenario.attempt===4?'failed':'retry'):'sent';
  assert.equal(pg.query(`select count(*) from public.email_outbox where status='${expectedStatus}' and lock_token is null;`),'25');
  if(!scenario.failProvider)assert.equal(pg.query("select count(*) from public.email_outbox where body='[private invitation link removed after delivery]';"),'25');
  const expectedAccepted=scenario.failProvider?0:25;assert.equal(fixture.counts().accepted,expectedAccepted);
  const result=JSON.parse(pg.query(`select result from moral_trade_private.email_dispatch_probe where slot='${scenario.slot}';`));
  assert.deepEqual(result,{claimed:25,sent:expectedAccepted,failed:expectedStatus==='failed'?25:0,retrying:expectedStatus==='retry'?25:0,suppressed:0});
  assert.equal((await call()).status,202);await new Promise(r=>setTimeout(r,2000));assert.equal(fixture.counts().accepted,expectedAccepted);
  assert.equal(pg.query('select max(attempt_count) from public.email_outbox;'),String(scenario.attempt+1));
  return {case:scenario.name,elapsedMs,accepted:expectedAccepted,finished:true,result,duplicateAdditionalSends:0,hostedMeasurement:false,provesFreeFit:false};
 }finally{await server.close();}
}

export async function runBackgroundCase({origin,pg,project}){
 pg.query('create role anon;create role authenticated;');
 for(const f of ['guard.sql','admission.sql','api-wrappers.sql'])pg.query(readFileSync(new URL(f,import.meta.url),'utf8'));
 const cases=[];
 for(const scenario of [
  {name:'compiled-background-slow25',slot:'2026-10-24T10:00:00.000Z',attempt:0,failProvider:false,rpcDelayMs:400,providerDelayMs:800,slow:true},
  {name:'compiled-background-provider-retry25',slot:'2026-10-25T10:00:00.000Z',attempt:0,failProvider:true,rpcDelayMs:0,providerDelayMs:0},
  {name:'compiled-background-terminal-failure25',slot:'2026-10-26T10:00:00.000Z',attempt:4,failProvider:true,rpcDelayMs:0,providerDelayMs:0},
 ])cases.push(await runOne({origin,pg,project,scenario}));
 return {cases,hostedMeasurement:false,provesFreeFit:false};
}
