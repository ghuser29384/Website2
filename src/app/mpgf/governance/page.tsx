import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPhaseOneGovernance } from "@/components/mpgf/mpgf-phase-one-governance";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { formatUsd } from "@/lib/mpgf/mechanism";
import {
  loadMpgfPhaseOneGovernanceState,
  loadMpgfPhaseOneParticipantState,
} from "@/lib/mpgf/phase-one-governance";
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
  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      dateOnly
      locale="en-US"
      options={{ day: "numeric", month: "short", year: "numeric" }}
    />
  );
}

export default async function MpgfGovernancePage() {
  const [viewer, phaseOneGovernance] = await Promise.all([
    getViewer(),
    loadMpgfPhaseOneGovernanceState(),
  ]);
  let phaseOneParticipant = null;

  if (viewer && phaseOneGovernance.round) {
    try {
      phaseOneParticipant = await loadMpgfPhaseOneParticipantState(
        phaseOneGovernance.round.id,
      );
    } catch (error) {
      console.error("[mpgf] Could not load private phase-one participant state.", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const governance = getMpgfPublicGoodsGovernanceApi();

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href={`/mpgf/rounds/${demoMpgfAssuranceRound.id}`}>
            View research example
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
      <MpgfPhaseOneGovernance
        governance={phaseOneGovernance}
        participant={phaseOneParticipant}
        viewerPresent={Boolean(viewer)}
      />

      <section className="section-head section-head-compact">
        <div>
          <p className="eyebrow">Research and policy reference</p>
          <h2>Legacy examples below are not live participant activity</h2>
          <p>
            The remaining controls document proposed operator, reviewer, funding,
            and incident rules. Their example amounts and rosters are not
            production pledges, ballots, liquidity, or payments.
          </p>
        </div>
      </section>

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

        {governance.thresholdCalibration ? (
          <article className="mpgf-panel">
            <p className="eyebrow">Next-round threshold calibration</p>
            <h2>Learn from uptake without retuning this round</h2>
            <p>
              Calibration uses aggregate direct support, verified-supporter counts, common-ground
              signals, and sponsor-budget pressure. It cannot mutate current round thresholds.
            </p>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Applies to</dt>
                <dd>{statusLabel(governance.thresholdCalibration.appliesTo)}</dd>
              </div>
              <div>
                <dt>Current round mutation</dt>
                <dd>{governance.thresholdCalibration.currentRoundMutationAllowed ? "allowed" : "blocked"}</dd>
              </div>
              <div>
                <dt>Suggested changes</dt>
                <dd>{governance.thresholdCalibration.suggestedChangeCount}</dd>
              </div>
              <div>
                <dt>Hold for review</dt>
                <dd>{governance.thresholdCalibration.holdForReviewCount}</dd>
              </div>
            </dl>
            <div className="mpgf-table" aria-label="Next-round threshold calibration">
              <div className="mpgf-table-row mpgf-table-head">
                <span>Campaign</span>
                <span>Next amount</span>
                <span>Next donors</span>
              </div>
              {governance.thresholdCalibration.rows.map((row) => (
                <div className="mpgf-table-row" key={row.campaignId}>
                  <span>{row.title}</span>
                  <span>{formatUsd(row.recommendedNextRoundThresholdAmountCents)}</span>
                  <span>{row.recommendedNextRoundThresholdSupporters}</span>
                </div>
              ))}
            </div>
            <Link className="inline-link" href={governance.thresholdCalibration.apiPath}>
              Open threshold-calibration JSON
            </Link>
          </article>
        ) : null}

        {governance.postmortem ? (
          <article className="mpgf-panel">
            <p className="eyebrow">Public postmortem</p>
            <h2>Parameter resets happen only between rounds</h2>
            <p>
              The postmortem template publishes funding outcomes, dispute summary, experiment
              backlog, and next-round parameter reset evidence without private donor rows.
            </p>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Template</dt>
                <dd>{governance.postmortem.publicPostmortemTemplatePublished ? "published" : "pending"}</dd>
              </div>
              <div>
                <dt>Current round mutation</dt>
                <dd>{governance.postmortem.currentRoundMutationAllowed ? "allowed" : "blocked"}</dd>
              </div>
              <div>
                <dt>Suggested resets</dt>
                <dd>{governance.postmortem.nextRoundSuggestedChangeCount}</dd>
              </div>
              <div>
                <dt>Experiments</dt>
                <dd>{governance.postmortem.experimentCount}</dd>
              </div>
            </dl>
            <div className="mpgf-table" aria-label="Public postmortem artifacts">
              <div className="mpgf-table-row mpgf-table-head">
                <span>Artifact</span>
                <span>Status</span>
                <span>Path</span>
              </div>
              {governance.postmortem.requiredPublicArtifacts.map((artifact) => (
                <div className="mpgf-table-row" key={artifact.key}>
                  <span>{statusLabel(artifact.key)}</span>
                  <span>{statusLabel(artifact.status)}</span>
                  <span>{artifact.path}</span>
                </div>
              ))}
            </div>
            <Link className="inline-link" href={governance.postmortem.apiPath}>
              Open public postmortem JSON
            </Link>
          </article>
        ) : null}

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
          <p className="eyebrow">Sponsor-pool flywheel</p>
          <h2>Trade surplus refills matching capital</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Policy</dt>
              <dd>{statusLabel(governance.sponsorPoolFlywheel.flywheelPolicy)}</dd>
            </div>
            <div>
              <dt>Available for round</dt>
              <dd>{formatUsd(governance.sponsorPoolFlywheel.availableForRoundCents)}</dd>
            </div>
            <div>
              <dt>Unfunded sponsor pool</dt>
              <dd>{formatUsd(governance.sponsorPoolFlywheel.unfundedSponsorPoolCents)}</dd>
            </div>
            <div>
              <dt>Calculation hash</dt>
              <dd>{governance.sponsorPoolFlywheel.calcHash.slice(0, 18)}...</dd>
            </div>
          </dl>
          <p>
            Direct sponsor deposits, recurring member tithes, donation-offset surplus, and
            successful-trade surplus can refill the sponsor pool before the round allocation
            formula runs.
          </p>
          <Link className="inline-link" href={governance.sponsorPoolFlywheel.apiPath}>
            Open sponsor-pool flywheel JSON
          </Link>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Source breakdown</p>
          <h2>Aggregate refill sources only</h2>
          <div className="mpgf-table" aria-label="MPGF sponsor-pool flywheel source breakdown">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Source</span>
              <span>Available</span>
              <span>Entries</span>
            </div>
            {governance.sponsorPoolFlywheel.sourceBreakdown.map((source) => (
              <div className="mpgf-table-row" key={source.sourceType}>
                <span>{statusLabel(source.sourceType)}</span>
                <span>{formatUsd(source.availableCents)}</span>
                <span>{source.entryCount}</span>
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

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Legal and compliance readiness</p>
          <h2>Production money movement remains blocked</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(governance.legalComplianceReadiness.status)}</dd>
            </div>
            <div>
              <dt>Money movement</dt>
              <dd>
                {governance.legalComplianceReadiness.productionMoneyMovementAllowed ? "allowed" : "blocked"}
              </dd>
            </div>
            <div>
              <dt>External counsel</dt>
              <dd>{governance.legalComplianceReadiness.externalCounselApprovalRequired ? "required" : "not required"}</dd>
            </div>
            <div>
              <dt>Custody</dt>
              <dd>
                {governance.legalComplianceReadiness.partnerHeldCustodyRequired
                  ? "partner-held required"
                  : "platform-held allowed"}
              </dd>
            </div>
          </dl>
          <p>
            AML/KYC, sanctions, charitable-solicitation, receipt, custody, and money-transmission
            checks are production gates, not allocation inputs or donor moral reputation signals.
          </p>
          <Link className="inline-link" href={governance.legalComplianceReadiness.evidencePath}>
            Open real-money terms
          </Link>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Compliance gates</p>
          <h2>Partner and counsel checks before release</h2>
          <div className="mpgf-table" aria-label="MPGF legal and compliance readiness gates">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Gate</span>
              <span>Owner</span>
              <span>Status</span>
            </div>
            {governance.legalComplianceReadiness.requiredBeforeRealMoney.map((gate) => (
              <div className="mpgf-table-row" key={gate.key}>
                <span>{statusLabel(gate.key)}</span>
                <span>{gate.owner}</span>
                <span>{statusLabel(gate.status)}</span>
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
