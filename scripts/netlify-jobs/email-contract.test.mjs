import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const route=process.env.NETLIFY_JOB_APP?pathToFileURL(process.env.NETLIFY_JOB_APP+'/src/app/api/jobs/email/route.ts').href:new URL('../../src/app/api/jobs/email/route.ts',import.meta.url).href;
const state={};
globalThis.__emailContract=state;
const stubs={
 'next/server':'export const NextResponse={json:Response.json};',
 '@/lib/cron':'export const isCronRequestAuthorized=()=>globalThis.__emailContract.authorized;',
 '@/lib/email':'export const hasEmailEnv=()=>globalThis.__emailContract.configured;export const sendEmail=(x)=>globalThis.__emailContract.send(x);',
 '@/lib/moral-trade/email-copy':'export const evaluateMoralTradeEmailOutboxSafety=(x)=>globalThis.__emailContract.safety(x);',
 '@/lib/supabase/server':'export const createServiceClient=()=>({rpc:(...x)=>globalThis.__emailContract.rpc(...x)});'
};
registerHooks({resolve(s,c,next){return s in stubs?{url:'fixture:'+s,shortCircuit:true}:next(s,c);},load(u,c,next){if(u.startsWith('fixture:'))return {format:'module',source:stubs[u.slice(8)],shortCircuit:true};if(u===route)return {format:'module',source:stripTypeScriptTypes(readFileSync(new URL(u),'utf8')),shortCircuit:true};return next(u,c);}});
const {GET,POST}=await import(route);
function setup({failSend=false,claimError=false}={}){
 const calls=[],sent=[];state.authorized=true;state.configured=true;state.safety=()=>({status:"allow"});
 state.send=async x=>{sent.push(x);if(failSend)throw Error('synthetic send failure');return {id:'synthetic-provider-id'};};
 state.rpc=async(name,args)=>{calls.push({name,args});if(name==='claim_email_outbox_v2')return claimError?{error:{message:'synthetic database failure'}}:{data:Array.from({length:args.p_limit},(_,i)=>({id:String(i),recipient_email:'test@example.invalid',subject:'fixture',body:'fixture',provider:'fixture',idempotency_key:null}))};return {data:name==='retry_email_outbox_v2'?'pending':true};};
 return {calls,sent};
}
const request=()=>new Request('https://fixture.invalid/api/jobs/email');
test('real handler retains 25-message claim, idempotency and completion lease',async()=>{
 const {calls,sent}=setup();const r=await GET(request());assert.equal(r.status,200);assert.deepEqual(await r.json(),{claimed:25,failed:0,retrying:0,sent:25,suppressed:0});assert.equal(sent.length,25);assert.equal(calls[0].args.p_limit,25);
 for(let i=0;i<25;i++){assert.equal(sent[i].idempotencyKey,'email-outbox:'+i);assert.equal(calls[i+1].name,'complete_email_outbox_v2');assert.equal(calls[i+1].args.p_worker_token,calls[0].args.p_worker_token);}
});
test('failed provider attempts preserve retry transitions',async()=>{const {calls}=setup({failSend:true});assert.equal((await (await GET(request())).json()).retrying,25);assert.equal(calls.filter(x=>x.name==='retry_email_outbox_v2').length,25);});
test('claim error sends nothing',async()=>{const {sent}=setup({claimError:true});assert.equal((await GET(request())).status,500);assert.equal(sent.length,0);});
test('unauthorized request touches neither provider nor database',async()=>{const {calls,sent}=setup();state.authorized=false;assert.equal((await GET(request())).status,401);assert.equal(calls.length+sent.length,0);});

test('unconfigured provider returns 503 without claiming messages',async()=>{const {calls,sent}=setup();state.configured=false;assert.equal((await GET(request())).status,503);assert.equal(calls.length+sent.length,0);});
test('suppression keeps all 25 messages away from provider and carries lease',async()=>{const {calls,sent}=setup();state.safety=()=>({status:'suppress',blockers:['synthetic blocker']});const body=await (await POST(request())).json();assert.deepEqual(body,{claimed:25,failed:0,retrying:0,sent:0,suppressed:25});assert.equal(sent.length,0);for(const c of calls.slice(1)){assert.equal(c.name,'suppress_email_outbox_v2');assert.equal(c.args.p_worker_token,calls[0].args.p_worker_token);assert.equal(c.args.p_reason,'synthetic blocker');}});
test('failed suppression is reported without sending',async()=>{const {sent}=setup();state.safety=()=>({status:'suppress',blockers:['blocked']});const rpc=state.rpc;state.rpc=(n,a)=>n==='suppress_email_outbox_v2'?{data:false}:rpc(n,a);const b=await (await GET(request())).json();assert.equal(b.failed,25);assert.equal(b.suppressed,0);assert.equal(sent.length,0);});
test('completion lease loss retries with original worker token',async()=>{const {calls,sent}=setup();const rpc=state.rpc;state.rpc=(n,a)=>n==='complete_email_outbox_v2'?{data:false}:rpc(n,a);const b=await (await GET(request())).json();assert.equal(b.retrying,25);assert.equal(b.sent,0);assert.equal(sent.length,25);const retries=calls.filter(c=>c.name==='retry_email_outbox_v2');assert.equal(retries.length,25);for(const c of retries)assert.equal(c.args.p_worker_token,calls[0].args.p_worker_token);});
test('terminal retry failures remain failures',async()=>{setup({failSend:true});const rpc=state.rpc;state.rpc=(n,a)=>n==='retry_email_outbox_v2'?{data:'failed'}:rpc(n,a);const b=await (await GET(request())).json();assert.equal(b.failed,25);assert.equal(b.retrying,0);});
test('stored idempotency keys are retained',async()=>{const {sent}=setup();const rpc=state.rpc;state.rpc=async(n,a)=>{const r=await rpc(n,a);if(n==='claim_email_outbox_v2')r.data.forEach((x,i)=>x.idempotency_key='existing-'+i);return r;};await GET(request());assert.deepEqual(sent.map(x=>x.idempotencyKey),Array.from({length:25},(_,i)=>'existing-'+i));});
test('serial service waits expose the scheduled-duration budget',async()=>{
 setup();let elapsedMs=0;const rpc=state.rpc,send=state.send;
 state.rpc=async(...args)=>{elapsedMs+=400;return rpc(...args);};
 state.send=async(...args)=>{elapsedMs+=800;return send(...args);};
 const result=await (await GET(request())).json();
 assert.equal(result.sent,25);assert.equal(elapsedMs,30400);assert.ok(elapsedMs>30000);
 // Illustrative virtual service waits, not measured production or hosted duration.
});
