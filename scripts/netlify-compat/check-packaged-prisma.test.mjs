import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkPackagedPrisma} from './check-packaged-prisma.mjs';
function fixture(version='6.19.3',generated=true){
 const dir=mkdtempSync(join(tmpdir(),'prisma-package-fixture-'));
 const client=join(dir,'node_modules/@prisma/client');mkdirSync(client,{recursive:true});
 writeFileSync(join(client,'package.json'),JSON.stringify({version}));
 writeFileSync(join(client,'default.js'),"module.exports=require('.prisma/client/default');");
 if(generated){const g=join(dir,'node_modules/.prisma/client');mkdirSync(g,{recursive:true});writeFileSync(join(g,'default.js'),`exports.PrismaClient=function(){};exports.Prisma={prismaVersion:{client:'${version}'}};`);}
 return dir;
}
test('accepts matching self-contained packaged client',()=>assert.equal(checkPackagedPrisma(fixture()).status,'PASS'));
test('rejects missing generated client',()=>assert.throws(()=>checkPackagedPrisma(fixture('6.19.3',false))));
test('rejects wrong packaged runtime version',()=>assert.throws(()=>checkPackagedPrisma(fixture('6.19.0'))));
