import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBaselineWitnessFrozenPolicy,
  buildFunderWitnessSummary,
  buildParticipantWitnessInviteStatus,
  buildReviewerWitnessSummary,
  createBaselineWitnessInviteDraft,
  createSeededBaselineWitnessDemo,
  getGuestWitnessTestimonyContract,
  getWitnessIdentityProvider,
  hasValidWitnessHash,
  stableWitnessHash,
  submitBaselineWitnessTestimonialDraft,
  validateGuestWitnessTestimonyContract,
} from "@/lib/moral-trade/guest-witness-testimony";

const now = "2026-06-25T12:00:00.000Z";
const actionWindowStartAt = "2026-06-27T00:00:00.000Z";
const actionWindowEndAt = "2026-06-29T00:00:00.000Z";

function makeInvite(overrides: Partial<Parameters<typeof createBaselineWitnessInviteDraft>[0]> = {}) {
  const result = createBaselineWitnessInviteDraft({
    actionTemplateId: "two-day-no-meat-pledge",
    actionWindowEndAt,
    actionWindowStartAt,
    participantClaimedRelationship: "dining_companion",
    participantUserId: "participant-a",
    pledgeSwapId: "pledge-swap-a",
    rawInviteToken: "private-token",
    witnessEmail: "witness@example.com",
    now,
    ...overrides,
  });

  assert.equal(result.blockers.length, 0);
  assert.ok(result.invite);

  return result.invite;
}

test("guest witness contract validates privacy, provider gates, audit, and frozen policy rules", () => {
  const contract = getGuestWitnessTestimonyContract();
  const validation = validateGuestWitnessTestimonyContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("baseline_witness_invites"));
  assert.ok(contract.firstClassRecordTables.includes("baseline_witness_quality_assessments"));
  assert.ok(contract.policySnapshotSubjects.includes("baseline_witness_testimony"));
  assert.ok(contract.providerAbstraction.some((provider) => provider.provider === "email_magic_link"));
  assert.ok(contract.privacyRules.some((rule) => /Do not scrape/i.test(rule)));
  assert.match(contract.participantVisibilityRule, /only invite status/i);
  assert.match(contract.frozenPolicyRule, /cannot directly prove completion/i);
});

test("non-user can submit a baseline witness testimonial through an expiring private invite with email magic link", () => {
  const invite = makeInvite();
  const result = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.85,
    baselineKnowledgeLevel: "high",
    basisText:
      "We eat lunch together often, and she usually orders meat or fish during weekday meals.",
    invite,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    relationshipType: "dining_companion",
    witnessEmail: "witness@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.deepEqual(result.blockers, []);
  assert.ok(result.identity);
  assert.equal(result.identity.convertedUserId, null);
  assert.ok(result.externalAccount);
  assert.equal(result.externalAccount.provider, "email_magic_link");
  assert.equal(result.externalAccount.tokenStoragePolicy, "no_token");
  assert.ok(result.testimonial);
  assert.equal(result.testimonial.baselineCounterfactualCredenceDecimal, 0.85);
  assert.ok(result.assessment);
  assert.equal(result.assessment.acceptedForAdditionality, true);
});

test("X, Facebook, and Instagram providers are feature-gated and fail closed when unavailable", () => {
  for (const provider of ["x", "facebook"] as const) {
    const identityProvider = getWitnessIdentityProvider(provider, { env: {} });
    assert.equal(identityProvider.configured, false);
    assert.equal(identityProvider.failureBehavior, "fail_closed");
    assert.match(identityProvider.unavailableReason ?? "", /feature-gated/i);
  }

  const instagramPersonal = getWitnessIdentityProvider("instagram", {
    env: {
      WITNESS_INSTAGRAM_APP_ID: "configured",
      WITNESS_INSTAGRAM_LOGIN_ENABLED: "true",
      WITNESS_INSTAGRAM_REDIRECT_URI: "https://www.moraltrade.org/callback",
    },
    instagramAccountType: "personal",
  });

  assert.equal(instagramPersonal.configured, false);
  assert.match(instagramPersonal.unavailableReason ?? "", /ordinary personal accounts/i);
});

test("provider account ids and invite tokens are hashed and raw OAuth tokens are rejected", () => {
  const invite = makeInvite({ rawInviteToken: "secret-invite-token" });

  assert.ok(hasValidWitnessHash(invite.inviteTokenHash));
  assert.notEqual(invite.inviteTokenHash, "secret-invite-token");

  const result = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.75,
    baselineKnowledgeLevel: "moderate",
    basisText: "I have eaten dinner with them a few times and saw ordinary fish orders.",
    invite,
    providerAccount: {
      provider: "x",
      providerAccountId: "raw-provider-id",
      rawOAuthToken: "do-not-store",
    },
    providerConfig: {
      env: {
        WITNESS_X_CLIENT_ID: "configured",
        WITNESS_X_OAUTH_ENABLED: "true",
        WITNESS_X_REDIRECT_URI: "https://www.moraltrade.org/callback",
      },
    },
    recentMealObservationFrequency: "few_times",
    relationshipType: "friend",
    witnessEmail: "social@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.ok(result.blockers.includes("raw_oauth_token_rejected"));
});

test("witness testimony captures baseline/additionality separately from completion and social verification is identity assurance only", () => {
  const invite = makeInvite();
  const result = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.99,
    baselineKnowledgeLevel: "low",
    basisText: "I just know it would happen.",
    invite,
    providerAccount: {
      provider: "x",
      providerAccountId: "social-verified-vague",
    },
    providerConfig: {
      env: {
        WITNESS_X_CLIENT_ID: "configured",
        WITNESS_X_OAUTH_ENABLED: "true",
        WITNESS_X_REDIRECT_URI: "https://www.moraltrade.org/callback",
      },
    },
    recentMealObservationFrequency: "once",
    relationshipType: "friend",
    witnessEmail: "social@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.deepEqual(result.blockers, []);
  assert.ok(result.assessment);
  assert.equal(result.assessment.identityAssuranceLevel, "social_verified");
  assert.equal(result.assessment.acceptedForAdditionality, false);
  assert.ok(result.assessment.baselineProbativeValueScoreDecimal < 0.55);
  assert.ok(result.testimonial);
  assert.equal(result.testimonial.testimonialStatus, "submitted");
  assert.equal("completionStatus" in result.testimonial, false);
});

test("participants and funders receive only privacy-safe witness summaries", () => {
  const invite = makeInvite();
  const result = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.85,
    baselineKnowledgeLevel: "high",
    basisText:
      "We eat lunch together often, and she usually orders meat or fish during weekday meals.",
    concernFlag: "possible_pressure",
    concernNotesPrivate: "Participant asked me to say this was certain.",
    invite,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    relationshipType: "dining_companion",
    uncertaintyNotesPrivate: "I only see lunches, not dinner.",
    witnessEmail: "witness@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.ok(result.testimonial);
  assert.ok(result.assessment);

  const participantStatus = buildParticipantWitnessInviteStatus({
    ...invite,
    inviteStatus: "reported",
  });
  assert.deepEqual(Object.keys(participantStatus).sort(), [
    "expiresAt",
    "inviteId",
    "inviteStatus",
    "participantClaimedRelationship",
    "privateFieldsSuppressed",
  ]);
  assert.equal(JSON.stringify(participantStatus).includes("pressure"), false);
  assert.equal(JSON.stringify(participantStatus).includes("certain"), false);

  const funderSummary = buildFunderWitnessSummary({
    policyAllowsCoarseSummary: true,
    reviewedWitnessStatementCount: 1,
  });
  assert.equal(funderSummary.publicSummary, "Additionality estimate used reviewed baseline evidence.");
  assert.equal(JSON.stringify(funderSummary).includes("dining_companion"), false);
  assert.equal(JSON.stringify(funderSummary).includes("witness@example.com"), false);

  const reviewerSummary = buildReviewerWitnessSummary({
    assessment: result.assessment,
    testimonial: result.testimonial,
  });
  assert.equal(reviewerSummary.concernFlag, "possible_pressure");
  assert.match(reviewerSummary.concernNotesPrivate ?? "", /asked me/);
});

test("frozen policy is required before testimony can update additionality or credibility", () => {
  const invite = makeInvite();
  const result = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.85,
    baselineKnowledgeLevel: "high",
    basisText:
      "We eat lunch together often, and she usually orders meat or fish during weekday meals.",
    invite,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    relationshipType: "dining_companion",
    witnessEmail: "witness@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.ok(result.testimonial);
  assert.ok(result.assessment);

  const blocked = applyBaselineWitnessFrozenPolicy({
    assessment: result.assessment,
    policy: {
      actionWindowStartAt,
      additionalityAdjustedSettlementEnabled: true,
      finalAdditionalityProbabilityDecimal: 0.5,
      fixedConsiderationLocked: false,
      maxAdditionalityAdjustmentDecimal: 0.08,
      participantCredibilityUpdateEnabled: true,
      policySnapshotRef: "policy-snapshot:draft",
      policyStatus: "draft",
      termsAcceptedAt: "2026-06-25T12:01:00.000Z",
    },
    testimonial: result.testimonial,
  });

  assert.ok(blocked.blockers.includes("policy_not_frozen:draft"));
  assert.equal(blocked.finalAdditionalityProbabilityDecimal, 0.5);
  assert.equal(blocked.participantCredibilityUpdateAllowed, false);

  const passed = applyBaselineWitnessFrozenPolicy({
    assessment: result.assessment,
    policy: {
      actionWindowStartAt,
      additionalityAdjustedSettlementEnabled: true,
      finalAdditionalityProbabilityDecimal: 0.5,
      fixedConsiderationLocked: false,
      maxAdditionalityAdjustmentDecimal: 0.08,
      participantCredibilityUpdateEnabled: true,
      policySnapshotRef: "policy-snapshot:frozen",
      policyStatus: "frozen",
      termsAcceptedAt: "2026-06-25T12:01:00.000Z",
    },
    testimonial: result.testimonial,
  });

  assert.deepEqual(passed.blockers, []);
  assert.ok(passed.finalAdditionalityProbabilityDecimal > 0.5);
  assert.equal(passed.auditTraceRequired, true);
});

test("testimony cannot retroactively change fixed post-action consideration", () => {
  const invite = makeInvite();
  const preAction = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.85,
    baselineKnowledgeLevel: "high",
    basisText:
      "We eat lunch together often, and she usually orders meat or fish during weekday meals.",
    invite,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    relationshipType: "dining_companion",
    witnessEmail: "witness@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });
  assert.ok(preAction.testimonial);
  assert.ok(preAction.assessment);

  const application = applyBaselineWitnessFrozenPolicy({
    assessment: preAction.assessment,
    policy: {
      actionWindowStartAt,
      additionalityAdjustedSettlementEnabled: true,
      finalAdditionalityProbabilityDecimal: 0.5,
      fixedConsiderationLocked: true,
      maxAdditionalityAdjustmentDecimal: 0.08,
      participantCredibilityUpdateEnabled: true,
      policySnapshotRef: "policy-snapshot:frozen",
      policyStatus: "frozen",
      termsAcceptedAt: "2026-06-25T12:01:00.000Z",
    },
    testimonial: preAction.testimonial,
  });

  assert.ok(application.blockers.includes("fixed_consideration_cannot_change_retroactively"));
  assert.equal(application.settlementAdjustmentAllowed, false);
  assert.equal(application.appliedAdditionalityAdjustmentDecimal, 0);
});

test("duplicate social accounts and reciprocal witnessing patterns route to risk review", () => {
  const invite = makeInvite();
  const providerAccountHash = stableWitnessHash("x-account-1", "guest-witness-provider:x");
  const duplicate = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.8,
    baselineKnowledgeLevel: "moderate",
    basisText: "I have eaten with them weekly and observed ordinary meals.",
    existingTestimonialsForSamePledge: [
      {
        externalWitnessAccountId: "existing-account",
        guestWitnessIdentityId: "identity-existing",
        providerAccountIdHash: providerAccountHash,
      },
    ],
    invite,
    providerAccount: {
      provider: "x",
      providerAccountId: "x-account-1",
    },
    providerConfig: {
      env: {
        WITNESS_X_CLIENT_ID: "configured",
        WITNESS_X_OAUTH_ENABLED: "true",
        WITNESS_X_REDIRECT_URI: "https://www.moraltrade.org/callback",
      },
    },
    recentMealObservationFrequency: "weekly",
    relationshipType: "friend",
    witnessEmail: "social@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.ok(duplicate.blockers.includes("duplicate_provider_account_for_pledge_swap"));

  const reciprocal = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.8,
    baselineKnowledgeLevel: "moderate",
    basisText: "I have eaten with them weekly and observed ordinary meals.",
    invite,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    reciprocalWitnessPairs: [
      {
        participantUserId: stableWitnessHash("witness@example.com", "guest-witness-identity-id"),
        witnessIdentityId: "participant-a",
      },
    ],
    relationshipType: "friend",
    witnessEmail: "witness@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });

  assert.equal(reciprocal.riskReviewRequired, true);
  assert.ok(reciprocal.assessment);
  assert.ok(reciprocal.assessment.collusionRiskScoreDecimal > 0);
});

test("participant invite caps and cooldowns block witness spam", () => {
  const capped = createBaselineWitnessInviteDraft({
    actionTemplateId: "two-day-no-meat-pledge",
    actionWindowEndAt,
    actionWindowStartAt,
    activeInviteCount: 6,
    maxActiveInvites: 6,
    participantUserId: "participant-a",
    rawInviteToken: "private-token",
    witnessEmail: "witness@example.com",
    now,
  });

  assert.ok(capped.blockers.includes("invite_cap_reached:6"));

  const cooledDown = createBaselineWitnessInviteDraft({
    actionTemplateId: "two-day-no-meat-pledge",
    actionWindowEndAt,
    actionWindowStartAt,
    cooldownMinutes: 10,
    participantUserId: "participant-a",
    rawInviteToken: "private-token",
    recentInviteTimestamps: ["2026-06-25T11:55:00.000Z"],
    witnessEmail: "witness@example.com",
    now,
  });

  assert.ok(cooledDown.blockers.includes("invite_cooldown_active:10m"));
});

test("seeded baseline witness demo matches the product scenario", () => {
  const demo = createSeededBaselineWitnessDemo();

  assert.equal(demo.participant.action, "2-day no-meat pledge-swap");
  assert.ok(demo.witnessA.assessment?.acceptedForAdditionality);
  assert.equal(demo.witnessA.testimonial?.baselineCounterfactualCredenceDecimal, 0.85);
  assert.equal(demo.witnessB.assessment?.identityAssuranceLevel, "social_verified");
  assert.equal(demo.witnessB.assessment?.acceptedForAdditionality, false);
  assert.equal(demo.reviewerDemo.witnessC.rawPressureReportVisibleToParticipant, false);
  assert.equal(demo.witnessCParticipantStatus.inviteStatus, "reported");
  assert.equal(demo.publicReport.publicSummary, "Additionality estimate used reviewed baseline evidence.");
  assert.ok(demo.witnessPolicyApplication);
  assert.ok(demo.witnessPolicyApplication.finalAdditionalityProbabilityDecimal > 0.62);
});
