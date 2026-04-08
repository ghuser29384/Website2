import type { Offer } from "@/lib/offers";
import { evaluatePair, formatMode, shorten } from "@/lib/offers";

interface OfferBoardProps {
  offers: Offer[];
  selected: Offer | null;
  onSelectOffer: (offerId: string) => void;
  onRemoveOffer: (offerId: string) => void;
}

export function OfferBoard({
  offers,
  selected,
  onSelectOffer,
  onRemoveOffer,
}: OfferBoardProps) {
  return (
    <div className="offers-board">
      {offers.length ? (
        offers.map((offer) => {
          const pair = selected && selected.id !== offer.id ? evaluatePair(selected, offer) : null;
          const isLocal = offer.source === "Your local offer";

          return (
            <article
              key={offer.id}
              className={`offer-card ${selected?.id === offer.id ? "is-selected" : ""}`}
            >
              <div className="offer-header">
                <div>
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h4 className="offer-name">{offer.alias}</h4>
                </div>
                <div className="tag-row">
                  {pair ? (
                    <span className="score-pill">
                      {pair.exact ? "Exact" : "Score"} {pair.score}
                    </span>
                  ) : null}
                  <span className="source-pill">{offer.source}</span>
                </div>
              </div>

              <div className="offer-route">
                <div className="route-swap">
                  <span className="badge">{offer.offeredCause}</span>
                  <span className="route-arrow">for</span>
                  <span className="badge badge-secondary">{offer.requestedCause}</span>
                </div>
                <p className="route-text">{shorten(offer.offerAction, 104)}</p>
                <p className="route-text">Requests in return: {shorten(offer.requestAction, 104)}</p>
                {offer.mode === "offset" ? (
                  <p className="route-text">Compromise destination: {offer.compromiseCause}</p>
                ) : null}
              </div>

              <div className="offer-footer">
                <div className="tag-row">
                  <span className="impact-pill">{offer.offerImpact}/10 offered</span>
                  <span className="impact-pill">{offer.minCounterpartyImpact}+/10 needed</span>
                  <span>{offer.verification}</span>
                  <span>{offer.duration}</span>
                </div>
                <div className="offer-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectOffer(offer.id)}
                  >
                    Inspect terms
                  </button>
                  {isLocal ? (
                    <button
                      className="text-button danger"
                      type="button"
                      onClick={() => onRemoveOffer(offer.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <div className="empty-state">
          <div>
            <strong>No offers match the current filters.</strong>
            <p>Try a different cause or switch the sort order.</p>
          </div>
        </div>
      )}
    </div>
  );
}
