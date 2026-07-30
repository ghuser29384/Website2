import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as getFavicon } from "../app/favicon.ico/route";

// Keep every document surface on the same versioned Moral Trade mark.
const CANONICAL_FAVICON_HREF = "/brand/moral-trade-mark.png?v=20260730";
const CANONICAL_FAVICON_PATH = join(
  process.cwd(),
  "public",
  "brand",
  "moral-trade-mark.png",
);

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("Next metadata, the manifest, and the favicon fallback use the canonical Moral Trade mark", async () => {
  const layout = source("src/app/layout.tsx");
  const manifest = source("src/app/manifest.ts");
  const route = source("src/app/favicon.ico/route.ts");
  const canonicalIcon = readFileSync(CANONICAL_FAVICON_PATH);

  assert.match(layout, /SITE_FAVICON_PATH = `\$\{SITE_IMAGE_PATH\}\?v=20260730`/);
  assert.ok((layout.match(/rel="(?:shortcut icon|icon|apple-touch-icon)"/g) ?? []).length >= 3);
  assert.match(manifest, /\/brand\/moral-trade-mark\.png\?v=20260730/);
  assert.doesNotMatch(manifest, /O%20\(8\)\.png/);
  assert.match(route, /"public", "brand", "moral-trade-mark\.png"/);
  assert.equal(existsSync(join(process.cwd(), "public", "favicon.ico")), false);

  assert.deepEqual([...canonicalIcon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(canonicalIcon.readUInt32BE(16), 512);
  assert.equal(canonicalIcon.readUInt32BE(20), 512);

  const response = await getFavicon();
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), canonicalIcon);
});

test("every document-writing static shell installs the canonical favicon before and after replacement", () => {
  for (const path of [
    "public/moral-trade-live.html",
    "public/moral-trade-production.html",
    "public/moral-trade-discover.html",
  ]) {
    const html = source(path);
    const occurrences = html.split(CANONICAL_FAVICON_HREF).length - 1;

    assert.ok(occurrences >= 6, `${path} must cover its loading and final documents`);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512"/);
    assert.match(html, /const faviconLinks = \[/);
  }
});

test("the legacy branding runtime removes competing icons and restores the canonical favicon", () => {
  const runtime = source("public/moral-trade-brand.js");

  assert.match(runtime, /FAVICON_PATH = "\/brand\/moral-trade-mark\.png\?v=20260730"/);
  assert.match(runtime, /querySelectorAll\('link\[rel\*="icon" i\]'\)/);
  assert.match(runtime, /link\.setAttribute\("sizes", "512x512"\)/);
  assert.match(runtime, /installFavicons\(\);/);
  assert.match(runtime, /data-mt-favicon-canonical/);
});

test("the raw Create implementation document redirects to the canonical Create page", () => {
  const nextConfig = source("next.config.ts");

  assert.match(
    nextConfig,
    /source: "\/moral-trade-create"[\s\S]*destination: "\/trades\/new"/,
  );
  assert.match(
    nextConfig,
    /source: "\/moral-trade-create\/index\.html"[\s\S]*destination: "\/trades\/new"/,
  );
});
