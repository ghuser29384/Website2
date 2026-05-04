import type { EvaluatedPair, Offer } from "@/lib/offers";
import {
  exactReasons,
  formatMode,
  formatOffsetSummary,
  formatPaymentCadence,
  gapReasons,
} from "@/lib/offers";

interface OfferDetailsProps {
  selected: Offer | null;
  matches: EvaluatedPair[];
  onFocusOffer: (offerId: string) => void;
}

export function OfferDetails({ selected, matches, onFocusOffer }: OfferDetailsProps) {
  const offsetSummary = selected ? formatOffsetSummary(selected) : null;

  return (
    <>
      <article className="panel details-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Selected trade</p>
            <h3>Stated terms</h3>
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
                  <p className="detail-kicker">Stated moral gain</p>
                  <p>
                    Estimated as {selected.offerImpact}/10 on this party&apos;s own scale and
                    requires at least {selected.minCounterpartyImpact}/10 from the other side.
                  </p>
                </div>
                <div className="detail-block">
                  <p className="detail-kicker">Verification and review</p>
                  <p>
                    {selected.verification} with a {selected.duration} review period and trust
                    intensity {selected.trustLevel}/5.
                  </p>
                  {selected.mode === "payment" ? (
                    <p>{formatPaymentCadence(selected)}</p>
                  ) : null}
                </div>
              </div>

              {selected.mode === "offset" ? (
                <div className="detail-block">
                  <p className="detail-kicker">Offset structure</p>
                  <p>
                    Redirect {selected.baselineAmountUsd ? `$${selected.baselineAmountUsd}` : "the baseline amount"}{" "}
                    from {selected.baselineOpposedCause} and request{" "}
                    {selected.requestedMatchingAmountUsd ? `$${selected.requestedMatchingAmountUsd}` : "the matching amount"}{" "}
                    from {selected.requestedOpposedCause}.
                  </p>
                  <p>Compromise destination: {selected.compromiseCause}</p>
                  {offsetSummary ? (
                    <>
                      <p>
                        Ratio {offsetSummary.ratio} | {offsetSummary.timeHorizon} |{" "}
                        {offsetSummary.verification}
                      </p>
                      <p>
                        Redirect summary: ${offsetSummary.preview.matchedBaselineUsd.toFixed(2)} from
                        the baseline side, ${offsetSummary.preview.matchedCounterpartyUsd.toFixed(2)} from
                        the counterparty side, ${offsetSummary.preview.compromiseTotalUsd.toFixed(2)} to
                        the compromise destination.
                      </p>
                      <p>{offsetSummary.unmatchedRule}</p>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="detail-block">
                  <p className="detail-kicker">Compromise destination</p>
                  <p>{selected.compromiseCause}</p>
                </div>
              )}

              <div className="detail-block">
                <p className="detail-kicker">Notes</p>
                <p>{selected.notes || "No additional notes provided."}</p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div>
                <strong>Select a proposal to inspect its terms.</strong>
              </div>
            </div>
          )}
        </div>
      </article>

      <article className="panel matches-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Gains from trade</p>
            <h3>Possible counterparties</h3>
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
                          {pair.exact ? "Mutual gain" : "Possible gain"}
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
                        {pair.offer.mode === "payment" ? (
                          <span>{formatPaymentCadence(pair.offer)}</span>
                        ) : null}
                      </div>
                      <div className="offer-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onFocusOffer(pair.offer.id)}
                        >
                          Inspect trade
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
                  <p>Add another offer or relax the filters and thresholds.</p>
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
