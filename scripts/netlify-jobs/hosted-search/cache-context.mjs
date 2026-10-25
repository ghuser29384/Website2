export function syntheticCacheContext(origin){
 const url=new URL(origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Local synthetic cache only');
 return Buffer.from(JSON.stringify({deployID:'0',siteID:'synthetic-site',primaryRegion:'dev',token:'synthetic-local-cache-only',edgeURL:url.origin,uncachedEdgeURL:url.origin})).toString('base64');
}
