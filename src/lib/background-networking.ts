import type { Database } from "@/lib/supabase/database.types";

type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type ProfileSourceRow = Database["public"]["Tables"]["profile_sources"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];

export interface DeterministicSignals {
  askTerms: string[];
  capabilityTags: string[];
  confidenceScore: number;
  constraintFlags: string[];
  missingFields: string[];
  offerTerms: string[];
  sourceCount: number;
  uncertaintyFlags: string[];
}

export interface DeterministicMatchEvaluation {
  compatibilityTags: string[];
  counterpartyReason: string;
  riskNotes: string;
  score: number;
  sharedCauses: string[];
  sharedTokens: string[];
  suggestedFirstStep: string;
  viewerReason: string;
}

export interface DeterministicMatchInput {
  counterparty: WishProfilePreviewRow;
  counterpartySignals?: DeterministicSignals | null;
  runLabel?: string;
  viewer: {
    askText?: string;
    askTerms?: string[];
    brokeragePreference?: string;
    causes: string[];
    capabilityTags?: string[];
    collectiveName?: string;
    locationCity?: string | null;
    locationRegion?: string | null;
    offerTerms?: string[];
    offerText?: string;
    openToPayment: boolean;
    openToPledges: boolean;
    participantKind?: string | null;
    privacyStage?: string | null;
    publicPreview?: string;
    signals?: DeterministicSignals | null;
    sourceCount?: number;
    wishText?: string;
  };
}

export interface DeterministicSynthesisPayload {
  ask_terms: string[];
  capabilities: string;
  capability_tags: string[];
  cause_priorities: string[];
  confidence_breakdown: Record<string, number>;
  confidence_score: number;
  constraints: string;
  constraint_flags: string[];
  hopes: string;
  intent: string;
  missing_fields: string[];
  offer_terms: string[];
  source_count: number;
  synthesis_version: string;
  uncertainty: string;
  uncertainty_flags: string[];
}

export function normalizeBackgroundToken(value: string) {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function truncateBackgroundText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

export function getBackgroundTokens(value: string, maxCount = 24) {
  const stopWords = new Set([
    "about",
    "after",
    "against",
    "because",
    "being",
    "could",
    "every",
    "first",
    "however",
    "might",
    "other",
    "people",
    "should",
    "their",
    "there",
    "these",
    "those",
    "trade",
    "moral",
    "would",
  ]);

  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/\W+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 3 && !stopWords.has(token)),
    ),
  ].slice(0, maxCount);
}

function summarizeLines(values: string[], fallback: string, maxLength = 420) {
  const compactValues = values
    .map((value) => truncateBackgroundText(value, 180))
    .filter(Boolean);

  if (!compactValues.length) {
    return fallback;
  }

  return truncateBackgroundText(compactValues.join(" / "), maxLength);
}

function containsAny(text: string, patterns: string[]) {
  const normalized = normalizeBackgroundToken(text);
  return patterns.some((pattern) => normalized.includes(pattern));
}

function buildConstraintFlags(values: string[]) {
  const text = values.join(" ").toLowerCase();
  const flags = [
    containsAny(text, ["anonymous", "pseudonym", "private", "privacy"]) ? "privacy" : "",
    containsAny(text, ["receipt", "evidence", "verify", "attest", "proof"]) ? "verification" : "",
    containsAny(text, ["monthly", "weekly", "daily", "cadence", "schedule", "timeline"]) ? "cadence" : "",
    containsAny(text, ["legal", "lawful", "compliance", "law"]) ? "legal" : "",
    containsAny(text, ["escrow", "refund", "dispute", "breach"]) ? "dispute_safeguards" : "",
    containsAny(text, ["contact", "email", "phone", "identity"]) ? "contact_sharing" : "",
    containsAny(text, ["local", "city", "region", "in person"]) ? "location_sensitive" : "",
    containsAny(text, ["collective", "institution", "team", "board", "approval"]) ? "collective_authority" : "",
  ].filter(Boolean);

  return uniqueStrings(flags).slice(0, 8);
}

function buildUncertaintyFlags(values: string[], missingFields: string[]) {
  const text = values.join(" ").toLowerCase();
  const flags = [
    containsAny(text, ["uncertain", "unsure", "not sure", "unclear"]) ? "stated_uncertainty" : "",
    containsAny(text, ["need evidence", "need proof", "need more detail"]) ? "needs_evidence" : "",
    containsAny(text, ["speculative", "early", "draft"]) ? "speculative" : "",
    missingFields.length >= 4 ? "underspecified" : "",
    missingFields.includes("sources") ? "missing_sources" : "",
    missingFields.includes("verification_preferences") ? "missing_verification" : "",
  ].filter(Boolean);

  return uniqueStrings(flags).slice(0, 8);
}

function buildMissingFields({
  asks,
  capabilities,
  causes,
  constraints,
  locationCity,
  locationRegion,
  offers,
  publicPreview,
  sourceCount,
  verificationPreferences,
  wishes,
}: {
  asks: string[];
  capabilities: string;
  causes: string[];
  constraints: string;
  locationCity?: string | null;
  locationRegion?: string | null;
  offers: string[];
  publicPreview: string;
  sourceCount: number;
  verificationPreferences: string;
  wishes: string[];
}) {
  return [
    causes.length ? "" : "causes",
    wishes.length ? "" : "wishes",
    offers.length || capabilities ? "" : "offers_or_capabilities",
    asks.length ? "" : "asks",
    constraints ? "" : "constraints",
    verificationPreferences ? "" : "verification_preferences",
    sourceCount ? "" : "sources",
    publicPreview ? "" : "public_preview",
    locationCity || locationRegion ? "" : "location",
  ].filter(Boolean);
}

export function buildDeterministicSynthesis({
  connections,
  entries,
  profile,
  profileSources,
}: {
  connections: SourceConnectionRow[];
  entries: WishEntryRow[];
  profile: WishProfileRow;
  profileSources: ProfileSourceRow[];
}): DeterministicSynthesisPayload {
  const wishes = entries.filter((entry) => entry.entry_type === "wish").map((entry) => entry.body);
  const offers = entries.filter((entry) => entry.entry_type === "offer").map((entry) => entry.body);
  const asks = entries.filter((entry) => entry.entry_type === "ask").map((entry) => entry.body);
  const sourceCount = profileSources.length + connections.length;
  const missingFields = buildMissingFields({
    asks,
    capabilities: profile.capabilities,
    causes: profile.causes ?? [],
    constraints: profile.constraints,
    locationCity: profile.location_city,
    locationRegion: profile.location_region,
    offers,
    publicPreview: profile.public_preview,
    sourceCount,
    verificationPreferences: profile.verification_preferences,
    wishes,
  });

  const causeScore = profile.causes.length ? 22 : 0;
  const wishScore = wishes.length ? 18 : 0;
  const offerScore = offers.length || profile.capabilities ? 15 : 0;
  const askScore = asks.length ? 15 : 0;
  const constraintScore = profile.constraints ? 10 : 0;
  const verificationScore = profile.verification_preferences ? 8 : 0;
  const previewScore = profile.public_preview ? 7 : 0;
  const sourceScore = Math.min(5, sourceCount);
  const confidenceScore = clamp(
    causeScore +
      wishScore +
      offerScore +
      askScore +
      constraintScore +
      verificationScore +
      previewScore +
      sourceScore,
    0,
    100,
  );

  const offerTerms = getBackgroundTokens(`${profile.capabilities} ${offers.join(" ")}`, 16);
  const askTerms = getBackgroundTokens(`${asks.join(" ")} ${wishes.join(" ")}`, 16);
  const capabilityTags = uniqueStrings([...offerTerms, ...getBackgroundTokens(profile.capabilities, 10)]).slice(
    0,
    16,
  );
  const constraintFlags = buildConstraintFlags([
    profile.constraints,
    profile.verification_preferences,
    profile.brokerage_preference,
  ]);
  const uncertaintyFlags = buildUncertaintyFlags(
    [profile.uncertainty_notes, ...profileSources.map((source) => source.notes)],
    missingFields,
  );

  return {
    hopes: summarizeLines(
      [
        profile.causes.length ? `Cause priorities: ${profile.causes.join(", ")}` : "",
        ...wishes,
      ],
      "No concrete hopes have been stated yet.",
    ),
    intent: summarizeLines(
      [
        asks.length ? `Asks: ${asks.join(" / ")}` : "",
        profile.openness_to_payment ? "Open to payment-mediated trades." : "",
        profile.openness_to_pledges ? "Open to pledge-based trades." : "",
        profile.brokerage_preference ? `Brokerage preference: ${profile.brokerage_preference}` : "",
      ],
      "Intent is underspecified.",
    ),
    capabilities: summarizeLines(
      [profile.capabilities, ...offers, ...profileSources.map((source) => source.snapshot_excerpt || source.notes)],
      "No capabilities or offers have been stated yet.",
    ),
    constraints: summarizeLines(
      [profile.constraints, profile.verification_preferences],
      "No constraints or verification preferences have been stated yet.",
    ),
    uncertainty: summarizeLines(
      [
        profile.uncertainty_notes,
        missingFields.length ? `Missing fields: ${missingFields.join(", ")}` : "",
      ],
      "No uncertainty notes have been stated yet.",
    ),
    confidence_score: confidenceScore,
    source_count: sourceCount,
    synthesis_version: "deterministic-v2",
    cause_priorities: (profile.causes ?? []).slice(0, 10),
    offer_terms: offerTerms,
    ask_terms: askTerms,
    capability_tags: capabilityTags,
    constraint_flags: constraintFlags,
    uncertainty_flags: uncertaintyFlags,
    missing_fields: missingFields,
    confidence_breakdown: {
      ask: askScore,
      cause: causeScore,
      constraints: constraintScore,
      offers: offerScore,
      preview: previewScore,
      sources: sourceScore,
      verification: verificationScore,
      wishes: wishScore,
    },
  };
}

export function getDeterministicSignalsFromSynthesis(
  synthesis: ProfileSynthesisRow | null | undefined,
): DeterministicSignals | null {
  if (!synthesis) {
    return null;
  }

  return {
    askTerms: synthesis.ask_terms ?? [],
    capabilityTags: synthesis.capability_tags ?? [],
    confidenceScore: synthesis.confidence_score ?? 0,
    constraintFlags: synthesis.constraint_flags ?? [],
    missingFields: synthesis.missing_fields ?? [],
    offerTerms: synthesis.offer_terms ?? [],
    sourceCount: synthesis.source_count ?? 0,
    uncertaintyFlags: synthesis.uncertainty_flags ?? [],
  };
}

export function buildDeterministicClarificationQuestions({
  backgroundSearchEnabled,
  capabilities,
  causes,
  collectiveName,
  constraints,
  locationCity,
  locationRegion,
  manualSourceReviewEnabled,
  offers,
  openToPayment,
  openToPledges,
  participantKind,
  profileId,
  publicPreview,
  sourceCount,
  uncertaintyNotes,
  verificationPreferences,
  wishText,
  askText,
}: {
  askText: string;
  backgroundSearchEnabled: boolean;
  capabilities: string;
  causes: string[];
  collectiveName: string;
  constraints: string;
  locationCity?: string | null;
  locationRegion?: string | null;
  manualSourceReviewEnabled: boolean;
  offers: string[];
  openToPayment: boolean;
  openToPledges: boolean;
  participantKind: WishProfileRow["participant_kind"];
  profileId: string;
  publicPreview: string;
  sourceCount: number;
  uncertaintyNotes: string;
  verificationPreferences: string;
  wishText: string;
}): Database["public"]["Tables"]["clarification_questions"]["Insert"][] {
  const questions: Database["public"]["Tables"]["clarification_questions"]["Insert"][] = [];

  if (!causes.length) {
    questions.push({
      profile_id: profileId,
      question: "Which cause areas matter most for possible moral trades?",
      reason: "Cause areas remain the strongest deterministic filter for plausible counterparties.",
    });
  }

  if (!wishText) {
    questions.push({
      profile_id: profileId,
      question: "What concrete change would you most like another person or group to help bring about?",
      reason: "Specific wishes let the background matcher distinguish serious opportunities from noise.",
    });
  }

  if (!offers.length && !capabilities) {
    questions.push({
      profile_id: profileId,
      question: "What resources, actions, commitments, or introductions could you realistically offer?",
      reason: "Counterparties need something concrete to trade against your ask.",
    });
  }

  if (!askText) {
    questions.push({
      profile_id: profileId,
      question: "What would you actually ask a counterparty to do if a match looked promising?",
      reason: "Explicit asks are needed for complementarity scoring and intro planning.",
    });
  }

  if (!constraints) {
    questions.push({
      profile_id: profileId,
      question: "What proposals should be ruled out before any introduction is made?",
      reason: "Constraints are a first-pass safety and privacy filter.",
    });
  }

  if (!verificationPreferences) {
    questions.push({
      profile_id: profileId,
      question: "What evidence, receipts, check-ins, or attestations would make a trade credible enough?",
      reason: "Verification preferences reduce factual-trust failures before people share details.",
    });
  }

  if ((openToPayment || openToPledges) && !containsAny(`${wishText} ${askText} ${constraints}`, [
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "cadence",
    "schedule",
    "40 days",
    "payment",
    "pledge",
  ])) {
    questions.push({
      profile_id: profileId,
      question: "If a trade involved money or pledges, what cadence or time range would be acceptable?",
      reason: "Payment-mediated trades need bounded cadence and duration before serious introductions.",
    });
  }

  if (participantKind !== "individual" && !collectiveName) {
    questions.push({
      profile_id: profileId,
      question: "What is the name of the collective or institution, and who is authorized to speak for it?",
      reason: "Group-level matching is hard to trust without clear authority and identity boundaries.",
    });
  }

  if (backgroundSearchEnabled && !publicPreview) {
    questions.push({
      profile_id: profileId,
      question: "What broad public preview can the registry show before any consented introduction?",
      reason: "A short preview helps searches surface you without exposing exact wishes.",
    });
  }

  if (manualSourceReviewEnabled && sourceCount === 0) {
    questions.push({
      profile_id: profileId,
      question: "Which public source, profile, essay, or note should be attached for manual review?",
      reason: "Manual source review works only if there is at least one source to inspect.",
    });
  }

  if (!uncertaintyNotes) {
    questions.push({
      profile_id: profileId,
      question: "Where are you still uncertain enough that a clarifying conversation would help?",
      reason: "Uncertainty notes help the system ask only the next most useful non-AI questions.",
    });
  }

  return questions.slice(0, 8);
}

function collectCompatibilityTags({
  askOfferOverlap,
  geographicOverlap,
  participantComplement,
  paymentCompatible,
  pledgeCompatible,
  privacyAligned,
  sharedCauseCount,
  sourceSupported,
  verificationReady,
}: {
  askOfferOverlap: string[];
  geographicOverlap: string[];
  participantComplement: string[];
  paymentCompatible: boolean;
  pledgeCompatible: boolean;
  privacyAligned: boolean;
  sharedCauseCount: number;
  sourceSupported: boolean;
  verificationReady: boolean;
}) {
  return uniqueStrings([
    sharedCauseCount ? "cause_overlap" : "",
    askOfferOverlap.length ? "ask_offer_complement" : "",
    paymentCompatible ? "payment_compatible" : "",
    pledgeCompatible ? "pledge_compatible" : "",
    verificationReady ? "verification_ready" : "",
    privacyAligned ? "privacy_aligned" : "",
    sourceSupported ? "source_supported" : "",
    geographicOverlap.length ? "geographic_overlap" : "",
    participantComplement.length ? "participant_complement" : "",
  ]);
}

export function evaluateDeterministicMatch({
  counterparty,
  counterpartySignals,
  runLabel = "rule-based",
  viewer,
}: DeterministicMatchInput): DeterministicMatchEvaluation {
  const viewerSignals = viewer.signals ?? null;
  const counterpartyText = `${counterparty.public_preview ?? ""} ${(counterparty.causes ?? []).join(" ")}`;
  const viewerText = `${viewer.publicPreview ?? ""} ${viewer.wishText ?? ""} ${viewer.askText ?? ""} ${viewer.offerText ?? ""} ${viewer.brokeragePreference ?? ""}`;
  const viewerTokens = getBackgroundTokens(viewerText, 18);
  const counterpartyTokens = new Set(getBackgroundTokens(counterpartyText, 18));
  const sharedTokenCount = viewerTokens.filter((token) => counterpartyTokens.has(token)).slice(0, 6).length;
  const sharedTokens = Array.from(
    { length: sharedTokenCount },
    (_, index) => `broad_language_overlap_${index + 1}`,
  );
  const sharedCauses = viewer.causes.filter((cause) =>
    (counterparty.causes ?? []).map(normalizeBackgroundToken).includes(normalizeBackgroundToken(cause)),
  );

  const viewerAskTerms = viewer.askTerms ?? viewerSignals?.askTerms ?? getBackgroundTokens(viewer.askText ?? "", 12);
  const viewerOfferTerms =
    viewer.offerTerms ?? viewerSignals?.offerTerms ?? getBackgroundTokens(viewer.offerText ?? "", 12);
  const viewerCapabilityTags =
    viewer.capabilityTags ??
    viewerSignals?.capabilityTags ??
    getBackgroundTokens(`${viewer.offerText ?? ""} ${viewer.publicPreview ?? ""}`, 12);
  const counterpartyOfferTerms = counterpartySignals?.offerTerms ?? [];
  const counterpartyAskTerms = counterpartySignals?.askTerms ?? [];
  const counterpartyCapabilityTags = counterpartySignals?.capabilityTags ?? [];
  const verificationReady =
    !viewerSignals?.missingFields.includes("verification_preferences") &&
    !counterpartySignals?.missingFields.includes("verification_preferences");
  const viewerPrivacyStage = viewer.privacyStage ?? "broad";
  const privacyAligned = viewerPrivacyStage === counterparty.privacy_stage;
  const sourceSupported = (viewer.sourceCount ?? viewerSignals?.sourceCount ?? 0) > 0 &&
    (counterpartySignals?.sourceCount ?? 0) > 0;

  const askOfferOverlap = uniqueStrings([
    ...viewerAskTerms.filter((term) =>
      [...counterpartyCapabilityTags, ...counterpartyOfferTerms].includes(term),
    ),
    ...viewerOfferTerms.filter((term) => counterpartyAskTerms.includes(term)),
    ...viewerCapabilityTags.filter((term) => counterpartyAskTerms.includes(term)),
  ]).slice(0, 6);

  const paymentCompatible = viewer.openToPayment && counterparty.openness_to_payment;
  const pledgeCompatible = viewer.openToPledges && counterparty.openness_to_pledges;
  const geographicOverlap = uniqueStrings([
    viewer.locationCity &&
    counterparty.location_city &&
    normalizeBackgroundToken(viewer.locationCity) === normalizeBackgroundToken(counterparty.location_city)
      ? `Same city: ${counterparty.location_city}`
      : "",
    viewer.locationRegion &&
    counterparty.location_region &&
    normalizeBackgroundToken(viewer.locationRegion) === normalizeBackgroundToken(counterparty.location_region)
      ? `Same region: ${counterparty.location_region}`
      : "",
  ]);
  const participantComplement =
    viewer.participantKind &&
    counterparty.participant_kind &&
    viewer.participantKind !== counterparty.participant_kind &&
    (viewer.participantKind !== "individual" || counterparty.participant_kind !== "individual")
      ? [`${viewer.participantKind} / ${counterparty.participant_kind} complement`]
      : [];
  const locationSensitiveWithoutOverlap =
    (viewerSignals?.constraintFlags.includes("location_sensitive") ||
      counterpartySignals?.constraintFlags.includes("location_sensitive")) &&
    geographicOverlap.length === 0;
  const collectiveAuthorityNeedsReview =
    counterparty.participant_kind !== "individual" &&
    (!counterparty.collective_name ||
      counterpartySignals?.constraintFlags.includes("collective_authority") ||
      viewerSignals?.constraintFlags.includes("collective_authority"));

  const score = clamp(
    sharedCauses.length * 18 +
      Math.min(sharedTokenCount, 4) * 5 +
      Math.min(askOfferOverlap.length, 3) * 10 +
      (paymentCompatible ? 12 : 0) +
      (pledgeCompatible ? 10 : 0) +
      (verificationReady ? 6 : 0) +
      (privacyAligned ? 4 : 0) +
      (sourceSupported ? 4 : 0) +
      (geographicOverlap.some((value) => value.startsWith("Same city")) ? 10 : 0) +
      (geographicOverlap.some((value) => value.startsWith("Same region")) ? 6 : 0) +
      (participantComplement.length ? 6 : 0) +
      Math.min(6, Math.floor((counterpartySignals?.confidenceScore ?? 0) / 20)) -
      (locationSensitiveWithoutOverlap ? 8 : 0) -
      (collectiveAuthorityNeedsReview ? 4 : 0),
    0,
    100,
  );

  const compatibilityTags = collectCompatibilityTags({
    askOfferOverlap,
    geographicOverlap,
    participantComplement,
    paymentCompatible,
    pledgeCompatible,
    privacyAligned,
    sharedCauseCount: sharedCauses.length,
    sourceSupported,
    verificationReady,
  });

  const basis = [
    sharedCauses.length ? `Shared broad cause overlap count: ${sharedCauses.length}` : "",
    askOfferOverlap.length ? `Possible complementarity count: ${askOfferOverlap.length}` : "",
    sharedTokenCount ? "Shared broad language overlap" : "",
    paymentCompatible ? "Both sides allow payment-mediated trades" : "",
    pledgeCompatible ? "Both sides allow pledge-mediated trades" : "",
    verificationReady ? "Both sides have verification preferences recorded" : "",
    privacyAligned ? `Both sides use ${counterparty.privacy_stage} privacy previews` : "",
    sourceSupported ? "Both sides attached source material or connection records" : "",
    geographicOverlap.length ? `Coarse geography overlap count: ${geographicOverlap.length}` : "",
    participantComplement.length ? "Participant-type complement" : "",
    `Generated by deterministic scan: ${runLabel}`,
  ].filter(Boolean);

  const viewerReason = askOfferOverlap.length
    ? `A possible counterparty may satisfy ${askOfferOverlap.length} broad ask/offer compatibility signal(s) while fitting your stated causes and trade constraints.`
    : sharedCauses.length
      ? `A possible counterparty shares ${sharedCauses.join(", ")} and has a broad preview that looks compatible enough to explore further.`
      : `A possible counterparty appears compatible on broad signals, but exact wishes should remain private until consent.`;

  const counterpartyReason = askOfferOverlap.length
    ? "A possible counterparty has broad ask or capability factors that could complement yours if both sides opt in."
    : sharedCauses.length
      ? `A possible counterparty appears aligned on ${sharedCauses.join(", ")} without revealing exact wishes yet.`
      : "A possible counterparty matches on broad registry signals without revealing exact wishes yet.";

  const suggestedFirstStep = askOfferOverlap.length
    ? "Start with a bounded proposal: requested action, offered consideration, cadence or duration, verification evidence, and exit conditions."
    : paymentCompatible || pledgeCompatible
      ? "Compare a simple trade sketch with action, cadence, payment or pledge amount, verification, and privacy boundaries."
      : "Exchange a brief coordination note covering the desired action, burden, verification, privacy boundaries, and off-ramp.";

  const riskNotes = [
    basis.length <= 2 ? "Match is based on limited broad signals; verify fit before sharing identity." : "",
    (viewerSignals?.missingFields.length ?? 0) >= 4 || (counterpartySignals?.missingFields.length ?? 0) >= 4
      ? "One side still has an underspecified profile; answer clarification questions before relying on this match."
      : "",
    counterpartySignals?.constraintFlags.includes("privacy") || viewerSignals?.constraintFlags.includes("privacy")
      ? "Respect privacy constraints and avoid sharing contact details until a grant or mutual consent exists."
      : "",
    locationSensitiveWithoutOverlap
      ? "At least one side marked location-sensitive constraints, but no geographic overlap is yet visible."
      : "",
    collectiveAuthorityNeedsReview
      ? "A collective or institution may be involved; confirm delegated authority before treating this as a live commitment."
      : "",
    !sourceSupported
      ? "At least one side still lacks attached source material or connection records, so fit should be treated as provisional."
      : "",
    paymentCompatible
      ? "If money is involved, agree on cadence, receipts, and dispute handling before acting."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    compatibilityTags,
    counterpartyReason,
    riskNotes,
    score,
    sharedCauses,
    sharedTokens,
    suggestedFirstStep,
    viewerReason: viewerReason + (basis.length ? ` ${basis[0]}.` : ""),
  };
}
