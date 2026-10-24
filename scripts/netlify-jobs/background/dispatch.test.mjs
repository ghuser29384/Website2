import test from 'node:test';import assert from 'node:assert/strict';
import {signEmailDispatch,verifyEmailDispatch} from './dispatch.mjs';
const secret='synthetic-dispatch-secret';
test('stable scheduled identity and correct project',()=>{
 const a=signEmailDispatch('website2','2026-10-24T10:00:00Z',secret);
 assert.deepEqual(a,signEmailDispatch('website2','2026-10-24T10:00:00.000Z',secret));
 assert.equal(verifyEmailDispatch(a.body,a.signature,secret,'website2').nextRun,'2026-10-24T10:00:00.000Z');
 assert.throws(()=>verifyEmailDispatch(a.body,a.signature,secret,'moraltrade-site'));
});
test('tampering, wrong secret, oversized envelope and off-schedule fail closed',()=>{
 const a=signEmailDispatch('website2','2026-10-24T10:00:00Z',secret);
 assert.throws(()=>verifyEmailDispatch(a.body.replace('24T','25T'),a.signature,secret,'website2'));
 assert.throws(()=>verifyEmailDispatch(a.body,a.signature,'different-synthetic-secret','website2'));
 assert.throws(()=>verifyEmailDispatch(' '.repeat(513),a.signature,secret,'website2'));
 assert.throws(()=>signEmailDispatch('website2','2026-10-24T08:00:00Z',secret));
 assert.throws(()=>signEmailDispatch('website2','2026-02-30T10:00:00Z',secret));
});
