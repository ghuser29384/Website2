import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStartCreateHref } from "./start-paths";
import { getQuickBargain, QUICK_BARGAINS, QUICK_EXAMPLE } from "./quick-walkthrough";

const page = readFileSync("src/app/start/page.tsx", "utf8");
const intro = readFileSync("src/components/walkthrough/quick-walkthrough.tsx", "utf8");

test("creation preserves the existing signed-in and guest signup return paths", () => {
  assert.equal(getStartCreateHref(true), "/create");
  assert.equal(getStartCreateHref(false), "/signup?returnTo=/create");
  assert.match(page, /getStartCreateHref\(Boolean\(viewer\)\)/);
  assert.match(page, /getStartCreateHref\(false\)/);
});

test("the example explicitly compares additional contributions with the no-trade baseline", () => {
  assert.match(QUICK_EXAMPLE.noTrade, /neither makes this additional contribution/);
  assert.match(intro, /Illustrative example\. No payment or commitment is created/);
  assert.match(intro, /a fictional participant/);
  assert.match(intro, /not a threat/);
});

test("bargain outcomes include a refusal on either side and mutual acceptability", () => {
  assert.deepEqual(QUICK_BARGAINS.map(x => [x.youAgree, x.theyAgree]), [[true, false], [false, true], [true, true]]);
  assert.equal(getQuickBargain("c")?.donation, "$20");
  assert.equal(getQuickBargain("c")?.days, "30 days");
  assert.equal(getQuickBargain(null), null);
  assert.equal(getQuickBargain("unknown"), null);
});

test("responses are illustrative rather than preference scores or live counterparties", () => {
  assert.match(intro, /not measurements of your preferences/);
  assert.doesNotMatch(intro, /meter|Math\.random|matchingOpportunityCount|Verified match/);
});

test("example controls never submit, persist or initialize real records", () => {
  assert.doesNotMatch(intro, /fetch\(|localStorage|sessionStorage|document\.cookie|<form|use server/);
  assert.match(intro, /The example is not copied into your proposal/);
  assert.match(intro, /Opening the editor does not publish or accept a trade/);
  assert.match(intro, /prefetch=\{false\}/);
});

test("the introduction stays synchronous with independently streamed account-aware slots", () => {
  assert.match(page, /export default function StartPage\(\)/);
  assert.match(page, /cache\(\(\) => getViewer\(\)\)/);
  assert.match(page, /<QuickWalkthrough createAction=\{/);
  assert.doesNotMatch(page, /getMarketplaceOverview|StartServiceSnapshot|SiteFooter/);
});

test("skipping, optional full walkthrough, donation, pools and Profile remain reachable", () => {
  assert.match(intro, /Skip the example/);
  for (const href of ["/discover", "/walkthrough", "/donate", "/pools", "/profile"]) assert.ok(intro.includes(`href="${href}"`));
  assert.match(page, /<noscript>/);
});

test("payment, consent and evidence safeguards remain available", () => {
  assert.match(page, /<summary>Before you commit<\/summary>/);
  assert.match(page, /does not hold funds, offer escrow, or decide tax treatment/);
  assert.match(page, /cancellation rules before accepting/);
  assert.match(page, /not automatically reviewed or verified/);
  for (const href of ["/status", "/privacy", "/terms", "/accessibility", "/contact"]) assert.ok(page.includes(`href="${href}"`));
});

test("step navigation announces state and does not steal focus on initial page load", () => {
  assert.match(intro, /aria-current=\{step === index \? "step"/);
  assert.match(intro, /if \(moved\.current\) heading\.current\?\.focus/);
  assert.match(intro, /aria-live="polite"/);
});
