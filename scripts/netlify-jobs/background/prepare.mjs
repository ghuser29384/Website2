import {execFileSync} from 'node:child_process';import {copyFile,mkdir,appendFile,readFile} from 'node:fs/promises';import {join} from 'node:path';import assert from 'node:assert/strict';
const [app,source]=process.argv.slice(2);assert.ok(app&&source);
// Patch instead of replacing existing files: fail closed on incompatible source drift.
execFileSync('git',['apply','--check',join(source,'existing-source.patch')],{cwd:app});
execFileSync('git',['apply',join(source,'existing-source.patch')],{cwd:app});
for(const name of ['email-outbox-core.ts','email-outbox-job.ts','email-execution-deadline.ts'])await copyFile(join(source,'source',name),join(app,'src/lib',name));
await mkdir(join(app,'netlify/functions'),{recursive:true});await mkdir(join(app,'netlify/lib/email-background'),{recursive:true});
for(const name of ['handler.mjs','execute.mjs','dispatch.mjs','handler.d.mts'])await copyFile(join(source,name),join(app,'netlify/lib/email-background',name));
await copyFile(join(source,'email-background.ts.template'),join(app,'netlify/functions/email-background.ts'));
const config=await readFile(join(app,'netlify.toml'),'utf8');assert.ok(!config.includes('[functions]'));
await appendFile(join(app,'netlify.toml'),'\n[functions]\ndirectory = "netlify/functions"\nnode_bundler = "esbuild"\n');
console.log('Background candidate applied with exact-context source patch; no scheduler installed');
