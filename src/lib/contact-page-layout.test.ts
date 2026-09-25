import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/contact/page.tsx", "utf8");
const css = readFileSync("src/app/contact/contact.module.css", "utf8");

test("contact keeps the public metadata and existing support destinations", () => {
  assert.match(page, /canonical: "\/contact"/);
  assert.match(page, /getAbsoluteUrl\("\/contact"\)/);
  for (const href of [
    "mailto:support@moraltrade.org",
    "mailto:support@moraltrade.org?subject=Safety%20or%20baseline%20concern",
    "mailto:support@moraltrade.org?subject=Reviewer%20or%20evidence%20question",
    "mailto:support@moraltrade.org?subject=Network%20or%20partner%20inquiry",
  ]) {
    assert.ok(page.includes(`"${href}"`), `Missing existing destination: ${href}`);
  }
  assert.match(page, /href="\/status"/);
  assert.match(page, /<SiteFooter\s*\/>/);
});

test("the skip target includes the heading and all contact actions", () => {
  const main = page.slice(page.indexOf("<main "), page.indexOf("</main>"));
  assert.match(main, /id="main-content" tabIndex=\{-1\}/);
  assert.match(main, /<h1 id="contact-heading">Reach the Moral Trade team\.<\/h1>/);
  assert.match(main, /href="mailto:support@moraltrade\.org"/);
  assert.match(main, /contactRoutes\.map/);
  assert.match(main, /<ol className=\{styles\.steps\}>/);
  assert.equal((main.match(/<li>/g) ?? []).length, 3);
  assert.ok(main.indexOf("contactRoutes.map") < main.indexOf("<aside"));
});

test("contact retains the safety and recourse guidance", () => {
  for (const text of [
    "Safety or coercion concern",
    "Reviewer or evidence question",
    "Network or partner inquiry",
    "Include links, screenshots, or public IDs when you can share them safely.",
    "Threat, baseline, evidence, privacy, externality, or payment-route concern.",
    "Request operator review, reviewer challenge, correction, or onboarding guidance.",
  ]) {
    assert.ok(page.includes(text), `Missing existing guidance: ${text}`);
  }
});

test("the cleanup remains server-rendered and keeps authentication in the shared topbar", () => {
  assert.doesNotMatch(page, /["']use client["']/);
  assert.match(page, /const viewer = await getViewer\(\)/);
  assert.match(page, /links=\{getPrimaryNavLinks\(Boolean\(viewer\)\)\}/);
  assert.match(page, /\.\.\.getTopbarActions\(Boolean\(viewer\)\)/);
  assert.match(page, /showLogout=\{Boolean\(viewer\)\}/);
  assert.doesNotMatch(page, /<form\b|dangerouslySetInnerHTML|fetch\(/);
});

test("route-local styling replaces the legacy marketing hero and card stack", () => {
  assert.match(page, /import styles from "\.\/contact\.module\.css"/);
  assert.match(page, /data-mt-surface="contact"/);
  assert.doesNotMatch(page, /className="(?:hero|hero-grid|hero-copy|hero-panel|flow-card|data-grid)/);
  assert.match(css, /\.page \.masthead :global\(\.mt-site-topbar\)/);
  assert.match(css, /flex-direction: row;\n  flex-wrap: nowrap/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /grid-template-areas: "brand search actions" "nav nav nav"/);
  assert.match(css, /font-size: clamp\(2rem, 3\.5vw, 3rem\)/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.doesNotMatch(css, /(?:^|\n)(?:body|html|:global\()/);
});
