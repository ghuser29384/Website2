interface SmartQueryLlmGateEnvironment {
  AI_QUERY_FALLBACK_ENABLED?: string;
  AI_QUERY_FALLBACK_KILL_SWITCH?: string;
  VERCEL_ENV?: string;
}

/**
 * Enables the ambiguity-only LLM fallback in Vercel production.
 *
 * Preview and local environments remain opt-in through
 * AI_QUERY_FALLBACK_ENABLED=true. The separate kill switch is the explicit
 * emergency off path in every environment. OPENAI_API_KEY availability is
 * still enforced by resolveSmartQueryWithLlm before any request is sent.
 */
export function activateProductionSmartQueryLlmFallback(
  environment: SmartQueryLlmGateEnvironment = process.env,
) {
  if (environment.AI_QUERY_FALLBACK_KILL_SWITCH === "true") return false;
  if (environment.AI_QUERY_FALLBACK_ENABLED === "true") return true;
  if (environment.VERCEL_ENV !== "production") return false;

  environment.AI_QUERY_FALLBACK_ENABLED = "true";
  return true;
}
