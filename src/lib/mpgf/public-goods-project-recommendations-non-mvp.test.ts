import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import {
  PROJECT_RECOMMENDATION_FEATURE_KEY,
  PROJECT_RECOMMENDATION_FEATURE_METADATA,
  PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER,
  PROJECT_RECOMMENDATION_SEED_PROJECT_IDS,
  applyProjectRecommendationsAsMetadataOnly,
  buildMoralPublicGoodsRecommendationDevSeedData,
  buildProjectRecommendationModerationQueue,
  buildProjectRecommendationPublicReport,
  buildProjectRecommendationPublicView,
  createProjectRecommendation,
  detectProjectRecommendationAbuseFlags,
  evaluateProjectRecommendationCapability,
  findProjectRecommendationProhibitedCopy,
  logProjectRecommendationPrivateEvidenceAccess,
  moderateProjectRecommendation,
  serializeProjectRecommendationForPublic,
  validateProjectRecommendationForPublicDisplay,
  validateProjectRecommendationSummary,
} from "./public-goods-project-recommendations-non-mvp";

const labsClientPath = "src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx";
const labsRoutePath = "src/app/labs/moral-public-goods/[poolSlug]/page.tsx";
const mvpRoundPath = "src/app/mpgf/rounds/[roundId]/page.tsx";
const apiRoutePath = "src/app/api/mpgf/project-recommendations/route.ts";
const moderationApiRoutePath = "src/app/api/mpgf/project-recommendations/moderation/route.ts";
const adminPagePath = "src/app/admin/moral-public-goods/recommendations/page.tsx";
const docsPath = "docs/moral-public-goods-recommendations-non-mvp.md";

function reviewedTarget(targetId: string = PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab) {
  return {
    targetId,
    targetType: "project" as const,
    reviewed: true,
    blocked: false,
  };
}

test("project recommendations feature metadata is non-MVP, production-disabled, metadata-only, and has no live-money flag", () => {
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_KEY, "moral_public_goods_project_recommendations_non_mvp_v0_1");
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.featureClassification, "non_mvp");
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.deploymentStage, "labs_research_non_mvp");
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.defaultEnabled, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.productionPublicEnabled, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.mvpSurfaceEnabled, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.cgppMvpPledgePathEnabled, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.moneyMovement, "none");
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.clearingInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.thresholdInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.differentViewInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.bonusEligibilityInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.platformMatchResolutionInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.rankingInput, false);
  assert.equal(PROJECT_RECOMMENDATION_FEATURE_METADATA.publicReputationInput, false);

  const source = readFileSync("src/lib/mpgf/public-goods-project-recommendations-non-mvp.ts", "utf8");
  assert.equal(/LIVE_MONEY|live_money|money_enabled/i.test(source), false);
});

test("capability gate hides production public surfaces and requires labs/admin role, source, conflict, and reviewable target", () => {
  const productionPublic = evaluateProjectRecommendationCapability({
    action: "view_summary",
    actorRole: "public",
    environment: "production",
    featureEnabled: false,
    publicSurfaceEnabled: false,
    explicitPromotionRecordApproved: false,
  });
  assert.equal(productionPublic.allowed, false);
  assert.ok(productionPublic.reasons.includes("feature_non_mvp"));
  assert.ok(productionPublic.reasons.includes("feature_disabled"));
  assert.ok(productionPublic.reasons.includes("public_surface_disabled"));

  const missingRequiredFields = evaluateProjectRecommendationCapability({
    action: "create_recommendation",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
  });
  assert.equal(missingRequiredFields.allowed, false);
  assert.ok(missingRequiredFields.reasons.includes("source_type_required"));
  assert.ok(missingRequiredFields.reasons.includes("conflict_disclosure_required"));

  const lowTrustPublic = evaluateProjectRecommendationCapability({
    action: "create_concern",
    actorRole: "public",
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
    sourceType: "direct_experience",
    conflictDisclosure: "None disclosed.",
  });
  assert.equal(lowTrustPublic.allowed, false);
  assert.ok(lowTrustPublic.reasons.includes("insufficient_role"));

  const labsConcern = evaluateProjectRecommendationCapability({
    action: "create_concern",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
    sourceType: "direct_experience",
    conflictDisclosure: "None disclosed.",
  });
  assert.equal(labsConcern.allowed, true);
  assert.ok(labsConcern.reasons.includes("moderation_required"));

  const rankingAttempt = evaluateProjectRecommendationCapability({
    action: "create_recommendation",
    actorRole: "labs_participant",
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
    sourceType: "expert_assessment",
    conflictDisclosure: "None disclosed.",
    requestedRankingOrReputationInput: true,
  });
  assert.equal(rankingAttempt.allowed, false);
  assert.ok(rankingAttempt.reasons.includes("reputation_or_ranking_disallowed"));
});

test("model validation requires source, conflict, public summary, moderation approval, and reviewed unblocked target for public display", () => {
  const seed = buildMoralPublicGoodsRecommendationDevSeedData();
  const approved = seed.find((entry) => entry.id === "rec-open-lab-domain-expert");
  assert.ok(approved);

  assert.equal(validateProjectRecommendationForPublicDisplay(approved, reviewedTarget()).passed, true);
  assert.equal(serializeProjectRecommendationForPublic(approved, reviewedTarget())?.privateEvidenceRef, undefined);

  const pending = seed.find((entry) => entry.id === "source-url-needs-verification");
  assert.ok(pending);
  const pendingValidation = validateProjectRecommendationForPublicDisplay(pending, reviewedTarget(pending.targetId));
  assert.equal(pendingValidation.passed, false);
  assert.ok(pendingValidation.blockers.includes("moderation_approval_required"));

  const blockedTarget = validateProjectRecommendationForPublicDisplay(approved, {
    ...reviewedTarget(),
    blocked: true,
  });
  assert.equal(blockedTarget.passed, false);
  assert.ok(blockedTarget.blockers.includes("target_blocked"));

  const unreviewedTarget = validateProjectRecommendationForPublicDisplay(approved, {
    ...reviewedTarget(),
    reviewed: false,
  });
  assert.equal(unreviewedTarget.passed, false);
  assert.ok(unreviewedTarget.blockers.includes("target_not_reviewed"));
});

test("low-trust submissions default aggregate-only and pending while trusted approved rows can serialize publicly", () => {
  const lowTrust = createProjectRecommendation({
    conflictDisclosure: "None disclosed.",
    conflictState: "none_disclosed",
    moderationState: "approved",
    poolId: "global-biosecurity-coordination",
    projectId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    publicSummary: "I donated before and the reviewed public documentation was useful.",
    recommenderDisplayNameSnapshot: "Ordinary donor",
    recommenderRole: "donor",
    recommenderUserId: "ordinary-donor",
    sourceType: "verified_donation",
    stance: "donated",
    targetId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    targetType: "project",
    trustTierAtSubmission: "ordinary",
    verificationState: "source_verified",
    visibility: "public",
  });

  assert.equal(lowTrust.visibility, "aggregate_only");
  assert.equal(lowTrust.moderationState, "pending");

  const trusted = createProjectRecommendation({
    conflictDisclosure: "None disclosed.",
    conflictState: "none_disclosed",
    moderationState: "approved",
    poolId: "global-biosecurity-coordination",
    projectId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    publicSummary: "A reviewed expert assessment supports funding this project because the route is inspectable.",
    recommenderDisplayNameSnapshot: "Expert",
    recommenderRole: "domain_expert",
    recommenderUserId: "expert",
    sourceType: "expert_assessment",
    stance: "recommend_funding",
    targetId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    targetType: "project",
    trustTierAtSubmission: "trusted",
    verificationState: "reviewed",
    visibility: "public",
  });
  const serialized = serializeProjectRecommendationForPublic(trusted, reviewedTarget());
  assert.equal(serialized?.displayLabel, "Recommended by Expert");
  assert.equal(serialized?.sourceLabel, "expert assessment");
  assert.equal(serialized?.conflictLabel, "none disclosed");
});

test("aggregate public view supports recommendations and concerns without exposing private or rejected text", () => {
  const seed = buildMoralPublicGoodsRecommendationDevSeedData();
  const openLabView = buildProjectRecommendationPublicView({
    recommendations: seed,
    target: reviewedTarget(PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab),
  });
  assert.equal(openLabView.aggregate.publicSummaryText, "3 recommendations · 0 unresolved concerns");
  assert.ok(openLabView.entries.some((entry) => entry.sourceLabel === "expert assessment"));
  assert.ok(openLabView.entries.some((entry) => entry.sourceLabel === "internal review summary"));
  assert.equal(JSON.stringify(openLabView).includes("privateEvidenceRef"), false);

  const pathogenView = buildProjectRecommendationPublicView({
    recommendations: seed,
    target: reviewedTarget(PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.pathogenSurveillanceDataCommons),
  });
  assert.equal(pathogenView.aggregate.concernUnderReviewCount, 1);
  assert.equal(
    pathogenView.concernNotice,
    "1 concern under review. Details will be shown only if approved for public display.",
  );
  assert.equal(JSON.stringify(pathogenView).includes("data access controls"), false);

  const rejected = seed.find((entry) => entry.id === "rejected-spam-recommendation");
  assert.ok(rejected);
  assert.equal(serializeProjectRecommendationForPublic(rejected, reviewedTarget(rejected.targetId)), null);
});

test("recommendations are metadata-only and cannot change clearing, support, bonus, platform-match, allocation, payment, settlement, audit, sponsor, or review-state fields", () => {
  const seed = buildMoralPublicGoodsRecommendationDevSeedData();
  const before = {
    atLeastTierEffectiveSupportCents: 50_000,
    auditMoneyTotalCents: 75_000,
    captureCents: 12_000,
    differentViewClusterCount: 3,
    netRecipientThresholdCents: 100_000,
    paymentAuthorizationCents: 12_000,
    platformMatchResolutionInputCents: 45_000,
    projectAllocationWeightsBps: {
      [PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab]: 4_000,
      [PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.pathogenSurveillanceDataCommons]: 3_000,
      [PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.globalOutbreakCoordinationNetwork]: 3_000,
    },
    projectReviewState: "reviewed" as const,
    refundBonusEligible: true,
    settlementCents: 11_500,
    sponsorMatchCents: 5_000,
    verifiedSupporterCount: 150,
  };
  const after = applyProjectRecommendationsAsMetadataOnly(before, seed);

  assert.deepEqual(after, before);
  assert.notEqual(after.projectAllocationWeightsBps, before.projectAllocationWeightsBps);

  for (const sourcePath of [
    "src/lib/mpgf/public-goods-refund-bonus-non-mvp.ts",
    "src/lib/mpgf/public-goods-at-least-tier-platform-match.ts",
    "src/lib/mpgf/mechanism.ts",
    "src/lib/mpgf/public-goods-finalization.ts",
    "src/lib/mpgf/public-goods-payment-adapter.ts",
  ]) {
    assert.equal(readFileSync(sourcePath, "utf8").includes(PROJECT_RECOMMENDATION_FEATURE_KEY), false, sourcePath);
  }
});

test("submission, moderation, private evidence logging, abuse flags, and public reporting follow the prompt rules", () => {
  const seed = buildMoralPublicGoodsRecommendationDevSeedData();
  const pendingConcern = seed.find((entry) => entry.id === "concern-pathogen-under-review");
  assert.ok(pendingConcern);

  const requestedEvidence = moderateProjectRecommendation({
    action: "request_evidence",
    actorId: "reviewer-1",
    entry: pendingConcern,
  });
  assert.equal(requestedEvidence.entry.moderationState, "pending");
  assert.equal(requestedEvidence.event.previousState, "pending");
  assert.equal(requestedEvidence.event.nextState, "pending");
  assert.match(requestedEvidence.event.eventHash, /^sha256:/);

  const approvedAggregate = moderateProjectRecommendation({
    action: "approve_aggregate_only",
    actorId: "reviewer-1",
    entry: pendingConcern,
  });
  assert.equal(approvedAggregate.entry.moderationState, "approved");
  assert.equal(approvedAggregate.entry.visibility, "aggregate_only");

  const privateEvidenceEntry = createProjectRecommendation({
    conflictDisclosure: "None disclosed.",
    conflictState: "none_disclosed",
    moderationState: "pending",
    poolId: "global-biosecurity-coordination",
    privateEvidenceRef: "private-evidence:reviewer-only",
    projectId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    publicSummary: "Reviewer-only evidence was summarized without exposing private attachments.",
    recommenderDisplayNameSnapshot: "Reviewer",
    recommenderRole: "reviewer",
    recommenderUserId: "reviewer-2",
    sourceType: "private_evidence_reviewed",
    stance: "support_with_caveats",
    targetId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
    targetType: "project",
    trustTierAtSubmission: "reviewer",
    verificationState: "reviewed",
    visibility: "reviewer_only",
  });
  const accessEvent = logProjectRecommendationPrivateEvidenceAccess({
    actorId: "reviewer-2",
    actorRole: "reviewer",
    entry: privateEvidenceEntry,
  });
  assert.match(accessEvent.eventHash, /^sha256:/);

  const queue = buildProjectRecommendationModerationQueue(seed);
  assert.ok(queue.some((row) => row.recommendedAction === "request_evidence"));
  assert.ok(queue.some((row) => row.recommendedAction === "escalate_to_project_review_challenge"));

  const report = buildProjectRecommendationPublicReport(seed);
  assert.equal(report.disclaimer, PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER);
  assert.equal(JSON.stringify(report).includes("private-evidence"), false);
  assert.ok(report.moderationLimitations.some((limitation) => limitation.includes("payment state")));

  const abuseFlags = detectProjectRecommendationAbuseFlags([
    ...seed,
    createProjectRecommendation({
      conflictDisclosure: "",
      conflictState: "none_disclosed",
      moderationState: "pending",
      poolId: "global-biosecurity-coordination",
      projectId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
      publicSummary: "Everyone from my group should recommend this. https://a.example https://b.example",
      recommenderDisplayNameSnapshot: "Grantee",
      recommenderRole: "grantee",
      recommenderUserId: "grantee-no-disclosure",
      sourceType: "linked_public_source",
      stance: "recommend_funding",
      targetId: PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab,
      targetType: "project",
      trustTierAtSubmission: "ordinary",
      verificationState: "unverified",
      visibility: "aggregate_only",
    }),
  ]);
  assert.ok(abuseFlags.includes("spam_public_source_links"));
  assert.ok(abuseFlags.includes("brigading_around_contentious_projects"));
  assert.ok(abuseFlags.includes("grantee_self_recommendation_without_disclosure"));
});

test("copy preflight blocks cheap social proof terms while allowing required negative disclaimers", () => {
  assert.deepEqual(
    findProjectRecommendationProhibitedCopy(
      "Recommendations are source-backed trust signals. They are not votes, rankings, review approval, clearing inputs, or impact estimates.",
    ),
    [],
  );
  assert.ok(findProjectRecommendationProhibitedCopy("Like this top project because it is objectively best.").includes("Like"));
  assert.ok(findProjectRecommendationProhibitedCopy("This has a moral score and counts toward threshold.").includes("Moral score"));
  assert.equal(validateProjectRecommendationSummary("A useful source-backed assessment without private details.").passed, true);
  assert.equal(
    validateProjectRecommendationSummary("This reveals a donor viewpoint tag and payment method.").blockers.includes(
      "private_or_sensitive_detail_detected",
    ),
    true,
  );
});

test("route, API, admin, docs, and labs UI source wire the feature without MVP path coupling or leaderboard copy", () => {
  for (const path of [labsClientPath, labsRoutePath, apiRoutePath, moderationApiRoutePath, adminPagePath, docsPath]) {
    assert.equal(existsSync(path), true, path);
  }
  const client = readFileSync(labsClientPath, "utf8");
  const route = readFileSync(labsRoutePath, "utf8");
  const api = readFileSync(apiRoutePath, "utf8");
  const moderationApi = readFileSync(moderationApiRoutePath, "utf8");
  const adminPage = readFileSync(adminPagePath, "utf8");
  const mvpRound = readFileSync(mvpRoundPath, "utf8");
  const docs = readFileSync(docsPath, "utf8");

  assert.match(route, /PROJECT_RECOMMENDATION_FEATURE_KEY/);
  assert.match(route, /evaluateProjectRecommendationCapability/);
  assert.match(client, /Recommendations and concerns/);
  assert.match(client, /Recommend funding/);
  assert.match(client, /Record a concern/);
  assert.match(client, /I understand this is not a vote, ranking, review approval, or clearing input/);
  assert.match(client, /I understand concerns are moderated before public display/);
  assert.match(client, /Source:/);
  assert.match(client, /Conflict:/);
  assert.match(client, /concern under review/);
  assert.match(api, /assertProjectRecommendationCapability/);
  assert.match(api, /source_type_required/);
  assert.match(moderationApi, /moderateProjectRecommendation/);
  assert.match(adminPage, /pending recommendations/i);
  assert.match(adminPage, /source verification needed/i);
  assert.match(adminPage, /conflict review needed/i);
  assert.equal(mvpRound.includes(PROJECT_RECOMMENDATION_FEATURE_KEY), false);
  assert.equal(mvpRound.includes("Recommendations and concerns"), false);

  const joined = `${client}\n${route}\n${adminPage}`;
  for (const prohibited of ["Like", "Upvote", "Moral score", "Reputation power", "Objectively best", "Guaranteed impact", "Counts toward threshold"]) {
    assert.equal(joined.includes(prohibited), false, prohibited);
  }
  assert.equal(/leaderboard|Top recommended/i.test(joined), false);
  assert.match(docs, /no effect on clearing, threshold, payment, refund-bonus, at-least-tier, allocation, or review-state logic/i);
});
