"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { demoAlternatives, demoBallots, demoCycle, demoPledges, MPGF_COPY } from "@/lib/mpgf/data";
import {
  buildDemoBallotFromWeights,
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  formatUsd,
  getPledgedCents,
  isLedgerBalanced,
} from "@/lib/mpgf/mechanism";

type MpgfConsoleTab = "contribute" | "pools" | "ballot" | "summary";

const tabs: Array<{ id: MpgfConsoleTab; label: string }> = [
  { id: "contribute", label: "Pledge" },
  { id: "pools", label: "Pools" },
  { id: "ballot", label: "Ballot" },
  { id: "summary", label: "Summary" },
];

export function MpgfConsole({ initialTab = "contribute" }: { initialTab?: MpgfConsoleTab }) {
  const [activeTab, setActiveTab] = useState<MpgfConsoleTab>(initialTab);
  const [oneTimePledge, setOneTimePledge] = useState(25);
  const [monthlyPledge, setMonthlyPledge] = useState(10);
  const [proposalTitle, setProposalTitle] = useState("Community public-goods evaluation reserve");
  const [proposalProblem, setProposalProblem] = useState(
    "Many cause areas lack comparable public evidence that different moral views can inspect together.",
  );
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps])),
  );

  const localBallot = useMemo(() => buildDemoBallotFromWeights(weights), [weights]);
  const budgetCents = demoCycle.budgetCents + Math.round(oneTimePledge * 100) + Math.round(monthlyPledge * 100);
  const allocation = useMemo(
    () => computeExactMpgfAllocation({ ballots: [...demoBallots, localBallot], budgetCents }),
    [budgetCents, localBallot],
  );
  const publicSummary = useMemo(() => buildPublicSummary({ allocation }), [allocation]);
  const ledgerTransactions = useMemo(() => buildDemoLedgerTransactions(demoPledges), []);
  const ledgerBalanced = ledgerTransactions.every(isLedgerBalanced);

  function updateWeight(alternativeId: string, value: number) {
    setWeights((current) => ({
      ...current,
      [alternativeId]: value,
    }));
  }

  return (
    <section className="mpgf-console" aria-label="Moral Public Goods Fund direct-working console">
      <div className="mpgf-console-toolbar" role="tablist" aria-label="MPGF workflow">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className="mpgf-tab"
            role="tab"
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "contribute" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Contribution mode</p>
            <h2>Create non-real-money pledge state</h2>
            <p>{MPGF_COPY.pledgeOnly}</p>
            <div className="mpgf-form-grid">
              <label>
                One-time pledge
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={oneTimePledge}
                    onChange={(event) => setOneTimePledge(Number(event.currentTarget.value))}
                  />
                </span>
              </label>
              <label>
                Monthly recurring pledge
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={monthlyPledge}
                    onChange={(event) => setMonthlyPledge(Number(event.currentTarget.value))}
                  />
                </span>
              </label>
            </div>
            <div className="mpgf-confirmation" role="status">
              Demo pledge total: {formatUsd(Math.round(oneTimePledge * 100) + Math.round(monthlyPledge * 100))}
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Safety gate</p>
            <h2>No payment provider objects</h2>
            <ul className="mpgf-check-list">
              <li>Stripe is not called by MPGF pledge-only mode.</li>
              <li>No tax, escrow, refund, or donation receipt claim is made.</li>
              <li>Monthly pledges are not subscriptions or charges.</li>
              <li>Demo ledger templates are double-entry balanced: {ledgerBalanced ? "yes" : "no"}.</li>
            </ul>
          </section>
        </div>
      ) : null}

      {activeTab === "pools" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Pool proposal</p>
            <h2>Draft a candidate moral public good</h2>
            <label>
              Proposal title
              <input value={proposalTitle} onChange={(event) => setProposalTitle(event.currentTarget.value)} />
            </label>
            <label>
              Problem statement
              <textarea value={proposalProblem} onChange={(event) => setProposalProblem(event.currentTarget.value)} />
            </label>
            <div className="mpgf-confirmation" role="status">
              Draft only. This route performs no live authorization, payout, or real-money accounting.
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Visible demo pools</p>
            <div className="mpgf-pool-list">
              {demoAlternatives.map((alternative) => (
                <article key={alternative.id} className="mpgf-pool-row">
                  <div>
                    <h3>{alternative.shortName}</h3>
                    <p>{alternative.moralPublicGoodRationale}</p>
                  </div>
                  <Link className="inline-link" href={`/mpgf/pools/${alternative.id}`}>
                    View
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "ballot" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Bounded ballot</p>
            <h2>Set marginal-value weights</h2>
            <p>
              Weights are integer basis points. The demo normalizes the local ballot and combines it with
              fixture ballots before exact integer allocation.
            </p>
            <div className="mpgf-slider-list">
              {demoAlternatives.map((alternative) => (
                <label key={alternative.id}>
                  <span>
                    {alternative.shortName}
                    <strong>{weights[alternative.id] ?? 0} bps</strong>
                  </span>
                  <input
                    max="10000"
                    min="0"
                    step="100"
                    type="range"
                    value={weights[alternative.id] ?? 0}
                    onChange={(event) => updateWeight(alternative.id, Number(event.currentTarget.value))}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Certified allocation preview</p>
            <h2>{formatUsd(allocation.allocatedCents)} allocated</h2>
            <div className="mpgf-allocation-bars">
              {allocation.lines.map((line) => (
                <div key={line.alternativeId} className="mpgf-allocation-row">
                  <div>
                    <span>{line.name}</span>
                    <strong>{formatUsd(line.allocationCents)}</strong>
                  </div>
                  <meter max={allocation.budgetCents} value={line.allocationCents} />
                </div>
              ))}
            </div>
            <p className="mpgf-small">
              Certificate: {allocation.certificate.algorithm}; tie break:{" "}
              {allocation.certificate.deterministicTieBreak.replaceAll("_", " ")}.
            </p>
          </section>
        </div>
      ) : null}

      {activeTab === "summary" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Public summary</p>
            <h2>Safe non-real-money summary</h2>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Demo budget</dt>
                <dd>{formatUsd(publicSummary.budgetCents)}</dd>
              </div>
              <div>
                <dt>Fixture pledges</dt>
                <dd>{formatUsd(getPledgedCents())}</dd>
              </div>
              <div>
                <dt>Released internally</dt>
                <dd>{formatUsd(publicSummary.releasedInternalCents)}</dd>
              </div>
              <div>
                <dt>Externally paid</dt>
                <dd>{formatUsd(publicSummary.externallyPaidCents)}</dd>
              </div>
            </dl>
            <p>{publicSummary.disclaimers.allocationDisbursementStatus}</p>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Required disclaimers</p>
            <ul className="mpgf-check-list">
              {Object.entries(publicSummary.disclaimers).map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
