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
    label: "All public offers",
    summary: "Browse pledge swaps, donation offsets, public-good commitments, and worked examples.",
    kind: "trade",
    keywords: ["offer", "trade", "marketplace", "listing", "registry", "proposal", "swap", "payment", "offset"],
  },
  {
    href: "/projects",
    label: "Projects",
    summary: "See worked examples, the Public Goods Fund, and upcoming pilot workflows in one hub.",
    kind: "learn",
    keywords: ["projects", "what are you doing", "worked examples", "public goods", "pilot", "upcoming"],
  },
  {
    href: "/start",
    label: "Choose your path",
    summary: "Route yourself by intent: learn the idea, test an example, donate, or join/build.",
    kind: "learn",
    keywords: [
      "start",
      "choose path",
      "visitor router",
      "learn",
      "test example",
      "donate",
      "join",
      "build",
    ],
  },
  {
    href: "/about",
    label: "About Moral Trade",
    summary: "What exists today, what does not exist yet, who is accountable, and what comes next.",
    kind: "learn",
    keywords: ["about", "mission", "what exists", "what is live", "boundaries", "operator"],
  },
  {
    href: "/what-is-moral-trade",
    label: "What is moral trade?",
    summary: "A short primer on voluntary cooperation across moral disagreement.",
    kind: "learn",
    keywords: ["primer", "moral trade", "ord", "voluntary", "disagreement", "vegetarian"],
  },
  {
    href: "/moral-trade/technical-spec",
    label: "Moral Trade technical spec",
    summary: "Inspect the core proposal validator, factor codes, evidence schemas, and health JSON.",
    kind: "learn",
    keywords: ["technical", "spec", "validator", "protocol", "schema", "factor codes", "provenance"],
  },
  {
    href: "/sources",
    label: "Sources",
    summary: "Primary references and product-boundary notes for the Moral Trade pilot.",
    kind: "learn",
    keywords: ["sources", "references", "ord", "forethought", "moral public goods", "methodology"],
  },
  {
    href: "/how-it-works",
    label: "How it works",
    summary: "Start with one low-risk example, write the baseline, agree on proof, and review risks.",
    kind: "learn",
    keywords: ["how it works", "steps", "baseline", "proof", "review", "first action"],
  },
  {
    href: "/anti-threat-rules",
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
    href: "/measurement",
    label: "Measurement plan",
    summary: "Privacy-safe event taxonomy, performance baselines, Search Console boundaries, and public aggregate reporting.",
    kind: "learn",
    keywords: [
      "analytics",
      "measurement",
      "funnel",
      "lighthouse",
      "search console",
      "web vitals",
      "privacy",
    ],
  },
  {
    href: "/transparency",
    label: "Transparency report",
    summary:
      "Quarterly aggregate-only counts for review outcomes, disclosure grants, safety reports, appeals, and operator timing.",
    kind: "learn",
    keywords: [
      "transparency",
      "report",
      "review outcomes",
      "appeals",
      "operator sla",
      "disclosure grants",
      "safety reports",
      "trust metrics",
    ],
  },
  {
    href: "/accessibility",
    label: "Accessibility statement",
    summary: "WCAG-oriented QA scope, keyboard and screen-reader checks, known limitations, and access-barrier support.",
    kind: "learn",
    keywords: [
      "accessibility",
      "wcag",
      "keyboard",
      "screen reader",
      "screen-reader",
      "assistive technology",
      "focus order",
      "access issue",
    ],
  },
  {
    href: "/privacy",
    label: "Privacy practices",
    summary: "Public/private fields, cookies, analytics redaction, processors, retention, and data request routes.",
    kind: "learn",
    keywords: [
      "privacy",
      "cookies",
      "analytics",
      "processors",
      "retention",
      "deletion",
      "export",
      "data request",
      "source connections",
    ],
  },
  {
    href: "/reasoning-center",
    label: "Reasoning Center",
    summary: "Forum-style essays, quick takes, questions, and reviewer notes for moral trade design.",
    kind: "learn",
    keywords: [
      "forum",
      "reasoning",
      "essay",
      "quick takes",
      "questions",
      "debate",
      "governance",
      "review notes",
    ],
  },
  {
    href: "/worked-examples",
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
    href: "/pilot-updates",
    label: "Pilot updates",
    summary: "Read public pilot logs, governance updates, transparency notes, and case-study plans.",
    kind: "learn",
    keywords: ["updates", "news", "archive", "transparency", "case study", "changelog", "pilot log"],
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
    href: "/team-and-governance",
    label: "Team and governance",
    summary: "Review operator routes, reviewer responsibilities, governance gaps, and publication commitments.",
    kind: "learn",
    keywords: ["team", "governance", "operators", "advisors", "reviewers", "conflicts", "accountability"],
  },
  {
    href: "/onboarding",
    label: "Cohort onboarding",
    summary: "Save your role, cause areas, attribution, and first action after signup.",
    kind: "account",
    keywords: ["onboarding", "role", "cause", "first action", "activation", "wizard"],
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
    summary: "Choose a cause, complete payment on Every.org, and optionally record the gift afterward.",
    kind: "fund",
    keywords: ["donate", "donation", "every.org", "gift", "route", "record gift", "reconciliation"],
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
