import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { getMpgfPublicGoodsGovernanceApi } from "@/lib/mpgf/public-goods-governance";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Governance and Round Rules",
  description:
    "Published MPGF operator roles, reviewer panel structure, round parameters, incident lane, and no-global-ranking boundaries.",
  alternates: {
    canonical: "/mpgf/governance",
  },
  openGraph: {
    title: "MPGF Governance and Round Rules",
    description:
      "Published MPGF operator roles, reviewer panel structure, round parameters, incident lane, and no-global-ranking boundaries.",
    url: getAbsoluteUrl("/mpgf/governance"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MpgfGovernancePage() {
  const viewer = await getViewer();
  const governance = getMpgfPublicGoodsGovernanceApi();

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href={`/mpgf/rounds/${demoMpgfAssuranceRound.id}`}>
            View public round
          </Link>
          <Link className="button button-secondary" href="/mpgf/real-money-terms">
            Refund and payment terms
          </Link>
          <Link className="button button-secondary" href="/api/mpgf/governance">
            Governance API
          </Link>
        </>
      }
      description="Public governance for the Moral Public Goods Fund: who is responsible, how reviewers are split, which parameters are locked, and what this round does not decide."
      eyebrow="Governance and round rules"
      title="Publish the public rules before money moves."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="Governance summary">
        <div className="mpgf-kpi">
          <span>Operator roles</span>
          <strong>{governance.operatorRoster.length}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Reviewer panel roles</span>
          <strong>{governance.reviewerPanel.roleCount}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Sponsor pool</span>
          <strong>{formatUsd(governance.roundRules.sponsorPoolCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Per-donor cap</span>
          <strong>{formatUsd(governance.roundRules.perDonorQfCapCents)}</strong>
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Named operator roster</p>
          <h2>Public responsibility holders</h2>
          <div className="mpgf-gate-list">
            {governance.operatorRoster.map((operator) => (
              <article className="mpgf-gate-row" key={operator.id}>
                <div>
                  <p className="eyebrow">{statusLabel(operator.role)}</p>
                  <h3>{operator.publicName}</h3>
                  <ul className="mpgf-check-list">
                    {operator.responsibilities.map((responsibility) => (
                      <li key={responsibility}>{responsibility}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Reviewer panel structure</p>
          <h2>Split reviewer roles and counts</h2>
          <p>{statusLabel(governance.reviewerPanel.namedRosterStatus)}</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Structure published</dt>
              <dd>{governance.reviewerPanel.structurePublished ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt>Minimum reviewers</dt>
              <dd>{governance.reviewerPanel.minimumReviewerCount}</dd>
            </div>
          </dl>
          <div className="mpgf-table" aria-label="MPGF reviewer panel roles">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Role</span>
              <span>Count</span>
              <span>Responsibilities</span>
            </div>
            {governance.reviewerPanel.roles.map((role) => (
              <div className="mpgf-table-row" key={role.role}>
                <span>{statusLabel(role.role)}</span>
                <span>{role.minimumCount}</span>
                <span>{role.responsibilities.join(", ")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Locked round parameters</p>
          <h2>Round rules, caps, thresholds, and refund path</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Formula version</dt>
              <dd>{governance.roundRules.formulaVersion}</dd>
            </div>
            <div>
              <dt>Round window</dt>
              <dd>
                {formatDate(governance.roundRules.startsAt)} - {formatDate(governance.roundRules.endsAt)}
              </dd>
            </div>
            <div>
              <dt>Base match ratio</dt>
              <dd>{governance.roundRules.baseMatchRatio}:1</dd>
            </div>
            <div>
              <dt>QF cap multiple</dt>
              <dd>{governance.roundRules.qfCapMultiple}x direct eligible total</dd>
            </div>
            <div>
              <dt>Parameters locked</dt>
              <dd>{governance.roundRules.parametersLockedBeforeDonationsOpen ? "before donations open" : "not locked"}</dd>
            </div>
            <div>
              <dt>Refund policy</dt>
              <dd>
                <Link className="inline-link" href={governance.roundRules.refundPolicyPath}>
                  published terms
                </Link>
              </dd>
            </div>
          </dl>
          <p>{governance.roundRules.parameterChangePolicy}.</p>
          <p>{governance.roundRules.sponsorEarmarkPolicy}.</p>
          <p>Unmatched sponsor funds: {statusLabel(governance.roundRules.unmatchedSponsorFundsRule)}.</p>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Campaign thresholds</p>
          <h2>Published thresholds before contributions</h2>
          <div className="mpgf-table" aria-label="Published campaign thresholds">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Campaign</span>
              <span>Amount</span>
              <span>Donors</span>
            </div>
            {governance.roundRules.campaignThresholds.map((campaign) => (
              <div className="mpgf-table-row" key={campaign.campaignId}>
                <span>{campaign.title}</span>
                <span>{formatUsd(campaign.thresholdAmountCents)}</span>
                <span>{campaign.thresholdDonors}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Funds-flow separation</p>
          <h2>Keep platform, receipts, custody, and payouts distinct</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Phase-one custody</dt>
              <dd>{statusLabel(governance.fundsFlowSeparation.phaseOneCustodyPolicy)}</dd>
            </div>
            <div>
              <dt>Legal recipient role</dt>
              <dd>{governance.fundsFlowSeparation.legalRecipientPolicy}</dd>
            </div>
          </dl>
          <ul className="mpgf-check-list">
            {governance.fundsFlowSeparation.invariants.map((invariant) => (
              <li key={invariant}>{invariant}</li>
            ))}
          </ul>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Partner-held roles</p>
          <h2>Who does what before money moves</h2>
          <div className="mpgf-table" aria-label="MPGF funds-flow role separation">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Role</span>
              <span>Holder</span>
              <span>Responsibilities</span>
            </div>
            {governance.fundsFlowSeparation.roles.map((role) => (
              <div className="mpgf-table-row" key={role.key}>
                <span>{statusLabel(role.key)}</span>
                <span>{role.holder}</span>
                <span>{role.responsibilities.join(", ")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mpgf-detail-grid" id="incident-dispute-lane">
        <article className="mpgf-panel">
          <p className="eyebrow">Conflict, recusal, and appeal paths</p>
          <h2>Reviewer conflicts block assignment</h2>
          <p>{governance.conflictAndRecusalRules.summary}</p>
          <ul className="mpgf-check-list">
            {governance.conflictAndRecusalRules.automaticChecks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <p>{governance.conflictAndRecusalRules.recusalEnforcement}.</p>
          <p>Appeal intake endpoint: {governance.conflictAndRecusalRules.appealPath}.</p>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Public incident and dispute lane</p>
          <h2>Disputes pause unreleased milestones</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Statuses</dt>
              <dd>{governance.incidentAndDisputeLane.statuses.join(", ")}</dd>
            </div>
            <div>
              <dt>Unreleased milestones</dt>
              <dd>{governance.incidentAndDisputeLane.pausesUnreleasedMilestones ? "paused on dispute" : "not paused"}</dd>
            </div>
            <div>
              <dt>Public summary policy</dt>
              <dd>{governance.incidentAndDisputeLane.publicSummaryPolicy}</dd>
            </div>
          </dl>
          <p>
            The private reviewer queue remains gated, but public campaign pages and this governance
            page publish aggregate dispute state and appeal status without raw evidence URLs.
          </p>
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">What this round does not decide</p>
          <h2>No global moral ranking</h2>
          <ul className="mpgf-check-list">
            {governance.whatRoundDoesNotDecide.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Prohibited governance mechanisms</p>
          <h2>No token or reputation-weighted control</h2>
          <ul className="mpgf-check-list">
            {governance.prohibitedGovernanceMechanisms.map((mechanism) => (
              <li key={mechanism}>{statusLabel(mechanism)}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section section-subtle">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Deployment checklist</p>
          <h2>Published status before production money movement</h2>
        </div>
        <div className="mpgf-table" aria-label="MPGF production deployment checklist">
          <div className="mpgf-table-row mpgf-table-head">
            <span>Gate</span>
            <span>Status</span>
            <span>Evidence</span>
          </div>
          {governance.deploymentChecklist.beforeProd.map((item) => (
            <div className="mpgf-table-row" key={item.key}>
              <span>{statusLabel(item.key)}</span>
              <span>{statusLabel(item.status)}</span>
              <span>{item.evidencePath}</span>
            </div>
          ))}
        </div>
      </section>
    </MpgfPageFrame>
  );
}
