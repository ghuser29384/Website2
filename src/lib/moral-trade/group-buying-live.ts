import { createServiceClient } from "@/lib/supabase/server";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type SourceStatus = "live" | "unavailable";
type PaymentAcceptanceStatus = "ready" | "pending" | "blocked" | "unavailable";

type CycleRow = {
  id: string;
  label: string;
  stage: string;
  mode: string;
  currency: string;
  budget_cents: number;
  status: string;
  proposal_opens_at: string | null;
  ballot_opens_at: string | null;
  ballot_closes_at: string | null;
  summary_published_at: string | null;
  created_at: string;
};

type CandidateAlternativeRow = {
  id: string;
  cycle_id: string | null;
  name: string;
  short_name: string;
  cause_area: string;
  recipient_name: string;
  description: string;
  moral_public_good_rationale: string;
  outcome_unit: string;
  status: string;
  operational_reliability_bps: number;
  risk_bps: number;
  tail_loss_bps: number;
  created_at: string;
};

type PoolProposalRow = {
  id: string;
  title: string;
  problem: string;
  intervention: string;
  moral_public_good_rationale: string;
  proposed_recipient_name: string | null;
  status: string;
  candidate_alternative_id: string | null;
  created_at: string;
  summary: string;
  cause_area: string;
  requested_maximum_funding_cents: number | string;
  minimum_viable_funding_cents: number | string | null;
  outcome_units_summary: string;
  expected_effect_vs_funding: string;
  timeline: string;
  submitted_at: string | null;
  reviewed_at: string | null;
};

type GateRow = {
  environment: string;
  gate_key: string;
  status: string;
  updated_at: string;
};

type MandateRow = {
  id: string;
  subject_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type PaymentAttemptRow = {
  mandate_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  refunded_amount_cents: number;
  created_at: string;
  updated_at: string;
};

type SettlementTransferRow = {
  mandate_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RecurringCommitmentRow = {
  amount_cents: number | string;
  currency: string;
  mode: string;
  status: string;
  next_scheduled_at: string | null;
  created_at: string;
  paused_at: string | null;
  cancelled_at: string | null;
};

export interface LiveGroupBuyingRoute {
  id: string;
  publicKey: string;
  title: string;
  summary: string;
  causeArea: string;
  recipientName: string;
  intervention: string;
  verificationSummary: string;
  expectedEffect: string;
  timeline: string;
  statusLabel: string;
  statusSentence: string;
  fundingMode: "real_money" | "pledge_only";
  currency: string;
  minimumFundingCents: number;
  targetFundingCents: number;
  deadlineAt: string | null;
  failureBehavior: string;
  href: string;
}

export interface LiveGroupBuyingFinancialState {
  currency: string;
  liveMandateCount: number;
  openMandateCount: number;
  openConditionalExposureCents: number;
  grossChargedCents: number;
  refundedCents: number;
  netChargedCents: number;
  transferredCents: number;
  activeRecurringCommitmentCount: number;
  activeRecurringMonthlyCents: number;
  latestFinancialActivityAt: string | null;
}

export interface LiveGroupBuyingPaymentReadiness {
  status: PaymentAcceptanceStatus;
  passedGateCount: number;
  pendingGateCount: number;
  blockedGateCount: number;
  totalGateCount: number;
  gates: Array<{
    key: string;
    label: string;
    status: "passed" | "pending" | "blocked" | "unknown";
    updatedAt: string;
  }>;
}

export interface LiveGroupBuyingSnapshot {
  sourceStatus: SourceStatus;
  checkedAt: string;
  routes: LiveGroupBuyingRoute[];
  openCycleCount: number;
  financial: LiveGroupBuyingFinancialState;
  paymentReadiness: LiveGroupBuyingPaymentReadiness;
}

const DEMO_MARKER = /(?:^|[\s:_-])(demo|sandbox|simulated|test(?:[\s_-]?only)?)(?:$|[\s:_-])/i;
const CLOSED_STATUS = /(closed|cancelled|canceled|expired|archived|completed|complete)/i;
const ACTIVE_MANDATE_STATUSES = new Set([
  "setup_pending",
  "ready",
  "charge_pending",
  "requires_action",
]);
const CHARGED_ATTEMPT_STATUSES = new Set(["succeeded", "refunded", "disputed"]);
const ACTIVE_RECURRING_STATUSES = new Set(["active", "provider_action_required"]);

const GATE_LABELS: Record<string, string> = {
  destination_approved: "Live recipient destination",
  legal_terms_approved: "Legal terms",
  operator_runbook_approved: "Operator runbook",
  payout_profile_approved: "Payout profile",
  recipient_compliance_policy_approved: "Recipient compliance",
  refund_policy_approved: "Refund policy",
  stripe_account_ready: "Stripe account",
  stripe_live_keys_configured: "Stripe live keys",
  stripe_webhook_configured: "Stripe webhook",
  terms_approved: "Participant terms",
  webhook_signature: "Signed webhook",
};

function isDemoValue(...values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(value && DEMO_MARKER.test(value)));
}

function numberFromDatabase(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

function latestTimestamp(values: Array<string | null | undefined>) {
  let latest: { value: string; time: number } | null = null;

  for (const value of values) {
    if (!value) {
      continue;
    }

    const time = Date.parse(value);
    if (!Number.isFinite(time)) {
      continue;
    }

    if (!latest || time > latest.time) {
      latest = { value, time };
    }
  }

  return latest?.value ?? null;
}

function normalizeGateStatus(value: string): "passed" | "pending" | "blocked" | "unknown" {
  if (value === "passed" || value === "pending" || value === "blocked") {
    return value;
  }

  return "unknown";
}

function emptySnapshot(checkedAt: string): LiveGroupBuyingSnapshot {
  return {
    sourceStatus: "unavailable",
    checkedAt,
    routes: [],
    openCycleCount: 0,
    financial: {
      currency: "USD",
      liveMandateCount: 0,
      openMandateCount: 0,
      openConditionalExposureCents: 0,
      grossChargedCents: 0,
      refundedCents: 0,
      netChargedCents: 0,
      transferredCents: 0,
      activeRecurringCommitmentCount: 0,
      activeRecurringMonthlyCents: 0,
      latestFinancialActivityAt: null,
    },
    paymentReadiness: {
      status: "unavailable",
      passedGateCount: 0,
      pendingGateCount: 0,
      blockedGateCount: 0,
      totalGateCount: 0,
      gates: [],
    },
  };
}

function assertQuerySucceeded(result: { error?: { message?: string } | null }, label: string) {
  if (result.error) {
    throw new Error(`${label} query failed`);
  }
}

function buildLiveRoutes(input: {
  cycles: CycleRow[];
  alternatives: CandidateAlternativeRow[];
  proposals: PoolProposalRow[];
}): { routes: LiveGroupBuyingRoute[]; openCycleCount: number } {
  const liveCycles = input.cycles.filter(
    (cycle) =>
      cycle.mode !== "non_real_money_demo" &&
      cycle.mode !== "test_mode" &&
      (cycle.mode === "real_money" || cycle.mode === "pledge_only") &&
      !isDemoValue(cycle.id, cycle.label, cycle.mode),
  );
  const openCycles = liveCycles.filter((cycle) => !CLOSED_STATUS.test(cycle.status));
  const openCycleById = new Map(openCycles.map((cycle) => [cycle.id, cycle]));
  const alternativeById = new Map(input.alternatives.map((alternative) => [alternative.id, alternative]));

  const routes = input.proposals
    .filter((proposal) => proposal.status === "approved_as_candidate")
    .map((proposal) => {
      const alternative = proposal.candidate_alternative_id
        ? alternativeById.get(proposal.candidate_alternative_id)
        : undefined;
      const cycle = alternative?.cycle_id ? openCycleById.get(alternative.cycle_id) : undefined;

      if (
        !alternative ||
        !cycle ||
        alternative.status === "approved_demo" ||
        isDemoValue(
          proposal.title,
          proposal.summary,
          proposal.proposed_recipient_name,
          alternative.id,
          alternative.name,
          alternative.recipient_name,
          alternative.status,
        )
      ) {
        return null;
      }

      const targetFundingCents = numberFromDatabase(proposal.requested_maximum_funding_cents);
      const minimumFundingCents = numberFromDatabase(proposal.minimum_viable_funding_cents);
      const fundingMode = cycle.mode === "real_money" ? "real_money" : "pledge_only";
      const statusLabel = fundingMode === "real_money" ? "Live real-money cycle" : "Live pledge-only cycle";

      return {
        id: proposal.id,
        publicKey: alternative.id,
        title: proposal.title,
        summary: proposal.summary || alternative.description,
        causeArea: proposal.cause_area || alternative.cause_area,
        recipientName: proposal.proposed_recipient_name || alternative.recipient_name,
        intervention: proposal.intervention,
        verificationSummary: proposal.outcome_units_summary || alternative.outcome_unit,
        expectedEffect: proposal.expected_effect_vs_funding,
        timeline: proposal.timeline,
        statusLabel,
        statusSentence: `Approved candidate in ${cycle.label}. ${
          fundingMode === "real_money"
            ? "Financial activity is read from live payment records."
            : "This route records real participant intent but does not move money."
        }`,
        fundingMode,
        currency: cycle.currency.toUpperCase(),
        minimumFundingCents,
        targetFundingCents,
        deadlineAt: cycle.ballot_closes_at ?? cycle.summary_published_at,
        failureBehavior:
          "If the cycle or its review conditions do not clear, no live settlement is created for this route.",
        href: "/contact",
      } satisfies LiveGroupBuyingRoute;
    })
    .filter((route): route is LiveGroupBuyingRoute => Boolean(route))
    .sort((left, right) => left.title.localeCompare(right.title));

  return { routes, openCycleCount: openCycles.length };
}

function buildPaymentReadiness(gates: GateRow[]): LiveGroupBuyingPaymentReadiness {
  const normalizedGates = gates
    .filter((gate) => gate.environment === "live")
    .map((gate) => ({
      key: gate.gate_key,
      label: GATE_LABELS[gate.gate_key] ?? gate.gate_key.replaceAll("_", " "),
      status: normalizeGateStatus(gate.status),
      updatedAt: gate.updated_at,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const passedGateCount = normalizedGates.filter((gate) => gate.status === "passed").length;
  const pendingGateCount = normalizedGates.filter((gate) => gate.status === "pending").length;
  const blockedGateCount = normalizedGates.filter((gate) => gate.status === "blocked").length;
  const totalGateCount = normalizedGates.length;
  const status: PaymentAcceptanceStatus =
    totalGateCount === 0
      ? "unavailable"
      : blockedGateCount > 0
        ? "blocked"
        : pendingGateCount > 0 || passedGateCount !== totalGateCount
          ? "pending"
          : "ready";

  return {
    status,
    passedGateCount,
    pendingGateCount,
    blockedGateCount,
    totalGateCount,
    gates: normalizedGates,
  };
}

function buildFinancialState(input: {
  mandates: MandateRow[];
  attempts: PaymentAttemptRow[];
  transfers: SettlementTransferRow[];
  recurring: RecurringCommitmentRow[];
}): LiveGroupBuyingFinancialState {
  const openMandates = input.mandates.filter((mandate) => ACTIVE_MANDATE_STATUSES.has(mandate.status));
  const chargedAttempts = input.attempts.filter((attempt) => CHARGED_ATTEMPT_STATUSES.has(attempt.status));
  const grossChargedCents = chargedAttempts.reduce(
    (total, attempt) => total + numberFromDatabase(attempt.amount_cents),
    0,
  );
  const refundedCents = chargedAttempts.reduce(
    (total, attempt) => total + numberFromDatabase(attempt.refunded_amount_cents),
    0,
  );
  const transferredCents = input.transfers
    .filter((transfer) => transfer.status === "transferred")
    .reduce((total, transfer) => total + numberFromDatabase(transfer.amount_cents), 0);
  const activeRecurring = input.recurring.filter(
    (commitment) =>
      commitment.mode === "real_money" && ACTIVE_RECURRING_STATUSES.has(commitment.status),
  );
  const currency =
    input.mandates[0]?.currency ??
    input.attempts[0]?.currency ??
    input.transfers[0]?.currency ??
    input.recurring[0]?.currency ??
    "USD";

  return {
    currency: currency.toUpperCase(),
    liveMandateCount: input.mandates.length,
    openMandateCount: openMandates.length,
    openConditionalExposureCents: openMandates.reduce(
      (total, mandate) => total + numberFromDatabase(mandate.amount_cents),
      0,
    ),
    grossChargedCents,
    refundedCents,
    netChargedCents: Math.max(0, grossChargedCents - refundedCents),
    transferredCents,
    activeRecurringCommitmentCount: activeRecurring.length,
    activeRecurringMonthlyCents: activeRecurring.reduce(
      (total, commitment) => total + numberFromDatabase(commitment.amount_cents),
      0,
    ),
    latestFinancialActivityAt: latestTimestamp([
      ...input.mandates.flatMap((mandate) => [mandate.created_at, mandate.updated_at]),
      ...input.attempts.flatMap((attempt) => [attempt.created_at, attempt.updated_at]),
      ...input.transfers.flatMap((transfer) => [transfer.created_at, transfer.updated_at]),
      ...input.recurring.flatMap((commitment) => [
        commitment.created_at,
        commitment.next_scheduled_at,
        commitment.paused_at,
        commitment.cancelled_at,
      ]),
    ]),
  };
}

export async function loadLiveGroupBuyingSnapshot(): Promise<LiveGroupBuyingSnapshot> {
  const checkedAt = new Date().toISOString();

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const [cyclesResult, alternativesResult, proposalsResult, gatesResult, mandatesResult, recurringResult] =
      await Promise.all([
        supabase
          .from("mpgf_cycles")
          .select(
            "id,label,stage,mode,currency,budget_cents,status,proposal_opens_at,ballot_opens_at,ballot_closes_at,summary_published_at,created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_candidate_alternatives")
          .select(
            "id,cycle_id,name,short_name,cause_area,recipient_name,description,moral_public_good_rationale,outcome_unit,status,operational_reliability_bps,risk_bps,tail_loss_bps,created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_pool_proposals")
          .select(
            "id,title,problem,intervention,moral_public_good_rationale,proposed_recipient_name,status,candidate_alternative_id,created_at,summary,cause_area,requested_maximum_funding_cents,minimum_viable_funding_cents,outcome_units_summary,expected_effect_vs_funding,timeline,submitted_at,reviewed_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("conditional_payment_gate_status")
          .select("environment,gate_key,status,updated_at")
          .eq("environment", "live")
          .order("gate_key", { ascending: true }),
        supabase
          .from("conditional_payment_mandates")
          .select("id,subject_id,amount_cents,currency,status,created_at,updated_at")
          .eq("purpose", "public_goods_pool")
          .eq("livemode", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_recurring_contribution_commitments")
          .select(
            "amount_cents,currency,mode,status,next_scheduled_at,created_at,paused_at,cancelled_at",
          )
          .eq("mode", "real_money")
          .order("created_at", { ascending: false }),
      ]);

    assertQuerySucceeded(cyclesResult, "Cycles");
    assertQuerySucceeded(alternativesResult, "Candidate alternatives");
    assertQuerySucceeded(proposalsResult, "Pool proposals");
    assertQuerySucceeded(gatesResult, "Payment gates");
    assertQuerySucceeded(mandatesResult, "Payment mandates");
    assertQuerySucceeded(recurringResult, "Recurring commitments");

    const mandates = (mandatesResult.data ?? []) as MandateRow[];
    const mandateIds = mandates.map((mandate) => mandate.id);
    let attempts: PaymentAttemptRow[] = [];
    let transfers: SettlementTransferRow[] = [];

    if (mandateIds.length > 0) {
      const [attemptsResult, transfersResult] = await Promise.all([
        supabase
          .from("conditional_payment_attempts")
          .select(
            "mandate_id,amount_cents,currency,status,refunded_amount_cents,created_at,updated_at",
          )
          .in("mandate_id", mandateIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("conditional_settlement_transfers")
          .select("mandate_id,amount_cents,currency,status,created_at,updated_at")
          .in("mandate_id", mandateIds)
          .order("created_at", { ascending: false }),
      ]);

      assertQuerySucceeded(attemptsResult, "Payment attempts");
      assertQuerySucceeded(transfersResult, "Settlement transfers");
      attempts = (attemptsResult.data ?? []) as PaymentAttemptRow[];
      transfers = (transfersResult.data ?? []) as SettlementTransferRow[];
    }

    const routeState = buildLiveRoutes({
      cycles: (cyclesResult.data ?? []) as CycleRow[],
      alternatives: (alternativesResult.data ?? []) as CandidateAlternativeRow[],
      proposals: (proposalsResult.data ?? []) as PoolProposalRow[],
    });

    return {
      sourceStatus: "live",
      checkedAt,
      routes: routeState.routes,
      openCycleCount: routeState.openCycleCount,
      financial: buildFinancialState({
        mandates,
        attempts,
        transfers,
        recurring: (recurringResult.data ?? []) as RecurringCommitmentRow[],
      }),
      paymentReadiness: buildPaymentReadiness((gatesResult.data ?? []) as GateRow[]),
    };
  } catch {
    return emptySnapshot(checkedAt);
  }
}
