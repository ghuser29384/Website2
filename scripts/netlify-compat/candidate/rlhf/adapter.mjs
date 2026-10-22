// Narrow adapter for the existing buffered public-release handler, not Express.
export function adaptPublicHandler(handler) {
  return async function serve(request) {
    const headers = new Headers();
    let body;
    let ended = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(name, String(value)); },
      end(value) { body = value; ended = true; },
    };
    await handler({ url: request.url, method: request.method }, res);
    if (!ended) throw new Error('Public handler did not complete');
    return new Response(request.method === 'HEAD' ? null : (body ?? null), {
      status: res.statusCode, headers,
    });
  };
}
