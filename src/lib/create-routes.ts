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

export interface CreateRouteDefinition {
  authRequired: boolean;
  bestFor: string;
  boundary: string;
  cta: string;
  headline: string;
  index: string;
  key: CreateMode;
  later: boolean;
  proposition: string;
  receipt: CreateRouteReceiptCopy;
  requirements: readonly string[];
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
    headline: "Swap two bounded commitments.",
    index: "01",
    key: "trade",
    later: false,
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
    requirements: [
      "The no-deal default for both sides",
      "Your exact action and the action requested",
      "A duration, evidence rule, and mutual exit",
    ],
    summary: "Exchange actions or commitments that each side values differently.",
    target: "/offers/new?entry=draft&mode=pledge",
    title: "Trade",
  },
  {
    authRequired: true,
    bestFor: "Two real, opposed giving plans that can be redirected into a shared destination.",
    boundary: "Not a way to manufacture or escalate donations merely to demand a match.",
    cta: "Draft an offset",
    headline: "Redirect opposed planned giving.",
    index: "02",
    key: "offset",
    later: false,
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
    requirements: [
      "Evidence that both planned donations predate the offer",
      "A match amount, ratio, and shared destination",
      "Rules for surplus, failed matching, and receipts",
    ],
    summary: "Redirect a matched amount of two opposed planned donations.",
    target: "/offers/new?entry=draft&mode=offset",
    title: "Offset",
  },
  {
    authRequired: false,
    bestFor: "A group that values the same public good but needs a threshold before anyone contributes.",
    boundary: "Not an immediate donation, an uncapped pledge, or a guarantee that the pool will clear.",
    cta: "Explore pools",
    headline: "Fund only when the threshold clears.",
    index: "03",
    key: "pool",
    later: false,
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
    requirements: [
      "A specific public good and eligible destination",
      "A pledge cap, threshold, and deadline",
      "Settlement, refund, and unmatched-funds rules",
    ],
    summary: "Pledge up to a maximum and fund only when a published condition passes.",
    target: "/pools",
    title: "Pool",
  },
  {
    authRequired: false,
    bestFor: "A reviewed case where compensation is the remaining barrier to a more impactful path.",
    boundary: "Not general fundraising, recruitment, or a blanket promise that a career move is impactful.",
    cta: "Request review",
    headline: "Close a reviewed compensation gap.",
    index: "04",
    key: "back",
    later: true,
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
    requirements: [
      "A concrete role or path and a documented compensation gap",
      "A reviewable impact case without outcome guarantees",
      "A cap, decision deadline, evidence plan, and exit",
    ],
    summary: "Help close a compensation gap for a more impactful path.",
    target: "/background-networking",
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
