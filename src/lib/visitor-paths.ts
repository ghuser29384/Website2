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
    key: "create",
    title: "Create an agreement",
    homeTitle: "Write bounded terms",
    description:
      "State the no-deal default, each commitment, the maximum exposure, evidence, deadline, and exit rule.",
    href: "/create",
    icon: "swap",
    actionLabel: "Create an agreement",
    fit: "Account required to save a proposal.",
  },
  {
    key: "explore",
    title: "Browse active offers",
    homeTitle: "Find an existing proposal",
    description:
      "Browse participant offers and open the complete terms before responding or making a commitment.",
    href: "/offers",
    icon: "marketplace",
    actionLabel: "Browse active offers",
    fit: "No account required to browse.",
  },
  {
    key: "fund",
    title: "Fund a public good",
    homeTitle: "Donate through Every.org",
    description:
      "Choose a reviewed destination and complete payment with the external provider. Moral Trade does not hold the funds.",
    href: "/donate",
    icon: "payment",
    actionLabel: "Choose a funding route",
    fit: "Payment methods are set by Every.org.",
  },
  {
    key: "pool",
    title: "Join a conditional pool",
    homeTitle: "Review a funding condition",
    description:
      "Review the threshold, deadline, recipient, maximum exposure, and payment state before pledging.",
    href: "/pools",
    icon: "publicGoods",
    actionLabel: "Review conditional pools",
    fit: "Availability depends on the current pool inventory.",
  },
] as const satisfies ReadonlyArray<VisitorPathConfig>;

export type VisitorPath = (typeof VISITOR_PATHS)[number];
