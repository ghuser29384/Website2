import {readFile,writeFile,rename,realpath,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export function launcher(root){
 assert.equal(root,resolve(root));assert.ok(!root.includes('\n'));
 return '#!/bin/sh\nset -eu\nexport DENO_DIR='+quote(join(root,'home/deno-cache'))+'\nexport DENO_NO_UPDATE_CHECK=1\nexec '+quote(join(root,'edge-tools/bin/deno-real'))+' "$@"\n';
}
export async function cacheInputs(root){
 const packageRoot=join(root,'tools/node_modules/@netlify/edge-bundler');
 assert.equal(JSON.parse(await readFile(join(packageRoot,'package.json'),'utf8')).version,'16.1.3');
 const config=join(packageRoot,'deno/config.ts');
 assert.match(await readFile(config,'utf8'),/https:\/\/edge\.netlify\.com\/bootstrap\/globals\/types\.ts/);
 return [config,...['3-2-0','2-16-0'].map(v=>`https://v${v}--edge.netlify.com/bootstrap/index-combined.ts`)];
}
export async function configure(root){
 root=await realpath(root);const bin=join(root,'edge-tools/bin/deno');
 // Preserve the verified binary. Exclusive launcher creation prevents silent reuse.
 await assert.rejects(lstat(bin+'-real'),{code:'ENOENT'});
 await rename(bin,bin+'-real');await writeFile(bin,launcher(root),{mode:0o700,flag:'wx'});
}
export async function checkCache(root,offline){
 const args=['cache','--no-config','--no-lock','--allow-import=edge.netlify.com,v3-2-0--edge.netlify.com,v2-16-0--edge.netlify.com,deno.land',...(offline?['--cached-only']:[]),...await cacheInputs(root)];
 execFileSync(join(root,'edge-tools/bin/deno'),args,{env:{PATH:'/usr/bin:/bin',HOME:join(root,'home')},stdio:'inherit',timeout:180000});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,root]=process.argv.slice(2);assert.ok(root);
 if(mode==='prepare'){assert.equal(process.env.GITHUB_ACTIONS,'true');await configure(root);await checkCache(root,false);}
 else if(mode==='offline'){assert.equal(process.env.OFFLINE_NAMESPACE,'1');await checkCache(root,true);}
 else throw Error('Unsupported cache operation');
}
