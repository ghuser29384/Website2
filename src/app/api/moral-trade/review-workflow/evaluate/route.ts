import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitBlocker,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getOfferReviewCardInstrumentation,
  getOfferReviewWorkflowCards,
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
  type OfferReviewWorkflowInput,
} from "@/lib/proposal-review";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 4000;

const STRING_REVIEW_FIELDS = [
  "id",
  "mode",
  "verification",
  "baselineOpposedCause",
  "requestedOpposedCause",
  "evidenceUrl",
  "moderationStatus",
  "offeredCause",
  "requestedCause",
  "currentStatus",
] as const satisfies ReadonlyArray<keyof OfferReviewWorkflowInput>;

const NUMBER_REVIEW_FIELDS = [
  "trustLevel",
  "baselineAmountUsd",
  "requestedMatchingAmountUsd",
  "offerImpact",
  "minCounterpartyImpact",
] as const satisfies ReadonlyArray<keyof OfferReviewWorkflowInput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringField(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_TEXT_FIELD_LENGTH);
}

function normalizeNumberField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeReviewInput(record: Record<string, unknown>): OfferReviewWorkflowInput {
  const normalized: OfferReviewWorkflowInput = {
    mode: "",
    verification: "",
  };

  for (const field of STRING_REVIEW_FIELDS) {
    normalized[field] = normalizeStringField(record[field]);
  }

  for (const field of NUMBER_REVIEW_FIELDS) {
    normalized[field] = normalizeNumberField(record[field]);
  }

  return normalized;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "review_workflow_evaluate");

  if (rateLimit.limited) {
    return jsonResponse(
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
        fallback:
          "Rate-limited review-workflow evaluation falls back to manual review without changing proposal state.",
        blockers: [buildMoralTradeApiRateLimitBlocker(rateLimit.surface)],
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    );
  }

  const contract = getOfferReviewWorkflowContract();
  const contractValidation = validateOfferReviewWorkflowContract(contract);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: "deterministic_review_workflow_only",
        stateMutation: false,
        inputBundleUsed: ["structured_review_input", "review_workflow_contract"],
        contractValidation,
        fallback:
          "Invalid JSON falls back to manual review without changing proposal state.",
        blockers: ["invalid_json_body"],
      },
      400,
    );
  }

  if (!isRecord(body) || !isRecord(body.reviewInput)) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: "deterministic_review_workflow_only",
        stateMutation: false,
        inputBundleUsed: ["structured_review_input", "review_workflow_contract"],
        contractValidation,
        fallback:
          "Missing structured reviewInput falls back to manual review without changing proposal state.",
        blockers: ["reviewInput: structured review input object is required"],
      },
      400,
    );
  }

  const reviewInput = normalizeReviewInput(body.reviewInput);
  const workflowCards = getOfferReviewWorkflowCards(reviewInput);
  const marketplaceCard = getOfferReviewCardInstrumentation(reviewInput);
  const blockers = contractValidation.blockers;

  return jsonResponse(
    {
      ok: blockers.length === 0,
      checkedAt: new Date().toISOString(),
      contractVersion: contract.version,
      decisioningMode: "deterministic_review_workflow_only",
      stateMutation: false,
      inputBundleUsed: ["structured_review_input", "review_workflow_contract"],
      reviewInput,
      workflowCards,
      marketplaceCard,
      contractValidation,
      blockers,
    },
    blockers.length ? 422 : 200,
  );
}
