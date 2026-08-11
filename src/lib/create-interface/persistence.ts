import type { SupabaseClient } from "@supabase/supabase-js";

import type { Json } from "@/lib/supabase/database.types";

import type {
  CreatePublishResult,
  ValidatedCreatePayload,
} from "./types";

interface RpcRow {
  submission_id: string;
  target_type: "offer" | "mpgf_pool_proposal";
  target_id: string;
  submission_status: "pending_review" | "published";
  canonical_path: string;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function persistCreateSubmission(input: {
  supabase: SupabaseClient;
  actorId: string;
  validated: ValidatedCreatePayload;
  origin: string;
}): Promise<CreatePublishResult> {
  const { validated } = input;
  const sourcePayload = {
    ...validated.source,
    groupContributionTerms:
      validated.groupContributionReviewRecord?.groupContributionTerms ?? null,
  };
  const targetFields = {
    existingPoolReference: validated.existingPoolReference,
    existingPoolAmountCents: validated.existingPoolAmountCents,
    existingPoolCurrency: validated.existingPoolCurrency,
  };

  const { data, error } = await input.supabase.rpc("moral_trade_create_submit_service" as never, {
    p_actor_id: input.actorId,
    p_submission_key: validated.source.submissionKey,
    p_submission_kind: validated.kind,
    p_source_payload: toJson(sourcePayload),
    p_payload_hash: validated.payloadHash,
    p_cause_area: validated.cause,
    p_request_kind: validated.source.requestKind,
    p_requested_action: validated.requestedAction,
    p_offered_summary: validated.offeredSummary,
    p_offered_terms: toJson(validated.offeredTerms),
    p_pool_terms: validated.poolTerms ? toJson(validated.poolTerms) : null,
    p_target_fields: toJson(targetFields),
  } as never);

  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null;
  if (!row?.submission_id || !row.target_id || !row.canonical_path) {
    throw new Error("The Create submission did not return a durable receipt.");
  }

  const isPool = row.target_type === "mpgf_pool_proposal";
  const isCommonGround = Boolean(validated.poolTerms?.commonGround);
  const groupModes = new Set(
    validated.groupContributionTerms.options.map((option) => option.terms.mode),
  );
  const hasCoAct = groupModes.has("co-act");
  const hasCoFund = groupModes.has("co-fund");
  const kindLabel = hasCoAct && hasCoFund
    ? "Co-Act and Co-Fund proposal"
    : hasCoAct
      ? "Co-Act proposal"
      : hasCoFund
        ? "Co-Fund proposal"
        : validated.kind === "donation_redirect"
    ? "Donation redirect proposal"
    : validated.kind === "existing_pool_contribution"
      ? "Existing-pool contribution offer"
      : isCommonGround
        ? "Co-Fund proposal"
        : isPool
          ? "Moral public-goods pool proposal"
          : "Pledge-swap proposal";

  return {
    id: row.submission_id,
    displayId: row.submission_id,
    status: row.submission_status,
    targetType: row.target_type,
    targetId: row.target_id,
    canonicalPath: row.canonical_path,
    canonicalUrl: new URL(row.canonical_path, input.origin).toString(),
    objectLabel: kindLabel,
    title: "Your submission is in review.",
    lede: hasCoAct || hasCoFund
      ? "The group terms are saved privately for review. They do not activate a group, enroll anyone, authorize payment, publish identities, or create an obligation."
      : isCommonGround
        ? "The shared-project split is saved privately. It cannot accept pledges until every named participant confirms and the review gates pass."
        : isPool
          ? "The pool proposal is durable but not public and cannot accept pledges until its recipient, underwriting, reserve, formula, and operator-review gates are complete."
          : "The proposal is durable but not public. It creates no obligation until review is complete and both sides confirm final terms.",
    visibility: "Private until approved",
    openStatus: "Pending Moral Trade review",
  };
}
