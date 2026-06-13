import { NextResponse } from "next/server";

import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";

export type MoralTradeApiRateLimitSurface =
  | "public_contract_read"
  | "offer_collection_read"
  | "offer_detail_read"
  | "offer_facets_read"
  | "offer_follow_write"
  | "offer_create_similar"
  | "saved_search_write"
  | "copilot_draft_review"
  | "match_signal_evaluate"
  | "matching_clearing_execute"
  | "clearing_preview_execute"
  | "baseline_integrity_enforce"
  | "agreement_amendment_enforce"
  | "side_agreement_enforce"
  | "trade_classification_enforce"
  | "template_conformance_enforce"
  | "challenge_appeal_evaluate"
  | "challenge_appeal_enforce"
  | "disclosure_evaluate"
  | "review_workflow_evaluate"
  | "profile_portability"
  | "background_opportunity_brief_read"
  | "background_opportunity_feedback_write"
  | "background_helper_run_write"
  | "background_wish_interview_write"
  | "background_source_summary_write"
  | "background_intro_packet_write"
  | "background_private_overlap_check"
  | "wish_registry_search"
  | "analytics_ingest";

export type MoralTradeApiCacheControl =
  | "no_store_dynamic"
  | "private_no_store"
  | "public_contract_static";

export const MORAL_TRADE_API_RATE_LIMITS = {
  public_contract_read: { limit: 240, windowMs: 60_000 },
  offer_collection_read: { limit: 120, windowMs: 60_000 },
  offer_detail_read: { limit: 120, windowMs: 60_000 },
  offer_facets_read: { limit: 120, windowMs: 60_000 },
  offer_follow_write: { limit: 30, windowMs: 60_000 },
  offer_create_similar: { limit: 30, windowMs: 60_000 },
  saved_search_write: { limit: 30, windowMs: 60_000 },
  copilot_draft_review: { limit: 30, windowMs: 60_000 },
  match_signal_evaluate: { limit: 60, windowMs: 60_000 },
  matching_clearing_execute: { limit: 20, windowMs: 60_000 },
  clearing_preview_execute: { limit: 30, windowMs: 60_000 },
  baseline_integrity_enforce: { limit: 20, windowMs: 60_000 },
  agreement_amendment_enforce: { limit: 20, windowMs: 60_000 },
  side_agreement_enforce: { limit: 20, windowMs: 60_000 },
  trade_classification_enforce: { limit: 20, windowMs: 60_000 },
  template_conformance_enforce: { limit: 20, windowMs: 60_000 },
  challenge_appeal_evaluate: { limit: 30, windowMs: 60_000 },
  challenge_appeal_enforce: { limit: 20, windowMs: 60_000 },
  disclosure_evaluate: { limit: 30, windowMs: 60_000 },
  review_workflow_evaluate: { limit: 60, windowMs: 60_000 },
  profile_portability: { limit: 12, windowMs: 60_000 },
  background_opportunity_brief_read: { limit: 60, windowMs: 60_000 },
  background_opportunity_feedback_write: { limit: 30, windowMs: 60_000 },
  background_helper_run_write: { limit: 12, windowMs: 60_000 },
  background_wish_interview_write: { limit: 20, windowMs: 60_000 },
  background_source_summary_write: { limit: 12, windowMs: 60_000 },
  background_intro_packet_write: { limit: 12, windowMs: 60_000 },
  background_private_overlap_check: { limit: 12, windowMs: 60_000 },
  wish_registry_search: { limit: 60, windowMs: 60_000 },
  analytics_ingest: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<MoralTradeApiRateLimitSurface, { limit: number; windowMs: number }>;

export const MORAL_TRADE_API_CACHE_CONTROL_HEADERS = {
  no_store_dynamic: "no-store",
  private_no_store: "private, no-store",
  public_contract_static: "public, max-age=300, stale-while-revalidate=3600",
} as const satisfies Record<MoralTradeApiCacheControl, string>;

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

export function buildMoralTradeApiJsonResponse(
  body: unknown,
  cacheControl: MoralTradeApiCacheControl = "no_store_dynamic",
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);

  headers.set("Cache-Control", MORAL_TRADE_API_CACHE_CONTROL_HEADERS[cacheControl]);

  return NextResponse.json(body, {
    ...init,
    headers,
  });
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
