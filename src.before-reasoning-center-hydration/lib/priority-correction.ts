import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type JsonRecord = Record<string, unknown>;

export interface ImpactContributionRecord {
  id: string;
  profile_id: string;
  contribution_kind: "donation" | "money_equivalent";
  cause_area: string;
  action_label: string;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  evidence_url: string;
  evidence_note: string;
  verification_status: "self_reported" | "verified" | "imported";
  source_label: string;
  created_at: string;
  updated_at: string;
}

export interface PriorityCorrectionCycleRecord {
  id: string;
  cycle_month: string;
  source_period_start: string;
  source_period_end: string;
  carryover_in_cents: number;
  calculated_fund_cents: number;
  published_fund_cents: number;
  status:
    | "draft"
    | "published"
    | "specific_action_review"
    | "cause_area_review"
    | "reserved"
    | "finalized";
  published_at: string | null;
  specific_actions_due_at: string | null;
  specific_actions_revision_due_at: string | null;
  cause_area_due_at: string | null;
  cause_area_revision_due_at: string | null;
  reserve_reason: string;
  notes: string;
  created_by: string | null;
  carryover_consumed_by_cycle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriorityCorrectionMemberSnapshotRecord {
  cycle_id: string;
  profile_id: string;
  donation_cents: number;
  peer_payment_cents: number;
  qualifying_cents: number;
  fund_share_cents: number;
  prioritized_cause_area: string | null;
  prioritized_share_basis_points: number;
  priority_cause_cents: number;
  lifetime_contribution_cents: number;
  created_at: string;
}

export interface PriorityCorrectionArbiterAssignmentRecord {
  id: string;
  cycle_id: string;
  profile_id: string;
  role: "specific_action_arbiter" | "cause_area_arbiter";
  cause_area: string | null;
  selection_pool: string;
  selection_score: number;
  status: "active" | "completed" | "recused" | "replaced";
  created_at: string;
}

export interface PrioritySpecificActionSubmissionRecord {
  id: string;
  cycle_id: string;
  cause_area: string;
  version: number;
  submitted_by: string;
  title: string;
  combination_summary: string;
  allocation_schedule: Array<{ label: string; text: string }>;
  effect_schedule: Array<{ label: string; text: string }>;
  reasoning: string;
  status: "draft" | "published" | "reconsideration_requested" | "superseded" | "excluded";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrioritySpecificActionPositionRecord {
  id: string;
  submission_id: string;
  arbiter_assignment_id: string;
  stance: "agree" | "dissent";
  note: string;
  created_at: string;
}

export interface PrioritySpecificActionFeedbackRecord {
  submission_id: string;
  profile_id: string;
  stance: "object" | "agree_with_dissent";
  created_at: string;
}

export interface PriorityCauseAreaAllocationRecord {
  id: string;
  cycle_id: string;
  version: number;
  submitted_by: string;
  allocation_schedule: Array<{ label: string; text: string }>;
  expected_impact: string;
  reasoning: string;
  status: "draft" | "published" | "reconsideration_requested" | "superseded" | "reserved";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriorityCauseAreaPositionRecord {
  id: string;
  allocation_id: string;
  arbiter_assignment_id: string;
  stance: "agree" | "dissent";
  note: string;
  created_at: string;
}

export interface PriorityCauseAreaFeedbackRecord {
  allocation_id: string;
  profile_id: string;
  stance: "object" | "agree_with_dissent";
  created_at: string;
}

export interface PriorityCauseAreaSummary {
  causeArea: string;
  eligibleMemberCount: number;
  specificActionArbiters: PriorityCorrectionArbiterAssignmentRecord[];
  latestSubmission: PrioritySpecificActionSubmissionRecord | null;
  agreeCount: number;
  dissentCount: number;
  objectionCount: number;
  feedbackCount: number;
  thresholdTriggered: boolean;
}

export interface PriorityCorrectionPageData {
  cycles: PriorityCorrectionCycleRecord[];
  currentCycle: PriorityCorrectionCycleRecord | null;
  recentContributions: ImpactContributionRecord[];
  viewerSnapshot: PriorityCorrectionMemberSnapshotRecord | null;
  viewerAssignments: PriorityCorrectionArbiterAssignmentRecord[];
  specificActionSubmissions: PrioritySpecificActionSubmissionRecord[];
  specificActionPositions: PrioritySpecificActionPositionRecord[];
  specificActionFeedback: PrioritySpecificActionFeedbackRecord[];
  causeAreaAllocationSubmissions: PriorityCauseAreaAllocationRecord[];
  causeAreaAllocationPositions: PriorityCauseAreaPositionRecord[];
  causeAreaAllocationFeedback: PriorityCauseAreaFeedbackRecord[];
  causeAreaSummaries: PriorityCauseAreaSummary[];
  communityEligibleCount: number;
  latestAllocation: PriorityCauseAreaAllocationRecord | null;
  latestAllocationAgreeCount: number;
  latestAllocationDissentCount: number;
  latestAllocationFeedbackCount: number;
  latestAllocationThresholdTriggered: boolean;
}

interface ProfileLike {
  id: string;
  display_name: string | null;
  email: string;
  karma: number;
}

interface AgreementPaymentLike {
  id: string;
  agreement_id: string;
  payer_id: string;
  payee_id: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface AgreementLike {
  id: string;
  offer_id: string | null;
  proposer_id: string;
  responder_id: string;
}

interface OfferLike {
  id: string;
  offered_cause: string;
  requested_cause: string;
}

function getServiceClient() {
  return createServiceClient() as any;
}

function startOfUtcMonth(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), 1));
}

function addUtcMonths(input: Date, months: number) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth() + months, 1));
}

function formatDateOnly(input: Date) {
  return input.toISOString().slice(0, 10);
}

function toUtcTimestamp(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 23, 59, 0)).toISOString();
}

function getCycleDeadlines(cycleMonthDate: Date) {
  const year = cycleMonthDate.getUTCFullYear();
  const monthIndex = cycleMonthDate.getUTCMonth();
  const february = monthIndex === 1;
  const january = monthIndex === 0;

  return {
    specific_actions_due_at: toUtcTimestamp(year, monthIndex, february ? 19 : 21),
    specific_actions_revision_due_at: toUtcTimestamp(year, monthIndex, february ? 21 : 23),
    cause_area_due_at: toUtcTimestamp(year, monthIndex, january ? 24 : 26),
    cause_area_revision_due_at: toUtcTimestamp(year, monthIndex, february ? 26 : 28),
  };
}

function normalizeCycleMonth(value?: string | null) {
  if (!value) {
    return startOfUtcMonth(new Date());
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return startOfUtcMonth(new Date());
  }

  return startOfUtcMonth(parsed);
}

function parseScheduleJson(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ label: string; text: string }>;
  }

  return value
    .map((entry) => {
      const row = entry as JsonRecord;
      return {
        label: String(row.label ?? "").trim(),
        text: String(row.text ?? "").trim(),
      };
    })
    .filter((entry) => entry.label || entry.text);
}

function parseCountableSchedule(value: unknown) {
  const rows = parseScheduleJson(value);

  return rows.length ? rows : [];
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getPayerCauseForPayment(
  payment: AgreementPaymentLike,
  agreementsById: Map<string, AgreementLike>,
  offersById: Map<string, OfferLike>,
) {
  const agreement = agreementsById.get(payment.agreement_id);

  if (!agreement) {
    return "";
  }

  const offer = agreement.offer_id ? offersById.get(agreement.offer_id) : null;

  if (!offer) {
    return "";
  }

  if (payment.payer_id === agreement.proposer_id) {
    return offer.requested_cause;
  }

  if (payment.payer_id === agreement.responder_id) {
    return offer.offered_cause;
  }

  return "";
}

function choosePriorityCauseArea(causeTotals: Map<string, number>) {
  let topCause = "";
  let topValue = 0;
  const lifetimeTotal = sum([...causeTotals.values()]);

  for (const [causeArea, amountCents] of [...causeTotals.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    if (amountCents > topValue) {
      topCause = causeArea;
      topValue = amountCents;
    }
  }

  return {
    prioritizedCauseArea: topCause || null,
    priorityCauseCents: topValue,
    lifetimeContributionCents: lifetimeTotal,
    prioritizedShareBasisPoints:
      lifetimeTotal > 0 ? Math.round((topValue / lifetimeTotal) * 10000) : 0,
  };
}

function pickDiverseCauseAreaArbiters(
  candidates: Array<{ profile: ProfileLike; causeArea: string }>,
  count: number,
) {
  const shuffled = shuffleInPlace([...candidates]);
  const picked: Array<{ profile: ProfileLike; causeArea: string }> = [];
  const usedCauses = new Set<string>();

  for (const candidate of shuffled) {
    if (picked.length >= count) {
      break;
    }

    if (usedCauses.has(candidate.causeArea)) {
      continue;
    }

    picked.push(candidate);
    usedCauses.add(candidate.causeArea);
  }

  for (const candidate of shuffled) {
    if (picked.length >= count) {
      break;
    }

    if (picked.some((pickedCandidate) => pickedCandidate.profile.id === candidate.profile.id)) {
      continue;
    }

    picked.push(candidate);
  }

  return picked.slice(0, count);
}

export function parseStructuredLines(rawValue: string) {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          label: "",
          text: line,
        };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        text: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((entry) => entry.label || entry.text);
}

async function getCycleRows(limit = 6) {
  if (!hasSupabaseEnv()) {
    return [] as PriorityCorrectionCycleRecord[];
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("priority_correction_cycles")
    .select("*")
    .order("cycle_month", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PriorityCorrectionCycleRecord[];
}

export async function getPriorityCorrectionSummary(viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return {
      currentCycle: null as PriorityCorrectionCycleRecord | null,
      viewerSnapshot: null as PriorityCorrectionMemberSnapshotRecord | null,
      viewerAssignments: [] as PriorityCorrectionArbiterAssignmentRecord[],
    };
  }

  const cycles = await getCycleRows(1);
  const currentCycle = cycles[0] ?? null;

  if (!currentCycle || !viewerId) {
    return {
      currentCycle,
      viewerSnapshot: null,
      viewerAssignments: [],
    };
  }

  const supabase = getServiceClient();
  const [{ data: snapshot }, { data: assignments }] = await Promise.all([
    supabase
      .from("priority_correction_member_snapshots")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .eq("profile_id", viewerId)
      .maybeSingle(),
    supabase
      .from("priority_correction_arbiter_assignments")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .eq("profile_id", viewerId)
      .order("role", { ascending: true }),
  ]);

  return {
    currentCycle,
    viewerSnapshot: (snapshot ?? null) as PriorityCorrectionMemberSnapshotRecord | null,
    viewerAssignments: (assignments ?? []) as PriorityCorrectionArbiterAssignmentRecord[],
  };
}

export async function getPriorityCorrectionPageData(viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return {
      cycles: [],
      currentCycle: null,
      recentContributions: [],
      viewerSnapshot: null,
      viewerAssignments: [],
      specificActionSubmissions: [],
      specificActionPositions: [],
      specificActionFeedback: [],
      causeAreaAllocationSubmissions: [],
      causeAreaAllocationPositions: [],
      causeAreaAllocationFeedback: [],
      causeAreaSummaries: [],
      communityEligibleCount: 0,
      latestAllocation: null,
      latestAllocationAgreeCount: 0,
      latestAllocationDissentCount: 0,
      latestAllocationFeedbackCount: 0,
      latestAllocationThresholdTriggered: false,
    } satisfies PriorityCorrectionPageData;
  }

  const supabase = getServiceClient();
  const cycles = await getCycleRows(6);
  const currentCycle = cycles[0] ?? null;

  if (!currentCycle) {
    return {
      cycles,
      currentCycle: null,
      recentContributions: [],
      viewerSnapshot: null,
      viewerAssignments: [],
      specificActionSubmissions: [],
      specificActionPositions: [],
      specificActionFeedback: [],
      causeAreaAllocationSubmissions: [],
      causeAreaAllocationPositions: [],
      causeAreaAllocationFeedback: [],
      causeAreaSummaries: [],
      communityEligibleCount: 0,
      latestAllocation: null,
      latestAllocationAgreeCount: 0,
      latestAllocationDissentCount: 0,
      latestAllocationFeedbackCount: 0,
      latestAllocationThresholdTriggered: false,
    } satisfies PriorityCorrectionPageData;
  }

  const [{ data: specificSubmissionIdsData, error: specificIdsError }, { data: allocationIdsData, error: allocationIdsError }] =
    await Promise.all([
      supabase
        .from("priority_specific_action_submissions")
        .select("id")
        .eq("cycle_id", currentCycle.id),
      supabase
        .from("priority_cause_area_allocations")
        .select("id")
        .eq("cycle_id", currentCycle.id),
    ]);

  if (specificIdsError || allocationIdsError) {
    throw new Error(
      specificIdsError?.message ??
        allocationIdsError?.message ??
        "Unable to load Priority Correction Fund ids.",
    );
  }

  const specificSubmissionIds = ((specificSubmissionIdsData ?? []) as Array<{ id: string }>).map(
    (row) => row.id,
  );
  const allocationIds = ((allocationIdsData ?? []) as Array<{ id: string }>).map((row) => row.id);

  const [
    contributionResult,
    snapshotResult,
    assignmentResult,
    specificSubmissionResult,
    specificPositionResult,
    specificFeedbackResult,
    allocationResult,
    allocationPositionResult,
    allocationFeedbackResult,
  ] = await Promise.all([
    viewerId
      ? supabase
          .from("impact_contributions")
          .select("*")
          .eq("profile_id", viewerId)
          .order("occurred_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("priority_correction_member_snapshots")
      .select("*")
      .eq("cycle_id", currentCycle.id),
    supabase
      .from("priority_correction_arbiter_assignments")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .order("role", { ascending: true })
      .order("cause_area", { ascending: true, nullsFirst: false }),
    supabase
      .from("priority_specific_action_submissions")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .order("cause_area", { ascending: true })
      .order("version", { ascending: false }),
    supabase
      .from("priority_specific_action_positions")
      .select("*")
      .in("submission_id", specificSubmissionIds.length ? specificSubmissionIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("priority_specific_action_feedback")
      .select("*")
      .in("submission_id", specificSubmissionIds.length ? specificSubmissionIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("priority_cause_area_allocations")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .order("version", { ascending: false }),
    supabase
      .from("priority_cause_area_positions")
      .select("*")
      .in("allocation_id", allocationIds.length ? allocationIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("priority_cause_area_feedback")
      .select("*")
      .in("allocation_id", allocationIds.length ? allocationIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  for (const result of [
    contributionResult,
    snapshotResult,
    assignmentResult,
    specificSubmissionResult,
    specificPositionResult,
    specificFeedbackResult,
    allocationResult,
    allocationPositionResult,
    allocationFeedbackResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const recentContributions = (contributionResult.data ?? []) as ImpactContributionRecord[];
  const snapshots = (snapshotResult.data ?? []) as PriorityCorrectionMemberSnapshotRecord[];
  const assignments = (assignmentResult.data ?? []) as PriorityCorrectionArbiterAssignmentRecord[];
  const specificActionSubmissions = ((specificSubmissionResult.data ?? []) as Array<
    Omit<PrioritySpecificActionSubmissionRecord, "allocation_schedule" | "effect_schedule"> & {
      allocation_schedule: unknown;
      effect_schedule: unknown;
    }
  >).map((row) => ({
    ...row,
    allocation_schedule: parseCountableSchedule(row.allocation_schedule),
    effect_schedule: parseCountableSchedule(row.effect_schedule),
  }));
  const specificActionPositions = (specificPositionResult.data ?? []) as PrioritySpecificActionPositionRecord[];
  const specificActionFeedback = (specificFeedbackResult.data ?? []) as PrioritySpecificActionFeedbackRecord[];
  const causeAreaAllocationSubmissions = ((allocationResult.data ?? []) as Array<
    Omit<PriorityCauseAreaAllocationRecord, "allocation_schedule"> & {
      allocation_schedule: unknown;
    }
  >).map((row) => ({
    ...row,
    allocation_schedule: parseCountableSchedule(row.allocation_schedule),
  }));
  const causeAreaAllocationPositions = (allocationPositionResult.data ?? []) as PriorityCauseAreaPositionRecord[];
  const causeAreaAllocationFeedback = (allocationFeedbackResult.data ?? []) as PriorityCauseAreaFeedbackRecord[];

  const latestSubmissionsByCause = new Map<string, PrioritySpecificActionSubmissionRecord>();

  for (const submission of specificActionSubmissions) {
    if (!latestSubmissionsByCause.has(submission.cause_area)) {
      latestSubmissionsByCause.set(submission.cause_area, submission);
    }
  }

  const causeAreas = dedupeStrings(snapshots.map((snapshot) => snapshot.prioritized_cause_area));
  const viewerSnapshot =
    viewerId ? snapshots.find((snapshot) => snapshot.profile_id === viewerId) ?? null : null;
  const viewerAssignments = viewerId
    ? assignments.filter((assignment) => assignment.profile_id === viewerId)
    : [];
  const communityEligibleCount = snapshots.filter((snapshot) => snapshot.prioritized_cause_area).length;

  const causeAreaSummaries = causeAreas.map((causeArea) => {
    const latestSubmission = latestSubmissionsByCause.get(causeArea) ?? null;
    const relatedAssignments = assignments.filter(
      (assignment) => assignment.role === "specific_action_arbiter" && assignment.cause_area === causeArea,
    );
    const agreeCount = specificActionPositions.filter(
      (position) =>
        latestSubmission &&
        position.submission_id === latestSubmission.id &&
        position.stance === "agree",
    ).length;
    const dissentCount = specificActionPositions.filter(
      (position) =>
        latestSubmission &&
        position.submission_id === latestSubmission.id &&
        position.stance === "dissent",
    ).length;
    const relatedFeedback = specificActionFeedback.filter(
      (feedback) => latestSubmission && feedback.submission_id === latestSubmission.id,
    );
    const eligibleMemberCount = snapshots.filter(
      (snapshot) => snapshot.prioritized_cause_area === causeArea,
    ).length;
    const thresholdTriggered =
      eligibleMemberCount > 0 &&
      relatedFeedback.length / eligibleMemberCount >= 0.2;

    return {
      causeArea,
      eligibleMemberCount,
      specificActionArbiters: relatedAssignments,
      latestSubmission,
      agreeCount,
      dissentCount,
      objectionCount: relatedFeedback.filter((feedback) => feedback.stance === "object").length,
      feedbackCount: relatedFeedback.length,
      thresholdTriggered,
    } satisfies PriorityCauseAreaSummary;
  });

  const latestAllocation = causeAreaAllocationSubmissions[0] ?? null;
  const latestAllocationAgreeCount = causeAreaAllocationPositions.filter(
    (position) => latestAllocation && position.allocation_id === latestAllocation.id && position.stance === "agree",
  ).length;
  const latestAllocationDissentCount = causeAreaAllocationPositions.filter(
    (position) =>
      latestAllocation && position.allocation_id === latestAllocation.id && position.stance === "dissent",
  ).length;
  const latestAllocationFeedbackCount = causeAreaAllocationFeedback.filter(
    (feedback) => latestAllocation && feedback.allocation_id === latestAllocation.id,
  ).length;
  const latestAllocationThresholdTriggered =
    communityEligibleCount > 0 &&
    latestAllocationFeedbackCount / communityEligibleCount >= 0.4;

  return {
    cycles,
    currentCycle,
    recentContributions,
    viewerSnapshot,
    viewerAssignments,
    specificActionSubmissions,
    specificActionPositions,
    specificActionFeedback,
    causeAreaAllocationSubmissions,
    causeAreaAllocationPositions,
    causeAreaAllocationFeedback,
    causeAreaSummaries,
    communityEligibleCount,
    latestAllocation,
    latestAllocationAgreeCount,
    latestAllocationDissentCount,
    latestAllocationFeedbackCount,
    latestAllocationThresholdTriggered,
  } satisfies PriorityCorrectionPageData;
}

export async function publishPriorityCorrectionCycleForMonth({
  actingProfileId,
  cycleMonth,
}: {
  actingProfileId: string;
  cycleMonth?: string | null;
}) {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase is not configured yet.");
  }

  const supabase = getServiceClient();
  const cycleMonthDate = normalizeCycleMonth(cycleMonth);
  const sourcePeriodStart = addUtcMonths(cycleMonthDate, -1);
  const sourcePeriodEnd = cycleMonthDate;
  const sourcePeriodEndDate = new Date(sourcePeriodEnd.getTime() - 24 * 60 * 60 * 1000);

  const [
    existingCycleResult,
    carryoverResult,
    profileResult,
    paymentResult,
    allPaymentResult,
    contributionResult,
    allContributionResult,
  ] = await Promise.all([
    supabase
      .from("priority_correction_cycles")
      .select("*")
      .eq("cycle_month", formatDateOnly(cycleMonthDate))
      .maybeSingle(),
    supabase
      .from("priority_correction_cycles")
      .select("id,published_fund_cents")
      .eq("status", "reserved")
      .is("carryover_consumed_by_cycle_id", null)
      .lt("cycle_month", formatDateOnly(cycleMonthDate)),
    supabase.from("profiles").select("id,display_name,email,karma"),
    supabase
      .from("agreement_payments")
      .select("id,agreement_id,payer_id,payee_id,amount_cents,status,paid_at,created_at")
      .eq("status", "paid")
      .gte("paid_at", sourcePeriodStart.toISOString())
      .lt("paid_at", sourcePeriodEnd.toISOString()),
    supabase
      .from("agreement_payments")
      .select("id,agreement_id,payer_id,payee_id,amount_cents,status,paid_at,created_at")
      .eq("status", "paid"),
    supabase
      .from("impact_contributions")
      .select("*")
      .eq("contribution_kind", "donation")
      .gte("occurred_at", sourcePeriodStart.toISOString())
      .lt("occurred_at", sourcePeriodEnd.toISOString()),
    supabase.from("impact_contributions").select("*"),
  ]);

  for (const result of [
    existingCycleResult,
    carryoverResult,
    profileResult,
    paymentResult,
    allPaymentResult,
    contributionResult,
    allContributionResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const allPayments = (allPaymentResult.data ?? []) as AgreementPaymentLike[];
  const monthlyPayments = (paymentResult.data ?? []) as AgreementPaymentLike[];
  const allContributions = (allContributionResult.data ?? []) as ImpactContributionRecord[];
  const monthlyContributions = (contributionResult.data ?? []) as ImpactContributionRecord[];
  const profileRows = (profileResult.data ?? []) as ProfileLike[];
  const carryoverCycles = (carryoverResult.data ?? []) as Array<{
    id: string;
    published_fund_cents: number;
  }>;

  const allAgreementIds = dedupeStrings(allPayments.map((payment) => payment.agreement_id));
  const monthlyAgreementIds = dedupeStrings(monthlyPayments.map((payment) => payment.agreement_id));
  const agreementsToLoad = dedupeStrings([...allAgreementIds, ...monthlyAgreementIds]);

  const agreementResult = agreementsToLoad.length
    ? await supabase.from("agreements").select("id,offer_id,proposer_id,responder_id").in("id", agreementsToLoad)
    : { data: [], error: null };

  if (agreementResult.error) {
    throw new Error(agreementResult.error.message);
  }

  const offerIds = dedupeStrings(
    ((agreementResult.data ?? []) as AgreementLike[]).map((agreement) => agreement.offer_id),
  );
  const offerResult = offerIds.length
    ? await supabase.from("offers").select("id,offered_cause,requested_cause").in("id", offerIds)
    : { data: [], error: null };

  if (offerResult.error) {
    throw new Error(offerResult.error.message);
  }

  const agreementsById = new Map(
    ((agreementResult.data ?? []) as AgreementLike[]).map((agreement) => [agreement.id, agreement]),
  );
  const offersById = new Map(
    ((offerResult.data ?? []) as OfferLike[]).map((offer) => [offer.id, offer]),
  );

  const historicalCauseTotals = new Map<string, Map<string, number>>();

  function addCauseAmount(profileId: string, causeArea: string, amountCents: number) {
    if (!profileId || !causeArea || amountCents <= 0) {
      return;
    }

    const bucket = historicalCauseTotals.get(profileId) ?? new Map<string, number>();
    bucket.set(causeArea, (bucket.get(causeArea) ?? 0) + amountCents);
    historicalCauseTotals.set(profileId, bucket);
  }

  for (const contribution of allContributions) {
    addCauseAmount(contribution.profile_id, contribution.cause_area, contribution.amount_cents);
  }

  for (const payment of allPayments) {
    addCauseAmount(
      payment.payer_id,
      getPayerCauseForPayment(payment, agreementsById, offersById),
      payment.amount_cents,
    );
  }

  const monthlyDonationsByProfile = new Map<string, number>();
  const monthlyPaymentsByProfile = new Map<string, number>();

  for (const contribution of monthlyContributions) {
    monthlyDonationsByProfile.set(
      contribution.profile_id,
      (monthlyDonationsByProfile.get(contribution.profile_id) ?? 0) + contribution.amount_cents,
    );
  }

  for (const payment of monthlyPayments) {
    monthlyPaymentsByProfile.set(
      payment.payer_id,
      (monthlyPaymentsByProfile.get(payment.payer_id) ?? 0) + payment.amount_cents,
    );
  }

  const carryoverInCents = sum(carryoverCycles.map((cycle) => cycle.published_fund_cents));
  const cycleDeadlines = getCycleDeadlines(cycleMonthDate);
  const snapshotPayloads = profileRows
    .map((profile) => {
      const causeTotals = historicalCauseTotals.get(profile.id) ?? new Map<string, number>();
      const priority = choosePriorityCauseArea(causeTotals);
      const donationCents = monthlyDonationsByProfile.get(profile.id) ?? 0;
      const peerPaymentCents = monthlyPaymentsByProfile.get(profile.id) ?? 0;
      const qualifyingCents = donationCents + peerPaymentCents;

      return {
        profile_id: profile.id,
        donation_cents: donationCents,
        peer_payment_cents: peerPaymentCents,
        qualifying_cents: qualifyingCents,
        fund_share_cents: Math.round(qualifyingCents * 0.1),
        prioritized_cause_area: priority.prioritizedCauseArea,
        prioritized_share_basis_points: priority.prioritizedShareBasisPoints,
        priority_cause_cents: priority.priorityCauseCents,
        lifetime_contribution_cents: priority.lifetimeContributionCents,
      };
    })
    .filter(
      (snapshot) =>
        snapshot.qualifying_cents > 0 ||
        snapshot.lifetime_contribution_cents > 0 ||
        snapshot.prioritized_cause_area,
    );

  const calculatedFundCents = sum(snapshotPayloads.map((snapshot) => snapshot.fund_share_cents));
  const publishedFundCents = calculatedFundCents + carryoverInCents;
  const cycleMonthText = formatDateOnly(cycleMonthDate);

  let cycleId = (existingCycleResult.data as PriorityCorrectionCycleRecord | null)?.id ?? null;

  if (!cycleId) {
    const { data: insertedCycle, error: insertCycleError } = await supabase
      .from("priority_correction_cycles")
      .insert({
        cycle_month: cycleMonthText,
        source_period_start: formatDateOnly(sourcePeriodStart),
        source_period_end: formatDateOnly(sourcePeriodEndDate),
        carryover_in_cents: carryoverInCents,
        calculated_fund_cents: calculatedFundCents,
        published_fund_cents: publishedFundCents,
        status: "published",
        published_at: new Date().toISOString(),
        ...cycleDeadlines,
        created_by: actingProfileId,
      })
      .select("id")
      .single();

    if (insertCycleError) {
      throw new Error(insertCycleError.message);
    }

    cycleId = String(insertedCycle.id);
  } else {
    const { error: updateCycleError } = await supabase
      .from("priority_correction_cycles")
      .update({
        source_period_start: formatDateOnly(sourcePeriodStart),
        source_period_end: formatDateOnly(sourcePeriodEndDate),
        carryover_in_cents: carryoverInCents,
        calculated_fund_cents: calculatedFundCents,
        published_fund_cents: publishedFundCents,
        status: "published",
        published_at: new Date().toISOString(),
        ...cycleDeadlines,
      })
      .eq("id", cycleId);

    if (updateCycleError) {
      throw new Error(updateCycleError.message);
    }
  }

  const { error: deleteSnapshotError } = await supabase
    .from("priority_correction_member_snapshots")
    .delete()
    .eq("cycle_id", cycleId);

  if (deleteSnapshotError) {
    throw new Error(deleteSnapshotError.message);
  }

  if (snapshotPayloads.length) {
    const { error: insertSnapshotError } = await supabase.from("priority_correction_member_snapshots").insert(
      snapshotPayloads.map((snapshot) => ({
        cycle_id: cycleId,
        ...snapshot,
      })),
    );

    if (insertSnapshotError) {
      throw new Error(insertSnapshotError.message);
    }
  }

  if (carryoverCycles.length) {
    const { error: consumeCarryoverError } = await supabase
      .from("priority_correction_cycles")
      .update({
        carryover_consumed_by_cycle_id: cycleId,
      })
      .in(
        "id",
        carryoverCycles.map((cycle) => cycle.id),
      );

    if (consumeCarryoverError) {
      throw new Error(consumeCarryoverError.message);
    }
  }

  const { data: existingAssignments, error: existingAssignmentsError } = await supabase
    .from("priority_correction_arbiter_assignments")
    .select("id")
    .eq("cycle_id", cycleId);

  if (existingAssignmentsError) {
    throw new Error(existingAssignmentsError.message);
  }

  if ((existingAssignments ?? []).length === 0) {
    const recentCutoff = new Date(Date.UTC(cycleMonthDate.getUTCFullYear(), cycleMonthDate.getUTCMonth() - 3, 1)).toISOString();
    const { data: recentAssignments, error: recentAssignmentsError } = await supabase
      .from("priority_correction_arbiter_assignments")
      .select("profile_id")
      .gte("created_at", recentCutoff);

    if (recentAssignmentsError) {
      throw new Error(recentAssignmentsError.message);
    }

    const recentlyServed = new Set(
      ((recentAssignments ?? []) as Array<{ profile_id: string }>).map((assignment) => assignment.profile_id),
    );
    const top10Count = Math.max(1, Math.ceil(profileRows.length * 0.1));
    const top5Count = Math.max(1, Math.ceil(profileRows.length * 0.05));
    const profilesByKarma = [...profileRows].sort((left, right) => right.karma - left.karma);
    const top10Ids = new Set(profilesByKarma.slice(0, top10Count).map((profile) => profile.id));
    const top5Ids = new Set(profilesByKarma.slice(0, top5Count).map((profile) => profile.id));

    const snapshotsByProfileId = new Map(
      snapshotPayloads.map((snapshot) => [snapshot.profile_id, snapshot]),
    );
    const causeAreas = dedupeStrings(snapshotPayloads.map((snapshot) => snapshot.prioritized_cause_area));
    const arbiterPayloads: Array<Record<string, unknown>> = [];

    for (const causeArea of causeAreas) {
      const candidates = shuffleInPlace(
        profileRows.filter((profile) => {
          const snapshot = snapshotsByProfileId.get(profile.id);
          return (
            top10Ids.has(profile.id) &&
            !recentlyServed.has(profile.id) &&
            snapshot?.prioritized_cause_area === causeArea
          );
        }),
      ).slice(0, 5);

      for (const profile of candidates) {
        arbiterPayloads.push({
          cycle_id: cycleId,
          profile_id: profile.id,
          role: "specific_action_arbiter",
          cause_area: causeArea,
          selection_pool: "top_10_percent_karma",
          selection_score: profile.karma,
          status: "active",
        });
      }
    }

    const causeAreaCandidates = profileRows
      .filter((profile) => {
        const snapshot = snapshotsByProfileId.get(profile.id);
        return top5Ids.has(profile.id) && !recentlyServed.has(profile.id) && snapshot?.prioritized_cause_area;
      })
      .map((profile) => ({
        profile,
        causeArea: snapshotsByProfileId.get(profile.id)?.prioritized_cause_area ?? "",
      }));

    for (const candidate of pickDiverseCauseAreaArbiters(causeAreaCandidates, 7)) {
      arbiterPayloads.push({
        cycle_id: cycleId,
        profile_id: candidate.profile.id,
        role: "cause_area_arbiter",
        cause_area: null,
        selection_pool: "top_5_percent_karma",
        selection_score: candidate.profile.karma,
        status: "active",
      });
    }

    if (arbiterPayloads.length) {
      const { error: arbiterInsertError } = await supabase
        .from("priority_correction_arbiter_assignments")
        .insert(arbiterPayloads);

      if (arbiterInsertError) {
        throw new Error(arbiterInsertError.message);
      }
    }
  }

  return { cycleId };
}

export async function finalizePriorityCorrectionCycle(cycleId: string) {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase is not configured yet.");
  }

  const pageData = await getPriorityCorrectionPageData();
  const cycle = pageData.cycles.find((row) => row.id === cycleId);

  if (!cycle) {
    throw new Error("Priority Correction Fund cycle not found.");
  }

  const supabase = getServiceClient();
  const missingCauseAreaCount = pageData.causeAreaSummaries.filter(
    (summary) => !summary.latestSubmission || summary.latestSubmission.status === "excluded",
  ).length;
  const totalCauseAreas = Math.max(1, pageData.causeAreaSummaries.length);
  const causeAreaOmissionRatio = missingCauseAreaCount / totalCauseAreas;

  if (causeAreaOmissionRatio >= 0.2) {
    const { error } = await supabase
      .from("priority_correction_cycles")
      .update({
        status: "reserved",
        reserve_reason:
          "At least 20% of cause areas were not considered in time, so this month’s fund carries forward.",
      })
      .eq("id", cycleId);

    if (error) {
      throw new Error(error.message);
    }

    return { status: "reserved" as const };
  }

  if (!pageData.latestAllocation || pageData.latestAllocation.status !== "published") {
    const { error } = await supabase
      .from("priority_correction_cycles")
      .update({
        status: "reserved",
        reserve_reason:
          "The community-wide cause-area allocation was not published in time, so this month’s fund carries forward.",
      })
      .eq("id", cycleId);

    if (error) {
      throw new Error(error.message);
    }

    return { status: "reserved" as const };
  }

  const { error } = await supabase
    .from("priority_correction_cycles")
    .update({
      status: "finalized",
      reserve_reason: "",
    })
    .eq("id", cycleId);

  if (error) {
    throw new Error(error.message);
  }

  return { status: "finalized" as const };
}
