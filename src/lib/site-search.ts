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
    href: "/feed",
    label: "Personalized opportunity feed",
    summary: "See current trade opportunities ranked by your priorities, the actions you prefer, and your feedback.",
    kind: "trade",
    keywords: ["feed", "for you", "home", "personalized", "recommendations", "priorities", "actions", "opportunities"],
  },
  {
    href: "/offers",
    label: "Explore the marketplace",
    summary: "Browse real offers, examples, templates, and funding pools, with each type clearly labeled.",
    kind: "trade",
    keywords: ["explore", "offers", "trade", "marketplace", "listing", "registry", "proposal", "swap", "offset", "pool"],
  },
  {
    href: "/evidence",
    label: "Public evidence",
    summary: "See public trade evidence, its review status, hidden details, and timeline.",
    kind: "learn",
    keywords: ["evidence", "proof", "public", "redaction", "timeline", "verification", "receipt", "completion"],
  },
  {
    href: "/create",
    label: "Create",
    summary: "Choose a trade, donation redirect, or funding pool, then say what would happen without the deal.",
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
    keywords: ["pool", "threshold", "conditional", "pledge", "maximum cost", "public good", "deadline", "assurance"],
  },
  {
    href: "/status",
    label: "Service status",
    summary: "See which payments, evidence checks, reviews, and marketplace features work now.",
    kind: "learn",
    keywords: ["status", "roadmap", "payment", "settlement", "live offers", "operational", "liquidity", "beta"],
  },
  {
    href: "/safety",
    label: "Safety and anti-threat rules",
    summary: "See how Moral Trade handles threats, pressure, fraud, identity checks, harm to others, and who may participate.",
    kind: "learn",
    keywords: ["safety", "threat", "coercion", "fraud", "externality", "eligibility", "block", "duress"],
  },
  {
    href: "/trade-controls",
    label: "Trade controls",
    summary: "See what would happen without a trade, how multi-person trades work, how disputes are decided, what happens when a pool misses its goal, how evidence is checked, and how other people are protected.",
    kind: "learn",
    keywords: [
      "trade controls",
      "counterfactual integrity",
      "additionality",
      "multi-party trade circles",
      "clearing",
      "resolution center",
      "disputes",
      "pool governance",
      "threshold failure",
      "verifier governance",
      "private values",
      "private constraints",
      "integration evidence hub",
      "affected parties",
      "abuse safeguards",
      "organizational authority",
    ],
  },
  {
    href: "/credibility",
    label: "Reliability by trade type",
    summary: "See how reliable someone has been in similar trades without ranking their values.",
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
    summary: "Compare saved offers, maximum amounts, timing, conditions, and next steps before agreeing.",
    kind: "account",
    keywords: ["planner", "saved", "offers", "exposure", "compare", "cart", "bookmark"],
  },
  {
    href: "/commitments",
    label: "Track commitments",
    summary: "Track agreements, evidence, payments, challenges, completion, cancellations, and reversals.",
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
    summary: "Set up paid actions with clear limits, payment evidence, and a clear statement of whether Moral Trade holds any money.",
    kind: "trade",
    keywords: ["paid", "payment", "action", "verification", "escrow", "external", "compensation"],
  },
  {
    href: "/donation-offsets",
    label: "How donation offsets work",
    summary: "See the starting donation, match, review, payment, and compensation rules for donation offsets.",
    kind: "learn",
    keywords: ["donation", "offset", "advanced", "baseline", "match", "moderation", "payment", "refund", "transfer"],
  },
  {
    href: "/moral-goods-group-buying",
    label: "Advanced pool and group-buying tools",
    summary: "See reviewed funding rounds, grouped projects, recurring budgets, and payment records.",
    kind: "fund",
    keywords: ["group buying", "moral goods", "round", "lot", "basket", "standing budget", "settlement", "pool"],
  },
  {
    href: "/mpgf",
    label: "Common Ground Budget",
    summary: "Set a clear public-good budget and see the final rules for contributions and where money goes.",
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
    summary: "See what is public or private, when your permission is needed, how long data is kept, who handles it, and how to control it.",
    kind: "learn",
    keywords: ["privacy", "consent", "cookies", "analytics", "processors", "retention", "deletion", "export"],
  },
  {
    href: "/walkthrough",
    label: "Interactive Moral Trade walkthrough",
    summary: "Learn moral trade by making a small deal, redirecting opposed donations, crossing a public-good threshold, and conditionally funding a higher-impact job's salary gap.",
    kind: "learn",
    keywords: ["walkthrough", "interactive", "learn", "third option", "find the mix", "crowd", "redirect", "moral trade", "salary gap", "career funding", "higher-impact job"],
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
    summary: "Read the ideas, evidence, and open questions behind the marketplace.",
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
