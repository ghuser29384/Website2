import { createClient } from "@/lib/supabase/server";
import { isPostgresUuid } from "@/lib/uuid";

export const FEED_CREATE_IMPORTED_FIELDS = [
  "counterparty",
  "offered_cause",
  "requested_cause",
  "proposed_action",
  "requested_action",
  "duration",
  "evidence_rule",
] as const;

export type FeedCreateImportedField = (typeof FEED_CREATE_IMPORTED_FIELDS)[number];
export type FeedCreateEventType =
  | "action_shown"
  | "action_clicked"
  | "create_opened"
  | "draft_saved"
  | "proposal_submitted"
  | "trade_completed";

export interface FeedCreateRequest {
  opportunityType: "offer";
  opportunityId: string;
  exposureRequestId: string;
  sourceRevision: number;
}

export interface FeedCreateSourceSnapshot {
  ownerAlias: string;
  offeredCause: string;
  requestedCause: string;
  offerAction: string;
  requestAction: string;
  verification: string;
  duration: string;
  termsVersion: number;
  publishedAt: string;
}

export interface ResolvedFeedCreateSource {
  request: FeedCreateRequest;
  exposureId: string;
  sourceOwnerId: string;
  counterpartyName: string;
  sourceUrl: string;
  duplicateDraftCount: number;
  sourceSnapshot: FeedCreateSourceSnapshot;
  initialValues: {
    offeredCause: string;
    requestedCause: string;
    proposedAction: string;
    requestedAction: string;
    duration: string;
    evidenceRule: string;
  };
  matchContextStorageKey: string;
}

export interface FeedCreateSourceFailure {
  code:
    | "invalid_request"
    | "receipt_missing"
    | "source_missing"
    | "source_ineligible"
    | "source_stale"
    | "source_owner_mismatch"
    | "source_is_own"
    | "source_incomplete"
    | "unavailable";
  message: string;
}

export type FeedCreateSourceResult =
  | { ok: true; source: ResolvedFeedCreateSource }
  | { ok: false; failure: FeedCreateSourceFailure };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function feedCreateRequestFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): FeedCreateRequest | null {
  const requested = first(searchParams.fromFeed) === "1";
  if (!requested) return null;

  const opportunityType = first(searchParams.sourceType);
  const opportunityId = first(searchParams.sourceId);
  const exposureRequestId = first(searchParams.exposureRequestId);
  const sourceRevision = integer(first(searchParams.sourceRevision));
  if (
    opportunityType !== "offer" ||
    !isPostgresUuid(opportunityId) ||
    !isPostgresUuid(exposureRequestId) ||
    sourceRevision === null ||
    sourceRevision < 1
  ) {
    return {
      opportunityType: "offer",
      opportunityId: "",
      exposureRequestId: "",
      sourceRevision: 0,
    };
  }

  return {
    opportunityType,
    opportunityId,
    exposureRequestId,
    sourceRevision,
  };
}

export function isValidFeedCreateRequest(request: FeedCreateRequest) {
  return (
    request.opportunityType === "offer" &&
    isPostgresUuid(request.opportunityId) &&
    isPostgresUuid(request.exposureRequestId) &&
    Number.isSafeInteger(request.sourceRevision) &&
    request.sourceRevision > 0
  );
}

export function feedCreateReturnTo(request: FeedCreateRequest) {
  const query = new URLSearchParams({
    fromFeed: "1",
    sourceType: request.opportunityType,
    sourceId: request.opportunityId,
    exposureRequestId: request.exposureRequestId,
    sourceRevision: String(request.sourceRevision),
  });
  return `/trades/new?${query.toString()}`;
}

export function feedCreateMatchContextStorageKey(request: FeedCreateRequest) {
  return [
    "moral_trade_feed_create_context_v1",
    request.exposureRequestId,
    request.opportunityType,
    request.opportunityId,
    request.sourceRevision,
  ].join(":");
}

interface ExposureRecord {
  id?: unknown;
  profile_id?: unknown;
  request_id?: unknown;
  opportunity_type?: unknown;
  opportunity_id?: unknown;
  owner_id?: unknown;
  rank?: unknown;
  was_shown?: unknown;
}

interface OfferRecord {
  id?: unknown;
  owner_id?: unknown;
  owner_alias?: unknown;
  mode?: unknown;
  offered_cause?: unknown;
  requested_cause?: unknown;
  offer_action?: unknown;
  request_action?: unknown;
  verification?: unknown;
  duration?: unknown;
  status?: unknown;
  workflow_status?: unknown;
  published_at?: unknown;
  closed_at?: unknown;
  deleted_at?: unknown;
  terms_version?: unknown;
}

export function evaluateFeedCreateSourceRecords(input: {
  request: FeedCreateRequest;
  viewerId: string;
  exposure: ExposureRecord | null;
  sourceOffer: OfferRecord | null;
  duplicateDraftCount?: number;
}): FeedCreateSourceResult {
  const { request, viewerId, exposure, sourceOffer } = input;
  if (!isValidFeedCreateRequest(request)) {
    return {
      ok: false,
      failure: {
        code: "invalid_request",
        message: "This Feed-to-Create link is invalid. No draft was created.",
      },
    };
  }

  const exposureId = cleanText(exposure?.id, 160);
  if (
    !exposureId ||
    cleanText(exposure?.profile_id, 160) !== viewerId ||
    cleanText(exposure?.request_id, 160) !== request.exposureRequestId ||
    cleanText(exposure?.opportunity_type, 40) !== request.opportunityType ||
    cleanText(exposure?.opportunity_id, 160) !== request.opportunityId ||
    exposure?.was_shown !== true
  ) {
    return {
      ok: false,
      failure: {
        code: "receipt_missing",
        message:
          "This opportunity was not verified as shown in your authenticated Feed. No draft was created.",
      },
    };
  }

  const sourceId = cleanText(sourceOffer?.id, 160);
  if (!sourceId || sourceId !== request.opportunityId) {
    return {
      ok: false,
      failure: {
        code: "source_missing",
        message: "The original opportunity no longer exists. No draft was created.",
      },
    };
  }

  const sourceOwnerId = cleanText(sourceOffer?.owner_id, 160);
  const exposureOwnerId = cleanText(exposure?.owner_id, 160);
  if (!sourceOwnerId || sourceOwnerId !== exposureOwnerId) {
    return {
      ok: false,
      failure: {
        code: "source_owner_mismatch",
        message: "The Feed receipt no longer matches the source owner. No draft was created.",
      },
    };
  }
  if (sourceOwnerId === viewerId) {
    return {
      ok: false,
      failure: {
        code: "source_is_own",
        message: "Use the management action for your own listing instead of creating a counteroffer.",
      },
    };
  }

  const sourceRevision = integer(sourceOffer?.terms_version);
  if (sourceRevision !== request.sourceRevision) {
    return {
      ok: false,
      failure: {
        code: "source_stale",
        message:
          "The original opportunity changed after it appeared in your Feed. Review the current version before creating a proposal.",
      },
    };
  }

  if (
    cleanText(sourceOffer?.mode, 40) !== "pledge" ||
    cleanText(sourceOffer?.status, 40) !== "open" ||
    cleanText(sourceOffer?.workflow_status, 40) !== "published" ||
    !cleanText(sourceOffer?.published_at, 80) ||
    sourceOffer?.closed_at != null ||
    sourceOffer?.deleted_at != null
  ) {
    return {
      ok: false,
      failure: {
        code: "source_ineligible",
        message:
          "This opportunity is closed, unpublished, financial, or otherwise not eligible for a Phase-1 counteroffer.",
      },
    };
  }

  const sourceSnapshot: FeedCreateSourceSnapshot = {
    ownerAlias: cleanText(sourceOffer?.owner_alias, 100) || "Participant",
    offeredCause: cleanText(sourceOffer?.offered_cause, 180),
    requestedCause: cleanText(sourceOffer?.requested_cause, 180),
    offerAction: cleanText(sourceOffer?.offer_action, 5000),
    requestAction: cleanText(sourceOffer?.request_action, 5000),
    verification: cleanText(sourceOffer?.verification, 5000),
    duration: cleanText(sourceOffer?.duration, 5000),
    termsVersion: sourceRevision,
    publishedAt: cleanText(sourceOffer?.published_at, 80),
  };
  if (
    !sourceSnapshot.offeredCause ||
    !sourceSnapshot.requestedCause ||
    !sourceSnapshot.offerAction ||
    !sourceSnapshot.requestAction ||
    !sourceSnapshot.verification ||
    !sourceSnapshot.duration
  ) {
    return {
      ok: false,
      failure: {
        code: "source_incomplete",
        message:
          "This opportunity does not contain enough structured public terms to prefill Create reliably.",
      },
    };
  }

  return {
    ok: true,
    source: {
      request,
      exposureId,
      sourceOwnerId,
      counterpartyName: sourceSnapshot.ownerAlias,
      sourceUrl: `/offers/${encodeURIComponent(request.opportunityId)}`,
      duplicateDraftCount: Math.max(0, Math.floor(input.duplicateDraftCount ?? 0)),
      sourceSnapshot,
      initialValues: {
        offeredCause: sourceSnapshot.requestedCause,
        requestedCause: sourceSnapshot.offeredCause,
        proposedAction: sourceSnapshot.requestAction,
        requestedAction: sourceSnapshot.offerAction,
        duration: sourceSnapshot.duration,
        evidenceRule: sourceSnapshot.verification,
      },
      matchContextStorageKey: feedCreateMatchContextStorageKey(request),
    },
  };
}

export async function resolveFeedCreateSource(
  request: FeedCreateRequest,
  viewerId: string,
): Promise<FeedCreateSourceResult> {
  if (!isValidFeedCreateRequest(request)) {
    return evaluateFeedCreateSourceRecords({
      request,
      viewerId,
      exposure: null,
      sourceOffer: null,
    });
  }

  try {
    const supabase = (await createClient()) as any;
    const [exposureResult, offerResult] = await Promise.all([
      supabase
        .from("recommendation_exposures")
        .select(
          "id,profile_id,request_id,opportunity_type,opportunity_id,owner_id,rank,was_shown",
        )
        .eq("profile_id", viewerId)
        .eq("request_id", request.exposureRequestId)
        .eq("opportunity_type", request.opportunityType)
        .eq("opportunity_id", request.opportunityId)
        .eq("was_shown", true)
        .maybeSingle(),
      supabase
        .from("offers")
        .select(
          "id,owner_id,owner_alias,mode,offered_cause,requested_cause,offer_action,request_action,verification,duration,status,workflow_status,published_at,closed_at,deleted_at,terms_version",
        )
        .eq("id", request.opportunityId)
        .maybeSingle(),
    ]);

    if (exposureResult.error || offerResult.error) {
      console.error("[feed-create] Source resolution query failed", {
        exposureCode: exposureResult.error?.code ?? null,
        offerCode: offerResult.error?.code ?? null,
      });
      return {
        ok: false,
        failure: {
          code: "unavailable",
          message:
            "The authenticated Feed source could not be verified right now. No draft was created.",
        },
      };
    }

    const linksResult = await supabase
      .from("moral_trade_feed_create_links")
      .select("derived_offer_id")
      .eq("creator_profile_id", viewerId)
      .eq("source_offer_id", request.opportunityId);
    let duplicateDraftCount = 0;
    if (!linksResult.error) {
      const ids = (linksResult.data ?? [])
        .map((row: { derived_offer_id?: unknown }) => cleanText(row.derived_offer_id, 160))
        .filter(Boolean);
      if (ids.length) {
        const activeResult = await supabase
          .from("offers")
          .select("id,status,workflow_status")
          .in("id", ids);
        if (!activeResult.error) {
          duplicateDraftCount = (activeResult.data ?? []).filter(
            (row: { status?: unknown; workflow_status?: unknown }) =>
              cleanText(row.status, 40) !== "closed" &&
              !["closed", "deleted", "rejected"].includes(
                cleanText(row.workflow_status, 40),
              ),
          ).length;
        }
      }
    }

    return evaluateFeedCreateSourceRecords({
      request,
      viewerId,
      exposure: exposureResult.data,
      sourceOffer: offerResult.data,
      duplicateDraftCount,
    });
  } catch (error) {
    console.error("[feed-create] Source resolution unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      failure: {
        code: "unavailable",
        message:
          "The authenticated Feed source could not be verified right now. No draft was created.",
      },
    };
  }
}

export async function recordFeedCreateEvent(input: {
  actorId: string;
  eventType: FeedCreateEventType;
  request: FeedCreateRequest;
  derivedOfferId?: string | null;
  agreementId?: string | null;
}) {
  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase.rpc(
      "moral_trade_feed_create_record_event_authenticated",
      {
        p_expected_actor_id: input.actorId,
        p_event_type: input.eventType,
        p_source_opportunity_type: input.request.opportunityType,
        p_source_opportunity_id: input.request.opportunityId,
        p_exposure_request_id: input.request.exposureRequestId,
        p_source_terms_version: input.request.sourceRevision,
        p_derived_offer_id: input.derivedOfferId ?? null,
        p_agreement_id: input.agreementId ?? null,
      },
    );
    if (error) {
      console.error("[feed-create] Funnel event was not recorded", {
        code: error.code ?? null,
        eventType: input.eventType,
      });
      return null;
    }
    return typeof data === "string" ? data : null;
  } catch (error) {
    console.error("[feed-create] Funnel event writer unavailable", {
      eventType: input.eventType,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getFeedCreateLinkForDerivedOffer(
  derivedOfferId: string,
  creatorId: string,
) {
  try {
    const supabase = (await createClient()) as any;
    const { data: link, error } = await supabase
      .from("moral_trade_feed_create_links")
      .select(
        "id,creator_profile_id,derived_offer_id,source_offer_id,source_owner_profile_id,counterparty_profile_id,source_terms_version,derivation_mode,source_snapshot_json,duplicate_acknowledged,submitted_at,created_at",
      )
      .eq("creator_profile_id", creatorId)
      .eq("derived_offer_id", derivedOfferId)
      .maybeSingle();
    if (error || !link) return null;

    const { data: source } = await supabase
      .from("offers")
      .select("id,owner_alias,status,workflow_status,terms_version,closed_at,deleted_at")
      .eq("id", link.source_offer_id)
      .maybeSingle();
    const current = Boolean(
      source &&
        source.status === "open" &&
        source.workflow_status === "published" &&
        source.closed_at == null &&
        source.deleted_at == null &&
        Number(source.terms_version) === Number(link.source_terms_version),
    );

    return {
      ...link,
      sourceCurrent: current,
      sourceOwnerAlias:
        cleanText(source?.owner_alias, 100) ||
        cleanText(link.source_snapshot_json?.ownerAlias, 100) ||
        "Participant",
      sourceUrl: `/offers/${encodeURIComponent(String(link.source_offer_id))}`,
    };
  } catch {
    return null;
  }
}
