import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,appendFileSync,writeFileSync,readFileSync,readdirSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
export function startDatabase(bin,app,{listen=false}={}) {
 const root=realpathSync(mkdtempSync('/tmp/nt-normativity-'));mkdirSync(join(root,'socket'),{mode:0o700});
 const command=(name,args,input)=>execFileSync(join(bin,name),args,{input,env:{PATH:'/usr/bin:/bin',LC_ALL:'C'},encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
 command('initdb',['-n','-D',root+'/data','-U','postgres','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8']);
 appendFileSync(root+'/data/postgresql.conf',`\nlisten_addresses='${listen?'127.0.0.1':''}'\nport=15439\nunix_socket_directories='${root}/socket'\n`);
 if(listen){assert.equal(process.env.OFFLINE_NAMESPACE,'1');writeFileSync(root+'/data/pg_hba.conf','host synthetic postgres 127.0.0.1/32 trust\n'+readFileSync(root+'/data/pg_hba.conf','utf8'));}
 let running=false;
 const start=()=>{command('pg_ctl',['-D',root+'/data','-l',root+'/server.log','-w','start']);running=true;};
 const stop=()=>{if(running){command('pg_ctl',['-D',root+'/data','-m','fast','-w','stop']);running=false;}};
 const raw=(sql,database='synthetic')=>command('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-h',root+'/socket','-p','15439','-U','postgres','-d',database],`set statement_timeout=10000;${sql}`).trim();
 try{start();assert.equal(raw('show data_directory;','postgres'),root+'/data');raw('create database synthetic;','postgres');
  const migrations=app+'/server/prisma/migrations';
  for(const dir of readdirSync(migrations).filter(x=>/^\d/.test(x)).sort())raw(readFileSync(join(migrations,dir,'migration.sql'),'utf8'));
 }catch(e){stop();throw e;}
 const sql=async(text,values=[])=>{
  assert.ok(values.every(v=>typeof v==='string'&&v.startsWith('synthetic')||typeof v==='string'&&/^[a-z0-9_-]{1,100}$/i.test(v)));
  const query=text.replace(/\$(\d+)/g,(_,n)=>{assert.ok(Number(n)<=values.length);return "'"+values[Number(n)-1].replaceAll("'","''")+"'";});
  return /^\s*select\b/i.test(query)?JSON.parse(raw(`select coalesce(json_agg(q),'[]') from (${query}) q;`)):(raw(query),[]);
 };
 return {root,sql,raw,stop,restart(){stop();start();}};
}
