// Only for the disposable synthetic measurement process. No values are logged.
const values=Object.freeze({MORAL_TRADE_DISABLE_SUPABASE:'false',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:15433',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-only',NEXT_PUBLIC_SITE_URL:'https://synthetic.invalid'});
export function prepareSyntheticEnvironment(env){
 // Reject unexpected provider configuration rather than silently retaining or copying it.
 for(const[key,value]of Object.entries(env)){
  if(!value)continue;
  if(/SUPABASE|STRIPE|RESEND|DATABASE_URL|SMTP|CRON_SECRET/.test(key)){
   if(Object.hasOwn(values,key)&&value===values[key])continue;
   if(['SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY'].includes(key)&&value==='synthetic-netlify-email-test-only')continue;
   if(key==='CRON_SECRET'&&value==='synthetic-cron-secret')continue;
   if(key==='MORAL_TRADE_DISABLE_SUPABASE'&&value==='false')continue;
   throw Error('Unexpected provider configuration in synthetic runtime');
  }
 }
 Object.assign(env,values);
 return {synthetic:true};
}
