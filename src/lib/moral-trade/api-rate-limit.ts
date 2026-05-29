import { NextResponse } from "next/server";

import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";

export type MoralTradeApiRateLimitSurface =
  | "public_contract_read"
  | "copilot_draft_review"
  | "match_signal_evaluate"
  | "challenge_appeal_evaluate"
  | "disclosure_evaluate"
  | "review_workflow_evaluate"
  | "profile_portability";

export const MORAL_TRADE_API_RATE_LIMITS = {
  public_contract_read: { limit: 240, windowMs: 60_000 },
  copilot_draft_review: { limit: 30, windowMs: 60_000 },
  match_signal_evaluate: { limit: 60, windowMs: 60_000 },
  challenge_appeal_evaluate: { limit: 30, windowMs: 60_000 },
  disclosure_evaluate: { limit: 30, windowMs: 60_000 },
  review_workflow_evaluate: { limit: 60, windowMs: 60_000 },
  profile_portability: { limit: 12, windowMs: 60_000 },
} as const satisfies Record<MoralTradeApiRateLimitSurface, { limit: number; windowMs: number }>;

export function takeMoralTradeApiRateLimitSlot(
  request: Request,
  surface: MoralTradeApiRateLimitSurface,
) {
  const config = MORAL_TRADE_API_RATE_LIMITS[surface];
  const result = takeRateLimitSlot(getRequestRateLimitKey(request, surface), config);

  return {
    ...result,
    limit: config.limit,
    retryAfterSeconds: getRetryAfterSeconds(result.resetAt),
    surface,
    windowMs: config.windowMs,
  };
}

export function buildMoralTradeApiRateLimitBlocker(surface: MoralTradeApiRateLimitSurface) {
  return `rate_limit_exceeded:${surface}`;
}

export function buildMoralTradeApiRateLimitResponse(
  rateLimit: ReturnType<typeof takeMoralTradeApiRateLimitSlot>,
  fallback: string,
  cacheControl = "no-store",
) {
  return NextResponse.json(
    {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: "rate_limited",
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
        surface: rateLimit.surface,
        windowMs: rateLimit.windowMs,
      },
      fallback,
      blockers: [buildMoralTradeApiRateLimitBlocker(rateLimit.surface)],
    },
    {
      headers: {
        "Cache-Control": cacheControl,
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
      status: 429,
    },
  );
}
