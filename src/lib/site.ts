export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Understand",
      summary: "Start with the idea, source, and safest first route.",
      items: [
        { href: "/start", label: "Choose your path", description: "Route by intent: learn, test an example, donate, or join/build." },
        { href: "/moral-trade", label: "What is Moral Trade?", description: "A plain-language primer for new visitors." },
        { href: "/how-it-works", label: "How it works", description: "A simple walkthrough from example to review." },
        { href: "/sources", label: "Sources", description: "Primary references and product-boundary notes." },
        { href: "/faq", label: "FAQ", description: "Common questions and operating limits." },
      ],
    },
    {
      label: "Explore",
      summary: "Inspect what is live enough to read, clone, or donate through.",
      items: [
        { href: "/projects", label: "Projects", description: "What is live, illustrative, or upcoming." },
        { href: "/offers?view=examples", label: "Worked examples", description: "Seeded structures, not live offers." },
        { href: "/offers", label: "All offers", description: "Live offers and worked examples." },
        { href: "/pledge-swaps", label: "Pledge swaps", description: "Exchange bounded commitments." },
        { href: "/donation-offsets", label: "Donation offsets", description: "Redirect matched opposed donations." },
        { href: "/donate", label: "Donate through a route", description: "Use a vetted external donation handoff." },
      ],
    },
    {
      label: "Join",
      summary: "Move from examples into one supported pilot action.",
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
          label: "Create donation offset",
          description: "Set baseline, match, destination, surplus, and evidence rules.",
        },
        {
          href: isAuthenticated ? "/dashboard#wish-profile" : "/signup?returnTo=/dashboard%23wish-profile",
          label: "Create wish profile",
          description: "Describe broad wishes before mutual disclosure.",
        },
        { href: "/cohort", label: "Founding cohort", description: "Invite one serious counterparty and start small." },
        { href: "/background-networking", label: "Private matching", description: "Consent-gated counterparty discovery." },
        { href: isAuthenticated ? "/dashboard" : "/signup", label: isAuthenticated ? "Open dashboard" : "Create account", description: "Use member workflows after the public primer." },
      ],
    },
    {
      label: "Trust",
      summary: "Check status, review rules, safety boundaries, and recourse.",
      items: [
        { href: "/about", label: "About", description: "What exists today, what does not, and what comes next." },
        { href: "/trust", label: "What you can rely on", description: "Prototype guarantees, review states, and non-guarantees." },
        { href: "/status", label: "Pilot status", description: "What is real, reviewed, or still prototype-stage." },
        { href: "/validation", label: "Validation", description: "Evidence states, challenge windows, and review scopes." },
        { href: "/safety", label: "Safety", description: "Coercion, fraud, and pressure boundaries." },
        { href: "/anti-threat-baseline", label: "Anti-threat rules", description: "Baseline integrity and externality checks." },
        { href: "/accessibility", label: "Accessibility", description: "WCAG-oriented QA scope, limitations, and support route." },
        { href: "/measurement", label: "Measurement", description: "Privacy-safe event taxonomy and performance baselines." },
        { href: "/team", label: "Team and governance", description: "Operator routes, reviewer roles, and public gaps." },
        { href: "/updates", label: "Pilot updates", description: "Public logs, governance updates, and case-study notes." },
        { href: "/contact", label: "Contact", description: "Reach the pilot operators or report a support issue." },
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
      { href: "/start", label: "Choose your path" },
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
      { href: "/accessibility", label: "Accessibility" },
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
      { href: "/accessibility", label: "Accessibility" },
      { href: "/safety", label: "Safety policy" },
      { href: "/mpgf/contribute", label: "Evidence review" },
    ],
  },
] as const;
