import type { IconName } from "@/components/ui/page-primitives";

type VisitorPathConfig = {
  actionLabel: string;
  description: string;
  fit: string;
  homeTitle: string;
  href: string;
  icon: IconName;
  key: string;
  title: string;
};

export const VISITOR_PATHS = [
  {
    key: "fund",
    title: "Make a payment",
    homeTitle: "Fund a public good",
    description:
      "Choose a reviewed destination and complete a real donation through Every.org. The payment stays with the external provider.",
    href: "/donate",
    icon: "payment",
    actionLabel: "Choose a funding route",
    fit: "The fastest available financial action on Moral Trade.",
  },
  {
    key: "create",
    title: "Create a trade",
    homeTitle: "Write a bounded proposal",
    description:
      "State the no-deal default, each commitment, the maximum exposure, evidence, deadline, and exit rule.",
    href: "/create",
    icon: "swap",
    actionLabel: "Create a proposal",
    fit: "Use this when you already have a concrete action or counterparty in mind.",
  },
  {
    key: "pool",
    title: "Join a conditional pool",
    homeTitle: "Coordinate shared funding",
    description:
      "Review current production pools and pledge only where a reviewed route, threshold, recipient, and payment state are available.",
    href: "/pools",
    icon: "publicGoods",
    actionLabel: "Review live pools",
    fit: "Use this when the action should happen only after enough people participate.",
  },
  {
    key: "explore",
    title: "Explore live proposals",
    homeTitle: "Find an existing opportunity",
    description:
      "Browse participant proposals and current records without treating explanatory material as marketplace activity.",
    href: "/offers",
    icon: "marketplace",
    actionLabel: "Explore the marketplace",
    fit: "Use this when you want to respond to an existing proposal rather than create one.",
  },
] as const satisfies ReadonlyArray<VisitorPathConfig>;

export type VisitorPath = (typeof VISITOR_PATHS)[number];
