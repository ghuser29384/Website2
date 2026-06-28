export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Trade",
      summary: "Browse, compare, and create bounded moral trade commitments.",
      items: [
        { href: "/start", label: "Choose your path", section: "Start here", description: "Route by intent: learn, test an example, donate, or join/build." },
        { href: "/what-is-moral-trade", label: "What is Moral Trade?", section: "Start here", description: "A plain-language primer for new visitors." },
        { href: "/how-it-works", label: "How it works", section: "Start here", description: "A simple walkthrough from example to review." },
        { href: "/faq", label: "FAQ", section: "Start here", description: "Common questions and operating limits." },
        { href: "/offers", label: "Browse all trades", section: "Trade lanes", description: "Live offers, reviewed templates, and worked examples." },
        { href: "/pledge-swaps", label: "Pledge swaps", section: "Trade lanes", description: "Exchange bounded commitments." },
        { href: "/moral-goods-group-buying", label: "Group buying", section: "Trade lanes", description: "Fund verified moral actions through rounds, lots, baskets, and standing budgets." },
        { href: "/donation-offsets", label: "Donation offsets", section: "Trade lanes", description: "Redirect matched opposed donations." },
        { href: "/worked-examples", label: "Worked examples", section: "Trade lanes", description: "Seeded structures, not live offers." },
        {
          href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new",
          label: "Create bounded trade",
          section: "Participate",
          description: "Draft terms with baseline, exit, evidence, and review gates.",
        },
        {
          href: isAuthenticated
            ? "/offers/new?mode=offset"
            : "/signup?returnTo=/offers/new%3Fmode%3Doffset",
          label: "Create donation offset",
          section: "Participate",
          description: "Set baseline, match, destination, surplus, and evidence rules.",
        },
        {
          href: isAuthenticated ? "/dashboard#wish-profile" : "/signup?returnTo=/dashboard%23wish-profile",
          label: "Create wish profile",
          section: "Participate",
          description: "Describe broad wishes before mutual disclosure.",
        },
        { href: "/background-networking", label: "Private matching", section: "Participate", description: "Consent-gated counterparty discovery." },
        { href: "/cohort", label: "Founding cohort", section: "Participate", description: "Invite one serious counterparty and start small." },
        { href: isAuthenticated ? "/dashboard" : "/signup", label: isAuthenticated ? "Open dashboard" : "Create account", section: "Participate", description: "Use member workflows after the public primer." },
        { href: "/trust", label: "What you can rely on", section: "Reliability", description: "Prototype guarantees, review states, and non-guarantees." },
        { href: "/status", label: "Pilot status", section: "Reliability", description: "What is real, reviewed, or still prototype-stage." },
        { href: "/validation", label: "Validation", section: "Reliability", description: "Evidence states, challenge windows, and review scopes." },
        { href: "/safety", label: "Safety", section: "Reliability", description: "Coercion, fraud, and pressure boundaries." },
      ],
    },
    {
      label: "Moral Public Goods",
      summary: "Fund public-good routes, common budgets, and group-buying pools.",
      items: [
        { href: "/mpgf", label: "moral public goods", section: "Funding routes", description: "Preview the Public Goods Fund path for cross-view moral public goods." },
        { href: "/moral-goods-group-buying", label: "Moral goods group buying", section: "Funding routes", description: "Pool small pledges into verified moral-action rounds, lots, baskets, and standing budgets." },
        { href: "/donate", label: "Donate through a route", section: "Funding routes", description: "Use a vetted external donation handoff." },
        { href: "/priority-correction-fund", label: "Priority Correction Fund", section: "Funding routes", description: "Inspect correction cycles, arbiters, and published reasoning." },
        { href: "/projects", label: "Projects", section: "Funding routes", description: "What is live, illustrative, or upcoming." },
        { href: "/mpgf/about", label: "Public Goods Fund overview", section: "MPGF", description: "Read the public-goods mechanism and participant boundaries." },
        { href: "/mpgf/contribute", label: "Contribute evidence", section: "MPGF", description: "Use reviewed evidence routes for public-goods contributions." },
        { href: "/mpgf/pools", label: "Candidate pools", section: "MPGF", description: "Browse public-goods pools and candidate funding routes." },
        { href: "/mpgf/governance", label: "Governance", section: "MPGF", description: "Review ballots, challenges, and rule changes." },
        { href: "/mpgf/metrics", label: "Metrics", section: "MPGF", description: "Inspect public-goods aggregate metrics." },
        { href: "/sources", label: "Sources", section: "Evidence and governance", description: "Primary references and product-boundary notes." },
        { href: "/measurement", label: "Measurement", section: "Evidence and governance", description: "Privacy-safe event taxonomy and performance baselines." },
        { href: "/transparency", label: "Transparency", section: "Evidence and governance", description: "Aggregate review, disclosure, report, appeal, and operator timing counts." },
        { href: "/anti-threat-rules", label: "Anti-threat rules", section: "Evidence and governance", description: "Baseline integrity and externality checks." },
        { href: "/team-and-governance", label: "Team and governance", section: "Evidence and governance", description: "Operator routes, reviewer roles, and public gaps." },
        { href: "/pilot-updates", label: "Pilot updates", section: "Evidence and governance", description: "Public logs, governance updates, and case-study notes." },
        { href: "/contact", label: "Contact", section: "Evidence and governance", description: "Reach the pilot operators or report a support issue." },
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
      href: isAuthenticated ? "/offers/new?mode=offset" : "/moral-goods-group-buying",
      label: isAuthenticated ? "Create trade" : "Group buying",
    },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Trade",
    links: [
      { href: "/projects", label: "Projects" },
      { href: "/start", label: "Choose your path" },
      { href: "/offers", label: "Browse offers" },
      { href: "/worked-examples", label: "Worked examples" },
      { href: "/pledge-swaps", label: "Pledge swaps" },
      { href: "/moral-goods-group-buying", label: "Group buying" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/background-networking", label: "Private matching" },
    ],
  },
  {
    title: "Moral Public Goods",
    links: [
      { href: "/mpgf", label: "moral public goods" },
      { href: "/moral-goods-group-buying", label: "Moral goods group buying" },
      { href: "/donate", label: "Donate through a route" },
      { href: "/priority-correction-fund", label: "Priority Correction Fund" },
      { href: "/mpgf/about", label: "Public Goods Fund overview" },
      { href: "/mpgf/contribute", label: "Contribute evidence" },
      { href: "/mpgf/pools", label: "Candidate pools" },
      { href: "/mpgf/governance", label: "Governance" },
      { href: "/mpgf/metrics", label: "Metrics" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/about", label: "About" },
      { href: "/what-is-moral-trade", label: "What is moral trade?" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/measurement", label: "Measurement" },
      { href: "/transparency", label: "Transparency report" },
      { href: "/safety", label: "Safety policy" },
      { href: "/anti-threat-rules", label: "Anti-threat rules" },
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
      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/cohort", label: "Founding cohort" },
      { href: "/pilot-updates", label: "Pilot updates" },
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
      { href: "/transparency", label: "Transparency report" },
      { href: "/research", label: "Research and governance" },
      { href: "/reasoning-center", label: "Reasoning Center" },
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
