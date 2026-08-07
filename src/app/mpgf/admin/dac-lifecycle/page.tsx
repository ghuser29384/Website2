import type { Metadata } from "next";
import Link from "next/link";

import {
  approveAndFreezeMpgfDacProposalAction,
  beginMpgfDacProposalReviewAction,
  finalizeMpgfDacCampaignAction,
  publishMpgfDacProposalAction,
  rejectMpgfDacProposalAction,
  requestMpgfDacProposalChangesAction,
  reviewMpgfDacPledgeEligibilityAction,
} from "@/app/mpgf/admin/actions";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { loadMpgfDacReviewerWorkspace } from "@/lib/mpgf/dac-lifecycle";
import { getMpgfDacLifecycleStage } from "@/lib/mpgf/dac-lifecycle-model";
import { formatUsd } from "@/lib/mpgf/mechanism";

export const metadata: Metadata = {
  title: "MPGF DAC Lifecycle Review",
  description: "MFA-gated exact-version review, publication, eligibility, and terminal-outcome controls.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "not recorded";
}

function defaultSlug(title: string, id: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 76)
    .replace(/-+$/g, "");
  return `${slug || "public-good-pool"}-${id.slice(0, 8)}`;
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

export default async function MpgfDacLifecycleAdminPage() {
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  const mfaSummary = isAdmin ? await loadBackgroundAccountSecuritySummary() : null;
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer?.authUser.email,
    mfaSummary,
  });

  let workspace: Awaited<ReturnType<typeof loadMpgfDacReviewerWorkspace>> | null = null;
  let loadError: string | null = null;
  if (adminAccess.allowed && viewer) {
    try {
      workspace = await loadMpgfDacReviewerWorkspace(viewer.authUser.id);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "DAC lifecycle workspace could not be loaded.";
    }
  }

  const authorization = workspace?.reviewerAuthorization ?? null;
  const reviewerAuthorized = Boolean(
    authorization?.active &&
    (!authorization.expiresAt || Date.parse(authorization.expiresAt) > Date.now()),
  );

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-secondary" href="/mpgf/admin">All admin sections</Link>
        ) : (
          <Link className="button button-primary" href="/login?returnTo=/mpgf/admin/dac-lifecycle">Sign in</Link>
        )
      }
      description="Authorized reviewers move exact proposal versions through review, publication, pledge eligibility, and exactly-once success or lapse."
      eyebrow="MFA-gated reviewer workspace"
      modeItems={[
        "Reviewer registry required",
        "Append-only versions and events",
        "Canonical DAC pledge ledger",
        "Exactly-once terminal outcome",
      ]}
      participationTitle="Authority boundaries"
      participationItems={[
        { label: "Admin session", description: "The route requires an allowlisted account and active MFA." },
        { label: "Reviewer registry", description: "Lifecycle RPCs independently require a current mpgf_pool_reviewers authorization." },
        { label: "Exact terms", description: "Approval freezes a recorded version and SHA-256; publication rechecks the same snapshot." },
        { label: "No payments", description: "These controls record review and outcome state only; they cannot authorize or move money." },
      ]}
      title="DAC lifecycle review."
      viewerPresent={Boolean(viewer)}
    >
      {!adminAccess.allowed ? (
        <section className="mpgf-panel">
          <p className="eyebrow">Access denied</p>
          <h2>Admin access required</h2>
          <p>{adminAccess.message}</p>
          {isAdmin ? <Link className="button button-secondary" href="/dashboard#account-security">Open account security</Link> : null}
        </section>
      ) : loadError ? (
        <section className="mpgf-panel">
          <p className="eyebrow">Fail-closed data boundary</p>
          <h2>Reviewer workspace unavailable</h2>
          <p>{loadError}</p>
        </section>
      ) : workspace ? (
        <>
          <section className="mpgf-kpi-grid" aria-label="DAC review queue summary">
            <div className="mpgf-kpi">
              <span>Reviewer authorization</span>
              <strong>{reviewerAuthorized ? "active" : "not active"}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Proposal records</span>
              <strong>{workspace.proposals.length}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Pending eligibility</span>
              <strong>{workspace.pendingPledges.length}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Eligible publication rounds</span>
              <strong>{workspace.publicationRounds.length}</strong>
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Independent reviewer authorization</p>
            <h2>{reviewerAuthorized ? "This operator can invoke lifecycle decisions" : "Lifecycle decisions are disabled by the RPC layer"}</h2>
            {authorization ? (
              <dl className="mpgf-summary-grid">
                <div><dt>Reviewer ID</dt><dd className="mpgf-break-text">{authorization.reviewerId}</dd></div>
                <div><dt>Active</dt><dd>{authorization.active ? "yes" : "no"}</dd></div>
                <div><dt>Authorized</dt><dd><DateValue value={authorization.authorizedAt} /></dd></div>
                <div><dt>Expires</dt><dd><DateValue value={authorization.expiresAt} /></dd></div>
                <div><dt>Rationale</dt><dd>{authorization.rationale}</dd></div>
              </dl>
            ) : (
              <p>
                This admin is not present in the service-managed reviewer registry. The controls below remain visible for inspection, but the database functions will reject every lifecycle decision.
              </p>
            )}
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Proposal lifecycle</p>
            <h2>Review, freeze, publish, and finalize</h2>
            <div className="mpgf-pool-list">
              {workspace.proposals.map((proposal) => {
                const stage = getMpgfDacLifecycleStage({
                  proposalStatus: proposal.status,
                  campaignReviewStatus: proposal.campaignReviewStatus,
                  outcomeStatus: proposal.outcomeStatus,
                });
                return (
                  <article className="mpgf-pool-row mpgf-dac-review-row" key={proposal.id}>
                    <div className="mpgf-dac-review-copy">
                      <p className="eyebrow">{label(stage)}</p>
                      <h3>{proposal.title}</h3>
                      <p>{proposal.summary}</p>
                      <dl className="mpgf-summary-grid">
                        <div><dt>Proposal ID</dt><dd className="mpgf-break-text">{proposal.id}</dd></div>
                        <div><dt>Status</dt><dd>{label(proposal.status)}</dd></div>
                        <div><dt>Terms</dt><dd>v{proposal.approvedTermsVersion ?? proposal.termsVersion}</dd></div>
                        <div><dt>Terms SHA-256</dt><dd className="mpgf-break-text">{proposal.operativeTermsSha256 ?? "not frozen"}</dd></div>
                        <div><dt>Threshold</dt><dd>{proposal.thresholdAmountCents == null ? "not set" : formatUsd(proposal.thresholdAmountCents)}</dd></div>
                        <div><dt>Supporters</dt><dd>{proposal.thresholdSupporters ?? "not set"}</dd></div>
                        <div><dt>Deadline</dt><dd><DateValue value={proposal.deadlineAt} /></dd></div>
                        <div><dt>Schedule</dt><dd>{label(proposal.failureBonusScheduleStatus)}</dd></div>
                        <div><dt>Campaign</dt><dd>{proposal.campaignId ?? "not published"}</dd></div>
                        <div><dt>Outcome</dt><dd>{label(proposal.outcomeStatus)}</dd></div>
                      </dl>
                      {proposal.campaignSlug ? (
                        <Link className="inline-link" href={`/mpgf/campaigns/${proposal.campaignSlug}`}>View public campaign</Link>
                      ) : null}
                    </div>

                    <div className="mpgf-dac-review-actions">
                      {proposal.status === "submitted" ? (
                        <>
                          <form action={beginMpgfDacProposalReviewAction}>
                            <input name="proposal_id" type="hidden" value={proposal.id} />
                            <label>Review-start rationale<textarea name="reason" required minLength={20} defaultValue="Begin exact-version review after confirming the proposal is complete." /></label>
                            <button className="button button-primary" disabled={!reviewerAuthorized} type="submit">Begin review</button>
                          </form>
                          <form action={rejectMpgfDacProposalAction}>
                            <input name="proposal_id" type="hidden" value={proposal.id} />
                            <label>Rejection rationale<textarea name="reason" required minLength={20} /></label>
                            <button className="button button-secondary" disabled={!reviewerAuthorized} type="submit">Reject proposal</button>
                          </form>
                        </>
                      ) : null}

                      {proposal.status === "under_review" ? (
                        <>
                          <form action={approveAndFreezeMpgfDacProposalAction}>
                            <input name="proposal_id" type="hidden" value={proposal.id} />
                            <label>Approval rationale<textarea name="reason" required minLength={20} defaultValue="Approve the reviewed proposal and freeze this exact recorded version." /></label>
                            <button className="button button-primary" disabled={!reviewerAuthorized} type="submit">Approve and freeze</button>
                          </form>
                          <form action={requestMpgfDacProposalChangesAction}>
                            <input name="proposal_id" type="hidden" value={proposal.id} />
                            <label>Required changes<textarea name="reason" required minLength={20} /></label>
                            <button className="button button-secondary" disabled={!reviewerAuthorized} type="submit">Request changes</button>
                          </form>
                          <form action={rejectMpgfDacProposalAction}>
                            <input name="proposal_id" type="hidden" value={proposal.id} />
                            <label>Rejection rationale<textarea name="reason" required minLength={20} /></label>
                            <button className="button button-secondary" disabled={!reviewerAuthorized} type="submit">Reject proposal</button>
                          </form>
                        </>
                      ) : null}

                      {proposal.status === "approved_as_candidate" && !proposal.campaignId ? (
                        <form action={publishMpgfDacProposalAction}>
                          <input name="proposal_id" type="hidden" value={proposal.id} />
                          <label>
                            Publication round
                            <select name="round_id" required defaultValue={workspace.publicationRounds[0]?.id ?? ""}>
                              <option disabled value="">Choose a scheduled or open round</option>
                              {workspace.publicationRounds.map((round) => (
                                <option key={round.id} value={round.id}>{round.name} · {round.status}</option>
                              ))}
                            </select>
                          </label>
                          <label>Public slug<input name="slug" required defaultValue={defaultSlug(proposal.title, proposal.id)} /></label>
                          <label>Publication rationale<textarea name="reason" required minLength={20} defaultValue="Publish the exact approved and frozen proposal into this eligible public round." /></label>
                          <button className="button button-primary" disabled={!reviewerAuthorized || workspace.publicationRounds.length === 0} type="submit">Publish frozen terms</button>
                        </form>
                      ) : null}

                      {proposal.status === "approved_as_candidate" && proposal.campaignId && !proposal.outcomeStatus ? (
                        <form action={finalizeMpgfDacCampaignAction}>
                          <input name="campaign_id" type="hidden" value={proposal.campaignId} />
                          <label>Terminal-outcome rationale<textarea name="reason" required minLength={20} defaultValue="Finalize against the canonical eligible pledge ledger and exact published thresholds." /></label>
                          <button className="button button-primary" disabled={!reviewerAuthorized} type="submit">Evaluate success or lapse</button>
                        </form>
                      ) : null}

                      {proposal.status === "changes_requested" ? (
                        <p className="mpgf-small">Waiting for the creator to submit and link a successor proposal version.</p>
                      ) : null}
                      {proposal.outcomeStatus ? (
                        <p className="mpgf-small">Terminal outcome is immutable. Repeated finalization must return the same record.</p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {workspace.proposals.length === 0 ? <p>No submitted or active DAC proposal is in the queue.</p> : null}
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Pledge eligibility</p>
            <h2>Canonical pending DAC pledges</h2>
            <div className="mpgf-pool-list">
              {workspace.pendingPledges.map((pledge) => (
                <article className="mpgf-pool-row mpgf-dac-review-row" key={pledge.id}>
                  <div className="mpgf-dac-review-copy">
                    <h3>{formatUsd(pledge.amountCents)} · {pledge.campaignId}</h3>
                    <p className="mpgf-break-text">Pledge {pledge.id}</p>
                    <p>Profile {pledge.profileId} · terms v{pledge.termsVersion} · expires <DateValue value={pledge.expiresAt} /></p>
                    <p className="mpgf-break-text">{pledge.termsSha256}</p>
                  </div>
                  <form className="mpgf-dac-review-actions" action={reviewMpgfDacPledgeEligibilityAction}>
                    <input name="pledge_id" type="hidden" value={pledge.id} />
                    <label>
                      Eligibility decision
                      <select name="eligibility_state" defaultValue="eligible">
                        <option value="eligible">Eligible</option>
                        <option value="duplicate_identity">Duplicate identity</option>
                        <option value="below_minimum">Below minimum</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </label>
                    <label>
                      Human score (basis points)
                      <input name="human_score_bps" min="0" max="10000" step="1" type="number" defaultValue="10000" />
                      <span className="mpgf-small">Required for Eligible. Every ineligible decision is recorded with a zero score.</span>
                    </label>
                    <label>Eligibility rationale<textarea name="reason" required minLength={20} defaultValue="Eligibility reviewed against the exact frozen campaign and identity rules." /></label>
                    <button className="button button-primary" disabled={!reviewerAuthorized} type="submit">Record final eligibility</button>
                  </form>
                </article>
              ))}
              {workspace.pendingPledges.length === 0 ? <p>No canonical DAC pledge is awaiting eligibility review.</p> : null}
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">No-payment boundary</p>
            <h2>These controls cannot create custody or settlement.</h2>
            <p>
              Review, frozen-term publication, eligibility, success, lapse, and pledge expiry are auditable state transitions. Payment authorization, capture, refund, success-premium transfer, and failure-bonus payout remain outside this tranche.
            </p>
          </section>
        </>
      ) : null}
    </MpgfPageFrame>
  );
}
