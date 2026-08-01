import {
  listAgreementsForUser,
  listCartItems,
  listProfileOffers,
  type AgreementRecord,
  type CartItemRecord,
  type OfferRecord,
} from "@/lib/app-data";
import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import type { MpgfParticipantState } from "@/lib/mpgf/participant-types";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import {
  buildMpgfContributionProofLedger,
  type MpgfContributionProofLedgerRow,
} from "@/lib/mpgf/public-goods-contribution-ledger";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type DonationOffsetMatchRow = Database["public"]["Tables"]["donation_offset_matches"]["Row"];
type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type RegisteredCharityRow = Database["public"]["Tables"]["registered_charities"]["Row"];

export type CommitmentMechanism =
  | "Trade"
  | "Co-Fund"
  | "Threshold Funding"
  | "Redirect"
  | "Donation Upgrade"
  | "Threshold Sign-On";

export type CommitmentResourceType = "Fund" | "Skill" | "Commitment";

export type CommitmentLifecycle =
  | "open"
  | "conditional"
  | "activated"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "completed"
  | "verified"
  | "returned"
  | "cancelled"
  | "expired"
  | "disputed";

export type PortfolioGroupMode = "cause" | "mechanism" | "resource";
export type CommitmentsTab = "portfolio" | "ledger" | "completed" | "calendar";

export interface ResourceQuantity {
  kind: "money" | "count";
  value: number;
  currency?: string;
  unit?: string;
}

export interface CommitmentAction {
  label: string;
  detail: string;
  dueAt?: string | null;
  href: string;
  urgency: "normal" | "soon" | "overdue";
}

export interface CommitmentRecord {
  id: string;
  source: "agreement" | "threshold_funding" | "redirect";
  href: string;
  title: string;
  subtitle: string;
  cause: string;
  mechanism: CommitmentMechanism;
  resourceType: CommitmentResourceType;
  lifecycle: CommitmentLifecycle;
  lifecycleLabel: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deadlineAt: string | null;
  privacyLabel: string;
  counterpartyLabel: string | null;
  userCommitted: ResourceQuantity[];
  totalCoordinated: ResourceQuantity[];
  expectedMarginalEffect: ResourceQuantity[];
  attributedAdditionalResources: ResourceQuantity[];
  principalReturned: ResourceQuantity[];
  failureBonus: ResourceQuantity[];
  action: CommitmentAction | null;
  verifiedOutcome: boolean;
  evidenceLabel: string;
  reviewLabel: string;
  causalMethod: string;
}

export interface OpenOfferRecord {
  id: string;
  href: string;
  title: string;
  cause: string;
  mechanism: CommitmentMechanism;
  resourceType: CommitmentResourceType;
  createdAt: string;
  inCart: boolean;
}

export interface PortfolioEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  href: string;
  kind: "action" | "commitment" | "payment" | "evidence" | "review" | "outcome" | "return";
  priority: number;
}

export interface CalendarItem {
  id: string;
  at: string;
  label: string;
  detail: string;
  href: string;
  requiresUserAction: boolean;
}

export interface ImpactWindow {
  key: "day" | "week" | "month" | "year" | "lifetime";
  label: string;
  attributed: ResourceQuantity[];
  verifiedOutcomeCount: number;
}

export interface CartProjection {
  itemCount: number;
  projectedCounterpartyActions: number;
  projectedAdditionalResources: ResourceQuantity[];
  assumption: string;
}

export interface CommitmentsPortfolioData {
  generatedAt: string;
  displayName: string;
  capacityLabel: string;
  records: CommitmentRecord[];
  openOffers: OpenOfferRecord[];
  cartProjection: CartProjection;
  events: PortfolioEvent[];
  recentActivity: PortfolioEvent[];
  calendar: CalendarItem[];
  impactWindows: ImpactWindow[];
  warnings: string[];
}

interface DonationOffsetRecordBundle {
  matches: DonationOffsetMatchRow[];
  offsetsByOfferId: Map<string, DonationOffsetOfferRow>;
  offersById: Map<string, OfferRecord>;
  charitiesById: Map<string, RegisteredCharityRow>;
}

const ACTIVE_LIFECYCLES = new Set<CommitmentLifecycle>([
  "conditional",
  "activated",
  "in_progress",
  "submitted",
  "under_review",
  "disputed",
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const MONEY_PATTERN = /(?:\$|usd\s*)(\d[\d,]*(?:\.\d{1,2})?)/i;

function normalizedText(...values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function inferMechanism(offer: OfferRecord | null | undefined, fallback: CommitmentMechanism = "Trade") {
  if (!offer) return fallback;
  const text = normalizedText(
    offer.offer_action,
    offer.request_action,
    offer.notes,
    offer.discount_note,
    offer.compromise_cause,
  );

  if (offer.mode === "offset") return "Redirect" satisfies CommitmentMechanism;
  if (/co[- ]?fund|group[- ]?buy|group funding|contributor group/.test(text)) {
    return "Co-Fund" satisfies CommitmentMechanism;
  }
  if (/dominant assurance|assurance contract|threshold funding|pledge pool/.test(text)) {
    return "Threshold Funding" satisfies CommitmentMechanism;
  }
  if (/donation upgrade|upgrade.*donation|local charity/.test(text)) {
    return "Donation Upgrade" satisfies CommitmentMechanism;
  }
  if (/threshold sign[- ]?on|collective commitment|simultaneous publication/.test(text)) {
    return "Threshold Sign-On" satisfies CommitmentMechanism;
  }
  return fallback;
}

function inferResourceType(offer: OfferRecord | null | undefined): CommitmentResourceType {
  if (!offer) return "Commitment";
  const text = normalizedText(offer.offer_action, offer.request_action, offer.notes);
  if (offer.mode === "payment" || offer.mode === "offset" || /donat|fund|pay|\$|usd/.test(text)) {
    return "Fund";
  }
  if (/research|write|design|build|teach|translate|consult|mentor|volunteer|hour/.test(text)) {
    return "Skill";
  }
  return "Commitment";
}

function agreementCause(agreement: AgreementRecord, userId: string) {
  const offer = agreement.offer;
  if (!offer) return "Other";
  return agreement.proposer_id === userId ? offer.offered_cause : offer.requested_cause;
}

function agreementTitle(agreement: AgreementRecord) {
  if (!agreement.offer) return "Private agreement";
  return `${agreement.offer.offered_cause} ↔ ${agreement.offer.requested_cause}`;
}

function money(value: number, currency: string): ResourceQuantity {
  return { kind: "money", value, currency: currency.toUpperCase() };
}

function count(value: number, unit: string): ResourceQuantity {
  return { kind: "count", value, unit };
}

function groupMoney(values: Array<{ cents: number; currency: string }>) {
  const totals = new Map<string, number>();
  for (const value of values) {
    const currency = value.currency.toUpperCase();
    totals.set(currency, (totals.get(currency) ?? 0) + value.cents);
  }
  return [...totals.entries()]
    .filter(([, cents]) => cents !== 0)
    .map(([currency, cents]) => money(cents, currency));
}

function sumQuantities(quantities: ResourceQuantity[]) {
  const moneyTotals = new Map<string, number>();
  const countTotals = new Map<string, number>();
  for (const quantity of quantities) {
    if (quantity.kind === "money" && quantity.currency) {
      moneyTotals.set(quantity.currency, (moneyTotals.get(quantity.currency) ?? 0) + quantity.value);
    } else if (quantity.kind === "count" && quantity.unit) {
      countTotals.set(quantity.unit, (countTotals.get(quantity.unit) ?? 0) + quantity.value);
    }
  }
  return [
    ...[...moneyTotals.entries()].map(([currency, value]) => money(value, currency)),
    ...[...countTotals.entries()].map(([unit, value]) => count(value, unit)),
  ].filter((quantity) => quantity.value !== 0);
}

function latestDate(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .toSorted((a, b) => Date.parse(b) - Date.parse(a))[0] ?? new Date(0).toISOString();
}

function soonness(at: string | null | undefined, now = new Date()) {
  if (!at) return "normal" as const;
  const delta = Date.parse(at) - now.getTime();
  if (delta < 0) return "overdue" as const;
  if (delta <= 7 * DAY_MS) return "soon" as const;
  return "normal" as const;
}

function agreementLifecycle(agreement: AgreementRecord): CommitmentLifecycle {
  if (agreement.status === "cancelled") return "cancelled";
  if (agreement.completion_state === "disputed_unresolved") return "disputed";
  if (agreement.completion_state === "reviewed_complete") return "verified";
  if (agreement.status === "completed") return "completed";
  if (agreement.completion_state === "under_review" || agreement.reviewCases.some((review) =>
    ["open", "under_review", "appealed"].includes(review.status),
  )) {
    return "under_review";
  }
  if (
    agreement.completion_state === "challenge_window_open" ||
    agreement.reviewCases.some((review) => review.status === "challenge_window_open")
  ) {
    return "under_review";
  }
  if (agreement.evidenceItems.length || agreement.performanceBonds.some((bond) => bond.status === "evidence_submitted")) {
    return "submitted";
  }
  if (agreement.performanceBonds.some((bond) => ["active", "evidence_due"].includes(bond.status))) {
    return "in_progress";
  }
  if (agreement.status === "active") return "activated";
  return "conditional";
}

function lifecycleLabel(lifecycle: CommitmentLifecycle) {
  const labels: Record<CommitmentLifecycle, string> = {
    open: "Open",
    conditional: "Conditional",
    activated: "Activated",
    in_progress: "In progress",
    submitted: "Evidence submitted",
    under_review: "Under review",
    completed: "Completed",
    verified: "Verified",
    returned: "Returned",
    cancelled: "Cancelled",
    expired: "Expired",
    disputed: "Disputed",
  };
  return labels[lifecycle];
}

function agreementAction(agreement: AgreementRecord, userId: string, now = new Date()): CommitmentAction | null {
  const href = `/agreements/${agreement.id}`;
  const userPayment = agreement.payments.find((payment) => payment.payer_id === userId);
  const evidenceDueBond = agreement.performanceBonds.find(
    (bond) => bond.party_id === userId && bond.status === "evidence_due",
  );
  const activeSchedule = agreement.paymentSchedules.find(
    (schedule) => schedule.payer_id === userId && schedule.status === "active",
  );
  const review = agreement.reviewCases.find((candidate) =>
    ["open", "under_review", "challenge_window_open", "appealed", "disputed_unresolved"].includes(candidate.status),
  );

  if (agreement.status === "proposed" && agreement.responder_id === userId) {
    return {
      label: "Review proposal",
      detail: "Accept, counter, or decline the proposed terms.",
      href,
      urgency: "normal",
    };
  }
  if (userPayment && ["authorization_pending", "authorization_failed", "expired", "capture_blocked"].includes(userPayment.authorization_status)) {
    return {
      label: "Resolve payment authorization",
      detail: userPayment.authorization_status.replaceAll("_", " "),
      dueAt: userPayment.authorization_expires_at,
      href,
      urgency: soonness(userPayment.authorization_expires_at, now),
    };
  }
  if (evidenceDueBond) {
    return {
      label: "Submit evidence",
      detail: "Evidence is due for your commitment.",
      dueAt: evidenceDueBond.evidence_due_at,
      href,
      urgency: soonness(evidenceDueBond.evidence_due_at, now),
    };
  }
  if (activeSchedule) {
    return {
      label: "Upcoming payment",
      detail: "A scheduled commitment payment is approaching.",
      dueAt: activeSchedule.next_due_at,
      href,
      urgency: soonness(activeSchedule.next_due_at, now),
    };
  }
  if (review?.challenge_window_ends_at) {
    return {
      label: review.status === "challenge_window_open" ? "Review challenge window" : "Review case",
      detail: review.status.replaceAll("_", " "),
      dueAt: review.challenge_window_ends_at,
      href,
      urgency: soonness(review.challenge_window_ends_at, now),
    };
  }
  return null;
}

function evidenceLabelForAgreement(agreement: AgreementRecord) {
  const latestEvidence = agreement.evidenceItems[0];
  const evidenceBond = agreement.performanceBonds.find((bond) =>
    ["evidence_due", "evidence_submitted", "accepted_by_counterparty", "accepted_after_review", "rejected_after_review"].includes(
      bond.status,
    ),
  );
  if (latestEvidence) return latestEvidence.status.replaceAll("_", " ");
  if (evidenceBond) return evidenceBond.status.replaceAll("_", " ");
  return "No evidence submitted";
}

function reviewLabelForAgreement(agreement: AgreementRecord) {
  const latestReview = agreement.reviewCases[0];
  if (latestReview) return latestReview.status.replaceAll("_", " ");
  if (agreement.completion_state === "reviewed_complete") return "reviewed complete";
  return "No review case";
}

function agreementRecord(agreement: AgreementRecord, userId: string, now = new Date()): CommitmentRecord {
  const offer = agreement.offer;
  const lifecycle = agreementLifecycle(agreement);
  const userPayments = agreement.payments.filter((payment) => payment.payer_id === userId);
  const allLivePayments = agreement.payments.filter((payment) => !["failed", "cancelled"].includes(payment.status));
  const refundedPayments = userPayments.filter((payment) => payment.status === "refunded");
  const userBonds = agreement.performanceBonds.filter((bond) => bond.party_id === userId && bond.enabled);
  const userCommitted = sumQuantities([
    ...groupMoney(
      userPayments
        .filter((payment) => !["failed", "cancelled", "refunded"].includes(payment.status))
        .map((payment) => ({ cents: payment.amount_cents, currency: payment.currency })),
    ),
    ...groupMoney(userBonds.map((bond) => ({ cents: bond.amount_cents, currency: bond.currency }))),
    ...(agreement.status === "active" || agreement.status === "completed" ? [count(1, "commitment")] : []),
  ]);
  const totalCoordinated = sumQuantities([
    ...groupMoney(allLivePayments.map((payment) => ({ cents: payment.amount_cents, currency: payment.currency }))),
    ...(agreement.status === "active" || agreement.status === "completed" ? [count(2, "commitments coordinated")] : []),
  ]);
  const verifiedOutcome = lifecycle === "verified";
  const completedAt = verifiedOutcome || lifecycle === "completed" ? latestDate(agreement.updated_at, agreement.created_at) : null;

  return {
    id: `agreement:${agreement.id}`,
    source: "agreement",
    href: `/agreements/${agreement.id}`,
    title: agreementTitle(agreement),
    subtitle: offer ? `${offer.offer_action} ↔ ${offer.request_action}` : agreement.source.replaceAll("_", " "),
    cause: agreementCause(agreement, userId),
    mechanism: inferMechanism(offer),
    resourceType: inferResourceType(offer),
    lifecycle,
    lifecycleLabel: lifecycleLabel(lifecycle),
    createdAt: agreement.created_at,
    updatedAt: agreement.updated_at,
    completedAt,
    deadlineAt:
      agreement.performanceBonds.find((bond) => bond.party_id === userId)?.evidence_due_at ??
      agreement.paymentSchedules.find((schedule) => schedule.payer_id === userId)?.next_due_at ??
      agreement.challenge_window_ends_at,
    privacyLabel: agreement.privacy_scope || "Private to participants",
    counterpartyLabel: agreement.counterparty?.resolvedName ?? "Counterparty private",
    userCommitted,
    totalCoordinated,
    expectedMarginalEffect: [],
    attributedAdditionalResources: [],
    principalReturned: groupMoney(refundedPayments.map((payment) => ({ cents: payment.amount_cents, currency: payment.currency }))),
    failureBonus: [],
    action: agreementAction(agreement, userId, now),
    verifiedOutcome,
    evidenceLabel: evidenceLabelForAgreement(agreement),
    reviewLabel: reviewLabelForAgreement(agreement),
    causalMethod:
      "No causal amount is assigned unless the record contains an explicit, attributable counterfactual or matching event.",
  };
}

function thresholdLifecycle(row: MpgfContributionProofLedgerRow): CommitmentLifecycle {
  if (row.failedAllocationsCents > 0) return "returned";
  if (row.challengeWindowStatus.tone === "blocked") return "disputed";
  if (row.destinationProofStatus.tone === "passed" && row.accounting.countedContributionCents > 0) return "verified";
  if (row.payoutMilestoneStatus.tone === "passed") return "completed";
  if (row.challengeWindowStatus.tone === "paused") return "under_review";
  if (row.destinationProofStatus.tone === "pending") return "submitted";
  if (row.thresholdStatus.tone === "passed") return "activated";
  return "conditional";
}

function thresholdRecord(
  row: MpgfContributionProofLedgerRow,
  pledge: MpgfParticipantState["publicGoodsPledges"][number],
  campaignDeadline: string | null,
): CommitmentRecord {
  const lifecycle = thresholdLifecycle(row);
  const sponsorMatchCents = row.accounting.sponsorBaseMatchCents + row.accounting.sponsorBonusMatchCents;
  const verified = lifecycle === "verified";
  const expectedMatch = sponsorMatchCents > 0 && !verified ? [money(sponsorMatchCents, "USD")] : [];
  const attributedMatch = sponsorMatchCents > 0 && verified ? [money(sponsorMatchCents, "USD")] : [];
  const createdAt = pledge.createdAt;

  return {
    id: `threshold:${row.pledgeId}`,
    source: "threshold_funding",
    href: `/mpgf#${encodeURIComponent(row.campaignId)}`,
    title: row.campaignTitle,
    subtitle: "Threshold-funded moral public good",
    cause: row.campaignTitle,
    mechanism: "Threshold Funding",
    resourceType: "Fund",
    lifecycle,
    lifecycleLabel: lifecycleLabel(lifecycle),
    createdAt,
    updatedAt: createdAt,
    completedAt: verified ? createdAt : null,
    deadlineAt: campaignDeadline,
    privacyLabel: pledge.visibilityMode.replaceAll("_", " "),
    counterpartyLabel: null,
    userCommitted: [money(pledge.amountCents, "USD")],
    totalCoordinated: [
      money(
        row.accounting.actualContributionCents + row.accounting.sponsorBaseMatchCents + row.accounting.sponsorBonusMatchCents,
        "USD",
      ),
    ].filter((quantity) => quantity.value > 0),
    expectedMarginalEffect: expectedMatch,
    attributedAdditionalResources: attributedMatch,
    principalReturned: row.failedAllocationsCents > 0 ? [money(row.failedAllocationsCents, "USD")] : [],
    failureBonus:
      row.failureBonusOrCarryForwardCreditCents > 0
        ? [money(row.failureBonusOrCarryForwardCreditCents, "USD")]
        : [],
    action:
      row.thresholdStatus.tone === "blocked" || row.destinationProofStatus.tone === "blocked"
        ? {
            label: "Resolve funding blocker",
            detail: `${row.thresholdStatus.detail} ${row.destinationProofStatus.detail}`.trim(),
            href: `/mpgf#${encodeURIComponent(row.campaignId)}`,
            urgency: "normal",
          }
        : null,
    verifiedOutcome: verified,
    evidenceLabel: row.destinationProofStatus.label,
    reviewLabel: row.challengeWindowStatus.label,
    causalMethod:
      attributedMatch.length > 0 || expectedMatch.length > 0
        ? "Only the explicit sponsor-match amount attached to this eligible contribution is assigned as additional resources."
        : "The threshold total is not attributed to one participant without an explicit marginal-credit record.",
  };
}

function redirectRecord(
  match: DonationOffsetMatchRow,
  offset: DonationOffsetOfferRow | undefined,
  offer: OfferRecord | undefined,
  charity: RegisteredCharityRow | undefined,
  userId: string,
): CommitmentRecord {
  const isOwner = match.owner_profile_id === userId;
  const ownCents = isOwner ? match.matched_baseline_cents : match.matched_counterparty_cents;
  const causedCents = isOwner ? match.matched_counterparty_cents : match.matched_baseline_cents;
  const lifecycle: CommitmentLifecycle =
    match.status === "completed" ? "verified" : match.status === "cancelled" ? "cancelled" : "activated";
  const cause = charity?.cause_area || offer?.compromise_cause || "Common-ground destination";
  const title = charity?.name ? `Redirect to ${charity.name}` : "Donation redirect";

  return {
    id: `redirect:${match.id}`,
    source: "redirect",
    href: `/donation-offsets/${match.id}`,
    title,
    subtitle: offer
      ? `${offer.offered_cause} ↔ ${offer.requested_cause}`
      : `${offset?.baseline_opposed_cause ?? "One planned donation"} ↔ ${offset?.requested_opposed_cause ?? "another planned donation"}`,
    cause,
    mechanism: "Redirect",
    resourceType: "Fund",
    lifecycle,
    lifecycleLabel: lifecycleLabel(lifecycle),
    createdAt: match.created_at,
    updatedAt: match.updated_at,
    completedAt: match.status === "completed" ? match.updated_at : null,
    deadlineAt: offset?.assurance_deadline_at ?? offset?.offer_expires_at ?? null,
    privacyLabel: "Private participant record",
    counterpartyLabel: match.counterparty_profile_id ? "Verified counterparty" : "Counterparty private",
    userCommitted: [money(ownCents, "USD")],
    totalCoordinated: [money(match.compromise_total_cents, "USD")],
    expectedMarginalEffect: match.status === "matched" && causedCents > 0 ? [money(causedCents, "USD")] : [],
    attributedAdditionalResources:
      match.status === "completed" && causedCents > 0 ? [money(causedCents, "USD")] : [],
    principalReturned: [],
    failureBonus: [],
    action: null,
    verifiedOutcome: match.status === "completed",
    evidenceLabel: match.compromise_evidence_url ? "Compromise receipt recorded" : "Receipt pending",
    reviewLabel: match.status === "completed" ? "Completed" : match.status,
    causalMethod:
      "Each participant receives causal credit only for the other participant's matched incremental donation, not for their own baseline donation.",
  };
}

async function loadDonationOffsetsForUser(userId: string): Promise<DonationOffsetRecordBundle> {
  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("donation_offset_matches")
    .select("*")
    .or(`owner_profile_id.eq.${userId},counterparty_profile_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (matchesError) throw new Error(matchesError.message);
  const matchRows = (matches ?? []) as DonationOffsetMatchRow[];
  const offerIds = [...new Set(matchRows.map((match) => match.offer_id))];
  if (!offerIds.length) {
    return {
      matches: [],
      offsetsByOfferId: new Map(),
      offersById: new Map(),
      charitiesById: new Map(),
    };
  }

  const [{ data: offsets, error: offsetsError }, { data: rawOffers, error: offersError }] = await Promise.all([
    supabase.from("donation_offset_offers").select("*").in("offer_id", offerIds),
    supabase.from("offers").select("*").in("id", offerIds),
  ]);
  if (offsetsError) throw new Error(offsetsError.message);
  if (offersError) throw new Error(offersError.message);

  const offsetRows = (offsets ?? []) as DonationOffsetOfferRow[];
  const charityIds = [...new Set(offsetRows.map((offset) => offset.compromise_charity_id).filter(Boolean))];
  const { data: charities, error: charitiesError } = charityIds.length
    ? await supabase.from("registered_charities").select("*").in("id", charityIds)
    : { data: [] as RegisteredCharityRow[], error: null };
  if (charitiesError) throw new Error(charitiesError.message);

  const offerRecords = (rawOffers ?? []) as Database["public"]["Tables"]["offers"]["Row"][];
  const minimalOffers = offerRecords.map((offer) => ({ ...offer, ownerProfile: null, recommendationCount: 0, commentCount: 0, isInCart: false, performanceBonds: [], donationOffset: null })) as OfferRecord[];

  return {
    matches: matchRows,
    offsetsByOfferId: new Map(offsetRows.map((offset) => [offset.offer_id, offset])),
    offersById: new Map(minimalOffers.map((offer) => [offer.id, offer])),
    charitiesById: new Map(((charities ?? []) as RegisteredCharityRow[]).map((charity) => [charity.id, charity])),
  };
}

function openOfferRecord(offer: OfferRecord, cartOfferIds: Set<string>): OpenOfferRecord {
  const mechanism = inferMechanism(offer);
  return {
    id: offer.id,
    href: `/offers/${offer.id}`,
    title: `${offer.offered_cause} ↔ ${offer.requested_cause}`,
    cause: offer.offered_cause,
    mechanism,
    resourceType: inferResourceType(offer),
    createdAt: offer.created_at,
    inCart: cartOfferIds.has(offer.id),
  };
}

function explicitCartMoney(item: CartItemRecord) {
  const offer = item.offer;
  if (!offer) return [] as ResourceQuantity[];
  if (offer.donationOffset?.requested_matching_amount_cents) {
    return [money(offer.donationOffset.requested_matching_amount_cents, "USD")];
  }
  const match = MONEY_PATTERN.exec(`${offer.request_action} ${offer.notes}`);
  if (!match) return [];
  const dollars = Number(match[1].replaceAll(",", ""));
  if (!Number.isFinite(dollars) || dollars <= 0) return [];
  return [money(Math.round(dollars * 100), "USD")];
}

function cartProjection(cartItems: CartItemRecord[]): CartProjection {
  return {
    itemCount: cartItems.length,
    projectedCounterpartyActions: cartItems.filter((item) => Boolean(item.offer)).length,
    projectedAdditionalResources: sumQuantities(cartItems.flatMap(explicitCartMoney)),
    assumption:
      "This success-case projection assumes you complete every cart action and every matching, threshold, counterparty, verification, and settlement condition succeeds. It is not an expected-value estimate.",
  };
}

function buildAgreementEvents(agreement: AgreementRecord, record: CommitmentRecord, userId: string): PortfolioEvent[] {
  const events: PortfolioEvent[] = [
    {
      id: `${record.id}:created`,
      at: agreement.created_at,
      title: agreement.status === "proposed" ? "Commitment proposed" : "Commitment recorded",
      detail: record.title,
      href: record.href,
      kind: "commitment",
      priority: agreement.status === "proposed" ? 70 : 30,
    },
  ];

  for (const payment of agreement.payments) {
    events.push({
      id: `${record.id}:payment:${payment.id}`,
      at: payment.paid_at ?? payment.updated_at,
      title:
        payment.status === "refunded"
          ? "Payment returned"
          : payment.status === "paid"
            ? "Payment recorded"
            : "Payment status updated",
      detail: `${payment.currency.toUpperCase()} ${(payment.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${payment.status.replaceAll("_", " ")}`,
      href: record.href,
      kind: payment.status === "refunded" ? "return" : "payment",
      priority: payment.payer_id === userId && payment.authorization_status.includes("pending") ? 90 : 40,
    });
  }
  for (const evidence of agreement.evidenceItems) {
    events.push({
      id: `${record.id}:evidence:${evidence.id}`,
      at: evidence.created_at,
      title: "Evidence submitted",
      detail: evidence.status.replaceAll("_", " "),
      href: `/evidence/${agreement.id}`,
      kind: "evidence",
      priority: 55,
    });
  }
  for (const review of agreement.reviewCases) {
    events.push({
      id: `${record.id}:review:${review.id}`,
      at: review.reviewed_at ?? review.updated_at,
      title: review.status === "reviewed_complete" ? "Outcome reviewed" : "Review updated",
      detail: review.status.replaceAll("_", " "),
      href: record.href,
      kind: review.status === "reviewed_complete" ? "outcome" : "review",
      priority: ["open", "under_review", "appealed", "disputed_unresolved"].includes(review.status) ? 85 : 60,
    });
  }
  if (record.action) {
    events.push({
      id: `${record.id}:action`,
      at: record.action.dueAt ?? record.updatedAt,
      title: record.action.label,
      detail: record.action.detail,
      href: record.action.href,
      kind: "action",
      priority: record.action.urgency === "overdue" ? 120 : record.action.urgency === "soon" ? 105 : 95,
    });
  }
  return events;
}

function recordEvents(record: CommitmentRecord): PortfolioEvent[] {
  const events: PortfolioEvent[] = [];
  if (record.source === "threshold_funding") {
    events.push({
      id: `${record.id}:state`,
      at: record.updatedAt,
      title: record.verifiedOutcome ? "Threshold outcome verified" : "Threshold commitment updated",
      detail: `${record.title} · ${record.lifecycleLabel}`,
      href: record.href,
      kind: record.verifiedOutcome ? "outcome" : "commitment",
      priority: record.verifiedOutcome ? 75 : 45,
    });
  }
  if (record.source === "redirect") {
    events.push({
      id: `${record.id}:state`,
      at: record.updatedAt,
      title: record.verifiedOutcome ? "Donation redirect completed" : "Donation redirect matched",
      detail: record.title,
      href: record.href,
      kind: record.verifiedOutcome ? "outcome" : "commitment",
      priority: record.verifiedOutcome ? 80 : 55,
    });
  }
  if (record.action) {
    events.push({
      id: `${record.id}:action`,
      at: record.action.dueAt ?? record.updatedAt,
      title: record.action.label,
      detail: record.action.detail,
      href: record.action.href,
      kind: "action",
      priority: record.action.urgency === "overdue" ? 120 : record.action.urgency === "soon" ? 105 : 95,
    });
  }
  return events;
}

function calendarForAgreement(agreement: AgreementRecord, record: CommitmentRecord, userId: string): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const schedule of agreement.paymentSchedules.filter((candidate) => candidate.payer_id === userId && candidate.status === "active")) {
    items.push({
      id: `${record.id}:schedule:${schedule.id}`,
      at: schedule.next_due_at,
      label: "Payment due",
      detail: record.title,
      href: record.href,
      requiresUserAction: true,
    });
  }
  for (const bond of agreement.performanceBonds.filter((candidate) => candidate.party_id === userId && candidate.evidence_due_at)) {
    items.push({
      id: `${record.id}:evidence:${bond.id}`,
      at: bond.evidence_due_at!,
      label: "Evidence due",
      detail: record.title,
      href: record.href,
      requiresUserAction: true,
    });
  }
  for (const payment of agreement.payments.filter((candidate) => candidate.payer_id === userId && candidate.authorization_expires_at)) {
    items.push({
      id: `${record.id}:authorization:${payment.id}`,
      at: payment.authorization_expires_at!,
      label: "Payment authorization expires",
      detail: record.title,
      href: record.href,
      requiresUserAction: payment.authorization_status === "authorized" || payment.authorization_status === "authorization_pending",
    });
  }
  for (const review of agreement.reviewCases.filter((candidate) => candidate.challenge_window_ends_at)) {
    items.push({
      id: `${record.id}:challenge:${review.id}`,
      at: review.challenge_window_ends_at!,
      label: "Challenge window closes",
      detail: record.title,
      href: record.href,
      requiresUserAction: review.status === "challenge_window_open",
    });
  }
  return items;
}

function impactWindows(records: CommitmentRecord[], now = new Date()): ImpactWindow[] {
  const definitions: Array<{ key: ImpactWindow["key"]; label: string; duration: number | null }> = [
    { key: "day", label: "Past 24 hours", duration: DAY_MS },
    { key: "week", label: "Past 7 days", duration: 7 * DAY_MS },
    { key: "month", label: "Past 30 days", duration: 30 * DAY_MS },
    { key: "year", label: "Past 365 days", duration: 365 * DAY_MS },
    { key: "lifetime", label: "Lifetime", duration: null },
  ];

  return definitions.map((definition) => {
    const eligible = records.filter((record) => {
      if (!record.verifiedOutcome || !record.completedAt) return false;
      return definition.duration === null || now.getTime() - Date.parse(record.completedAt) <= definition.duration;
    });
    return {
      key: definition.key,
      label: definition.label,
      attributed: sumQuantities(eligible.flatMap((record) => record.attributedAdditionalResources)),
      verifiedOutcomeCount: eligible.length,
    };
  });
}

function selectRecentActivity(events: PortfolioEvent[]) {
  const now = Date.now();
  return events
    .map((event) => ({
      ...event,
      score: event.priority + Math.max(0, 30 - Math.floor((now - Date.parse(event.at)) / DAY_MS)),
    }))
    .toSorted((a, b) => b.score - a.score || Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6)
    .map(({ score: _score, ...event }) => event);
}

async function settle<T>(label: string, task: Promise<T>, fallback: T, warnings: string[]) {
  try {
    return await task;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`${label}: ${message}`);
    return fallback;
  }
}

export async function loadCommitmentsPortfolioData({
  userId,
  displayName,
  now = new Date(),
}: {
  userId: string;
  displayName: string;
  now?: Date;
}): Promise<CommitmentsPortfolioData> {
  const warnings: string[] = [];
  const [agreements, cartItems, openOffers, participantState, redirectBundle] = await Promise.all([
    settle("Agreements", listAgreementsForUser(userId), [] as AgreementRecord[], warnings),
    settle("Cart", listCartItems(userId, 100), [] as CartItemRecord[], warnings),
    settle("Open offers", listProfileOffers(userId, userId), [] as OfferRecord[], warnings),
    settle(
      "Threshold funding",
      loadMpgfParticipantState({ userId, displayName }),
      {
        status: "error",
        userId,
        displayName,
        pledges: [],
        recurringCommitments: [],
        publicGoodsPledges: [],
        publicGoodsSubscriptions: [],
        poolProposals: [],
        ballots: [],
        warnings: [],
      } satisfies MpgfParticipantState,
      warnings,
    ),
    settle(
      "Donation redirects",
      loadDonationOffsetsForUser(userId),
      {
        matches: [],
        offsetsByOfferId: new Map(),
        offersById: new Map(),
        charitiesById: new Map(),
      } satisfies DonationOffsetRecordBundle,
      warnings,
    ),
  ]);

  warnings.push(...participantState.warnings);
  const agreementRecords = agreements.map((agreement) => agreementRecord(agreement, userId, now));
  const thresholdLedger = buildMpgfContributionProofLedger({ participantState, now });
  const campaignById = new Map(demoMpgfPublicGoodsCampaigns.map((campaign) => [campaign.id, campaign]));
  const pledgeById = new Map(participantState.publicGoodsPledges.map((pledge) => [pledge.id, pledge]));
  const thresholdRecords = thresholdLedger.rows.flatMap((row) => {
    const pledge = pledgeById.get(row.pledgeId);
    if (!pledge) return [];
    return [thresholdRecord(row, pledge, campaignById.get(row.campaignId)?.deadlineAt ?? null)];
  });
  const redirectRecords = redirectBundle.matches.map((match) => {
    const offset = redirectBundle.offsetsByOfferId.get(match.offer_id);
    return redirectRecord(
      match,
      offset,
      redirectBundle.offersById.get(match.offer_id),
      offset ? redirectBundle.charitiesById.get(offset.compromise_charity_id) : undefined,
      userId,
    );
  });
  const records = [...agreementRecords, ...thresholdRecords, ...redirectRecords].toSorted(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  const cartOfferIds = new Set(cartItems.flatMap((item) => (item.offer ? [item.offer.id] : [])));
  const openOfferRecords = openOffers.map((offer) => openOfferRecord(offer, cartOfferIds));
  const agreementEvents = agreements.flatMap((agreement) => {
    const record = agreementRecords.find((candidate) => candidate.id === `agreement:${agreement.id}`);
    return record ? buildAgreementEvents(agreement, record, userId) : [];
  });
  const events = [...agreementEvents, ...thresholdRecords.flatMap(recordEvents), ...redirectRecords.flatMap(recordEvents)]
    .toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const calendar = [
    ...agreements.flatMap((agreement) => {
      const record = agreementRecords.find((candidate) => candidate.id === `agreement:${agreement.id}`);
      return record ? calendarForAgreement(agreement, record, userId) : [];
    }),
    ...thresholdRecords.flatMap((record) =>
      record.deadlineAt
        ? [
            {
              id: `${record.id}:deadline`,
              at: record.deadlineAt,
              label: "Threshold deadline",
              detail: record.title,
              href: record.href,
              requiresUserAction: ACTIVE_LIFECYCLES.has(record.lifecycle),
            } satisfies CalendarItem,
          ]
        : [],
    ),
    ...redirectRecords.flatMap((record) =>
      record.deadlineAt
        ? [
            {
              id: `${record.id}:deadline`,
              at: record.deadlineAt,
              label: "Redirect deadline",
              detail: record.title,
              href: record.href,
              requiresUserAction: record.lifecycle === "activated" || record.lifecycle === "conditional",
            } satisfies CalendarItem,
          ]
        : [],
    ),
  ].toSorted((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return {
    generatedAt: now.toISOString(),
    displayName,
    capacityLabel: "Personal",
    records,
    openOffers: openOfferRecords,
    cartProjection: cartProjection(cartItems),
    events,
    recentActivity: selectRecentActivity(events),
    calendar,
    impactWindows: impactWindows(records, now),
    warnings: [...new Set(warnings.filter(Boolean))],
  };
}

export function isActiveCommitment(record: CommitmentRecord) {
  return ACTIVE_LIFECYCLES.has(record.lifecycle);
}

export function groupCommitments(records: CommitmentRecord[], mode: PortfolioGroupMode) {
  const groups = new Map<string, CommitmentRecord[]>();
  for (const record of records) {
    const key = mode === "cause" ? record.cause : mode === "mechanism" ? record.mechanism : record.resourceType;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([label, groupRecords]) => ({ label, records: groupRecords }))
    .toSorted((a, b) => a.label.localeCompare(b.label));
}

export function aggregateRecordQuantities(
  records: CommitmentRecord[],
  selector: (record: CommitmentRecord) => ResourceQuantity[],
) {
  return sumQuantities(records.flatMap(selector));
}
