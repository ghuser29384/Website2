import {test} from 'node:test';import assert from 'node:assert/strict';import {sourceExcerpt} from './profile-locations.mjs';
test('minified columns distinguish same-line functions and bound source output',()=>{
 const source='x'.repeat(2000)+'function target(){return 1;}';
 assert(sourceExcerpt(source,0,2000).includes('function target'));
 assert(sourceExcerpt(source,0,2000).length<=800);
 assert.throws(()=>sourceExcerpt(source,1,0),/outside/);
 assert.throws(()=>sourceExcerpt(source,0,-1),/Invalid/);
});
