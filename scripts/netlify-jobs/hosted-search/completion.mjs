import assert from 'node:assert/strict';
export function validateCompletion(text){
 const records=text.split('\n').filter(line=>line.startsWith('{')).map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(x=>x?.status==='COMPILED_SYNTHETIC_TRANSPORT_PASS');
 assert.equal(records.length,1,'Missing or duplicate compiled transport completion');
 const record=records[0];assert.equal(record.count,400);assert.ok(Number.isInteger(record.fixtureRequests)&&record.fixtureRequests>0&&record.fixtureRequests<=200);assert.ok(Number.isInteger(record.responseBytes)&&record.responseBytes>0&&record.responseBytes<=8*1024*1024);assert.equal(record.hostedMeasurement,false);assert.equal(record.provesFreeFit,false);return record;
}
