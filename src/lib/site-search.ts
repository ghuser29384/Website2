import { PARTNER_COHORTS } from "@/lib/growth";

export interface SiteSearchItem {
  href: string;
  label: string;
  summary: string;
  kind: "trade" | "category" | "learn" | "account" | "community" | "fund";
  keywords: string[];
}

export const SITE_SEARCH_ITEMS: SiteSearchItem[] = [
  {
    href: "/offers",
    label: "Proposal registry",
    summary: "Browse reviewed proposals and worked examples by cause, format, evidence method, and review state.",
    kind: "trade",
    keywords: ["offer", "trade", "registry", "proposal", "swap", "payment", "offset"],
  },
  {
    href: "/moral-trade",
    label: "What is moral trade?",
    summary: "A short primer on voluntary cooperation across moral disagreement.",
    kind: "learn",
    keywords: ["primer", "moral trade", "ord", "voluntary", "disagreement", "vegetarian"],
  },
  {
    href: "/how-it-works",
    label: "How it works",
    summary: "A one-screen guide to the current pilot workflow and recommended first action.",
    kind: "learn",
    keywords: ["how it works", "guide", "first action", "workflow", "new visitor", "what it is"],
  },
  {
    href: "/sources",
    label: "Sources",
    summary: "Conceptual sources and internal reference pages for the Moral Trade pilot.",
    kind: "learn",
    keywords: ["sources", "references", "toby ord", "forethought", "methodology", "bibliography"],
  },
  {
    href: "/about",
    label: "About Moral Trade",
    summary: "Pilot stewardship, operator commitments, review posture, and trust roadmap.",
    kind: "learn",
    keywords: ["about", "operators", "stewards", "governance", "team", "advisor", "trust"],
  },
  {
    href: "/anti-threat-baseline",
    label: "Anti-threat and baseline integrity",
    summary: "Rules for threat rejection, no-trade baselines, cooling-off periods, and externality review.",
    kind: "learn",
    keywords: [
      "threat", "baseline", "counterfactual", "coercion", "cooling-off", "externality", "review",
    ],
  },
  {
    href: "/research",
    label: "Research and governance",
    summary: "What the pilot is testing, what would make it unsafe, and reviewer governance links.",
    kind: "learn",
    keywords: ["research", "governance", "reviewer", "rulebook", "transparency", "operators"],
  },
  {
    href: "/offers?view=examples",
    label: "Worked examples",
    summary: "Clone or inspect seeded examples before publishing a live trade.",
    kind: "trade",
    keywords: ["example", "worked", "clone", "template", "first action"],
  },
  {
    href: "/cohort",
    label: "Founding cohort",
    summary: "Join the founding cohort, invite one serious counterparty, and start with one low-risk action.",
    kind: "community",
    keywords: ["cohort", "founding", "signup", "invite", "referral", "demo", "activation"],
  },
  {
    href: "/status",
    label: "Pilot status",
    summary: "See what is live, what is prototype-stage, and what visitors can rely on today.",
    kind: "learn",
    keywords: ["status", "roadmap", "pilot updates", "live offers", "prototype", "liquidity"],
  },
  {
    href: "/updates",
    label: "Pilot updates",
    summary: "Subscribe for founding cohort, reviewer governance, and public-goods pilot updates.",
    kind: "community",
    keywords: ["updates", "subscribe", "newsletter", "digest", "cohort", "governance", "transparency"],
  },
  {
    href: "/trust",
    label: "What you can rely on",
    summary: "Review current guarantees, non-guarantees, review states, and recourse routes.",
    kind: "learn",
    keywords: ["trust", "guarantees", "non-guarantees", "review states", "recourse", "rely"],
  },
  {
    href: "/contact",
    label: "Contact Moral Trade",
    summary: "Reach operators about safety concerns, reviewer questions, partnerships, and cohort inquiries.",
    kind: "learn",
    keywords: ["contact", "support", "safety concern", "operator", "partnership", "recourse"],
  },
  {
    href: "/onboarding",
    label: "Cohort onboarding",
    summary: "Save your role, cause areas, attribution, and first action after signup.",
    kind: "account",
    keywords: ["onboarding", "role", "cause", "first action", "activation", "wizard"],
  },
  {
    href: "/password-reset",
    label: "Password reset",
    summary: "Request an email link to reset your Moral Trade account password.",
    kind: "account",
    keywords: ["password", "reset", "forgot", "login", "account", "recovery"],
  },
  ...PARTNER_COHORTS.map((partner) => ({
    href: `/cohort/${partner.slug}`,
    label: partner.name,
    summary: `Partner landing page for ${partner.audience}.`,
    kind: "community" as const,
    keywords: ["partner", "cohort", partner.primaryCause, partner.slug, partner.useCase],
  })),
  {
    href: "/pledge-swaps",
    label: "Pledge swaps",
    summary: "Learn and browse reciprocal commitments such as donations, volunteering, or habit changes.",
    kind: "trade",
    keywords: ["pledge", "swap", "reciprocal", "commitment", "vegetarian"],
  },
  {
    href: "/donation-offsets",
    label: "Donation offsets",
    summary: "Redirect opposed donations toward a named compromise destination.",
    kind: "trade",
    keywords: ["donation", "offset", "pool", "assurance", "compromise", "matched"],
  },
  {
    href: "/paid-action-offers",
    label: "Paid action offers",
    summary: "Structure paid actions with external-payment evidence and no escrow or custody claim.",
    kind: "trade",
    keywords: ["paid", "payment", "action", "verification", "escrow", "external"],
  },
  {
    href: "/mpgf",
    label: "Public Goods Fund",
    summary: "Review external-payment evidence submission, candidate pools, and allocation workflow.",
    kind: "fund",
    keywords: ["mpgf", "fund", "public goods", "evidence", "contribution", "pool"],
  },
  {
    href: "/donate",
    label: "Donation routes",
    summary: "Use verified Every.org routes and return to log gifts when they matter for a workflow.",
    kind: "fund",
    keywords: ["donate", "donation", "every.org", "gift", "route", "log gift", "reconciliation"],
  },
  {
    href: "/priority-correction-fund",
    label: "Priority Correction Fund",
    summary: "Inspect monthly correction cycles, arbiters, and published reasoning.",
    kind: "fund",
    keywords: ["priority", "correction", "karma", "arbiter", "10%", "allocation"],
  },
  {
    href: "/offers?search=Global%20Health",
    label: "Global health",
    summary: "Search trades connected to global health, poverty, and public health.",
    kind: "category",
    keywords: ["global health", "poverty", "public health", "dalys", "malaria"],
  },
  {
    href: "/offers?search=Animal%20Welfare",
    label: "Animal welfare",
    summary: "Search trades connected to animals, vegetarianism, and welfare.",
    kind: "category",
    keywords: ["animal", "welfare", "vegetarian", "factory farming"],
  },
  {
    href: "/offers?search=Climate",
    label: "Climate action",
    summary: "Search trades connected to climate, emissions, and resilience.",
    kind: "category",
    keywords: ["climate", "emissions", "carbon", "resilience"],
  },
  {
    href: "/offers?search=Existential%20risk",
    label: "Existential risk",
    summary: "Search trades connected to AI safety, biorisk, and long-run futures.",
    kind: "category",
    keywords: ["existential", "x-risk", "ai", "biorisk", "future"],
  },
  {
    href: "/people",
    label: "Community directory",
    summary: "Find public member profiles, broad cause areas, and visible offers.",
    kind: "community",
    keywords: ["people", "community", "profile", "member", "karma"],
  },
  {
    href: "/wish-registry",
    label: "Wish registry",
    summary: "Search broad wish previews without revealing exact private wishes.",
    kind: "community",
    keywords: ["wish", "registry", "background networking", "match", "preview"],
  },
  {
    href: "/reasoning-standards",
    label: "Reasoning standards",
    summary: "Learn how the platform separates voluntary trade from threats and coercion.",
    kind: "learn",
    keywords: ["learn", "standards", "threat", "coercion", "verification", "escrow"],
  },
  {
    href: "/validation",
    label: "Validation and evidence",
    summary: "Review validator scopes, evidence states, challenge windows, and trust badges.",
    kind: "learn",
    keywords: ["validation", "evidence", "review", "rulebook", "appeal", "badge", "governance"],
  },
  {
    href: "/background-networking",
    label: "Private wish matching",
    summary: "Understand staged discovery, consent gates, and non-autonomous matching.",
    kind: "learn",
    keywords: ["private", "wish", "matching", "consent", "privacy", "staged"],
  },
  {
    href: "/dashboard",
    label: "My trades",
    summary: "Manage active offers, interests, agreements, profile data, and alerts.",
    kind: "account",
    keywords: ["dashboard", "account", "my trades", "favourites", "favorites", "profile"],
  },
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function filterSiteSearchItems(query: string, limit = 7) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return SITE_SEARCH_ITEMS.slice(0, limit);
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return SITE_SEARCH_ITEMS.map((item) => {
    const haystack = normalizeSearchText(
      [item.label, item.summary, item.kind, ...item.keywords].join(" "),
    );
    const score = tokens.reduce((sum, token) => {
      if (normalizeSearchText(item.label).includes(token)) {
        return sum + 5;
      }

      if (item.keywords.some((keyword) => normalizeSearchText(keyword).includes(token))) {
        return sum + 3;
      }

      return haystack.includes(token) ? sum + 1 : sum;
    }, 0);

    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label))
    .slice(0, limit)
    .map((entry) => entry.item);
}
