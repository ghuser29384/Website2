export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Start",
      href: "/",
    },
    {
      label: "What is Moral Trade?",
      href: "/moral-trade",
    },
    {
      label: "Examples",
      href: "/offers?view=examples",
    },
    {
      label: "Public Goods",
      href: "/mpgf",
    },
    {
      label: "Safety & Review",
      href: "/safety",
    },
    {
      label: "Research",
      href: "/research",
    },
    {
      label: "Cohort",
      href: "/cohort",
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
    title: "Start",
    links: [
      { href: "/", label: "Home" },
      { href: "/cohort", label: "Founding cohort" },
      { href: "/status", label: "Pilot status" },
      { href: "/onboarding", label: "Post-signup wizard" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Moral Trade",
    links: [
      { href: "/moral-trade", label: "What is moral trade?" },
      { href: "/offers?view=examples", label: "Worked examples" },
      { href: "/pledge-swaps", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/paid-action-offers", label: "Deferred paid offers" },
      { href: "/background-networking", label: "Private discovery" },
    ],
  },
  {
    title: "Public Goods",
    links: [
      { href: "/mpgf", label: "Public Goods Fund" },
      { href: "/mpgf/contribute", label: "Evidence review" },
      { href: "/mpgf/pools", label: "Candidate pools" },
      { href: "/mpgf/technical-spec", label: "Technical notes" },
      { href: "/priority-correction-fund", label: "Allocation notes" },
    ],
  },
  {
    title: "Safety & Review",
    links: [
      { href: "/safety", label: "Safety policy" },
      { href: "/anti-threat-baseline", label: "Anti-threat rules" },
      { href: "/trust", label: "What you can rely on" },
      { href: "/validation", label: "Validation" },
      { href: "/reasoning-standards", label: "Evidence standards" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research", label: "Research and governance" },
      { href: "/methodology", label: "Methodology" },
      { href: "/methodology#sources", label: "Sources" },
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/contact", label: "Contact" },
      { href: "/status", label: "Pilot updates" },
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
