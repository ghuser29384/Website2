import { NextResponse } from "next/server";

import {
  PROJECT_RECOMMENDATION_FEATURE_KEY,
  assertProjectRecommendationCapability,
  buildMoralPublicGoodsRecommendationDevSeedData,
  moderateProjectRecommendation,
  type ProjectRecommendationActorRole,
  type ProjectRecommendationEnvironment,
  type ProjectRecommendationModerationAction,
} from "@/lib/mpgf/public-goods-project-recommendations-non-mvp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const actions = [
  "approve",
  "approve_aggregate_only",
  "reject",
  "redact",
  "withdraw",
  "request_evidence",
  "mark_conflict_blocking",
  "mark_conflict_nonblocking",
  "mark_source_verified",
  "escalate_to_project_review_challenge",
] as const satisfies readonly ProjectRecommendationModerationAction[];

function getRuntimeEnvironment(): ProjectRecommendationEnvironment {
  if (process.env.NODE_ENV === "test") return "test";
  if (process.env.NODE_ENV === "production") {
    return process.env.VERCEL_ENV === "preview" ? "preview" : "production";
  }
  return "development";
}

function getActorRole(environment: ProjectRecommendationEnvironment): ProjectRecommendationActorRole {
  const configured = process.env.MORAL_PUBLIC_GOODS_RECOMMENDATIONS_ACTOR_ROLE;
  if (configured === "reviewer" || configured === "admin" || configured === "service") {
    return configured;
  }
  return environment === "production" ? "public" : "admin";
}

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function moderationAction(value: unknown): ProjectRecommendationModerationAction {
  return actions.includes(value as typeof actions[number])
    ? value as typeof actions[number]
    : "request_evidence";
}

function flagEnabled(flag: string) {
  return process.env[flag] === "true" || process.env[flag.toUpperCase()] === "true";
}

export async function POST(request: Request) {
  const environment = getRuntimeEnvironment();
  const actorRole = getActorRole(environment);

  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object") {
      throw new Error("Project recommendation moderation expects a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const recommendationId = stringField(record, "recommendationId");
    const action = moderationAction(record.action);
    const entries = buildMoralPublicGoodsRecommendationDevSeedData({ environment });
    const entry = entries.find((candidate) => candidate.id === recommendationId);

    if (!entry) {
      return NextResponse.json({ ok: false, error: "recommendation_not_found" }, { status: 404 });
    }

    assertProjectRecommendationCapability({
      action:
        action === "approve" || action === "approve_aggregate_only"
          ? "approve_public_display"
          : action === "redact"
            ? "redact_entry"
            : action === "reject"
              ? "reject_entry"
              : "moderate_entry",
      actorRole,
      environment,
      explicitPromotionRecordApproved: false,
      featureEnabled: environment !== "production" || flagEnabled(PROJECT_RECOMMENDATION_FEATURE_KEY),
      publicSurfaceEnabled: false,
      targetBlocked: false,
      targetReviewed: true,
    });

    const result = moderateProjectRecommendation({
      action,
      actorId: stringField(record, "actorId", "mpgf-recommendation-reviewer"),
      entry,
      privateReasonRef: stringField(record, "privateReasonRef") || null,
      publicReason: stringField(record, "publicReason") || null,
    });

    return NextResponse.json({
      ok: true,
      entry: {
        id: result.entry.id,
        moderationState: result.entry.moderationState,
        visibility: result.entry.visibility,
        conflictState: result.entry.conflictState,
        verificationState: result.entry.verificationState,
      },
      event: result.event,
      createsMoneyMovement: false,
      affectsClearing: false,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not moderate recommendation." },
      { status: 400 },
    );
  }
}
