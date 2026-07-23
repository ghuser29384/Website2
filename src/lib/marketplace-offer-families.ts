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

export interface BuildParticipantOfferFamiliesOptions {
  preserveInputOrder?: boolean;
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
  options: BuildParticipantOfferFamiliesOptions = {},
): ParticipantOfferFamily[] {
  const preserveInputOrder = options.preserveInputOrder ?? false;
  const inputOrderById = new Map(rows.map((row, index) => [row.id, index]));
  const pairingOrder = (pairing: MarketplaceOfferPairing) =>
    inputOrderById.get(pairing.id) ?? Number.MAX_SAFE_INTEGER;
  const comparePairings = (
    left: MarketplaceOfferPairing,
    right: MarketplaceOfferPairing,
  ) =>
    preserveInputOrder
      ? pairingOrder(left) - pairingOrder(right)
      : compareIsoNewestFirst(left.updatedAt, right.updatedAt) ||
        left.requestAction.localeCompare(right.requestAction);
  const participants = new Map<
    string,
    {
      firstIndex: number;
      ownerId: string;
      ownerAlias: string;
      pairings: MarketplaceOfferPairing[];
    }
  >();

  rows.forEach((row, rowIndex) => {
    const participantKey = participantKeyFor(row);
    const existing = participants.get(participantKey);
    const pairing = toPairing(row);

    if (existing) {
      existing.pairings.push(pairing);
      if (Date.parse(pairing.updatedAt) > Date.parse(existing.pairings[0]?.updatedAt ?? "")) {
        existing.ownerAlias = pairing.ownerAlias;
      }
      return;
    }

    participants.set(participantKey, {
      firstIndex: rowIndex,
      ownerId: row.owner_id,
      ownerAlias: row.owner_alias || "Participant",
      pairings: [pairing],
    });
  });

  return [...participants.entries()]
    .map(([participantKey, participant]) => {
      const variantGroups = new Map<
        string,
        { firstIndex: number; pairings: MarketplaceOfferPairing[] }
      >();
      const pairings = [...participant.pairings].sort(comparePairings);

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
        const existing = variantGroups.get(key);
        if (existing) {
          existing.pairings.push(pairing);
        } else {
          variantGroups.set(key, {
            firstIndex: pairingOrder(pairing),
            pairings: [pairing],
          });
        }
      }

      const offerVariants = [...variantGroups.entries()]
        .map(([key, group]) => {
          const deduplicatedRequests = new Map<string, MarketplaceOfferPairing>();

          for (const pairing of [...group.pairings].sort(comparePairings)) {
            const requestKey = requestKeyFor(pairing);
            if (!deduplicatedRequests.has(requestKey)) {
              deduplicatedRequests.set(requestKey, pairing);
            }
          }

          const distinctPairings = [...deduplicatedRequests.values()].sort(comparePairings);
          const representative = distinctPairings[0];

          return {
            firstIndex: group.firstIndex,
            variant: {
              key,
              mode: representative.mode,
              offeredCause: representative.offeredCause,
              offerAction: representative.offerAction,
              latestUpdatedAt: [...distinctPairings].sort((left, right) =>
                compareIsoNewestFirst(left.updatedAt, right.updatedAt),
              )[0]?.updatedAt ?? representative.updatedAt,
              pairings: distinctPairings,
            } satisfies MarketplaceOfferVariant,
          };
        })
        .sort((left, right) =>
          preserveInputOrder
            ? left.firstIndex - right.firstIndex
            : compareIsoNewestFirst(
                left.variant.latestUpdatedAt,
                right.variant.latestUpdatedAt,
              ) || left.variant.offerAction.localeCompare(right.variant.offerAction),
        )
        .map(({ variant }) => variant);
      const newestPairing = [...pairings].sort((left, right) =>
        compareIsoNewestFirst(left.updatedAt, right.updatedAt),
      )[0];

      return {
        family: {
          participantKey,
          ownerId: participant.ownerId,
          ownerAlias: participant.ownerAlias,
          latestUpdatedAt: newestPairing?.updatedAt ?? new Date(0).toISOString(),
          pairingCount: pairings.length,
          offerVariants,
        } satisfies ParticipantOfferFamily,
        firstIndex: participant.firstIndex,
      };
    })
    .sort((left, right) =>
      preserveInputOrder
        ? left.firstIndex - right.firstIndex
        : compareIsoNewestFirst(
            left.family.latestUpdatedAt,
            right.family.latestUpdatedAt,
          ) || left.family.ownerAlias.localeCompare(right.family.ownerAlias),
    )
    .map(({ family }) => family);
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
