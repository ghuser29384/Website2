export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/offers?mode=pledge", label: "Pledge swaps" },
    { href: "/donation-offsets", label: "Offsets" },
    { href: "/mpgf", label: "MPGF" },
    { href: "/reasoning-standards", label: "Learn" },
    { href: "/people", label: "Community" },
    {
      label: "More",
      items: [
        { href: "/#about", label: "About" },
        { href: "/offers", label: "All offers" },
        { href: "/donate", label: "Donate" },
        { href: "/background-networking", label: "Background networking" },
        { href: "/wish-registry", label: "Wish registry" },
        { href: "/methodology", label: "Methodology" },
        { href: "/safety", label: "Safety" },
        ...(isAuthenticated ? [] : [{ href: "/signup", label: "Create account" }]),
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
      { href: "/background-networking", label: "Background networking" },
      { href: "/#commitments", label: "Blockers" },
    ],
  },
  {
    title: "Standards",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/reasoning-standards", label: "Reasoning standards" },
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
