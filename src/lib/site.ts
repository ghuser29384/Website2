export function getPrimaryNavLinks(_isAuthenticated = false) {
  return [
    { href: "/offers?view=live", label: "Explore" },
    { href: "/trades/new", label: "Create" },
    { href: "/messages", label: "Messages" },
    { href: "/commitments", label: "Commitments" },
    { href: "/safety", label: "Safety" },
  ];
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated ? undefined : { href: "/login", label: "Sign in" },
    primaryAction: isAuthenticated
      ? {
          href: "/trades/new",
          label: "Create",
        }
      : {
          href: "/start",
          label: "Get started",
        },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/offers?view=live", label: "Explore trades" },
      { href: "/trades/new", label: "Create a trade" },
      { href: "/messages", label: "Private messages" },
      { href: "/commitments", label: "Track commitments" },
    ],
  },
  {
    title: "Safety & transparency",
    links: [
      { href: "/credibility", label: "Contextual credibility" },
      { href: "/status", label: "Service status" },
      { href: "/safety", label: "Safety and anti-threat rules" },
      { href: "/transparency", label: "Transparency" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/walkthrough", label: "Interactive walkthrough" },
      { href: "/what-is-moral-trade", label: "What is Moral Trade?" },
      { href: "/research", label: "Research" },
      { href: "/moral-trade/technical-spec", label: "Technical specification" },
      { href: "/worked-examples", label: "Worked examples" },
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
