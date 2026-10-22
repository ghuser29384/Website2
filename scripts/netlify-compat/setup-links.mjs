import {mkdir,symlink} from 'node:fs/promises';
const [root,kind]=process.argv.slice(2);
if(['canonical','legacy'].includes(kind)){
 await mkdir(root+'/app/node_modules/@netlify',{recursive:true});
 await symlink(root+'/tools/node_modules/@netlify/plugin-nextjs',root+'/app/node_modules/@netlify/plugin-nextjs');
}
if(kind==='normativity')await symlink(root+'/tools/node_modules/serverless-http',root+'/app/node_modules/serverless-http');
