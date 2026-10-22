// Deliberately report classifications only, never raw provider output or credentials.
export function classifyCliFailure(error){
 const output=String(error?.stderr??'')+'\n'+String(error?.stdout??'');
 const categories=[];
 for(const [name,pattern] of [
  ['unknown-option',/unknown option|unexpected argument/i],
  ['missing-deploy-directory',/deploy directory.*not.*found|directory.*does not exist/i],
  ['authentication',/unauthorized|authentication|invalid.*token|\b401\b/i],
  ['permission',/forbidden|permission|\b403\b/i],
  ['configuration',/configuration|config file|netlify\.toml/i],
  ['function-packaging',/bundl|function.*error|zip/i],
  ['network',/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i],
  ['empty-publish-directory',/empty.*director|no files/i],
 ])if(pattern.test(output))categories.push(name);
 return {exitCode:Number.isInteger(error?.status)?error.status:null,signal:['SIGTERM','SIGKILL'].includes(error?.signal)?error.signal:null,categories:categories.length?categories:['unclassified']};
}
