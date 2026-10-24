import test from 'node:test';import assert from 'node:assert/strict';import {dispatchScheduledEmail} from './scheduler.mjs';
const base={project:'website2',nextRun:'2026-10-24T10:00:00Z',secret:'synthetic-cron-secret',url:'https://synthetic.invalid/.netlify/functions/email-background'};
test('scheduler awaits acceptance and preserves signed identity across delivery retries',async()=>{
 const requests=[];const transport=async(url,options)=>{requests.push(options);return new Response(null,{status:202});};
 assert.deepEqual(await dispatchScheduledEmail({...base,transport}),{accepted:true,completed:false});await dispatchScheduledEmail({...base,transport});
 assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['x-email-dispatch-signature'],requests[1].headers['x-email-dispatch-signature']);assert.equal(requests[0].redirect,'error');assert.ok(requests[0].signal);
});
test('scheduler surfaces transport and rejection failures without claiming completion',async()=>{
 await assert.rejects(dispatchScheduledEmail({...base,transport:async()=>new Response(null,{status:500})}),/not accepted/);
 await assert.rejects(dispatchScheduledEmail({...base,transport:async()=>{throw Error('timeout');}}),/timeout/);
});
test('HTTP and unexpected paths fail before sending',async()=>{
 let sent=0;for(const url of ['http://synthetic.invalid/.netlify/functions/email-background','https://synthetic.invalid/other','https://synthetic.invalid/.netlify/functions/email-background?secret=x'])await assert.rejects(dispatchScheduledEmail({...base,url,transport:async()=>{sent++;}}));assert.equal(sent,0);
});
