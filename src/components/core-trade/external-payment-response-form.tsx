"use client";

import { LocalDateTime } from "@/components/ui/local-date-time";

import { PendingSubmitButton } from "./pending-submit-button";

export type ExternalPaymentResponseAction = (
  formData: FormData,
) => Promise<string>;

export function ExternalPaymentResponseForm({
  action,
  agreementId,
  milestoneId,
  responseDeadline,
  returnTo,
  versionId,
}: {
  action: ExternalPaymentResponseAction;
  agreementId: string;
  milestoneId: string;
  responseDeadline: string | null;
  returnTo?: string;
  versionId: string;
}) {
  async function submitResponse(formData: FormData) {
    const nextPath = await action(formData);
    const nextUrl = new URL(nextPath, window.location.origin);
    if (nextUrl.origin !== window.location.origin) {
      throw new Error("External payment response returned an invalid destination.");
    }
    window.location.assign(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  return (
    <form action={submitResponse} className="panel stack-form">
      <input name="agreement_id" type="hidden" value={agreementId} />
      <input name="milestone_id" type="hidden" value={milestoneId} />
      <input name="agreement_version_id" type="hidden" value={versionId} />
      {returnTo ? (
        <input name="return_to" type="hidden" value={returnTo} />
      ) : null}
      <p className="detail-kicker">Performer confirmation</p>
      <h4>Respond to the latest external payment receipt</h4>
      <p className="route-text">
        Respond by{" "}
        <LocalDateTime
          fallback={responseDeadline ?? "the recorded deadline"}
          value={responseDeadline}
        />
        . Silence or a dispute opens neutral review; silence never counts as
        confirmation.
      </p>
      <label className="field">
        <span>Private note</span>
        <textarea
          name="confirmation_note"
          placeholder="Optional note about the received payment"
          rows={3}
        />
      </label>
      <div className="form-actions">
        <PendingSubmitButton
          name="payment_response"
          pendingLabel="Confirming payment…"
          value="confirm"
        >
          Confirm payment received
        </PendingSubmitButton>
        <PendingSubmitButton
          className="button button-secondary"
          name="payment_response"
          pendingLabel="Disputing receipt…"
          value="dispute"
        >
          Dispute payment report
        </PendingSubmitButton>
      </div>
    </form>
  );
}
