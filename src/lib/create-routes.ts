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
    bestFor: "Two people with a specific exchange in mind.",
    boundary: "Paid services, threats, coercion, or open-ended obligations.",
    cta: "Draft a trade",
    fallback: {
      label: "Either declines",
      value: "No deal",
    },
    headline: "Swap commitments.",
    index: "01",
    key: "trade",
    later: false,
    nextNote: "Add both promises and the proof.",
    nextTitle: "Open the draft.",
    proposition: "You promise X. They promise Y.",
    receipt: {
      baseline: "The explicit status quo for both participants.",
      commitment: "Your bounded action, amount, or service.",
      other: "The counterparty action requested in exchange.",
      condition: "Both sides accept the same frozen terms.",
      exposure: "The largest amount, duration, or burden you can incur.",
      evidence: "A named proof type, reviewer, deadline, and privacy scope.",
      exit: "Withdrawal before lock; cancellation, expiry, and challenge rules after.",
    },
    requirements: ["You promise X", "They promise Y", "Both confirm"],
    success: {
      label: "Both confirm",
      value: "Trade starts",
    },
    summary: "You do X. They do Y.",
    target: "/offers/new?entry=draft&mode=pledge",
    title: "Trade",
  },
  {
    authRequired: true,
    bestFor: "Two real donation plans pointing in opposite directions.",
    boundary: "Invented, inflated, or pressured donation plans.",
    cta: "Draft an offset",
    fallback: {
      label: "Verification fails",
      value: "Plans stay",
    },
    headline: "Redirect planned gifts.",
    index: "02",
    key: "offset",
    later: false,
    nextNote: "Add both plans and one shared cause.",
    nextTitle: "Open the draft.",
    proposition: "Two opposed gifts move to one shared cause.",
    receipt: {
      baseline: "Each participant's pre-existing intended donation and destination.",
      commitment: "Your capped redirect amount and original intended destination.",
      other: "The matched redirect amount and opposed destination.",
      condition: "Both baselines, the shared destination, and settlement rules pass review.",
      exposure: "The maximum matched amount that can be redirected.",
      evidence: "Prior-intent evidence and narrow proof of the external donation.",
      exit: "No match, failed review, or missing evidence returns the proposal to the stated fallback.",
    },
    requirements: ["Add both plans", "Pick one cause", "Verify both"],
    success: {
      label: "Both verify",
      value: "Gifts redirect",
    },
    summary: "Two gifts. One shared cause.",
    target: "/offers/new?entry=draft&mode=offset",
    title: "Offset",
  },
  {
    authRequired: false,
    bestFor: "A shared project that needs a funding threshold.",
    boundary: "An immediate donation, an unlimited pledge, or guaranteed success.",
    cta: "Explore pools",
    fallback: {
      label: "Target missed",
      value: "Pay $0",
    },
    headline: "Pay only if the pool fills.",
    index: "03",
    key: "pool",
    later: false,
    nextNote: "Choose a live pool.",
    nextTitle: "Browse pools.",
    proposition: "Your pledge activates only when the target clears.",
    receipt: {
      baseline: "The public good remains unfunded or funded below the stated level.",
      commitment: "A named maximum pledge, not an unlimited or immediate donation.",
      other: "The aggregate commitments required from the rest of the pool.",
      condition: "The threshold and published review gates pass by the deadline.",
      exposure: "Your maximum pledge and any separately disclosed fees.",
      evidence: "Published pool totals, threshold status, destination, and settlement record.",
      exit: "Expiry, failed assurance, cancellation, refund, and challenge rules are stated in advance.",
    },
    requirements: ["Set your cap", "Others join", "Check target"],
    success: {
      label: "Target met",
      value: "Pay ≤ cap",
    },
    summary: "Pledge now. Pay at target.",
    target: "/pools",
    title: "Pool",
  },
  {
    authRequired: false,
    bestFor: "A verified pay gap blocking a reviewed role.",
    boundary: "General fundraising, recruitment, or unverified impact claims.",
    cta: "Start review",
    fallback: {
      label: "Review fails",
      value: "No funds move",
    },
    headline: "Fund a verified gap.",
    index: "04",
    key: "back",
    later: true,
    nextNote: "Submit the role and gap privately.",
    nextTitle: "Start review.",
    proposition: "Funding opens only after private review.",
    receipt: {
      baseline: "The candidate remains on the current path or declines the reviewed alternative.",
      commitment: "A capped contribution toward the verified compensation gap.",
      other: "The candidate accepts the reviewed path and its evidence terms.",
      condition: "The role, salary gap, impact case, and participant authority pass review.",
      exposure: "The contribution cap and any time-bounded follow-on obligation.",
      evidence: "Role, compensation, decision, and impact evidence under an explicit privacy scope.",
      exit: "The request expires or returns to review when the role, gap, or material facts change.",
    },
    requirements: ["Name the gap", "Review evidence", "Decision"],
    success: {
      label: "Review passes",
      value: "Funding opens",
    },
    summary: "Reviewed gap funding.",
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
