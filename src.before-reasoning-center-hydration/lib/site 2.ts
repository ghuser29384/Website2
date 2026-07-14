export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Browse",
      summary: "Compare public proposals and worked examples.",
      items: [
        { href: "/offers", label: "All offers", description: "Live offers and worked examples." },
        { href: "/pledge-swaps", label: "Pledge swaps", description: "Exchange bounded commitments." },
        { href: "/donation-offsets", label: "Donation offsets", description: "Redirect matched opposed donations." },
        { href: "/mpgf", label: "Public Goods Fund", description: "Pool support for shared moral goods." },
        { href: "/offers?view=examples", label: "Worked examples", description: "Seeded structures, not live offers." },
      ],
    },
    {
      label: "Create",
      summary: "Start with structured terms and review gates.",
      items: [
        {
          href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new",
          label: "Create bounded trade",
          description: "Draft terms with baseline, exit, evidence, and review gates.",
        },
        {
          href: isAuthenticated
            ? "/offers/new?mode=offset"
            : "/signup?returnTo=/offers/new%3Fmode%3Doffset",
          label: "Create verified offset",
          description: "Set baseline, match, destination, surplus, and evidence rules.",
        },
        {
          href: isAuthenticated ? "/dashboard#wish-profile" : "/signup?returnTo=/dashboard%23wish-profile",
          label: "Create wish profile",
          description: "Describe broad wishes before mutual disclosure.",
        },
      ],
    },
    {
      label: "Learn",
      summary: "Understand standards before proposing or accepting terms.",
      items: [
        { href: "/#how-it-works", label: "How it works", description: "Three steps from format to evidence review." },
        { href: "/validation", label: "Validation", description: "Evidence states, challenge windows, and review scopes." },
        { href: "/safety", label: "Safety", description: "Coercion, fraud, and pressure boundaries." },
        { href: "/methodology", label: "Methodology", description: "Moral trade sources and safeguards." },
        { href: "/paid-action-offers", label: "Deferred paid offers", description: "Why paid actions are review-only for now." },
        { href: "/faq", label: "FAQ", description: "Common questions and operating limits." },
      ],
    },
    {
      label: "Community",
      summary: "Browse opt-in public participants and broad wishes.",
      items: [
        { href: "/people", label: "People", description: "Privacy-limited public profiles." },
        { href: "/wish-registry", label: "Wish registry", description: "Search broad wishes before consent gates." },
        { href: "/background-networking", label: "Private matching", description: "Consent-gated counterparty discovery." },
      ],
    },
  ];

  return links;
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/login", label: "Sign in" },
    primaryAction: {
      href: isAuthenticated ? "/offers/new?mode=offset" : "/signup?returnTo=/offers/new%3Fmode%3Doffset",
      label: "Create verified offset",
    },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/offers", label: "Browse offers" },
      { href: "/pledge-swaps", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/mpgf", label: "Public Goods Fund" },
      { href: "/background-networking", label: "Private matching" },
      { href: "/offers?view=examples", label: "Worked examples" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/safety", label: "Safety" },
      { href: "/validation", label: "Validation" },
      { href: "/faq", label: "FAQ" },
      { href: "/reasoning-standards", label: "Evidence standards" },
      { href: "/paid-action-offers", label: "Deferred paid offers" },
      { href: "/methodology#sources", label: "Sources" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "mailto:support@moraltrade.org", label: "Contact" },
      { href: "mailto:support@moraltrade.org?subject=Pilot%20updates", label: "Pilot updates" },
      { href: "/background-networking", label: "Private wish matching" },
      { href: "/priority-correction-fund", label: "Allocation notes" },
      { href: "/mpgf/pools", label: "Candidate pools" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/safety", label: "Safety policy" },
      { href: "/mpgf/contribute", label: "Evidence review" },
    ],
  },
] as const;
