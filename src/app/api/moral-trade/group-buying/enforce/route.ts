import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_GOODS_SEED_CREDITED_UNITS,
  MORAL_GOODS_SEED_ENVELOPES,
  MORAL_GOODS_SEED_FUNDING_SOURCES,
  MORAL_GOODS_SEED_OBLIGATIONS,
  buildSettlementPlan,
  evaluateEnvelopeReadiness,
  flagParticipantProposalForThreats,
  getMoralGoodsGroupBuyingContract,
  validateMoralGoodsGroupBuyingContract,
} from "@/lib/moral-trade/group-buying";

export const dynamic = "force-dynamic";

const REQUEST_KEYS = new Set(["operation", "envelopeId", "proposal", "idempotencyKey"]);
const OPERATIONS = new Set([
  "readiness_check",
  "settlement_preview",
  "proposal_safety_review",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unsupportedKeys(value: Record<string, unknown>) {
  return Object.keys(value)
    .filter((key) => !REQUEST_KEYS.has(key))
    .map((key) => `request.${key}: unsupported group-buying enforcement key`);
}

function blocked(status: number, blocker: string, detail: string, extraBlockers: string[] = []) {
  return buildMoralTradeApiJsonResponse(
    {
      blocker,
      blockers: [blocker, ...extraBlockers],
      detail,
      ok: false,
      stateMutation: false,
    },
    "no_store_dynamic",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "group_buying_enforce");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited group-buying enforcement creates no launch, activation, settlement, proposal, or public-report state change.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return blocked(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no group-buying state change.",
    );
  }

  if (!isRecord(body)) {
    return blocked(
      400,
      "request_body_object_required",
      "The group-buying enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body);
  const operation = stringField(body.operation);
  if (!OPERATIONS.has(operation)) {
    return blocked(
      400,
      "unsupported_group_buying_operation",
      "Supported operations are readiness_check, settlement_preview, and proposal_safety_review.",
      requestBlockers,
    );
  }

  const contract = getMoralGoodsGroupBuyingContract();
  const validation = validateMoralGoodsGroupBuyingContract(contract);
  if (validation.status !== "pass") {
    return blocked(
      503,
      "group_buying_contract_validation_failed",
      "Group-buying contract validation failed closed before enforcement.",
      [...requestBlockers, ...validation.blockers],
    );
  }

  if (operation === "proposal_safety_review") {
    const proposal = isRecord(body.proposal) ? body.proposal : {};
    const result = flagParticipantProposalForThreats({
      proposedActionText: stringField(proposal.proposedActionText),
      proposedConsiderationText: stringField(proposal.proposedConsiderationText),
      safetyOrAccessConcerns: stringField(proposal.safetyOrAccessConcerns),
    });

    return buildMoralTradeApiJsonResponse({
      blockers: [...requestBlockers, ...(result.status === "blocked" ? result.flags : [])],
      checkedAt: new Date().toISOString(),
      ok: requestBlockers.length === 0 && result.status !== "blocked",
      proposalSafety: result,
      stateMutation: false,
    });
  }

  const envelopeId = stringField(body.envelopeId);
  const envelope =
    MORAL_GOODS_SEED_ENVELOPES.find((entry) => entry.id === envelopeId || entry.slug === envelopeId) ??
    null;

  if (!envelope) {
    return blocked(
      404,
      "group_buying_envelope_not_found",
      "No group-buying round, lot, basket, or standing budget matched the requested id.",
      requestBlockers,
    );
  }

  if (operation === "readiness_check") {
    const readiness = evaluateEnvelopeReadiness({
      envelope,
      phase: "launch",
      now: new Date().toISOString(),
    });

    return buildMoralTradeApiJsonResponse({
      blockers: [...requestBlockers, ...readiness.blockers],
      checkedAt: new Date().toISOString(),
      envelopeId: envelope.id,
      ok: requestBlockers.length === 0 && readiness.status === "pass",
      readiness,
      stateMutation: false,
    });
  }

  const plan = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES,
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });

  return buildMoralTradeApiJsonResponse({
    blockers: [...requestBlockers, ...plan.blockers],
    checkedAt: new Date().toISOString(),
    envelopeId: envelope.id,
    ok: requestBlockers.length === 0 && plan.blockers.length === 0,
    settlementPreview: plan,
    stateMutation: false,
  });
}
