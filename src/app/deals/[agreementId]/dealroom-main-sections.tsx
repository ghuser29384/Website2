import Link from "next/link";

import {
  addAgreementEventAction,
  updateAgreementStatusAction,
} from "@/app/actions";
import {
  DealroomTermsEditor,
  type DealroomTerms,
} from "@/components/marketplace/dealroom-terms-editor";

import {
  getLifecycleStageState,
  type LifecycleStage,
} from "./dealroom-state";
import type { DealroomAgreement } from "./dealroom-types";
import styles from "./dealroom.module.css";

interface DealroomMainSectionsProps {
  agreement: DealroomAgreement;
  defaultStructuredTerms: string;
  initialTerms: DealroomTerms;
  proposerName: string;
  responderName: string;
  returnTo: string;
  stages: LifecycleStage[];
}

export function DealroomMainSections({
  agreement,
  defaultStructuredTerms,
  initialTerms,
  proposerName,
  responderName,
  returnTo,
  stages,
}: DealroomMainSectionsProps) {
  return (
    <>
      <section className="section section-white" aria-labelledby="lifecycle-heading">
        <div className="section-head">
          <p className="eyebrow">Lifecycle</p>
          <h2 id="lifecycle-heading">Visible state, not decorative motion</h2>
          <p>
            The timeline advances only when the agreement record, events, evidence, or
            review state support the next stage.
          </p>
        </div>
        <ol className={styles.timeline}>
          {stages.map((stage, index) => (
            <li data-state={getLifecycleStageState(stages, index)} key={stage.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage.label}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-subtle" aria-labelledby="commitments-heading">
        <div className="section-head">
          <p className="eyebrow">Current exchange</p>
          <h2 id="commitments-heading">Commitments side by side</h2>
          <p>
            These are the current reciprocal actions. The editable terms below control
            the shared agreement record.
          </p>
        </div>
        <div className={styles.commitmentGrid}>
          <article>
            <p className={styles.commitmentKicker}>{proposerName} commits</p>
            <h3>{agreement.offer?.offer_action ?? defaultStructuredTerms}</h3>
            <p>
              {agreement.offer?.offered_cause ??
                "Action defined in the agreement terms"}
            </p>
          </article>
          <article>
            <p className={styles.commitmentKicker}>{responderName} commits</p>
            <h3>
              {agreement.offer?.request_action ??
                "Reciprocal action must be confirmed in the terms."}
            </h3>
            <p>
              {agreement.offer?.requested_cause ??
                "Requested outcome defined in the agreement terms"}
            </p>
          </article>
        </div>
      </section>

      <section className="section section-white" aria-labelledby="terms-heading">
        <div className="section-head">
          <p className="eyebrow">Term revisions</p>
          <h2 id="terms-heading">Edit with a visible before-and-after diff</h2>
          <p>
            Saving creates a new terms update in the agreement record. It does not by
            itself mark evidence accepted, transfer funds, or complete the trade.
          </p>
        </div>
        <DealroomTermsEditor
          agreementId={agreement.id}
          initialTerms={initialTerms}
          returnTo={returnTo}
        />
      </section>

      <section className="section section-subtle" aria-labelledby="decision-heading">
        <div className="section-head">
          <p className="eyebrow">Negotiation controls</p>
          <h2 id="decision-heading">Counteroffer or confirm the current terms</h2>
          <p>
            Counteroffers remain explicit events. The existing status action lets one
            participant activate a proposed agreement; it does not claim a separate
            bilateral confirmation record. Either party can still use the recorded exit
            conditions.
          </p>
        </div>
        <div className={styles.decisionGrid}>
          <article className={styles.counterofferPanel}>
            <p className={styles.activityKicker}>Record a revision request</p>
            <h3>Counteroffer</h3>
            <p>
              State the material change and why it would improve the trade by your lights.
              Do not use threats or introduce unrelated harms.
            </p>
            <form action={addAgreementEventAction} className="stack-form">
              <input name="agreement_id" type="hidden" value={agreement.id} />
              <input name="return_to" type="hidden" value={returnTo} />
              <input name="event_type" type="hidden" value="counterproposal" />
              <label className="field">
                <span>Change requested</span>
                <input
                  name="summary"
                  placeholder="For example: shorten the completion window to 21 days"
                  required
                />
              </label>
              <label className="field">
                <span>Reason and exact replacement term</span>
                <textarea
                  name="details"
                  placeholder="Explain the proposed replacement, evidence implications, and any change in burden."
                  required
                  rows={5}
                />
              </label>
              <button className="button button-secondary" type="submit">
                Record counteroffer
              </button>
            </form>
          </article>

          <article className={styles.decisionPanel}>
            <p className={styles.activityKicker}>Current decision</p>
            <h3>
              {agreement.status === "proposed"
                ? "Terms are still proposed."
                : agreement.status === "active"
                  ? "Agreement is active."
                  : agreement.status === "completed"
                    ? "Agreement is marked complete."
                    : "Agreement is cancelled."}
            </h3>
            <p>
              {agreement.status === "proposed"
                ? "Confirm only after both parties have reviewed the latest saved terms and the evidence rule."
                : agreement.status === "active"
                  ? "Use the full agreement record to submit evidence, open a review case, or change status."
                  : "The complete agreement record retains evidence, review, payment, and challenge controls."}
            </p>
            {agreement.status === "proposed" ? (
              <form action={updateAgreementStatusAction}>
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <input name="status" type="hidden" value="active" />
                <input
                  name="summary"
                  type="hidden"
                  value="One participant activated the current dealroom terms"
                />
                <button className="button button-primary" type="submit">
                  Record confirmation and activate
                </button>
              </form>
            ) : (
              <Link
                className="button button-secondary"
                href={`/agreements/${agreement.id}`}
              >
                Continue in full agreement record
              </Link>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
