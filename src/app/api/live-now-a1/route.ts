import { NextResponse } from "next/server";

import { GET as getReciprocalLiveNow } from "@/app/api/live-now/route";
import { getViewer } from "@/lib/app-data";
import {
  applyParetoLearningToLiveNowPayload,
  type ParetoRuntimePayload,
} from "@/lib/pareto-feed-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

export async function GET() {
  const baseResponse = await getReciprocalLiveNow();
  if (!baseResponse.ok) return baseResponse;

  let payload: ParetoRuntimePayload;
  try {
    payload = (await baseResponse.json()) as ParetoRuntimePayload;
  } catch {
    return baseResponse;
  }

  if (payload.authenticated !== true || !Array.isArray(payload.recommendations)) {
    return privateJson(payload);
  }

  const viewer = await getViewer();
  if (!viewer) return privateJson(payload);

  try {
    const enriched = await applyParetoLearningToLiveNowPayload({
      payload,
      profileId: viewer.authUser.id,
    });
    return privateJson(enriched);
  } catch (error) {
    console.error("[pareto-feed] Runtime enrichment failed safely", {
      message: error instanceof Error ? error.message : String(error),
    });
    return privateJson({
      ...payload,
      learningDiagnostics: {
        activeModelKey: "pareto-heuristic-v1",
        candidateModelKey: null,
        coldStart: true,
        directMatchesRandomized: false,
        exposureWriteStatus: "failed",
        experiment: {
          affectedCandidateKey: null,
          arm: "not_assigned",
          assignmentProbability: 0.05,
          enabled: false,
          jointPropensity: 0,
          stableBucket: 0,
          stoppedByGuardrail: false,
        },
        guardrailReasons: ["runtime_enrichment_unavailable"],
        mode: "heuristic",
        objective: "pareto_safe_additionality",
        privateProfileProseProcessed: false,
        requestId: "",
        sensitiveAttributesUsed: false,
      },
    });
  }
}
