import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/components/home/home-page.tsx", "utf8");
const site = readFileSync("src/lib/site.ts", "utf8");
const siteSearch = readFileSync("src/lib/site-search.ts", "utf8");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");

test("the Research section and public Research route stay retired", () => {
  assert.equal(existsSync("src/app/research/page.tsx"), false);
  assert.doesNotMatch(home, /Research supplies the theory|href="\/research"/);
  assert.doesNotMatch(site, /href: "\/research"/);
  assert.doesNotMatch(siteSearch, /href: "\/research"/);
  assert.doesNotMatch(sitemap, /getAbsoluteUrl\("\/research"\)/);
});
