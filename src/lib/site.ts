export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Browse",
      summary: "Compare public proposals and worked examples.",
      items: [
        { href: "/offers", label: "All offers", description: "Live offers and worked examples." },
        { href: "/offers?mode=pledge", label: "Pledge swaps", description: "Exchange bounded commitments." },
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
          label: "Create trade",
          description: "Draft terms with validation and review gates.",
        },
        {
          href: isAuthenticated
            ? "/offers/new?mode=offset"
            : "/signup?returnTo=/offers/new%3Fmode%3Doffset",
          label: "Create donation offset",
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
        { href: "/safety", label: "Safety", description: "Coercion, fraud, and pressure boundaries." },
        { href: "/methodology", label: "Methodology", description: "Moral trade sources and safeguards." },
        { href: "/faq", label: "FAQ", description: "Common questions and operating limits." },
      ],
    },
    {
      label: "Community",
      summary: "Browse opt-in public participants and broad wishes.",
      items: [
        { href: "/people", label: "People", description: "Privacy-limited public profiles." },
        { href: "/wish-registry", label: "Wish registry", description: "Search broad wishes before consent gates." },
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
      href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new",
      label: "Create trade",
    },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/offers", label: "Browse offers" },
      { href: "/offers?mode=pledge", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/mpgf", label: "Public Goods Fund" },
      { href: "/offers?view=examples", label: "Worked examples" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/safety", label: "Safety" },
      { href: "/faq", label: "FAQ" },
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
    title: "Legal / operations",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "mailto:support@moraltrade.org", label: "Contact" },
      { href: "/mpgf/contribute", label: "Evidence review" },
      { href: "/background-networking", label: "Private wish matching" },
      { href: "/priority-correction-fund", label: "Allocation notes" },
      { href: "/mpgf/pools", label: "Candidate pools" },
    ],
  },
] as const;
