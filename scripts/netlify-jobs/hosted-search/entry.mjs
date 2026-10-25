// Disposable synthetic measurement entry. Never deploy to an application project.
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BlobsServer} from '@netlify/blobs/server';
import {createMeasurementHandler} from './handler-wrapper.mjs';
import {prepareSyntheticEnvironment} from './runtime-environment.mjs';
import {createSyntheticTransport} from './synthetic-transport.mjs';
import {createSearchFixture} from '../search/fixture.mjs';
import {cacheRouting} from './cache-routing.mjs';
import {syntheticCacheContext} from './cache-context.mjs';
let fixtureReads=0;
export function diagnosticSnapshot(){return {fixtureReads};}
export const config={path:'/offers',method:'GET'};
export default createMeasurementHandler(async()=>{
 prepareSyntheticEnvironment(process.env);
 const directory=await mkdtemp(join(tmpdir(),'synthetic-search-cache-'));
 const cache=new BlobsServer({debug:false,directory,token:'synthetic-local-cache-only'});
 const {port}=await cache.start();
 const origin=`http://127.0.0.1:${port}`;
 process.env.NETLIFY_BLOBS_CONTEXT=syntheticCacheContext(origin);
 const transport=createSyntheticTransport(options=>{const fixture=createSearchFixture(options);return {...fixture,handle(request){fixtureReads++;return fixture.handle(request);}};});
 globalThis.fetch=cacheRouting(transport.fetch,globalThis.fetch.bind(globalThis),origin);
 process.chdir(dirname(fileURLToPath(import.meta.url)));
 // Variable URL intentionally preserves the prebuilt handler and its relative dependencies.
 const compiledURL=new URL('./compiled-entry.mjs',import.meta.url);
 const compiled=await import(compiledURL.href);
 if(typeof compiled.default!=='function')throw Error('Missing compiled handler');
 return {handler:compiled.default,transport};
});
