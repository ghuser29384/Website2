import { getPrimaryNavLinks, type SiteNavLinkItem } from "@/lib/site";

/** Keep the route inventory stable for search and bespoke headers. */
export function usesDefaultHeader(links: SiteNavLinkItem[]): boolean {
  const inventory = getPrimaryNavLinks();
  return links.length === inventory.length && links.every((link, index) =>
    link.href === inventory[index].href && link.label === inventory[index].label && !link.items?.length,
  );
}

export const REFINED_HEADER_LINKS: SiteNavLinkItem[] = [
  { href: "/feed", label: "Home" },
  { href: "/discover", label: "Trades" },
  { href: "/commitments", label: "Commitments" },
  { href: "/profile", label: "Profile" },
];

export const HEADER_UTILITY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trades/new", label: "Create a trade" },
  { href: "/messages", label: "Messages" },
  { href: "/cart", label: "Saved offers" },
  { href: "/invite", label: "Invite someone" },
  { href: "/walkthrough", label: "How it works" },
  { href: "/safety", label: "Safety" },
];
