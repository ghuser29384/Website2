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
    homeTitle: "Read what exists today",
    description:
      "See what the pilot supports, what it does not promise, and why review matters.",
    href: "/what-is-moral-trade",
    icon: "source",
    actionLabel: "Read the plain-language primer",
    fit: "Best if you are new to moral trade and want the plain-language version first.",
  },
  {
    key: "test",
    title: "Test an example",
    homeTitle: "See a worked example",
    description:
      "Inspect a complete, non-live example before drafting or relying on a real trade.",
    href: "/worked-examples",
    icon: "example",
    actionLabel: "Open worked examples",
    fit: "Best if you want to understand the mechanism by looking at concrete terms.",
  },
  {
    key: "donate",
    title: "Donate through a route",
    homeTitle: "Donate through a vetted route",
    description:
      "Choose a cause, complete payment on Every.org, and optionally record the gift here.",
    href: "/donate",
    icon: "fund",
    actionLabel: "Open donation routes",
    fit: "Best if you want a low-friction public-good action before creating a trade.",
  },
  {
    key: "join-build",
    title: "Join or build",
    homeTitle: "Join or build",
    description:
      "Enter the founding cohort, invite one serious counterparty, and start small.",
    href: "/cohort",
    icon: "profile",
    actionLabel: "Join the founding cohort",
    fit: "Best if you can help test the pilot with one serious counterparty or group.",
  },
] as const satisfies ReadonlyArray<VisitorPathConfig>;

export type VisitorPath = (typeof VISITOR_PATHS)[number];
