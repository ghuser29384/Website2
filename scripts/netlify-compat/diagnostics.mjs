import {readFile} from 'node:fs/promises';
export function redactDiagnostic(value) {
 return String(value)
  .replace(/\u001b\[[0-9;]*m/g,'')
  .replace(/https?:\/\/[^\s"'<>]+/g,raw=>{try{return new URL(raw).origin+'/[path omitted]';}catch{return '[URL omitted]';}})
  .replace(/\bBearer\s+\S+/gi,'Bearer [REDACTED]')
  .replace(/\b(?:sbp_|sk_live_|sk_test_)[A-Za-z0-9_-]+/g,'[REDACTED]')
  .replace(/((?:token|password|secret|authorization|code)\s*[=:]\s*)[^\s,;]+/gi,'$1[REDACTED]');
}
export async function emulatorDiagnostic(path,exitCode,signal) {
 let text;
 try{text=await readFile(path,'utf8');}catch{text='Emulator log unavailable';}
 return {exitCode,signal,output:redactDiagnostic(text).slice(-6000)};
}
