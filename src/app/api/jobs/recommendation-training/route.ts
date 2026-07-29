import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import {
  buildRecommendationTrainingExecutionContext,
  runParetoRecommendationTrainingExecution,
} from "@/lib/recommendation-training-execution";
import { evaluateRecommendationTrainingRuntime } from "@/lib/recommendation-training-runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtimeDecision = evaluateRecommendationTrainingRuntime();
  if (!runtimeDecision.execute) {
    console.info("[recommendation-training] Skipped non-canonical Vercel project invocation", {
      projectId: runtimeDecision.projectId,
      targetEnvironment: runtimeDecision.targetEnvironment,
    });
    return NextResponse.json({
      status: "skipped",
      reason: runtimeDecision.reason,
      objective: "pareto_safe_additionality",
      directMatchesRandomized: false,
      sensitiveAttributesUsed: false,
      privateProfileProseProcessed: false,
    });
  }

  try {
    const context = buildRecommendationTrainingExecutionContext(request, runtimeDecision);
    const result = await runParetoRecommendationTrainingExecution(context);
    return NextResponse.json({
      ...result,
      objective: "pareto_safe_additionality",
      directMatchesRandomized: false,
      sensitiveAttributesUsed: false,
      privateProfileProseProcessed: false,
    });
  } catch (error) {
    console.error("[recommendation-training] Training job failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Recommendation training failed safely; the current model remains unchanged." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
