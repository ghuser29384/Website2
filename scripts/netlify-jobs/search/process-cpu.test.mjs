import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseStat,cpuDelta} from './process-cpu.mjs';
test('Linux stat with spaces and parentheses maps exact counters',()=>{
 const fields=['S','10','42','0','0','0','0','0','0','0','0','12','8','3','2','0'];
 assert.deepEqual(parseStat('123 (node (worker)) '+fields.join(' ')),{group:42,ticks:25});
});
test('CPU delta uses clock resolution without treating elapsed as CPU',()=>{
 assert.equal(cpuDelta({ticks:25,processes:2},{ticks:40,processes:1},100).processGroupCpuMs,150);
 assert.throws(()=>cpuDelta({ticks:40},{ticks:25},100),/decreased/);
 assert.throws(()=>cpuDelta({ticks:0},{ticks:1},0),/clock/);
});
