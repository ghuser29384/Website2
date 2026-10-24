// Internal coordinator. Caller must verify the signed envelope before invoking.
// Repository adapter supplies actual deadline, processor and database transport.
export async function executeEmailDispatch({admit,process,finish}) {
 const admission=await admit();
 if(admission?.admitted===false){
  if(typeof admission.finished!=='boolean')throw Error('Invalid duplicate state');
  return {duplicate:true,finished:admission.finished,result:admission.result};
 }
 if(admission?.admitted!==true||!Array.isArray(admission.emails)||admission.emails.length>25)throw Error('Invalid admission');
 const response=await process(admission.emails);
 if(!response.ok)throw Error(`Email processor failed (${response.status})`);
 const result=await response.json();
 if(await finish(result)!==true)throw Error('Email outcome was not durably recorded');
 return {duplicate:false,finished:true,result};
}
