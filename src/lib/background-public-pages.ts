import { createHash } from "node:crypto";

import {
  BACKGROUND_UI_COPY_BUNDLE_HASH,
  BACKGROUND_UI_COPY_BUNDLE_VERSION,
} from "@/lib/background-ui-language";

export const BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION =
  "background-public-page-simplification-bg85-v1-2026-06-24";

export const BACKGROUND_PUBLIC_PROMISE =
  "Moral Trade can compare broad previews and saved preferences, then show a privacy-safe possible opportunity for you to review.";

export const BACKGROUND_PUBLIC_BACKGROUND_HERO =
  "Find possible trades without exposing private details.";

export const BACKGROUND_PUBLIC_REGISTRY_HERO =
  "Browse broad previews. Exact asks stay hidden.";

export const BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS = [
  "Create broad profile",
  "Choose who can look",
  "Get a possible opportunity",
  "Ask to explore",
  "Share exact details only if both sides agree",
] as const;

export const BACKGROUND_PUBLIC_SAFETY_CARDS = [
  {
    title: "Broad first",
    body: "Public browsing uses broad previews, cause tags, trade-mode tags, and safe location hints.",
  },
  {
    title: "Exact details stay hidden",
    body: "Exact wishes, private asks, source notes, sensitive constraints, and contact details stay out of public cards.",
  },
  {
    title: "You choose next steps",
    body: "A possible opportunity can be dismissed, reported, or sent for review before either side shares more.",
  },
] as const;

export const BACKGROUND_PUBLIC_NOT_THIS = [
  "No autonomous outreach.",
  "No private-feed scraping.",
  "No hidden ranking of people.",
  "No hidden matching on private detail lists.",
  "No contact disclosure from a brief.",
] as const;

export const BACKGROUND_PUBLIC_PILOT_STATUS = [
  {
    label: "Available now",
    body: "Broad profiles, saved preferences, privacy-safe opportunity cards, and dashboard review controls.",
  },
  {
    label: "Staff/internal",
    body: "Operator review of concierge requests, reports, risk signals, and sensitive disclosure workflows.",
  },
  {
    label: "Shadow only",
    body: "Experimental assistance can be checked against approved summaries without changing live matching or outreach.",
  },
  {
    label: "Not live",
    body: "Passive source connectors, live private-overlap checks, autonomous introductions, and exact-contact disclosure.",
  },
] as const;

export const BACKGROUND_PUBLIC_TECHNICAL_LINKS = [
  {
    label: "Match-signal contract",
    href: "/api/moral-trade/match-signal/contract",
  },
  {
    label: "Private-overlap contract",
    href: "/api/moral-trade/private-overlap/contract",
  },
  {
    label: "Privacy",
    href: "/privacy",
  },
  {
    label: "Safety",
    href: "/safety",
  },
  {
    label: "Accessibility",
    href: "/accessibility",
  },
  {
    label: "Transparency",
    href: "/transparency",
  },
  {
    label: "Technical spec",
    href: "/moral-trade/technical-spec",
  },
] as const;

export const BACKGROUND_PUBLIC_PAGE_SUMMARIES = {
  privacy: {
    eyebrow: "Background networking privacy",
    heading: "Broad previews are separate from private details.",
    summary:
      "The public experience can show broad summaries, tags, and safe status labels while exact wishes, contact details, private asks, source notes, and sensitive constraints stay gated by consent.",
    cards: [
      "Public browsing uses broad previews only.",
      "Exact details move through field-level permission and expiry.",
      "Participants can revoke, freeze, export, correct, or delete background-networking records.",
    ],
    technicalDetailsLabel: "Privacy inventories and disclosure contract",
  },
  safety: {
    eyebrow: "Background networking safety",
    heading: "Possible opportunities are review prompts, not introductions.",
    summary:
      "The feature reduces search costs without sending messages, revealing contacts, or turning a broad match into a commitment.",
    cards: [
      "Outbound and inbound consent are separate steps.",
      "Operators review disclosure and contact workflows before sensitive details move.",
      "Participants can dismiss, report, freeze, or delete the background layer.",
    ],
    technicalDetailsLabel: "Safety contracts and operational controls",
  },
  measurement: {
    eyebrow: "Background networking measurement",
    heading: "Measure whether the workflow is understandable and safe.",
    summary:
      "Background metrics use aggregate counts, buckets, and state labels instead of exact wish text, source notes, contact details, report bodies, or raw search queries.",
    cards: [
      "Counts are privacy-thresholded before publication.",
      "Analytics avoid raw private content and people-ranking signals.",
      "Safety incidents, reports, and review timing are inspected before expansion.",
    ],
    technicalDetailsLabel: "Measurement taxonomy and baselines",
  },
  transparency: {
    eyebrow: "Background networking transparency",
    heading: "Publish aggregate counts, not private case files.",
    summary:
      "Transparency reporting can show how many opportunities, reviews, disclosures, appeals, and reports exist without exposing the details behind a specific person or pair.",
    cards: [
      "Small samples are suppressed rather than disclosed.",
      "Source notes, exact wishes, and contact details stay out of public reports.",
      "Contract and report health remain available behind technical links.",
    ],
    technicalDetailsLabel: "Report sources and validation details",
  },
  accessibility: {
    eyebrow: "Background networking accessibility",
    heading: "Consent controls must be usable before rollout expands.",
    summary:
      "Broad preview cards, consent forms, opportunity states, review requests, and deletion controls need clear labels, keyboard access, and screen-reader-friendly status text.",
    cards: [
      "Use plain labels before technical terms.",
      "Keep status and action text visible without color-only meaning.",
      "Test forms, filters, and disclosure controls with keyboard and assistive technology.",
    ],
    technicalDetailsLabel: "Accessibility QA scope and known limitations",
  },
} as const;

export const BACKGROUND_PUBLIC_FORBIDDEN_DEFAULT_TERMS = [
  "deterministic matching",
  "purpose-bound grants",
  "anti-enumeration budgets",
  "redacted match-signal preview",
  "private-overlap computation",
  "private-overlap crypto",
  "DPIA",
  "RLS",
  "contract check",
  "blocker",
  "source table",
  "validator",
  "raw JSON",
] as const;

const publicPageSimplificationSpecPayload = {
  forbiddenDefaultTerms: BACKGROUND_PUBLIC_FORBIDDEN_DEFAULT_TERMS,
  hero: BACKGROUND_PUBLIC_BACKGROUND_HERO,
  mentalModel: BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS,
  pageSummaries: BACKGROUND_PUBLIC_PAGE_SUMMARIES,
  pilotStatus: BACKGROUND_PUBLIC_PILOT_STATUS,
  promise: BACKGROUND_PUBLIC_PROMISE,
  registryHero: BACKGROUND_PUBLIC_REGISTRY_HERO,
  safetyCards: BACKGROUND_PUBLIC_SAFETY_CARDS,
  technicalLinks: BACKGROUND_PUBLIC_TECHNICAL_LINKS,
  uiCopyBundleHash: BACKGROUND_UI_COPY_BUNDLE_HASH,
  uiCopyBundleVersion: BACKGROUND_UI_COPY_BUNDLE_VERSION,
  version: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
};

export const BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH = createHash("sha256")
  .update(JSON.stringify(publicPageSimplificationSpecPayload))
  .digest("hex");

export function getBackgroundPublicPageSimplificationSpec() {
  return {
    ...publicPageSimplificationSpecPayload,
    hash: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
  };
}

export function validateBackgroundPublicPageSimplificationSpec() {
  const checks = [
    {
      key: "five-step-model",
      ok: BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS.length === 5,
    },
    {
      key: "three-safety-cards",
      ok: BACKGROUND_PUBLIC_SAFETY_CARDS.length === 3,
    },
    {
      key: "all-trust-pages-covered",
      ok:
        ["privacy", "safety", "measurement", "transparency", "accessibility"].every((key) =>
          Object.prototype.hasOwnProperty.call(BACKGROUND_PUBLIC_PAGE_SUMMARIES, key),
        ),
    },
    {
      key: "technical-links-present",
      ok:
        BACKGROUND_PUBLIC_TECHNICAL_LINKS.some((link) =>
          link.href.includes("match-signal"),
        ) &&
        BACKGROUND_PUBLIC_TECHNICAL_LINKS.some((link) =>
          link.href.includes("private-overlap"),
        ) &&
        BACKGROUND_PUBLIC_TECHNICAL_LINKS.some((link) =>
          link.href === "/moral-trade/technical-spec",
        ),
    },
    {
      key: "content-addressed",
      ok:
        BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH.length === 64 &&
        BACKGROUND_UI_COPY_BUNDLE_HASH.length === 64,
    },
  ];
  const blockers = checks.filter((check) => !check.ok).map((check) => check.key);

  return {
    blockers,
    checks,
    hash: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
    status: blockers.length ? "fail" : "pass",
    version: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
  } as const;
}
