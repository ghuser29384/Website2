import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {packagingSchema} from './prisma-schema.mjs';
const [root,kind]=process.argv.slice(2),app=join(root,'app'),h=join(root,'harness');
const dependencies={'netlify-cli':'27.14.1'};
const next=['canonical','legacy'].includes(kind);
if(next) dependencies['@netlify/plugin-nextjs']='5.16.4';
if(kind==='normativity')dependencies['serverless-http']='4.0.0';
await writeFile(join(root,'tools/package.json'),JSON.stringify({private:true,dependencies}));
let config='';
if(next){
 for(const f of ['next.config.ts','proxy.ts']){
  execFileSync('git',['apply','--check',join(h,kind==='legacy'?'candidate/moraltrade-legacy':'candidate/moraltrade',f+'.patch')],{cwd:app});
  execFileSync('git',['apply',join(h,kind==='legacy'?'candidate/moraltrade-legacy':'candidate/moraltrade',f+'.patch')],{cwd:app});
 }
 config='[build]\ncommand = "npm run build"\npublish = ".next"\n[[plugins]]\npackage = "@netlify/plugin-nextjs"\n';
 // Preserve exact locked app versions; tools are separately resolved.
 const lock=JSON.parse(await readFile(join(app,'package-lock.json')));
 assert.ok(lock.packages['node_modules/next'].version);
}else{
 await mkdir(join(app,'netlify/functions'),{recursive:true});
 await mkdir(join(app,'synthetic-publish'),{recursive:true});
 config='[build]\npublish = "synthetic-publish"\n[functions]\ndirectory = "netlify/functions"\nnode_bundler = "esbuild"\n';
 if(kind==='normativity'){
  await mkdir(join(app,'.netlify-schema'),{recursive:true});
  await writeFile(join(app,'.netlify-schema/schema.prisma'),packagingSchema(await readFile(join(app,'server/prisma/schema.prisma'),'utf8')));
  await copyFile(join(h,'candidate/normativity/api.ts.template'),join(app,'netlify/functions/api.ts'));
  await copyFile(join(h,'candidate/normativity/scheduled-audit.ts.template'),join(app,'netlify/functions/scheduled-audit.ts'));
  config+='external_node_modules = ["@prisma/client", "prisma"]\nincluded_files = ["node_modules/.prisma/**", "server/node_modules/.prisma/**", "server/prisma/**", "server/src/**"]\n[[redirects]]\nfrom = "/api/*"\nto = "/.netlify/functions/api/:splat"\nstatus = 200\nforce = true\n';
 }else{
  await writeFile(join(app,'package.json'),'{"private":true,"type":"module"}');
  await mkdir(join(app,'netlify/lib'),{recursive:true});
  await copyFile(join(h,'candidate/rlhf/adapter.mjs'),join(app,'netlify/lib/adapter.mjs'));
  await copyFile(join(h,'candidate/rlhf/public.mjs.template'),join(app,'netlify/functions/public.mjs'));
  await copyFile(join(h,'cloudflare-compatibility-20261019/source/rlhf/index.mjs'),join(app,'netlify/lib/release-handler.mjs'));
 }
}
await writeFile(join(app,'netlify.toml'),config);
