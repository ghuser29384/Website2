export function getPrimaryNavLinks(_isAuthenticated = false) {
  return [
    { href: "/pledge-swaps", label: "Pledge Swap" },
    { href: "/moral-goods-group-buying", label: "Moral Public Goods" },
    { href: "/donation-offsets", label: "Donation Offsets" },
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
          label: "Start",
        },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/offers", label: "Explore trades" },
      { href: "/create", label: "Create" },
      { href: "/offsets", label: "Donation offsets" },
      { href: "/pools", label: "Conditional pools" },
      { href: "/background-networking", label: "Private matching" },
    ],
  },
  {
    title: "Trust",
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
      { href: "/worked-examples", label: "Worked examples" },
      { href: "/research", label: "Research" },
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
