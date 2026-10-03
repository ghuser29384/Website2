import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_CANONICAL_PARTICIPANT_STATUSES,
  BACKGROUND_UI_COPY_BUNDLE_HASH,
  BACKGROUND_UI_COPY_BUNDLE_VERSION,
  buildBackgroundParticipantScreenState,
  buildBackgroundTechnicalDetailsPanel,
  deriveBackgroundParticipantStatus,
  getBackgroundPlainLanguageTerm,
  getBackgroundUiCopyBundle,
  validateBackgroundUiLanguageContract,
} from "@/lib/background-ui-language";
import {
  evaluateBackgroundPolicyDecision,
  getActiveBackgroundReleaseManifest,
  getBackgroundPhaseStatusForDocs,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

test("bg84 UI-copy bundle binds the plain-language term map into the release manifest", () => {
  const manifest = getActiveBackgroundReleaseManifest();
  const status = getBackgroundPhaseStatusForDocs();
  const validation = validateBackgroundUiLanguageContract();

  assert.equal(validation.status, "pass");
  assert.equal(manifest.uiCopyBundleVersion, BACKGROUND_UI_COPY_BUNDLE_VERSION);
  assert.equal(manifest.uiCopyBundleHash, BACKGROUND_UI_COPY_BUNDLE_HASH);
  assert.equal(status.uiCopyBundleVersion, BACKGROUND_UI_COPY_BUNDLE_VERSION);
  assert.ok(manifest.uiCopyBundleHash.length >= 32);
});

test("bg84 plain-language labels preserve consent distinctions without default jargon", () => {
  const bundle = getBackgroundUiCopyBundle();
  const labels = Object.fromEntries(
    bundle.termMap.map((term) => [term.internalTerm, term.participantLabel]),
  );
  const defaultCopy = bundle.termMap
    .flatMap((term) => [term.participantLabel, term.shortExplanation, term.distinctionGuard])
    .join("\n");

  assert.equal(labels["delegate authorization"], "Find opportunities for me");
  assert.equal(labels["candidate exposure"], "Let others find me");
  assert.equal(labels["opportunity brief"], "Possible opportunity");
  assert.equal(labels["intro request"], "Ask to explore");
  assert.equal(labels["disclosure grant"], "Share exact details");
  assert.equal(labels["privacy freeze"], "Pause everything now");
  assert.equal(labels["delegate receipt"], "Activity receipt");
  assert.doesNotMatch(
    defaultCopy,
    /\b(policy decision|bundle hash|manifest|candidate handle|artifact transition|retention hold|anti-probing|rare-combination|internal blocker)\b/i,
  );
  assert.match(
    getBackgroundPlainLanguageTerm("privacy freeze")?.distinctionGuard ?? "",
    /does not claim retroactive erasure/,
  );
});

test("bg84 setup model uses exactly six stable questions", () => {
  const bundle = getBackgroundUiCopyBundle();

  assert.deepEqual(
    bundle.setupQuestions.map((question) => question.key),
    [
      "what_can_it_use",
      "what_should_it_look_for",
      "where_can_it_look",
      "who_may_see_preview",
      "run_and_notify",
      "permission_end",
    ],
  );
  assert.deepEqual(
    bundle.setupQuestions.map((question) => question.label),
    [
      "What can it use?",
      "What should it look for?",
      "Where can it look?",
      "Who may see a broad preview?",
      "How often should it run or notify?",
      "When should this permission end?",
    ],
  );
  assert.ok(bundle.setupQuestions.every((question) => question.underlyingControls.length > 0));
});

test("bg84 high-impact copy uses three-part privacy summaries without pressure copy", () => {
  const bundle = getBackgroundUiCopyBundle();

  for (const summary of bundle.privacySummaries) {
    assert.ok(summary.whatHappens.length > 20, summary.actionKey);
    assert.ok(summary.whatStaysHidden.length > 20, summary.actionKey);
    assert.ok(summary.howToStopOrUndo.length > 20, summary.actionKey);
    assert.doesNotMatch(
      `${summary.heading}\n${summary.whatHappens}\n${summary.whatStaysHidden}\n${summary.howToStopOrUndo}`,
      /\b(urgent|scarce|popular|don't miss|last chance|everyone|failure|lose this opportunity|shame)\b/i,
      summary.actionKey,
    );
  }
});

test("bg84 status vocabulary collapses internal states into canonical participant labels", () => {
  assert.deepEqual([...BACKGROUND_CANONICAL_PARTICIPANT_STATUSES], [
    "off",
    "ready",
    "waiting",
    "possible_opportunity",
    "needs_review",
    "paused",
    "stale_or_unavailable",
    "closed",
  ]);
  assert.equal(deriveBackgroundParticipantStatus({ enabled: false }), "off");
  assert.equal(
    deriveBackgroundParticipantStatus({ enabled: true, privacyFreezeActive: true }),
    "paused",
  );
  assert.equal(
    deriveBackgroundParticipantStatus({ enabled: true, opportunityAvailable: true }),
    "possible_opportunity",
  );
  assert.equal(
    deriveBackgroundParticipantStatus({ enabled: true, needsReview: true }),
    "needs_review",
  );
  assert.equal(
    deriveBackgroundParticipantStatus({ enabled: true, stale: true }),
    "stale_or_unavailable",
  );
  assert.equal(
    deriveBackgroundParticipantStatus({ closed: true, enabled: true, privacyFreezeActive: true }),
    "closed",
  );
});

test("bg84 screen-state DTOs provide progressive details without leaking internal candidate gates", () => {
  const screenState = buildBackgroundParticipantScreenState({
    actionKey: "share_exact_details",
    defaultExplanation: "Choose exact fields only after mutual consent and review.",
    screenKey: "test.disclosure",
    statusInput: { enabled: true, needsReview: true },
    technicalDetails: {
      broadSignalCategories: ["cause area", "trade mode", "candidate-specific gate"],
      outputSchemaVersion: "background-disclosure-grant-response-v1",
      policyDecisionReceiptRef: "bgpd_test",
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
      retentionWindow: "short-lived access",
    },
    whySeeingThis: "You opened a disclosure action for your own account.",
  });
  const technicalCopy = screenState.technicalDetails.rows
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");

  assert.equal(screenState.status, "needs_review");
  assert.equal(screenState.privacySummary.heading, "Share exact details");
  assert.equal(screenState.technicalDetails.collapsedByDefault, true);
  assert.match(technicalCopy, /withheld/);
  assert.doesNotMatch(
    technicalCopy,
    /\b(candidate-specific|hidden blocker|abuse heuristic|exact counterparty|raw source)\b/i,
  );
});

test("bg84 policy decisions snapshot the UI-copy bundle hash", () => {
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.opportunity_brief.list",
    actorRole: "participant",
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-brief-list-response-v2",
  });

  assert.equal(decision.verdict, "allow");
  assert.equal(decision.uiCopyBundleHash, BACKGROUND_UI_COPY_BUNDLE_HASH);
});

test("bg84 visible dashboard and explainer use the plain-language entry points", () => {
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const explainer = readFileSync("src/app/background-networking/page.tsx", "utf8");

  assert.match(dashboard, /buildBackgroundParticipantScreenState/);
  assert.match(dashboard, /Find opportunities for me|findOpportunitiesCopy/);
  assert.match(dashboard, /Let others find me|letOthersFindMeCopy/);
  assert.match(dashboard, /What happens/);
  assert.match(dashboard, /What stays hidden/);
  assert.match(dashboard, /How to stop or undo future access/);
  assert.match(explainer, /Five controlled steps from preview to disclosure/);
  assert.match(explainer, /Create a broad preview/);
  assert.match(explainer, /Compatibility is not consent/);
  assert.match(explainer, /No autonomous outreach/);
});
