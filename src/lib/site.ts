export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#background-networking", label: "Networking" },
    { href: "/#standards", label: "Standards" },
    { href: "/priority-correction-fund", label: "Priority fund" },
    { href: "/offers", label: "Offers" },
    { href: "/people", label: "People" },
    {
      label: "More",
      items: [
        { href: "/donation-offsets", label: "Donation offsets" },
        { href: "/donate", label: "Donate" },
        { href: "/offers#best-offers", label: "Best offers" },
        { href: "/wish-registry", label: "Registry" },
        { href: "/cart", label: "Cart" },
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
    primaryAction: { href: "/offers", label: "Trade" },
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
      { href: "/offers", label: "Public offers" },
      { href: "/donation-offsets", label: "Donation offsets" },
      { href: "/priority-correction-fund", label: "Priority fund" },
      { href: "/donate", label: "Donate" },
      { href: "/people", label: "People" },
      { href: "/wish-registry", label: "Wish registry" },
      { href: "/cart", label: "Cart" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;
