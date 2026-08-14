export interface MarketplaceParticipantOffer {
  created_at: string;
  id: string;
  owner_alias: string;
  owner_id: string;
}

export interface MarketplaceParticipantGroup<T extends MarketplaceParticipantOffer> {
  offers: T[];
  ownerId: string;
  participantName: string;
}

export function groupOffersByParticipant<T extends MarketplaceParticipantOffer>(
  offers: readonly T[],
): MarketplaceParticipantGroup<T>[] {
  const groups = new Map<string, MarketplaceParticipantGroup<T>>();

  for (const offer of offers) {
    const existing = groups.get(offer.owner_id);
    if (existing) {
      existing.offers.push(offer);
      if (existing.participantName === "Participant" && offer.owner_alias.trim()) {
        existing.participantName = offer.owner_alias.trim();
      }
      continue;
    }

    groups.set(offer.owner_id, {
      offers: [offer],
      ownerId: offer.owner_id,
      participantName: offer.owner_alias.trim() || "Participant",
    });
  }

  return [...groups.values()];
}
