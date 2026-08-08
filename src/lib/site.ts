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

export function getPrimaryNavLinks(_isAuthenticated = false): SiteNavLinkItem[] {
  return [
    { href: "/", label: "Feed" },
    { href: "/offers", label: "Discover" },
    { href: "/trades/new", label: "Create" },
    { href: "/invite", label: "Invite" },
    { href: "/messages", label: "Messages" },
    { href: "/commitments", label: "Commitments" },
    { href: "/evidence", label: "Evidence" },
    { href: "/safety", label: "Safety" },
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

export const FOOTER_LINK_GROUPS: SiteFooterLinkGroup[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/", label: "Personalized feed" },
      { href: "/offers", label: "Discover opportunities" },
      { href: "/trades/new", label: "Create a trade" },
      { href: "/messages", label: "Private messages" },
      { href: "/commitments", label: "Track commitments" },
    ],
  },
  {
    title: "Safety & transparency",
    links: [
      { href: "/credibility", label: "Contextual credibility" },
      { href: "/evidence", label: "Public evidence" },
      { href: "/status", label: "Service status" },
      { href: "/safety", label: "Safety and anti-threat rules" },
      { href: "/trade-controls", label: "Trade controls" },
      { href: "/transparency", label: "Transparency" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/walkthrough", label: "Interactive walkthrough" },
      { href: "/what-is-moral-trade", label: "What is Moral Trade?" },
      { href: "/research", label: "Research" },
      { href: "/moral-trade/technical-spec", label: "Technical specification" },
      { href: "/worked-examples", label: "Worked examples" },
    ],
  },
  {
    title: "Organization",
    links: [
      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/cohort", label: "Join the network" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];
