export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Browse",
      summary: "See current projects, public offers, and worked examples.",
      items: [
        { href: "/projects", label: "Projects", description: "What is live, illustrative, or upcoming." },
        { href: "/offers", label: "All offers", description: "Live offers and worked examples." },
        { href: "/offers?view=examples", label: "Worked examples", description: "Seeded structures, not live offers." },
        { href: "/pledge-swaps", label: "Pledge swaps", description: "Exchange bounded commitments." },
        { href: "/donation-offsets", label: "Donation offsets", description: "Redirect matched opposed donations." },
        { href: "/mpgf", label: "Public Goods Fund", description: "Pool support for shared moral goods." },
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
          label: "Trade",
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
        { href: "/about", label: "About", description: "What exists today, what does not, and what comes next." },
        { href: "/moral-trade", label: "What is Moral Trade?", description: "A plain-language primer for new visitors." },
        { href: "/how-it-works", label: "How it works", description: "A simple walkthrough from example to review." },
        { href: "/validation", label: "Validation", description: "Evidence states, challenge windows, and review scopes." },
        { href: "/moral-trade/technical-spec", label: "Moral Trade spec", description: "Core protocol validators and public health JSON." },
        { href: "/safety", label: "Safety", description: "Coercion, fraud, and pressure boundaries." },
        { href: "/anti-threat-baseline", label: "Anti-threat rules", description: "Baseline integrity and externality checks." },
        { href: "/research", label: "Research", description: "Pilot questions, governance, and transparency." },
        { href: "/reasoning-center", label: "Reasoning Center", description: "Inspect the reasoning workspace." },
        { href: "/methodology", label: "Methodology", description: "Moral trade sources and safeguards." },
        { href: "/measurement", label: "Measurement", description: "Privacy-safe event taxonomy and performance baselines." },
        { href: "/sources", label: "Sources", description: "Primary references and product-boundary notes." },
        { href: "/paid-action-offers", label: "Deferred paid offers", description: "Why paid actions are review-only for now." },
        { href: "/faq", label: "FAQ", description: "Common questions and operating limits." },
      ],
    },
    {
      label: "Community",
      summary: "Browse opt-in participants, operators, cohorts, and updates.",
      items: [
        { href: "/team", label: "Team and governance", description: "Operator routes, reviewer roles, and public gaps." },
        { href: "/people", label: "People", description: "Privacy-limited public profiles." },
        { href: "/wish-registry", label: "Wish registry", description: "Search broad wishes before consent gates." },
        { href: "/background-networking", label: "Private matching", description: "Consent-gated counterparty discovery." },
        { href: "/cohort", label: "Founding cohort", description: "Invite one serious counterparty and start small." },
        { href: "/updates", label: "Pilot updates", description: "Public logs, governance updates, and case-study notes." },
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
      href: isAuthenticated ? "/offers/new?mode=offset" : "/offers?view=examples",
      label: isAuthenticated ? "Trade" : "See example",
    },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/projects", label: "Projects" },
      { href: "/offers", label: "Browse offers" },
      { href: "/offers?view=examples", label: "Worked examples" },
      { href: "/pledge-swaps", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/donate", label: "Donate through a route" },
      { href: "/mpgf", label: "Public Goods Fund" },
      { href: "/background-networking", label: "Private matching" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/about", label: "About" },
      { href: "/moral-trade", label: "What is moral trade?" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/measurement", label: "Measurement" },
      { href: "/safety", label: "Safety policy" },
      { href: "/anti-threat-baseline", label: "Anti-threat rules" },
      { href: "/validation", label: "Validation" },
      { href: "/moral-trade/technical-spec", label: "Moral Trade technical spec" },
      { href: "/reasoning-standards", label: "Evidence standards" },
      { href: "/faq", label: "FAQ" },
      { href: "/paid-action-offers", label: "Deferred paid offers" },
      { href: "/sources", label: "Sources" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/team", label: "Team and governance" },
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/cohort", label: "Founding cohort" },
      { href: "/updates", label: "Pilot updates" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/status", label: "Pilot status" },
      { href: "/trust", label: "What you can rely on" },
      { href: "/research", label: "Research and governance" },
      { href: "/reasoning-center", label: "Reasoning Center" },
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
