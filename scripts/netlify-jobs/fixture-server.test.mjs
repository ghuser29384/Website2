import test from 'node:test';import assert from 'node:assert/strict';
import {startFixtureServer} from './fixture-server.mjs';import {createFixture,FIXTURE_TOKEN} from './http-fixture.mjs';import {providerRouting} from './provider-routing.mjs';
test('actual loopback HTTP path handles SQL, provider and delays without external traffic',async()=>{
 const queries=[];const fixture=createFixture({executeSql:s=>{queries.push(s);return '[]';},rpcDelayMs:10,providerDelayMs:10});
 const server=await startFixtureServer(fixture);
 try{
  const routed=providerRouting(fetch,server.origin);const start=performance.now();
  const r=await routed(server.origin+'/rest/v1/rpc/claim_email_outbox_v2',{method:'POST',headers:{authorization:`Bearer ${FIXTURE_TOKEN}`},body:JSON.stringify({p_worker_token:'20000000-0000-4000-8000-000000000001',p_limit:25})});
  assert.equal(r.status,200);assert.deepEqual(await r.json(),[]);assert.equal(queries.length,1);
  const delivery=await routed('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${FIXTURE_TOKEN}`,'idempotency-key':'synthetic-loopback'},body:JSON.stringify({from:'test@synthetic.invalid',to:'recipient@synthetic.invalid',text:'synthetic'})});
  assert.equal(delivery.status,200);assert.equal((await delivery.json()).id,'synthetic-message-1');assert.ok(performance.now()-start>=18);assert.equal(fixture.counts().accepted,1);
 }finally{await server.close();}
 await assert.rejects(fetch(server.origin));
});
test('oversized HTTP request is rejected before fixture processing',async()=>{
 let processed=0;const server=await startFixtureServer({handle(){processed++;return new Response('unexpected');}});
 try{const r=await fetch(server.origin,{method:'POST',body:'x'.repeat(32769)});assert.equal(r.status,413);assert.equal(processed,0);}finally{await server.close();}
});
