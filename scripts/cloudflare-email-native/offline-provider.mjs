export function makeOfflineFetch(nativeFetch) {
  return async function offlineFetch(input, init) {
    const request = new Request(input, init), url = new URL(request.url);
    if (url.username || url.password) throw new Error('Synthetic network guard rejected credentials in URL');
    if (url.origin === 'http://127.0.0.1:15433' && url.pathname.startsWith('/rest/v1/')) return nativeFetch(request);
    if (url.href === 'https://api.resend.com/emails' && request.method === 'POST') {
      // Test-only transport substitution. Existing application email code is unchanged.
      return nativeFetch(new Request('http://127.0.0.1:15433/synthetic-provider/emails', request));
    }
    throw new Error('Synthetic network guard rejected an unexpected destination');
  };
}
