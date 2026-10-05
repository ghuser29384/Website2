import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { linkMpgfDacProposalRevisionAction } from "@/app/mpgf/actions";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { loadMpgfDacCreatorProposal } from "@/lib/mpgf/dac-lifecycle";
import { getMpgfDacLifecycleStage } from "@/lib/mpgf/dac-lifecycle-model";
import { formatUsd } from "@/lib/mpgf/mechanism";

export const metadata: Metadata = {
  title: "MPGF Pool Proposal Status",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface MpgfProposalStatusPageProps {
  params: Promise<{ proposalId: string }>;
}

function statusLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "not recorded";
}

function DateValue({ value }: { value: string | null | undefined }) {
  if (!value) return <>Not recorded</>;
  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      locale="en-US"
      options={{ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }}
    />
  );
}

export default async function MpgfProposalStatusPage({ params }: MpgfProposalStatusPageProps) {
  const { proposalId } = await params;
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <MpgfPageFrame
        actions={<Link className="button button-primary" href={`/login?returnTo=/mpgf/pools/proposals/${proposalId}`}>Sign in</Link>}
        description="Proposal status, exact frozen terms, and lifecycle evidence are visible only to the proposal creator."
        eyebrow="Creator receipt"
        title="Sign in to view this proposal."
        viewerPresent={false}
      >
        <section className="mpgf-panel">
          <p>This route does not expose private proposal or review evidence to signed-out visitors.</p>
        </section>
      </MpgfPageFrame>
    );
  }

  const proposal = await loadMpgfDacCreatorProposal({
    proposalId,
    userId: viewer.authUser.id,
  });

  if (!proposal) notFound();

  const stage = getMpgfDacLifecycleStage({
    proposalStatus: proposal.status,
    campaignReviewStatus: proposal.campaign?.reviewStatus,
    outcomeStatus: proposal.campaign?.outcome?.status,
  });
  const campaignPath = proposal.campaign ? `/mpgf/campaigns/${proposal.campaign.slug || proposal.campaign.id}` : null;

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-secondary" href="/mpgf/pools/new?template=threshold-coalition">
            New pool proposal
          </Link>
          {campaignPath ? (
            <Link className="button button-primary" href={campaignPath}>
              View public campaign
            </Link>
          ) : null}
        </>
      }
      description="Creator-only review status, immutable version evidence, publication state, and terminal outcome for this conditional public-good pool."
      eyebrow="Creator lifecycle receipt"
      title={proposal.title}
      viewerPresent
    >
      <section className="mpgf-kpi-grid" aria-label="Proposal lifecycle summary">
        <div className="mpgf-kpi">
          <span>Lifecycle stage</span>
          <strong>{statusLabel(stage)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Proposal status</span>
          <strong>{statusLabel(proposal.status)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Terms version</span>
          <strong>v{proposal.approvedTermsVersion ?? proposal.termsVersion}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Public campaign</span>
          <strong>{proposal.campaign ? statusLabel(proposal.campaign.reviewStatus) : "not published"}</strong>
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Current decision</p>
          <h2>{statusLabel(proposal.status)}</h2>
          <p>{proposal.reviewReason ?? "No reviewer rationale has been recorded yet."}</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Submitted</dt>
              <dd><DateValue value={proposal.createdAt} /></dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd><DateValue value={proposal.reviewedAt} /></dd>
            </div>
            <div>
              <dt>Terms locked</dt>
              <dd><DateValue value={proposal.termsLockedAt} /></dd>
            </div>
            <div>
              <dt>Supersedes</dt>
              <dd>{proposal.supersedesProposalId ?? "No earlier version"}</dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Frozen-term binding</p>
          <h2>{proposal.operativeTermsSha256 ? "Exact terms are locked" : "Terms are not yet frozen"}</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Current version</dt>
              <dd>v{proposal.termsVersion}</dd>
            </div>
            <div>
              <dt>Approved version</dt>
              <dd>{proposal.approvedTermsVersion ? `v${proposal.approvedTermsVersion}` : "Not approved"}</dd>
            </div>
            <div>
              <dt>Operative SHA-256</dt>
              <dd className="mpgf-break-text">{proposal.operativeTermsSha256 ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Failure-bonus schedule</dt>
              <dd>{statusLabel(proposal.failureBonusScheduleStatus)}</dd>
            </div>
          </dl>
          <p className="mpgf-small">
            A pledge can bind only to the published campaign, approved version, and exact operative hash shown here.
          </p>
        </article>
      </section>

      {proposal.status === "changes_requested" ? (
        <section className="mpgf-panel">
          <p className="eyebrow">Creator revision required</p>
          <h2>Submit a successor proposal, then bind it to this review record.</h2>
          <p>{proposal.reviewReason ?? "The reviewer requested a revised exact-terms proposal."}</p>
          <p>
            Create and submit a new proposal first. Its terms remain a separate immutable snapshot;
            this linkage records that it supersedes this changes-requested version.
          </p>
          <div>
            <Link className="button button-secondary" href="/mpgf/pools/new?template=threshold-coalition">
              Create successor proposal
            </Link>
          </div>
          <form className="mpgf-dac-review-actions" action={linkMpgfDacProposalRevisionAction}>
            <input name="prior_proposal_id" type="hidden" value={proposal.id} />
            <label>
              Submitted successor proposal ID
              <input name="new_proposal_id" required pattern="[0-9a-fA-F-]{36}" />
            </label>
            <label>
              Revision rationale
              <textarea
                name="reason"
                required
                minLength={20}
                maxLength={1000}
                defaultValue="Submitted a revised proposal addressing the recorded review request."
              />
            </label>
            <button className="button button-primary" type="submit">Link submitted revision</button>
          </form>
        </section>
      ) : null}

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Submitted public-good terms</p>
          <h2>Threshold and verification</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Net threshold</dt>
              <dd>{proposal.thresholdAmountCents == null ? "Not set" : formatUsd(proposal.thresholdAmountCents)}</dd>
            </div>
            <div>
              <dt>Minimum supporters</dt>
              <dd>{proposal.thresholdSupporters ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd><DateValue value={proposal.deadlineAt} /></dd>
            </div>
            <div>
              <dt>Failure bonus</dt>
              <dd>{proposal.failureBonusEnabled ? `${(proposal.failureBonusRateBps ?? 0) / 100}% base rate` : "Disabled"}</dd>
            </div>
            <div>
              <dt>Success premium</dt>
              <dd>{proposal.successPremiumCents == null ? "Not quoted" : formatUsd(proposal.successPremiumCents)}</dd>
            </div>
            <div>
              <dt>Pledge mode</dt>
              <dd>{statusLabel(proposal.payoutMethod)}</dd>
            </div>
          </dl>
          <h3>Verification method</h3>
          <p>{proposal.verificationMethod ?? "Not supplied"}</p>
          <h3>Baseline rule</h3>
          <p>{proposal.baselineRule ?? "Not supplied"}</p>
          <h3>Exit rule</h3>
          <p>{proposal.exitRule ?? "Not supplied"}</p>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Publication and outcome</p>
          <h2>{proposal.campaign ? proposal.campaign.title : "Not yet public"}</h2>
          {proposal.campaign ? (
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Campaign ID</dt>
                <dd className="mpgf-break-text">{proposal.campaign.id}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd><DateValue value={proposal.campaign.publishedAt} /></dd>
              </div>
              <div>
                <dt>Published version</dt>
                <dd>v{proposal.campaign.publishedTermsVersion}</dd>
              </div>
              <div>
                <dt>Published SHA-256</dt>
                <dd className="mpgf-break-text">{proposal.campaign.publishedTermsSha256}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{proposal.campaign.outcome ? statusLabel(proposal.campaign.outcome.status) : "Not finalized"}</dd>
              </div>
              <div>
                <dt>Evaluated</dt>
                <dd><DateValue value={proposal.campaign.outcome?.evaluatedAt} /></dd>
              </div>
            </dl>
          ) : (
            <p>
              Submission and approval do not publish automatically. An authorized reviewer must materialize the exact approved version into an eligible public round.
            </p>
          )}
          {proposal.campaign?.outcome ? (
            <p>
              Final aggregate: {formatUsd(proposal.campaign.outcome.eligibleAmountCents)} from {proposal.campaign.outcome.eligibleSupporterCount} eligible supporter{proposal.campaign.outcome.eligibleSupporterCount === 1 ? "" : "s"}.
            </p>
          ) : null}
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Immutable versions</p>
          <h2>Recorded proposal snapshots</h2>
          {proposal.versions.length > 0 ? (
            <ol className="mpgf-check-list">
              {proposal.versions.map((version) => (
                <li key={`${version.proposalId}:${version.termsVersion}`}>
                  <strong>v{version.termsVersion}</strong> · {version.termsSha256} · {version.recordedReason} · <DateValue value={version.recordedAt} />
                </li>
              ))}
            </ol>
          ) : (
            <p>No immutable version snapshot is visible yet.</p>
          )}
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Append-only audit trail</p>
          <h2>Lifecycle events</h2>
          {proposal.lifecycleEvents.length > 0 ? (
            <ol className="mpgf-check-list">
              {proposal.lifecycleEvents.map((event) => (
                <li key={event.id}>
                  <strong>{statusLabel(event.eventType)}</strong> · v{event.termsVersion} · {statusLabel(event.fromStatus)} → {statusLabel(event.toStatus)} · {event.reason} · <DateValue value={event.createdAt} />
                </li>
              ))}
            </ol>
          ) : (
            <p>No reviewer lifecycle event has been recorded yet.</p>
          )}
        </article>
      </section>

      <section className="mpgf-panel">
        <p className="eyebrow">No-payment boundary</p>
        <h2>This lifecycle currently records proposals, immutable consent, eligibility, and outcomes—not money movement.</h2>
        <p>
          It does not create a payment method, mandate, authorization, charge, capture, settlement, refund, success-premium transfer, or failure-bonus payout.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
