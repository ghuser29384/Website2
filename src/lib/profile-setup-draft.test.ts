import assert from "node:assert/strict";
import test from "node:test";
import {
  clearProfileDraft, decodeProfileDraft, emptyProfileSetupValues, encodeProfileDraft,
  importGuestProfileNotes, isProfileSetupOwner, LEGACY_PROFILE_DRAFT_KEY, profileDraftKey,
  PROFILE_DRAFT_TTL_MS, readProfileDraft,
} from "./profile-setup-draft";
const now = Date.parse("2026-09-23T12:00:00Z");
const values = { ...emptyProfileSetupValues(), displayName: "Account A", username: "account-a", outcomes: "Private outcome A" };
function memory() {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
}
test("profile drafts bind both their key and envelope to the exact account", () => {
  const raw = encodeProfileDraft("account-a", values, now);
  assert.notEqual(profileDraftKey("account-a"), profileDraftKey("account-b"));
  assert.notEqual(profileDraftKey("account-a"), profileDraftKey(null));
  assert.equal(decodeProfileDraft(raw, "account-a", now)?.values.outcomes, "Private outcome A");
  assert.equal(decodeProfileDraft(raw, "account-b", now), null);
  assert.equal(decodeProfileDraft(raw, null, now), null);
});
test("account switching never falls back to another member or guest data", () => {
  const storage = memory();
  storage.setItem(profileDraftKey("account-a"), encodeProfileDraft("account-a", values, now));
  storage.setItem(profileDraftKey(null), encodeProfileDraft(null, values, now));
  assert.equal(readProfileDraft(storage, "account-b", now), null);
  assert.equal(readProfileDraft(storage, "account-a", now)?.values.displayName, "Account A");
  clearProfileDraft(storage, "account-b");
  assert.ok(storage.getItem(profileDraftKey("account-a")));
});
test("drafts expire, reject future timestamps, and cannot extend their own TTL", () => {
  const raw = encodeProfileDraft("account-a", values, now);
  assert.ok(decodeProfileDraft(raw, "account-a", now + PROFILE_DRAFT_TTL_MS - 1));
  assert.equal(decodeProfileDraft(raw, "account-a", now + PROFILE_DRAFT_TTL_MS), null);
  assert.equal(decodeProfileDraft(raw, "account-a", now - 1), null);
  const tampered = JSON.parse(raw); tampered.expiresAt += 1;
  assert.equal(decodeProfileDraft(JSON.stringify(tampered), "account-a", now), null);
  for (const malformed of ["null", "{}", "invalid", "[]", raw.replace('"version":1', '"version":0')]) {
    assert.equal(decodeProfileDraft(malformed, "account-a", now), null);
  }
});
test("expired and unowned legacy drafts are removed without ever being restored", () => {
  const storage = memory(); storage.setItem(LEGACY_PROFILE_DRAFT_KEY, JSON.stringify(values));
  storage.setItem(profileDraftKey("account-a"), encodeProfileDraft("account-a", values, now));
  assert.equal(readProfileDraft(storage, "account-a", now + PROFILE_DRAFT_TTL_MS), null);
  assert.equal(storage.map.size, 0);
});
test("explicit guest import copies matching notes, not identity or consent", () => {
  const member = { ...emptyProfileSetupValues(), displayName: "Member", username: "member", affiliation: "Member org" };
  const merged = importGuestProfileNotes(member, { ...values, affiliation: "Guest org", limits: "No travel" });
  assert.equal(merged.displayName, "Member"); assert.equal(merged.username, "member");
  assert.equal(merged.affiliation, "Member org"); assert.equal(merged.outcomes, "Private outcome A");
  assert.equal(merged.limits, "No travel");
  const extra = { ...values, email: "not-for-storage@example.invalid", publicationConsent: true };
  const encoded = encodeProfileDraft("account-a", extra, now);
  assert.doesNotMatch(encoded, /email|publicationConsent|not-for-storage/);
});
test("server-side profile owner check rejects stale accounts and guest submissions", () => {
  assert.equal(isProfileSetupOwner("account-a", "account-a"), true);
  for (const wrong of ["account-b", "", null, undefined, { id: "account-a" }]) {
    assert.equal(isProfileSetupOwner(wrong, "account-a"), false);
  }
});
