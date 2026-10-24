import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyStatic({root,request}) {
 const files=JSON.parse(await readFile(join(root,'harness/normativity-public-files.json'),'utf8'));
 let passed=0;
 for(const file of files){
  const response=await request('/'+file.split('/').map(encodeURIComponent).join('/'));
  assert.equal(response.status,200,'public asset unavailable: '+file);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(join(root,'app',file)),'public asset changed: '+file);
  passed++;
 }
 for(const path of ['/server/src/db/prisma.ts','/package.json','/package-lock.json','/.env','/.git/config','/node_modules/prisma/package.json']){
  const response=await request(path);assert.equal(response.status,404,'non-public file exposed: '+path);await response.arrayBuffer();
 }
 return {status:'PASS_LOCAL_PUBLIC_FILE_PARITY',files:passed,nonPublicPathsRejected:6,renderedInteractionsVerified:false};
}
