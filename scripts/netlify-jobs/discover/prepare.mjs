import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
const app=process.argv[2];assert.ok(app);const source=join(app,'src/lib/app-data.ts');const hash=async()=>createHash('sha256').update(await readFile(source)).digest('hex');
assert.equal(await hash(),'60d762bd4ff1f3bb53c1d50379953e3bb35c0b3acbd66cb4108a5b96b50b6d9f','Pinned source drift');
const patch=fileURLToPath(new URL('./directory-reuse.patch',import.meta.url));execFileSync('git',['apply','--check',patch],{cwd:app});execFileSync('git',['apply',patch],{cwd:app});
assert.equal(await hash(),'698752c7d41af087adcdfe4c02eb0aa99e7c685214513aa8a61855ad75ff86e2','Candidate drift');
