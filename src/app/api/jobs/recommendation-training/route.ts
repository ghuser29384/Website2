import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { runParetoRecommendationTrainingJob } from "@/lib/recommendation-training";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runParetoRecommendationTrainingJob();
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
