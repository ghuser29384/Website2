import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const profile = read("../app/profile/page.tsx");
const setup = read("../components/profile/complete-profile-review.tsx");
const card = read("../components/profile/profile-priorities-card.tsx");
const alias = read("../app/100-sparks/page.tsx");

test("Profile exposes 100 Sparks before role-readiness details", () => {
  assert.match(profile, /import \{ ProfilePrioritiesCard \}/);
  const cardPosition = profile.indexOf('<ProfilePrioritiesCard returnTo="/profile" />');
  assert.ok(cardPosition > 0);
  assert.ok(cardPosition < profile.indexOf("Your role readiness"));
  assert.doesNotMatch(profile.slice(0, cardPosition), /<details/);
});

test("the shared card clearly names the feature and navigates without a write", () => {
  assert.match(card, />100 Sparks<\/h2>/);
  assert.match(card, /Adjust priorities/);
  assert.match(card, /\/profile\/priorities\?returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(card, /prefetch=\{false\}/);
  assert.doesNotMatch(card, /<form|<details|localStorage|createClient|useEffect|onClick/);
});

test("profile setup exposes the card outside its form and optional disclosure", () => {
  const cardPosition = setup.indexOf("<ProfilePrioritiesCard returnTo={returnTo} />");
  assert.ok(cardPosition > 0);
  assert.ok(cardPosition < setup.indexOf("<form action={completeWalkthroughProfileAction}"));
  assert.ok(cardPosition < setup.indexOf("<details"));
  assert.doesNotMatch(setup, /Advanced priority allocation/);
  assert.match(setup, /no tour or priority allocation is required/);
  assert.doesNotMatch(setup, /name="priority_allocation"/);
});

test("the named entry point reuses the existing authenticated editor", () => {
  assert.match(alias, /getSafeInternalPath\(requestedReturnTo, "\/profile"\)/);
  assert.match(alias, /redirect\(`\/profile\/priorities\?returnTo=/);
  assert.doesNotMatch(alias, /createClient|\.update\(|\.insert\(|localStorage/);
});

test("Profile displays feedback when priority saving returns to it", () => {
  assert.match(profile, /getFormMessage\(await searchParams\)/);
  assert.match(profile, /\{formMessage\.text\}/);
  assert.match(profile, /role=\{formMessage\.tone === "error" \? "alert" : "status"\}/);
});

test("surfacing priorities retains account isolation and opt-in setup", () => {
  assert.match(setup, /profile_owner_id/);
  assert.match(setup, /session\?\.user\.id \?\? null/);
  assert.match(setup, /setAccountChanged\(true\)/);
  assert.match(setup, /const \[remember, setRemember\] = useState\(false\)/);
  assert.match(setup, /const \[savePreferences, setSavePreferences\] = useState\(false\)/);
  assert.match(setup, /Skip setup and browse/);
});
