// Explicitly opt-in, synthetic emulator process only. Never include in deployment.
import {providerRouting} from './provider-routing.mjs';
import {FIXTURE_TOKEN} from './http-fixture.mjs';
if(process.env.NETLIFY_EMAIL_SYNTHETIC_TEST!=='1'||process.env.RESEND_API_KEY!==FIXTURE_TOKEN||process.env.EMAIL_FROM!=='test@synthetic.invalid')throw Error('Synthetic runtime opt-in and credentials required');
globalThis.fetch=providerRouting(globalThis.fetch.bind(globalThis),process.env.NETLIFY_EMAIL_FIXTURE_ORIGIN);

await import('./search/profile-hook.mjs');
