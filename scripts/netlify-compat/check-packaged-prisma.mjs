import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync,readFileSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
export function checkPackagedPrisma(directory) {
 const root=realpathSync(directory);
 const entry=join(root,'node_modules/@prisma/client/default.js');
 const require=createRequire(entry);
 const generated=realpathSync(require.resolve('.prisma/client/default'));
 const rel=relative(root,generated);
 assert(!rel.startsWith('..')&&!isAbsolute(rel),'Generated client escaped packaged function');
 const pkg=JSON.parse(readFileSync(join(root,'node_modules/@prisma/client/package.json'),'utf8'));
 assert.equal(pkg.version,'6.19.3');
 const loaded=require(entry);
 assert.equal(typeof loaded.PrismaClient,'function');
 assert.equal(loaded.Prisma.prismaVersion.client,pkg.version);
 return {status:'PASS',version:pkg.version,generated:rel};
}
