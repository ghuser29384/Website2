// Read-only diagnostic: exactly two GET operations, no deployment capability.
import {verifyDisposableTarget,SITE_ID,UploadValidationError} from './upload-plan.mjs';
export async function targetPreflight(api){
 try{
  const site=await api('GET',`https://api.netlify.com/api/v1/sites/${SITE_ID}`);
  const deploys=await api('GET',`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys?per_page=100`);
  verifyDisposableTarget({site,deploys});
  return {status:'TARGET_CHECKS_PASS',remoteChanges:false};
 }catch(error){return {status:'TARGET_CHECKS_STOP',check:error instanceof UploadValidationError?error.code:'read-failed',remoteChanges:false};}
}
