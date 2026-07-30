import Link from "next/link";

import type {
  TradeSafeguardItem,
  TradeSafeguardStatus,
} from "@/lib/trade-safeguards";

const STATUS_LABELS: Record<TradeSafeguardStatus, string> = {
  recorded: "Recorded",
  pending: "Pending",
  action_required: "Action required",
  human_review: "Human review",
  blocked: "Blocked",
  not_recorded: "Not recorded",
  not_applicable: "Not applicable",
};

const UNRESOLVED_STATUSES = new Set<TradeSafeguardStatus>([
  "pending",
  "action_required",
  "human_review",
  "blocked",
  "not_recorded",
]);

export function TradeSafeguardsPanel({
  items,
}: {
  items: readonly TradeSafeguardItem[];
}) {
  const unresolvedCount = items.filter((item) =>
    UNRESOLVED_STATUSES.has(item.status),
  ).length;

  return (
    <section
      aria-labelledby="agreement-safeguards-heading"
      className="section section-subtle"
      id="safeguards"
    >
      <div className="section-head section-head-compact">
        <p className="eyebrow">Contextual safeguards</p>
        <h2 id="agreement-safeguards-heading">
          Safeguards and unresolved gates for this agreement.
        </h2>
        <p>
          These statuses are calculated from this agreement&apos;s persisted terms and workflow
          records. They are not a safety certificate, moral-impact score, or authorization to rely.
        </p>
        <span className="source-pill">
          {unresolvedCount} unresolved or context-dependent
        </span>
      </div>

      <div className="data-grid">
        {items.map((item) => (
          <article className="panel data-card" key={item.id}>
            <p className="detail-kicker">{STATUS_LABELS[item.status]}</p>
            <h3>{item.label}</h3>
            <p className="route-text">{item.summary}</p>
            <Link className="button button-secondary button-mini" href={item.href}>
              {item.actionLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
