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

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MpgfContributionProofLedger({
  ledger,
}: {
  ledger: MpgfContributionProofLedger;
}) {
  const accounting = ledger.accounting;

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
        <p>
          Plain-language contribution summary: each accounting channel is labeled separately, so
          gross captured, fees, net recipient-disbursed dollars, actual contributions, counted
          dollars, match-eligible dollars, sponsor support, rewards, credits, and certificates are
          never merged into one unlabeled impact number.
        </p>
      </div>

      <div className="mpgf-kpi-grid" aria-label="Contribution ledger totals">
        <div className="mpgf-kpi">
          <span>Maximum this round</span>
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

      <dl className="mpgf-summary-grid" aria-label="Separated accounting proof ledger">
        <div>
          <dt>Gross captured</dt>
          <dd>{formatUsd(accounting.grossCapturedCents)}</dd>
        </div>
        <div>
          <dt>Fees</dt>
          <dd>{formatUsd(accounting.feeCents)}</dd>
        </div>
        <div>
          <dt>Net recipient-disbursed</dt>
          <dd>{formatUsd(accounting.netRecipientDisbursedCents)}</dd>
        </div>
        <div>
          <dt>Actual contribution</dt>
          <dd>{formatUsd(accounting.actualContributionCents)}</dd>
        </div>
        <div>
          <dt>Counted contribution</dt>
          <dd>{formatUsd(accounting.countedContributionCents)}</dd>
        </div>
        <div>
          <dt>Match-eligible contribution</dt>
          <dd>{formatUsd(accounting.matchEligibleContributionCents)}</dd>
        </div>
        <div>
          <dt>Sponsor base match</dt>
          <dd>{formatUsd(accounting.sponsorBaseMatchCents)}</dd>
        </div>
        <div>
          <dt>Sponsor bonus match</dt>
          <dd>{formatUsd(accounting.sponsorBonusMatchCents)}</dd>
        </div>
        <div>
          <dt>Success rewards</dt>
          <dd>{formatUsd(accounting.successRewardCents)}</dd>
        </div>
        <div>
          <dt>Coordination credits</dt>
          <dd>{formatCount(accounting.coordinationCreditCount, "credit")}</dd>
        </div>
        <div>
          <dt>Impact certificates</dt>
          <dd>{formatCount(accounting.impactCertificateCount, "certificate")}</dd>
        </div>
        <div>
          <dt>Proof state</dt>
          <dd>{accounting.proofState.replaceAll("_", " ")}</dd>
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

      <div className="mpgf-table" aria-label="Route separated accounting proof ledger">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Route</span>
          <span>Gross / fee / net</span>
          <span>Actual / counted / match-eligible</span>
          <span>Sponsor / benefits</span>
        </div>
        {ledger.rows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No saved participant route</span>
            <span>{formatUsd(0)} / {formatUsd(0)} / {formatUsd(0)}</span>
            <span>{formatUsd(0)} / {formatUsd(0)} / {formatUsd(0)}</span>
            <span>No sponsor, reward, credit, or certificate proof.</span>
          </div>
        ) : null}
        {ledger.rows.map((row) => (
          <div key={`accounting-${row.pledgeId}`} className="mpgf-table-row">
            <span>{row.campaignTitle}</span>
            <span>
              {formatUsd(row.accounting.grossCapturedCents)} / {formatUsd(row.accounting.feeCents)} /{" "}
              {formatUsd(row.accounting.netRecipientDisbursedCents)}
            </span>
            <span>
              {formatUsd(row.accounting.actualContributionCents)} /{" "}
              {formatUsd(row.accounting.countedContributionCents)} /{" "}
              {formatUsd(row.accounting.matchEligibleContributionCents)}
            </span>
            <span>
              Base {formatUsd(row.accounting.sponsorBaseMatchCents)}; bonus{" "}
              {formatUsd(row.accounting.sponsorBonusMatchCents)}; rewards{" "}
              {formatUsd(row.accounting.successRewardCents)};{" "}
              {formatCount(row.accounting.coordinationCreditCount, "credit")};{" "}
              {formatCount(row.accounting.impactCertificateCount, "certificate")}.
            </span>
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
