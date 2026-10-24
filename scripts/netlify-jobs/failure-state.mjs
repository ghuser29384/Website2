// One aggregate read against the caller's isolated synthetic database; never emits rows.
export function captureFailureState(pg){
 try{
  const value=JSON.parse(pg.query("select json_build_object('total',count(*),'sent',count(*) filter(where status='sent'),'locked',count(*) filter(where lock_token is not null),'redacted',count(*) filter(where body='[private invitation link removed after delivery]')) from public.email_outbox;"));
  const result={};for(const k of ['total','sent','locked','redacted']){if(!Number.isSafeInteger(value[k])||value[k]<0||value[k]>25)throw Error('Invalid aggregate');result[k]=value[k];}
  return {available:true,...result};
 }catch{return {available:false};}
}
