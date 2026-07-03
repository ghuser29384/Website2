import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS,
  MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES,
  MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS,
  MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
  MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY,
  evaluateMpgfPivotalityCalculator,
} from "@/lib/mpgf/public-goods-pivotality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAMPLE_INPUT = {
  calculatorSurface: "advanced_explainer",
  contributionCents: 5_000,
  thresholdCents: 50_000,
  valueRatio: "0.20",
  pSuccessWithoutMe: "0.30",
  userEstimatedPDecisive: "0.25",
  signerOnlyRewardValue: "0",
  nonDecisiveExtraFundingValueFraction: "0",
};

function formDataToInput(formData: FormData) {
  const input: Record<string, unknown> = {
    calculatorSurface: String(formData.get("calculatorSurface") ?? ""),
    contributionCents: Number(formData.get("contributionCents")),
    thresholdCents: Number(formData.get("thresholdCents")),
    valueRatio: String(formData.get("valueRatio") ?? ""),
    pSuccessWithoutMe: String(formData.get("pSuccessWithoutMe") ?? ""),
    userEstimatedPDecisive: String(formData.get("userEstimatedPDecisive") ?? ""),
    signerOnlyRewardValue: String(formData.get("signerOnlyRewardValue") || "0"),
    nonDecisiveExtraFundingValueFraction: String(
      formData.get("nonDecisiveExtraFundingValueFraction") || "0",
    ),
  };

  const knownKeys = new Set<string>([
    ...MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS,
    ...MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS,
  ]);

  for (const key of formData.keys()) {
    if (!knownKeys.has(key)) {
      input[key] = String(formData.get(key) ?? "");
    }
  }

  for (const key of MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS) {
    if (formData.has(key)) {
      input[key] = String(formData.get(key) ?? "");
    }
  }

  return input;
}

async function requestInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return formDataToInput(await request.formData());
  }

  return request.json().catch(() => null);
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      policy: MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY,
      allowedSurfaces: MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES,
      forbiddenLiveKeys: MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS,
      isolationNotice: MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
      sampleInput: SAMPLE_INPUT,
      sampleResult: evaluateMpgfPivotalityCalculator(SAMPLE_INPUT),
    },
    { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}

export async function POST(request: Request) {
  const result = evaluateMpgfPivotalityCalculator(await requestInput(request));

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}
