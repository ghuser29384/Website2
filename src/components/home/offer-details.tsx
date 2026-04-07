import type { EvaluatedPair, Offer } from "@/lib/offers";
import { exactReasons, formatMode, gapReasons } from "@/lib/offers";

interface OfferDetailsProps {
  selected: Offer | null;
  matches: EvaluatedPair[];
  onFocusOffer: (offerId: string) => void;
}

export function OfferDetails({ selected, matches, onFocusOffer }: OfferDetailsProps) {
  return (
    <>
      <article className="panel details-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Selected offer</p>
            <h3>Offer details</h3>
          </div>
        </div>

        <div className="details-content">
          {selected ? (
            <>
              <div className="detail-block">
                <p className="detail-kicker">{formatMode(selected.mode)}</p>
                <h4>{selected.alias}</h4>
                <div className="tag-row">
                  <span className="badge">{selected.offeredCause}</span>
                  <span className="badge badge-secondary">{selected.requestedCause}</span>
                  <span className="source-pill">{selected.source}</span>
                </div>
                <p>{selected.offerAction}</p>
                <p>Requested in return: {selected.requestAction}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-block">
                  <p className="detail-kicker">Impact threshold</p>
                  <p>
                    Offers {selected.offerImpact}/10 on its own scale and requires at least{" "}
                    {selected.minCounterpartyImpact}/10 from the other side.
                  </p>
                </div>
                <div className="detail-block">
                  <p className="detail-kicker">Trust stack</p>
                  <p>
                    {selected.verification} with a {selected.duration} review period and trust
                    intensity {selected.trustLevel}/5.
                  </p>
                </div>
              </div>

              <div className="detail-block">
                <p className="detail-kicker">Compromise destination</p>
                <p>{selected.mode === "offset" ? selected.compromiseCause : "Not needed"}</p>
              </div>

              <div className="detail-block">
                <p className="detail-kicker">Notes</p>
                <p>{selected.notes || "No additional notes provided."}</p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div>
                <strong>Select an offer to inspect it.</strong>
              </div>
            </div>
          )}
        </div>
      </article>

      <article className="panel matches-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Reciprocal matches</p>
            <h3>Compatibility queue</h3>
          </div>
        </div>

        <div className="matches-list">
          {selected ? (
            matches.length ? (
              matches.map((pair) => {
                const reasons = pair.exact ? exactReasons(pair) : gapReasons(pair);

                return (
                  <article key={pair.offer.id} className="match-card">
                    <div className="match-header">
                      <div>
                        <p className="detail-kicker">
                          {pair.exact ? "Reciprocal match" : "Near match"}
                        </p>
                        <h4>{pair.offer.alias}</h4>
                      </div>
                      <span className="score-pill">{pair.score}</span>
                    </div>

                    <p>{pair.offer.offerAction}</p>
                    <div className="match-reasons">
                      {reasons.map((reason) => (
                        <span key={`${pair.offer.id}-${reason}`} className="match-reason">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <div className="offer-footer">
                      <div className="tag-row">
                        <span>{pair.offer.verification}</span>
                        <span>{pair.offer.duration}</span>
                      </div>
                      <div className="offer-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onFocusOffer(pair.offer.id)}
                        >
                          Focus offer
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No candidates yet.</strong>
                  <p>Add a reciprocal offer or relax filters and thresholds.</p>
                </div>
              </div>
            )
          ) : (
            <div className="empty-state">
              <div>
                <strong>No selected offer.</strong>
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
