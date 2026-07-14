import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(contract.stableTermMap.if_i_do_nothing, "If I do nothing");
  assert.ok(contract.requiredLockSafeTemplateDefaultFacts.includes("money"));
  assert.ok(contract.requiredReceiptSafeTemplateDefaultFacts.includes("public_display"));
  assert.ok(contract.requiredReceiptPreviewQuestions.includes("not_moral_score_or_endorsement"));
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

test("task cards require approved copy policy, status, next action, stable terms, and safe defaults", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "draft_preview"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  screen.plainLanguageCopyPolicyRef = "";
  screen.taskCardStatusLabel = "";
  screen.nextAction = "Save draft";
  screen.primaryAction = "Save draft / Request review";
  screen.optionalDetailsDrawer = [];
  screen.stableTermKeys = screen.stableTermKeys.filter((termKey) => termKey !== "my_maximum_cost");
  screen.safeTemplateDefaultFactsShown = screen.safeTemplateDefaultFactsShown.filter(
    (fact) => fact !== "privacy",
  );

  const result = evaluateParticipantUiContract([
    ...PARTICIPANT_UI_SAMPLE_SCREENS.filter((entry) => entry.surface !== "draft_preview"),
    screen,
  ]);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("plain_language_copy_policy_missing:draft_preview"));
  assert.ok(result.blockers.includes("task_card_status_required:draft_preview"));
  assert.ok(result.blockers.includes("next_action_primary_action_mismatch:draft_preview"));
  assert.ok(result.blockers.includes("multiple_primary_actions:draft_preview"));
  assert.ok(result.blockers.includes("details_drawer_required:draft_preview"));
  assert.ok(result.blockers.includes("stable_term_key_missing:draft_preview:my_maximum_cost"));
  assert.ok(result.blockers.includes("safe_template_default_facts_missing:draft_preview"));
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

test("public receipt preview answers required plain-language publication questions", () => {
  const screen = structuredClone(
    PARTICIPANT_UI_SAMPLE_SCREENS.find((entry) => entry.surface === "public_receipt_card_preview"),
  ) as MoralTradeParticipantUiSurfaceRecord;

  screen.oneSentenceSummary = "The public_metric_release_policy will publish this receipt.";
  screen.publicReceiptPreviewQuestionsAnswered = screen.publicReceiptPreviewQuestionsAnswered?.filter(
    (question) => question !== "private_information_hidden",
  );

  const result = evaluateParticipantUiContract([
    ...PARTICIPANT_UI_SAMPLE_SCREENS.filter((entry) => entry.surface !== "public_receipt_card_preview"),
    screen,
  ]);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("receipt_preview_answers_missing:public_receipt_card_preview"));
  assert.ok(
    result.blockers.includes(
      "internal_jargon_primary_copy:public_receipt_card_preview:public_metric_release_policy",
    ),
  );
  assert.ok(result.blockers.includes("raw_enum_primary_copy:public_receipt_card_preview:public_metric_release_policy"));
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

test("participant UI migration creates first-class copy, task-card, explanation, and snapshot records", () => {
  const migration = readFileSync(
    "supabase/migrations/20260626_moral_trade_participant_ui_copy_task_card_records.sql",
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_participant_ui_render_snapshots/);
  assert.match(migration, /create table if not exists public\.moral_trade_participant_explanation_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_plain_language_copy_policies/);
  assert.match(migration, /create table if not exists public\.moral_trade_participant_task_cards/);
  assert.match(migration, /safe_template_default_facts_shown/);
  assert.match(migration, /public_receipt_preview_questions_answered/);
  assert.match(migration, /enable row level security/);
});

test("offer builder defaults pledge swaps to micro-pledge duration and self-attestation-first evidence", () => {
  const offerForm = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");

  assert.match(offerForm, /const MICRO_PLEDGE_DEFAULT_DURATION = "One meal"/);
  assert.match(offerForm, /const MICRO_PLEDGE_DEFAULT_DURATIONS = new Set/);
  assert.match(offerForm, /initialTemplate\?\.duration \?\? \(resolvedInitialMode === "pledge" \? MICRO_PLEDGE_DEFAULT_DURATION : "3 months"\)/);
  assert.match(offerForm, /useState\(initialReviewPeriod\)/);
  assert.match(offerForm, /getPledgeMaxObligationDaysForDuration\(initialReviewPeriod\)/);
  assert.match(offerForm, /function handleModeChange\(nextMode: OfferMode\)/);
  assert.match(offerForm, /function handleReviewPeriodChange\(nextDuration: string\)/);
  assert.match(offerForm, /setPledgeMaxObligationDays\(getPledgeMaxObligationDaysForDuration\(nextDuration\)\)/);
  assert.match(offerForm, /Use private self-attestation first/);
  assert.match(offerForm, /Use self-attestation or a dated private note before photos/);
  assert.match(offerForm, /Longer-duration pledges are manual-review exceptions/);
  assert.match(offerForm, /Default pledge durations are one meal, a few meals, one day, or a few days/);
  assert.equal(
    offerForm.includes('const [pledgeMaxObligationDays, setPledgeMaxObligationDays] = useState("30")'),
    false,
  );
  assert.equal(offerForm.includes('initialTemplate?.duration ?? "6 months"'), false);
  assert.equal(offerForm.includes("Use a public log, dated receipt"), false);
});
