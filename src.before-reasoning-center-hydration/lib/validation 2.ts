export const LAUNCH_WEDGE_ROUTES = [
  {
    title: "Verified donation offset",
    description:
      "Redirect opposed donations into a pre-approved compromise destination with baseline proof, an evidence method, and a surplus rule.",
    href: "/donation-offsets",
    cta: "Create or join an offset",
    icon: "offset",
  },
  {
    title: "Moral public-goods cycle",
    description:
      "Coordinate support for shared goods through thresholded commitments and reviewed external contribution evidence.",
    href: "/mpgf",
    cta: "Open public-goods pilot",
    icon: "fund",
  },
  {
    title: "Bounded pledge swap",
    description:
      "Trade short-horizon commitments with explicit baselines, exit conditions, and reviewable evidence rules.",
    href: "/pledge-swaps",
    cta: "Draft a pledge swap",
    icon: "swap",
  },
  {
    title: "Private counterparty search",
    description:
      "Publish broad wish previews, keep exact wishes private, and request mutual introductions only after consent.",
    href: "/background-networking",
    cta: "Find counterparties privately",
    icon: "profile",
  },
] as const;

export const VALIDATION_STATUS_STATES = [
  {
    state: "Draft",
    meaning: "Terms are being written and are not visible as live liquidity.",
    reviewerAction: "No reviewer action yet.",
  },
  {
    state: "Submitted",
    meaning: "The participant has stated the action, reciprocal request, baseline, duration, exit condition, and evidence rule.",
    reviewerAction: "Completeness and safety screen.",
  },
  {
    state: "Needs evidence",
    meaning: "The claim depends on receipts, public logs, third-party records, or prior-donation proof.",
    reviewerAction: "Request missing proof or keep the record paused.",
  },
  {
    state: "Challenge window",
    meaning: "Counterparties or reviewers can flag duplicate proof, coercive framing, or factual gaps.",
    reviewerAction: "Hold completion until the challenge lane closes.",
  },
  {
    state: "Completion reviewed",
    meaning: "Evidence supports the specific claim being displayed, without implying legal, tax, custody, or outcome guarantees.",
    reviewerAction: "Publish only the verified claim and reviewer confidence band.",
  },
  {
    state: "Disputed or unresolved",
    meaning: "The record remains visible as a problem state, not a completed trade.",
    reviewerAction: "Publish a short reasoning summary when disclosure is safe.",
  },
] as const;

export const VALIDATOR_SCOPES = [
  {
    title: "Evidence schema by format",
    detail:
      "Offsets use baseline proof, receipt or audit links, match ratio, surplus rule, and destination checks. Pledge swaps use logs, attestations, timestamps, and agreed check-ins.",
  },
  {
    title: "One proof, one claim",
    detail:
      "The same receipt, audit, or public log should not create multiple verified-completion claims unless the record explicitly explains why reuse is valid.",
  },
  {
    title: "Conflict rules",
    detail:
      "Reviewers should not validate offers where they are a party, beneficiary, close counterparty, or institutional sponsor.",
  },
  {
    title: "Appeal and challenge lane",
    detail:
      "Participants can challenge a completion state, duplicate proof, coercive baseline, or factual error before a badge becomes durable.",
  },
  {
    title: "Reviewer quality metrics",
    detail:
      "Track turnaround time, challenge rate, appeal overturn rate, duplicate-proof misses, and unresolved dispute share.",
  },
  {
    title: "Public transparency note",
    detail:
      "Publish real counts only: submitted records, reviewed completions, blocked proposals, disputes, and appeal outcomes.",
  },
] as const;

export const TRUST_BADGE_LADDER = [
  "Identity verified",
  "Organization verified",
  "Provider payment verified",
  "Completion reviewed",
  "Repeat counterparty",
] as const;

export const VALIDATION_CHALLENGE_WINDOW_DAYS = 7;

type DonationOffsetModerationStatus = "clear" | "flagged" | "blocked";

type EvidenceStateTone = "success" | "warning" | "danger";

export interface DonationOffsetEvidenceState {
  label: string;
  summary: string;
  tone: EvidenceStateTone;
  challengeWindowEndsAt: string | null;
  challengeWindowActive: boolean;
  badgeEligible: boolean;
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function normalizeEvidenceLocator(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(trimmedValue);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    url.pathname = removeTrailingSlash(url.pathname) || "/";
    url.searchParams.sort();

    return url.toString();
  } catch {
    return removeTrailingSlash(trimmedValue.replace(/\s+/g, " ").toLowerCase());
  }
}

export function evidenceLocatorsConflict(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeEvidenceLocator(left ?? "");
  const normalizedRight = normalizeEvidenceLocator(right ?? "");

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function addDays(value: number, days: number) {
  return new Date(value + days * 24 * 60 * 60 * 1000).toISOString();
}

export function getDonationOffsetEvidenceState({
  moderationStatus,
  evidenceUrl,
  moderationReviewedAt,
  now = new Date(),
}: {
  moderationStatus: DonationOffsetModerationStatus;
  evidenceUrl: string | null | undefined;
  moderationReviewedAt: string | null | undefined;
  createdAt: string | null | undefined;
  now?: Date;
}): DonationOffsetEvidenceState {
  const hasEvidence = Boolean(normalizeEvidenceLocator(evidenceUrl ?? ""));

  if (moderationStatus === "blocked") {
    return {
      label: "Disputed or unresolved",
      summary:
        "Reviewers blocked this offset or left it unresolved. Do not treat it as a completed or review-cleared claim.",
      tone: "danger",
      challengeWindowEndsAt: null,
      challengeWindowActive: false,
      badgeEligible: false,
    };
  }

  if (moderationStatus === "flagged" || !hasEvidence) {
    return {
      label: "Needs evidence",
      summary:
        "This offset still needs a receipt, payment record, audit link, or reviewer note before anyone should rely on it.",
      tone: "warning",
      challengeWindowEndsAt: null,
      challengeWindowActive: false,
      badgeEligible: false,
    };
  }

  const reviewAnchor = parseTimestamp(moderationReviewedAt);
  const challengeWindowEndsAt = reviewAnchor
    ? addDays(reviewAnchor, VALIDATION_CHALLENGE_WINDOW_DAYS)
    : null;
  const challengeWindowActive = reviewAnchor
    ? now.getTime() < Date.parse(challengeWindowEndsAt ?? "")
    : true;

  if (challengeWindowActive) {
    return {
      label: "Challenge window",
      summary:
        "Evidence is present and the claim is still inside the duplicate-proof and factual-error challenge window.",
      tone: "warning",
      challengeWindowEndsAt,
      challengeWindowActive: true,
      badgeEligible: false,
    };
  }

  return {
    label: "Review-cleared evidence",
    summary:
      "Evidence has cleared reviewer screening and the challenge window, without implying legal, tax, custody, or outcome guarantees.",
    tone: "success",
    challengeWindowEndsAt,
    challengeWindowActive: false,
    badgeEligible: true,
  };
}
