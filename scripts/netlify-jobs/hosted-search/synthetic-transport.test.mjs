import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyntheticTransport} from './synthetic-transport.mjs';
import {createSearchFixture} from '../search/fixture.mjs';
const url='http://127.0.0.1:15433/rest/v1/offers?select=id';
test('concurrent requests have separate counts and counters',async()=>{
 const t=createSyntheticTransport(createSearchFixture);
 const results=await Promise.all([400,2000].map(count=>t.run(count,async fetch=>{await new Promise(r=>setTimeout(r,count===400?5:0));return (await (await fetch(url)).json()).length;})));
 assert.deepEqual(results,[{value:400,fixtureRequests:1},{value:2000,fixtureRequests:1}]);
});
test('outside context, live destinations, writes and unrelated routes fail closed',async()=>{
 const t=createSyntheticTransport(createSearchFixture);await assert.rejects(t.fetch(url));
 await t.run(400,async fetch=>{for(const bad of ['https://jnpoxvalyjtdghnperyu.supabase.co/rest/v1/offers','https://api.resend.com/emails','http://localhost:15433/rest/v1/offers','http://127.0.0.1:15433/rest/v1/users'])await assert.rejects(fetch(bad));await assert.rejects(fetch(url,{method:'POST'}));await assert.rejects(fetch(url,{headers:{cookie:'synthetic=1'}}));});
});
test('escaped async work loses access after request finishes',async()=>{
 const t=createSyntheticTransport(createSearchFixture);let release,pending;
 await t.run(400,async fetch=>{pending=new Promise(r=>release=r).then(()=>fetch(url));});
 release();await assert.rejects(pending,/No active synthetic request/);
});
test('factory receives bounded counts; errors do not leak context',async()=>{
 const t=createSyntheticTransport(createSearchFixture);await assert.rejects(t.run(401,()=>{}));await assert.rejects(t.run(400,()=>{throw Error('failure');}));await assert.rejects(t.fetch(url));
});
test('response context survives deferred stream reads and ends at completion',async()=>{
 const t=createSyntheticTransport(createSearchFixture);let late;
 const response=await t.runResponse(400,async fetch=>new Response(new ReadableStream({async pull(controller){const rows=await (await fetch(url)).json();late=()=>fetch(url);controller.enqueue(new TextEncoder().encode(String(rows.length)));controller.close();}},{highWaterMark:0}),{headers:{'x-synthetic':'yes'}}));
 assert.equal(await response.text(),'400');assert.equal(response.headers.get('x-synthetic'),'yes');await assert.rejects(late());
});
test('cancel closes synthetic context for producer work',async()=>{
 const t=createSyntheticTransport(createSearchFixture);let check;
 const response=await t.runResponse(400,async fetch=>{check=()=>fetch(url);return new Response(new ReadableStream({pull(){},cancel(){}},{highWaterMark:0}));});
 await response.body.cancel();await assert.rejects(check());
});
test('stalled handler expires and inherited async work is denied',async()=>{
 const t=createSyntheticTransport(createSearchFixture);let after;
 await assert.rejects(t.runResponse(400,fetch=>{after=new Promise(resolve=>setTimeout(()=>resolve(fetch(url).then(()=>false,()=>true)),35));return new Promise(()=>{});},{timeoutMs:10}),/deadline/);
 assert.equal(await after,true);
});
test('unread response expires and cancels its source',async()=>{
 const t=createSyntheticTransport(createSearchFixture);let cancelled=false;
 const response=await t.runResponse(400,()=>new Response(new ReadableStream({cancel(){cancelled=true;}},{highWaterMark:0})),{timeoutMs:10});
 await new Promise(r=>setTimeout(r,25));assert.equal(cancelled,true);await assert.rejects(response.text(),/deadline/);
});
test('blocked body read expires even when source cancellation never resolves',async()=>{
 const t=createSyntheticTransport(createSearchFixture);
 const response=await t.runResponse(400,()=>new Response(new ReadableStream({pull(){return new Promise(()=>{});},cancel(){return new Promise(()=>{});}},{highWaterMark:0})),{timeoutMs:10});
 await assert.rejects(response.text(),/deadline/);
});
test('oversized response rejected; timeout cannot be enlarged',async()=>{
 const t=createSyntheticTransport(createSearchFixture);await assert.rejects(t.runResponse(400,()=>new Response('x'),{timeoutMs:30001}));
 const response=await t.runResponse(400,()=>new Response(new Uint8Array(8*1024*1024+1)));await assert.rejects(response.arrayBuffer(),/byte cap/);
});
