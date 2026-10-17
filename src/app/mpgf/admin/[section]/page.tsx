import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import {
  loadMpgfProductionControlPlaneSummary,
  mpgfGatesForAdminSection,
} from "@/lib/mpgf/control-plane";
import { mpgfAdminSections } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";
import {
  MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES,
  formatUsd,
  summarizeMpgfPublicGoodsReviewConsole,
} from "@/lib/mpgf/mechanism";
import { getMpgfPublicGoodsAdminConsole } from "@/lib/mpgf/public-goods-admin-consoles";
import { loadPendingMpgfFailureBonusSchedules } from "@/lib/mpgf/failure-bonus-operator";
import type { MpgfPublicGoodsReviewAction, MpgfPublicGoodsReviewReasonCode } from "@/lib/mpgf/types";
import {
  approveMpgfFailureBonusScheduleAction,
  approveMpgfRealMoneyGateAction,
  recordMpgfAdminApprovalRecordAction,
  recordMpgfPublicGoodsReviewAction,
  runMpgfProductionHealthCheckAction,
} from "../actions";

interface MpgfAdminSectionPageProps {
  params: Promise<{ section: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: MpgfAdminSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const sectionKnown = mpgfAdminSections.includes(section as (typeof mpgfAdminSections)[number]);
  const sectionLabel = section.replaceAll("-", " ");

  if (!sectionKnown) {
    return {
      title: "MPGF Admin Section",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `MPGF Admin: ${sectionLabel}`,
    description: "Gated MPGF admin section for direct-working route readiness.",
    alternates: {
      canonical: `/mpgf/admin/${section}`,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `MPGF Admin: ${sectionLabel}`,
      description: "Gated MPGF admin section for direct-working route readiness.",
      url: getAbsoluteUrl(`/mpgf/admin/${section}`),
      type: "website",
    },
  };
}

const gateApprovalControls: Record<string, Array<{ gateKey: string; label: string; notes: string }>> = {
  legal: [
    {
      gateKey: "legal_terms_approved",
      label: "Approve legal terms",
      notes: "Operator approved MPGF legal terms and public real-money copy.",
    },
    {
      gateKey: "refund_policy_approved",
      label: "Approve refund policy",
      notes: "Operator approved MPGF refund policy and review workflow.",
    },
    {
      gateKey: "recipient_compliance_policy_approved",
      label: "Approve compliance policy",
      notes: "Operator approved recipient accreditation and compliance policy.",
    },
  ],
  payments: [
    {
      gateKey: "stripe_live_keys_configured",
      label: "Confirm Stripe keys",
      notes: "Operator confirmed production Stripe secret and publishable keys are configured in Vercel.",
    },
    {
      gateKey: "stripe_webhook_configured",
      label: "Confirm Stripe webhook",
      notes: "Operator confirmed Stripe webhook endpoint and STRIPE_WEBHOOK_SECRET are configured.",
    },
  ],
  payouts: [
    {
      gateKey: "payout_profile_approved",
      label: "Approve payout profile",
      notes: "Operator approved the manual evidence-only payout profile.",
    },
    {
      gateKey: "recipient_compliance_policy_approved",
      label: "Approve recipient compliance",
      notes: "Operator approved recipient compliance requirements for MPGF payout review.",
    },
    {
      gateKey: "manual_external_payment_evidence_policy_approved",
      label: "Approve manual evidence policy",
      notes: "Operator approved manual external-payment evidence intake and review.",
    },
    {
      gateKey: "external_payment_destination_approved",
      label: "Approve external destination",
      notes: "Operator approved the external payment destination for manual evidence mode.",
    },
  ],
};

const adminApprovalControls: Record<string, Array<{
  action: string;
  label: string;
  targetType: string;
  targetVersion: string;
  approverRole: string;
}>> = {
  payouts: [
    {
      action: "mpgf.payout_authorization.approve",
      label: "Record payout authorization approval",
      targetType: "payout_authorization",
      targetVersion: "mpgf-payout-provider-profile-v1",
      approverRole: "payout_admin",
    },
  ],
  launch: [
    {
      action: "mpgf.production_enablement.approve",
      label: "Record deployment approval",
      targetType: "production_enablement",
      targetVersion: "mpgf-pilot-v0.3",
      approverRole: "deployment_admin",
    },
    {
      action: "mpgf.real_money.enable",
      label: "Record real-money enablement approval",
      targetType: "production_enablement",
      targetVersion: "mpgf-pilot-v0.3",
      approverRole: "super_admin",
    },
  ],
  rbac: [
    {
      action: "mpgf.payout_authorization.approve",
      label: "Record RBAC payout approval",
      targetType: "payout_authorization",
      targetVersion: "mpgf-payout-provider-profile-v1",
      approverRole: "payout_admin",
    },
  ],
};

const productionVerificationControls = new Set(["launch", "incidents", "conformance"]);

function formatBasisPointsPercent(value: number) {
  const rounded = (value / 100).toFixed(2);
  return `${rounded.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
}

const publicGoodsDefaultReasonByAction: Record<MpgfPublicGoodsReviewAction, MpgfPublicGoodsReviewReasonCode> = {
  approve: "destination_verified",
  needs_evidence: "needs_destination_evidence",
  block: "blocked_destination_risk",
  challenge: "challenge_opened",
  finalize: "challenge_resolved",
};

export default async function MpgfAdminSectionPage({ params }: MpgfAdminSectionPageProps) {
  const { section } = await params;
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  const adminMfaSummary = isAdmin ? await loadBackgroundAccountSecuritySummary() : null;
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer?.authUser.email,
    mfaSummary: adminMfaSummary,
  });

  if (!mpgfAdminSections.includes(section as (typeof mpgfAdminSections)[number])) {
    notFound();
  }

  const controlPlane = adminAccess.allowed ? await loadMpgfProductionControlPlaneSummary() : null;
  const sectionGates = controlPlane ? mpgfGatesForAdminSection(section, controlPlane.gates) : [];
  const gateControls = gateApprovalControls[section] ?? [];
  const approvalControls = adminApprovalControls[section] ?? [];
  const operatorConsole = getMpgfPublicGoodsAdminConsole(section);
  const publicGoodsReviewConsole = section === "public-goods" ? summarizeMpgfPublicGoodsReviewConsole() : null;
  let failureBonusScheduleQueue: Awaited<ReturnType<typeof loadPendingMpgfFailureBonusSchedules>> = {
    pending: [],
    blocked: [],
  };
  let failureBonusScheduleLoadError: string | null = null;
  if (section === "failure-bonus" && adminAccess.allowed) {
    try {
      failureBonusScheduleQueue = await loadPendingMpgfFailureBonusSchedules();
    } catch (error) {
      failureBonusScheduleLoadError =
        error instanceof Error ? error.message : "Pending failure-bonus schedules could not be loaded.";
    }
  }

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-secondary" href="/mpgf/admin">All admin sections</Link>
        ) : (
          <Link className="button button-primary" href={`/login?returnTo=/mpgf/admin/${section}`}>
            Sign in
          </Link>
        )
      }
      description="This admin section is present for route readiness and remains gated until an authenticated admin is available."
      title={`MPGF admin: ${section.replaceAll("-", " ")}.`}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <p className="eyebrow">{adminAccess.allowed ? "MFA-verified admin" : "Gated route"}</p>
        <h2>{adminAccess.allowed ? "Section control gates" : "Admin access required"}</h2>
        {adminAccess.allowed ? (
          <>
            <p>
              This route maps the Build Instruction admin surface and shows the production gates
              relevant to this section. Passing a gate still requires its external evidence,
              approvals, and provider configuration; this page exposes no secrets.
            </p>
            <div className="mpgf-gate-list">
              {sectionGates.map((gate) => (
                <article key={gate.key} className="mpgf-gate-row">
                  <div>
                    <p className="eyebrow">{gate.area.replaceAll("_", " ")}</p>
                    <h3>{gate.label}</h3>
                    <p>{gate.summary}</p>
                    <dl className="mpgf-evidence-list">
                      <div>
                        <dt>Evidence</dt>
                        <dd>{gate.evidencePaths.join(", ")}</dd>
                      </div>
                      <div>
                        <dt>Acceptance criteria</dt>
                        <dd>{gate.acceptanceCriteria.join(", ")}</dd>
                      </div>
                    </dl>
                    {gate.blockers.length > 0 ? (
                      <ul className="mpgf-check-list">
                        {gate.blockers.slice(0, 8).map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className={`mpgf-gate-status mpgf-gate-status-${gate.status}`}>
                    {gate.status.replaceAll("_", " ")}
                  </span>
                </article>
              ))}
            </div>
            {gateControls.length > 0 || approvalControls.length > 0 || productionVerificationControls.has(section) ? (
              <div className="mpgf-admin-action-panel">
                <p className="eyebrow">Approval recording</p>
                <h3>Record operator evidence</h3>
                <p>
                  These controls record authenticated admin approvals or production verification
                  evidence in Supabase. They do not bypass solver certification, payment-provider
                  activation, or external payout evidence.
                </p>
                <div className="mpgf-admin-action-grid">
                  {productionVerificationControls.has(section) ? (
                    <form action={runMpgfProductionHealthCheckAction}>
                      <button className="button button-secondary" type="submit">
                        Run production health check
                      </button>
                    </form>
                  ) : null}
                  {gateControls.map((control) => (
                    <form key={control.gateKey} action={approveMpgfRealMoneyGateAction}>
                      <input name="gate_key" type="hidden" value={control.gateKey} />
                      <input name="notes" type="hidden" value={control.notes} />
                      <button className="button button-secondary" type="submit">
                        {control.label}
                      </button>
                    </form>
                  ))}
                  {approvalControls.map((control) => (
                    <form key={control.action} action={recordMpgfAdminApprovalRecordAction}>
                      <input name="approval_action" type="hidden" value={control.action} />
                      <input name="target_type" type="hidden" value={control.targetType} />
                      <input name="target_version" type="hidden" value={control.targetVersion} />
                      <input name="approver_role" type="hidden" value={control.approverRole} />
                      <button className="button button-secondary" type="submit">
                        {control.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ) : null}
            {section === "failure-bonus" ? (
              <div className="mpgf-admin-action-panel">
                <p className="eyebrow">Atomic schedule review</p>
                <h3>Failure Bonus Reserve premium quotes</h3>
                <p>
                  Review the complete one-to-ten-threshold contract. Approval finalizes every current
                  tranche together; no individual threshold can be approved separately, and approval is
                  blocked after the first accepted pledge.
                </p>
                <div className="mpgf-control-summary">
                  <div>
                    <span>Pending schedules</span>
                    <strong>{failureBonusScheduleQueue.pending.length}</strong>
                  </div>
                  <div>
                    <span>Approval mode</span>
                    <strong>atomic complete schedule</strong>
                  </div>
                  <div>
                    <span>Premium payer</span>
                    <strong>creator or sponsor</strong>
                  </div>
                  <div>
                    <span>Recipient threshold</span>
                    <strong>premium excluded</strong>
                  </div>
                </div>
                {failureBonusScheduleLoadError ? (
                  <div className="mpgf-threshold-errors" role="alert">
                    <strong>Schedule queue unavailable</strong>
                    <p>{failureBonusScheduleLoadError}</p>
                  </div>
                ) : null}
                <div className="mpgf-gate-list">
                  {failureBonusScheduleQueue.blocked.map((item) => (
                    <article key={item.proposalId} className="mpgf-gate-row">
                      <div>
                        <p className="eyebrow">blocked schedule record</p>
                        <h3>{item.title}</h3>
                        <p>
                          Proposal {item.proposalId} cannot be approved until its stored schedule is repaired.
                        </p>
                        <div className="mpgf-threshold-errors" role="alert">
                          <strong>Server validation failed</strong>
                          <p>{item.reason}</p>
                        </div>
                      </div>
                      <span className="mpgf-gate-status mpgf-gate-status-blocked">blocked</span>
                    </article>
                  ))}
                  {failureBonusScheduleQueue.pending.map((item) => {
                    const finalThreshold = item.schedule.thresholds.at(-1)!;
                    return (
                      <article key={item.proposalId} className="mpgf-gate-row">
                        <div>
                          <p className="eyebrow">{item.proposalStatus.replaceAll("_", " ")}</p>
                          <h3>{item.title}</h3>
                          <p>
                            Pool-wide failure bonus {formatBasisPointsPercent(item.failureBonusRateBps)};
                            {" "}{item.eligibilityPolicy.maxParticipants} maximum eligible participants;
                            {" "}{formatUsd(item.eligibilityPolicy.maxBonusPerParticipantCents)} maximum bonus per participant.
                          </p>
                          <p>
                            Final cumulative net {formatUsd(finalThreshold.cumulativeNetRecipientThresholdCents)};
                            {" "}cumulative premium {formatUsd(finalThreshold.cumulativeSuccessPremiumCents)};
                            {" "}gross success requirement {formatUsd(finalThreshold.grossSuccessRequirementCents)}.
                          </p>
                          <div className="mpgf-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th scope="col">Threshold</th>
                                  <th scope="col">Cumulative net</th>
                                  <th scope="col">Incremental net</th>
                                  <th scope="col">Success estimate</th>
                                  <th scope="col">Failure fill</th>
                                  <th scope="col">Premium rate</th>
                                  <th scope="col">Cumulative premium</th>
                                  <th scope="col">Gross</th>
                                  <th scope="col">Cumulative exposure</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.schedule.thresholds.map((threshold) => (
                                  <tr key={threshold.thresholdId}>
                                    <th scope="row">{threshold.thresholdIndex}</th>
                                    <td>{formatUsd(threshold.cumulativeNetRecipientThresholdCents)}</td>
                                    <td>{formatUsd(threshold.incrementalNetRecipientCents)}</td>
                                    <td>{formatBasisPointsPercent(threshold.assumptions?.successProbabilityBps ?? 0)}</td>
                                    <td>{formatBasisPointsPercent(threshold.assumptions?.expectedEligibleFailureFillBps ?? 0)}</td>
                                    <td>{formatBasisPointsPercent(threshold.premiumRateBps)}</td>
                                    <td>{formatUsd(threshold.cumulativeSuccessPremiumCents)}</td>
                                    <td>{formatUsd(threshold.grossSuccessRequirementCents)}</td>
                                    <td>{formatUsd(threshold.maximumFailureBonusExposureCents ?? 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <form className="stacked-form" action={approveMpgfFailureBonusScheduleAction}>
                            <input name="proposal_id" type="hidden" value={item.proposalId} />
                            <label>
                              Operator rationale for the complete schedule
                              <textarea
                                minLength={20}
                                name="rationale"
                                required
                                placeholder="Explain why the risk assumptions, caps, eligibility policy, and all tranche premiums are acceptable."
                              />
                            </label>
                            <button className="button button-secondary" type="submit">
                              Approve all {item.schedule.thresholds.length} threshold quote{item.schedule.thresholds.length === 1 ? "" : "s"}
                            </button>
                          </form>
                        </div>
                        <span className="mpgf-gate-status mpgf-gate-status-pending_review">
                          pending review
                        </span>
                      </article>
                    );
                  })}
                  {!failureBonusScheduleLoadError &&
                  failureBonusScheduleQueue.pending.length === 0 &&
                  failureBonusScheduleQueue.blocked.length === 0 ? (
                    <p className="mpgf-small">No submitted failure-bonus schedule is awaiting approval.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {operatorConsole ? (
              <div className="mpgf-admin-action-panel">
                <p className="eyebrow">moralpublicgoods131.md section 16</p>
                <h3>{operatorConsole.title}</h3>
                <p>{operatorConsole.purpose}</p>
                <div className="mpgf-control-summary">
                  <div>
                    <span>MFA gate</span>
                    <strong>{operatorConsole.requiresMfaAdminGate ? "required" : "missing"}</strong>
                  </div>
                  <div>
                    <span>Live authority</span>
                    <strong>{operatorConsole.createsLiveAuthority ? "creates authority" : "none"}</strong>
                  </div>
                  <div>
                    <span>Privacy boundary</span>
                    <strong>{operatorConsole.privacySafeOperatorView ? "public-safe summaries" : "raw private data"}</strong>
                  </div>
                </div>
                <div className="mpgf-gate-list">
                  {operatorConsole.rows.map((row) => (
                    <article key={row.label} className="mpgf-gate-row">
                      <div>
                        <p className="eyebrow">{row.status.replaceAll("_", " ")}</p>
                        <h3>{row.label}</h3>
                        <dl className="mpgf-evidence-list">
                          <div>
                            <dt>Evidence source</dt>
                            <dd>{row.evidenceSource}</dd>
                          </div>
                          <div>
                            <dt>Operator action</dt>
                            <dd>{row.operatorAction}</dd>
                          </div>
                        </dl>
                      </div>
                      <span className={`mpgf-gate-status mpgf-gate-status-${row.status}`}>
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </article>
                  ))}
                </div>
                <p className="mpgf-small">
                  These checklist rows are operator review surfaces only. They cannot create a
                  pledge, infer allocatable project stances, authorize payment, release funds,
                  mint rewards or certificates, or expose sealed live progress before close.
                </p>
              </div>
            ) : null}
            {publicGoodsReviewConsole ? (
              <div className="mpgf-admin-action-panel">
                <p className="eyebrow">Verified assurance review</p>
                <h3>Public goods campaign review queue</h3>
                <p>
                  This console uses the same public review states as the route cards: submitted,
                  needs evidence, challenge window, approved, blocked, and finalized. Actions record
                  public reason codes and do not authorize custody or payout.
                </p>
                <div className="mpgf-control-summary">
                  <div>
                    <span>Open cases</span>
                    <strong>{publicGoodsReviewConsole.openCaseCount}</strong>
                  </div>
                  <div>
                    <span>Challenge windows</span>
                    <strong>{publicGoodsReviewConsole.challengedCampaignCount}</strong>
                  </div>
                  <div>
                    <span>Sponsor subscriptions</span>
                    <strong>{publicGoodsReviewConsole.activeSponsorSubscriptionCount}</strong>
                  </div>
                  <div>
                    <span>Verified proofs</span>
                    <strong>{publicGoodsReviewConsole.verifiedPaymentProofCount}</strong>
                  </div>
                </div>
                <article className="mpgf-gate-row">
                  <div>
                    <p className="eyebrow">Conflict check banner</p>
                    <h3>{publicGoodsReviewConsole.conflictCheckBanner.status.replaceAll("_", " ")}</h3>
                    <p>{publicGoodsReviewConsole.conflictCheckBanner.message}</p>
                  </div>
                  <span className={`mpgf-gate-status mpgf-gate-status-${publicGoodsReviewConsole.conflictCheckBanner.status}`}>
                    {publicGoodsReviewConsole.conflictCheckBanner.status}
                  </span>
                </article>
                <div className="mpgf-gate-list">
                  {publicGoodsReviewConsole.rubric.map((rubricItem) => (
                    <article key={rubricItem.key} className="mpgf-gate-row">
                      <div>
                        <p className="eyebrow">{rubricItem.reviewerRole.replaceAll("_", " ")}</p>
                        <h3>{rubricItem.label}</h3>
                        <p>{rubricItem.requiredEvidence}</p>
                      </div>
                      <span className="mpgf-gate-status mpgf-gate-status-pending_review">
                        rubric
                      </span>
                    </article>
                  ))}
                </div>
                <div className="mpgf-gate-list">
                  {publicGoodsReviewConsole.queue.map((item) => (
                    <article key={item.campaignId} className="mpgf-gate-row">
                      <div>
                        <p className="eyebrow">{item.reviewStatus.replaceAll("_", " ")}</p>
                        <h3>{item.title}</h3>
                        <p>
                          Assurance status: {item.assuranceStatus.replaceAll("_", " ")}. Latest
                          reason code: {item.latestReasonCode?.replaceAll("_", " ") ?? "none"}.
                        </p>
                        <p>
                          Conflict check: {item.conflictCheckStatus}; {item.conflictCheckMessage}
                        </p>
                        <dl className="mpgf-evidence-list">
                          <div>
                            <dt>Direct eligible</dt>
                            <dd>{formatUsd(item.directEligibleCents)}</dd>
                          </div>
                          <div>
                            <dt>Approved match</dt>
                            <dd>{formatUsd(item.approvedMatchCents)}</dd>
                          </div>
                        </dl>
                        {item.blockers.length > 0 ? (
                          <ul className="mpgf-check-list">
                            {item.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mpgf-admin-action-grid">
                          {item.allowedNextActions.map((action) => (
                            <form key={`${item.campaignId}-${action}`} action={recordMpgfPublicGoodsReviewAction}>
                              <input name="campaign_id" type="hidden" value={item.campaignId} />
                              <input name="review_action" type="hidden" value={action} />
                              <input
                                name="reason_code"
                                type="hidden"
                                value={publicGoodsDefaultReasonByAction[action]}
                              />
                              <input
                                name="public_notes"
                                type="hidden"
                                value={`Admin recorded ${action.replaceAll("_", " ")} for public-goods assurance review.`}
                              />
                              <button className="button button-secondary" type="submit">
                                {action.replaceAll("_", " ")}
                              </button>
                            </form>
                          ))}
                          {item.appealStatus === "appeal_requested" ? (
                            <>
                              <form action={recordMpgfPublicGoodsReviewAction}>
                                <input name="campaign_id" type="hidden" value={item.campaignId} />
                                <input name="review_action" type="hidden" value="approve" />
                                <input name="reason_code" type="hidden" value="appeal_upheld" />
                                <input
                                  name="public_notes"
                                  type="hidden"
                                  value="Admin upheld the public-goods appeal and returned the campaign to approved review state."
                                />
                                <button className="button button-secondary" type="submit">
                                  uphold appeal
                                </button>
                              </form>
                              <form action={recordMpgfPublicGoodsReviewAction}>
                                <input name="campaign_id" type="hidden" value={item.campaignId} />
                                <input name="review_action" type="hidden" value="block" />
                                <input name="reason_code" type="hidden" value="appeal_denied" />
                                <input
                                  name="public_notes"
                                  type="hidden"
                                  value="Admin denied the public-goods appeal and kept the campaign blocked from payable status."
                                />
                                <button className="button button-secondary" type="submit">
                                  deny appeal
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <span className="mpgf-gate-status mpgf-gate-status-pending_review">
                        {item.appealStatus.replaceAll("_", " ")}
                      </span>
                    </article>
                  ))}
                </div>
                <div className="mpgf-admin-action-panel">
                  <p className="eyebrow">Milestone release queue</p>
                  <h3>Dual-control confirmation before partner release</h3>
                  <div className="mpgf-gate-list">
                    {publicGoodsReviewConsole.milestoneReleaseQueue.map((item) => (
                      <article key={item.campaignId} className="mpgf-gate-row">
                        <div>
                          <p className="eyebrow">Milestone {item.nextMilestoneOrdinal}</p>
                          <h3>{item.title}</h3>
                          <dl className="mpgf-evidence-list">
                            <div>
                              <dt>Approved match</dt>
                              <dd>{formatUsd(item.approvedMatchCents)}</dd>
                            </div>
                            <div>
                              <dt>Release review</dt>
                              <dd>
                                {item.releasePct}% tranche; {formatUsd(item.releaseAmountCents)} pending
                              </dd>
                            </div>
                            <div>
                              <dt>Review state</dt>
                              <dd>
                                {item.reviewStateConfirmedRequired
                                  ? "review-state confirmation required"
                                  : "already confirmed"}
                              </dd>
                            </div>
                            <div>
                              <dt>Dual control</dt>
                              <dd>
                                {item.dualControlApproverRequired
                                  ? "distinct release approver required"
                                  : "second approval recorded"}
                              </dd>
                            </div>
                          </dl>
                          {item.blockers.length > 0 ? (
                            <ul className="mpgf-check-list">
                              {item.blockers.map((blocker) => (
                                <li key={blocker}>{blocker.replaceAll("_", " ")}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <span className={`mpgf-gate-status mpgf-gate-status-${item.status === "review_required" ? "pending_review" : "blocked"}`}>
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="mpgf-admin-action-panel">
                  <p className="eyebrow">Dispute queue</p>
                  <h3>Challenge windows and appeals</h3>
                  <div className="mpgf-gate-list">
                    {publicGoodsReviewConsole.disputeQueue.map((item) => (
                      <article key={item.id} className="mpgf-gate-row">
                        <div>
                          <p className="eyebrow">{item.state.replaceAll("_", " ")}</p>
                          <h3>{item.title}</h3>
                          <p>
                            Reason: {item.reasonCode.replaceAll("_", " ")}. Appeal:{" "}
                            {item.appealStatus.replaceAll("_", " ")}.
                          </p>
                          <p>
                            Opened{" "}
                            <LocalDateTime
                              value={item.openedAt}
                              fallback="Date unavailable"
                              dateOnly
                              locale="en-US"
                              options={{ day: "numeric", month: "short" }}
                            />
                            {item.challengeWindowEndsAt ? (
                              <>
                                ; challenge window ends{" "}
                                <LocalDateTime
                                  value={item.challengeWindowEndsAt}
                                  fallback="Date unavailable"
                                  dateOnly
                                  locale="en-US"
                                  options={{ day: "numeric", month: "short" }}
                                />
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span className="mpgf-gate-status mpgf-gate-status-pending_review">dispute</span>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="mpgf-admin-action-panel">
                  <p className="eyebrow">Audit trail viewer</p>
                  <h3>Public-safe review and proof events</h3>
                  <div className="mpgf-gate-list">
                    {publicGoodsReviewConsole.auditTrail.slice(0, 6).map((item) => (
                      <article key={item.id} className="mpgf-gate-row">
                        <div>
                          <p className="eyebrow">{item.objectType.replaceAll("_", " ")}</p>
                          <h3>{item.eventType.replaceAll("_", " ")}</h3>
                          <p>{item.publicSummary}</p>
                          <dl className="mpgf-evidence-list">
                            <div>
                              <dt>Event hash</dt>
                              <dd>{item.eventHash}</dd>
                            </div>
                            <div>
                              <dt>Privacy class</dt>
                              <dd>{item.privacyClass.replaceAll("_", " ")}</dd>
                            </div>
                          </dl>
                        </div>
                        <span className="mpgf-gate-status mpgf-gate-status-passed">logged</span>
                      </article>
                    ))}
                  </div>
                </div>
                <p className="mpgf-small">
                  Reason codes: {MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES.map((code) => code.replaceAll("_", " ")).join(", ")}.
                  Analytics policy: privacy-safe only; no raw private wish text is stored.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p>
              {adminAccess.message} This public gate exposes no settings, secrets, approvals,
              payment controls, payout controls, or live authorization actions.
            </p>
            {isAdmin ? (
              <Link className="button button-secondary" href="/dashboard#account-security">
                Open account security
              </Link>
            ) : null}
          </>
        )}
      </section>
    </MpgfPageFrame>
  );
}
