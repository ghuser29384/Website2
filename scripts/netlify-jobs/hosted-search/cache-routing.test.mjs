import test from 'node:test';import assert from 'node:assert/strict';import {cacheRouting} from './cache-routing.mjs';
test('only exact cache origin delegates and redirects cannot escape',async()=>{
 let native=0;const route=cacheRouting(()=>{throw Error('denied');},async req=>{native++;assert.equal(req.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://example.com'}});},'http://127.0.0.1:15445');
 await assert.rejects(route('https://example.com'));assert.equal(native,0);await assert.rejects(route('http://127.0.0.1:15445/blob'),/redirect/);assert.equal(native,1);await assert.rejects(route('http://127.0.0.1:15446/blob'));assert.equal(native,1);
});
