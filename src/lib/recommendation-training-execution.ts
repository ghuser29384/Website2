import { PARETO_MODEL_VERSION } from "./pareto-recommendation-model";
import { runParetoRecommendationTrainingJob } from "./recommendation-training";
import type { RecommendationTrainingRuntimeDecision } from "./recommendation-training-runtime";
import { createServiceClient } from "./supabase/server";

export const RECOMMENDATION_TRAINING_CRON_SCHEDULE = "30 12 * * *";

export interface RecommendationTrainingExecutionContext {
  scheduledFor: string | null;
  scheduledSlot: string | null;
  sourceDeploymentId: string | null;
  sourceInvocation: "manual" | "natural_cron";
  sourceProjectId: string | null;
}

interface SlotClaim {
  attemptCount: number;
  claimed: boolean;
  existingModelId: string | null;
  existingRunId: string | null;
  slotKey: string;
  status: "claimed" | "failed" | "succeeded";
}

interface SkippedTrainingResult {
  existingModelId: string | null;
  existingRunId: string | null;
  reason: "duplicate_scheduled_slot";
  scheduledSlot: string;
  skipped: true;
  status: "skipped";
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeClaim(value: unknown): SlotClaim {
  const source = Array.isArray(value) ? value[0] : value;
  if (!source || typeof source !== "object") {
    throw new Error("The recommendation-training slot claim returned an invalid payload.");
  }
  const record = source as Record<string, unknown>;
  const status = record.status;
  if (status !== "claimed" && status !== "failed" && status !== "succeeded") {
    throw new Error("The recommendation-training slot claim returned an invalid status.");
  }
  return {
    attemptCount: Number(record.attemptCount ?? 0),
    claimed: record.claimed === true,
    existingModelId: optionalText(record.existingModelId),
    existingRunId: optionalText(record.existingRunId),
    slotKey: String(record.slotKey ?? ""),
    status,
  };
}

export function buildRecommendationTrainingExecutionContext(
  request: Request,
  runtimeDecision: RecommendationTrainingRuntimeDecision,
  environment: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): RecommendationTrainingExecutionContext {
  const schedule = request.headers.get("x-vercel-cron-schedule")?.trim() || null;
  const naturalCron = schedule === RECOMMENDATION_TRAINING_CRON_SCHEDULE;
  const day = now.toISOString().slice(0, 10);
  const scheduledFor = naturalCron ? `${day}T12:30:00.000Z` : null;

  return {
    scheduledFor,
    scheduledSlot: naturalCron ? `${PARETO_MODEL_VERSION}:${day}:12:30Z` : null,
    sourceDeploymentId: optionalText(environment.VERCEL_DEPLOYMENT_ID),
    sourceInvocation: naturalCron ? "natural_cron" : "manual",
    sourceProjectId: runtimeDecision.projectId,
  };
}

export async function runParetoRecommendationTrainingExecution(
  context: RecommendationTrainingExecutionContext,
) {
  if (!context.scheduledSlot || !context.scheduledFor) {
    return {
      ...(await runParetoRecommendationTrainingJob()),
      scheduledSlot: null,
      skipped: false as const,
      sourceInvocation: context.sourceInvocation,
    };
  }

  if (!context.sourceProjectId) {
    throw new Error("A naturally scheduled training run is missing its Vercel project identity.");
  }

  const service = createServiceClient() as any;
  const claimResult = await service.rpc("claim_recommendation_training_slot", {
    p_deployment_id: context.sourceDeploymentId,
    p_project_id: context.sourceProjectId,
    p_scheduled_for: context.scheduledFor,
    p_slot_key: context.scheduledSlot,
  });
  if (claimResult.error) throw claimResult.error;
  const claim = normalizeClaim(claimResult.data);

  if (!claim.claimed) {
    const skipped: SkippedTrainingResult = {
      existingModelId: claim.existingModelId,
      existingRunId: claim.existingRunId,
      reason: "duplicate_scheduled_slot",
      scheduledSlot: context.scheduledSlot,
      skipped: true,
      status: "skipped",
    };
    return skipped;
  }

  let result: Awaited<ReturnType<typeof runParetoRecommendationTrainingJob>>;
  try {
    result = await runParetoRecommendationTrainingJob();
  } catch (error) {
    const failure = await service.rpc("fail_recommendation_training_slot", {
      p_error: error instanceof Error ? error.message : String(error),
      p_project_id: context.sourceProjectId,
      p_slot_key: context.scheduledSlot,
    });
    if (failure.error) {
      console.error("[recommendation-training] Failed to record the failed scheduled slot", {
        message: failure.error.message,
        scheduledSlot: context.scheduledSlot,
      });
    }
    throw error;
  }

  const completion = await service.rpc("complete_recommendation_training_slot", {
    p_deployment_id: context.sourceDeploymentId,
    p_model_id: result.modelId,
    p_project_id: context.sourceProjectId,
    p_run_id: result.runId,
    p_slot_key: context.scheduledSlot,
  });
  if (completion.error) {
    throw new Error(
      `Training succeeded but scheduled-slot finalization failed: ${completion.error.message}`,
    );
  }

  return {
    ...result,
    scheduledSlot: context.scheduledSlot,
    skipped: false as const,
    sourceInvocation: context.sourceInvocation,
  };
}
