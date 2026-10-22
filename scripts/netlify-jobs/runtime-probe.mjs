import assert from 'node:assert/strict';
import {createFixture,FIXTURE_TOKEN} from './http-fixture.mjs';
import {startFixtureServer} from './fixture-server.mjs';
import {seedEmails} from './postgres.mjs';
export async function runJobCases({origin,pg}){
 const url=new URL(origin);assert.equal(url.protocol,'http:');assert.equal(url.hostname,'127.0.0.1');
 const result=[];
 const cases=[
  {name:'full-batch',attempt:0,failProvider:false,rpcDelayMs:0,providerDelayMs:0},
  {name:'provider-retry',attempt:0,failProvider:true,rpcDelayMs:0,providerDelayMs:0},
  {name:'terminal-failure',attempt:4,failProvider:true,rpcDelayMs:0,providerDelayMs:0},
  {name:'injected-moderate-latency',attempt:0,failProvider:false,rpcDelayMs:100,providerDelayMs:200},
  {name:'injected-over-budget-latency',attempt:0,failProvider:false,rpcDelayMs:400,providerDelayMs:800}
 ];
 for(const c of cases){
  seedEmails(pg,c.attempt);
  const fixture=createFixture({...c,executeSql:sql=>pg.query(sql,'service_role'),beforeAccept:({accepted})=>{assert.equal(Number(pg.query("select count(*) from public.email_outbox where status='sent' and body='[private invitation link removed after delivery]';")),accepted,'Earlier receipts must be committed before the next send');}});
  const server=await startFixtureServer(fixture,{port:15433});
  try{
   const start=performance.now();
   const r=await fetch(new URL('/api/jobs/email',url),{headers:{authorization:'Bearer synthetic-cron-secret'},signal:AbortSignal.timeout(45000)});
   const elapsedMs=performance.now()-start;assert.equal(r.status,200,c.name);
   const body=await r.json();assert.deepEqual(body,{claimed:25,failed:c.failProvider&&c.attempt===4?25:0,retrying:c.failProvider&&c.attempt===0?25:0,sent:c.failProvider?0:25,suppressed:0});
   const status=c.failProvider?(c.attempt===4?'failed':'retry'):'sent';
   assert.equal(pg.query(`select count(*) from public.email_outbox where status='${status}' and lock_token is null;`),'25');
   if(!c.failProvider)assert.equal(pg.query("select count(*) from public.email_outbox where body='[private invitation link removed after delivery]';"),'25');
   const repeat=await fetch(new URL('/api/jobs/email',url),{method:'POST',headers:{authorization:'Bearer synthetic-cron-secret'},signal:AbortSignal.timeout(10000)});
   assert.equal(repeat.status,200);assert.equal((await repeat.json()).claimed,0);
   assert.equal(fixture.counts().accepted,c.failProvider?0:25);
   result.push({name:c.name,elapsedMs,within30Seconds:elapsedMs<30000,injectedRpcDelayMs:c.rpcDelayMs,injectedProviderDelayMs:c.providerDelayMs,...body,...fixture.counts()});
  }finally{await server.close();}
 }
 return {cases:result,hostedMeasurement:false,provesFreeFit:false,latencyAssumptions:'Synthetic injected delays; not measured provider latency'};
}
