import test from 'node:test';
import assert from 'node:assert/strict';
import {packagingSchema} from './prisma-schema.mjs';
test('preserves datasource and models byte-for-byte',()=>{
 const rest='\n\ndatasource db {\n provider = "postgresql"\n url = env("DATABASE_URL")\n directUrl = env("DIRECT_URL")\n}\nmodel Example {\n id Int @id\n}\n';
 const s=packagingSchema('generator client {\n provider = "prisma-client-js"\n}'+rest);
 assert.ok(s.endsWith(rest));assert.ok(s.includes('output = "../node_modules/.prisma/client"'));
});
test('rejects customized or missing generators',()=>{
 for(const s of ['', 'generator client { provider = "other" }','generator client { provider = "prisma-client-js" output = "custom" }'])assert.throws(()=>packagingSchema(s));
});
