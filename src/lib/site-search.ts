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
    label: "Explore the marketplace",
    summary: "Browse live participant proposals, worked examples, reviewed templates, and conditional pools without mixing their states.",
    kind: "trade",
    keywords: ["explore", "offers", "trade", "marketplace", "listing", "registry", "proposal", "swap", "offset", "pool"],
  },
  {
    href: "/create",
    label: "Create",
    summary: "Choose Trade, Offset, Pool, or the later Back lane, then make the no-deal default explicit before drafting terms.",
    kind: "trade",
    keywords: ["create", "draft", "new offer", "trade", "offset", "pool", "back", "proposal", "terms", "receipt"],
  },
  {
    href: "/offsets",
    label: "Donation offsets",
    summary: "Match opposed planned donations and redirect the matched amount to a named destination both donors prefer.",
    kind: "trade",
    keywords: ["donation", "offset", "matched", "opposed", "compromise", "redirect", "baseline", "settlement"],
  },
  {
    href: "/pools",
    label: "Conditional pools",
    summary: "Pledge up to a maximum and fund only when the published threshold and review conditions pass.",
    kind: "fund",
    keywords: ["pool", "threshold", "conditional", "pledge", "maximum exposure", "public good", "deadline", "assurance"],
  },
  {
    href: "/trust",
    label: "What you can rely on",
    summary: "Inspect current guarantees, non-guarantees, Deal Receipt fields, review states, and recourse routes.",
    kind: "learn",
    keywords: ["trust", "deal receipt", "guarantees", "non-guarantees", "review states", "recourse", "rely"],
  },
  {
    href: "/status",
    label: "Service status",
    summary: "See which payment, settlement, evidence, review, and marketplace capabilities are operational now.",
    kind: "learn",
    keywords: ["status", "roadmap", "payment", "settlement", "live offers", "operational", "liquidity", "beta"],
  },
  {
    href: "/safety",
    label: "Safety and anti-threat rules",
    summary: "Review threat, coercion, fraud, identity, externality, and eligibility controls.",
    kind: "learn",
    keywords: ["safety", "threat", "coercion", "fraud", "externality", "eligibility", "block", "duress"],
  },
  {
    href: "/credibility",
    label: "Contextual credibility",
    summary: "Review evidence-weighted estimates for a specific transaction role and category without ranking a person's values.",
    kind: "learn",
    keywords: ["credibility", "reliability", "evidence", "completion", "safeguards", "probability", "uncertainty"],
  },
  {
    href: "/worked-examples",
    label: "Worked examples",
    summary: "Inspect complete example terms without treating examples as live inventory or liquidity.",
    kind: "trade",
    keywords: ["example", "worked", "clone", "template", "victoria", "paul", "offset", "trade"],
  },
  {
    href: "/offers?view=templates",
    label: "Reviewed templates",
    summary: "Start from a reviewed structure, then replace every illustrative baseline and term with your own.",
    kind: "trade",
    keywords: ["template", "reviewed", "draft", "prefill", "clone", "adapt", "terms"],
  },
  {
    href: "/background-networking",
    label: "Private matching",
    summary: "Request staged, consent-gated matching when the proposal should not be publicly searchable.",
    kind: "community",
    keywords: ["private", "matching", "wish", "counterparty", "consent", "privacy", "concierge", "back"],
  },
  {
    href: "/people",
    label: "Participant directory",
    summary: "Browse public profiles and context-specific transaction records without a moral or popularity ranking.",
    kind: "community",
    keywords: ["people", "participants", "directory", "profile", "credibility", "offers", "counterparty"],
  },
  {
    href: "/saved-offers",
    label: "Planner",
    summary: "Compare saved proposals, maximum exposure, timing, conditions, and next actions before committing.",
    kind: "account",
    keywords: ["planner", "saved", "offers", "exposure", "compare", "cart", "bookmark"],
  },
  {
    href: "/commitments",
    label: "Track commitments",
    summary: "Track agreement, evidence, payment, settlement, challenge, completion, cancellation, and reversal states.",
    kind: "account",
    keywords: ["track", "commitments", "agreement", "evidence", "payment", "settlement", "challenge", "completed"],
  },
  {
    href: "/messages",
    label: "Messages",
    summary: "Continue participant conversations and review the terms attached to a marketplace record.",
    kind: "account",
    keywords: ["messages", "conversation", "counterparty", "contact", "discussion", "inbox"],
  },
  {
    href: "/dashboard",
    label: "My marketplace activity",
    summary: "Manage proposals, interests, agreements, profile data, and alerts.",
    kind: "account",
    keywords: ["dashboard", "account", "my trades", "activity", "interests", "agreements", "alerts"],
  },
  {
    href: "/pledge-swaps",
    label: "Pledge swaps",
    summary: "Browse reciprocal commitments such as donations, volunteering, or bounded habit changes.",
    kind: "trade",
    keywords: ["pledge", "swap", "reciprocal", "commitment", "vegetarian", "volunteer", "habit"],
  },
  {
    href: "/paid-action-offers",
    label: "Paid action offers",
    summary: "Structure paid actions with bounded terms, external-payment evidence, and explicit custody limits.",
    kind: "trade",
    keywords: ["paid", "payment", "action", "verification", "escrow", "external", "compensation"],
  },
  {
    href: "/donation-offsets",
    label: "Donation-offset mechanism details",
    summary: "Inspect baseline evidence, matching, moderation, conditional payment, and compensation rules for donation offsets.",
    kind: "learn",
    keywords: ["donation", "offset", "advanced", "baseline", "match", "moderation", "payment", "refund", "transfer"],
  },
  {
    href: "/moral-goods-group-buying",
    label: "Advanced pool and group-buying tools",
    summary: "Open reviewed rounds, lots, baskets, standing budgets, and detailed settlement records.",
    kind: "fund",
    keywords: ["group buying", "moral goods", "round", "lot", "basket", "standing budget", "settlement", "pool"],
  },
  {
    href: "/mpgf",
    label: "Common Ground Budget",
    summary: "Build a bounded public-good budget and inspect frozen contribution and allocation rules.",
    kind: "fund",
    keywords: ["common ground budget", "public goods fund", "moral public goods", "mpgf", "allocation", "contribution"],
  },
  {
    href: "/mpgf/pools",
    label: "Candidate public-good pools",
    summary: "Inspect public reasoning, destination types, evidence requirements, and review states for candidate pools.",
    kind: "fund",
    keywords: ["candidate", "pool", "public goods", "recipient", "evidence", "review", "fund"],
  },
  {
    href: "/wish-registry",
    label: "Wish registry",
    summary: "Search broad wish previews without revealing exact private wishes before consent.",
    kind: "community",
    keywords: ["wish", "registry", "background networking", "match", "preview", "privacy"],
  },
  {
    href: "/validation",
    label: "Validation and evidence",
    summary: "Review evidence scopes, challenge windows, reviewer states, and the limits of each badge or claim.",
    kind: "learn",
    keywords: ["validation", "evidence", "review", "challenge", "badge", "claim", "appeal"],
  },
  {
    href: "/transparency",
    label: "Transparency",
    summary: "Review aggregate outcomes, safety reports, appeals, disclosure grants, and operator timing.",
    kind: "learn",
    keywords: ["transparency", "report", "review outcomes", "appeals", "operator", "safety reports", "trust metrics"],
  },
  {
    href: "/privacy",
    label: "Privacy practices",
    summary: "Review public and private fields, consent gates, retention, processors, and data-control routes.",
    kind: "learn",
    keywords: ["privacy", "consent", "cookies", "analytics", "processors", "retention", "deletion", "export"],
  },
  {
    href: "/what-is-moral-trade",
    label: "What is Moral Trade?",
    summary: "A concise explanation of how different priorities can create voluntary mutual gains.",
    kind: "learn",
    keywords: ["primer", "moral trade", "toby ord", "voluntary", "disagreement", "default", "pareto"],
  },
  {
    href: "/moral-trade/technical-spec",
    label: "Technical specification",
    summary: "Inspect validators, factor codes, evidence schemas, state machines, and protocol boundaries.",
    kind: "learn",
    keywords: ["technical", "spec", "validator", "protocol", "schema", "factor codes", "state machine"],
  },
  {
    href: "/research",
    label: "Research layer",
    summary: "Read the theory and uncertainty that support the marketplace and coordination mechanisms.",
    kind: "learn",
    keywords: ["research", "theory", "moral trade", "moral public goods", "uncertainty", "papers", "governance"],
  },
  {
    href: "/sources",
    label: "Sources",
    summary: "Primary references and source-specific limits behind product claims.",
    kind: "learn",
    keywords: ["sources", "references", "ord", "forethought", "moral public goods", "methodology"],
  },
  {
    href: "/team-and-governance",
    label: "Team and governance",
    summary: "Review operator responsibilities, conflicts, governance gaps, and publication commitments.",
    kind: "learn",
    keywords: ["team", "governance", "operators", "reviewers", "conflicts", "accountability"],
  },
  {
    href: "/contact",
    label: "Contact Moral Trade",
    summary: "Reach operators about safety, disputes, participant support, partnerships, or accessibility.",
    kind: "learn",
    keywords: ["contact", "support", "safety concern", "operator", "partnership", "recourse", "accessibility"],
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    summary: "Save your role, cause areas, attribution, privacy choices, and first marketplace action.",
    kind: "account",
    keywords: ["onboarding", "role", "cause", "first action", "activation", "wizard", "privacy"],
  },
  {
    href: "/cohort",
    label: "Join the network",
    summary: "Join a participant cohort and begin with one bounded marketplace or coordination action.",
    kind: "community",
    keywords: ["cohort", "network", "signup", "invite", "referral", "participant", "activation"],
  },
  ...PARTNER_COHORTS.map((partner) => ({
    href: `/cohort/${partner.slug}`,
    label: partner.name,
    summary: `Partner landing page for ${partner.audience}.`,
    kind: "community" as const,
    keywords: ["partner", "cohort", partner.primaryCause, partner.slug, partner.useCase],
  })),
  {
    href: "/offers?search=Global%20Health",
    label: "Global health",
    summary: "Search proposals connected to global health, poverty, and public health.",
    kind: "category",
    keywords: ["global health", "poverty", "public health", "dalys", "malaria"],
  },
  {
    href: "/offers?search=Animal%20Welfare",
    label: "Animal welfare",
    summary: "Search proposals connected to animals, vegetarianism, and welfare.",
    kind: "category",
    keywords: ["animal", "welfare", "vegetarian", "factory farming"],
  },
  {
    href: "/offers?search=Climate",
    label: "Climate action",
    summary: "Search proposals connected to climate, emissions, and resilience.",
    kind: "category",
    keywords: ["climate", "emissions", "carbon", "resilience"],
  },
  {
    href: "/offers?search=Existential%20risk",
    label: "Existential risk",
    summary: "Search proposals connected to AI safety, biorisk, and long-run futures.",
    kind: "category",
    keywords: ["existential", "x-risk", "ai", "biorisk", "future"],
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
