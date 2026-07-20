import Link from "next/link";

import { LocalDateTime } from "@/components/ui/local-date-time";
import type { CredibilitySummary } from "@/lib/credibility";

function percentage(value: number | null) {
  return value === null ? "Not published" : `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No verified event yet";
  }
  return <LocalDateTime value={value} fallback="Date unavailable" dateOnly />;
}

function levelTone(level: CredibilitySummary["level"]) {
  if (level === "Strong" || level === "Established") {
    return "impact-pill";
  }
  if (level === "Safety-restricted" || level === "Review required") {
    return "badge badge-secondary";
  }
  return "source-pill";
}

export function CredibilityPassport({
  summary,
  compact = false,
  heading = "Trade credibility",
}: {
  summary: CredibilitySummary;
  compact?: boolean;
  heading?: string;
}) {
  return (
    <article className={`panel data-card ${compact ? "" : "data-card-wide"}`}>
      <div className="protocol-workflow-card-head">
        <div>
          <p className="detail-kicker">Contextual reliability</p>
          <h3>{heading}</h3>
        </div>
        <span className={levelTone(summary.level)}>{summary.level}</span>
      </div>

      <div className="tag-row" aria-label="Credibility summary">
        {summary.score === null ? (
          <span className="source-pill">No numerical score published</span>
        ) : (
          <span className="impact-pill">Conservative score {summary.score}/100</span>
        )}
        <span className="source-pill">{summary.confidence} confidence</span>
        <span className="source-pill">
          {summary.effectiveObservations.toFixed(1)} effective observation(s)
        </span>
        {summary.independentCounterpartiesAtLeast > 0 ? (
          <span className="source-pill">
            at least {summary.independentCounterpartiesAtLeast} independent counterparty record(s)
          </span>
        ) : null}
      </div>

      <p className="route-text">{summary.explanation}</p>

      {!compact ? (
        <>
          <div className="data-grid">
            <div className="panel data-card">
              <p className="detail-kicker">Estimated completion</p>
              <h3>{percentage(summary.estimatedProbability)}</h3>
              <p className="route-text">
                Posterior mean. This is not displayed as a moral-value or social-status ranking.
              </p>
            </div>
            <div className="panel data-card">
              <p className="detail-kicker">Conservative estimate</p>
              <h3>{percentage(summary.conservativeProbability)}</h3>
              <p className="route-text">The model&apos;s lower tenth-percentile estimate.</p>
            </div>
            <div className="panel data-card">
              <p className="detail-kicker">Relevant activity</p>
              <h3>{formatDate(summary.lastEventAt)}</h3>
              <p className="route-text">Evidence decays with a 365-day half-life in model v1.</p>
            </div>
          </div>

          <div className="clean-stack">
            <p className="detail-kicker">Performance dimensions</p>
            <div className="data-grid">
              {summary.dimensions.map((dimension) => (
                <div className="panel data-card" key={dimension.dimension}>
                  <div className="protocol-workflow-card-head">
                    <h3>{dimension.label}</h3>
                    <span className="source-pill">{dimension.confidence}</span>
                  </div>
                  <p className="route-text">
                    {dimension.conservativeProbability === null
                      ? "Insufficient evidence for a public estimate."
                      : `${Math.round(
                          dimension.conservativeProbability * 100,
                        )}% conservative estimate from ${dimension.effectiveObservations.toFixed(
                          1,
                        )} effective observation(s).`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="offer-footer">
        <span>Model {summary.modelVersion}</span>
        <Link className="text-button" href="/credibility">
          Calculation and safeguards
        </Link>
      </div>
    </article>
  );
}
