import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/start/page.tsx", "utf8");
const styles = readFileSync("src/app/start/start.module.css", "utf8");

test("Get Started asks one guest-routing question with exactly two destinations", () => {
  assert.match(page, /<h1 id="start-heading">Is this your first time here\?<\/h1>/);
  assert.match(page, /href="\/walkthrough"/);
  assert.match(page, /href="\/login"/);
  assert.equal((page.match(/className=\{styles\.choice\}|className=\{`\$\{styles\.choice\}/g) ?? []).length, 2);
  assert.ok(page.indexOf('href="/walkthrough"') < page.indexOf('href="/login"'));
});

test("new or reviewing visitors go to the walkthrough and informed visitors go to login", () => {
  assert.match(page, /Yes — or I want a review/);
  assert.match(page, /Open the walkthrough/);
  assert.match(page, /No — I know the main features/);
  assert.match(page, /Go to sign in/);
});

test("authenticated visitors never see the guest Get Started decision", () => {
  assert.match(page, /const viewer = await getViewer\(\)/);
  assert.match(page, /if \(viewer\) redirect\("\/feed"\)/);
});

test("the page does not repeat its own Get Started action or run marketplace logic", () => {
  assert.doesNotMatch(page, /getTopbarActions|primaryAction|getMarketplaceOverview|VISITOR_PATHS|QuickWalkthrough/);
  assert.match(page, /showSearch=\{false\}/);
  assert.doesNotMatch(page, /<form|useState|onClick|fetch\(/);
});

test("the two choices remain native, non-mutating links", () => {
  assert.equal((page.match(/prefetch=\{false\}/g) ?? []).length, 2);
  assert.doesNotMatch(page, /server action|use server|localStorage|sessionStorage/);
  assert.match(page, /aria-label="Choose how to continue"/);
});

test("the layout collapses to one column and retains visible focus", () => {
  assert.match(styles, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /\.choice:focus-visible/);
  assert.match(styles, /min-height:\s*188px/);
});
