import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [root]=process.argv.slice(2);
const pkg=JSON.parse(await readFile(root+'/tools/package.json'));
const bytes=await readFile(root+'/tools/package-lock.json'),lock=JSON.parse(bytes);
for(const [name,version] of Object.entries(pkg.dependencies))assert.equal(lock.packages['node_modules/'+name].version,version);
// Reject transitive version drift before preparing or executing cached tools.
for(const [name,version] of Object.entries(pkg.overrides??{})){
 const matches=Object.entries(lock.packages).filter(([path])=>path.endsWith('node_modules/'+name));
 assert.ok(matches.length>0,'Missing overridden dependency: '+name);
 for(const [path,entry] of matches)assert.equal(entry.version,version,'Unexpected version: '+path);
}
const runtimeDependencies=Object.fromEntries(Object.entries(lock.packages).filter(([p])=>/node_modules\/@netlify\/(edge-bundler|edge-functions-bootstrap|build|dev)$/.test(p)).map(([p,v])=>[p,{version:v.version,integrity:v.integrity}]));
const report={runtimeDependencies,directPins:pkg.dependencies,lockSha256:createHash('sha256').update(bytes).digest('hex')};
await writeFile(root+'/dependencies.json',JSON.stringify(report));console.log(report);
