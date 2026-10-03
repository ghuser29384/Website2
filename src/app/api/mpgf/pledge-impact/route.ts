import { NextResponse } from "next/server";

import {
  evaluatePledgeImpactLiveBundle,
  isPledgeImpactPoolPublicKey,
  type PledgeImpactApiResponse,
} from "@/lib/mpgf/pledge-impact-live";
import { loadPledgeImpactLiveBundle } from "@/lib/mpgf/pledge-impact-live-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS });
}

function readPledgeCents(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100_000_000
    ? parsed
    : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const poolPublicKey = url.searchParams.get("pool") ?? "";
  if (!isPledgeImpactPoolPublicKey(poolPublicKey)) {
    return json({ error: "Unknown or malformed pool public key." }, 400);
  }

  const pledgeCents = readPledgeCents(url.searchParams.get("pledgeCents"));
  if (pledgeCents === null) {
    return json(
      { error: "pledgeCents must be a non-negative whole number of cents." },
      400,
    );
  }

  try {
    const bundle = await loadPledgeImpactLiveBundle(poolPublicKey);
    return json(
      evaluatePledgeImpactLiveBundle({ bundle, pledgeCents }),
    );
  } catch {
    const unavailable: PledgeImpactApiResponse = {
      status: "unavailable",
      experimental: true,
      poolPublicKey,
      pledgeCents,
      reason: "service_unavailable",
      message: "The live pledge-impact service is temporarily unavailable.",
      poolState: null,
      poolStateSha256: null,
      mechanicalEffect: null,
    };
    return json(unavailable);
  }
}
