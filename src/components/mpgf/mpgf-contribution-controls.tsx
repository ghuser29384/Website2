"use client";

import { useState } from "react";

import {
  cancelMpgfPledgeAction,
  createMpgfBillingPortalAction,
  requestMpgfRefundAction,
  updateMpgfRecurringCommitmentStatusAction,
} from "@/app/mpgf/actions";
import type { MpgfParticipantState } from "@/lib/mpgf/participant-types";
import type { MpgfRealMoneyAccountState } from "@/lib/mpgf/real-money-types";
import type {
  MpgfPledge,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsSubscription,
  MpgfRecurringContributionCommitment,
} from "@/lib/mpgf/types";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatProvider(value: string) {
  return value.replaceAll("_", " ");
}

function createClientMutationKey(prefix: string) {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}:${randomId}`;
}

function assignBrowserLocation(url: string) {
  (globalThis as unknown as { location?: { assign: (target: string) => void } }).location?.assign(url);
}

export function MpgfContributionControls({
  participantState,
  realMoneyAccountState,
  pledges,
  recurringCommitments,
  viewerPresent = false,
}: {
  participantState?: MpgfParticipantState;
  realMoneyAccountState?: MpgfRealMoneyAccountState;
  pledges: MpgfPledge[];
  recurringCommitments: MpgfRecurringContributionCommitment[];
  viewerPresent?: boolean;
}) {
  const [pledgeRows, setPledgeRows] = useState(pledges);
  const [commitmentRows, setCommitmentRows] = useState(recurringCommitments);
  const [publicGoodsPledgeRows, setPublicGoodsPledgeRows] = useState<MpgfPublicGoodsPledge[]>(
    participantState?.publicGoodsPledges ?? [],
  );
  const [publicGoodsSubscriptionRows, setPublicGoodsSubscriptionRows] = useState<MpgfPublicGoodsSubscription[]>(
    participantState?.publicGoodsSubscriptions ?? [],
  );
  const [realMoneyRows, setRealMoneyRows] = useState(realMoneyAccountState?.contributions ?? []);
  const [refundRows, setRefundRows] = useState(realMoneyAccountState?.refunds ?? []);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    viewerPresent
      ? "Manual evidence and pledge records are shown here. Evidence review determines what counts."
      : "Sign in to view and update persisted MPGF participant state.",
  );

  async function cancelPledge(pledgeId: string) {
    if (viewerPresent) {
      setPendingId(pledgeId);
      const result = await cancelMpgfPledgeAction({
        pledgeId,
        idempotencyKey: createClientMutationKey("mpgf.pledge.cancel"),
      });

      if (result.state) {
        setPledgeRows(result.state.pledges);
        setCommitmentRows(result.state.recurringCommitments);
        setPublicGoodsPledgeRows(result.state.publicGoodsPledges);
        setPublicGoodsSubscriptionRows(result.state.publicGoodsSubscriptions);
      } else if (result.data) {
        setPledgeRows((current) =>
          current.map((pledge) => (pledge.id === pledgeId ? (result.data as MpgfPledge) : pledge)),
        );
      }

      setStatusMessage(result.message);
      setPendingId(null);
      return;
    }

    setPledgeRows((current) =>
      current.map((pledge) => (pledge.id === pledgeId ? { ...pledge, status: "cancelled" } : pledge)),
    );
    setStatusMessage(`Cancelled pledge rehearsal record ${pledgeId}.`);
  }

  async function openBillingPortal() {
    setPendingId("billing-portal");
    const result = await createMpgfBillingPortalAction();

    setStatusMessage(result.message);

    if (result.checkoutUrl) {
      assignBrowserLocation(result.checkoutUrl);
      return;
    }

    setPendingId(null);
  }

  async function requestRefund(contributionId: string) {
    setPendingId(contributionId);
    const result = await requestMpgfRefundAction({
      contributionId,
      reason: "Participant requested refund from the MPGF account page.",
    });

    if (result.ok) {
      setRealMoneyRows((current) =>
        current.map((contribution) =>
          contribution.id === contributionId ? { ...contribution, status: "recorded" } : contribution,
        ),
      );
      setRefundRows((current) => current);
    }

    setStatusMessage(result.message);
    setPendingId(null);
  }

  async function updateCommitmentStatus(
    commitmentId: string,
    status: Extract<MpgfRecurringContributionCommitment["status"], "active" | "paused" | "cancelled">,
  ) {
    if (viewerPresent) {
      setPendingId(commitmentId);
      const result = await updateMpgfRecurringCommitmentStatusAction({
        commitmentId,
        idempotencyKey: createClientMutationKey("mpgf.recurring.status"),
        status,
      });

      if (result.state) {
        setPledgeRows(result.state.pledges);
        setCommitmentRows(result.state.recurringCommitments);
        setPublicGoodsPledgeRows(result.state.publicGoodsPledges);
        setPublicGoodsSubscriptionRows(result.state.publicGoodsSubscriptions);
      } else if (result.data) {
        setCommitmentRows((current) =>
          current.map((commitment) =>
            commitment.id === commitmentId ? (result.data as MpgfRecurringContributionCommitment) : commitment,
          ),
        );
      }

      setStatusMessage(result.message);
      setPendingId(null);
      return;
    }

    setCommitmentRows((current) =>
      current.map((commitment) => (commitment.id === commitmentId ? { ...commitment, status } : commitment)),
    );
    setStatusMessage(`Updated recurring pledge rehearsal ${commitmentId} to ${status}.`);
  }

  function visibleCommitmentLabel(commitment: MpgfRecurringContributionCommitment) {
    return `${formatUsd(commitment.amountCents)} monthly`;
  }

  return (
    <>
      <div className="section-head">
        <p className="eyebrow">Public goods assurance</p>
        <h2>Conditional campaign pledges</h2>
        <p>
          These pledges are tied to public-goods campaigns and count only after amount,
          verified-supporter, review, and evidence gates pass.
        </p>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Campaign</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Capture</span>
        </div>
        {publicGoodsPledgeRows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No public-goods pledges</span>
            <span>-</span>
            <span>-</span>
            <span>{viewerPresent ? "Create an assurance pledge from the contribution page." : "Sign in to load records."}</span>
          </div>
        ) : null}
        {publicGoodsPledgeRows.map((pledge) => (
          <div key={pledge.id} className="mpgf-table-row">
            <span>{pledge.campaignId.replace(/^campaign-/, "").replaceAll("-", " ")}</span>
            <span>{formatUsd(pledge.amountCents)}</span>
            <span>{pledge.eligibilityState.replaceAll("_", " ")}</span>
            <span>{pledge.captureMode.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>

      <div className="section-head">
        <p className="eyebrow">Sponsor-pool refills</p>
        <h2>Optional recurring sponsor support</h2>
        <p>
          These records refill future challenge budgets. They remain separate from one-time
          campaign pledges and do not imply custody or tax treatment.
        </p>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Pool</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Next</span>
        </div>
        {publicGoodsSubscriptionRows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No sponsor-pool refills</span>
            <span>-</span>
            <span>-</span>
            <span>Optional monthly refills appear here after creation.</span>
          </div>
        ) : null}
        {publicGoodsSubscriptionRows.map((subscription) => (
          <div key={subscription.id} className="mpgf-table-row">
            <span>{subscription.poolId.replaceAll("-", " ")}</span>
            <span>{formatUsd(subscription.amountCents)}</span>
            <span>{subscription.status.replaceAll("_", " ")}</span>
            <span>{new Date(subscription.nextChargeAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className="section-head">
        <p className="eyebrow">Pledge-only records</p>
        <h2>Pledge rehearsal records</h2>
        <p>
          Pledge rows can be cancelled, converted, or expired. Pause and resume controls live on
          monthly recurring commitments. These records help test the mechanism before evidence is
          reviewed.
        </p>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Pledge</span>
          <span>Cadence</span>
          <span>Status</span>
          <span>Controls</span>
        </div>
        {pledgeRows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No saved pledges</span>
            <span>-</span>
            <span>-</span>
            <span>
              {viewerPresent ? "Create a pledge to populate this table." : "Sign in to load participant records."}
            </span>
          </div>
        ) : null}
        {pledgeRows.map((pledge) => (
          <div key={pledge.id} className="mpgf-table-row">
            <span>{formatUsd(pledge.amountCents)}</span>
            <span>{pledge.cadence.replace("_", " ")}</span>
            <span>{pledge.status}</span>
            <span className="mpgf-inline-actions">
              <button
                className="button button-secondary"
                disabled={pledge.status !== "pledged" || pendingId === pledge.id || !viewerPresent}
                type="button"
                onClick={() => cancelPledge(pledge.id)}
              >
                Cancel pledge
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="section-head">
        <p className="eyebrow">Monthly recurring commitments</p>
        <h2>Standing pledge rehearsal instructions</h2>
        <p>
          These controls operate on pledge-only recurring commitments. They do not create
          subscriptions, charges, donations, payment-provider objects, or live budget effects.
        </p>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Commitment</span>
          <span>Mode</span>
          <span>Status</span>
          <span>Controls</span>
        </div>
        {commitmentRows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No saved commitments</span>
            <span>-</span>
            <span>-</span>
            <span>
              {viewerPresent ? "Create a monthly pledge to populate this table." : "Sign in to load commitments."}
            </span>
          </div>
        ) : null}
        {commitmentRows.map((commitment) => (
          <div key={commitment.id} className="mpgf-table-row">
            <span>{visibleCommitmentLabel(commitment)}</span>
            <span>{commitment.mode.replace("_", " ")}</span>
            <span>{commitment.status}</span>
            <span className="mpgf-inline-actions">
              <button
                className="button button-secondary"
                disabled={commitment.status !== "active" || pendingId === commitment.id || !viewerPresent}
                type="button"
                onClick={() => updateCommitmentStatus(commitment.id, "paused")}
              >
                Pause
              </button>
              <button
                className="button button-secondary"
                disabled={commitment.status !== "paused" || pendingId === commitment.id || !viewerPresent}
                type="button"
                onClick={() => updateCommitmentStatus(commitment.id, "active")}
              >
                Resume
              </button>
              <button
                className="button button-secondary"
                disabled={
                  commitment.status === "cancelled" ||
                  commitment.status === "expired" ||
                  pendingId === commitment.id ||
                  !viewerPresent
                }
                type="button"
                onClick={() => updateCommitmentStatus(commitment.id, "cancelled")}
              >
                Cancel
              </button>
            </span>
          </div>
        ))}
      </div>
      <p className="mpgf-small" role="status">
        {statusMessage}
      </p>
      <div className="section-head">
        <p className="eyebrow">Stripe-backed contributions</p>
        <h2>Real-money payment state</h2>
        <p>
          These rows come from webhook-backed MPGF contribution records. They are separate from
          pledge-only rows and depend on Stripe and Supabase production configuration.
        </p>
      </div>
      <div className="mpgf-inline-actions">
        <button
          className="button button-secondary"
          disabled={!viewerPresent || !realMoneyAccountState?.billingPortalAvailable || pendingId === "billing-portal"}
          type="button"
          onClick={openBillingPortal}
        >
          Manage Stripe billing
        </button>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Contribution</span>
          <span>Mode</span>
          <span>Status</span>
          <span>Controls</span>
        </div>
        {realMoneyRows.length === 0 ? (
          <div className="mpgf-table-row">
            <span>No Stripe-backed contributions</span>
            <span>-</span>
            <span>-</span>
            <span>Integrated checkout will appear here after provider approval.</span>
          </div>
        ) : null}
        {realMoneyRows.map((contribution) => (
          <div key={contribution.id} className="mpgf-table-row">
            <span>{formatUsd(contribution.amountCents)}</span>
            <span>{contribution.contributionMode.replace("_", " ")}</span>
            <span>{contribution.status.replaceAll("_", " ")}</span>
            <span className="mpgf-inline-actions">
              <button
                className="button button-secondary"
                disabled={contribution.status !== "recorded" || pendingId === contribution.id || !viewerPresent}
                type="button"
                onClick={() => requestRefund(contribution.id)}
              >
                Request refund
              </button>
            </span>
          </div>
        ))}
      </div>
      {refundRows.length ? (
        <div className="mpgf-table">
          <div className="mpgf-table-row mpgf-table-head">
            <span>Refund</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Processed</span>
          </div>
          {refundRows.map((refund) => (
            <div key={refund.id} className="mpgf-table-row">
              <span>{refund.id.slice(0, 8)}</span>
              <span>{formatUsd(refund.amountCents)}</span>
              <span>{refund.status.replaceAll("_", " ")}</span>
              <span>{refund.processedAt ? new Date(refund.processedAt).toLocaleDateString() : "Pending review"}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="section-head">
        <p className="eyebrow">Manual external-payment evidence</p>
        <h2>Open Collective or fiscal-host evidence</h2>
        <p>
          Manual evidence rows are participant-submitted records awaiting MPGF review. They do not
          become verified contribution accounting until review explicitly verifies them.
        </p>
      </div>
      <div className="mpgf-table">
        <div className="mpgf-table-row mpgf-table-head">
          <span>Evidence</span>
          <span>Provider</span>
          <span>Status</span>
          <span>Reference</span>
        </div>
        {realMoneyAccountState?.manualEvidence.length ? null : (
          <div className="mpgf-table-row">
            <span>No manual evidence</span>
            <span>-</span>
            <span>-</span>
            <span>Submit evidence after paying through an approved external destination.</span>
          </div>
        )}
        {realMoneyAccountState?.manualEvidence.map((evidence) => (
          <div key={evidence.id} className="mpgf-table-row">
            <span>{formatUsd(evidence.amountCents)}</span>
            <span>{formatProvider(evidence.provider)}</span>
            <span>{evidence.status.replaceAll("_", " ")}</span>
            <span>
              {evidence.evidenceUrl ? (
                <a className="inline-link" href={evidence.evidenceUrl} rel="noreferrer" target="_blank">
                  {evidence.externalPaymentReference}
                </a>
              ) : (
                evidence.externalPaymentReference
              )}
            </span>
          </div>
        ))}
      </div>
      {participantState?.warnings.length ? (
        <ul className="mpgf-check-list">
          {participantState.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {realMoneyAccountState?.warnings.length ? (
        <ul className="mpgf-check-list">
          {realMoneyAccountState.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
