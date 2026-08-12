import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as aiTxtRoute } from "@/app/ai.txt/route";
import { GET as robotsTxtRoute } from "@/app/robots.txt/route";
import sitemap from "@/app/sitemap";
import { AI_TXT, ROBOTS_TXT } from "@/lib/crawlability-assets";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";

const CANONICAL_ORIGIN = "https://www.moraltrade.org";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function metadataBlock(path: string, marker = "export const metadata") {
  const source = readRepoFile(path);
  const start = source.indexOf(marker);
  const end = source.indexOf("\n};", start);

  assert.notEqual(start, -1, `${path} must contain ${marker}`);
  assert.notEqual(end, -1, `${path} metadata must be a static object`);
  return { block: source.slice(start, end + 3), source };
}

function metadataStringField(
  source: string,
  block: string,
  field: "title" | "description",
) {
  const literal = block.match(new RegExp(`\\b${field}:\\s*(?:\\n\\s*)?"([^"]+)"`));
  if (literal) return literal[1];

  const reference = block.match(new RegExp(`\\b${field}:\\s*([A-Za-z_$][\\w$]*)`));
  assert.ok(reference, `metadata ${field} must be a literal or a local string constant`);
  const declaration = source.match(
    new RegExp(`const\\s+${reference[1]}\\s*=\\s*(?:\\n\\s*)?"([^"]+)"`),
  );
  assert.ok(declaration, `metadata ${field} reference must resolve to a local string constant`);
  return declaration[1];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("robots.txt explicitly allows AI and search crawlers as plain text", async () => {
  const response = robotsTxtRoute();
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain");
  assert.equal(body, ROBOTS_TXT);

  for (const bot of [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "GPTBot",
    "ClaudeBot",
    "Googlebot",
    "Bingbot",
  ]) {
    assert.match(body, new RegExp(`User-agent: ${bot}\\nAllow: /`));
  }

  assert.match(body, /Sitemap: https:\/\/www\.moraltrade\.org\/sitemap\.xml/);
  assert.equal(/User-agent:[^\n]+Allow:/i.test(body), false);
  assert.equal(body.includes("<html"), false);
  assert.equal(body.includes("Disallow"), false);
});

test("ai.txt gives retrievers an accurate public status summary", async () => {
  const response = aiTxtRoute();
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain");
  assert.equal(body, AI_TXT);
  assert.match(body, /Public worked examples exist/);
  assert.match(body, /General paid action offers are deferred/);
  assert.match(body, /does not provide legal, tax, escrow, custody, or investment services/);
  assert.match(body, /https:\/\/www\.moraltrade\.org\/status/);
});

test("sitemap uses canonical public URLs and excludes private surfaces", async () => {
  const previousStaticMode = process.env.MORAL_TRADE_STATIC_SITEMAP_ONLY;
  process.env.MORAL_TRADE_STATIC_SITEMAP_ONLY = "true";

  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  const urlSet = new Set(urls);

  for (const path of [
    "/",
    "/ai.txt",
    "/what-is-moral-trade",
    "/sources",
    "/faq",
    "/offers",
    "/offers/new",
    "/paid-action-offers",
    "/pledge-swaps",
    "/donation-offsets",
    "/projects",
    "/worked-examples",
    "/validation",
    "/safety",
    "/anti-threat-rules",
    "/status",
    "/transparency",
    "/team-and-governance",
    "/pilot-updates",
    "/contact",
  ]) {
    assert.equal(urlSet.has(`${CANONICAL_ORIGIN}${path}`), true, `missing ${path}`);
  }

  for (const offer of CANONICAL_WORKED_CASE_OFFERS) {
    assert.equal(
      urlSet.has(`${CANONICAL_ORIGIN}/offers/examples/${offer.id}`),
      true,
      `missing worked example ${offer.id}`,
    );
  }

  assert.equal(urls.every((url) => url.startsWith(CANONICAL_ORIGIN)), true);
  assert.equal(urls.some((url) => url.includes("?")), false);
  for (const privatePath of [
    "/api/",
    "/login",
    "/signup",
    "/dashboard",
    "/cart",
    "/admin",
    "/saved-offers",
  ]) {
    assert.equal(urls.some((url) => new URL(url).pathname.startsWith(privatePath)), false);
  }

  if (previousStaticMode === undefined) {
    delete process.env.MORAL_TRADE_STATIC_SITEMAP_ONLY;
  } else {
    process.env.MORAL_TRADE_STATIC_SITEMAP_ONLY = previousStaticMode;
  }
});

test("paid action offers page has crawler-readable SSR content and honest metadata", () => {
  const pageSource = readRepoFile("src/app/paid-action-offers/page.tsx");

  assert.match(pageSource, /title="Paid action offers are deferred\."/);
  assert.match(pageSource, /Moral Trade keeps general paid action offers deferred until identity, dispute, legal, and evidence workflows are mature/);
  assert.equal(pageSource.includes("Preparing route"), false);
  assert.match(pageSource, /buildWebPageJsonLd/);
  assert.match(pageSource, /buildBreadcrumbJsonLd/);
  assert.doesNotMatch(metadataBlock("src/app/paid-action-offers/page.tsx").block, /index:\s*false|noindex/i);
});

test("public route metadata has unique titles, descriptions, canonicals, and indexable robots", () => {
  const publicMetadata = [
    ["/what-is-moral-trade", "src/app/moral-trade/page.tsx", "export const metadata"],
    ["/sources", "src/app/sources/page.tsx", "export const metadata"],
    ["/faq", "src/app/faq/page.tsx", "export const metadata"],
    ["/offers?view=live", "src/app/offers/page.tsx", "const LIVE_METADATA"],
    ["/offers/new?mode=offset", "src/app/offers/new/page.tsx", "export const metadata"],
    ["/paid-action-offers", "src/app/paid-action-offers/page.tsx", "export const metadata"],
    ["/worked-examples", "src/app/worked-examples/page.tsx", "export const metadata"],
    ["/status", "src/app/status/page.tsx", "export const metadata"],
  ] as const;
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const [canonical, sourcePath, marker] of publicMetadata) {
    const { block, source } = metadataBlock(sourcePath, marker);
    const title = metadataStringField(source, block, "title");
    const description = metadataStringField(source, block, "description");
    const escapedCanonical = escapeRegExp(canonical);

    assert.match(
      block,
      new RegExp(`canonical:\\s*"${escapedCanonical}"`),
      `${canonical} canonical mismatch`,
    );
    assert.doesNotMatch(block, /index:\s*false|noindex/i, `${canonical} blocks indexing`);
    assert.equal(titles.has(title), false, `${canonical} duplicate title`);
    assert.equal(descriptions.has(description), false, `${canonical} duplicate description`);
    titles.add(title);
    descriptions.add(description);

    if (/openGraph:\s*\{/.test(block)) {
      assert.match(
        block,
        new RegExp(`url:\\s*getAbsoluteUrl\\("${escapedCanonical}"\\)`),
        `${canonical} Open Graph URL mismatch`,
      );
    }
  }
});
