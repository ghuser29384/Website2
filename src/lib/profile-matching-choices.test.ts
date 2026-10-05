import assert from "node:assert/strict";
import test from "node:test";
import { decodeProfileDraft, emptyProfileSetupValues, encodeProfileDraft, PROFILE_SETUP_LIMITS } from "./profile-setup-draft";
import { profileSetupPrivateFields } from "./profile-setup";
import { formatMatchingPreference, MATCHING_PREFERENCE_GROUPS, matchingPreferenceDetailsLimit, parseMatchingPreference } from "./profile-matching-choices";

test("selected choices and custom details survive draft recovery and the existing private submission", () => {
  const values = emptyProfileSetupValues();
  for (const group of MATCHING_PREFERENCE_GROUPS) {
    const selection = { selected: [group.options[0], group.options[2]], other: "A personal detail\nwith a second line." };
    values[group.name] = formatMatchingPreference(selection);
    assert.deepEqual(parseMatchingPreference(values[group.name], group.options), selection);
  }
  const restored = decodeProfileDraft(encodeProfileDraft("account-a", values), "account-a");
  assert.deepEqual(restored?.values, values);
  assert.deepEqual(profileSetupPrivateFields(values, false), {});
  assert.deepEqual(profileSetupPrivateFields(values, true), {
    uncertainty_notes: `User-stated outcomes: ${values.outcomes}`,
    capabilities: values.capabilities,
    constraints: values.limits,
  });
});

test("blank choices infer nothing and older free-response drafts remain verbatim", () => {
  for (const group of MATCHING_PREFERENCE_GROUPS) {
    assert.deepEqual(parseMatchingPreference("", group.options), { selected: [], other: "" });
    for (const value of ["No travel\nMax $20 per month", "Selected options:\n- Unknown legacy option", " ".repeat(1000)]) {
      const parsed = parseMatchingPreference(value, group.options);
      assert.deepEqual(parsed, { selected: [], other: value });
      assert.equal(formatMatchingPreference(parsed), value);
    }
    assert.equal(formatMatchingPreference({ selected: [], other: "" }), "");
  }
});

test("choice text and additional details together respect existing field limits", () => {
  for (const group of MATCHING_PREFERENCE_GROUPS) {
    for (const selected of [[], [...group.options]]) {
      const limit = matchingPreferenceDetailsLimit(group, selected);
      const value = formatMatchingPreference({ selected, other: "x".repeat(limit) });
      assert.equal(value.length, PROFILE_SETUP_LIMITS[group.name]);
      assert.deepEqual(parseMatchingPreference(value, group.options), { selected, other: "x".repeat(limit) });
    }
  }
});
