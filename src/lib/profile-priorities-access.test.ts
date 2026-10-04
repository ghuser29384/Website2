import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const profile = read("../app/profile/page.tsx");
const setup = read("../components/profile/complete-profile-review.tsx");
const card = read("../components/profile/profile-priorities-card.tsx");
const alias = read("../app/100-sparks/page.tsx");
const editor = read("../components/profile/profile-priority-editor.tsx");
const dashboardTools = read("../components/dashboard/dashboard-tools.tsx");

test("Profile is only an alias for the Dashboard priority editor", () => {
  assert.match(profile, /permanentRedirect\(getProfileDashboardTarget\(await searchParams\)\)/);
  assert.doesNotMatch(profile, /getViewer|createClient|ProfilePrioritiesCard|<section/);
  const dashboard = read("../app/dashboard/page.tsx");
  assert.match(dashboard, /<ProfilePrioritiesView.*dashboard/);
});

test("the shared card clearly names the feature and navigates without a write", () => {
  assert.match(card, />Priorities<\/h2>/);
  assert.match(card, /Adjust priorities/);
  assert.match(card, /\/profile\/priorities\?returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(card, /prefetch=\{false\}/);
  assert.doesNotMatch(card, /<form|<details|localStorage|createClient|useEffect|onClick/);
});

test("the dashboard, editor, card, and legacy entry consistently name the feature Priorities", () => {
  assert.match(dashboardTools, /href="\/dashboard"[^>]*>\s*Priorities\s*<\/Link>/);
  assert.match(editor, /<h1 id="profile-priorities-heading">Priorities<\/h1>/);
  assert.match(card, /<h2 id="profile-priorities-card-heading">Priorities<\/h2>/);
  assert.match(alias, /title: "Priorities"/);
  for (const source of [dashboardTools, editor, card, alias]) {
    assert.doesNotMatch(source, /100 Sparks|Adjust your 100 sparks/);
  }
});

test("profile setup exposes the card outside its form and optional disclosure", () => {
  const cardPosition = setup.indexOf("<ProfilePrioritiesCard returnTo={returnTo} />");
  assert.ok(cardPosition > 0);
  assert.ok(cardPosition < setup.indexOf("<form action={completeWalkthroughProfileAction}"));
  assert.ok(cardPosition < setup.indexOf("<details"));
  assert.doesNotMatch(setup, /Advanced priority allocation/);
  assert.match(setup, /You can add your priorities and matching preferences whenever you’re ready/);
  assert.doesNotMatch(setup, /name="priority_allocation"/);
});

test("the named entry point reuses the existing authenticated editor", () => {
  assert.match(alias, /getSafeInternalPath\(requestedReturnTo, "\/profile"\)/);
  assert.match(alias, /redirect\(`\/profile\/priorities\?returnTo=/);
  assert.doesNotMatch(alias, /createClient|\.update\(|\.insert\(|localStorage/);
});

test("the canonical priorities view retains returned feedback", () => {
  assert.match(profile, /getProfileDashboardTarget\(await searchParams\)/);
  const view = read("../components/profile/profile-priorities-view.tsx");
  assert.match(view, /getFormMessage\(resolvedSearchParams\)/);
  assert.match(view, /\{formMessage\.text\}/);
  assert.match(view, /role=\{formMessage\.tone === "error" \? "alert" : "status"\}/);
});

test("surfacing priorities retains account isolation and opt-in setup", () => {
  assert.match(setup, /profile_owner_id/);
  assert.match(setup, /session\?\.user\.id \?\? null/);
  assert.match(setup, /setAccountChanged\(true\)/);
  assert.match(setup, /const \[remember, setRemember\] = useState\(false\)/);
  assert.match(setup, /const \[savePreferences, setSavePreferences\] = useState\(false\)/);
  assert.match(setup, /Skip setup and browse/);
});
