import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {join} from 'node:path';
const app=process.argv[2];assert.ok(app);const hashes=JSON.parse(await readFile(new URL('./hashes.json',import.meta.url),'utf8'));
const verify=async stage=>{for(const [path,h]of Object.entries(hashes)){assert.equal(createHash('sha256').update(await readFile(join(app,path))).digest('hex'),h[stage],path+' '+stage+' drift');}};
await verify('before');const patch=JSON.parse(await readFile(new URL('./candidate.patch.json',import.meta.url),'utf8'));execFileSync('git',['apply','--check','-'],{cwd:app,input:patch});execFileSync('git',['apply','-'],{cwd:app,input:patch});await verify('after');
