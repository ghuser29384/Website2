import { smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  normalizeSmartQueryText,
  parseSmartQuery,
  smartQueryTokens,
} from "@/lib/smart-query";
import {
  directSemanticTextScore,
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];

export interface WishRegistrySearchOptions {
  cause?: string;
  limit?: number;
  opennessToPayment?: boolean;
  opennessToPledges?: boolean;
  participantKind?: string;
  personalPriorities?: readonly string[];
  privacyStage?: string;
  query?: string;
  region?: string;
}

export interface WishRegistrySearchResult {
  causes: string[];
  collectiveName: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  opennessToPayment: boolean;
  opennessToPledges: boolean;
  participantKind: string;
  privacyStage: string;
  profileId: string;
  publicPreview: string | null;
  score: number;
  sharedTokens: string[];
}

export type WishRegistryCompatibilityBand = "High" | "Moderate" | "Tentative" | "Exploratory";

export interface PublicWishRegistrySearchResult
  extends Omit<WishRegistrySearchResult, "score"> {
  compatibilityBand: WishRegistryCompatibilityBand;
  compatibilityExplanation: string;
}

export interface WishRegistryExamplePreview {
  causes: readonly string[];
  location: string;
  name: string;
  openness: readonly string[];
  participantKind: string;
  preview: string;
}

export function normalizeWishRegistryText(value: string) {
  return normalizeSmartQueryText(value);
}

export function getWishRegistryTokens(value: string) {
  return new Set(smartQueryTokens(value).filter((token) => token.length > 3));
}

export function getWishRegistryRedactedOverlapTokens(tokens: readonly string[]) {
  return tokens.map((_, index) => `broad_language_overlap_${index + 1}`);
}

export function getWishRegistryCompatibilityBand(score: number): WishRegistryCompatibilityBand {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  if (score > 0) return "Tentative";
  return "Exploratory";
}

export function toPublicWishRegistrySearchResult({
  score,
  ...result
}: WishRegistrySearchResult): PublicWishRegistrySearchResult {
  return {
    ...result,
    compatibilityBand: getWishRegistryCompatibilityBand(score),
    compatibilityExplanation:
      "Broad compatibility band from public preview fields; not moral worth or a platform ranking.",
  };
}

function exampleFields(preview: WishRegistryExamplePreview) {
  return [
    { value: preview.causes.join(" "), weight: 1 },
    { value: preview.preview, weight: 0.92 },
    { value: preview.name, weight: 0.75 },
    { value: preview.location, weight: 0.68 },
    { value: `${preview.participantKind} ${preview.openness.join(" ")}`, weight: 0.62 },
  ] as const;
}

function hasUnsupportedWishConstraints(query: string) {
  const facets = parseSmartQuery(query, { surface: "wishes" }).facets;
  return Boolean(
    facets.verified !== null ||
      facets.minAmountCents !== null ||
      facets.maxAmountCents !== null ||
      facets.deadlineBefore ||
      facets.deadlineAfter ||
      facets.actionTypes.length ||
      facets.evidenceStates.length ||
      facets.poolKinds.length ||
      facets.minCredit !== null,
  );
}

export function filterWishRegistryExamplePreviews<TPreview extends WishRegistryExamplePreview>(
  previews: readonly TPreview[],
  {
    cause = "",
    opennessToPayment = false,
    opennessToPledges = false,
    query = "",
  }: Pick<
    WishRegistrySearchOptions,
    "cause" | "opennessToPayment" | "opennessToPledges" | "query"
  > = {},
) {
  const interpretation = parseSmartQuery(query, { surface: "wishes" });
  const normalizedCause = normalizeWishRegistryText(cause);
  const requirePayment = opennessToPayment || interpretation.facets.openToPayment === true;
  const requirePledges = opennessToPledges || interpretation.facets.openToPledges === true;
  if (hasUnsupportedWishConstraints(query)) return [];

  return previews
    .map((preview, index) => {
      const fields = exampleFields(preview);
      const semantic = smartInterpretationScore(interpretation, fields);
      const explicitCause = normalizedCause
        ? directSemanticTextScore(normalizedCause, [{ value: preview.causes.join(" "), weight: 1 }])
        : 1;
      const smartCause = smartCauseMatchScore(interpretation.facets.causes, fields);
      return { explicitCause, index, preview, semantic, smartCause };
    })
    .filter(({ explicitCause, preview, semantic, smartCause }) => {
      if (
        requirePayment &&
        !preview.openness.some((entry) => normalizeWishRegistryText(entry) === "payment-open")
      ) {
        return false;
      }
      if (
        requirePledges &&
        !preview.openness.some((entry) => normalizeWishRegistryText(entry) === "pledge-open")
      ) {
        return false;
      }
      if (
        interpretation.facets.participantKinds.length &&
        !interpretation.facets.participantKinds.includes(
          preview.participantKind as "individual" | "collective" | "institution",
        )
      ) {
        return false;
      }
      if (
        interpretation.facets.location &&
        !normalizeWishRegistryText(preview.location).includes(
          normalizeWishRegistryText(interpretation.facets.location),
        )
      ) {
        return false;
      }
      if (explicitCause < 0.42 || smartCause < 0.42) return false;
      const semanticRequired = Boolean(
        interpretation.residualTerms.length || interpretation.facets.causes.length,
      );
      return !semanticRequired || semantic >= 0.16;
    })
    .sort((left, right) => right.semantic - left.semantic || left.index - right.index)
    .map(({ preview }) => preview);
}

function toCauses(preview: WishProfilePreviewRow) {
  return Array.isArray(preview.causes) ? preview.causes.filter(Boolean) : [];
}

function previewFields(preview: WishProfilePreviewRow, causes: readonly string[]) {
  return [
    { value: causes.join(" "), weight: 1 },
    { value: preview.public_preview, weight: 0.94 },
    { value: preview.collective_name, weight: 0.78 },
    { value: `${preview.location_city ?? ""} ${preview.location_region ?? ""}`, weight: 0.7 },
    { value: `${preview.participant_kind} ${preview.privacy_stage}`, weight: 0.58 },
  ] as const;
}

function toSearchResult(
  preview: WishProfilePreviewRow,
  score: number,
  sharedTokens: string[],
): WishRegistrySearchResult {
  return {
    profileId: preview.profile_id,
    participantKind: preview.participant_kind,
    collectiveName: preview.collective_name,
    causes: toCauses(preview),
    publicPreview: preview.public_preview,
    locationCity: preview.location_city,
    locationRegion: preview.location_region,
    opennessToPayment: Boolean(preview.openness_to_payment),
    opennessToPledges: Boolean(preview.openness_to_pledges),
    privacyStage: preview.privacy_stage,
    score,
    sharedTokens: getWishRegistryRedactedOverlapTokens(sharedTokens),
  };
}

export async function searchWishRegistryPreviews({
  cause = "",
  limit = 20,
  opennessToPayment = false,
  opennessToPledges = false,
  participantKind = "",
  personalPriorities = [],
  privacyStage = "",
  query = "",
  region = "",
}: WishRegistrySearchOptions = {}) {
  const interpretation = parseSmartQuery(query, { surface: "wishes" });
  const normalizedCause = normalizeWishRegistryText(cause);
  const effectiveRegion = region || interpretation.facets.location || "";
  const normalizedRegion = normalizeWishRegistryText(effectiveRegion);
  const requirePayment = opennessToPayment || interpretation.facets.openToPayment === true;
  const requirePledges = opennessToPledges || interpretation.facets.openToPledges === true;
  const permittedKinds = participantKind
    ? [participantKind]
    : interpretation.facets.participantKinds;
  const queryTokens = interpretation.residualTerms;
  const safeLimit = Math.min(50, Math.max(1, limit));

  if (hasUnsupportedWishConstraints(query)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wish_profile_previews")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(error.message);

  return ((data ?? []) as WishProfilePreviewRow[])
    .map((preview, index) => {
      const causes = toCauses(preview);
      const fields = previewFields(preview, causes);
      const semanticRelevance = smartInterpretationScore(interpretation, fields);
      const explicitCauseScore = normalizedCause
        ? directSemanticTextScore(normalizedCause, [{ value: causes.join(" "), weight: 1 }])
        : 1;
      const smartCauseScore = smartCauseMatchScore(interpretation.facets.causes, fields);
      const locationText = normalizeWishRegistryText(
        `${preview.location_city ?? ""} ${preview.location_region ?? ""}`,
      );
      const regionMatch = normalizedRegion ? locationText.includes(normalizedRegion) : true;
      const publicText = normalizeWishRegistryText(
        `${preview.public_preview ?? ""} ${causes.join(" ")}`,
      );
      const sharedTokens = queryTokens.filter((token) => publicText.includes(token));
      const causeIds = parseSmartQuery(causes.join(" "), { surface: "wishes" }).facets.causes;
      const score = smartDiscoveryScore({
        semanticRelevance,
        evidenceQuality: 0,
        personalMoralFit: smartPersonalPriorityScore(causeIds, personalPriorities),
        deadlineUrgency: 0,
        credit: 0,
      });
      return {
        explicitCauseScore,
        index,
        preview,
        regionMatch,
        score,
        semanticRelevance,
        sharedTokens,
        smartCauseScore,
      };
    })
    .filter(({ explicitCauseScore, preview, regionMatch, semanticRelevance, smartCauseScore }) => {
      if (requirePayment && !preview.openness_to_payment) return false;
      if (requirePledges && !preview.openness_to_pledges) return false;
      if (permittedKinds.length && !permittedKinds.includes(preview.participant_kind)) return false;
      if (privacyStage && preview.privacy_stage !== privacyStage) return false;
      if (!regionMatch) return false;
      if (explicitCauseScore < 0.42 || smartCauseScore < 0.42) return false;
      const semanticRequired = Boolean(
        interpretation.residualTerms.length || interpretation.facets.causes.length,
      );
      return !semanticRequired || semanticRelevance >= 0.16;
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.semanticRelevance - left.semanticRelevance ||
        left.index - right.index,
    )
    .slice(0, safeLimit)
    .map(({ preview, score, sharedTokens }) =>
      toSearchResult(preview, Math.round(score * 100), sharedTokens),
    );
}
