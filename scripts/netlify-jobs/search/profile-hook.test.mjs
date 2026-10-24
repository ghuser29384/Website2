import {test} from 'node:test';import assert from 'node:assert/strict';import {summarize} from './profile-hook.mjs';
test('CPU summary attributes sample deltas and retains no source contents',()=>{
 const r=summarize({startTime:0,endTime:30,nodes:[{id:1,callFrame:{functionName:'score',url:'file:///synthetic/app.js',lineNumber:7}}],samples:[1,1],timeDeltas:[10,20]});
 assert.equal(r.top[0].selfUs,30);assert.equal(r.samples,2);assert.equal(r.top[0].functionName,'score');
});
