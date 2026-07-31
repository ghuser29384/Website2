import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const projectRoot = process.cwd();

function readPublicFile(filename: string) {
  return readFileSync(join(projectRoot, "public", filename), "utf8");
}

function extractInlineLoader(html: string) {
  const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(match, "Discover should contain one inline loader before the closing body tag.");
  return match[1];
}

function extractNamedFunction(source: string, name: string) {
  const functionStart = source.indexOf(`function ${name}(`);
  assert.notEqual(functionStart, -1, `${name} should be defined in the Discover loader.`);

  const bodyStart = source.indexOf("{", functionStart);
  assert.notEqual(bodyStart, -1, `${name} should have a function body.`);

  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(functionStart, index + 1);
    }
  }

  assert.fail(`${name} should have a complete function body.`);
}

test("the exact live loader injects the Discover navigation bridge", () => {
  const loader = readPublicFile("moral-trade-live.html");

  assert.match(loader, /moral-trade-live-navigation\.js/);
  assert.match(loader, /accountAwareSource\.replace\('<\/body>'/);
});

test("the live navigation bridge exposes Feed, Discover, Controls, and the global Evidence ledger", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  assert.match(bridge, /control\.textContent = "Feed"/);
  assert.match(bridge, /data-mt-feed-link/);
  assert.match(bridge, /Open personalized feed/);
  assert.match(bridge, /window\.location\.assign\("\/discover"\)/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /control\.textContent = "Discover"/);
  assert.match(bridge, /window\.location\.assign\("\/trade-controls"\)/);
  assert.match(bridge, /data-mt-controls-link/);
  assert.match(bridge, /control\.textContent = "Controls"/);
  assert.match(bridge, /normalizeLabel\(control\) === "controls"/);
  assert.match(bridge, /window\.location\.assign\("\/evidence"\)/);
  assert.match(bridge, /data-mt-evidence-link/);
  assert.match(bridge, /control\.textContent = "Evidence"/);
  assert.match(bridge, /normalizeLabel\(control\) === "evidence"/);
  assert.match(bridge, /label === "commitments" \|\| label === "activity"/);
});

test("the Discover loader reconnects product navigation and emits safe script tags", () => {
  const loader = readPublicFile("moral-trade-discover.html");
  const navigationBridge = readPublicFile("moral-trade-discover-navigation.js");
  const inlineLoader = extractInlineLoader(loader);

  assert.match(loader, /moral-trade-discover-navigation\.js/);
  assert.match(loader, /moral-trade-discover-value-hover\.js/);
  assert.equal(
    inlineLoader.includes("</script>"),
    false,
    "The inline loader must not contain a literal closing script tag that could terminate it early.",
  );

  const buildAssetUrl = extractNamedFunction(inlineLoader, "buildAssetUrl");
  const scriptTag = extractNamedFunction(inlineLoader, "scriptTag");
  const renderScriptTag = runInNewContext(
    `(() => { ${buildAssetUrl}\n${scriptTag}\nreturn scriptTag; })()`,
    {
      URL,
      window: { location: { origin: "https://moraltrade.org" } },
    },
  ) as (path: string, version: string, reloadToken?: string) => string;

  const version = "a".repeat(40);
  const generatedTag = renderScriptTag(
    "/moral-trade-discover-navigation.js",
    version,
    "retry-1",
  );

  assert.equal(
    generatedTag,
    `<script src="/moral-trade-discover-navigation.js?v=${version}&amp;reload=retry-1"></script>`,
  );
  assert.match(generatedTag, /^<script src="[^"]+"><\/script>$/);
  assert.doesNotMatch(generatedTag, /<\\\/script>/);
  assert.match(navigationBridge, /\["now", "\/"\]/);
  assert.match(navigationBridge, /\["offer", "\/trades\/new"\]/);
  assert.match(navigationBridge, /\["activity", "\/commitments"\]/);
  assert.match(navigationBridge, /\["evidence", "\/evidence"\]/);
  assert.match(navigationBridge, /control\.textContent = "Evidence"/);
});

test("value-field copy appears only after a half-second mouse hover", () => {
  const hoverBridge = readPublicFile("moral-trade-discover-value-hover.js");

  assert.match(hoverBridge, /const HOVER_DELAY_MS = 500/);
  assert.match(hoverBridge, /document\.addEventListener\("pointerover"/);
  assert.match(hoverBridge, /document\.addEventListener\("pointerout"/);
  assert.match(hoverBridge, /point\.matches\(":hover"\)/);
  assert.match(hoverBridge, /\.value-point \.point-title/);
  assert.match(hoverBridge, /\.value-point \.point-meta/);
  assert.match(hoverBridge, /tooltip\.setAttribute\("role", "tooltip"\)/);
});
