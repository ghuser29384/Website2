import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { SERVICE_KEY, PROVIDER_KEY } from './nonempty-fixture.mjs';

export function installSourceLoader(root, fixture) {
  const src = pathToFileURL(resolve(root, 'src') + '/').href;
  const network = () => { throw new Error('Unexpected network operation in source test'); };
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.url !== 'https://api.resend.com/emails') return network();
    const result = fixture.handle(request.method, '/synthetic-provider/emails', Object.fromEntries(request.headers), JSON.parse(await request.text()));
    return Response.json(result.body, { status: result.status });
  };
  Object.assign(process.env, { CRON_SECRET: 'synthetic-scheduler-secret-only', RESEND_API_KEY: PROVIDER_KEY, EMAIL_FROM: 'test@synthetic.invalid', NEXT_PUBLIC_SITE_URL: 'https://synthetic.invalid', VERCEL_PROJECT_ID: 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7', VERCEL_ENV: 'production' });
  function query(table, rpcBody) {
    let method = rpcBody ? 'POST' : 'GET', body = rpcBody, single = false;
    const q = new URLSearchParams(), headers = { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
    const chain = {
      select(value = '*') { q.set('select', value); return chain; },
      eq(key, value) { q.set(key, `eq.${value}`); return chain; },
      neq(key, value) { q.set(key, `neq.${value}`); return chain; },
      in(key, value) { q.set(key, `in.(${value.join(',')})`); return chain; },
      not(key, op, value) { q.set(key, `not.${op}.${value}`); return chain; },
      lte(key, value) { q.set(key, `lte.${value}`); return chain; },
      gte(key, value) { q.set(key, `gte.${value}`); return chain; },
      order(key) { q.set('order', key); return chain; },
      limit(value) { q.set('limit', value); return chain; },
      update(value) { method = 'PATCH'; body = value; return chain; },
      insert(value) { method = 'POST'; body = value; return chain; },
      upsert(value, options = {}) { method = 'POST'; body = value; if (options.onConflict) q.set('on_conflict', options.onConflict); return chain; },
      maybeSingle() { single = true; return chain; },
      then(onValue, onError) {
        const r = fixture.handle(method, `/rest/v1/${table}?${q}`, headers, body);
        const data = single && Array.isArray(r.body) ? r.body[0] ?? null : r.body;
        return Promise.resolve({ data: r.status < 400 ? data : null, error: r.status >= 400 ? r.body : null, count: r.headers?.['content-range'] ? Number(r.headers['content-range'].split('/').pop()) : null }).then(onValue, onError);
      },
    };
    return chain;
  }
  globalThis.__syntheticService = { from: table => query(table), rpc: (name, body) => query('rpc/' + name, body) };
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'next/server') return { url: 'synthetic:next', shortCircuit: true };
      if (specifier === 'server-only') return { url: 'synthetic:empty', shortCircuit: true };
      let url;
      if (specifier.startsWith('@/')) url = new URL(specifier.slice(2), src).href;
      else if (specifier.startsWith('.') && context.parentURL?.startsWith(src)) url = new URL(specifier, context.parentURL).href;
      if (url) {
        if (url.replace(/\.ts$/, '').endsWith('/lib/supabase/server')) return { url: 'synthetic:database', shortCircuit: true };
        if (url.replace(/\.ts$/, '').endsWith('/payments/conditional-redirect-settlement')) return { url: 'synthetic:payments', shortCircuit: true };
        if (existsSync(fileURLToPath(url) + '.ts')) url += '.ts';
        return { url, shortCircuit: true };
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      const stubs = {
        'synthetic:next': 'export const NextResponse = Response;',
        'synthetic:empty': 'export {};',
        'synthetic:database': 'export const createServiceClient = () => globalThis.__syntheticService;',
        'synthetic:payments': 'export const promoteConditionalRedirectBackupOrFallback = () => {throw new Error("Unexpected payment path");}; export const settleConditionalRedirectOffer = promoteConditionalRedirectBackupOrFallback;',
      };
      if (url in stubs) return { format: 'module', source: stubs[url], shortCircuit: true };
      if (url.startsWith(src) && url.endsWith('.ts')) return { format: 'module', source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), 'utf8'), { mode: 'transform' }), shortCircuit: true };
      return next(url, context);
    },
  });
}
