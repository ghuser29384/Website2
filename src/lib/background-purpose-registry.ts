export const BACKGROUND_PURPOSE_POLICY_VERSION = "background-purpose-policy-v1";

export const BACKGROUND_PURPOSE_CODES = [
  "moral_trade_offer",
  "donation_offset",
  "pledge_swap",
  "moral_public_good",
  "research_collaboration",
  "community_intro",
] as const;

export type BackgroundPurposeCode = (typeof BACKGROUND_PURPOSE_CODES)[number];

export interface BackgroundPurposeRegistryEntry {
  allowedSurfaces: string[];
  code: BackgroundPurposeCode;
  label: string;
  prohibitedUses: string[];
  reconfirmationRule: "required_on_policy_change" | "required_on_scope_widening";
  riskTier: "low" | "medium" | "high";
  version: typeof BACKGROUND_PURPOSE_POLICY_VERSION;
}

export interface BackgroundPurposeBinding {
  purposeCode: BackgroundPurposeCode;
  purposePolicyVersion: typeof BACKGROUND_PURPOSE_POLICY_VERSION;
}

export const BACKGROUND_PURPOSE_REGISTRY: Record<
  BackgroundPurposeCode,
  BackgroundPurposeRegistryEntry
> = {
  community_intro: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "community_intro",
    label: "Community introduction",
    prohibitedUses: ["general_networking", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_scope_widening",
    riskTier: "medium",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
  donation_offset: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "donation_offset",
    label: "Donation offset",
    prohibitedUses: ["general_networking", "payment_pressure", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_policy_change",
    riskTier: "medium",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
  moral_public_good: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "moral_public_good",
    label: "Moral public good",
    prohibitedUses: ["general_networking", "moral_ranking", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_policy_change",
    riskTier: "medium",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
  moral_trade_offer: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "moral_trade_offer",
    label: "Moral trade offer",
    prohibitedUses: ["general_networking", "autonomous_outreach", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_policy_change",
    riskTier: "medium",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
  pledge_swap: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "pledge_swap",
    label: "Pledge swap",
    prohibitedUses: ["general_networking", "payment_pressure", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_policy_change",
    riskTier: "medium",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
  research_collaboration: {
    allowedSurfaces: ["broad_profile", "public_preview", "reviewed_source_summary"],
    code: "research_collaboration",
    label: "Research collaboration",
    prohibitedUses: ["general_networking", "raw_source_mining", "contact_disclosure_without_review"],
    reconfirmationRule: "required_on_scope_widening",
    riskTier: "low",
    version: BACKGROUND_PURPOSE_POLICY_VERSION,
  },
};

const BROAD_OR_UNSUPPORTED_PURPOSES = new Set([
  "anything useful",
  "anything_useful",
  "general networking",
  "general_networking",
  "networking",
  "opportunity_discovery",
  "other",
]);

export function normalizeBackgroundPurposeCode(value?: string | null): BackgroundPurposeCode | null {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (!normalized || BROAD_OR_UNSUPPORTED_PURPOSES.has(normalized)) {
    return null;
  }

  return BACKGROUND_PURPOSE_CODES.includes(normalized as BackgroundPurposeCode)
    ? (normalized as BackgroundPurposeCode)
    : null;
}

export function getBackgroundPurposeRegistryEntry(
  purposeCode?: string | null,
  purposePolicyVersion?: string | null,
) {
  const normalizedCode = normalizeBackgroundPurposeCode(purposeCode);

  if (!normalizedCode || purposePolicyVersion !== BACKGROUND_PURPOSE_POLICY_VERSION) {
    return null;
  }

  return BACKGROUND_PURPOSE_REGISTRY[normalizedCode];
}

export function buildDefaultBackgroundPurposeBinding(): BackgroundPurposeBinding {
  return {
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
}

export function normalizeBackgroundPurposeBinding({
  purposeCode,
  purposePolicyVersion,
}: {
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
}): BackgroundPurposeBinding {
  const normalizedCode = normalizeBackgroundPurposeCode(purposeCode);
  const defaultBinding = buildDefaultBackgroundPurposeBinding();

  if (!normalizedCode) {
    return defaultBinding;
  }

  if (purposePolicyVersion !== BACKGROUND_PURPOSE_POLICY_VERSION) {
    return defaultBinding;
  }

  return {
    purposeCode: normalizedCode,
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
}

export function formatBackgroundPurposeLabel({
  purposeCode,
  purposePolicyVersion,
}: {
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
}) {
  const entry = getBackgroundPurposeRegistryEntry(purposeCode, purposePolicyVersion);
  return entry?.label ?? BACKGROUND_PURPOSE_REGISTRY.moral_trade_offer.label;
}

export function validateBackgroundPurposeBindings(
  bindings: Array<{ purposeCode?: string | null; purposePolicyVersion?: string | null }>,
) {
  const errors: string[] = [];
  const normalized: BackgroundPurposeBinding[] = [];

  for (const binding of bindings) {
    const purposeCode = normalizeBackgroundPurposeCode(binding.purposeCode);

    if (!purposeCode) {
      errors.push("Unsupported or overbroad purpose codes are not allowed.");
      continue;
    }

    if (binding.purposePolicyVersion !== BACKGROUND_PURPOSE_POLICY_VERSION) {
      errors.push(`Purpose ${purposeCode} must use ${BACKGROUND_PURPOSE_POLICY_VERSION}.`);
      continue;
    }

    normalized.push({ purposeCode, purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION });
  }

  return { errors, normalized };
}
