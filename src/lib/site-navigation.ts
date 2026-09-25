import type { SiteNavLinkItem, SiteNavRouteItem } from "./site";

// Keep the existing flat route-inventory API and bespoke caller menus intact.
// Only the known default inventory is regrouped for presentation. A new or
// customized inventory falls back unchanged rather than silently losing links.
const defaultInventory = [
  ["/feed", "Feed"],
  ["/discover", "Discover"],
  ["/trades/new", "Create"],
  ["/invite", "Invite"],
  ["/messages", "Messages"],
  ["/commitments", "Commitments"],
  ["/evidence", "Evidence"],
  ["/safety", "Safety"],
];

export function groupPrimaryNavigation(links: SiteNavLinkItem[]): SiteNavLinkItem[] {
  const isDefault = links.length === defaultInventory.length && links.every((link, index) =>
    !link.items?.length && link.href === defaultInventory[index][0] && link.label === defaultInventory[index][1],
  );
  if (!isDefault) return links;

  return [
    {
      href: "/discover",
      label: "Discover"
    },
    {
      href: "/feed",
      label: "Feed"
    },
    {
      label: "Activity",
      summary: "Manage the trades you are involved in.",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          description: "Overview of your trades and account activity."
        },
        {
          href: "/commitments",
          label: "Commitments",
          description: "Track agreements and what happens next."
        },
        {
          href: "/messages",
          label: "Messages",
          description: "Continue private conversations."
        },
        {
          href: "/saved-offers",
          label: "Saved offers",
          description: "Return to offers you saved."
        },
        {
          href: "/invite",
          label: "Invite someone",
          description: "Invite a counterparty to a trade."
        }
      ]
    },
    {
      label: "Profile",
      summary: "Manage your profile and private priorities.",
      items: [
        {
          href: "/profile",
          label: "Your profile",
          description: "Review your profile and account information."
        },
        {
          href: "/profile/priorities",
          label: "Adjust priorities · 100 Sparks",
          description: "Choose how to allocate your private priorities."
        },
        {
          href: "/dashboard#data-portability",
          label: "Profile data",
          description: "Export or import account data."
        }
      ]
    },
    {
      label: "Help",
      summary: "Understand the process and review safeguards.",
      items: [
        {
          href: "/walkthrough",
          label: "How it works",
          description: "Take the optional walkthrough."
        },
        {
          href: "/evidence",
          label: "Public evidence",
          description: "Review published evidence."
        },
        {
          href: "/safety",
          label: "Safety",
          description: "Read the safety and anti-threat rules."
        },
        {
          href: "/contact",
          label: "Contact",
          description: "Get help with the site."
        }
      ]
    }
  ];
}

export function getTaskPrimaryAction(action?: SiteNavRouteItem): SiteNavRouteItem | undefined {
  return action?.href === "/trades/new" && action.label === "Create"
    ? { ...action, label: "Create trade" }
    : action;
}
