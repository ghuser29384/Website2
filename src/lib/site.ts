export interface SiteNavRouteItem {
  href: string;
  label: string;
  description?: string;
  section?: string;
}

export interface SiteNavLinkItem {
  href?: string;
  label: string;
  summary?: string;
  items?: SiteNavRouteItem[];
}

export interface SiteFooterLinkGroup {
  title: string;
  links: SiteNavRouteItem[];
}

export function getPrimaryNavLinks(isAuthenticated = false): SiteNavLinkItem[] {
  return [
    { href: "/feed", label: "Feed" },
    { href: "/discover", label: "Discover" },
    { href: "/messages", label: "Messages" },
    { href: "/commitments", label: "Commitments" },
    {
      label: "More",
      items: [
        // Signed-in users already have the primary Create button.
        ...(!isAuthenticated ? [{ href: "/trades/new", label: "Create a trade" }] : []),
        { href: "/invite", label: "Invite" },
        { href: "/evidence", label: "Evidence" },
        { href: "/safety", label: "Safety" },
      ],
    },
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

// Keep experiments and technical demos out of the site-wide task navigation.
// Their routes and records remain available; this is not a data deletion.
export const FOOTER_LINK_GROUPS: SiteFooterLinkGroup[] = [
  {
    title: "Explore",
    links: [
      { href: "/feed", label: "Feed" },
      { href: "/discover", label: "Discover" },
      { href: "/trades/new", label: "Create a trade" },
      { href: "/messages", label: "Messages" },
      { href: "/commitments", label: "Commitments" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/safety", label: "Safety" },
      { href: "/evidence", label: "Evidence" },
      { href: "/credibility", label: "Credibility" },
      { href: "/transparency", label: "Transparency" },
      { href: "/status", label: "Service status" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/what-is-moral-trade", label: "How it works" },
      { href: "/walkthrough", label: "Tour" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/research", label: "Research" },
    ],
  },
];
