"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { recordMpgfDacPledgeAction } from "@/app/mpgf/actions";
import { LocalDateTime } from "@/components/ui/local-date-time";
import type {
  MpgfDacPledgeReceipt,
  MpgfDacVisibilityMode,
} from "@/lib/mpgf/dac-lifecycle-model";
import { formatUsd } from "@/lib/mpgf/mechanism";

interface MpgfDacPledgePanelProps {
  campaignId: string;
  campaignPath: string;
  title: string;
  termsVersion: number;
  termsSha256: string;
  deadlineAt: string;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  openForPledges: boolean;
  viewerPresent: boolean;
}

function createPledgeKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `mpgf.dac.pledge:${crypto.randomUUID()}`;
  }
  return `mpgf.dac.pledge:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function MpgfDacPledgePanel({
  campaignId,
  campaignPath,
  deadlineAt,
  openForPledges,
  termsSha256,
  termsVersion,
  thresholdAmountCents,
  thresholdSupporters,
  title,
  viewerPresent,
}: MpgfDacPledgePanelProps) {
  const router = useRouter();
  const [amountDollars, setAmountDollars] = useState("25.00");
  const [visibilityMode, setVisibilityMode] = useState<MpgfDacVisibilityMode>("private_amount");
  const [supporterReason, setSupporterReason] = useState("");
  const [exactTermsAccepted, setExactTermsAccepted] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createPledgeKey);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    "No pledge has been recorded in this page session.",
  );
  const [receipt, setReceipt] = useState<MpgfDacPledgeReceipt | null>(null);

  async function submitPledge() {
    if (!exactTermsAccepted) {
      setMessage("Confirm the exact published version and hash before recording a pledge.");
      return;
    }

    const parsedAmount = Number(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter a positive pledge amount.");
      return;
    }

    setPending(true);
    try {
      const result = await recordMpgfDacPledgeAction({
        idempotencyKey,
        campaignId,
        amountDollars: parsedAmount,
        visibilityMode,
        supporterReason,
      });
      setMessage(result.message);
      if (result.ok && result.data) {
        setReceipt(result.data);
        setIdempotencyKey(createPledgeKey());
        setExactTermsAccepted(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (!openForPledges) {
    return (
      <section className="mpgf-panel" aria-label="Conditional pledge status">
        <p className="eyebrow">Conditional pledge</p>
        <h2>This campaign is not accepting new pledge intents.</h2>
        <p>
          The published deadline has passed or the campaign already has an immutable terminal outcome.
          Existing private pledge receipts remain visible to their owners.
        </p>
      </section>
    );
  }

  if (!viewerPresent) {
    return (
      <section className="mpgf-panel" aria-label="Conditional pledge sign-in">
        <p className="eyebrow">Conditional pledge</p>
        <h2>Sign in to bind a pledge to these exact terms.</h2>
        <p>
          Signing in is required to create the immutable consent record and owner-only pledge receipt.
          This pledge-only tranche does not collect a payment method or authorize a charge.
        </p>
        <Link className="button button-primary" href={`/login?returnTo=${encodeURIComponent(campaignPath)}`}>
          Sign in to pledge
        </Link>
      </section>
    );
  }

  return (
    <section className="mpgf-panel" aria-label="Record a conditional DAC pledge">
      <p className="eyebrow">Conditional pledge</p>
      <h2>Pledge only if this exact campaign reaches both thresholds.</h2>
      <p>
        Your signed intent will expire at the published deadline if the campaign lapses. Eligibility is
        reviewed separately. This action creates no payment method, mandate, authorization, charge, or capture.
      </p>

      <div className="mpgf-form-grid">
        <label>
          Pledge amount (USD)
          <input
            inputMode="decimal"
            min="0.01"
            name="amount"
            step="0.01"
            type="number"
            value={amountDollars}
            onChange={(event) => setAmountDollars(event.currentTarget.value)}
          />
        </label>
        <label>
          Visibility
          <select
            value={visibilityMode}
            onChange={(event) => setVisibilityMode(event.currentTarget.value as MpgfDacVisibilityMode)}
          >
            <option value="private_amount">Private amount</option>
            <option value="public_supporter">Public supporter; amount private</option>
            <option value="public_reason">Public supporter reason; amount private</option>
          </select>
        </label>
        <label className="mpgf-form-span">
          Supporter reason {visibilityMode === "public_reason" ? "(required and public)" : "(optional)"}
          <textarea
            maxLength={500}
            rows={4}
            value={supporterReason}
            onChange={(event) => setSupporterReason(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="mpgf-admin-action-panel">
        <p className="eyebrow">Exact consent target</p>
        <dl className="mpgf-summary-grid">
          <div>
            <dt>Campaign</dt>
            <dd>{title}</dd>
          </div>
          <div>
            <dt>Net threshold</dt>
            <dd>{formatUsd(thresholdAmountCents)}</dd>
          </div>
          <div>
            <dt>Minimum supporters</dt>
            <dd>{thresholdSupporters}</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>
              <LocalDateTime
                value={deadlineAt}
                fallback="Date unavailable"
                locale="en-US"
                options={{ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }}
              />
            </dd>
          </div>
          <div>
            <dt>Published version</dt>
            <dd>v{termsVersion}</dd>
          </div>
          <div>
            <dt>Published SHA-256</dt>
            <dd className="mpgf-break-text">{termsSha256}</dd>
          </div>
        </dl>
        <label className="checkbox-label">
          <input
            checked={exactTermsAccepted}
            type="checkbox"
            onChange={(event) => setExactTermsAccepted(event.currentTarget.checked)}
          />
          <span>
            I accept this exact published version and hash as the operative conditional-pledge terms.
          </span>
        </label>
        <button
          className="button button-primary"
          disabled={pending || !exactTermsAccepted}
          type="button"
          onClick={submitPledge}
        >
          {pending ? "Recording pledge…" : "Record conditional pledge"}
        </button>
      </div>

      <div className="mpgf-confirmation" role="status" aria-live="polite">
        {message}
      </div>

      {receipt ? (
        <article className="mpgf-admin-action-panel" aria-label="Immutable DAC pledge receipt">
          <p className="eyebrow">Immutable receipt</p>
          <h3>{formatUsd(receipt.amountCents)} conditional pledge recorded</h3>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Pledge ID</dt>
              <dd className="mpgf-break-text">{receipt.pledgeId}</dd>
            </div>
            <div>
              <dt>Consent record</dt>
              <dd className="mpgf-break-text">{receipt.pledgeIntentId}</dd>
            </div>
            <div>
              <dt>Eligibility</dt>
              <dd>{receipt.eligibilityState.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{receipt.pledgeStatus.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Terms</dt>
              <dd>v{receipt.termsVersion}</dd>
            </div>
            <div>
              <dt>Terms SHA-256</dt>
              <dd className="mpgf-break-text">{receipt.termsSha256}</dd>
            </div>
          </dl>
          <p className="mpgf-small">
            No payment method, authorization, charge, or capture was created by this receipt.
          </p>
        </article>
      ) : null}
    </section>
  );
}
