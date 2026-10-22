import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {runStage,failureTail} from './process-stage.mjs';
const dir=await mkdtemp(join(tmpdir(),'netlify-process-stage-'));
test('captures success output and preserves failed exit code',async()=>{
 const path=join(dir,'normal.log');
 assert.deepEqual(await runStage(process.execPath,['-e','console.log("synthetic");process.exit(7)'],{logPath:path}),{code:7,signal:null,timedOut:false});
 assert.equal(await failureTail(path),'synthetic\n');
});
test('timeout kills a signal-resistant process without blocking',async()=>{
 const start=Date.now();const result=await runStage(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{logPath:join(dir,'timeout.log'),timeoutMs:200,graceMs:100});
 assert.equal(result.timedOut,true);assert.equal(result.signal,'SIGKILL');assert.ok(Date.now()-start<3000);
});
test('descendant dies even when parent exits on TERM',async()=>{
 const pidFile=join(dir,'descendant.pid');
 const code=`const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{stdio:'inherit'});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));setInterval(()=>{},1000);`;
 const result=await runStage(process.execPath,['-e',code],{logPath:join(dir,'descendant.log'),timeoutMs:300,graceMs:100});
 assert.equal(result.timedOut,true);const pid=Number(await readFile(pidFile,'utf8'));
 await new Promise(r=>setTimeout(r,100));assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
});
test('missing executable fails promptly',async()=>{await assert.rejects(runStage('/nonexistent-netlify-test-command',[],{logPath:join(dir,'missing.log')}),{code:'ENOENT'});});

test('failure diagnostics redact credentials and URL paths with bounded reads',async()=>{
 const path=join(dir,'redaction.log');await writeFile(path,'x'.repeat(10000)+'\nhttps://synthetic.invalid/private?q=test Bearer fakevalue secret=fakevalue sbp_synthetic');
 const tail=await failureTail(path,200);assert.ok(tail.length<=220);assert.ok(!tail.includes('fakevalue'));assert.ok(!tail.includes('private'));assert.ok(!tail.includes('sbp_synthetic'));assert.match(tail,/REDACTED/);
});
