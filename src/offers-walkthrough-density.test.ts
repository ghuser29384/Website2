import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const densityStyles = readFileSync("src/app/offers/offers-density.module.css", "utf8");
const disclosureStyles = readFileSync("src/app/offers/offer-plane-disclosure.module.css", "utf8");
const planeMount = readFileSync("src/app/offers/offer-plane-inline-mount.tsx", "utf8");
const offersLayout = readFileSync("src/app/offers/layout.tsx", "utf8");
const topbarStyles = readFileSync("src/app/offers/offers-topbar.module.css", "utf8");
const participantComponent = readFileSync("src/components/marketplace/participant-offer-group.tsx", "utf8");
const participantStyles = readFileSync("src/components/marketplace/participant-offer-group.module.css", "utf8");
const qaCapture = readFileSync("scripts/capture-rendered-qa-offers.mjs", "utf8");
const qaConfig = readFileSync("playwright.smart-query.config.ts", "utf8");
const qaSupabase = readFileSync("scripts/rendered-qa-supabase.mjs", "utf8");
const renderedQa = readFileSync("tests/offers-density.spec.ts", "utf8");
const smartQueryQa = readFileSync(".github/workflows/smart-query-qa.yml", "utf8");

test("offers defaults to an open editorial directory instead of stacked dense panels", () => {
  const offersPage = readFileSync("src/app/offers/page.tsx", "utf8");

  assert.match(
    densityStyles,
    /\.scope :global\(\.mt-beta-strip\)\s*\{\s*display:\s*none;\s*\}/,
    "the route-scoped beta strip must stay out of the compact Offers workspace",
  );
  assert.match(
    densityStyles,
    /\.workspace \{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-areas:/,
    "the Offers route must retain its CSS-module workspace",
  );
  assert.match(
    densityStyles,
    /\.directoryForm \{[\s\S]*?grid-area:\s*controls;[\s\S]*?display:\s*grid;/,
    "search and filtering must remain in the directory control rail",
  );
  assert.match(
    densityStyles,
    /\.groupList \{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0\.85rem;/,
    "participant groups must remain one authoritative compact list",
  );
  assert.match(offersPage, /className=\{densityStyles\.workspace\}/);
  assert.match(offersPage, /className=\{densityStyles\.directoryForm\}/);
  assert.match(offersPage, /className=\{densityStyles\.groupList\}/);
  assert.equal(
    offersPage.match(/data-authoritative-directory="true"/g)?.length,
    1,
    "the Offers page must render exactly one authoritative directory",
  );

  const authoritativeIndex = offersPage.indexOf('data-authoritative-directory="true"');
  const unavailableIndex = offersPage.indexOf('data-directory-state="unavailable"', authoritativeIndex);
  const populatedBranchIndex = offersPage.indexOf(") : livePage.items.length ? (", unavailableIndex);
  const groupListIndex = offersPage.indexOf("className={densityStyles.groupList}", populatedBranchIndex);
  const emptyIndex = offersPage.indexOf('data-directory-state="empty"', groupListIndex);
  assert.ok(
    authoritativeIndex >= 0 &&
      unavailableIndex > authoritativeIndex &&
      populatedBranchIndex > unavailableIndex &&
      groupListIndex > populatedBranchIndex &&
      emptyIndex > groupListIndex,
    "unavailable, populated, and empty states must remain mutually exclusive branches of the authoritative directory",
  );
  assert.equal(offersPage.match(/data-directory-state="unavailable"/g)?.length, 1);
  assert.equal(offersPage.match(/data-directory-state="empty"/g)?.length, 1);

  const groupRule = participantStyles.match(/^\.group\s*\{[^}]*\}/m)?.[0] ?? "";
  assert.match(groupRule, /border-top:\s*1px solid var\(--offers-ink\);/);
  assert.match(groupRule, /border-bottom:\s*1px solid var\(--offers-ink\);/);
  assert.doesNotMatch(groupRule, /border-radius|box-shadow/);
  assert.match(
    participantStyles,
    /\.offer \{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0\.4rem;[\s\S]*?padding:\s*0\.58rem 0\.85rem 0\.52rem;[\s\S]*?contain-intrinsic-size:\s*auto 7\.6rem;/,
    "each proposal must retain compact row geometry",
  );
  assert.match(
    participantStyles,
    /\.offerHeading \{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto;/,
    "each proposal heading must reserve one compact primary-action column",
  );

  assert.equal(participantComponent.match(/\bdata-participant-offer-group\b/g)?.length, 1);
  assert.equal(participantComponent.match(/\sdata-participant-offer\s/g)?.length, 1);
  assert.match(participantComponent, /aria-labelledby=\{offerHeadingId\}/);
  assert.match(participantComponent, /aria-describedby=\{`\$\{offerDescriptionId\} \$\{truthNoteId\}`\}/);

  const offersMapIndex = participantComponent.indexOf("offers.map");
  const truthNoteIndex = participantComponent.indexOf("data-participant-exact-terms-note");
  const truthCopy = "These are the owner&apos;s exact published terms";
  assert.ok(offersMapIndex >= 0, "the participant component must render its proposal list");
  assert.ok(truthNoteIndex > offersMapIndex, "the participant truth note must follow the proposal list");
  assert.equal(
    participantComponent.match(/data-participant-exact-terms-note/g)?.length,
    1,
    "the participant truth note marker must occur exactly once",
  );
  assert.equal(
    participantComponent.split(truthCopy).length - 1,
    1,
    "the participant truth-note copy must occur exactly once",
  );
  assert.match(
    participantComponent,
    /\}\)\}\s*<\/div>\s*<p className=\{styles\.truthNote\} data-participant-exact-terms-note/,
    "the participant truth note must sit outside the mapped proposal rows",
  );

  const proposalTemplate = participantComponent.slice(offersMapIndex, truthNoteIndex);
  assert.equal(
    proposalTemplate.match(/data-testid="proposal-primary-action"/g)?.length,
    1,
    "each mapped proposal must define exactly one primary action",
  );
  assert.equal(
    proposalTemplate.match(/data-proposal-disclosure/g)?.length,
    1,
    "each mapped proposal must define exactly one native disclosure",
  );
  assert.match(proposalTemplate, /\{isOwner \? "Manage" : "Respond"\}/);

  const primaryActionIndex = proposalTemplate.indexOf('data-testid="proposal-primary-action"');
  const disclosureIndex = proposalTemplate.indexOf("<details");
  const disclosureEndIndex = proposalTemplate.indexOf("</details>", disclosureIndex);
  assert.ok(
    primaryActionIndex >= 0 && disclosureIndex > primaryActionIndex && disclosureEndIndex > disclosureIndex,
    "the single visible primary action must precede one complete native disclosure",
  );
  const disclosureSource = proposalTemplate.slice(disclosureIndex, disclosureEndIndex);
  for (const required of [
    "<dt>Get</dt>",
    "<dd>{offer.request_action}</dd>",
    "<dt>Do</dt>",
    "<dd>{offer.offer_action}</dd>",
    "Counteroffer",
    ">Ask</Link>",
    'saved ? "Remove saved" : "Save"',
    "Open full terms",
  ]) {
    assert.ok(disclosureSource.includes(required), `missing proposal-disclosure contract: ${required}`);
  }
});

test("the advanced challenge-return plane is optional, lazy-loaded, and request-deduplicated", () => {
  assert.match(planeMount, /if \(!queryState\.shouldShow \|\| !explorerOpen \|\| response\) return;/);
  assert.match(planeMount, /const requestRef = useRef/);
  assert.match(planeMount, /request\.attempt !== attempt/);
  assert.match(planeMount, /promise: loadOfferPlane\(\)/);
  assert.match(planeMount, /<details/);
  assert.match(planeMount, /Optional visual explorer/);
  assert.match(planeMount, /onToggle=\{\(event\) => \{/);
  assert.match(planeMount, /const isOpen = event\.currentTarget\.open;/);
  assert.match(planeMount, /setExplorerOpen\(isOpen\);/);
  assert.match(disclosureStyles, /\.disclosure\[open\] \.summaryIcon/);
  assert.equal(
    offersLayout.includes("OfferVisualDirectoryMount"),
    false,
    "the obsolete eager offer-plane enhancer must not fetch before the disclosure opens",
  );
});

test("the offers topbar stays compact after removing duplicate global search", () => {
  assert.match(offersLayout, /topbarStyles\.scope/);
  assert.doesNotMatch(
    densityStyles,
    /\.scope :global\(\.mt-site-topbar\)\s*\{[^}]*\bwidth:/,
    "the Offers route must retain the canonical full-bleed masthead width",
  );
  assert.match(topbarStyles, /grid-template-areas:\s*"brand nav actions";/);
  assert.match(topbarStyles, /"brand actions"\s*"nav nav";/);
  assert.match(topbarStyles, /grid-template-rows:\s*auto auto;/);
  assert.match(topbarStyles, /justify-content:\s*flex-start;/);
  assert.match(topbarStyles, /overflow-x:\s*auto;/);
  assert.match(topbarStyles, /\.brand \.mt-wordmark\)[\s\S]*?font-size:\s*clamp\(1rem, 4\.8vw, 1\.2rem\);/);
  assert.match(
    topbarStyles,
    /@media \(max-width: 760px\)[\s\S]*?\.mt-site-topbar\.topbar-with-search\)[\s\S]*?display:\s*grid;/,
  );
  assert.match(
    topbarStyles,
    /@media \(max-width: 360px\)[\s\S]*?grid-template-areas:\s*"brand"\s*"actions"\s*"nav";/,
  );
});

test("rendered offers QA isolates non-visual analytics and waits for used font faces", () => {
  assert.match(renderedQa, /page\.route\("\*\*\/api\/funnel-events"/);
  assert.match(renderedQa, /waitUntil:\s*"commit"/);
  assert.match(renderedQa, /form\[data-smart-query-surface=/);
  assert.match(renderedQa, /\[data-participant-offer\]/);
  assert.match(renderedQa, /document\.fonts\.load/);
  assert.match(renderedQa, /document\.fonts\.ready/);
  assert.doesNotMatch(renderedQa, /PW_TEST_SCREENSHOT_NO_FONTS_READY/);
  assert.doesNotMatch(renderedQa, /faces\.map\(\(face\) => face\.load\(\)\)/);
  assert.match(qaCapture, /items\.length === 0/);
  assert.match(qaCapture, /AbortSignal\.timeout\(15_000\)/);
  assert.match(qaConfig, /NEXT_PUBLIC_SUPABASE_URL:\s*mockURL/);
  assert.match(qaConfig, /rendered-qa-public-read/);
  assert.match(qaSupabase, /request\.method === "GET"/);
  assert.match(qaSupabase, /rendered-qa-ready/);
  assert.match(qaSupabase, /fixture\.items\.length === 0/);
  assert.match(qaSupabase, /response\.writeHead\(404/);
  assert.doesNotMatch(qaSupabase, /request\.method === "POST"/);
  assert.match(smartQueryQa, /capture-rendered-qa-offers\.mjs/);
  assert.match(smartQueryQa, /--config=playwright\.smart-query\.config\.ts/);
  assert.match(smartQueryQa, /--workers=1/);
});
