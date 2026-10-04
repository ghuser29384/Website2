import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { formatLocalDateTimeValue } from "../components/ui/local-date-time";
import { commitmentCountLabel, summarizeCommitmentRecords, type SummaryRecord } from "./commitments-summary";
import { recordedRespondentContribution, matchesRecordedContribution } from "./offer-discovery-facts";
import { isVerifiedEvidenceText, evidenceTextQuality } from "./smart-query-records";
import { matchesSmartVerificationConstraint, parseSmartQuery } from "./smart-query";

const source = (path: string) => readFileSync(path, "utf8");

test("English formatting ignores an inherited Chinese locale but preserves time zones", () => {
  const program = `
    const { formatLocalDateTimeValue } = require('./src/components/ui/local-date-time.tsx');
    const options = {weekday:'long',month:'long',day:'numeric',year:'numeric'};
    console.log(JSON.stringify({
      inherited: Intl.DateTimeFormat().resolvedOptions().locale,
      west: formatLocalDateTimeValue('2026-09-26T01:00:00Z', {options,timeZone:'America/Los_Angeles'}),
      east: formatLocalDateTimeValue('2026-09-26T01:00:00Z', {options,timeZone:'Asia/Tokyo'}),
      calendar: formatLocalDateTimeValue('2026-09-26', {options,timeZone:'America/Los_Angeles'})
    }));`;
  const run = spawnSync(process.execPath, ["--import", "tsx", "--eval", program], {
    encoding: "utf8", env: { ...process.env, LANG: "zh_CN.UTF-8", LC_ALL: "zh_CN.UTF-8" },
  });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.match(result.inherited, /^zh/);
  assert.equal(result.west.label, "Friday, September 25, 2026");
  assert.equal(result.east.label, "Saturday, September 26, 2026");
  assert.equal(result.calendar.label, "Saturday, September 26, 2026");
  assert.equal(formatLocalDateTimeValue("2026-02-30", {timeZone:"UTC"}), null);
});

test("explicit translated presentation remains possible without translating user records", () => {
  const value = formatLocalDateTimeValue("2026-09-26", {locale:"fr-FR",options:{month:"long"},timeZone:"UTC"});
  assert.equal(value?.label, "septembre");
  const greeting = source("src/components/commitments/commitments-local-greeting.tsx");
  assert.match(greeting, /Intl.DateTimeFormat\(INTERFACE_LOCALE/);
  assert.match(greeting, /now.getHours\(\)/);
});

for (const description of ["evidence required", "receipt required after completion", "not verified", "not reviewed", "reviewed and accepted", "unverified", ""]) {
  test(`proposal prose never establishes outcome state: ${description || "empty"}`, () => {
    const status = isVerifiedEvidenceText(description);
    assert.equal(status, null);
    assert.equal(matchesSmartVerificationConstraint({...parseSmartQuery("").facets, verified:true},status),false);
    assert.equal(matchesSmartVerificationConstraint({...parseSmartQuery("").facets, verified:false},status),false);
  });
}

test("negative evidence terms cannot receive a strong specificity score", () => {
  for (const value of ["not verified", "not reviewed", "no evidence", "evidence not required"]) assert.equal(evidenceTextQuality(value),0);
  assert.ok(evidenceTextQuality("dated receipt with independent review") > 0);
});

test("contribution filtering uses only the recorded one-time USD respondent amount", () => {
  const facets = parseSmartQuery("under $50", {surface:"offers"}).facets;
  const record = { requested_matching_amount_cents:1000, time_horizon:"one_off" as const, participation_mode:"direct" as const };
  const value = recordedRespondentContribution("offset",record);
  assert.deepEqual(value,{amountCents:1000,currency:"USD"});
  assert.equal(matchesRecordedContribution(facets,value),true);
  assert.equal(matchesRecordedContribution(facets,{amountCents:5000,currency:"USD"}),false);
  assert.equal(matchesRecordedContribution(facets,null),false);
  assert.equal(matchesRecordedContribution(parseSmartQuery("").facets,null),true);
  assert.equal(recordedRespondentContribution("pledge",record),null);
  assert.equal(recordedRespondentContribution("offset",{...record,time_horizon:"recurring"}),null);
  assert.equal(recordedRespondentContribution("offset",{...record,participation_mode:"pool"}),null);
  for(const amount of [-1, NaN, Infinity, 1.5]) assert.equal(recordedRespondentContribution("offset",{...record,requested_matching_amount_cents:amount}),null);
  const offers = source("src/app/offers/page.tsx");
  assert.doesNotMatch(offers,/extractMoneyAmountsCents|function offerAmounts/);
  assert.match(offers,/requested_matching_amount_cents,time_horizon,participation_mode/);
  assert.match(offers,/if \(result.error\)/);
});

test("each summary has stable count units and creation is not mistaken for activation", () => {
  const row: SummaryRecord = {lifecycle:"activated",createdAt:"2026-08-20T00:00:00Z",action:null,verifiedOutcome:false};
  const result = summarizeCommitmentRecords([row,{...row,lifecycle:"completed",createdAt:"2026-09-20T00:00:00Z",verifiedOutcome:true}],"2026-09-26T23:00:00Z");
  assert.deepEqual(result,{active:1,actionNeeded:0,underReview:0,createdThisMonth:1,verified:1});
  assert.equal(commitmentCountLabel(0,false),"Count unavailable");
  assert.equal(commitmentCountLabel(3,false),"3 found");
  assert.equal(commitmentCountLabel(0,true),"0");
  assert.equal(commitmentCountLabel(null,true),"Unavailable");
  assert.equal(summarizeCommitmentRecords([row],"invalid").createdThisMonth,null);
});

test("partial-record warnings precede totals and the empty cart does not show a projection", () => {
  const page = source("src/app/commitments/page.tsx");
  assert.ok(page.indexOf('data-testid="commitments-incomplete"') < page.indexOf('aria-label="Commitment summary"'));
  assert.match(page,/role="alert"/);
  assert.match(page,/Retry loading records/);
  assert.match(page,/data\.cartProjection\.itemCount > 0/);
  assert.match(page,/!data.availability.savedOffersComplete/);
  assert.doesNotMatch(page,/<h1[^>]*>Additional resources you caused\.|Activated this month|mechanisms`/);
  assert.match(page,/Calendar month in UTC/);
  const shared = source("src/components/marketplace/marketplace-components.tsx");
  assert.doesNotMatch(shared,/<strong>0 in planner|<em>Charged now/);
});

test("exact proposal labels identify parties rather than reversing the respondent's obligations", () => {
  const participant = source("src/components/marketplace/participant-offer-group.tsx");
  assert.match(participant,/<dt>Offer maker commits<\/dt>\s*<dd>\{offer.offer_action\}<\/dd>/);
  assert.match(participant,/<dt>Responding participant commits<\/dt>\s*<dd>\{offer.request_action\}<\/dd>/);
  assert.doesNotMatch(participant,/<dt>Get<\/dt>|<dt>Do<\/dt>/);
  assert.match(participant,/isOwner \? "Manage" : "Respond"/);
});

test("homepage boot has usable links, bounded independent requests, and no user JSON in document.write", () => {
  const home = source("public/moral-trade-live.html");
  assert.match(home,/<nav class="boot-nav"/);
  assert.match(home,/setTimeout\(\(\) => controller.abort\(\), 8000\)/);
  assert.doesNotMatch(home,/await Promise.all|accountJson|liveNowJson/);
  assert.ok(home.indexOf("document.close();") < home.indexOf("void accountPromise.then"));
  assert.match(home,/window.__MT_LIVE_ACCOUNT_BOOTSTRAP__ = payload/);
  assert.match(home,/mt:live-account-ready/);
  const identity = source("public/moral-trade-account-identity.js");
  assert.match(identity,/typeof window.__MT_LIVE_ACCOUNT_BOOTSTRAP__\?\.authenticated === "boolean"/);
});


test("unavailable account details never assert a signed-out state", () => {
  const bridge = source("public/moral-trade-live-account.js");
  assert.match(bridge, /account.status === "unavailable"/);
  assert.match(bridge, /Account details could not be loaded/);
  assert.match(bridge, /typeof source.authenticated === "boolean"/);
  assert.doesNotMatch(bridge, /catch\(\(\) => \({ authenticated: false }\)\)/);
  assert.match(source("src/app/commitments/page.tsx"), /if \(showAllCalendar\) retryParams.set\("calendar", "all"\)/);
});
