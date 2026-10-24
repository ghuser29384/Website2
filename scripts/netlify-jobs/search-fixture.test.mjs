import test from 'node:test';import assert from 'node:assert/strict';import {createSearchFixture} from './search/fixture.mjs';
const req=(path,method='GET')=>new Request('http://127.0.0.1:15433'+path,{method});
test('bounded synthetic offers retain projection, filter, count and page',async()=>{
 const f=createSearchFixture({count:72});const r=await f.handle(req('/rest/v1/offers?select=id,mode&mode=eq.pledge&order=created_at.desc,id.asc&offset=0&limit=24'));const rows=await r.json();assert.equal(rows.length,24);assert.ok(rows.every(x=>x.mode==='pledge'));assert.deepEqual(Object.keys(rows[0]),['id','mode']);assert.equal(r.headers.get('content-range'),'0-23/24');assert.equal(f.requests(),1);
});
test('rejects writes, external requests and unsupported query behavior',async()=>{
 const f=createSearchFixture();await assert.rejects(f.handle(req('/rest/v1/offers','POST')));await assert.rejects(f.handle(new Request('https://production.invalid/rest/v1/offers')));await assert.rejects(f.handle(req('/rest/v1/profiles')));await assert.rejects(f.handle(req('/rest/v1/offers?bad=eq.x')));await assert.rejects(f.handle(req('/rest/v1/offers?select=private_unknown')));
 assert.throws(()=>createSearchFixture({count:2001}));
});
test('empty data and signed-out identity remain explicit',async()=>{
 const f=createSearchFixture({count:0});assert.deepEqual(await(await f.handle(req('/rest/v1/offers'))).json(),[]);assert.equal((await f.handle(req('/auth/v1/user'))).status,401);
});
