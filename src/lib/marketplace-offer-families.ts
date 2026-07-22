export type MarketplaceOfferMode = "pledge" | "offset" | "payment";

export interface MarketplaceOfferSourceRow {
  id: string;
  owner_id: string;
  owner_alias: string;
  mode: MarketplaceOfferMode;
  offered_cause: string;
  requested_cause: string;
  offer_action: string;
  request_action: string;
  compromise_cause: string;
  verification: string;
  duration: string;
  discount_note: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOfferPairing {
  id: string;
  ownerId: string;
  ownerAlias: string;
  mode: MarketplaceOfferMode;
  offeredCause: string;
  requestedCause: string;
  offerAction: string;
  requestAction: string;
  compromiseCause: string;
  verification: string;
  duration: string;
  discountNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOfferVariant {
  key: string;
  mode: MarketplaceOfferMode;
  offeredCause: string;
  offerAction: string;
  latestUpdatedAt: string;
  pairings: MarketplaceOfferPairing[];
}

export interface ParticipantOfferFamily {
  participantKey: string;
  ownerId: string;
  ownerAlias: string;
  latestUpdatedAt: string;
  pairingCount: number;
  offerVariants: MarketplaceOfferVariant[];
}

export interface MarketplaceFamilyMetrics {
  participantCount: number;
  offerFamilyCount: number;
  pairingCount: number;
}

function normalizeKeyPart(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function compareIsoNewestFirst(left: string, right: string) {
  return Date.parse(right) - Date.parse(left);
}

function participantKeyFor(row: MarketplaceOfferSourceRow) {
  return row.owner_id || `alias:${normalizeKeyPart(row.owner_alias || "participant")}`;
}

function variantKeyFor(row: MarketplaceOfferSourceRow) {
  return [row.mode, row.offered_cause, row.offer_action]
    .map(normalizeKeyPart)
    .join("::");
}

function requestKeyFor(pairing: MarketplaceOfferPairing) {
  return [pairing.requestedCause, pairing.requestAction]
    .map(normalizeKeyPart)
    .join("::");
}

function toPairing(row: MarketplaceOfferSourceRow): MarketplaceOfferPairing {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerAlias: row.owner_alias || "Participant",
    mode: row.mode,
    offeredCause: row.offered_cause,
    requestedCause: row.requested_cause,
    offerAction: row.offer_action,
    requestAction: row.request_action,
    compromiseCause: row.compromise_cause,
    verification: row.verification,
    duration: row.duration,
    discountNote: row.discount_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildParticipantOfferFamilies(
  rows: MarketplaceOfferSourceRow[],
): ParticipantOfferFamily[] {
  const participants = new Map<
    string,
    {
      ownerId: string;
      ownerAlias: string;
      pairings: MarketplaceOfferPairing[];
    }
  >();

  for (const row of rows) {
    const participantKey = participantKeyFor(row);
    const existing = participants.get(participantKey);
    const pairing = toPairing(row);

    if (existing) {
      existing.pairings.push(pairing);
      if (Date.parse(pairing.updatedAt) > Date.parse(existing.pairings[0]?.updatedAt ?? "")) {
        existing.ownerAlias = pairing.ownerAlias;
      }
      continue;
    }

    participants.set(participantKey, {
      ownerId: row.owner_id,
      ownerAlias: row.owner_alias || "Participant",
      pairings: [pairing],
    });
  }

  return [...participants.entries()]
    .map(([participantKey, participant]) => {
      const variantGroups = new Map<string, MarketplaceOfferPairing[]>();
      const pairings = [...participant.pairings].sort((left, right) =>
        compareIsoNewestFirst(left.updatedAt, right.updatedAt),
      );

      for (const pairing of pairings) {
        const key = variantKeyFor({
          id: pairing.id,
          owner_id: pairing.ownerId,
          owner_alias: pairing.ownerAlias,
          mode: pairing.mode,
          offered_cause: pairing.offeredCause,
          requested_cause: pairing.requestedCause,
          offer_action: pairing.offerAction,
          request_action: pairing.requestAction,
          compromise_cause: pairing.compromiseCause,
          verification: pairing.verification,
          duration: pairing.duration,
          discount_note: pairing.discountNote,
          created_at: pairing.createdAt,
          updated_at: pairing.updatedAt,
        });
        const existing = variantGroups.get(key) ?? [];
        existing.push(pairing);
        variantGroups.set(key, existing);
      }

      const offerVariants = [...variantGroups.entries()]
        .map(([key, variantPairings]) => {
          const deduplicatedRequests = new Map<string, MarketplaceOfferPairing>();

          for (const pairing of variantPairings) {
            const requestKey = requestKeyFor(pairing);
            if (!deduplicatedRequests.has(requestKey)) {
              deduplicatedRequests.set(requestKey, pairing);
            }
          }

          const distinctPairings = [...deduplicatedRequests.values()].sort(
            (left, right) =>
              compareIsoNewestFirst(left.updatedAt, right.updatedAt) ||
              left.requestAction.localeCompare(right.requestAction),
          );
          const representative = distinctPairings[0];

          return {
            key,
            mode: representative.mode,
            offeredCause: representative.offeredCause,
            offerAction: representative.offerAction,
            latestUpdatedAt: representative.updatedAt,
            pairings: distinctPairings,
          } satisfies MarketplaceOfferVariant;
        })
        .sort(
          (left, right) =>
            compareIsoNewestFirst(left.latestUpdatedAt, right.latestUpdatedAt) ||
            left.offerAction.localeCompare(right.offerAction),
        );

      return {
        participantKey,
        ownerId: participant.ownerId,
        ownerAlias: participant.ownerAlias,
        latestUpdatedAt: pairings[0]?.updatedAt ?? new Date(0).toISOString(),
        pairingCount: pairings.length,
        offerVariants,
      } satisfies ParticipantOfferFamily;
    })
    .sort(
      (left, right) =>
        compareIsoNewestFirst(left.latestUpdatedAt, right.latestUpdatedAt) ||
        left.ownerAlias.localeCompare(right.ownerAlias),
    );
}

export function getMarketplaceFamilyMetrics(
  families: ParticipantOfferFamily[],
): MarketplaceFamilyMetrics {
  return families.reduce(
    (metrics, family) => ({
      participantCount: metrics.participantCount + 1,
      offerFamilyCount: metrics.offerFamilyCount + family.offerVariants.length,
      pairingCount: metrics.pairingCount + family.pairingCount,
    }),
    {
      participantCount: 0,
      offerFamilyCount: 0,
      pairingCount: 0,
    },
  );
}
