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


export interface MarketplaceUnderlyingActionOffer extends MarketplaceParticipantOffer {
  offer_action: string;
}

export interface MarketplaceUnderlyingActionGroup<
  T extends MarketplaceUnderlyingActionOffer,
> {
  key: string;
  offeredAction: string;
  offers: T[];
}

export function publicUnderlyingOfferAction(value: string) {
  return value.replace(/^\s*[A-Z]\d+\s*[—:-]\s*/u, "").trim();
}

export function groupOffersByUnderlyingAction<
  T extends MarketplaceUnderlyingActionOffer,
>(offers: readonly T[]): MarketplaceUnderlyingActionGroup<T>[] {
  const groups = new Map<string, MarketplaceUnderlyingActionGroup<T>>();

  for (const offer of offers) {
    const offeredAction = publicUnderlyingOfferAction(offer.offer_action);
    const key = offeredAction.toLowerCase().replace(/\s+/g, " ");
    const existing = groups.get(key);
    if (existing) {
      existing.offers.push(offer);
      continue;
    }
    groups.set(key, {
      key,
      offeredAction: offeredAction || "Published action",
      offers: [offer],
    });
  }

  return [...groups.values()];
}
