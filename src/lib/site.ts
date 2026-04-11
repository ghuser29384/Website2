export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/#introduction", label: "Introduction" },
    { href: "/#theory", label: "Theory" },
    { href: "/#trust", label: "Trust" },
    { href: "/offers", label: "Offers" },
    { href: "/people", label: "People" },
  ];

  if (isAuthenticated) {
    links.push({ href: "/cart", label: "Cart" });
  }

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
    title: "The Paper",
    links: [
      { href: "/#introduction", label: "Introduction" },
      { href: "/#examples", label: "Examples" },
      { href: "/#varieties", label: "Varieties" },
    ],
  },
  {
    title: "Theory and Practice",
    links: [
      { href: "/#theory", label: "Theory" },
      { href: "/#trust", label: "Trust" },
      { href: "/#cases", label: "Practical cases" },
      { href: "/#gains", label: "Gains and limits" },
      { href: "/#sources", label: "Sources" },
    ],
  },
  {
    title: "Participation",
    links: [
      { href: "/offers", label: "Public offers" },
      { href: "/people", label: "People" },
      { href: "/cart", label: "Cart" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;
