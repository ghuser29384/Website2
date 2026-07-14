export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/worked-examples", label: "Examples" },
    { href: "/offers", label: "Explore" },
    { href: "/moral-goods-group-buying", label: "Public goods" },
    { href: "/research", label: "Research" },
  ];

  if (isAuthenticated) {
    links.push({ href: "/dashboard", label: "Workspace" });
  }

  return links;
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated ? undefined : { href: "/login", label: "Sign in" },
    primaryAction: isAuthenticated
      ? {
          href: "/offers/new",
          label: "Create trade",
        }
      : {
          href: "/signup?returnTo=/onboarding",
          label: "Join network",
        },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Use Moral Trade",
    links: [
      { href: "/offers", label: "Explore trades" },
      { href: "/worked-examples", label: "Worked examples" },
      { href: "/offers/new", label: "Create a trade" },
      { href: "/background-networking", label: "Private matching" },
      { href: "/moral-goods-group-buying", label: "Moral public goods" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/trust", label: "What you can rely on" },
      { href: "/credibility", label: "Contextual credibility" },
      { href: "/status", label: "Service status" },
      { href: "/validation", label: "Validation" },
      { href: "/safety", label: "Safety" },
      { href: "/transparency", label: "Transparency" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/what-is-moral-trade", label: "What is Moral Trade?" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/research", label: "Research and governance" },
      { href: "/sources", label: "Sources" },
      { href: "/moral-trade/technical-spec", label: "Technical specification" },
    ],
  },
  {
    title: "Organization",
    links: [
      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/cohort", label: "Join the network" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;
