import Link from "next/link";

import { formatUsd } from "@/lib/mpgf/mechanism";
import type { MpgfRoundBoardCard } from "@/lib/mpgf/public-goods-round-board";

function boardStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function MpgfRoundBoard({
  cards,
  roundHref,
  roundName,
}: {
  cards: MpgfRoundBoardCard[];
  roundHref: string;
  roundName: string;
}) {
  return (
    <section className="section section-white" id="round-board">
      <div className="section-head section-head-compact">
        <p className="eyebrow">Live rounds</p>
        <h2>Round board and budget router</h2>
        <p>
          Review threshold progress, match projections, and the next safe participant action before
          setting a Common Ground Budget. These cards are previews, not payment authorization or
          public impact claims.
        </p>
      </div>

      <div className="mpgf-round-board-header">
        <div>
          <span>Current round</span>
          <strong>{roundName}</strong>
        </div>
        <Link className="button button-secondary" href={roundHref}>
          Open budget router
        </Link>
      </div>

      <div className="mpgf-pool-directory" aria-label="Public goods round board">
        {cards.map((card) => (
          <article className="mpgf-panel" key={card.campaignId}>
            <p className="eyebrow">{boardStatusLabel(card.status)}</p>
            <h3>{card.title}</h3>
            <dl className="mpgf-summary-grid" aria-label={`${card.title} round board metrics`}>
              <div>
                <dt>Threshold</dt>
                <dd>
                  {formatUsd(card.thresholdAmountCents)} + {card.thresholdSupporters} supporters +{" "}
                  {card.activeClusterCount} clusters
                </dd>
              </div>
              <div>
                <dt>Direct counted</dt>
                <dd>{formatUsd(card.directCountedCents)}</dd>
              </div>
              <div>
                <dt>Base match unlocked</dt>
                <dd>{formatUsd(card.baseMatchUnlockedCents)}</dd>
              </div>
              <div>
                <dt>Projected bonus match</dt>
                <dd>
                  {formatUsd(card.projectedBonusMinCents)}-{formatUsd(card.projectedBonusMaxCents)}
                </dd>
              </div>
              <div>
                <dt>Your stance</dt>
                <dd>{card.yourStanceLabel}</dd>
              </div>
              <div>
                <dt>Your projected allocation</dt>
                <dd>{formatUsd(card.projectedAllocationCents)}</dd>
              </div>
            </dl>
            <div className="mpgf-allocation-row">
              <div>
                <span>Amount threshold</span>
                <strong>{Math.round(card.amountProgressBps / 100)}%</strong>
              </div>
              <meter max={10_000} value={card.amountProgressBps} />
            </div>
            <div className="mpgf-allocation-row">
              <div>
                <span>Supporter threshold</span>
                <strong>
                  {card.verifiedSupporterCount}/{card.thresholdSupporters}
                </strong>
              </div>
              <meter max={10_000} value={card.supporterProgressBps} />
            </div>
            <div className="tag-row">
              <span className="badge badge-secondary">Pivotal action: {card.pivotalActionLabel}</span>
              <span className="badge badge-secondary">{card.inviteActionLabel}</span>
            </div>
            <Link className="inline-link" href={card.href}>
              View proof path
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
