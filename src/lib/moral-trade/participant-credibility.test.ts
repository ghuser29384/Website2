import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceParticipantCredibility } from "@/app/api/moral-trade/participant-credibility/enforce/route";

import {
  MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY,
  applyFriendTestimonialToParticipantCredibility,
  assessFriendTestimonialQuality,
  buildFunderEvidenceSummary,
  buildParticipantVisibleTestimonialSummary,
  buildPublicTestimonialReportSummary,
  calculateOptionalTestimonialStakeMinor,
  createCredibilityAppealCorrectionEvent,
  createFriendTestimonialInvite,
  createOptionalStakePolicy,
  declineFriendTestimonialInvite,
  getMoralTradeParticipantCredibilityContract,
  lintOrdinaryCredibilityCopy,
  submitFriendTestimonial,
  validateMoralTradeParticipantCredibilityContract,
  type FriendTestimonialInvite,
  type ParticipantCredibilityProfile,
} from "./participant-credibility";

const NOW = "2026-06-26T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stats = statSync(path);

    return stats.isDirectory() ? listFiles(path) : [path];
  });
}

function participantProfile(overrides: Partial<ParticipantCredibilityProfile> = {}): ParticipantCredibilityProfile {
  return {
    appealStatus: "none",
    credibilityScoreDecimal: 0.55,
    credibilityTier: "standard",
    evidenceReliabilityDecimal: 0.58,
    expectedCompletionProbabilityDecimal: 0.62,
    fraudRiskDecimal: 0.12,
    futureVerificationBurden: "standard",
    lastCredibilityEventId: null,
    participantUserId: "participant-a",
    updatedAt: NOW,
    ...overrides,
  };
}

function invite(overrides: Partial<FriendTestimonialInvite> = {}) {
  return {
    ...createFriendTestimonialInvite({
      actionType: "avoid_meat_fish",
      actionWindowEndAt: "2026-07-03T00:00:00.000Z",
      actionWindowStartAt: "2026-07-01T00:00:00.000Z",
      invitedFriendUserId: "friend-a",
      now: NOW,
      participantProvidedContext: "Two-day no-meat pledge.",
      participantUserId: "participant-a",
      pledgeSwapId: "pledge-swap:no-meat-2-day",
      relationshipClaimedByParticipant: "friend",
      tokenSeed: "invite-seed-a",
    }).invite,
    ...overrides,
  };
}

function submittedTestimonial() {
  const submission = submitFriendTestimonial(invite(), {
    actionTemplateId: "action-template:no-meat-2-day",
    baselineBasisJson: ["I have eaten with them often.", "I know their ordinary food habits."],
    baselineCounterfactualCredenceDecimal: 0.8,
    baselineKnowledgeLevel: "high",
    completionBasisJson: ["I ate with them during the action window.", "I saw messages relevant to the action."],
    completionCredenceDecimal: 0.85,
    completionKnowledgeLevel: "high",
    concernFlag: "none",
    friendTermsAcceptanceId: "terms:friend-testimonial:v1",
    friendUserId: "friend-a",
    relationshipType: "friend",
    submittedAt: NOW,
    testimonyTextPrivate: "We ate together and discussed the pledge during the action window.",
  });

  assert.equal(submission.ok, true);
  return submission.testimonial;
}

test("participant credibility contract validates model names, privacy boundaries, and seed demo", () => {
  const contract = getMoralTradeParticipantCredibilityContract();
  const validation = validateMoralTradeParticipantCredibilityContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.modelNames.includes("ParticipantCredibilityProfile"));
  assert.ok(contract.modelNames.includes("CredibilityEvent"));
  assert.ok(contract.modelNames.includes("CredibilityScoringPolicy"));
  assert.ok(contract.modelNames.includes("CredibilityAppeal"));
  assert.ok(!contract.modelNames.some((name) => /CreditEvent|CreditScoringPolicy|CreditAppeal|ReliabilityProfile/.test(name)));
  assert.equal(contract.ordinaryUiPreferredTerm, "Participant credibility");
  assert.match(contract.privacyBoundary, /private evidence by default/i);
  assert.equal(contract.seedDemo.participants.length, 4);
});

test("ordinary UI terminology uses credibility and rejects social-credit wording", () => {
  assert.equal(
    lintOrdinaryCredibilityCopy("Participant credibility can help reviewers estimate future completion.").status,
    "pass",
  );
  assert.deepEqual(lintOrdinaryCredibilityCopy("Show the user's social credit score.").blockers, [
    "ordinary_ui_banned_credibility_term:social credit",
    "ordinary_ui_banned_credibility_term:credit score",
  ]);

  const ordinaryUiFiles = [
    ...listFiles(join(process.cwd(), "src/app")),
    ...listFiles(join(process.cwd(), "src/components")),
  ].filter((path) => /\.(tsx|ts)$/.test(path));
  const bannedHits = ordinaryUiFiles.flatMap((path) => {
    const source = readFileSync(path, "utf8").toLowerCase();
    return ["social credit", "credit score", "reputation score"].flatMap((term) =>
      source.includes(term) ? [`${path}:${term}`] : [],
    );
  });

  assert.deepEqual(bannedHits, []);
});

test("participant can invite and friend can decline without exposing private refusal reason", () => {
  const result = createFriendTestimonialInvite({
    actionType: "avoid_meat_fish",
    actionWindowEndAt: "2026-07-03T00:00:00.000Z",
    actionWindowStartAt: "2026-07-01T00:00:00.000Z",
    existingPendingInviteCount: 2,
    invitedFriendUserId: "friend-a",
    now: NOW,
    participantProvidedContext: "Two-day no-meat pledge.",
    participantUserId: "participant-a",
    pledgeSwapId: "pledge-swap:no-meat-2-day",
    tokenSeed: "invite-seed-a",
  });

  assert.equal(result.ok, true);
  assert.equal(result.invite.inviteStatus, "pending");
  assert.deepEqual(result.invite.hiddenFromInvite.slice(0, 3), [
    "funder identities",
    "payout details",
    "private baseline answers",
  ]);

  const declined = declineFriendTestimonialInvite(result.invite, NOW);
  assert.equal(declined.invite.inviteStatus, "declined");
  assert.equal(declined.friendVisibleStatus, "declined_without_penalty");
  assert.equal(declined.privateRefusalReasonVisibleToParticipant, false);

  const blocked = createFriendTestimonialInvite({
    actionType: "avoid_meat_fish",
    actionWindowEndAt: "2026-07-03T00:00:00.000Z",
    actionWindowStartAt: "2026-07-01T00:00:00.000Z",
    existingPendingInviteCount: 3,
    invitedFriendUserId: "friend-b",
    participantUserId: "participant-a",
    tokenSeed: "invite-seed-b",
  });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.blockers.includes("friend_invite_policy_limit_reached"));
});

test("friend testimonial form captures separate credences and creates receipt, audit event, and access log", () => {
  const submission = submitFriendTestimonial(invite(), {
    actionTemplateId: "action-template:no-meat-2-day",
    baselineBasisJson: ["I have eaten with them often."],
    baselineCounterfactualCredenceDecimal: 0.8,
    baselineKnowledgeLevel: "high",
    completionBasisJson: ["I ate with them during the action window."],
    completionCredenceDecimal: 0.85,
    completionKnowledgeLevel: "high",
    concernFlag: "none",
    friendTermsAcceptanceId: "terms:friend-testimonial:v1",
    friendUserId: "friend-a",
    relationshipType: "friend",
    submittedAt: NOW,
  });

  assert.equal(submission.ok, true);
  assert.equal(submission.testimonial.baselineCounterfactualCredenceDecimal, 0.8);
  assert.equal(submission.testimonial.completionCredenceDecimal, 0.85);
  assert.equal(submission.receipt.privateReceipt, true);
  assert.equal(submission.auditEvent.action, "friend_testimonial_submitted");
  assert.equal(submission.accessLog.rawTestimonyVisibleToFunders, false);
  assert.equal(submission.accessLog.rawTestimonyVisibleToPublic, false);
});

test("private concern reports route to review without showing raw concern notes to participant", () => {
  const submission = submitFriendTestimonial(invite(), {
    actionTemplateId: "action-template:no-meat-2-day",
    baselineBasisJson: ["I only have weak contextual knowledge."],
    baselineCounterfactualCredenceDecimal: 0.5,
    baselineKnowledgeLevel: "low",
    completionBasisJson: ["I only have weak secondhand knowledge."],
    completionCredenceDecimal: 0.3,
    completionKnowledgeLevel: "low",
    concernFlag: "possible_pressure",
    concernNotesPrivate: "The participant asked me to say I observed meals that I did not observe.",
    friendTermsAcceptanceId: "terms:friend-testimonial:v1",
    friendUserId: "friend-c",
    relationshipType: "classmate",
    submittedAt: NOW,
  });
  const visible = buildParticipantVisibleTestimonialSummary(submission.testimonial);
  const assessment = assessFriendTestimonialQuality({
    context: { concernLaterSupported: true, otherEvidenceConsistency: "unresolved" },
    friendProfile: { testimonialCredibilityDecimal: 0.6, verifiedAccount: true },
    testimonial: submission.testimonial,
  });
  const impact = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context: { concernLaterSupported: true, otherEvidenceConsistency: "unresolved" },
    friendTestimonialCredibilityDecimal: 0.6,
    participantProfile: participantProfile({ participantUserId: "participant-c" }),
    testimonial: submission.testimonial,
  });

  assert.equal(submission.testimonial.testimonialStatus, "under_review");
  assert.equal(submission.auditEvent.privateConcernRoutedToRiskReview, true);
  assert.equal(visible.concernNotesPrivateVisible, false);
  assert.ok(assessment.riskReviewFlags.includes("coercion_or_pressure_risk_review"));
  assert.ok(impact.participantCredibilityDeltaDecimal < 0);
  assert.ok((impact.friendTestimonialCredibilityEvent?.deltaDecimal ?? 0) > 0);
});

test("friend testimony affects evidence quality, additionality, verification, and credibility only through capped frozen policy", () => {
  const testimonial = submittedTestimonial();
  const assessment = assessFriendTestimonialQuality({
    context: { otherEvidenceConsistency: "consistent" },
    friendProfile: { testimonialCredibilityDecimal: 0.82, verifiedAccount: true },
    testimonial,
  });
  const impact = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context: { highStakesPledgeSwap: true, otherEvidenceConsistency: "consistent" },
    friendTestimonialCredibilityDecimal: 0.82,
    participantProfile: participantProfile(),
    testimonial,
  });

  assert.equal(impact.status, "pass");
  assert.ok(impact.evidenceQualityDeltaDecimal > 0);
  assert.ok(impact.finalAdditionalityProbabilityDeltaDecimal > 0);
  assert.ok(impact.verificationConfidenceDeltaDecimal > 0);
  assert.ok(impact.participantCredibilityDeltaDecimal > 0);
  assert.ok(
    impact.evidenceQualityDeltaDecimal <=
      MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY.maxSingleTestimonialEvidenceQualityDeltaDecimal,
  );
  assert.ok(
    impact.participantCredibilityDeltaDecimal <=
      MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY.maxSingleTestimonialCredibilityDeltaDecimal,
  );
  assert.equal(impact.canTestimonialAloneVerify, false);
  assert.equal(impact.fixedPostActionConsiderationAdjustmentMinor, 0);
  assert.match(impact.policyEvaluationTrace?.policyHash ?? "", /^sha256:/);

  const stalePolicy = {
    ...MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY,
    status: "draft" as const,
  };
  const blocked = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context: { otherEvidenceConsistency: "consistent" },
    friendTestimonialCredibilityDecimal: 0.82,
    participantProfile: participantProfile(),
    policy: stalePolicy,
    testimonial,
  });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("frozen_active_credibility_policy_required"));
});

test("unsupported extreme testimony receives little weight and anti-gaming flags trigger review", () => {
  const submission = submitFriendTestimonial(invite(), {
    actionTemplateId: "action-template:no-meat-2-day",
    baselineBasisJson: [],
    baselineCounterfactualCredenceDecimal: 0.99,
    baselineKnowledgeLevel: "none",
    completionBasisJson: [],
    completionCredenceDecimal: 0.99,
    completionKnowledgeLevel: "none",
    friendTermsAcceptanceId: "terms:friend-testimonial:v1",
    friendUserId: "friend-b",
    relationshipType: "other",
    submittedAt: NOW,
  });
  const assessment = assessFriendTestimonialQuality({
    context: {
      friendSubmittedRecentTestimonialCount: 10,
      otherEvidenceConsistency: "unresolved",
      reciprocalTestimonialCount: 2,
      repeatedSmallGroupCount: 4,
      samePaymentInstrument: true,
      templatedTextDetected: true,
    },
    friendProfile: { testimonialCredibilityDecimal: 0.4, verifiedAccount: false },
    testimonial: submission.testimonial,
  });
  const impact = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context: { otherEvidenceConsistency: "unresolved" },
    friendTestimonialCredibilityDecimal: 0.4,
    participantProfile: participantProfile({ participantUserId: "participant-b" }),
    testimonial: submission.testimonial,
  });

  assert.ok(assessment.riskReviewFlags.includes("reciprocal_testimonial_ring_review"));
  assert.ok(assessment.riskReviewFlags.includes("repeated_small_group_review"));
  assert.ok(assessment.riskReviewFlags.includes("suspicious_testimonial_volume_review"));
  assert.ok(assessment.riskReviewFlags.includes("unsupported_extreme_baseline_credence_review"));
  assert.equal(assessment.acceptedForAdditionality, false);
  assert.equal(assessment.acceptedForCompletionVerification, false);
  assert.ok(impact.evidenceQualityDeltaDecimal < 0.02);
});

test("optional testimonial stakes are not mandatory and capped when enabled", () => {
  assert.equal(
    calculateOptionalTestimonialStakeMinor({
      considerationAmountMinor: 5_000,
      testimonyKind: "supportive",
    }),
    null,
  );
  assert.equal(
    calculateOptionalTestimonialStakeMinor({
      considerationAmountMinor: 5_000,
      policy: createOptionalStakePolicy(),
      testimonyKind: "concern",
    }),
    null,
  );
  assert.equal(
    calculateOptionalTestimonialStakeMinor({
      considerationAmountMinor: 5_000,
      policy: createOptionalStakePolicy(),
      testimonyKind: "supportive",
    }),
    100,
  );
  assert.equal(
    calculateOptionalTestimonialStakeMinor({
      considerationAmountMinor: 100_000,
      policy: createOptionalStakePolicy(),
      testimonyKind: "supportive",
    }),
    1_000,
  );
});

test("contradicted supportive testimony reduces friend credibility through append-only event", () => {
  const testimonial = submittedTestimonial();
  const assessment = assessFriendTestimonialQuality({
    context: { directEvidenceContradiction: true, otherEvidenceConsistency: "contradicted" },
    friendProfile: { testimonialCredibilityDecimal: 0.78, verifiedAccount: true },
    testimonial,
  });
  const impact = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context: { directEvidenceContradiction: true, otherEvidenceConsistency: "contradicted" },
    friendTestimonialCredibilityDecimal: 0.78,
    participantProfile: participantProfile({ participantUserId: "participant-d" }),
    testimonial,
  });
  const correction = createCredibilityAppealCorrectionEvent({
    correctionDeltaDecimal: 0.02,
    participantProfile: participantProfile({ participantUserId: "participant-d" }),
    sourceEventId: impact.participantCredibilityEvent?.id ?? "credibility-event:missing",
  });

  assert.equal(impact.friendTestimonialCredibilityEvent?.eventType, "contradicted_testimony");
  assert.ok((impact.friendTestimonialCredibilityEvent?.deltaDecimal ?? 0) < 0);
  assert.ok(impact.participantCredibilityDeltaDecimal < 0);
  assert.equal(correction.eventType, "pledge_swap_appeal_correction");
  assert.equal(correction.correctionOfEventId, impact.participantCredibilityEvent?.id);
});

test("funder and public summaries redact friend identity and raw testimony", () => {
  const testimonial = {
    ...submittedTestimonial(),
    testimonialStatus: "accepted" as const,
  };

  assert.equal(buildFunderEvidenceSummary([testimonial]), "Evidence included one reviewed third-party testimonial.");
  assert.equal(
    buildPublicTestimonialReportSummary(1),
    "Some completions used reviewed third-party testimony. No participant or friend identities are public.",
  );
});

test("participant-credibility enforcement route fails closed on invalid JSON and previews invite/evaluate", async () => {
  const invalid = await enforceParticipantCredibility(
    new Request("http://localhost/api/moral-trade/participant-credibility/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.equal(invalidBody.ok, false);
  assert.equal(invalidBody.stateMutation, false);

  const inviteResponse = await enforceParticipantCredibility(
    new Request("http://localhost/api/moral-trade/participant-credibility/enforce", {
      body: JSON.stringify({
        invite: {
          actionType: "avoid_meat_fish",
          actionWindowEndAt: "2026-07-03T00:00:00.000Z",
          actionWindowStartAt: "2026-07-01T00:00:00.000Z",
          invitedFriendUserId: "friend-a",
          participantUserId: "participant-a",
          tokenSeed: "route-invite",
        },
        operation: "invite_friend_testimonial",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const inviteBody = await inviteResponse.json();
  assert.equal(inviteResponse.status, 200);
  assert.equal(inviteBody.ok, true);
  assert.equal(inviteBody.stateMutation, false);
  assert.equal(inviteBody.invite.inviteStatus, "pending");

  const evaluateResponse = await enforceParticipantCredibility(
    new Request("http://localhost/api/moral-trade/participant-credibility/enforce", {
      body: JSON.stringify({
        context: { highStakesPledgeSwap: true, otherEvidenceConsistency: "consistent" },
        form: {
          actionTemplateId: "action-template:no-meat-2-day",
          baselineBasisJson: ["I have eaten with them often."],
          baselineCounterfactualCredenceDecimal: 0.8,
          baselineKnowledgeLevel: "high",
          completionBasisJson: ["I ate with them during the action window."],
          completionCredenceDecimal: 0.85,
          completionKnowledgeLevel: "high",
          friendTermsAcceptanceId: "terms:friend-testimonial:v1",
          friendUserId: "friend-a",
          relationshipType: "friend",
        },
        friendProfile: { testimonialCredibilityDecimal: 0.82, verifiedAccount: true },
        invite: inviteBody.invite,
        operation: "evaluate_friend_testimonial",
        participantProfile: { participantUserId: "participant-a" },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const evaluateBody = await evaluateResponse.json();
  assert.equal(evaluateResponse.status, 200);
  assert.equal(evaluateBody.ok, true);
  assert.equal(evaluateBody.stateMutation, false);
  assert.equal(evaluateBody.impact.canTestimonialAloneVerify, false);
  assert.match(evaluateBody.impact.policyEvaluationTrace.policyHash, /^sha256:/);

  const formBody = new URLSearchParams();
  formBody.set("operation", "submit_friend_testimonial");
  formBody.set("invite_token", "friend-form-route");
  formBody.set("participant_user_id", "participant-a");
  formBody.set("friend_user_id", "friend-a");
  formBody.set("action_type", "avoid_meat_fish");
  formBody.set("action_template_id", "action-template:no-meat-2-day");
  formBody.set("action_window_start_at", "2026-07-01T00:00:00.000Z");
  formBody.set("action_window_end_at", "2026-07-03T00:00:00.000Z");
  formBody.set("relationship_type", "friend");
  formBody.set("baseline_knowledge_level", "high");
  formBody.set("baseline_counterfactual_credence_decimal", "0.8");
  formBody.append("baseline_basis_json", "I have eaten with them often.");
  formBody.set("completion_knowledge_level", "high");
  formBody.set("completion_credence_decimal", "0.85");
  formBody.append("completion_basis_json", "I ate with them during the action window.");
  formBody.set("concern_flag", "none");
  formBody.set("friend_terms_acceptance_id", "terms:friend-testimonial:v1");

  const formResponse = await enforceParticipantCredibility(
    new Request("http://localhost/api/moral-trade/participant-credibility/enforce", {
      body: formBody,
      method: "POST",
    }),
  );
  const formResponseBody = await formResponse.json();
  assert.equal(formResponse.status, 200);
  assert.equal(formResponseBody.ok, true);
  assert.equal(formResponseBody.stateMutation, false);
  assert.equal(formResponseBody.testimonial.baselineCounterfactualCredenceDecimal, 0.8);
  assert.equal(formResponseBody.testimonial.completionCredenceDecimal, 0.85);
});

test("participant-credibility wiring covers API profile, operations, database tables, schema, data model, and UI", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260626_moral_trade_participant_credibility_friend_testimonials.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const dataModelProfile = readRepoFile("config/moral-trade/data-model-profile.json");
  const pledgeSwapsPage = readRepoFile("src/app/pledge-swaps/page.tsx");
  const friendTestimonialPage = readRepoFile("src/app/friend-testimonials/[inviteToken]/page.tsx");

  assert.match(apiContractSource, /moral_trade_participant_credibility_contract/);
  assert.match(apiContractSource, /moral_trade_participant_credibility_enforce/);
  assert.match(apiProfile, /participant_credibility_contract_response/);
  assert.match(apiProfile, /participant_credibility_enforce_request/);
  assert.match(apiProfile, /participant_credibility_enforce_response/);
  assert.match(rateLimitSource, /participant_credibility_enforce/);
  assert.match(operationsSource, /participant_credibility_enforce/);
  assert.match(operationsProfile, /"key": "participant_credibility_enforce"/);
  assert.match(databaseTypes, /moral_trade_participant_credibility_profiles/);
  assert.match(databaseTypes, /moral_trade_friend_testimonials/);
  assert.match(databaseTypes, /moral_trade_testimonial_credibility_events/);
  assert.match(migration, /create table if not exists public\.moral_trade_participant_credibility_profiles/);
  assert.match(migration, /last_credibility_event_id/);
  assert.match(migration, /create table if not exists public\.moral_trade_friend_testimonial_invites/);
  assert.match(migration, /create table if not exists public\.moral_trade_friend_testimonials/);
  assert.match(migration, /baseline_counterfactual_credence_decimal/);
  assert.match(migration, /completion_credence_decimal/);
  assert.match(migration, /default_stake_required_bool boolean not null default false/);
  assert.match(migration, /maximum_stake_minor <= 1000/);
  assert.match(schema, /moral_trade_testimonial_quality_assessments/);
  assert.match(schema, /moral_trade_credibility_appeals/);
  assert.match(dataModelProfile, /participant_credibility_profile/);
  assert.match(dataModelProfile, /friend_testimonial/);
  assert.match(pledgeSwapsPage, /Invite a friend to support this claim/);
  assert.match(pledgeSwapsPage, /Participant credibility input only/);
  assert.match(friendTestimonialPage, /Separate baseline and completion credence/);
  assert.match(friendTestimonialPage, /Decline privately/);
  assert.match(friendTestimonialPage, /PolicyEvaluationTrace/);
  assert.match(friendTestimonialPage, /participant-credibility\/enforce/);
});
