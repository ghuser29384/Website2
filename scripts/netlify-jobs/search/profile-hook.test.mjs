import {test} from 'node:test';import assert from 'node:assert/strict';import {summarize} from './profile-hook.mjs';
test('CPU summary attributes sample deltas and retains no source contents',()=>{
 const r=summarize({startTime:0,endTime:30,nodes:[{id:1,callFrame:{functionName:'score',url:'file:///synthetic/app.js',lineNumber:7}}],samples:[1,1],timeDeltas:[10,20]});
 assert.equal(r.top[0].selfUs,30);assert.equal(r.samples,2);assert.equal(r.top[0].functionName,'score');
});
import {mkdtemp,writeFile,readdir,readFile} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
test('naturally exiting module worker saves actual function samples',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'synthetic-profile-worker-'));
 await writeFile(join(dir,'start'),'');
 await writeFile(join(dir,'worker.mjs'),'function syntheticScoring(){let total=0;const end=Date.now()+150;while(Date.now()<end)for(let i=0;i<10000;i++)total+=Math.sqrt(i);return total;} syntheticScoring();');
 const worker=new Worker(pathToFileURL(join(dir,'worker.mjs')),{execArgv:['--import',new URL('./profile-hook.mjs',import.meta.url).href],env:{PATH:process.env.PATH,NETLIFY_SYNTHETIC_PROFILE_DIR:dir,NETLIFY_EMAIL_SYNTHETIC_TEST:'1',EMAIL_FROM:'test@synthetic.invalid'}});
 await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(Error('Worker failed')));});
 const files=await readdir(dir);assert(!files.some(f=>f.startsWith('error-')));
 const name=files.find(f=>f.startsWith('summary-'));assert(name,'Missing naturally exiting worker');
 const r=JSON.parse(await readFile(join(dir,name),'utf8'));assert.equal(r.stopReason,'beforeExit');assert(r.samples>0);assert(r.top.some(frame=>frame.functionName==='syntheticScoring'));
});
