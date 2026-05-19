export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/mpgf", label: "MPGF" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/offers", label: "Offers" },
    { href: "/donate", label: "Donate" },
    { href: "/people", label: "People" },
    {
      label: "More",
      items: [
        { href: "/#background-networking", label: "Background networking" },
        { href: "/#standards", label: "Standards" },
        { href: "/methodology", label: "Methodology" },
        { href: "/safety", label: "Safety" },
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
    primaryAction: { href: "/mpgf/contribute", label: "Contribute" },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Moral Trade",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#background-networking", label: "Background networking" },
      { href: "/#commitments", label: "Blockers" },
    ],
  },
  {
    title: "Standards",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/#standards", label: "Reasoning standards" },
      { href: "/safety", label: "Safety" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Participation",
    links: [
      { href: "/mpgf", label: "MPGF" },
      { href: "/mpgf/contribute", label: "Manual evidence" },
      { href: "/offers", label: "Public offers" },
      { href: "/donate", label: "Donate" },
      { href: "/people", label: "People" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Prototype lab",
    links: [
      { href: "/donation-offsets", label: "Donation offsets guide" },
      { href: "/mpgf/pools", label: "MPGF pools" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/priority-correction-fund", label: "Priority fund" },
    ],
  },
] as const;
