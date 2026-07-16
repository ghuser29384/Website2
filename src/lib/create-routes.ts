export type CreateMode = "trade" | "offset" | "pool" | "back";

export interface CreateRouteReceiptCopy {
  baseline: string;
  commitment: string;
  other: string;
  condition: string;
  exposure: string;
  evidence: string;
  exit: string;
}

export interface CreateRouteOutcomeCopy {
  label: string;
  value: string;
}

export interface CreateRouteDefinition {
  authRequired: boolean;
  bestFor: string;
  boundary: string;
  cta: string;
  fallback: CreateRouteOutcomeCopy;
  headline: string;
  index: string;
  key: CreateMode;
  later: boolean;
  nextNote: string;
  nextTitle: string;
  proposition: string;
  receipt: CreateRouteReceiptCopy;
  requirements: readonly string[];
  success: CreateRouteOutcomeCopy;
  summary: string;
  target: string;
  title: string;
}

export const CREATE_ROUTE_DEFINITIONS: readonly CreateRouteDefinition[] = [
  {
    authRequired: true,
    bestFor: "Two people who already have a concrete exchange in mind.",
    boundary: "Not ordinary paid services, threats, or open-ended obligations.",
    cta: "Draft a trade",
    fallback: {
      label: "No match",
      value: "No deal",
    },
    headline: "You do X. They do Y.",
    index: "01",
    key: "trade",
    later: false,
    nextNote: "Nothing is binding yet.",
    nextTitle: "Open the draft.",
    proposition: "I will do X if you do Y.",
    receipt: {
      baseline: "The explicit status quo for both participants.",
      commitment: "Your bounded action, amount, or service.",
      other: "The counterparty action requested in exchange.",
      condition: "Both sides accept the same frozen terms.",
      exposure: "The largest amount, duration, or burden you can incur.",
      evidence: "A named proof type, reviewer, deadline, and privacy scope.",
      exit: "Withdrawal before lock; cancellation, expiry, and challenge rules after.",
    },
    requirements: ["Your action", "Their action", "Proof + deadline"],
    success: {
      label: "Both confirm",
      value: "Trade starts",
    },
    summary: "Swap bounded commitments.",
    target: "/offers/new?entry=draft&mode=pledge",
    title: "Trade",
  },
  {
    authRequired: true,
    bestFor: "Two real, opposed giving plans that can be redirected into a shared destination.",
    boundary: "Not a way to manufacture or escalate donations merely to demand a match.",
    cta: "Draft an offset",
    fallback: {
      label: "No match",
      value: "Plans stay",
    },
    headline: "Two donations. One shared cause.",
    index: "02",
    key: "offset",
    later: false,
    nextNote: "Nothing moves until both plans verify.",
    nextTitle: "Open the draft.",
    proposition: "We redirect the matched amount to something we both value.",
    receipt: {
      baseline: "Each participant's pre-existing intended donation and destination.",
      commitment: "Your capped redirect amount and original intended destination.",
      other: "The matched redirect amount and opposed destination.",
      condition: "Both baselines, the shared destination, and settlement rules pass review.",
      exposure: "The maximum matched amount that can be redirected.",
      evidence: "Prior-intent evidence and narrow proof of the external donation.",
      exit: "No match, failed review, or missing evidence returns the proposal to the stated fallback.",
    },
    requirements: ["Both planned gifts", "Match amount", "Shared cause"],
    success: {
      label: "Both verify",
      value: "Funds redirect",
    },
    summary: "Redirect opposed donations.",
    target: "/offers/new?entry=draft&mode=offset",
    title: "Offset",
  },
  {
    authRequired: false,
    bestFor: "A group that values the same public good but needs a threshold before anyone contributes.",
    boundary: "Not an immediate donation, an uncapped pledge, or a guarantee that the pool will clear.",
    cta: "Explore pools",
    fallback: {
      label: "Misses deadline",
      value: "$0 charged",
    },
    headline: "Join now. Pay only if it fills.",
    index: "03",
    key: "pool",
    later: false,
    nextNote: "No charge unless a target clears.",
    nextTitle: "See live pools.",
    proposition: "Charge me only if enough support joins by the deadline.",
    receipt: {
      baseline: "The public good remains unfunded or funded below the stated level.",
      commitment: "A named maximum pledge, not an unlimited or immediate donation.",
      other: "The aggregate commitments required from the rest of the pool.",
      condition: "The threshold and published review gates pass by the deadline.",
      exposure: "Your maximum pledge and any separately disclosed fees.",
      evidence: "Published pool totals, threshold status, destination, and settlement record.",
      exit: "Expiry, failed assurance, cancellation, refund, and challenge rules are stated in advance.",
    },
    requirements: ["Public good", "Target + deadline", "Cap + refund"],
    success: {
      label: "Target reached",
      value: "Charged ≤ cap",
    },
    summary: "Pay only at the target.",
    target: "/pools",
    title: "Pool",
  },
  {
    authRequired: false,
    bestFor: "A reviewed case where compensation is the remaining barrier to a more impactful path.",
    boundary: "Not general fundraising, recruitment, or a blanket promise that a career move is impactful.",
    cta: "Draft reviewed request",
    fallback: {
      label: "Facts change",
      value: "Back to review",
    },
    headline: "Back a verified gap.",
    index: "04",
    key: "back",
    later: true,
    nextNote: "Private intake. No funds move.",
    nextTitle: "Open review.",
    proposition: "Backers conditionally fund part of a verified gap.",
    receipt: {
      baseline: "The candidate remains on the current path or declines the reviewed alternative.",
      commitment: "A capped contribution toward the verified compensation gap.",
      other: "The candidate accepts the reviewed path and its evidence terms.",
      condition: "The role, salary gap, impact case, and participant authority pass review.",
      exposure: "The contribution cap and any time-bounded follow-on obligation.",
      evidence: "Role, compensation, decision, and impact evidence under an explicit privacy scope.",
      exit: "The request expires or returns to review when the role, gap, or material facts change.",
    },
    requirements: ["Role + gap", "Impact review", "Cap + deadline"],
    success: {
      label: "Review passes",
      value: "Funding opens",
    },
    summary: "Close a verified gap.",
    target: "/create?mode=back",
    title: "Back",
  },
] as const;

const CREATE_ROUTES_BY_MODE = new Map(
  CREATE_ROUTE_DEFINITIONS.map((route) => [route.key, route] as const),
);

export function readCreateMode(value: string | string[] | undefined): CreateMode {
  const resolved = Array.isArray(value) ? value[0] : value;

  return resolved === "offset" || resolved === "pool" || resolved === "back"
    ? resolved
    : "trade";
}

export function getCreateRoute(mode: CreateMode): CreateRouteDefinition {
  return CREATE_ROUTES_BY_MODE.get(mode) ?? CREATE_ROUTE_DEFINITIONS[0];
}

export function buildCreateTargetHref(mode: CreateMode, isAuthenticated: boolean): string {
  const route = getCreateRoute(mode);

  if (isAuthenticated || !route.authRequired) {
    return route.target;
  }

  return `/signup?returnTo=${encodeURIComponent(route.target)}`;
}
