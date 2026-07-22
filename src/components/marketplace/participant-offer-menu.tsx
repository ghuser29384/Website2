"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { toggleCartAction } from "@/app/actions";
import type {
  MarketplaceOfferPairing,
  MarketplaceOfferVariant,
  ParticipantOfferFamily,
} from "@/lib/marketplace-offer-families";

import styles from "./participant-offer-menu.module.css";

interface ParticipantOfferMenuProps {
  family: ParticipantOfferFamily;
  isAuthenticated: boolean;
  returnTo: string;
  savedOfferIds: string[];
  viewerId?: string;
}

function formatMode(mode: MarketplaceOfferPairing["mode"]) {
  if (mode === "offset") {
    return "Donation offset";
  }

  if (mode === "payment") {
    return "Payment-supported action";
  }

  return "Reciprocal pledge";
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Update time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

function getVariantLabel(variant: MarketplaceOfferVariant) {
  return `${variant.offerAction} · ${variant.offeredCause}`;
}

function getPairingLabel(pairing: MarketplaceOfferPairing) {
  return `${pairing.requestAction} · ${pairing.requestedCause}`;
}

export function ParticipantOfferMenu({
  family,
  isAuthenticated,
  returnTo,
  savedOfferIds,
  viewerId,
}: ParticipantOfferMenuProps) {
  const firstVariant = family.offerVariants[0];
  const [selectedVariantKey, setSelectedVariantKey] = useState(
    firstVariant?.key ?? "",
  );
  const [selectedPairingId, setSelectedPairingId] = useState(
    firstVariant?.pairings[0]?.id ?? "",
  );
  const savedIds = useMemo(() => new Set(savedOfferIds), [savedOfferIds]);
  const selectedVariant =
    family.offerVariants.find((variant) => variant.key === selectedVariantKey) ??
    firstVariant;
  const selectedPairing =
    selectedVariant?.pairings.find(
      (pairing) => pairing.id === selectedPairingId,
    ) ?? selectedVariant?.pairings[0];

  if (!selectedVariant || !selectedPairing) {
    return null;
  }

  const isOwnListing = Boolean(viewerId && viewerId === family.ownerId);
  const responsePath = `/offers/${selectedPairing.id}#respond`;
  const proposeHref = isAuthenticated
    ? responsePath
    : `/login?returnTo=${encodeURIComponent(responsePath)}`;
  const counterofferPath = `/offers/new?mode=${selectedPairing.mode}&source_offer=${selectedPairing.id}`;
  const counterofferHref = isAuthenticated
    ? counterofferPath
    : `/signup?returnTo=${encodeURIComponent(counterofferPath)}`;
  const saved = savedIds.has(selectedPairing.id);

  function selectVariant(nextKey: string) {
    const nextVariant = family.offerVariants.find(
      (variant) => variant.key === nextKey,
    );

    setSelectedVariantKey(nextKey);
    setSelectedPairingId(nextVariant?.pairings[0]?.id ?? "");
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Participant offer menu</p>
          <h3>{family.ownerAlias}</h3>
        </div>
        <div className={styles.inventory}>
          <strong>{family.offerVariants.length}</strong>
          <span>
            offer {family.offerVariants.length === 1 ? "family" : "families"}
          </span>
          <strong>{family.pairingCount}</strong>
          <span>possible pairings</span>
        </div>
      </header>

      <div className={styles.selectorGrid}>
        <label className={styles.field}>
          <span>I can offer</span>
          <select
            onChange={(event) => selectVariant(event.target.value)}
            value={selectedVariant.key}
          >
            {family.offerVariants.map((variant) => (
              <option key={variant.key} value={variant.key}>
                {getVariantLabel(variant)}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.exchangeMark} aria-hidden="true">
          ↔
        </div>

        <label className={styles.field}>
          <span>I am seeking</span>
          <select
            onChange={(event) => setSelectedPairingId(event.target.value)}
            value={selectedPairing.id}
          >
            {selectedVariant.pairings.map((pairing) => (
              <option key={pairing.id} value={pairing.id}>
                {getPairingLabel(pairing)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={styles.route} aria-live="polite">
        <div className={styles.routeHeading}>
          <div>
            <p>{formatMode(selectedPairing.mode)}</p>
            <h4>
              {selectedPairing.offeredCause}
              <span aria-hidden="true"> ↔ </span>
              {selectedPairing.requestedCause}
            </h4>
          </div>
          <span className={styles.eligibility}>Eligible for weekly review</span>
        </div>

        <dl className={styles.terms}>
          <div>
            <dt>Participant commits</dt>
            <dd>{selectedPairing.offerAction}</dd>
          </div>
          <div>
            <dt>Counterparty commits</dt>
            <dd>{selectedPairing.requestAction}</dd>
          </div>
          {selectedPairing.discountNote ? (
            <div>
              <dt>Boundaries</dt>
              <dd>{selectedPairing.discountNote}</dd>
            </div>
          ) : null}
          {selectedPairing.verification ? (
            <div>
              <dt>Evidence method</dt>
              <dd>{selectedPairing.verification}</dd>
            </div>
          ) : null}
        </dl>

        <div className={styles.meta}>
          <span>{selectedPairing.duration || "Timing set in full terms"}</span>
          <span>Updated {formatUpdatedAt(selectedPairing.updatedAt)}</span>
          <Link href={`/offers/${selectedPairing.id}`}>Review full terms</Link>
        </div>
      </section>

      <footer className={styles.actions}>
        {isOwnListing ? (
          <span className={styles.ownerNotice}>Your published listing</span>
        ) : (
          <>
            <Link className={styles.primaryAction} href={proposeHref}>
              Propose match
            </Link>
            <Link className={styles.secondaryAction} href={counterofferHref}>
              Counteroffer
            </Link>
            {isAuthenticated ? (
              <form action={toggleCartAction}>
                <input name="offer_id" type="hidden" value={selectedPairing.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <button className={styles.secondaryAction} type="submit">
                  {saved ? "Remove saved" : "Save"}
                </button>
              </form>
            ) : (
              <Link
                className={styles.secondaryAction}
                href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Save
              </Link>
            )}
            <Link
              className={styles.textAction}
              href={`/offers/${selectedPairing.id}/question`}
            >
              Ask a question
            </Link>
          </>
        )}
      </footer>
    </article>
  );
}
