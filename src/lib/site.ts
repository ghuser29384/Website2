export function getPrimaryNavLinks(_isAuthenticated = false) {
  return [
    { href: "/pledge-swaps", label: "Trade" },
    { href: "/moral-goods-group-buying", label: "Moral Public Goods" },
    { href: "/donation-offsets", label: "Donation Offsets" },
    { href: "/donate", label: "Fund" },
  ];
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated ? undefined : { href: "/login", label: "Sign in" },
    primaryAction: isAuthenticated
      ? {
          href: "/create",
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
      { href: "/create", label: "Create" },
      { href: "/donate", label: "Fund a public good" },
      { href: "/offsets", label: "Donation offsets" },
      { href: "/pools", label: "Conditional pools" },
      { href: "/background-networking", label: "Private matching" },
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
      { href: "/what-is-moral-trade", label: "What is Moral Trade?" },
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
