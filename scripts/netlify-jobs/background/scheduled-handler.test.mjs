import test from 'node:test';import assert from 'node:assert/strict';
import {createEmailScheduledHandler} from './scheduled-handler.mjs';
import {verifyEmailDispatch} from './dispatch.mjs';
const options={project:'website2',secret:'synthetic-cron-secret',url:'https://synthetic.invalid/.netlify/functions/email-background'};
const req=value=>new Request('https://scheduler.invalid',{method:'POST',body:JSON.stringify(value)});
test('scheduled identity reaches signed handoff unchanged on repeated delivery',async()=>{
 const seen=[];const handle=createEmailScheduledHandler({...options,transport:async(url,init)=>{seen.push({url:String(url),...init});return new Response(null,{status:202});}});
 const payload={next_run:'2026-10-25T10:00:00Z',url:'https://untrusted.invalid',project:'moraltrade-site'};
 assert.equal((await handle(req(payload))).status,204);await handle(req(payload));
 assert.equal(seen.length,2);assert.equal(seen[0].body,seen[1].body);assert.equal(seen[0].url,options.url);
 assert.deepEqual(verifyEmailDispatch(seen[0].body,seen[0].headers['x-email-dispatch-signature'],options.secret,options.project),{version:1,job:'email',project:'website2',nextRun:'2026-10-25T10:00:00.000Z'});
});
test('invalid identity and oversized payload cause no handoff',async()=>{
 let sent=0;const handle=createEmailScheduledHandler({...options,transport:async()=>{sent++;}});
 for(const value of [{},{next_run:'2026-10-25T11:00:00Z'},{next_run:'2026-02-30T10:00:00Z'},{next_run:'2026-10-25T10:00:00Z',extra:'x'.repeat(513)}])await assert.rejects(handle(req(value)));
 assert.equal(sent,0);
});
test('scheduler cannot report success when handoff fails',async()=>{
 const handle=createEmailScheduledHandler({...options,transport:async()=>new Response(null,{status:503})});
 await assert.rejects(handle(req({next_run:'2026-10-25T10:00:00Z'})),/not accepted/);
});
