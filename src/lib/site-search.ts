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
    summary: "Browse pledge swaps, donation offsets, and payment-mediated offers.",
    kind: "trade",
    keywords: ["offer", "trade", "marketplace", "swap", "payment", "offset"],
  },
  {
    href: "/offers?mode=pledge",
    label: "Pledge swaps",
    summary: "Find reciprocal commitments such as donations, volunteering, or habit changes.",
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
    href: "/mpgf",
    label: "Public Goods Fund",
    summary: "Review external-payment evidence submission, candidate pools, and allocation workflow.",
    kind: "fund",
    keywords: ["mpgf", "fund", "public goods", "evidence", "contribution", "pool"],
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
    href: "/background-networking",
    label: "Background networking",
    summary: "Understand staged discovery, consent gates, and non-autonomous matching.",
    kind: "learn",
    keywords: ["background", "networking", "consent", "privacy", "staged"],
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
