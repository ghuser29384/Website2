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
    key: "learn",
    title: "Learn the idea",
    homeTitle: "Understand the service",
    description:
      "See what Moral Trade supports, what it does not claim, and why baselines, evidence, and review matter.",
    href: "/what-is-moral-trade",
    icon: "source",
    actionLabel: "Read the plain-language primer",
    fit: "Best if you are new to moral trade and want the plain-language version first.",
  },
  {
    key: "test",
    title: "Inspect an example",
    homeTitle: "See complete terms",
    description:
      "Inspect a complete, non-live example before drafting or relying on a participant record.",
    href: "/worked-examples",
    icon: "example",
    actionLabel: "Open worked examples",
    fit: "Best if you want to understand the mechanism through concrete terms.",
  },
  {
    key: "donate",
    title: "Use a donation route",
    homeTitle: "Donate through a vetted route",
    description:
      "Choose a cause, pay through an external provider, and submit reviewed evidence when a public-good workflow requires it.",
    href: "/donate",
    icon: "fund",
    actionLabel: "Open donation routes",
    fit: "Best if you want a low-friction public-good action before creating a trade.",
  },
  {
    key: "join-build",
    title: "Join the network",
    homeTitle: "Create one concrete record",
    description:
      "Create an account, choose one first action, and invite one serious counterparty or collaborator.",
    href: "/cohort",
    icon: "profile",
    actionLabel: "Join the network",
    fit: "Best if you can bring a concrete use case, counterparty, research question, or community.",
  },
] as const satisfies ReadonlyArray<VisitorPathConfig>;

export type VisitorPath = (typeof VISITOR_PATHS)[number];
