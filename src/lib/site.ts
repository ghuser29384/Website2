export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    {
      label: "Marketplace",
      items: [
        { href: "/offers", label: "All trades" },
        { href: "/offers?mode=pledge", label: "Pledge swaps" },
        { href: "/donation-offsets", label: "Donation offsets" },
        { href: "/mpgf", label: "Moral Public Goods Fund" },
        { href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new", label: "Create trade" },
      ],
    },
    {
      label: "Learn",
      items: [
        { href: "/reasoning-standards", label: "Tutorials" },
        { href: "/methodology", label: "Methodology" },
        { href: "/safety", label: "Safety" },
        { href: "/background-networking", label: "Background networking" },
        { href: "/#faq", label: "FAQ" },
      ],
    },
    {
      label: "Community",
      items: [
        { href: "/people", label: "Profiles" },
        { href: "/wish-registry", label: "Wish registry" },
        { href: "/priority-correction-fund", label: "Priority fund" },
        { href: "/mpgf/pools", label: "MPGF pools" },
        { href: isAuthenticated ? "/dashboard" : "/signup", label: isAuthenticated ? "Dashboard" : "Create account" },
      ],
    },
    { href: "/#about", label: "About" },
  ];

  return links;
}

export function getTopbarActions(isAuthenticated = false) {
  return {
    authLink: isAuthenticated
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/login", label: "Sign in" },
    primaryAction: {
      href: isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new",
      label: "Create trade",
    },
  };
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/offers", label: "All trades" },
      { href: "/offers?mode=pledge", label: "Pledge swaps" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/offers/new", label: "Create trade" },
      { href: "/donate", label: "Donation routes" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/reasoning-standards", label: "Reasoning standards" },
      { href: "/safety", label: "Safety" },
      { href: "/#faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/background-networking", label: "Background networking" },
      { href: "/priority-correction-fund", label: "Priority fund" },
      { href: "/mpgf", label: "MPGF" },
      { href: "/mpgf/contribute", label: "Manual evidence" },
      { href: "/mpgf/pools", label: "MPGF pools" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;
