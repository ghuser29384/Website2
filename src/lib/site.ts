export const PRIMARY_NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#standards", label: "Reasoning standards" },
  { href: "/offers", label: "Public offers" },
  { href: "/#faq", label: "FAQ" },
] as const;

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
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;
