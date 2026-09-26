#!/usr/bin/env node

const CANONICAL_ORIGIN = "https://www.moraltrade.org";
const DEFAULT_BASE_URL =
  process.argv[2] ??
  process.env.CRAWLABILITY_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : CANONICAL_ORIGIN);

const baseUrl = DEFAULT_BASE_URL.replace(/\/$/, "");
const pagePaths = [
  "/paid-action-offers",
  "/what-is-moral-trade",
  "/sources",
  "/faq",
  "/offers?view=live",
];

const requiredSitemapUrls = [
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
];

const forbiddenSitemapPathPatterns = [
  /^\/api(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,
  /^\/dashboard(?:\/|$)/,
  /^\/cart(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/saved-offers(?:\/|$)/,
];

const checks = [];

function record(ok, label, detail = "") {
  checks.push({ ok, label, detail });
  const prefix = ok ? "PASS" : "FAIL";
  console.log(`${prefix} ${label}${detail ? ` - ${detail}` : ""}`);
}

async function fetchPath(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "User-Agent": "MoralTrade-Crawlability-Verification/1.0",
    },
    redirect: "manual",
  });
  const body = await response.text();
  return { body, contentType: response.headers.get("content-type") ?? "", response };
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findTag(html, tagName, attrName, attrValue) {
  const tagRegex = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  const attrRegex = new RegExp(`${attrName}=["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
  return [...html.matchAll(tagRegex)].find((match) => attrRegex.test(match[0]))?.[0] ?? "";
}

function readAttr(tag, attrName) {
  const match = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function readMeta(html, attrName, attrValue) {
  return readAttr(findTag(html, "meta", attrName, attrValue), "content");
}

function readCanonical(html) {
  return readAttr(findTag(html, "link", "rel", "canonical"), "href");
}

function readTitle(html) {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function readH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return {
    index: match?.index ?? -1,
    text: stripTags(match?.[1] ?? ""),
  };
}

async function verifyRobots() {
  const { body, contentType, response } = await fetchPath("/robots.txt");
  record(response.status === 200, "/robots.txt returns HTTP 200", `status=${response.status}`);
  record(contentType.toLowerCase().startsWith("text/plain"), "/robots.txt is text/plain", contentType);
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
    record(body.includes(`User-agent: ${bot}`), `/robots.txt allows ${bot}`);
  }
  record(body.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`), "/robots.txt advertises sitemap");
  record(!/User-agent:[^\n]+Allow:/i.test(body), "/robots.txt does not collapse directives");
  record(!/<html/i.test(body), "/robots.txt is not HTML");
}

async function verifySitemap() {
  const { body, contentType, response } = await fetchPath("/sitemap.xml");
  record(response.status === 200, "/sitemap.xml returns HTTP 200", `status=${response.status}`);
  record(
    /(?:application|text)\/xml/i.test(contentType),
    "/sitemap.xml uses XML content type",
    contentType,
  );
  record(/<urlset[\s>]/i.test(body) && /<\/urlset>/i.test(body), "/sitemap.xml has urlset XML");

  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const locSet = new Set(locs);
  for (const path of requiredSitemapUrls) {
    record(locSet.has(`${CANONICAL_ORIGIN}${path}`), `/sitemap.xml includes ${path}`);
  }
  record(
    locs.every((loc) => loc.startsWith(`${CANONICAL_ORIGIN}/`) || loc === CANONICAL_ORIGIN),
    "/sitemap.xml uses canonical production URLs",
  );
  record(
    locs.every((loc) => {
      const path = new URL(loc).pathname;
      return !forbiddenSitemapPathPatterns.some((pattern) => pattern.test(path));
    }),
    "/sitemap.xml excludes private and internal routes",
  );
}

async function verifyAiTxt() {
  const { body, contentType, response } = await fetchPath("/ai.txt");
  record(response.status === 200, "/ai.txt returns HTTP 200", `status=${response.status}`);
  record(contentType.toLowerCase().startsWith("text/plain"), "/ai.txt is text/plain", contentType);
  record(body.includes("Moral Trade is a pilot platform"), "/ai.txt explains the site");
  record(body.includes("General paid action offers are deferred"), "/ai.txt states paid-action status");
  record(body.includes(`${CANONICAL_ORIGIN}/paid-action-offers`), "/ai.txt links public pages");
}

async function verifyPage(path) {
  const { body, contentType, response } = await fetchPath(path);
  record(response.status === 200, `${path} returns HTTP 200`, `status=${response.status}`);
  record(contentType.toLowerCase().includes("text/html"), `${path} is HTML`, contentType);

  const h1 = readH1(body);
  record(Boolean(h1.text), `${path} has server-rendered H1`, h1.text);
  if (path === "/paid-action-offers") {
    record(
      h1.text === "Paid action offers are deferred.",
      "/paid-action-offers has the required first H1",
      h1.text,
    );
  }

  const fallbackIndex = body.indexOf("Preparing route");
  record(
    fallbackIndex === -1 || (h1.index !== -1 && fallbackIndex > h1.index),
    `${path} does not render fallback before H1`,
  );
  record(!/noindex|nofollow/i.test(body), `${path} does not contain noindex or nofollow`);
  record(Boolean(readTitle(body)), `${path} has title`, readTitle(body));
  record(Boolean(readMeta(body, "name", "description")), `${path} has description metadata`);
  record(readCanonical(body) === `${CANONICAL_ORIGIN}${path}`, `${path} has production canonical`, readCanonical(body));
  record(Boolean(readMeta(body, "property", "og:title")), `${path} has Open Graph title`);
  record(Boolean(readMeta(body, "property", "og:description")), `${path} has Open Graph description`);
  record(readMeta(body, "property", "og:url") === `${CANONICAL_ORIGIN}${path}`, `${path} has Open Graph URL`);
  record(Boolean(readMeta(body, "property", "og:type")), `${path} has Open Graph type`);
  record(Boolean(readMeta(body, "name", "twitter:card")), `${path} has Twitter card metadata`);
  record(/<script[^>]+application\/ld\+json/i.test(body), `${path} has JSON-LD`);
}

await verifyRobots();
await verifySitemap();
await verifyAiTxt();

for (const path of pagePaths) {
  await verifyPage(path);
}

const failures = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} crawlability checks passed for ${baseUrl}`);

if (failures.length) {
  process.exitCode = 1;
}
