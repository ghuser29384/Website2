import test from 'node:test';import assert from 'node:assert/strict';
import {createEmailBackgroundHandler} from './handler.mjs';import {signEmailDispatch} from './dispatch.mjs';
const secret='synthetic-dispatch-secret';
const req=()=>{const d=signEmailDispatch('website2','2026-10-24T10:00:00Z',secret);return new Request('https://synthetic.invalid',{method:'POST',headers:{'x-email-dispatch-signature':d.signature},body:d.body});};
function setup({duplicate=false,failure=false}={}){
 let clients=0,closed=0,processed=0,finished=0;const calls=[];
 const h=createEmailBackgroundHandler({project:'website2',secret,
 createDeadline:()=>({signal:new AbortController().signal,check(){},fetch,close(){closed++;}}),
 createClient:()=>{clients++;return {async rpc(name,args){calls.push({name,args});if(name==='admit_email_dispatch_probe')return {data:duplicate?{admitted:false,finished:false,result:null}:{admitted:true,emails:Array.from({length:25},(_,i)=>({id:String(i)}))},error:null};if(name==='finish_email_dispatch_probe'){finished++;return {data:true,error:null};}throw Error('unexpected');}};},
 processEmailOutbox:async(request,context)=>{processed++;assert.equal(request.headers.get('authorization'),`Bearer ${secret}`);const client=context.createClient();const a=await client.rpc('claim_email_outbox_v2',{p_limit:25,p_worker_token:context.workerToken});assert.equal(a.data.length,25);assert.throws(()=>client.rpc('claim_email_outbox_v2',{p_limit:25,p_worker_token:context.workerToken}));if(failure)throw Error('synthetic timeout');return Response.json({claimed:25,sent:25,failed:0,retrying:0,suppressed:0});}});
 return {h,state:()=>({clients,closed,processed,finished,calls})};
}
test('signed request admits once and retains owner through finalization',async()=>{
 const t=setup();assert.equal((await t.h(req())).status,200);const s=t.state();assert.equal(s.processed,1);assert.equal(s.finished,1);assert.equal(s.closed,1);assert.equal(s.calls[0].args.p_token,s.calls[1].args.p_token);
});
test('invalid envelope does not initialize database or executor',async()=>{
 const t=setup();assert.equal((await t.h(new Request('https://synthetic.invalid',{method:'POST',body:'x'.repeat(513)}))).status,401);assert.equal(t.state().clients,0);assert.equal(t.state().closed,0);
});
test('unfinished duplicate does not process or finalize',async()=>{
 const t=setup({duplicate:true});assert.deepEqual(await(await t.h(req())).json(),{duplicate:true,finished:false});assert.equal(t.state().processed,0);assert.equal(t.state().finished,0);assert.equal(t.state().closed,1);
});
test('processor failure propagates and closes execution without finalizing',async()=>{
 const t=setup({failure:true});await assert.rejects(t.h(req()),/synthetic timeout/);assert.equal(t.state().finished,0);assert.equal(t.state().closed,1);
});
