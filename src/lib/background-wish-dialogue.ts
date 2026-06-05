import { getBackgroundTokens } from "@/lib/background-networking";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_WISH_DIALOGUE_VERSION = "background-wish-dialogue-v1";
export const BACKGROUND_WISH_DIALOGUE_MODEL_NAME =
  "deterministic-schema-bound-wish-dialogue-v1";
export const BACKGROUND_WISH_DIALOGUE_DEFAULT_RETENTION_DAYS = 90;

export const BACKGROUND_WISH_DIALOGUE_FORBIDDEN_KEYS = [
  "contact_details",
  "exact_wish",
  "exact_ask",
  "protected_trait_inference",
  "raw_profile_notes",
  "raw_source_notes",
  "psychology_inference",
] as const;

export const BACKGROUND_WISH_DIALOGUE_TRADE_MODES = [
  "pledge",
  "payment",
  "offset",
  "public_good",
] as const;

export type BackgroundWishDialogueTradeMode =
  (typeof BACKGROUND_WISH_DIALOGUE_TRADE_MODES)[number];

export interface BackgroundWishDialogueMessageInput {
  role: "user" | "assistant";
  text: string;
}

export interface BackgroundWishDialogueProposal {
  availabilityHints: string[];
  broadCapabilities: string[];
  broadConstraints: string[];
  causeAreas: string[];
  coarseLocation?: string;
  participantExplanation: string[];
  tradeModes: BackgroundWishDialogueTradeMode[];
  unansweredFields: string[];
  uncertaintyFlags: string[];
  verificationPreferences: string[];
  version: typeof BACKGROUND_WISH_DIALOGUE_VERSION;
}

type BackgroundProfileSignalInsert =
  Database["public"]["Tables"]["background_profile_signals"]["Insert"];

const TRADE_MODE_SET = new Set<string>(BACKGROUND_WISH_DIALOGUE_TRADE_MODES);

const CAUSE_PATTERNS: Array<[RegExp, string]> = [
  [/\banimal|welfare|farmed|shrimp|fish\b/i, "animal welfare"],
  [/\bclimate|carbon|emissions|adaptation\b/i, "climate"],
  [/\bglobal health|malaria|poverty|development\b/i, "global health"],
  [/\bai safety|alignment|frontier ai|model risk\b/i, "ai safety"],
  [/\bgovernance|coordination|institution|policy\b/i, "governance"],
  [/\bbiosecurity|pandemic|pathogen\b/i, "biosecurity"],
];

const CAPABILITY_PATTERNS: Array<[RegExp, string]> = [
  [/\bengineer|software|build|prototype|data\b/i, "engineering"],
  [/\bresearch|analysis|evaluate|model\b/i, "research"],
  [/\bfund|grant|donor|donation|capital\b/i, "funding"],
  [/\bintro|network|connect|broker\b/i, "introductions"],
  [/\breview|audit|verify|attest\b/i, "review"],
  [/\borganize|community|cohort|circle\b/i, "organizing"],
];

const CONSTRAINT_PATTERNS: Array<[RegExp, string]> = [
  [/\banonymous|pseudonymous|identity private\b/i, "identity privacy"],
  [/\blegal|compliance|lawful\b/i, "legal review needed"],
  [/\bsafety|risk|sensitive\b/i, "safety review needed"],
  [/\btime|capacity|bandwidth|busy\b/i, "capacity constrained"],
];

const VERIFICATION_PATTERNS: Array<[RegExp, string]> = [
  [/\breceipt|proof|evidence\b/i, "receipt or evidence"],
  [/\baudit|third.party|independent review\b/i, "independent review"],
  [/\battest|attestation|signed\b/i, "attestation"],
  [/\bpublic log|commitment log\b/i, "public log"],
];

const AVAILABILITY_PATTERNS: Array<[RegExp, string]> = [
  [/\bweekly|week\b/i, "weekly cadence"],
  [/\bmonthly|month\b/i, "monthly cadence"],
  [/\bremote|online|async\b/i, "remote or async"],
  [/\bshort call|first call|intro call\b/i, "short first conversation"],
];

function compact(value: string, maxLength = 80) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function unique(values: string[], max = 12) {
  return [...new Set(values.map((value) => compact(value)).filter(Boolean))].slice(0, max);
}

function hasUnsafeProposalValue(value: string) {
  return /(?:@|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d|street|avenue|exact wish|contact detail|protected trait|religion|race|medical)/i.test(
    value,
  );
}

function keepSafeBroadValues(values: string[], max = 12) {
  return unique(values.filter((value) => !hasUnsafeProposalValue(value)), max);
}

function patternMatches(text: string, patterns: Array<[RegExp, string]>, max = 8) {
  return keepSafeBroadValues(
    patterns.filter(([pattern]) => pattern.test(text)).map(([, label]) => label),
    max,
  );
}

function extractTradeModes(text: string): BackgroundWishDialogueTradeMode[] {
  const modes: BackgroundWishDialogueTradeMode[] = [];

  if (/\bpledge|commitment|promise\b/i.test(text)) {
    modes.push("pledge");
  }

  if (/\bpay|payment|bounty|commission\b/i.test(text)) {
    modes.push("payment");
  }

  if (/\boffset|compensate|counterbalance\b/i.test(text)) {
    modes.push("offset");
  }

  if (/\bpublic good|commons|fund|pooled|grant\b/i.test(text)) {
    modes.push("public_good");
  }

  return [...new Set(modes)];
}

function extractCoarseLocation(text: string) {
  if (/\bremote|online|async\b/i.test(text)) {
    return "remote_or_online";
  }

  if (/\bunited states|usa|u\.s\.\b/i.test(text)) {
    return "United States";
  }

  if (/\beurope|eu\b/i.test(text)) {
    return "Europe";
  }

  if (/\bglobal|worldwide|anywhere\b/i.test(text)) {
    return "global";
  }

  return undefined;
}

function unansweredFieldsFor(proposal: Pick<
  BackgroundWishDialogueProposal,
  | "availabilityHints"
  | "broadCapabilities"
  | "broadConstraints"
  | "causeAreas"
  | "tradeModes"
  | "verificationPreferences"
>) {
  const unanswered: string[] = [];

  if (!proposal.causeAreas.length) {
    unanswered.push("causeAreas");
  }

  if (!proposal.tradeModes.length) {
    unanswered.push("tradeModes");
  }

  if (!proposal.broadCapabilities.length) {
    unanswered.push("broadCapabilities");
  }

  if (!proposal.verificationPreferences.length) {
    unanswered.push("verificationPreferences");
  }

  if (!proposal.availabilityHints.length) {
    unanswered.push("availabilityHints");
  }

  if (!proposal.broadConstraints.length) {
    unanswered.push("broadConstraints");
  }

  return unanswered;
}

function uncertaintyFlagsFor(text: string, unansweredFields: string[]) {
  const flags = unansweredFields.map((field) => `unanswered:${field}`);

  if (/\bmaybe|not sure|uncertain|roughly|possibly|exploring\b/i.test(text)) {
    flags.push("user_marked_uncertainty");
  }

  return unique(flags, 12);
}

function normalizeStringArray(value: unknown, max = 12) {
  return Array.isArray(value)
    ? keepSafeBroadValues(
        value.filter((entry): entry is string => typeof entry === "string"),
        max,
      )
    : [];
}

function normalizeTradeModes(value: unknown) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (entry): entry is BackgroundWishDialogueTradeMode =>
              typeof entry === "string" && TRADE_MODE_SET.has(entry),
          ),
        ),
      ]
    : [];
}

export function buildBackgroundWishDialogueProposal({
  messages,
}: {
  messages: BackgroundWishDialogueMessageInput[];
}): BackgroundWishDialogueProposal {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => compact(message.text, 1_200))
    .join(" ");
  const tokens = getBackgroundTokens(userText, 40);
  const tokenText = tokens.join(" ");
  const searchText = `${userText} ${tokenText}`;
  const base = {
    availabilityHints: patternMatches(searchText, AVAILABILITY_PATTERNS, 10),
    broadCapabilities: patternMatches(searchText, CAPABILITY_PATTERNS, 20),
    broadConstraints: patternMatches(searchText, CONSTRAINT_PATTERNS, 20),
    causeAreas: patternMatches(searchText, CAUSE_PATTERNS, 12),
    tradeModes: extractTradeModes(searchText),
    verificationPreferences: patternMatches(searchText, VERIFICATION_PATTERNS, 8),
  };
  const unansweredFields = unansweredFieldsFor(base);
  const uncertaintyFlags = uncertaintyFlagsFor(searchText, unansweredFields);
  const participantExplanation = unique(
    [
      base.causeAreas.length
        ? "Mapped broad cause areas from explicit user language."
        : "Cause areas need user review before matching.",
      base.broadCapabilities.length
        ? "Mapped broad capabilities from explicit user language."
        : "Capabilities need user review before matching.",
      base.verificationPreferences.length
        ? "Mapped broad verification preferences from explicit user language."
        : "Verification preferences need user review before matching.",
    ],
    12,
  );

  return {
    ...base,
    coarseLocation: extractCoarseLocation(searchText),
    participantExplanation,
    unansweredFields,
    uncertaintyFlags,
    version: BACKGROUND_WISH_DIALOGUE_VERSION,
  };
}

export function normalizeBackgroundWishDialogueProposal(
  value: unknown,
): BackgroundWishDialogueProposal {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const base = {
    availabilityHints: normalizeStringArray(record.availabilityHints, 10),
    broadCapabilities: normalizeStringArray(record.broadCapabilities, 20),
    broadConstraints: normalizeStringArray(record.broadConstraints, 20),
    causeAreas: normalizeStringArray(record.causeAreas, 12),
    participantExplanation: normalizeStringArray(record.participantExplanation, 12),
    tradeModes: normalizeTradeModes(record.tradeModes),
    verificationPreferences: normalizeStringArray(record.verificationPreferences, 8),
  };
  const coarseLocation =
    typeof record.coarseLocation === "string" && !hasUnsafeProposalValue(record.coarseLocation)
      ? compact(record.coarseLocation, 64)
      : undefined;
  const unansweredFields = normalizeStringArray(record.unansweredFields, 12);
  const uncertaintyFlags = normalizeStringArray(record.uncertaintyFlags, 12);

  return {
    ...base,
    coarseLocation,
    unansweredFields,
    uncertaintyFlags,
    version: BACKGROUND_WISH_DIALOGUE_VERSION,
  };
}

export function validateBackgroundWishDialogueProposalForApply(
  proposal: BackgroundWishDialogueProposal,
) {
  const errors: string[] = [];
  const searchableValues = [
    ...proposal.availabilityHints,
    ...proposal.broadCapabilities,
    ...proposal.broadConstraints,
    ...proposal.causeAreas,
    ...(proposal.coarseLocation ? [proposal.coarseLocation] : []),
    ...proposal.verificationPreferences,
  ];

  if (searchableValues.some(hasUnsafeProposalValue)) {
    errors.push("Proposal contains unsafe exact or private values.");
  }

  if (!searchableValues.length && !proposal.tradeModes.length) {
    errors.push("Apply requires at least one broad reviewed field.");
  }

  return { errors };
}

export function getBackgroundWishDialogueSignalExpiresAt(
  now = new Date(),
  retentionDays = BACKGROUND_WISH_DIALOGUE_DEFAULT_RETENTION_DAYS,
) {
  const expiresAt = new Date(now.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + retentionDays);
  return expiresAt.toISOString();
}

function signalRowsForValues({
  allowedFieldKey,
  expiresAt,
  profileId,
  signalKey,
  values,
}: {
  allowedFieldKey: BackgroundProfileSignalInsert["allowed_field_key"];
  expiresAt?: string | null;
  profileId: string;
  signalKey: string;
  values: string[];
}) {
  return values.map((value): BackgroundProfileSignalInsert => ({
    allowed_field_key: allowedFieldKey,
    confidence_band: "medium",
    expires_at: expiresAt ?? null,
    profile_id: profileId,
    sensitivity: "broad",
    signal_key: signalKey,
    signal_value: value,
    source: "wish_dialogue",
    source_connection_id: null,
    source_summary_id: null,
    status: "active",
  }));
}

export function buildBackgroundWishDialogueSignalRows({
  expiresAt,
  profileId,
  proposal,
}: {
  expiresAt?: string | null;
  profileId: string;
  proposal: BackgroundWishDialogueProposal;
}): BackgroundProfileSignalInsert[] {
  const rows = [
    ...signalRowsForValues({
      allowedFieldKey: "cause_priorities",
      expiresAt,
      profileId,
      signalKey: "cause_priority",
      values: proposal.causeAreas,
    }),
    ...signalRowsForValues({
      allowedFieldKey: "capability_tags",
      expiresAt,
      profileId,
      signalKey: "capability_tag",
      values: proposal.broadCapabilities,
    }),
    ...signalRowsForValues({
      allowedFieldKey: "offer_ask_terms",
      expiresAt,
      profileId,
      signalKey: "trade_mode",
      values: proposal.tradeModes,
    }),
    ...signalRowsForValues({
      allowedFieldKey: "verification_preferences",
      expiresAt,
      profileId,
      signalKey: "verification_preference",
      values: proposal.verificationPreferences,
    }),
    ...signalRowsForValues({
      allowedFieldKey: "availability_context",
      expiresAt,
      profileId,
      signalKey: "availability_hint",
      values: [
        ...proposal.availabilityHints,
        ...(proposal.coarseLocation ? [`coarse_location:${proposal.coarseLocation}`] : []),
      ],
    }),
    ...signalRowsForValues({
      allowedFieldKey: "safety_constraints",
      expiresAt,
      profileId,
      signalKey: "broad_constraint",
      values: proposal.broadConstraints,
    }),
  ];
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.allowed_field_key}:${row.signal_key}:${row.signal_value}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
