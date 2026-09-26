import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/offers/page.tsx", "utf8");
const directoryCss = readFileSync("src/app/offers/offers-density.module.css", "utf8");
const participantCss = readFileSync("src/components/marketplace/participant-offer-group.module.css", "utf8");
const participant = readFileSync("src/components/marketplace/participant-offer-group.tsx", "utf8");

function rule(source: string, selector: string) {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `Missing CSS rule: ${selector}`);
  return source.slice(start, source.indexOf("}", start) + 1);
}

test("directory has one compact title, not a poster sidebar or overlaid context", () => {
  assert.equal(page.match(/<h1\b/g)?.length, 1);
  assert.match(page, /<h1 id="directory-heading">Live proposals<\/h1>/);
  assert.match(page, /<h2 className="sr-only">Open participant proposals<\/h2>/);
  assert.doesNotMatch(page, /<aside\b|densityStyles\.routeContext/);
  assert.match(rule(directoryCss, ".workspace"), /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(rule(directoryCss, ".introRail h1"), /font-size: clamp\(2rem, 3vw, 2\.65rem\)/);
});

test("masthead reserves separate real slots instead of positioning text over search", () => {
  const masthead = rule(directoryCss, ".shell .routeTopbar :global(.mt-site-topbar)");
  assert.match(masthead, /grid-template-areas: "brand nav search actions"/);
  assert.doesNotMatch(directoryCss, /\.routeContext\s*\{/);
  assert.match(rule(directoryCss, ".shell .routeTopbar :global(.mt-site-topbar .topbar-links)"), /overflow: visible/);
  assert.match(rule(directoryCss, ".shell .routeTopbar :global(.mt-site-topbar .topbar-actions)"), /flex-wrap: wrap/);
  assert.match(directoryCss, /@media \(max-width: 1120px\)/);
  assert.match(directoryCss, /@media \(max-width: 760px\)/);
});

test("search, native filters, and clear navigation survive the presentation change", () => {
  assert.match(page, /<SmartQueryForm\s+action="\/offers"/);
  assert.match(page, /queryName="search"\s+surface="offers"/);
  assert.match(page, /<input name="view" type="hidden" value="live"/);
  assert.match(page, /id="offers-search"\s+name="search"/);
  assert.match(page, /<details className=\{densityStyles\.filterDisclosure\}>/);
  assert.match(page, /<select defaultValue=\{mode\} name="mode">/);
  assert.match(page, /<select defaultValue=\{sort\} name="sort">/);
  assert.match(page, /<a href=\{buildLiveHref\(\{\}\)\}>Clear all<\/a>/);
  assert.match(page, /\{hasFilters \? \(\s*<div className=\{densityStyles\.activeState\}>/);
  assert.match(rule(directoryCss, ".filterDisclosure:not([open]) > .filterContent"), /display: none/);
});

test("directory help stays available below results rather than displacing them", () => {
  const results = page.indexOf('id="directory-results"');
  const help = page.indexOf("className={densityStyles.directoryHelp}");
  const related = page.indexOf("className={densityStyles.otherRoutes}");
  assert.ok(results >= 0 && help > results && related > help);
  const helpSource = page.slice(help, related);
  assert.match(helpSource, /<summary>Directory rule<\/summary>/);
  assert.match(helpSource, /Search never substitutes examples for live demand/);
  assert.match(helpSource, /href="\/donate"/);
  assert.match(helpSource, /href="\/offers\?view=templates"/);
});

test("full proposal titles wrap and primary actions retain a usable target", () => {
  const title = [...participantCss.matchAll(/\.offerHeading h4 \{[^}]*\}/g)].map((match) => match[0]).join("\n");
  assert.match(title, /overflow-wrap: anywhere/);
  assert.doesNotMatch(title, /overflow:\s*hidden|text-overflow|line-clamp/);
  assert.doesNotMatch(participantCss, /-webkit-line-clamp/);
  assert.match(rule(participantCss, ".primaryAction"), /min-height: 2\.75rem/);
  assert.match(rule(participantCss, ".disclosure summary"), /min-height: 2\.75rem/);
  assert.match(participant, /\{offer\.offered_cause\}[\s\S]*?\{offer\.requested_cause\}/);
  assert.match(participant, /\{isOwner \? "Manage" : "Respond"\}/);
});

test("live counts, error and empty states, and exact terms remain distinct", () => {
  assert.equal(page.match(/data-authoritative-directory="true"/g)?.length, 1);
  assert.equal(page.match(/data-directory-state="unavailable"/g)?.length, 1);
  assert.equal(page.match(/data-directory-state="empty"/g)?.length, 1);
  assert.match(page, /livePage\.total\.toLocaleString\(\)/);
  assert.match(page, /livePage\.items\.length\.toLocaleString\(\)/);
  assert.match(page, /participantGroups\.length\.toLocaleString\(\)/);
  assert.match(page, /buildLiveHref\(\{ facets, mode, page: page \+ 1, search, sort \}\)/);
  assert.match(participant, /data-participant-exact-terms-note/);
  assert.match(participant, /<form action=\{toggleCartAction\}>/);
  assert.match(participant, /data-proposal-disclosure/);
});

test("every page CSS-module reference still has a local selector", () => {
  const references = [...page.matchAll(/densityStyles\.(\w+)/g)].map((match) => match[1]);
  for (const name of new Set(references)) {
    assert.match(directoryCss, new RegExp(`\\.${name}(?=[\\s:{.,>])`), `Missing style: ${name}`);
  }
});
