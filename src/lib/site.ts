export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Start",
      href: "/",
    },
    {
      label: "Understand",
      summary: "Plain-English entry points before the proposal registry.",
      items: [
        {
          href: "/how-it-works",
          label: "How it works",
          description: "One-screen guide to the first pilot action.",
        },
        {
          href: "/moral-trade",
          label: "What is moral trade?",
          description: "Primer, examples, limits, and hard trust problems.",
        },
        {
          href: "/sources",
          label: "Sources",
          description: "Conceptual references and internal research links.",
        },
      ],
    },
    {
      label: "Explore",
      summary: "Examples, public goods, and private discovery surfaces.",
      items: [
        {
          href: "/offers?view=examples",
          label: "Worked examples",
          description: "Inspect and clone examples before publishing live proposals.",
        },
        {
          href: "/mpgf",
          label: "Public Goods",
          description: "Threshold commitments and external-payment evidence.",
        },
        {
          href: "/donate",
          label: "Donation routes",
          description: "Verified Every.org routes with manual logging.",
        },
        {
          href: "/wish-registry",
          label: "Wish registry",
          description: "Broad previews before consent-gated matching.",
        },
      ],
    },
    {
      label: "Join",
      summary: "Current pilot entry points for serious early users.",
      items: [
        {
          href: "/cohort",
          label: "Founding cohort",
          description: "Join a small cohort and start with one low-risk action.",
        },
        {
          href: "/updates",
          label: "Pilot updates",
          description: "Subscribe for cohort, governance, and public-goods updates.",
        },
        {
          href: isAuthenticated ? "/dashboard" : "/signup",
          label: isAuthenticated ? "Dashboard" : "Create account",
          description: isAuthenticated
            ? "Return to your private workspace."
            : "Create an account and continue to onboarding.",
        },
      ],
    },
    {
      label: "Trust",
      summary: "Safety, review, governance, and operator routes.",
      items: [
        {
          href: "/trust",
          label: "What you can rely on",
          description: "Guarantees, non-guarantees, and review states.",
        },
        {
          href: "/safety",
          label: "Safety policy",
          description: "Rules against threats, coercion, harassment, and fraud.",
        },
        {
          href: "/validation",
          label: "Validation",
          description: "Evidence states, reviewer roles, challenges, and appeals.",
        },
        {
          href: "/research",
          label: "Research",
          description: "What the pilot is testing and what would make it unsafe.",
        },
        {
          href: "/about",
          label: "About",
          description: "Pilot stewardship, operator commitments, and contact paths.",
        },
        {
          href: "/contact",
          label: "Contact",
          description: "Reach operators for safety, review, or partner inquiries.",
        },
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
    primaryAction: isAuthenticated ? undefined : { href: "/cohort", label: "Join pilot" },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Start",
    links: [
      { href: "/", label: "Home" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/cohort", label: "Founding cohort" },
      { href: "/status", label: "Pilot status" },
      { href: "/updates", label: "Pilot updates" },
      { href: "/onboarding", label: "Post-signup wizard" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Moral Trade",
    links: [
      { href: "/moral-trade", label: "What is moral trade?" },
      { href: "/sources", label: "Sources" },
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
      { href: "/about", label: "About" },
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/contact", label: "Contact" },
      { href: "/updates", label: "Pilot updates" },
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
