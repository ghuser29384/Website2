import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";
import vm from "node:vm";

function extractLoader(html) {
  const startMarker = "  <script>\n";
  const endMarker = "\n  </script>";
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, "loader script start must exist");
  assert.notEqual(end, -1, "loader script end must exist");
  return html.slice(start + startMarker.length, end);
}

function gitBlobSha1(source) {
  const bytes = Buffer.from(source, "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
}

function makePayload(source, partCount = 3) {
  const encoded = gzipSync(Buffer.from(source, "utf8"), { level: 9, mtime: 0 }).toString("base64");
  const size = Math.ceil(encoded.length / partCount);
  const parts = Object.fromEntries(
    Array.from({ length: partCount }, (_, index) => [
      `${index}.txt`,
      encoded.slice(index * size, (index + 1) * size),
    ]),
  );
  return {
    manifest: {
      version: gitBlobSha1(source),
      encoding: "gzip+base64",
      parts: Object.keys(parts),
      sourceBytes: Buffer.byteLength(source),
      gzipBytes: Buffer.from(encoded, "base64").length,
      encodedCharacters: encoded.length,
    },
    parts,
  };
}

function createScriptElement() {
  const listeners = new Map();
  return {
    async: true,
    dataset: {},
    src: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
    remove() {},
  };
}

async function waitFor(predicate, timeoutMs = 2_000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for loader");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("Discover loader retries a mixed cache, accepts non-hard-coded part counts, and degrades optional local time", async () => {
  const html = await readFile(new URL("../public/moral-trade-discover.html", import.meta.url), "utf8");
  const loader = extractLoader(html);
  assert.doesNotMatch(loader, /manifest\.parts\.length\s*!==\s*7/);

  const source = "<!doctype html><html><head><title>Test Discover</title></head><body><main>Discover test content</main></body></html>";
  const { manifest, parts } = makePayload(source, 3);
  const requests = [];
  const scripts = new Map();
  const warnings = [];
  let written = "";

  const windowObject = {
    location: {
      origin: "https://example.test",
      href: "https://example.test/discover?domain=offers&view=list",
    },
    setTimeout,
    crypto: globalThis.crypto,
    DecompressionStream,
  };

  const documentObject = {
    head: {
      append(script) {
        scripts.set(script.dataset.mtLoaderRuntime, script);
        windowObject.MoralTradeDiscoverLocalTime = {
          transformSource() {
            throw new Error("simulated stale optional transform");
          },
        };
        queueMicrotask(() => script.dispatch("load"));
      },
    },
    querySelector(selector) {
      const match = /^script\[data-mt-loader-runtime="(.+)"\]$/.exec(selector);
      return match ? scripts.get(match[1]) || null : null;
    },
    createElement(tag) {
      assert.equal(tag, "script");
      return createScriptElement();
    },
    open() {},
    write(value) {
      written = value;
    },
    close() {},
  };

  async function fetchMock(input) {
    const url = new URL(String(input), windowObject.location.origin);
    requests.push(url);
    if (url.pathname === "/discover/payload/manifest.json") {
      return Response.json(manifest);
    }
    if (url.pathname === "/api/live-account") {
      return Response.json({ authenticated: false });
    }
    const partMatch = /^\/discover\/payload\/(\d+\.txt)$/.exec(url.pathname);
    if (partMatch) {
      const part = partMatch[1];
      if (part === "1.txt" && !url.searchParams.has("reload")) {
        return new Response("not-base64", { status: 200 });
      }
      return new Response(parts[part], { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }

  const consoleObject = {
    log() {},
    error() {},
    warn(...values) {
      warnings.push(values.map(String).join(" "));
    },
  };

  windowObject.window = windowObject;
  windowObject.document = documentObject;

  vm.runInNewContext(loader, {
    window: windowObject,
    document: documentObject,
    fetch: fetchMock,
    console: consoleObject,
    URL,
    Uint8Array,
    Blob,
    Response,
    TextEncoder,
    DecompressionStream,
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    setTimeout,
  });

  await waitFor(() => written.length > 0);

  assert.match(written, /Discover test content/);
  const preflightPattern = new RegExp(
    `moral-trade-discover-search-preflight\\.js\\?v=${manifest.version}`,
  );
  const controllerPattern = new RegExp(
    `moral-trade-discover-search\\.js\\?v=${manifest.version}`,
  );
  assert.match(written, preflightPattern);
  assert.match(written, controllerPattern);
  assert.ok(
    written.search(preflightPattern) < written.search(controllerPattern),
    "the filter preflight must load before the search controller",
  );
  assert.doesNotMatch(written, /moral-trade-smart-query\.js/);
  assert.equal(
    windowObject.__MT_DISCOVER_INITIAL_URL__,
    windowObject.location.href,
  );
  assert.equal(windowObject.__MT_DISCOVER_PAYLOAD_VERSION__, manifest.version);
  assert.ok(
    requests.some((url) => url.pathname.endsWith("/1.txt") && url.searchParams.has("reload")),
    "the second attempt must bypass the stale payload cache",
  );
  assert.ok(
    warnings.some((warning) => warning.includes("loader attempt 1 failed")),
    "the first corrupted attempt must be observed",
  );
  assert.ok(
    warnings.some((warning) => warning.includes("local-time enhancement was skipped")),
    "an optional local-time transform failure must not blank Discover",
  );
});
