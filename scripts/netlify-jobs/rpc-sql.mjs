// Synthetic harness only: no connection or credentials are accepted here.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const quote=x=>"'"+x.replaceAll("'","''")+"'";
function id(x){if(typeof x!=='string'||!uuid.test(x))throw Error('Invalid synthetic UUID');return quote(x)+'::uuid';}
function text(x){if(typeof x!=='string'||x.length>16384||x.includes('\0'))throw Error('Invalid synthetic text');return quote(x);}
export function rpcSql(name,args){
 if(!args||typeof args!=='object')throw Error('Missing synthetic arguments');
 const token=id(args.p_worker_token);
 if(name==='claim_email_outbox_v2'){
  if(args.p_limit!==25)throw Error('Full 25-email batch required');
  return `select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.claim_email_outbox_v2(${token},25) e;`;
 }
 const argument={complete_email_outbox_v2:'p_provider_message_id',retry_email_outbox_v2:'p_error',suppress_email_outbox_v2:'p_reason'}[name];
 if(!Object.hasOwn({complete_email_outbox_v2:1,retry_email_outbox_v2:1,suppress_email_outbox_v2:1},name))throw Error('RPC outside synthetic allowlist');
 return `select public.${name}(${id(args.p_email_id)},${token},${text(args[argument])});`;
}
