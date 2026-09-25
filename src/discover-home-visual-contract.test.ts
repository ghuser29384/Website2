import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("public/moral-trade-discover.html", "utf8");
const styles = readFileSync("public/moral-trade-discover.css", "utf8");

test("Discover keeps the canonical masthead and accessible two-sided list", () => {
  for (const path of ["/feed", "/discover", "/safety", "/trades/new", "/commitments", "/evidence"]) {
    assert.ok(shell.includes(`href="${path}"`), `Missing canonical destination: ${path}`);
  }
  assert.match(shell, /<a\b[^>]*href="\/discover"[^>]*aria-current="page"[^>]*>Discover<\/a>/);
  assert.match(shell, /Skip to trades/);
  assert.match(shell, /role="search"/);
  assert.match(shell, /aria-live="polite"/);
  assert.match(styles, /--paper:\s*#f5f2e9/);
  assert.match(styles, /--blue:\s*#154cff/);
  assert.match(styles, /\.app-header\s*\{[^}]*background:\s*#050505/);
  assert.match(styles, /grid-template-columns: 1fr 1fr/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /\.exchange-grid \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\[hidden\] \{ display: none !important;/);
});

test("search and real destinations remain usable without a prototype overlay", () => {
  assert.match(shell, /id="command-input"/);
  assert.match(shell, /href="\/trades\/new">Post a trade/);
  assert.match(shell, /href="\/invite"/);
  assert.match(shell, /<noscript>[\s\S]*href="\/offers\?view=live"/);
  assert.doesNotMatch(shell, /overlay-root|inspector|lasso|data-action="pledge"/);
});
