const responseHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
};

const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Offer not found | Moral Trade</title>
    <style>
      :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #f7f5ef; color: #1f2521; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 32px 20px; }
      section { width: min(680px, 100%); border: 1px solid #d9d5ca; border-radius: 20px; background: #fff; padding: 36px; box-shadow: 0 18px 60px rgba(31, 37, 33, 0.08); }
      h1 { margin: 0 0 14px; font-size: clamp(2rem, 6vw, 3.5rem); line-height: 1; }
      p { margin: 0 0 14px; font-size: 1rem; line-height: 1.6; }
      .receipt { color: #626b64; font-size: 0.9rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
      a { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; border-radius: 999px; padding: 10px 18px; text-decoration: none; font-weight: 700; }
      .primary { background: #1f2521; color: #fff; }
      .secondary { border: 1px solid #b8b5ab; color: #1f2521; }
    </style>
  </head>
  <body>
    <main id="main-content">
      <section aria-labelledby="safe-state-heading">
        <h1 id="safe-state-heading">Unavailable</h1>
        <p>The route is not available as a backed Moral Trade record.</p>
        <p class="receipt">Unavailable · Terms changed</p>
        <div class="actions">
          <a class="primary" href="/offers?view=live">Explore live proposals</a>
          <a class="secondary" href="/donate">Fund a public good</a>
        </div>
      </section>
    </main>
  </body>
</html>`;

export function GET() {
  return new Response(body, {
    status: 404,
    headers: responseHeaders,
  });
}

export function HEAD() {
  return new Response(null, {
    status: 404,
    headers: responseHeaders,
  });
}
