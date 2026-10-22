import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [root]=process.argv.slice(2);
const pkg=JSON.parse(await readFile(root+'/tools/package.json'));
const bytes=await readFile(root+'/tools/package-lock.json'),lock=JSON.parse(bytes);
for(const [name,version] of Object.entries(pkg.dependencies))assert.equal(lock.packages['node_modules/'+name].version,version);
const report={directPins:pkg.dependencies,lockSha256:createHash('sha256').update(bytes).digest('hex')};
await writeFile(root+'/dependencies.json',JSON.stringify(report));console.log(report);
