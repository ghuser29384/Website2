import { MARKETPLACE_PUBLIC_GOODS_BOUNDARY } from "./marketplace-boundary";

export const MARKETPLACE_INTAKE_TRIAGE_VERSION =
  "moral-trade-marketplace-intake-triage-v0.1-2026-06";

export type MarketplaceIntakeRouteKey =
  | "donation_offset"
  | "bounded_pledge_swap"
  | "ordinary_donation"
  | "ordinary_matching_or_cofunding"
  | "ordinary_procurement_or_service"
  | "self_offset_bookkeeping"
  | "external_crecm_public_goods"
  | "background_networking_request"
  | "prohibited_or_unsupported";

export type MarketplaceIntakeRouteKind =
  | "non_public_goods_marketplace_preview"
  | "safe_external_path"
  | "manual_review_or_blocked";

export interface MarketplaceIntakeTriageRoute {
  correctionPath: string;
  href: string;
  key: MarketplaceIntakeRouteKey;
  label: string;
  nextAction: string;
  routeEligible: boolean;
  routeKind: MarketplaceIntakeRouteKind;
  safeReasonCategory: string;
  status: string;
  summary: string;
}

export const MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS: MarketplaceIntakeRouteKey[] = [
  "ordinary_donation",
  "ordinary_matching_or_cofunding",
  "ordinary_procurement_or_service",
  "self_offset_bookkeeping",
  "external_crecm_public_goods",
  "background_networking_request",
  "prohibited_or_unsupported",
];

export const MARKETPLACE_LOCK_PATH_KEYS: MarketplaceIntakeRouteKey[] = [
  "donation_offset",
  "bounded_pledge_swap",
];

export const MARKETPLACE_INTAKE_TRIAGE_ROUTES: MarketplaceIntakeTriageRoute[] = [
  {
    key: "donation_offset",
    label: "Donation offset",
    href: "/offers/new?mode=offset",
    status: "Marketplace preview",
    routeEligible: true,
    routeKind: "non_public_goods_marketplace_preview",
    safeReasonCategory: "non-public-goods donation offset",
    nextAction: "Create a preview draft",
    correctionPath: "Use manual review if this is not an opposed-baseline donation trade.",
    summary:
      "Use when two opposed baseline donations may redirect into a reviewed compromise destination.",
  },
  {
    key: "bounded_pledge_swap",
    label: "Bounded pledge swap",
    href: "/offers/new?template=reciprocal-mixed",
    status: "Marketplace preview",
    routeEligible: true,
    routeKind: "non_public_goods_marketplace_preview",
    safeReasonCategory: "bounded pledge swap",
    nextAction: "Create a preview draft",
    correctionPath: "Use manual review for off-template, long-duration, or high-burden pledges.",
    summary:
      "Use for one meal, a few meals, one day, or a few days with substitutes, health boundaries, and pre-performance lock.",
  },
  {
    key: "ordinary_donation",
    label: "Ordinary donation",
    href: "/donate",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary donation",
    nextAction: "Use the direct donation path",
    correctionPath: "Request review only if a distinct counterparty and moral-trade baseline exist.",
    summary:
      "Use direct giving when no opposed baseline, counterparty condition, or trade-specific redirect is needed.",
  },
  {
    key: "ordinary_matching_or_cofunding",
    label: "Ordinary matching or co-funding",
    href: "/donation-offsets",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary matching",
    nextAction: "Use ordinary donation or matching guidance",
    correctionPath:
      "Request review only if moral disagreement or indexical obligations are necessary to explain the exchange.",
    summary:
      "Ordinary matching gifts and same-view co-funding do not enter the non-public-goods lock path.",
  },
  {
    key: "ordinary_procurement_or_service",
    label: "Ordinary service or procurement",
    href: "/paid-action-offers",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary service",
    nextAction: "Use paid-action guidance without moral-trade counting",
    correctionPath: "Request manual review for a narrow compensated moral-action exception.",
    summary:
      "Ordinary work, paid services, and procurement are not counted as Toby-Ord moral trade.",
  },
  {
    key: "self_offset_bookkeeping",
    label: "Personal self-offset bookkeeping",
    href: "/donation-offsets",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "self-offset",
    nextAction: "Use personal planning or external donation evidence",
    correctionPath: "Request review only if a distinct counterparty or represented moral perspective joins.",
    summary:
      "Personal self-offsets can be useful records, but they do not count as interpersonal moral-trade agreements.",
  },
  {
    key: "external_crecm_public_goods",
    label: `${MARKETPLACE_PUBLIC_GOODS_BOUNDARY.userFacingLabel} public-goods module`,
    href: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.href,
    status: "Separate module",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "external CRECM public goods",
    nextAction: "Open the Common Ground Budget module",
    correctionPath: "Return to this page only for non-public-goods donation offsets or pledge swaps.",
    summary: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.sourceOfTruthNote,
  },
  {
    key: "background_networking_request",
    label: "Background-networking request",
    href: "/background-networking",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "background networking",
    nextAction: "Use the consent-gated background-networking path",
    correctionPath: "Return only if the request is a bounded non-public-goods trade draft.",
    summary:
      "Contact discovery, introductions, and autonomous outreach are outside the marketplace lock path.",
  },
  {
    key: "prohibited_or_unsupported",
    label: "Unsupported or safety review",
    href: "/anti-threat-rules",
    status: "Review first",
    routeEligible: false,
    routeKind: "manual_review_or_blocked",
    safeReasonCategory: "safety or prohibited use",
    nextAction: "Read the safety boundary or request neutral review",
    correctionPath: "Use appeal or correction only for a specific misunderstood safe trade.",
    summary:
      "Threat creation, unsafe abstention, coercion, contact pressure, exact private wishes, or prohibited requests cannot draft into a lock path.",
  },
];

export interface MarketplaceIntakeTriageValidation {
  blockers: string[];
  status: "pass" | "fail";
  version: typeof MARKETPLACE_INTAKE_TRIAGE_VERSION;
}

export function validateMarketplaceIntakeTriageRoutes(
  routes = MARKETPLACE_INTAKE_TRIAGE_ROUTES,
): MarketplaceIntakeTriageValidation {
  const blockers: string[] = [];
  const keys = new Set(routes.map((route) => route.key));

  for (const key of [...MARKETPLACE_LOCK_PATH_KEYS, ...MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS]) {
    if (!keys.has(key)) blockers.push(`missing_route:${key}`);
  }

  for (const route of routes) {
    if (!route.summary || !route.nextAction || !route.safeReasonCategory) {
      blockers.push(`plain_language_fields_missing:${route.key}`);
    }

    if (!route.correctionPath) {
      blockers.push(`correction_path_missing:${route.key}`);
    }

    if (MARKETPLACE_LOCK_PATH_KEYS.includes(route.key) && !route.routeEligible) {
      blockers.push(`lock_path_route_not_eligible:${route.key}`);
    }

    if (MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS.includes(route.key)) {
      if (route.routeEligible) blockers.push(`route_away_marked_eligible:${route.key}`);
      if (route.href.startsWith("/offers/new")) blockers.push(`route_away_points_to_lock_path:${route.key}`);
    }

    if (/willingness to pay|ideology|moral theory|moral rank|moral score/i.test(route.summary)) {
      blockers.push(`triage_infers_private_moral_profile:${route.key}`);
    }
  }

  return {
    blockers,
    status: blockers.length ? "fail" : "pass",
    version: MARKETPLACE_INTAKE_TRIAGE_VERSION,
  };
}
