export type OfferMode = "pledge" | "offset" | "payment";
export type PaymentIntervalUnit = "none" | "day" | "month" | "year";
export type FilterMode = OfferMode | "all";
export type SortOrder = "match" | "trust" | "recent";

export interface Offer {
  id: string;
  alias: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  offerAction: string;
  requestAction: string;
  compromiseCause: string;
  offerImpact: number;
  minCounterpartyImpact: number;
  verification: string;
  duration: string;
  paymentIntervalValue: number | null;
  paymentIntervalUnit: PaymentIntervalUnit;
  trustLevel: number;
  notes: string;
  source: string;
  createdAt: number;
}

export interface OfferDraft {
  alias: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  offerAction: string;
  requestAction: string;
  compromiseCause: string;
  offerImpact: number;
  minCounterpartyImpact: number;
  verification: string;
  duration: string;
  paymentIntervalValue: number | null;
  paymentIntervalUnit: PaymentIntervalUnit;
  trustLevel: number;
  notes: string;
  counterfactualHonesty: boolean;
  policyPledge: boolean;
}

export interface OfferFilters {
  mode: FilterMode;
  cause: string;
  sortOrder: SortOrder;
}

export interface EvaluatedPair {
  offer: Offer;
  reciprocal: boolean;
  compromiseCompatible: boolean;
  impactCompatible: boolean;
  trustAligned: boolean;
  verificationAligned: boolean;
  durationAligned: boolean;
  score: number;
  exact: boolean;
}

const LOCAL_STORAGE_KEY = "moralTradeLocalOffers";
const LEGACY_LOCAL_STORAGE_KEY = "moralTradeMarketLocalOffers";

export const CAUSE_OPTIONS = [
  "Animal welfare",
  "Global poverty",
  "Climate",
  "Public health",
  "Financial support",
  "Gun rights",
  "Gun control",
  "Democracy",
  "Community service",
] as const;

export const OFFER_MODE_OPTIONS: Array<{ value: OfferMode; label: string }> = [
  { value: "pledge", label: "Personal pledge swap" },
  { value: "offset", label: "Donation offset" },
  { value: "payment", label: "Paid action offer" },
];

export const FILTER_MODE_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "pledge", label: "Pledge swaps" },
  { value: "offset", label: "Donation offsets" },
  { value: "payment", label: "Paid action offers" },
];

export const COMPROMISE_CAUSE_OPTIONS = [
  "Not needed",
  "Disaster relief",
  "Global poverty",
  "Climate resilience",
  "Public health",
  "Animal welfare",
  "Community service",
] as const;

export const VERIFICATION_OPTIONS = [
  "Annual receipts",
  "Peer witness",
  "Escrow-backed",
  "Public pledge",
] as const;

export const DURATION_OPTIONS = [
  "3 months",
  "6 months",
  "12 months",
  "Open-ended",
] as const;

export const PAYMENT_INTERVAL_UNIT_OPTIONS: Array<{
  value: PaymentIntervalUnit;
  label: string;
}> = [
  { value: "none", label: "One-time or unspecified" },
  { value: "day", label: "Days" },
  { value: "month", label: "Months" },
  { value: "year", label: "Years" },
] as const;

export const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: "match", label: "Best match first" },
  { value: "trust", label: "Trust first" },
  { value: "recent", label: "Newest first" },
];

export const DEFAULT_FILTERS: OfferFilters = {
  mode: "all",
  cause: "all",
  sortOrder: "match",
};

export function createDefaultOfferDraft(): OfferDraft {
  return {
    alias: "",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    offerAction: "",
    requestAction: "",
    compromiseCause: "Not needed",
    offerImpact: 7,
    minCounterpartyImpact: 6,
    verification: "Annual receipts",
    duration: "3 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 3,
    notes: "",
    counterfactualHonesty: false,
    policyPledge: false,
  };
}

export const SEED_OFFERS: Offer[] = [
  {
    id: "seed-victoria",
    alias: "Victoria",
    mode: "pledge",
    offeredCause: "Global poverty",
    requestedCause: "Animal welfare",
    offerAction: "Donate 1% of my income to an evidence-backed poverty charity for 12 months.",
    requestAction: "Adopt a vegetarian diet for 12 months.",
    compromiseCause: "Not needed",
    offerImpact: 7,
    minCounterpartyImpact: 8,
    verification: "Annual receipts",
    duration: "12 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 3,
    notes: "I already care about poverty, but a reciprocal trade would let me buy much more animal welfare than I could create alone.",
    source: "Seeded example",
    createdAt: 1700000001000,
  },
  {
    id: "seed-paul",
    alias: "Paul",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    offerAction: "Go vegetarian for 12 months, with a yearly check-in and visible meal log.",
    requestAction: "Donate 1% of income to an effective poverty fund for the same period.",
    compromiseCause: "Not needed",
    offerImpact: 8,
    minCounterpartyImpact: 7,
    verification: "Annual receipts",
    duration: "12 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 3,
    notes: "The diet shift is worth it if it reliably increases poverty giving that I would not otherwise cause.",
    source: "Seeded example",
    createdAt: 1700000002000,
  },
  {
    id: "seed-nia",
    alias: "Nia",
    mode: "pledge",
    offeredCause: "Climate",
    requestedCause: "Public health",
    offerAction: "Replace two weekly car trips with transit and contribute monthly to a climate resilience fund.",
    requestAction: "Volunteer four hours each month with a vaccination or clinic outreach effort.",
    compromiseCause: "Not needed",
    offerImpact: 7,
    minCounterpartyImpact: 6,
    verification: "Public pledge",
    duration: "6 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 2,
    notes: "I want a mixed trade that links a climate habit to a public-health action with light verification.",
    source: "Seeded example",
    createdAt: 1700000003000,
  },
  {
    id: "seed-omar",
    alias: "Omar",
    mode: "pledge",
    offeredCause: "Public health",
    requestedCause: "Climate",
    offerAction: "Volunteer four hours monthly with a community health campaign.",
    requestAction: "Cut two weekly car trips and redirect the savings into climate resilience.",
    compromiseCause: "Not needed",
    offerImpact: 6,
    minCounterpartyImpact: 6,
    verification: "Public pledge",
    duration: "6 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 2,
    notes: "This is a reciprocal mixed trade, not a shared moral consensus.",
    source: "Seeded example",
    createdAt: 1700000004000,
  },
  {
    id: "seed-rebecca",
    alias: "Rebecca",
    mode: "offset",
    offeredCause: "Gun rights",
    requestedCause: "Gun control",
    offerAction: "Redirect $1,000 I would have sent to gun-rights lobbying into a global poverty fund.",
    requestAction: "Redirect $1,000 you would have sent to gun-control lobbying into the same global poverty fund.",
    compromiseCause: "Global poverty",
    offerImpact: 8,
    minCounterpartyImpact: 7,
    verification: "Escrow-backed",
    duration: "3 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 4,
    notes: "If matched, this beats spending money on a zero-sum advocacy fight.",
    source: "Seeded example",
    createdAt: 1700000005000,
  },
  {
    id: "seed-christopher",
    alias: "Christopher",
    mode: "offset",
    offeredCause: "Gun control",
    requestedCause: "Gun rights",
    offerAction: "Redirect $1,000 I would have sent to gun-control lobbying into the same global poverty fund.",
    requestAction: "Redirect $1,000 you would have sent to gun-rights lobbying into that poverty fund.",
    compromiseCause: "Global poverty",
    offerImpact: 8,
    minCounterpartyImpact: 7,
    verification: "Escrow-backed",
    duration: "3 months",
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
    trustLevel: 4,
    notes: "I still care most about policy, but matched redirection dominates cancelling out.",
    source: "Seeded example",
    createdAt: 1700000006000,
  },
  {
    id: "seed-lina",
    alias: "Lina",
    mode: "payment",
    offeredCause: "Financial support",
    requestedCause: "Animal welfare",
    offerAction: "Pay $600 in three installments if someone adopts a vegetarian diet for 12 months.",
    requestAction: "Adopt a vegetarian diet for 12 months with monthly check-ins and a simple meal log.",
    compromiseCause: "Not needed",
    offerImpact: 7,
    minCounterpartyImpact: 6,
    verification: "Escrow-backed",
    duration: "12 months",
    paymentIntervalValue: 1,
    paymentIntervalUnit: "month",
    trustLevel: 4,
    notes: "For me, paying for a real dietary shift is worth the money if it changes behavior that would not have happened otherwise.",
    source: "Seeded example",
    createdAt: 1700000007000,
  },
  {
    id: "seed-marco",
    alias: "Marco",
    mode: "payment",
    offeredCause: "Animal welfare",
    requestedCause: "Financial support",
    offerAction: "Adopt a vegetarian diet for 12 months, with monthly check-ins and a shared meal tracker.",
    requestAction: "Receive $600 over the year if I follow through.",
    compromiseCause: "Not needed",
    offerImpact: 6,
    minCounterpartyImpact: 6,
    verification: "Escrow-backed",
    duration: "12 months",
    paymentIntervalValue: 1,
    paymentIntervalUnit: "month",
    trustLevel: 4,
    notes: "I am already somewhat open to the diet, so a credible payment offer makes the switch prudentially worthwhile.",
    source: "Seeded example",
    createdAt: 1700000008000,
  },
];

export function getAllOffers(localOffers: Offer[]) {
  return [...SEED_OFFERS, ...localOffers];
}

export function formatMode(mode: OfferMode) {
  switch (mode) {
    case "offset":
      return "Donation offset";
    case "payment":
      return "Paid action offer";
    default:
      return "Personal pledge swap";
  }
}

function pluralizeInterval(unit: Exclude<PaymentIntervalUnit, "none">, value: number) {
  const base = unit === "day" ? "day" : unit === "month" ? "month" : "year";
  return value === 1 ? base : `${base}s`;
}

export function formatPaymentCadence(offer: {
  mode: OfferMode | string;
  paymentIntervalValue?: number | null;
  paymentIntervalUnit?: PaymentIntervalUnit | string | null;
  payment_interval_value?: number | null;
  payment_interval_unit?: PaymentIntervalUnit | string | null;
}) {
  if (offer.mode !== "payment") {
    return null;
  }

  const rawIntervalUnit = offer.paymentIntervalUnit ?? offer.payment_interval_unit ?? "none";
  const intervalValue = offer.paymentIntervalValue ?? offer.payment_interval_value ?? null;

  const intervalUnit =
    rawIntervalUnit === "day" || rawIntervalUnit === "month" || rawIntervalUnit === "year"
      ? rawIntervalUnit
      : "none";

  if (!intervalUnit || intervalUnit === "none" || !intervalValue) {
    return "One-time or unspecified payment";
  }

  return `Paid every ${intervalValue} ${pluralizeInterval(intervalUnit, intervalValue)}`;
}

export function filterOffers(offers: Offer[], filters: OfferFilters) {
  return offers.filter((offer) => {
    const modeMatches = filters.mode === "all" || offer.mode === filters.mode;
    const causeMatches =
      filters.cause === "all" ||
      offer.offeredCause === filters.cause ||
      offer.requestedCause === filters.cause ||
      offer.compromiseCause === filters.cause;

    return modeMatches && causeMatches;
  });
}

export function sortOffers(offers: Offer[], selected: Offer | null, sortOrder: SortOrder) {
  const sorted = [...offers];

  if (sortOrder === "recent") {
    return sorted.sort((left, right) => right.createdAt - left.createdAt);
  }

  if (sortOrder === "trust") {
    return sorted.sort((left, right) => {
      if (right.trustLevel !== left.trustLevel) {
        return right.trustLevel - left.trustLevel;
      }

      return right.offerImpact - left.offerImpact;
    });
  }

  return sorted.sort((left, right) => {
    if (selected) {
      if (left.id === selected.id) {
        return -1;
      }
      if (right.id === selected.id) {
        return 1;
      }

      const leftScore = evaluatePair(selected, left).score;
      const rightScore = evaluatePair(selected, right).score;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
    }

    return right.createdAt - left.createdAt;
  });
}

export function evaluatePair(selected: Offer, candidate: Offer): EvaluatedPair {
  const sameMode = selected.mode === candidate.mode;
  const reciprocal =
    sameMode &&
    normalize(selected.offeredCause) === normalize(candidate.requestedCause) &&
    normalize(selected.requestedCause) === normalize(candidate.offeredCause);

  const compromiseCompatible =
    selected.mode !== "offset" ||
    selected.compromiseCause === "Not needed" ||
    candidate.compromiseCause === "Not needed" ||
    normalize(selected.compromiseCause) === normalize(candidate.compromiseCause);

  const impactCompatible =
    candidate.offerImpact >= selected.minCounterpartyImpact &&
    selected.offerImpact >= candidate.minCounterpartyImpact;

  const trustGap = Math.abs(selected.trustLevel - candidate.trustLevel);
  const trustAligned = trustGap <= 1;
  const verificationAligned = selected.verification === candidate.verification;
  const durationAligned = selected.duration === candidate.duration;

  const impactMargin =
    Math.max(0, candidate.offerImpact - selected.minCounterpartyImpact) +
    Math.max(0, selected.offerImpact - candidate.minCounterpartyImpact);

  const score =
    (reciprocal ? 48 : sameMode ? 18 : 0) +
    (compromiseCompatible ? 8 : 0) +
    (impactCompatible ? 18 : 0) +
    Math.max(0, 10 - trustGap * 3) +
    (verificationAligned ? 6 : 0) +
    (durationAligned ? 4 : 0) +
    impactMargin * 2;

  return {
    offer: candidate,
    reciprocal,
    compromiseCompatible,
    impactCompatible,
    trustAligned,
    verificationAligned,
    durationAligned,
    score,
    exact: reciprocal && compromiseCompatible && impactCompatible,
  };
}

export function exactReasons(pair: EvaluatedPair) {
  const reasons = ["Reciprocal causes", "Impact thresholds clear"];

  if (pair.verificationAligned) {
    reasons.push("Same verification");
  }

  if (pair.durationAligned) {
    reasons.push("Same review period");
  }

  if (pair.trustAligned) {
    reasons.push("Trust levels close");
  }

  return reasons;
}

export function gapReasons(pair: EvaluatedPair) {
  const reasons: string[] = [];

  if (!pair.reciprocal) {
    reasons.push("Causes are not fully reciprocal");
  }

  if (!pair.impactCompatible) {
    reasons.push("Impact threshold mismatch");
  }

  if (!pair.compromiseCompatible) {
    reasons.push("Different compromise destination");
  }

  if (!pair.trustAligned) {
    reasons.push("Trust intensity differs");
  }

  if (!reasons.length) {
    reasons.push("Close enough to negotiate");
  }

  return reasons;
}

export function validateOfferDraft(draft: OfferDraft) {
  if (!draft.alias.trim() || !draft.offerAction.trim() || !draft.requestAction.trim()) {
    return "Alias, your action, and the requested action are required.";
  }

  if (!draft.counterfactualHonesty || !draft.policyPledge) {
    return "Confirm both honesty and policy pledges before publishing an offer.";
  }

  return null;
}

export function createOfferFromDraft(draft: OfferDraft): Offer {
  return {
    id: makeId(),
    alias: draft.alias.trim(),
    mode: draft.mode,
    offeredCause: draft.offeredCause,
    requestedCause: draft.requestedCause,
    offerAction: draft.offerAction.trim(),
    requestAction: draft.requestAction.trim(),
    compromiseCause: draft.mode === "offset" ? draft.compromiseCause : "Not needed",
    offerImpact: draft.offerImpact,
    minCounterpartyImpact: draft.minCounterpartyImpact,
    verification: draft.verification,
    duration: draft.duration,
    paymentIntervalValue:
      draft.mode === "payment" && draft.paymentIntervalUnit !== "none"
        ? draft.paymentIntervalValue
        : null,
    paymentIntervalUnit: draft.mode === "payment" ? draft.paymentIntervalUnit : "none",
    trustLevel: draft.trustLevel,
    notes: draft.notes.trim(),
    source: "Your local offer",
    createdAt: Date.now(),
  };
}

export function adjustDraftForMode(draft: OfferDraft, mode: OfferMode): OfferDraft {
  if (mode === "offset") {
    return {
      ...draft,
      mode,
      compromiseCause: draft.compromiseCause === "Not needed" ? "Global poverty" : draft.compromiseCause,
      verification: "Escrow-backed",
      duration: "3 months",
      paymentIntervalValue: null,
      paymentIntervalUnit: "none",
    };
  }

  if (mode === "payment") {
    return {
      ...draft,
      mode,
      offeredCause:
        draft.offeredCause === "Animal welfare" ? "Financial support" : draft.offeredCause,
      requestedCause:
        draft.requestedCause === "Global poverty" ? "Animal welfare" : draft.requestedCause,
      compromiseCause: "Not needed",
      verification: "Escrow-backed",
      duration: "12 months",
      paymentIntervalValue: draft.paymentIntervalValue ?? 1,
      paymentIntervalUnit:
        draft.paymentIntervalUnit === "none" ? "month" : draft.paymentIntervalUnit,
    };
  }

  return {
    ...draft,
    mode,
    compromiseCause: "Not needed",
    verification: draft.verification === "Escrow-backed" ? "Annual receipts" : draft.verification,
    paymentIntervalValue: null,
    paymentIntervalUnit: "none",
  };
}

export function loadLocalOffers() {
  const browserStorage = (globalThis as unknown as {
    localStorage?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
    };
  }).localStorage;

  if (!browserStorage) {
    return [];
  }

  try {
    let raw = browserStorage.getItem(LOCAL_STORAGE_KEY);

    if (!raw) {
      raw = browserStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);

      if (raw) {
        browserStorage.setItem(LOCAL_STORAGE_KEY, raw);
        browserStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
      }
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Offer[]) : [];
  } catch {
    return [];
  }
}

export function persistLocalOffers(offers: Offer[]) {
  const browserStorage = (globalThis as unknown as {
    localStorage?: {
      setItem: (key: string, value: string) => void;
    };
  }).localStorage;

  if (!browserStorage) {
    return;
  }

  browserStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(offers));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function shorten(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1)}...`;
}

function normalize(value: string) {
  return String(value).trim().toLowerCase();
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
