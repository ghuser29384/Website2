// Loopback-only visual fixture, not a production route or authenticated server.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(root, "public");
const port = 3247;
const origin = `http://127.0.0.1:${port}`;
const layout = await readFile(join(root, "src/app/layout.tsx"), "utf8");
const route = await readFile(join(root, "src/app/trades/new/page.tsx"), "utf8");
const workbenchGrid = route.match(/const WORKBENCH_GRID = `([\s\S]*?)`;/)?.[1];
if (!workbenchGrid) throw new Error("Fixture could not read the actual route's workbench grid styles.");
// Derive the real layout's imports instead of keeping a divergent CSS copy.
const stylesheets = [...layout.matchAll(/import\s+["']([^"']+\.css)["'];/g)]
  .map((match) => resolve(root, "src/app", match[1]));

const bundled = await build({
  absWorkingDir: root,
  entryPoints: {
    fixture: "tests/fixtures/trade-draft-palette/fixture.tsx",
    layout: "fixture:layout-styles",
  },
  outdir: join(root, "test-results/trade-draft-palette-bundle"),
  bundle: true,
  write: false,
  metafile: true,
  jsx: "automatic",
  platform: "browser",
  format: "iife",
  // Next's browser compiler normally replaces its internal process.env flags.
  // Supply a fixed, public-only environment for the standalone fixture too;
  // never copy the host process.env into a client bundle.
  define: {
    "process.env": JSON.stringify({ NODE_ENV: "development" }),
    "process.env.NODE_ENV": '"development"',
  },
  plugins: [{
    name: "real-layout-styles",
    setup(bundler) {
      bundler.onResolve({ filter: /^fixture:layout-styles$/ }, () => ({
        path: "layout-styles",
        namespace: "fixture",
      }));
      bundler.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: stylesheets.map((path) => `@import ${JSON.stringify(path)};`).join("\n"),
        loader: "css",
        resolveDir: root,
      }));
      bundler.onResolve({ filter: /^\// }, (args) => args.kind === "url-token"
        ? { path: args.path, external: true }
        : undefined);
    },
  }],
});

// Prove the harness bundles production source, including its CSS module.
const inputs = Object.keys(bundled.metafile.inputs);
for (const required of [
  "src/components/core-trade/trade-draft-workbench.tsx",
  "src/components/core-trade/trade-draft-workbench.module.css",
  "src/components/core-trade/pending-submit-button.tsx",
  "src/lib/command-center-handoff.ts",
]) {
  if (!inputs.includes(required)) throw new Error(`Fixture omitted production source: ${required}`);
}
for (const file of bundled.outputFiles.filter((output) => output.path.endsWith(".js"))) {
  if (/\bprocess\.env\b/.test(file.text.replaceAll("<define:process.env>", ""))) {
    throw new Error("Fixture left an uncompiled Node environment reference in browser JavaScript.");
  }
}

if (process.argv.includes("--check")) {
  console.log(`Fixture bundles the real workbench and ${stylesheets.length} layout stylesheets; no server started.`);
  process.exit(0);
}

const assets = new Map(bundled.outputFiles.map((file) => [
  `/__fixture__/${file.path.split(sep).at(-1)}`,
  file.contents,
]));
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trade builder palette fixture</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/__fixture__/layout.css">
<link rel="stylesheet" href="/moral-trade-input-assist.css">
<link rel="stylesheet" href="/__fixture__/fixture.css">
<style>${workbenchGrid}</style>
</head><body><a class="skip-link" href="#main-content">Skip to main content</a>
<div id="fixture-root"></div>
<script src="/__fixture__/fixture.js" defer></script>
<script src="/moral-trade-input-assist.js" defer></script>
</body></html>`;
const contentTypes = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
};
const allowedPublicAssets = new Set([
  "/moral-trade-input-assist.js",
  "/moral-trade-input-assist.css",
  "/moral-trade-input-standards.json",
]);

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  // Read-only, exact-host service: no API handlers, writes, or remote navigation.
  if (request.headers.host !== `127.0.0.1:${port}`) {
    response.writeHead(403).end();
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }
  const path = new URL(request.url || "/", origin).pathname;
  if (path === "/" || path === "/trades/new") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(request.method === "HEAD" ? undefined : html);
    return;
  }
  let body = assets.get(path);
  if (!body && (allowedPublicAssets.has(path) || /^\/fonts\/[\w./-]+\.(woff2?|otf)$/.test(path))) {
    const file = resolve(publicRoot, `.${path}`);
    if (file.startsWith(`${publicRoot}${sep}`)) {
      try { body = await readFile(file); } catch { /* A missing asset is a 404. */ }
    }
  }
  if (!body) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader("Content-Type", contentTypes[extname(path)] || "application/octet-stream");
  response.end(request.method === "HEAD" ? undefined : body);
});

server.listen(port, "127.0.0.1", () => console.log(`Trade draft palette fixture: ${origin}`));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
