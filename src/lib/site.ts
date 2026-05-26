export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Browse",
      href: "/offers",
    },
    {
      label: "Examples",
      href: "/offers?view=examples",
    },
    {
      label: "Cohort",
      href: "/cohort",
    },
    {
      label: "Learn",
      href: "/methodology",
    },
  ];

  return links;
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/login", label: "Sign in" },
    primaryAction: undefined,
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
