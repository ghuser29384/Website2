import type { MpgfContributionProofLedger } from "@/lib/mpgf/public-goods-contribution-ledger";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatStatus(status: { label: string; detail: string }) {
  return `${status.label}. ${status.detail}`;
}

export function MpgfContributionProofLedger({
  ledger,
}: {
  ledger: MpgfContributionProofLedger;
}) {
  return (
    <div aria-labelledby="mpgf-contribution-proof-ledger-title">
      <div className="section-head">
        <p className="eyebrow">Participant proof ledger</p>
        <h2 id="mpgf-contribution-proof-ledger-title">Contribution state and proof ledger</h2>
        <p>
          Contribution intents stay conditional: identity, threshold, destination-proof,
          challenge-window, and milestone-release gates must all clear before anything becomes
          payout-relevant.
        </p>
      </div>

      <div className="mpgf-kpi-grid" aria-label="Contribution ledger totals">
        <div className="mpgf-kpi">
          <span>Authorized budget</span>
          <strong>{formatUsd(ledger.authorizedBudgetCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Currently routed allocations</span>
          <strong>{formatUsd(ledger.currentlyRoutedAllocationsCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Pending threshold allocations</span>
          <strong>{formatUsd(ledger.pendingThresholdAllocationsCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Failed allocations</span>
          <strong>{formatUsd(ledger.failedAllocationsCents)}</strong>
        </div>
      </div>

      <dl className="mpgf-summary-grid" aria-label="Contribution gate status">
        <div>
          <dt>Failure bonus or carry-forward credit</dt>
          <dd>{formatUsd(ledger.failureBonusOrCarryForwardCreditCents)}</dd>
        </div>
        <div>
          <dt>Identity status</dt>
          <dd>{ledger.identityStatus.label}</dd>
        </div>
        <div>
          <dt>Threshold status</dt>
          <dd>{ledger.thresholdStatus.label}</dd>
        </div>
        <div>
          <dt>Destination-proof status</dt>
          <dd>{ledger.destinationProofStatus.label}</dd>
        </div>
        <div>
          <dt>Challenge-window status</dt>
          <dd>{ledger.challengeWindowStatus.label}</dd>
        </div>
        <div>
          <dt>Payout milestones</dt>
          <dd>{ledger.payoutMilestones.length ? `${ledger.payoutMilestones.length} scheduled` : "None scheduled"}</dd>
        </div>
      </dl>

      <div className="mpgf-table" aria-label="Participant route proof ledger">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Route</span>
          <span>Budget</span>
          <span>Gate state</span>
          <span>Next action</span>
        </div>
        {ledger.rows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No saved participant route</span>
            <span>{formatUsd(0)}</span>
            <span>{formatStatus(ledger.identityStatus)}</span>
            <span>{ledger.identityStatus.nextAction}</span>
          </div>
        ) : null}
        {ledger.rows.map((row) => (
          <div key={row.pledgeId} className="mpgf-table-row">
            <span>{row.campaignTitle}</span>
            <span>{formatUsd(row.authorizedBudgetCents)}</span>
            <span>
              {row.identityStatus.label}; {row.thresholdStatus.label}; {row.destinationProofStatus.label};{" "}
              {row.challengeWindowStatus.label}; {row.payoutMilestoneStatus.label}
            </span>
            <span>{row.payoutMilestoneStatus.nextAction}</span>
          </div>
        ))}
      </div>

      {ledger.warnings.length ? (
        <p className="mpgf-small">
          {ledger.warnings[0]}
        </p>
      ) : null}
    </div>
  );
}
