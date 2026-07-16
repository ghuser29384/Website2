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
    bestFor: "Two people who already know the specific exchange they want to make.",
    boundary: "Ordinary paid services, threats, coercion, or open-ended obligations.",
    cta: "Draft a trade",
    fallback: {
      label: "either person declines",
      value: "Nothing happens.",
    },
    headline: "Swap one clear commitment for another.",
    index: "01",
    key: "trade",
    later: false,
    nextNote: "Enter both actions, the proof, the deadline, and the exit rule.",
    nextTitle: "Open the draft.",
    proposition: "You state what you will do and what you want the other person to do in return.",
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
      "You write what you will do.",
      "The other person writes what they will do.",
      "You both confirm the same terms.",
    ],
    success: {
      label: "both people confirm",
      value: "The agreement starts.",
    },
    summary: "One promise for another.",
    target: "/offers/new?entry=draft&mode=pledge",
    title: "Trade",
  },
  {
    authRequired: true,
    bestFor: "Two people with real, pre-existing donation plans that point in opposite directions.",
    boundary: "Invented donation plans, escalated gifts, or pressure to manufacture a match.",
    cta: "Draft an offset",
    fallback: {
      label: "a plan does not verify",
      value: "The original plans stay.",
    },
    headline: "Redirect two planned donations to one shared cause.",
    index: "02",
    key: "offset",
    later: false,
    nextNote: "Enter both planned gifts, the match amount, and the shared destination.",
    nextTitle: "Draft the offset.",
    proposition: "Nothing changes until both original plans are verified.",
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
      "You add the two planned donations.",
      "You choose one shared cause.",
      "Both plans are verified before anything changes.",
    ],
    success: {
      label: "both plans verify",
      value: "The gifts redirect.",
    },
    summary: "Two planned gifts, one shared cause.",
    target: "/offers/new?entry=draft&mode=offset",
    title: "Offset",
  },
  {
    authRequired: false,
    bestFor: "A group that wants the same public good but only wants to pay if enough people join.",
    boundary: "An immediate donation, an unlimited pledge, or a guarantee that the target will be reached.",
    cta: "Explore pools",
    fallback: {
      label: "the target is missed",
      value: "You pay nothing.",
    },
    headline: "Pledge now. Pay only if the target is reached.",
    index: "03",
    key: "pool",
    later: false,
    nextNote: "Choose a live pool with a clear target, deadline, cap, and refund rule.",
    nextTitle: "Browse live pools.",
    proposition: "You set a maximum. The pool charges you only if enough support joins by the deadline.",
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
      "You choose the public good and your maximum.",
      "Other people join before the deadline.",
      "The pool checks whether the target was reached.",
    ],
    success: {
      label: "the target is reached by the deadline",
      value: "You are charged up to your cap.",
    },
    summary: "Pledge now; pay only if enough people join.",
    target: "/pools",
    title: "Pool",
  },
  {
    authRequired: false,
    bestFor: "A reviewed case where a specific compensation gap blocks a plausibly higher-impact role.",
    boundary: "General fundraising, recruitment, or an unverified claim that a career move is impactful.",
    cta: "Draft reviewed request",
    fallback: {
      label: "review fails or the facts change",
      value: "No funds move.",
    },
    headline: "Fund a verified compensation gap.",
    index: "04",
    key: "back",
    later: true,
    nextNote: "Start a private review request. No campaign or funding opens yet.",
    nextTitle: "Start a private review.",
    proposition: "Funding can open only after the role, gap, evidence, and reviewer authority pass review.",
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
      "You name the role and compensation gap.",
      "You submit evidence privately.",
      "A reviewer decides whether funding can open.",
    ],
    success: {
      label: "review passes",
      value: "Funding can open.",
    },
    summary: "Close a reviewed compensation gap.",
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
