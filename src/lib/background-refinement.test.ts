import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_REFINEMENT_VERSION,
  buildApprovedRefinementSignalDraft,
  buildBackgroundRefinementAnalyticsEvent,
  buildBackgroundRefinementItems,
} from "@/lib/background-refinement";

test("structured refinement asks bounded questions for incomplete profile dimensions", () => {
  const items = buildBackgroundRefinementItems({
    causeAreas: ["Animal welfare"],
    offeredCapabilities: [],
    requestedCounterpartyKinds: [],
    verificationPreferences: [],
  });

  assert.ok(items.length >= 4);
  assert.equal(items[0]?.refinementVersion, BACKGROUND_REFINEMENT_VERSION);
  assert.ok(items.some((item) => item.fieldKey === "cause_priorities"));
  assert.ok(items.some((item) => item.fieldKey === "capability_tags"));
  assert.ok(items.some((item) => item.fieldKey === "verification_preferences"));
  assert.ok(items.every((item) => item.confidenceBefore === "low" || item.confidenceBefore === "medium"));
});

test("refinement analytics include counts and field keys but not answer text", () => {
  const items = buildBackgroundRefinementItems({
    causeAreas: [],
    offeredCapabilities: [],
    requestedCounterpartyKinds: [],
    verificationPreferences: [],
  });
  const event = buildBackgroundRefinementAnalyticsEvent({
    items,
    status: "completed",
  });
  const serialized = JSON.stringify(event);

  assert.equal(event.answerTextIncluded, false);
  assert.equal(event.summaryOnly, true);
  assert.equal(event.itemCount, items.length);
  assert.ok(event.fieldKeys.includes("cause_priorities"));
  assert.equal(serialized.includes("my exact private answer"), false);
});

test("approved refinement signal drafts do not change public preview state", () => {
  const draft = buildApprovedRefinementSignalDraft({
    answerValues: ["receipts", "operator review", "receipts"],
    fieldKey: "verification_preferences",
  });

  assert.deepEqual(draft?.map((signal) => signal.signalValue), ["receipts", "operator review"]);
  assert.equal(draft?.[0]?.source, "interview");
  assert.equal("publicPreview" in (draft?.[0] ?? {}), false);
});
