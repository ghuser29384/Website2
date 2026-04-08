export function getPrimaryNavLinks(isAuthenticated = false) {
  const links = [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#standards", label: "Reasoning standards" },
    { href: "/offers", label: "Public offers" },
    { href: "/people", label: "People" },
    { href: "/#faq", label: "FAQ" },
  ];

  if (isAuthenticated) {
    links.push({ href: "/cart", label: "Cart" });
  }

  return links;
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Moral Trade",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#commitments", label: "Commitments" },
    ],
  },
  {
    title: "Standards",
    links: [
      { href: "/#methodology", label: "Methodology" },
      { href: "/#standards", label: "Reasoning standards" },
      { href: "/#transparency", label: "Transparency" },
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
