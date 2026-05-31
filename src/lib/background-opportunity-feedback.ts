import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_OPPORTUNITY_FEEDBACK_REASONS = [
  "not_relevant",
  "bad_timing",
  "too_vague",
  "safety_concern",
  "interested",
] as const;

export const BACKGROUND_OPPORTUNITY_FEEDBACK_OUTCOMES = [
  "dismissed",
  "interested",
] as const;

export type BackgroundOpportunityFeedbackReason =
  (typeof BACKGROUND_OPPORTUNITY_FEEDBACK_REASONS)[number];
export type BackgroundOpportunityFeedbackOutcome =
  (typeof BACKGROUND_OPPORTUNITY_FEEDBACK_OUTCOMES)[number];
type FeedbackInsert = Database["public"]["Tables"]["background_match_feedback"]["Insert"];
type OpportunityBriefStatus =
  Database["public"]["Tables"]["background_opportunity_briefs"]["Update"]["status"];

const REASON_SET = new Set<string>(BACKGROUND_OPPORTUNITY_FEEDBACK_REASONS);
const OUTCOME_SET = new Set<string>(BACKGROUND_OPPORTUNITY_FEEDBACK_OUTCOMES);

export function normalizeBackgroundOpportunityFeedbackReason(
  value: string,
): BackgroundOpportunityFeedbackReason | null {
  return REASON_SET.has(value) ? (value as BackgroundOpportunityFeedbackReason) : null;
}

export function normalizeBackgroundOpportunityFeedbackOutcome(
  value: string,
): BackgroundOpportunityFeedbackOutcome | null {
  return OUTCOME_SET.has(value) ? (value as BackgroundOpportunityFeedbackOutcome) : null;
}

export function getOpportunityBriefStatusForFeedback(
  outcome: BackgroundOpportunityFeedbackOutcome,
): OpportunityBriefStatus {
  return outcome === "interested" ? "interested" : "dismissed";
}

export function isBackgroundOpportunityFeedbackPairAllowed({
  outcome,
  reasonCode,
}: {
  outcome: BackgroundOpportunityFeedbackOutcome;
  reasonCode: BackgroundOpportunityFeedbackReason;
}) {
  return outcome === "interested"
    ? reasonCode === "interested"
    : reasonCode !== "interested";
}

export function buildBackgroundOpportunityFeedbackRow({
  matchId = null,
  opportunityBriefId,
  outcome,
  profileId,
  reasonCode,
}: {
  matchId?: string | null;
  opportunityBriefId: string;
  outcome: BackgroundOpportunityFeedbackOutcome;
  profileId: string;
  reasonCode: BackgroundOpportunityFeedbackReason;
}): FeedbackInsert {
  return {
    match_id: matchId,
    opportunity_brief_id: opportunityBriefId,
    outcome,
    profile_id: profileId,
    reason_code: reasonCode,
  };
}
