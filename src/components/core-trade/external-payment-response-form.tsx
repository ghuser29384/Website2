"use client";

import { FullNavigationActionForm } from "./full-navigation-action-form";
import { PendingSubmitButton } from "./pending-submit-button";
import { LocalDateTime } from "@/components/ui/local-date-time";

export type ExternalPaymentResponseAction = (
  formData: FormData,
) => void | Promise<void>;

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
  return (
    <FullNavigationActionForm action={action} className="panel stack-form">
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
    </FullNavigationActionForm>
  );
}
