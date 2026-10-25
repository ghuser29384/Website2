// Preparation only: this module performs no network requests or deployments.
function freezeTree(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
export const plan=freezeTree({
 siteId:'af8b1cf6-a4dd-422b-89db-56948bc8d7e4',
 sourceRef:'1bd3e6a6690468649416a2ce6981007d7cc1e470',
 context:'deploy-preview',production:false,
 maxRequests:16,maxResponseBytes:8*1024*1024,maxTotalBytes:128*1024*1024,
 timeoutMs:30000,redirect:'manual',
 cases:[400,2000].flatMap(count=>['volunter','unmatchedxyz'].flatMap(search=>['best_match','lowest_cost'].flatMap(sort=>[0,1].map(repetition=>({count,search,sort,repetition,expectedMatches:search==='volunter'?count:0}))))),
 requiredEvidence:['exact draft source and target','synthetic fixture access per request','correct rendered counts','allocated memory','provider execution duration','compute credit delta with reporting lag','restored project privacy'],
 unproved:['full-cycle usage','real database latency','canonical Discover','payments and authentication','scheduled jobs','Normativity','RLHF malformed paths','production recovery']
});
export function requestURL(origin,testCase){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^([a-f0-9]{24})--moraltrade-rlhf-compat-20261021\.netlify\.app$/.test(url.hostname))throw Error('Exact immutable disposable draft required');
 if(!plan.cases.includes(testCase))throw Error('Unapproved case');
 url.pathname='/offers';url.search=new URLSearchParams({view:'live',render:'server',smart:'1',search:testCase.search,sort:testCase.sort}).toString();return url;
}
