import assert from 'node:assert/strict';
export function validateCompletion(text){
 const records=text.split('\n').filter(line=>line.startsWith('{')).map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(x=>x?.status==='COMPILED_SYNTHETIC_TRANSPORT_PASS');
 assert.equal(records.length,1,'Missing or duplicate compiled transport completion');
 const record=records[0];assert.equal(record.count,400);assert.ok(Number.isInteger(record.fixtureRequests)&&record.fixtureRequests>0&&record.fixtureRequests<=200);assert.ok(Number.isInteger(record.responseBytes)&&record.responseBytes>0&&record.responseBytes<=8*1024*1024);assert.equal(record.hostedMeasurement,false);assert.equal(record.provesFreeFit,false);assert.equal(record.cases?.length,16,'Full staged matrix required');
 const expected=new Set([400,2000].flatMap(count=>['volunter','unmatchedxyz'].flatMap(search=>['best_match','lowest_cost'].flatMap(sort=>[0,1].map(repetition=>JSON.stringify([count,search,sort,repetition]))))));
 for(const c of record.cases){assert.ok(expected.delete(JSON.stringify([c.count,c.search,c.sort,c.repetition])));assert.equal(c.expected,c.search==='volunter'?c.count:0);assert.ok(c.fixtureRequests>0&&c.fixtureRequests<=200);assert.ok(c.responseBytes>0&&c.responseBytes<=8*1024*1024);}
 assert.equal(expected.size,0);assert.ok(record.staging?.files>0&&record.staging.bytes>0);
 assert.ok(typeof record.entry==='string'&&record.entry.endsWith('/synthetic-search.mjs'),'Bundled wrapper must be exercised');
 assert.ok(record.packaging?.entryBytes>0&&record.packaging.bundledInputs>0);assert.equal(record.packaging.hostedMeasurement,false);
 const pkg=record.providerPackage;assert.equal(pkg?.functions,1);assert.equal(pkg.manifestVerified,true);assert.equal(pkg.hostedMeasurement,false);
 assert.ok(Number.isInteger(pkg.archiveBytes)&&pkg.archiveBytes>0&&pkg.archiveBytes<50*1024*1024);
 assert.match(pkg.archiveSha256,/^[a-f0-9]{64}$/);assert.equal(record.entry,pkg.extractedEntry);assert.ok(record.entry.startsWith('packaged-synthetic-search/verified-runtime/'));
 const integrity=pkg.integrity;assert.equal(integrity.extracted,true);assert.equal(integrity?.integrityVerified,true);
 assert.equal(integrity.verifiedRuntimeFiles,record.staging.files+1,'Every staged runtime file and wrapper must survive packaging');
 assert.ok(integrity.files>=integrity.verifiedRuntimeFiles&&integrity.uncompressedBytes>0&&integrity.uncompressedBytes<=250*1024*1024);
 return record;
}
