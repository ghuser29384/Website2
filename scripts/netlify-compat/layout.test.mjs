import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
test('RLHF exposes only the intended function entry file',async()=>{
 const root=await mkdtemp(tmpdir()+'/netlify-layout-');
 await mkdir(root+'/app');await mkdir(root+'/tools');
 await symlink(fileURLToPath(new URL('./',import.meta.url)),root+'/harness');
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./setup.mjs',import.meta.url)),root,'rlhf'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(await readdir(root+'/app/netlify/functions'),['public.mjs']);
 assert.deepEqual((await readdir(root+'/app/netlify/lib')).sort(),['adapter.mjs','release-handler.mjs']);
 const code=await readFile(root+'/app/netlify/functions/public.mjs','utf8');
 assert.ok(code.includes("'../lib/adapter.mjs'"));assert.ok(code.includes("'../lib/release-handler.mjs'"));
});
