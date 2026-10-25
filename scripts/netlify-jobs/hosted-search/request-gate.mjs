// Disposable synthetic diagnostic boundary, never an application routing change.
const required={view:'live',render:'server',smart:'1'};
export function validateSyntheticRequest(request){
 const url=new URL(request.url);
 if(request.method!=='GET'||url.username||url.password||url.pathname!=='/offers')throw Error('Synthetic route rejected');
 if(url.protocol!=='https:'||!(url.hostname==='synthetic.invalid'||/^[a-f0-9]{24}--moraltrade-rlhf-compat-20261021\.netlify\.app$/.test(url.hostname))||url.port)throw Error('Synthetic origin rejected');
 if(request.headers.has('cookie')||request.headers.has('authorization'))throw Error('Authenticated requests forbidden');
 const expected=['view','render','smart','search','sort'];
 if([...url.searchParams].length!==expected.length||expected.some(k=>url.searchParams.getAll(k).length!==1))throw Error('Synthetic query rejected');
 for(const[k,v]of Object.entries(required))if(url.searchParams.get(k)!==v)throw Error('Synthetic route controls rejected');
 if(!['volunter','unmatchedxyz'].includes(url.searchParams.get('search'))||!['best_match','lowest_cost'].includes(url.searchParams.get('sort')))throw Error('Synthetic case rejected');
 const count=request.headers.get('x-synthetic-offer-count');
 if(!['400','2000'].includes(count))throw Error('Synthetic count rejected');
 return Number(count);
}
