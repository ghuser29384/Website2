export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Marketplace",
      summary: "Browse, compare, or create public trade proposals.",
      items: [
        { href: "/offers", label: "All trades", description: "Search public offers and worked examples." },
        { href: "/offers?mode=pledge", label: "Pledge swaps", description: "Exchange bounded commitments." },
        { href: "/donation-offsets", label: "Donation offsets", description: "Redirect matched opposed donations." },
        { href: "/mpgf", label: "Moral Public Goods Fund", description: "Coordinate shared consensus goods." },
        {
          href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new",
          label: "Create trade",
          description: "Draft terms with validation and review gates.",
        },
      ],
    },
    {
      label: "Learn",
      summary: "Understand standards before proposing or accepting terms.",
      items: [
        { href: "/reasoning-standards", label: "Tutorials", description: "Field-by-field reasoning guidance." },
        { href: "/methodology", label: "Methodology", description: "Moral trade sources and safeguards." },
        { href: "/safety", label: "Safety", description: "Coercion, fraud, and pressure boundaries." },
        {
          href: "/background-networking",
          label: "Background networking",
          description: "Consent-preserving discovery, not scraping.",
        },
        { href: "/#faq", label: "FAQ", description: "Common questions and limits." },
      ],
    },
    {
      label: "Community",
      summary: "Review public participants and coordination tools.",
      items: [
        { href: "/people", label: "Profiles", description: "Privacy-limited public profiles." },
        { href: "/wish-registry", label: "Wish registry", description: "Search broad wishes before consent gates." },
        { href: "/priority-correction-fund", label: "Priority fund", description: "Inspect the correction mechanism." },
        { href: "/mpgf/pools", label: "MPGF pools", description: "Review pooled public-good proposals." },
        {
          href: isAuthenticated ? "/dashboard" : "/signup",
          label: isAuthenticated ? "Dashboard" : "Create account",
          description: isAuthenticated ? "Manage trades, favourites, and exports." : "Save offers and manage privacy.",
        },
      ],
    },
    { href: "/#about", label: "About" },
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
      { href: "/offers", label: "All trades" },
      { href: "/offers?mode=pledge", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/offers/new", label: "Create trade" },
      { href: "/donate", label: "Donation routes" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/reasoning-standards", label: "Reasoning standards" },
      { href: "/safety", label: "Safety" },
      { href: "/#faq", label: "FAQ" },
      { href: "mailto:support@moraltrade.org", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/background-networking", label: "Background networking" },
      { href: "/priority-correction-fund", label: "Priority fund" },
      { href: "/mpgf", label: "MPGF" },
      { href: "/mpgf/contribute", label: "Manual evidence" },
      { href: "/mpgf/pools", label: "MPGF pools" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;
