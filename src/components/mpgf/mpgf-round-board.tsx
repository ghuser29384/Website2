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
          Review the next safe participant action before setting moral public goods. Exact
          threshold progress, supporter counts, active-cluster counts, counterparty gaps, and
          success-without-me status stay sealed before close. Public exact aggregates appear only
          after close in final reports or audit bundles.
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
            <p className="eyebrow">Sealed progress | {card.sealedProgressLabel}</p>
            <h3>{card.title}</h3>
            <dl className="mpgf-summary-grid" aria-label={`${card.title} round board metrics`}>
              <div>
                <dt>Qualitative progress</dt>
                <dd>{card.sealedProgressLabel}</dd>
              </div>
              <div>
                <dt>Threshold rules</dt>
                <dd>Published in round rules; exact live progress sealed before close</dd>
              </div>
              <div>
                <dt>Direct counted</dt>
                <dd>Sealed before close</dd>
              </div>
              <div>
                <dt>Base match unlocked</dt>
                <dd>Shown after close in final reports</dd>
              </div>
              <div>
                <dt>Projected bonus match</dt>
                <dd>Shown after close in final reports</dd>
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
                <strong>Sealed before close</strong>
              </div>
            </div>
            <div className="mpgf-allocation-row">
              <div>
                <span>Supporter threshold</span>
                <strong>Sealed before close</strong>
              </div>
            </div>
            <div className="tag-row">
              <span className="badge badge-secondary">{boardStatusLabel(card.status)}</span>
              <span className="badge badge-secondary">Pivotal action: {card.pivotalActionLabel}</span>
              <span className="badge badge-secondary">Exact public aggregates after close</span>
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
