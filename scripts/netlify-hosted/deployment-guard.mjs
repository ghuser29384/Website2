export const SITE_ID='af8b1cf6-a4dd-422b-89db-56948bc8d7e4';
export const PRIOR_DRAFT='6ad97f280b56b8ca68b01d40';
export function verifyDisposableTarget(site,deploys){
 if(site.id!==SITE_ID||site.name!=='moraltrade-rlhf-compat-20261021'||site.account_slug!=='ghuser29384'||site.published_deploy||site.repo)throw Error('Unexpected disposable project state');
 if(!Array.isArray(deploys)||deploys.length!==1)throw Error('Unexpected deployment history');
 const d=deploys[0];
 if(d.id!==PRIOR_DRAFT||d.site_id!==SITE_ID||d.context!=='deploy-preview'||d.published_at||d.state!=='ready')throw Error('Unexpected prior draft state');
}
export function draftArgs(){
 return ['deploy','--site',SITE_ID,'--no-build','--dir','public','--functions','netlify/functions','--skip-functions-cache','--json','--timeout','180'];
}
