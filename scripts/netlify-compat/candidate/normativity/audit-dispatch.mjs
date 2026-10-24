// Candidate transport validation only. Durable admission is required separately.
import {createHmac,timingSafeEqual} from 'node:crypto';
const validate=(value)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='job,nextRun,version')throw Error('Invalid dispatch');
 if(value.version!==1||value.job!=='normativity-audit')throw Error('Invalid dispatch');
 if(typeof value.nextRun!=='string'||!/^\d{4}-\d{2}-\d{2}T08:00:00\.000Z$/.test(value.nextRun)||new Date(value.nextRun).toISOString()!==value.nextRun)throw Error('Invalid scheduled identity');
 return JSON.stringify({version:1,job:value.job,nextRun:value.nextRun});
};
const key=secret=>{if(typeof secret!=='string'||secret.length<16)throw Error('Missing dispatch secret');return secret;};
export function createDispatch(nextRun,secret){
 if(typeof nextRun!=='string'||!/^\d{4}-\d{2}-\d{2}T08:00:00(?:\.000)?Z$/.test(nextRun))throw Error('Invalid next_run');
 const canonical=nextRun.replace(/(?<!\.000)Z$/,'.000Z');
 if(new Date(nextRun).toISOString()!==canonical)throw Error('Invalid calendar date');
 const payload={version:1,job:'normativity-audit',nextRun:canonical};
 const body=validate(payload);return {body,signature:createHmac('sha256',key(secret)).update(body).digest('hex')};
}
export function verifyDispatch(body,signature,secret){
 if(typeof body!=='string'||Buffer.byteLength(body)>512||typeof signature!=='string'||!/^[0-9a-f]{64}$/.test(signature))throw Error('Invalid dispatch envelope');
 const expected=createHmac('sha256',key(secret)).update(body).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw Error('Invalid dispatch signature');
 const payload=JSON.parse(body);validate(payload);return payload;
}
