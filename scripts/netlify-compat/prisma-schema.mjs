import assert from 'node:assert/strict';
// Build-only copy: retain every datasource/model; generate beside packaged root runtime.
export function packagingSchema(source) {
 const pattern=/generator client\s*\{\s*provider\s*=\s*"prisma-client-js"\s*\}/g;
 const matches=[...source.matchAll(pattern)];
 assert.equal(matches.length,1,'Unexpected generator configuration; stop rather than rewrite it');
 return source.replace(pattern,'generator client {\n  provider = "prisma-client-js"\n  output = "../node_modules/.prisma/client"\n}');
}
