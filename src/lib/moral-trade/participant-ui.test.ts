import assert from "node:assert/strict";
import test from "node:test";

import {
  PARTICIPANT_UI_SAMPLE_SCREENS,
  evaluateParticipantUiContract,
  getMoralTradeParticipantUiContract,
  validateMoralTradeParticipantUiContract,
  validateRenderSnapshot,
  type MoralTradeParticipantUiSurfaceRecord,
} from "./participant-ui";

test("participant UI contract validates progressive disclosure surfaces", () => {
  const contract = getMoralTradeParticipantUiContract();
  const validation = validateMoralTradeParticipantUiContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.equal(contract.requiredSurfaces.length, 10);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_ui_render_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_explanation_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_plain_language_copy_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_task_cards"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_public_receipt_publication_reviews"));
});

test("missing participant surfaces fail closed", () => {
  const result = evaluateParticipantUiContract(
    PARTICIPANT_UI_SAMPLE_SCREENS.filter((screen) => screen.surface !== "final_lock_confirmation"),
    "2026-06-24T12:00:00.000Z",
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("surface_missing:final_lock_confirmation"));
});

test("final lock confirmation requires term sheet hash, material disclosures, and distinct CTA", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "final_lock_confirmation"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  screen.primaryAction = "Save draft";
  screen.materialDisclosures = screen.materialDisclosures.filter(
    (disclosure) => disclosure !== "term_sheet_hash" && disclosure !== "distinct_final_confirmation",
  );
  if (screen.renderSnapshot) {
    screen.renderSnapshot.primaryCtaLabel = "Save draft";
    screen.renderSnapshot.termSheetHashShown = null;
  }

  const result = evaluateParticipantUiContract([
    ...PARTICIPANT_UI_SAMPLE_SCREENS.filter((entry) => entry.surface !== "final_lock_confirmation"),
    screen,
  ]);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("final_lock_term_sheet_hash_missing"));
  assert.ok(result.blockers.includes("final_lock_distinct_confirmation_missing"));
  assert.ok(result.blockers.includes("final_lock_primary_action_not_distinct"));
  assert.ok(result.blockers.includes("render_snapshot_term_sheet_hash_missing:final_lock_confirmation"));
});

test("render snapshots bind screen type, CTA, accessibility, visible fields, and max exposure", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "draft_preview"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  assert.equal(validateRenderSnapshot(screen).status, "pass");

  if (screen.renderSnapshot) {
    screen.renderSnapshot.screenType = "template_gallery";
    screen.renderSnapshot.primaryCtaLabel = "Lock now";
    screen.renderSnapshot.maxExposureShown = null;
    screen.renderSnapshot.accessibilityAccommodationState.keyboardReachable = false;
  }

  const result = validateRenderSnapshot(screen);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("render_snapshot_screen_mismatch:draft_preview"));
  assert.ok(result.blockers.includes("render_snapshot_cta_mismatch:draft_preview"));
  assert.ok(result.blockers.includes("render_snapshot_max_exposure_missing:draft_preview"));
  assert.ok(result.blockers.includes("accessibility_copy_check_missing:draft_preview"));
});

test("internal jargon cannot be primary participant copy", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "review_queue_status"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  screen.oneSentenceSummary = "The release_gate and counterfactual_trust_assessment are pending.";

  const result = evaluateParticipantUiContract([
    ...PARTICIPANT_UI_SAMPLE_SCREENS.filter((entry) => entry.surface !== "review_queue_status"),
    screen,
  ]);

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "internal_jargon_primary_copy:review_queue_status:counterfactual_trust_assessment",
    ),
  );
  assert.ok(result.blockers.includes("internal_jargon_primary_copy:review_queue_status:release_gate"));
});

test("public receipt publication blocks engagement infrastructure and publication-as-trade-term", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "public_receipt_card_publication"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  assert.ok(screen.publicReceiptPolicy);
  screen.publicReceiptPolicy.publicEngagementCountersAllowed = true;
  screen.publicReceiptPolicy.publicationCanBeTradeTerm = true;
  screen.publicReceiptPolicy.separatesPersonalTradeConditionedAndTotal = false;

  const result = evaluateParticipantUiContract([
    ...PARTICIPANT_UI_SAMPLE_SCREENS.filter((entry) => entry.surface !== "public_receipt_card_publication"),
    screen,
  ]);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("receipt_engagement_counter_allowed:public_receipt_card_publication"));
  assert.ok(result.blockers.includes("receipt_publication_as_trade_term:public_receipt_card_publication"));
  assert.ok(result.blockers.includes("receipt_net_attribution_lines_required:public_receipt_card_publication"));
});
