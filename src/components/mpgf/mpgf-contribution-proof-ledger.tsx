import type {
  MpgfContributionProofLedger,
  MpgfContributionSettlementSummaryGroup,
  MpgfContributionSettlementSummaryLine,
} from "@/lib/mpgf/public-goods-contribution-ledger";

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

function currentState(ledger: MpgfContributionProofLedger) {
  if (ledger.maximumBudgetCents <= 0 && ledger.accounting.grossCapturedCents <= 0) {
    return "no charge";
  }

  return ledger.accounting.proofState === "verified_payment_proof" ? "final" : "pending final review";
}

function settlementValue(state: string, cents: number) {
  if (state === "pending final review") {
    return "pending";
  }

  return formatUsd(cents);
}

function settlementLineValue(state: string, line: MpgfContributionSettlementSummaryLine) {
  if (line.cents != null) {
    return settlementValue(state, line.cents);
  }

  if (line.technicalField === "coordinationCreditCount") {
    return formatCount(line.count ?? 0, "credit");
  }

  if (line.technicalField === "impactCertificateCount") {
    return formatCount(line.count ?? 0, "certificate");
  }

  return String(line.count ?? 0);
}

function settlementGroupText(state: string, group: MpgfContributionSettlementSummaryGroup) {
  if (group.lines.length === 1) {
    return settlementLineValue(state, group.lines[0]);
  }

  return group.lines
    .map((line) => `${line.label.toLowerCase()}: ${settlementLineValue(state, line)}`)
    .join("; ");
}

export function MpgfContributionProofLedger({
  ledger,
}: {
  ledger: MpgfContributionProofLedger;
}) {
  const accounting = ledger.accounting;
  const state = currentState(ledger);

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

      <section className="notice-card" aria-label="Your moral public goods">
        <strong>Your moral public goods</strong>
        <dl className="mpgf-summary-grid">
          <div>
            <dt>Maximum this round</dt>
            <dd>{formatUsd(ledger.maximumBudgetCents)}</dd>
          </div>
          <div>
            <dt>Current state</dt>
            <dd>{state}</dd>
          </div>
        </dl>
        <h3>Plain summary</h3>
        <ul>
          {ledger.settlementSummary.groupOrder.map((groupKey) => {
            const group = ledger.settlementSummary.groups[groupKey];

            return (
              <li key={group.key}>
                {group.label}: {settlementGroupText(state, group)}.
              </li>
            );
          })}
        </ul>
        <p className="mpgf-small">
          Summary numbers keep accounting channels separate: sent-to-project dollars exclude fees,
          rewards, credits, certificates, base match, and bonus match unless separately labeled.
        </p>
      </section>

      <details className="notice-card" aria-label="Technical accounting details drawer">
        <summary>Technical accounting details</summary>
        <ul>
          <li>Gross captured</li>
          <li>Fees</li>
          <li>Net recipient-disbursed</li>
          <li>Actual/gross exposure</li>
          <li>Counted contribution</li>
          <li>Match-eligible contribution</li>
          <li>Base-match claim and paid amount</li>
          <li>Bonus-score units and bonus-match paid amount</li>
          <li>Failure-bonus claim state and denial reason, if any</li>
          <li>Success-reward / coordination-credit / impact-certificate state</li>
          <li>Review, threshold, challenge, payment, and authorization reconciliation states</li>
        </ul>
        <p className="mpgf-small">
          The final receipt uses this same separated technical ledger; the plain summary cannot
          collapse these fields into one impact number.
        </p>
      </details>

      <div className="mpgf-kpi-grid" aria-label="Contribution ledger totals">
        <div className="mpgf-kpi">
          <span>Maximum this round</span>
          <strong>{formatUsd(ledger.maximumBudgetCents)}</strong>
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
            <span>{formatUsd(row.maximumBudgetCents)}</span>
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
