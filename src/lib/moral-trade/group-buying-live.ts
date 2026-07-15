import { createClient } from "@/lib/supabase/server";

type SourceStatus = "live" | "unavailable";
type PaymentAcceptanceStatus = "ready" | "pending" | "blocked" | "unavailable";
type PaymentGateStatus = "passed" | "pending" | "blocked" | "unknown";

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
    status: PaymentGateStatus;
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

type PublicSnapshotRpcClient = Awaited<ReturnType<typeof createClient>> & {
  rpc: (
    functionName: string,
  ) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return value === null || typeof value === "string" ? value : undefined;
}

function readNonNegativeInteger(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseRoute(value: unknown): LiveGroupBuyingRoute | null {
  if (!isRecord(value)) {
    return null;
  }

  const fundingMode = readString(value, "fundingMode");
  const deadlineAt = readNullableString(value, "deadlineAt");
  const minimumFundingCents = readNonNegativeInteger(value, "minimumFundingCents");
  const targetFundingCents = readNonNegativeInteger(value, "targetFundingCents");
  const stringFields = [
    "id",
    "publicKey",
    "title",
    "summary",
    "causeArea",
    "recipientName",
    "intervention",
    "verificationSummary",
    "expectedEffect",
    "timeline",
    "statusLabel",
    "statusSentence",
    "currency",
    "failureBehavior",
    "href",
  ] as const;
  const strings = Object.fromEntries(stringFields.map((key) => [key, readString(value, key)])) as Record<
    (typeof stringFields)[number],
    string | null
  >;

  if (
    Object.values(strings).some((field) => field === null) ||
    (fundingMode !== "real_money" && fundingMode !== "pledge_only") ||
    deadlineAt === undefined ||
    minimumFundingCents === null ||
    targetFundingCents === null
  ) {
    return null;
  }

  return {
    id: strings.id!,
    publicKey: strings.publicKey!,
    title: strings.title!,
    summary: strings.summary!,
    causeArea: strings.causeArea!,
    recipientName: strings.recipientName!,
    intervention: strings.intervention!,
    verificationSummary: strings.verificationSummary!,
    expectedEffect: strings.expectedEffect!,
    timeline: strings.timeline!,
    statusLabel: strings.statusLabel!,
    statusSentence: strings.statusSentence!,
    fundingMode,
    currency: strings.currency!,
    minimumFundingCents,
    targetFundingCents,
    deadlineAt,
    failureBehavior: strings.failureBehavior!,
    href: strings.href!,
  };
}

function parseFinancialState(value: unknown): LiveGroupBuyingFinancialState | null {
  if (!isRecord(value)) {
    return null;
  }

  const currency = readString(value, "currency");
  const latestFinancialActivityAt = readNullableString(value, "latestFinancialActivityAt");
  const numericFields = [
    "liveMandateCount",
    "openMandateCount",
    "openConditionalExposureCents",
    "grossChargedCents",
    "refundedCents",
    "netChargedCents",
    "transferredCents",
    "activeRecurringCommitmentCount",
    "activeRecurringMonthlyCents",
  ] as const;
  const numbers = Object.fromEntries(
    numericFields.map((key) => [key, readNonNegativeInteger(value, key)]),
  ) as Record<(typeof numericFields)[number], number | null>;

  if (!currency || latestFinancialActivityAt === undefined || Object.values(numbers).some((field) => field === null)) {
    return null;
  }

  return {
    currency,
    liveMandateCount: numbers.liveMandateCount!,
    openMandateCount: numbers.openMandateCount!,
    openConditionalExposureCents: numbers.openConditionalExposureCents!,
    grossChargedCents: numbers.grossChargedCents!,
    refundedCents: numbers.refundedCents!,
    netChargedCents: numbers.netChargedCents!,
    transferredCents: numbers.transferredCents!,
    activeRecurringCommitmentCount: numbers.activeRecurringCommitmentCount!,
    activeRecurringMonthlyCents: numbers.activeRecurringMonthlyCents!,
    latestFinancialActivityAt,
  };
}

function parsePaymentReadiness(value: unknown): LiveGroupBuyingPaymentReadiness | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = readString(value, "status");
  const allowedStatuses = new Set<PaymentAcceptanceStatus>(["ready", "pending", "blocked", "unavailable"]);
  const countFields = ["passedGateCount", "pendingGateCount", "blockedGateCount", "totalGateCount"] as const;
  const counts = Object.fromEntries(countFields.map((key) => [key, readNonNegativeInteger(value, key)])) as Record<
    (typeof countFields)[number],
    number | null
  >;
  const gatesValue = value.gates;

  if (!status || !allowedStatuses.has(status as PaymentAcceptanceStatus) || !Array.isArray(gatesValue)) {
    return null;
  }

  if (Object.values(counts).some((field) => field === null)) {
    return null;
  }

  const gates = gatesValue.map((gate): LiveGroupBuyingPaymentReadiness["gates"][number] | null => {
    if (!isRecord(gate)) {
      return null;
    }

    const key = readString(gate, "key");
    const label = readString(gate, "label");
    const gateStatus = readString(gate, "status");
    const updatedAt = readString(gate, "updatedAt");

    if (
      !key ||
      !label ||
      !updatedAt ||
      (gateStatus !== "passed" && gateStatus !== "pending" && gateStatus !== "blocked" && gateStatus !== "unknown")
    ) {
      return null;
    }

    return { key, label, status: gateStatus, updatedAt };
  });

  if (gates.some((gate) => gate === null)) {
    return null;
  }

  return {
    status: status as PaymentAcceptanceStatus,
    passedGateCount: counts.passedGateCount!,
    pendingGateCount: counts.pendingGateCount!,
    blockedGateCount: counts.blockedGateCount!,
    totalGateCount: counts.totalGateCount!,
    gates: gates as LiveGroupBuyingPaymentReadiness["gates"],
  };
}

function parseLiveSnapshot(value: unknown, fallbackCheckedAt: string): LiveGroupBuyingSnapshot | null {
  if (!isRecord(value) || value.sourceStatus !== "live" || !Array.isArray(value.routes)) {
    return null;
  }

  const checkedAt = readString(value, "checkedAt") ?? fallbackCheckedAt;
  const openCycleCount = readNonNegativeInteger(value, "openCycleCount");
  const financial = parseFinancialState(value.financial);
  const paymentReadiness = parsePaymentReadiness(value.paymentReadiness);
  const routes = value.routes.map(parseRoute);

  if (
    openCycleCount === null ||
    !financial ||
    !paymentReadiness ||
    routes.some((route) => route === null)
  ) {
    return null;
  }

  return {
    sourceStatus: "live",
    checkedAt,
    routes: routes as LiveGroupBuyingRoute[],
    openCycleCount,
    financial,
    paymentReadiness,
  };
}

export async function loadLiveGroupBuyingSnapshot(): Promise<LiveGroupBuyingSnapshot> {
  const checkedAt = new Date().toISOString();

  try {
    const supabase = (await createClient()) as PublicSnapshotRpcClient;
    const { data, error } = await supabase.rpc("get_public_group_buying_snapshot");

    if (error) {
      throw new Error(error.message || "Public group-buying snapshot RPC failed.");
    }

    return parseLiveSnapshot(data, checkedAt) ?? emptySnapshot(checkedAt);
  } catch {
    return emptySnapshot(checkedAt);
  }
}
