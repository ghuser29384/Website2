import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as aiTxtRoute } from "@/app/ai.txt/route";
import { metadata as faqMetadata } from "@/app/faq/page";
import { metadata as howItWorksMetadata } from "@/app/how-it-works/page";
import { metadata as offersMetadata } from "@/app/offers/page";
import { metadata as offersNewMetadata } from "@/app/offers/new/page";
import { metadata as paidActionOffersMetadata } from "@/app/paid-action-offers/page";
import { GET as robotsTxtRoute } from "@/app/robots.txt/route";
import sitemap from "@/app/sitemap";
import { metadata as sourcesMetadata } from "@/app/sources/page";
import { metadata as statusMetadata } from "@/app/status/page";
import { metadata as whatIsMoralTradeMetadata } from "@/app/what-is-moral-trade/page";
import { metadata as workedExamplesMetadata } from "@/app/worked-examples/page";
import { AI_TXT, ROBOTS_TXT } from "@/lib/crawlability-assets";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";

const CANONICAL_ORIGIN = "https://www.moraltrade.org";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
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
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  const urlSet = new Set(urls);

  for (const path of [
    "/",
    "/ai.txt",
    "/what-is-moral-trade",
    "/how-it-works",
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
});

test("paid action offers page has crawler-readable SSR content and honest metadata", () => {
  const pageSource = readRepoFile("src/app/paid-action-offers/page.tsx");
  const loadingSource = readRepoFile("src/app/loading.tsx");

  assert.match(pageSource, /title="Paid action offers are deferred\."/);
  assert.match(pageSource, /Moral Trade keeps general paid action offers deferred until identity, dispute, legal, and evidence workflows are mature/);
  assert.equal(pageSource.includes("Preparing route"), false);
  assert.equal(loadingSource.includes("Preparing route"), false);
  assert.equal(loadingSource.includes("<h1"), false);
  assert.match(pageSource, /buildWebPageJsonLd/);
  assert.match(pageSource, /buildBreadcrumbJsonLd/);
  assert.equal(JSON.stringify(paidActionOffersMetadata).includes("noindex"), false);
});

test("public route metadata has unique titles, descriptions, canonicals, and indexable robots", () => {
  const publicMetadata = [
    ["/what-is-moral-trade", whatIsMoralTradeMetadata],
    ["/how-it-works", howItWorksMetadata],
    ["/sources", sourcesMetadata],
    ["/faq", faqMetadata],
    ["/offers", offersMetadata],
    ["/offers/new", offersNewMetadata],
    ["/paid-action-offers", paidActionOffersMetadata],
    ["/worked-examples", workedExamplesMetadata],
    ["/status", statusMetadata],
  ] as const;
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const [path, metadata] of publicMetadata) {
    const title = metadata.title;
    const description = metadata.description;

    if (typeof title !== "string") {
      assert.fail(`${path} title must be a string`);
    }
    if (typeof description !== "string") {
      assert.fail(`${path} description must be a string`);
    }

    assert.equal(metadata.alternates?.canonical, path, `${path} canonical mismatch`);
    assert.equal(JSON.stringify(metadata.robots ?? {}).includes("false"), false, `${path} blocks indexing`);

    assert.equal(titles.has(title), false, `${path} duplicate title`);
    assert.equal(descriptions.has(description), false, `${path} duplicate description`);
    titles.add(title);
    descriptions.add(description);

    if (metadata.openGraph && "url" in metadata.openGraph) {
      assert.equal(String(metadata.openGraph.url), getAbsoluteUrl(path), `${path} Open Graph URL mismatch`);
    }
  }
});
