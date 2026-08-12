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
  | "release_gate_enforce"
  | "baseline_integrity_enforce"
  | "agreement_amendment_enforce"
  | "production_readiness_enforce"
  | "side_agreement_enforce"
  | "trade_classification_enforce"
  | "template_conformance_enforce"
  | "review_capacity_enforce"
  | "participant_term_sheet_enforce"
  | "participant_confirmation_enforce"
  | "participant_eligibility_enforce"
  | "account_security_enforce"
  | "reviewer_quality_enforce"
  | "protective_assessment_enforce"
  | "user_safety_content_moderation_enforce"
  | "financial_settlement_controls_enforce"
  | "recipient_acceptance_enforce"
  | "ai_preference_elicitation_enforce"
  | "post_clear_audit_enforce"
  | "non_public_goods_subsidy_enforce"
  | "non_public_goods_tier_enforce"
  | "risk_control_matrix_enforce"
  | "preference_integrity_enforce"
  | "commitment_settlement_enforce"
  | "group_buying_enforce"
  | "participant_credibility_enforce"
  | "opportunity_meal_evidence_enforce"
  | "guest_witness_invite_write"
  | "guest_witness_testimony_write"
  | "guest_witness_review_write"
  | "pledge_performance_bond_enforce"
  | "pledge_swap_performance_schedule_enforce"
  | "negative_commitment_scope_enforce"
  | "donor_of_record_tax_enforce"
  | "action_reversibility_enforce"
  | "authority_obligation_enforce"
  | "direct_pair_clearing_enforce"
  | "cause_bucket_taxonomy_enforce"
  | "resource_compatibility_enforce"
  | "net_offset_accounting_enforce"
  | "offer_validity_enforce"
  | "private_exchange_rate_enforce"
  | "noncompensable_blocker_enforce"
  | "batch_clearing_objective_enforce"
  | "sensitive_evidence_attestation_enforce"
  | "pilot_evidence_enforce"
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
  | "background_subject_identity_write"
  | "background_claim_assurance_write"
  | "background_pairwise_safety_write"
  | "background_intro_packet_write"
  | "background_private_overlap_check"
  | "wish_registry_search"
  | "participant_directory_search"
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
  release_gate_enforce: { limit: 20, windowMs: 60_000 },
  baseline_integrity_enforce: { limit: 20, windowMs: 60_000 },
  agreement_amendment_enforce: { limit: 20, windowMs: 60_000 },
  production_readiness_enforce: { limit: 20, windowMs: 60_000 },
  side_agreement_enforce: { limit: 20, windowMs: 60_000 },
  trade_classification_enforce: { limit: 20, windowMs: 60_000 },
  template_conformance_enforce: { limit: 20, windowMs: 60_000 },
  review_capacity_enforce: { limit: 20, windowMs: 60_000 },
  participant_term_sheet_enforce: { limit: 20, windowMs: 60_000 },
  participant_confirmation_enforce: { limit: 20, windowMs: 60_000 },
  participant_eligibility_enforce: { limit: 20, windowMs: 60_000 },
  account_security_enforce: { limit: 20, windowMs: 60_000 },
  reviewer_quality_enforce: { limit: 20, windowMs: 60_000 },
  protective_assessment_enforce: { limit: 20, windowMs: 60_000 },
  user_safety_content_moderation_enforce: { limit: 20, windowMs: 60_000 },
  financial_settlement_controls_enforce: { limit: 20, windowMs: 60_000 },
  recipient_acceptance_enforce: { limit: 20, windowMs: 60_000 },
  ai_preference_elicitation_enforce: { limit: 20, windowMs: 60_000 },
  post_clear_audit_enforce: { limit: 20, windowMs: 60_000 },
  non_public_goods_subsidy_enforce: { limit: 20, windowMs: 60_000 },
  non_public_goods_tier_enforce: { limit: 20, windowMs: 60_000 },
  risk_control_matrix_enforce: { limit: 20, windowMs: 60_000 },
  preference_integrity_enforce: { limit: 20, windowMs: 60_000 },
  commitment_settlement_enforce: { limit: 20, windowMs: 60_000 },
  group_buying_enforce: { limit: 20, windowMs: 60_000 },
  participant_credibility_enforce: { limit: 20, windowMs: 60_000 },
  opportunity_meal_evidence_enforce: { limit: 20, windowMs: 60_000 },
  guest_witness_invite_write: { limit: 12, windowMs: 60_000 },
  guest_witness_testimony_write: { limit: 20, windowMs: 60_000 },
  guest_witness_review_write: { limit: 20, windowMs: 60_000 },
  pledge_performance_bond_enforce: { limit: 20, windowMs: 60_000 },
  pledge_swap_performance_schedule_enforce: { limit: 20, windowMs: 60_000 },
  negative_commitment_scope_enforce: { limit: 20, windowMs: 60_000 },
  donor_of_record_tax_enforce: { limit: 20, windowMs: 60_000 },
  action_reversibility_enforce: { limit: 20, windowMs: 60_000 },
  authority_obligation_enforce: { limit: 20, windowMs: 60_000 },
  direct_pair_clearing_enforce: { limit: 20, windowMs: 60_000 },
  cause_bucket_taxonomy_enforce: { limit: 20, windowMs: 60_000 },
  resource_compatibility_enforce: { limit: 20, windowMs: 60_000 },
  net_offset_accounting_enforce: { limit: 20, windowMs: 60_000 },
  offer_validity_enforce: { limit: 20, windowMs: 60_000 },
  private_exchange_rate_enforce: { limit: 20, windowMs: 60_000 },
  noncompensable_blocker_enforce: { limit: 20, windowMs: 60_000 },
  batch_clearing_objective_enforce: { limit: 20, windowMs: 60_000 },
  sensitive_evidence_attestation_enforce: { limit: 20, windowMs: 60_000 },
  pilot_evidence_enforce: { limit: 20, windowMs: 60_000 },
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
  background_subject_identity_write: { limit: 8, windowMs: 60_000 },
  background_claim_assurance_write: { limit: 8, windowMs: 60_000 },
  background_pairwise_safety_write: { limit: 12, windowMs: 60_000 },
  background_intro_packet_write: { limit: 12, windowMs: 60_000 },
  background_private_overlap_check: { limit: 12, windowMs: 60_000 },
  wish_registry_search: { limit: 60, windowMs: 60_000 },
  participant_directory_search: { limit: 30, windowMs: 60_000 },
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
