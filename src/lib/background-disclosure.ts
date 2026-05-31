export type DisclosureAccessLevel = "hidden" | "broad" | "specific" | "contact";
export type DisclosureAudienceStage = "registry" | "consent" | "introduced";

export const DISCLOSURE_ACCESS_LEVELS: DisclosureAccessLevel[] = [
  "hidden",
  "broad",
  "specific",
  "contact",
];

export const DISCLOSURE_AUDIENCE_STAGES: DisclosureAudienceStage[] = [
  "registry",
  "consent",
  "introduced",
];

export const BACKGROUND_DISCLOSURE_FIELDS = [
  {
    description: "Broad cause areas and high-level interests only.",
    key: "cause_areas",
    label: "Cause areas",
    maxLevel: "broad",
    minStage: "registry",
  },
  {
    description: "The exact change someone hopes a counterparty might help with.",
    key: "exact_wish",
    label: "Exact wish",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "The concrete ask being considered for this match.",
    key: "exact_ask",
    label: "Exact ask",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "Resources, skills, or commitments the profile owner says they can offer.",
    key: "capabilities",
    label: "Capabilities",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "Constraints that could rule out a proposal or require extra care.",
    key: "constraints",
    label: "Constraints",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "Evidence or attestation preferences for a possible agreement.",
    key: "verification_preferences",
    label: "Verification preferences",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "Coarse location only, never precise address or live location.",
    key: "coarse_location",
    label: "Coarse location",
    maxLevel: "broad",
    minStage: "registry",
  },
  {
    description: "Manual source summaries, excluding raw notes and source payloads.",
    key: "source_summary",
    label: "Manual source summary",
    maxLevel: "specific",
    minStage: "consent",
  },
  {
    description: "Contact details for a mutually approved introduction.",
    key: "contact_email",
    label: "Contact email",
    maxLevel: "contact",
    minStage: "introduced",
  },
] as const satisfies Array<{
  description: string;
  key: string;
  label: string;
  maxLevel: DisclosureAccessLevel;
  minStage: DisclosureAudienceStage;
}>;

export type BackgroundDisclosureFieldKey = (typeof BACKGROUND_DISCLOSURE_FIELDS)[number]["key"];

const FIELD_BY_KEY: ReadonlyMap<string, (typeof BACKGROUND_DISCLOSURE_FIELDS)[number]> = new Map(
  BACKGROUND_DISCLOSURE_FIELDS.map((field) => [field.key, field] as const),
);

const STAGE_RANK: Record<DisclosureAudienceStage, number> = {
  registry: 0,
  consent: 1,
  introduced: 2,
};

const ACCESS_RANK: Record<DisclosureAccessLevel, number> = {
  hidden: 0,
  broad: 1,
  specific: 2,
  contact: 3,
};

export interface DisclosureValidationInput {
  accessLevel?: DisclosureAccessLevel;
  fieldKeys: string[];
  purpose?: string;
  stage: DisclosureAudienceStage;
}

export interface DisclosureValidationResult {
  allowedFields: BackgroundDisclosureFieldKey[];
  errors: string[];
}

export function normalizeDisclosureFieldKeys(values: string[]) {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, entries) => entries.indexOf(value) === index);

  return normalized.filter((value): value is BackgroundDisclosureFieldKey =>
    FIELD_BY_KEY.has(value),
  );
}

export function formatDisclosureFieldLabel(fieldKey: string) {
  return FIELD_BY_KEY.get(fieldKey)?.label ?? fieldKey.replaceAll("_", " ");
}

export function getDisclosureField(fieldKey: string) {
  return FIELD_BY_KEY.get(fieldKey as BackgroundDisclosureFieldKey) ?? null;
}

export function getDefaultGrantExpiryDays(stage: DisclosureAudienceStage) {
  if (stage === "introduced") {
    return 90;
  }

  if (stage === "consent") {
    return 30;
  }

  return 14;
}

export function requiresContactDisclosureStepUp({
  accessLevel = "specific",
  fieldKeys,
}: {
  accessLevel?: DisclosureAccessLevel;
  fieldKeys: string[];
}) {
  return (
    accessLevel === "contact" ||
    normalizeDisclosureFieldKeys(fieldKeys).includes("contact_email")
  );
}

export function validateDisclosureRequest({
  accessLevel = "specific",
  fieldKeys,
  purpose = "",
  stage,
}: DisclosureValidationInput): DisclosureValidationResult {
  const allowedFields = normalizeDisclosureFieldKeys(fieldKeys);
  const errors: string[] = [];
  const unknownFields = fieldKeys.filter((fieldKey) => !FIELD_BY_KEY.has(fieldKey));

  if (!allowedFields.length) {
    errors.push("Choose at least one supported disclosure field.");
  }

  if (unknownFields.length) {
    errors.push(`Unsupported disclosure field(s): ${unknownFields.join(", ")}.`);
  }

  if (!purpose.trim()) {
    errors.push("Add a narrow purpose before requesting or granting private disclosure.");
  }

  for (const fieldKey of allowedFields) {
    const field = FIELD_BY_KEY.get(fieldKey);

    if (!field) {
      continue;
    }

    if (STAGE_RANK[stage] < STAGE_RANK[field.minStage]) {
      errors.push(`${field.label} is not available before the ${field.minStage} stage.`);
    }

    if (ACCESS_RANK[accessLevel] > ACCESS_RANK[field.maxLevel]) {
      errors.push(`${field.label} cannot be granted at ${accessLevel} level.`);
    }
  }

  return { allowedFields, errors };
}

export function buildDisclosureGrantNotes({
  justification = "",
  ownerNote = "",
  purpose = "",
}: {
  justification?: string;
  ownerNote?: string;
  purpose?: string;
}) {
  return [
    purpose ? `Purpose: ${purpose}` : "",
    ownerNote ? `Owner limits: ${ownerNote}` : "",
    !ownerNote && justification ? `Requester rationale: ${justification}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
