import { VISITOR_PATHS, type VisitorPath } from "./visitor-paths";

// Presentation only: preserve the existing destinations and their order.
const START_COPY = {
  fund: {
    title: "Make a donation",
    description: "Support a cause through Every.org.",
  },
  create: {
    title: "Create a trade",
    description: "Propose an exchange with someone.",
  },
  pool: {
    title: "Explore funding pools",
    description: "Review opportunities to fund a cause together.",
  },
  explore: {
    title: "Browse trades",
    description: "Find an existing offer to respond to.",
  },
} satisfies Record<VisitorPath["key"], { title: string; description: string }>;

export const START_PATHS = VISITOR_PATHS.map(({ key, href }) => ({
  key,
  href,
  ...START_COPY[key],
}));

export function getStartCreateHref(isAuthenticated: boolean) {
  return isAuthenticated ? "/create" : "/signup?returnTo=/create";
}
