import type { SupabaseClient } from "@supabase/supabase-js";

import type { Json } from "@/lib/supabase/database.types";
import type { HarmfulOfferAssessment } from "@/lib/moral-trade/harmful-offer-assessment";

import type {
  CreatePublishResult,
  ValidatedCreatePayload,
} from "./types";

interface RpcRow {
  submission_id: string | null;
  target_type: "offer" | "mpgf_pool_proposal" | null;
  target_id: string | null;
  submission_status: "pending_review" | "published" | "rejected";
  canonical_path: string | null;
  harm_assessment_id: string;
  harm_route: "allow" | "human_review" | "block";
}

export type PersistCreateSubmissionResult =
  | {
      outcome: "blocked";
      assessmentId: string;
    }
  | {
      outcome: "submitted";
      assessmentId: string;
      submission: CreatePublishResult;
    };

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function persistCreateSubmission(input: {
  supabase: SupabaseClient;
  actorId: string;
  validated: ValidatedCreatePayload;
  assessment: HarmfulOfferAssessment;
  origin: string;
}): Promise<PersistCreateSubmissionResult> {
  const { validated } = input;
  const targetFields = {
    existingPoolReference: validated.existingPoolReference,
    existingPoolAmountCents: validated.existingPoolAmountCents,
    existingPoolCurrency: validated.existingPoolCurrency,
  };

  const { data, error } = await input.supabase.rpc(
    "moral_trade_create_submit_with_harm_assessment_service" as never,
    {
      p_actor_id: input.actorId,
      p_submission_key: validated.source.submissionKey,
      p_submission_kind: validated.kind,
      p_source_payload: toJson(validated.source),
      p_payload_hash: validated.payloadHash,
      p_cause_area: validated.cause,
      p_request_kind: validated.source.requestKind,
      p_requested_action: validated.requestedAction,
      p_offered_summary: validated.offeredSummary,
      p_offered_terms: toJson(validated.offeredTerms),
      p_pool_terms: validated.poolTerms ? toJson(validated.poolTerms) : null,
      p_target_fields: toJson(targetFields),
      p_harm_assessment: toJson(input.assessment),
    } as never,
  );

  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null;
  if (!row?.harm_assessment_id || !row.harm_route) {
    throw new Error("The Create submission did not return a durable harm-assessment receipt.");
  }
  if (row.harm_route === "block") {
    return {
      outcome: "blocked",
      assessmentId: row.harm_assessment_id,
    };
  }
  if (!row.submission_id || !row.target_id || !row.target_type || !row.canonical_path) {
    throw new Error("The Create submission did not return a durable receipt.");
  }

  const isPool = row.target_type === "mpgf_pool_proposal";
  const isCommonGround = Boolean(validated.poolTerms?.commonGround);
  const kindLabel = validated.kind === "donation_redirect"
    ? "Donation redirect proposal"
    : validated.kind === "existing_pool_contribution"
      ? "Existing-pool contribution offer"
      : isCommonGround
        ? "Co-Fund proposal"
        : isPool
          ? "Moral public-goods pool proposal"
          : "Pledge-swap proposal";
  const safetyReview = row.harm_route === "human_review";

  return {
    outcome: "submitted",
    assessmentId: row.harm_assessment_id,
    submission: {
      id: row.submission_id,
      displayId: row.submission_id,
      status: row.submission_status === "published" ? "published" : "pending_review",
      targetType: row.target_type,
      targetId: row.target_id,
      canonicalPath: row.canonical_path,
      canonicalUrl: new URL(row.canonical_path, input.origin).toString(),
      objectLabel: kindLabel,
      title: "Your submission is in review.",
      lede: safetyReview
        ? "The proposal is saved privately for human safety review. It creates no obligation and cannot become public until that review and every other applicable gate pass."
        : isCommonGround
          ? "The shared-project split is saved privately. It cannot accept pledges until every named participant confirms and the remaining review gates pass."
          : isPool
            ? "The pool proposal is durable but not public and cannot accept pledges until its recipient, underwriting, reserve, formula, and operator-review gates are complete."
            : "The proposal is durable but not public. It creates no obligation until the remaining review is complete and both sides confirm final terms.",
      visibility: "Private until approved",
      openStatus: safetyReview
        ? "Pending human safety review"
        : "Pending standard Moral Trade review",
    },
  };
}
