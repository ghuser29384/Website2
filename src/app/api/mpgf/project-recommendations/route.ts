import { NextResponse } from "next/server";

import {
  PROJECT_RECOMMENDATION_FEATURE_KEY,
  assertProjectRecommendationCapability,
  createProjectRecommendation,
  evaluateProjectRecommendationCapability,
  serializeProjectRecommendationForPublic,
  validateProjectRecommendationSummary,
  type ProjectRecommendationActorRole,
  type ProjectRecommendationEnvironment,
  type ProjectRecommendationRecommenderRole,
  type ProjectRecommendationSourceType,
  type ProjectRecommendationStance,
  type ProjectRecommendationVisibility,
} from "@/lib/mpgf/public-goods-project-recommendations-non-mvp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sourceTypes = [
  "public_comment",
  "verified_donation",
  "grant_review",
  "direct_experience",
  "expert_assessment",
  "internal_review_summary",
  "linked_public_source",
  "private_evidence_reviewed",
] as const satisfies readonly ProjectRecommendationSourceType[];

const stances = [
  "recommend_funding",
  "support_with_caveats",
  "donated",
  "reviewed_positive",
  "concern",
  "recuse_or_conflict",
] as const satisfies readonly ProjectRecommendationStance[];

function getRuntimeEnvironment(): ProjectRecommendationEnvironment {
  if (process.env.NODE_ENV === "test") return "test";
  if (process.env.NODE_ENV === "production") {
    return process.env.VERCEL_ENV === "preview" ? "preview" : "production";
  }
  return "development";
}

function getActorRole(environment: ProjectRecommendationEnvironment): ProjectRecommendationActorRole {
  const configured = process.env.MORAL_PUBLIC_GOODS_RECOMMENDATIONS_ACTOR_ROLE;
  if (
    configured === "public" ||
    configured === "labs_participant" ||
    configured === "reviewer" ||
    configured === "admin" ||
    configured === "service"
  ) {
    return configured;
  }
  return environment === "production" ? "public" : "labs_participant";
}

function flagEnabled(flag: string) {
  return process.env[flag] === "true" || process.env[flag.toUpperCase()] === "true";
}

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value.trim() : fallback;
}

function sourceType(value: unknown): ProjectRecommendationSourceType | null {
  return sourceTypes.includes(value as ProjectRecommendationSourceType)
    ? value as ProjectRecommendationSourceType
    : null;
}

function stance(value: unknown, fallback: ProjectRecommendationStance): ProjectRecommendationStance {
  return stances.includes(value as ProjectRecommendationStance) ? value as ProjectRecommendationStance : fallback;
}

function visibility(value: unknown): ProjectRecommendationVisibility {
  return value === "public" || value === "reviewer_only" ? value : "aggregate_only";
}

function recommenderRole(value: unknown): ProjectRecommendationRecommenderRole {
  return value === "donor" ||
    value === "reviewer" ||
    value === "domain_expert" ||
    value === "grantee" ||
    value === "participant" ||
    value === "platform_admin" ||
    value === "external_expert"
    ? value
    : "community_member";
}

export async function GET() {
  const environment = getRuntimeEnvironment();
  const actorRole = getActorRole(environment);
  const capability = evaluateProjectRecommendationCapability({
    action: "view_summary",
    actorRole,
    environment,
    explicitPromotionRecordApproved: false,
    featureEnabled: environment !== "production" || flagEnabled(PROJECT_RECOMMENDATION_FEATURE_KEY),
    publicSurfaceEnabled: false,
    targetReviewed: true,
  });

  if (!capability.allowed) {
    return NextResponse.json(
      {
        ok: false,
        hidden: true,
        reasons: capability.reasons,
      },
      { status: environment === "production" ? 404 : 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    featureKey: PROJECT_RECOMMENDATION_FEATURE_KEY,
    publicLabel: "Recommendations and concerns",
    mode: "metadata_only_labs_summary",
    noMoneyMovement: true,
  });
}

export async function POST(request: Request) {
  const environment = getRuntimeEnvironment();
  const actorRole = getActorRole(environment);

  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object") {
      throw new Error("Project recommendations expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const targetId = stringField(record, "targetId");
    const source = sourceType(record.sourceType);
    const isConcern = record.kind === "concern" || record.stance === "concern";
    const summary = stringField(record, "publicSummary");
    const conflictDisclosure = stringField(record, "conflictDisclosure");
    const sourceUrl = stringField(record, "sourceUrl") || null;
    const privateEvidenceRef = stringField(record, "privateEvidenceRef") || null;
    const capability = assertProjectRecommendationCapability({
      action: isConcern ? "create_concern" : "create_recommendation",
      actorRole,
      environment,
      conflictDisclosure,
      evidencePresent: Boolean(privateEvidenceRef),
      explicitPromotionRecordApproved: false,
      featureEnabled: environment !== "production" || flagEnabled(PROJECT_RECOMMENDATION_FEATURE_KEY),
      publicSurfaceEnabled: false,
      sourceType: source,
      sourceUrlPresent: Boolean(sourceUrl),
      targetBlocked: Boolean(record.targetBlocked),
      targetReviewed: record.targetReviewed !== false,
    });
    const summaryValidation = validateProjectRecommendationSummary(summary);

    if (!source) {
      return NextResponse.json(
        { ok: false, error: "source_type_required", reasons: ["source_type_required"] },
        { status: 400 },
      );
    }

    if (!summaryValidation.passed) {
      return NextResponse.json(
        { ok: false, error: "copy_preflight_failed", reasons: summaryValidation.blockers },
        { status: 400 },
      );
    }

    const entry = createProjectRecommendation({
      conflictDisclosure,
      conflictState: conflictDisclosure.toLowerCase().includes("none") ? "none_disclosed" : "undisclosed_review",
      moderationState: "pending",
      poolId: stringField(record, "poolId") || null,
      privateEvidenceRef,
      projectId: stringField(record, "projectId") || targetId,
      publicSummary: summary,
      recommenderDisplayNameSnapshot: stringField(record, "recommenderDisplayNameSnapshot", "Labs participant"),
      recommenderRole: recommenderRole(record.recommenderRole),
      recommenderUserId: stringField(record, "recommenderUserId", "labs-participant"),
      sourceType: source,
      sourceUrl,
      stance: isConcern ? "concern" : stance(record.stance, "recommend_funding"),
      targetId,
      targetType: record.targetType === "pool" || record.targetType === "recipient" ? record.targetType : "project",
      trustTierAtSubmission: actorRole === "admin" ? "admin" : actorRole === "reviewer" ? "reviewer" : "ordinary",
      urgency:
        record.urgency === "material_before_funding" || record.urgency === "safety_legal_review_concern"
          ? record.urgency
          : "routine",
      verificationState: "unverified",
      visibility: visibility(record.visibility),
    });

    return NextResponse.json(
      {
        ok: true,
        status: "pending_moderation",
        reasons: capability.reasons,
        entry: {
          id: entry.id,
          targetType: entry.targetType,
          targetId: entry.targetId,
          stance: entry.stance,
          sourceType: entry.sourceType,
          conflictState: entry.conflictState,
          visibility: entry.visibility,
          moderationState: entry.moderationState,
          publicPreview: serializeProjectRecommendationForPublic(entry, {
            blocked: false,
            reviewed: true,
            targetId: entry.targetId,
            targetType: entry.targetType,
          }),
        },
        createsMoneyMovement: false,
        affectsClearing: false,
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not submit recommendation." },
      { status: 400 },
    );
  }
}
