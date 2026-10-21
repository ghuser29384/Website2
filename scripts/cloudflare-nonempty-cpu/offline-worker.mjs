import handler from './worker.mjs';
import { makeOfflineFetch } from './offline-provider.mjs';
export * from './worker.mjs';
globalThis.fetch = makeOfflineFetch(globalThis.fetch.bind(globalThis));
export default handler;
