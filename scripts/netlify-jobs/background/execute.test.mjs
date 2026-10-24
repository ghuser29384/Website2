import test from 'node:test';import assert from 'node:assert/strict';import {executeEmailDispatch} from './execute.mjs';
test('duplicate incomplete never processes or finalizes',async()=>{
 const result=await executeEmailDispatch({admit:async()=>({admitted:false,finished:false,result:null}),process:()=>assert.fail('process'),finish:()=>assert.fail('finish')});assert.equal(result.finished,false);
});
test('empty admission executes and records aggregate',async()=>{
 const result={claimed:0,sent:0,failed:0,retrying:0,suppressed:0};let stored=0;
 const r=await executeEmailDispatch({admit:async()=>({admitted:true,emails:[]}),process:async rows=>{assert.equal(rows.length,0);return Response.json(result);},finish:async out=>{assert.deepEqual(out,result);stored++;return true;}});
 assert.equal(stored,1);assert.equal(r.finished,true);
});
test('timeout or failed processor cannot finalize; failed finalizer cannot report completion',async()=>{
 const base={admit:async()=>({admitted:true,emails:[]}),finish:()=>assert.fail('finish')};
 await assert.rejects(executeEmailDispatch({...base,process:async()=>{throw Error('deadline');}}),/deadline/);
 await assert.rejects(executeEmailDispatch({...base,process:async()=>new Response('',{status:503})}),/503/);
 await assert.rejects(executeEmailDispatch({...base,process:async()=>Response.json({}),finish:async()=>false}),/durably/);
});
