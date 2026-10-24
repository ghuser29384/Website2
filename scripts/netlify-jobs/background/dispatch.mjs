// Candidate only. Authentication does not replace durable duplicate admission.
import {createHmac,timingSafeEqual} from 'node:crypto';
const projects=new Set(['moraltrade-site','website2']);
function canonical(project,nextRun){
 if(!projects.has(project)||typeof nextRun!=='string'||!/^\d{4}-\d{2}-\d{2}T10:00:00(?:\.000)?Z$/.test(nextRun))throw Error('Invalid email dispatch');
 const date=new Date(nextRun).toISOString();
 if(date!==nextRun.replace(/(?:\.000)?Z$/,'.000Z'))throw Error('Invalid calendar date');
 return JSON.stringify({version:1,job:'email',project,nextRun:date});
}
function key(secret){if(typeof secret!=='string'||secret.length<16)throw Error('Missing dispatch secret');return secret;}
export function signEmailDispatch(project,nextRun,secret){
 const body=canonical(project,nextRun);
 return {body,signature:createHmac('sha256',key(secret)).update(body).digest('hex')};
}
export function verifyEmailDispatch(body,signature,secret,expectedProject){
 if(typeof body!=='string'||Buffer.byteLength(body)>512||typeof signature!=='string'||!/^[0-9a-f]{64}$/.test(signature))throw Error('Invalid envelope');
 const mac=createHmac('sha256',key(secret)).update(body).digest();
 if(!timingSafeEqual(mac,Buffer.from(signature,'hex')))throw Error('Invalid signature');
 const p=JSON.parse(body);
 if(!p||p.version!==1||p.job!=='email'||p.project!==expectedProject||canonical(p.project,p.nextRun)!==body)throw Error('Invalid payload');
 return p;
}
