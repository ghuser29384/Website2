import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = process.cwd();
const retiredFiles = [
  "src/components/home/home-page.tsx",
  "src/components/home/local-date-greeting.tsx",
  "src/components/home/returning-home.module.css",
];
const read = (path: string) => readFileSync(join(root, path), "utf8");

function productionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    if (!entry.isFile() || !/\.(?:ts|tsx|js|jsx|css)$/.test(entry.name)) return [];
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];
    return [path];
  });
}

test("the obsolete hard-coded homepage and its exclusive assets are removed", () => {
  for (const path of retiredFiles) {
    assert.equal(existsSync(join(root, path)), false, `${path} must stay retired`);
  }
});

test("the root fallback redirects to the existing feed without profile reads", () => {
  const page = read("src/app/page.tsx");
  assert.match(page, /import \{ redirect \} from "next\/navigation"/);
  assert.match(page, /redirect\("\/feed"\)/);
  assert.doesNotMatch(page, /HomePage|useState|hasSupabaseAuthCookie|getViewer|next\/headers/);
  assert.match(page, /canonical: "\/"/);
});

test("retiring the mock preserves first-visit routing and live-feed ownership", () => {
  const proxy = read("src/proxy.ts");
  const config = read("next.config.ts");
  assert.match(proxy, /if \(pathname === "\/"\)/);
  assert.match(proxy, /walkthroughUrl\.pathname = "\/walkthrough"/);
  assert.match(proxy, /return rewriteToLiveHome\(request\)/);
  assert.match(proxy, /liveUrl\.pathname = "\/moral-trade-live\.html"/);
  assert.match(config, /source: "\/feed",\s*destination: "\/moral-trade-live\.html"/);
  assert.ok(existsSync(join(root, "public/moral-trade-live.html")));
});

test("production source does not import retired homepage modules", () => {
  const references = productionSources(join(root, "src")).filter((path) =>
    /(?:from\s*|import\s*(?:\(\s*)?)["'][^"']*(?:home-page|local-date-greeting|returning-home\.module\.css)["']/.test(
      readFileSync(path, "utf8"),
    ),
  );
  assert.deepEqual(references.map((path) => relative(root, path)), []);
});

test("the root fallback contains no fabricated counterparties or match statistics", () => {
  assert.doesNotMatch(
    read("src/app/page.tsx"),
    /Mina|96% on-time verification|11 completed|Both say yes|remainingMatches|Jul 23, 2026/,
  );
});
