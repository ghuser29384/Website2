"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeFlowIcon } from "@/components/core-trade/trade-flow-icons";

import styles from "./trade-draft-workbench.module.css";

export interface TradeDraftValues {
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  duration: string;
  startDate: string;
  evidenceDueDate: string;
  evidenceRule: string;
  maximumBurden: string;
  privacyScope: string;
  exitConditions: string;
  notes: string;
  publicEvidenceCertification: boolean;
  voluntaryCertification: boolean;
}

interface TradeDraftWorkbenchProps {
  formMessage?: { text: string; tone: "error" | "success" } | null;
  initialValues?: Partial<TradeDraftValues>;
  saveAction: (formData: FormData) => void | Promise<void>;
  submissionKey: string;
}

const DEFAULT_VALUES: TradeDraftValues = {
  offeredCause: "",
  requestedCause: "",
  proposedAction: "",
  requestedAction: "",
  noTradeBaseline: "",
  duration: "",
  startDate: "",
  evidenceDueDate: "",
  evidenceRule: "",
  maximumBurden: "",
  privacyScope: "Agreement evidence and public-safe source copies are public by default. Private messages remain private. A documented safety exception may withhold specific proof.",
  exitConditions: "",
  notes: "",
  publicEvidenceCertification: false,
  voluntaryCertification: false,
};

const STEP_LABELS = [
  "Priorities",
  "Your commitment",
  "Their commitment",
  "Baseline",
  "Bounds",
  "Proof",
  "Review",
] as const;

function concise(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 88 ? `${normalized.slice(0, 85)}…` : normalized;
}

function validateStep(step: number, values: TradeDraftValues) {
  if (step === 0 && (!values.offeredCause.trim() || !values.requestedCause.trim())) {
    return "Name both priorities before continuing.";
  }
  if (step === 1 && !values.proposedAction.trim()) {
    return "State the concrete action you are willing to take.";
  }
  if (step === 2 && !values.requestedAction.trim()) {
    return "State the concrete action requested from the other participant.";
  }
  if (step === 3 && !values.noTradeBaseline.trim()) {
    return "Describe what both sides would actually do without this trade.";
  }
  if (step === 4 && (!values.duration.trim() || !values.maximumBurden.trim())) {
    return "Add the duration and the maximum burden before continuing.";
  }
  if (step === 5 && (!values.evidenceRule.trim() || !values.privacyScope.trim())) {
    return "Add the evidence rule and privacy scope before continuing.";
  }
  if (step === 6 && !values.exitConditions.trim()) {
    return "State how future obligations can end before saving the record.";
  }
  return null;
}

export function TradeDraftWorkbench({
  formMessage,
  initialValues,
  saveAction,
  submissionKey,
}: TradeDraftWorkbenchProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<TradeDraftValues>(() => ({
    ...DEFAULT_VALUES,
    ...initialValues,
  }));

  const finalTermsComplete = useMemo(
    () => validateStep(6, values) === null,
    [values],
  );

  function update<K extends keyof TradeDraftValues>(key: K, value: TradeDraftValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function nextStep() {
    const validationError = validateStep(step, values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(STEP_LABELS.length - 1, current + 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  const prioritySummary = `${concise(values.offeredCause, "Your priority")} ↔ ${concise(
    values.requestedCause,
    "Their priority",
  )}`;

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <form action={saveAction} className={styles.shell}>
        <input name="submission_key" type="hidden" value={submissionKey} />
        <input name="offered_cause" type="hidden" value={values.offeredCause} />
        <input name="requested_cause" type="hidden" value={values.requestedCause} />
        <input name="proposed_action" type="hidden" value={values.proposedAction} />
        <input name="requested_action" type="hidden" value={values.requestedAction} />
        <input name="no_trade_baseline" type="hidden" value={values.noTradeBaseline} />
        <input name="duration" type="hidden" value={values.duration} />
        <input name="start_date" type="hidden" value={values.startDate} />
        <input name="evidence_due_date" type="hidden" value={values.evidenceDueDate} />
        <input name="evidence_rule" type="hidden" value={values.evidenceRule} />
        <input name="maximum_burden" type="hidden" value={values.maximumBurden} />
        <input name="privacy_scope" type="hidden" value={values.privacyScope} />
        <input name="exit_conditions" type="hidden" value={values.exitConditions} />
        <input name="notes" type="hidden" value={values.notes} />
        {values.voluntaryCertification ? (
          <input name="voluntary_certification" type="hidden" value="on" />
        ) : null}
        {values.publicEvidenceCertification ? (
          <input name="public_evidence_certification" type="hidden" value="on" />
        ) : null}

        <header className={styles.top}>
          <Link aria-label="Moral Trade, home" className={styles.brandLink} href="/">
            <MoralTradeWordmark />
          </Link>
          <div aria-label="Draft progress" className={styles.progress}>
            {STEP_LABELS.map((label, index) => (
              <i
                aria-label={label}
                className={`${styles.progressBar} ${index <= step ? styles.progressBarActive : ""}`}
                key={label}
              />
            ))}
          </div>
          <div className={styles.stepCount}>
            Step {step + 1} / {STEP_LABELS.length} · Build
          </div>
        </header>

        <div>
          {formMessage ? (
            <div
              className={`${styles.message} ${
                formMessage.tone === "error" ? styles.messageError : styles.messageSuccess
              }`}
              role="status"
            >
              {formMessage.text}
            </div>
          ) : null}
        </div>

        <section className={styles.main} aria-label="Trade proposal builder">
          <div />
          <div className={styles.deck}>
            <div className={`${styles.ghostCard} ${styles.ghostTwo}`} />
            <div className={`${styles.ghostCard} ${styles.ghostOne}`} />
            <article className={`${styles.card} ${styles.cardEnter}`} key={step}>
              <div className={styles.cardHead}>
                <span className={styles.kicker}>{STEP_LABELS[step]}</span>
                <span className={styles.stepBadge}>{step + 1}</span>
              </div>

              {step === 0 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What priorities are being exchanged?</h1>
                    <p>Name the value you advance and the value you want the other participant to advance.</p>
                  </div>
                  <div className={`${styles.fields} ${styles.fieldGrid}`}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Priority you advance</span>
                      <input
                        autoFocus
                        className={styles.input}
                        maxLength={180}
                        onChange={(event) => update("offeredCause", event.target.value)}
                        placeholder="For example: global poverty reduction"
                        value={values.offeredCause}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Priority you want advanced</span>
                      <input
                        className={styles.input}
                        maxLength={180}
                        onChange={(event) => update("requestedCause", event.target.value)}
                        placeholder="For example: animal welfare"
                        value={values.requestedCause}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What will you do?</h1>
                    <p>Use a bounded action another person can understand and later verify.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Your commitment</span>
                      <textarea
                        autoFocus
                        className={`${styles.textarea} ${styles.commitmentInput}`}
                        maxLength={5000}
                        onChange={(event) => update("proposedAction", event.target.value)}
                        placeholder="A concrete action, amount, service, or behavior you are willing to undertake"
                        value={values.proposedAction}
                      />
                    </label>
                    <span className={styles.helper}>
                      Avoid open-ended promises. State quantity, scope, or frequency where possible.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What will the other participant do?</h1>
                    <p>This becomes the reciprocal commitment in the frozen agreement version.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Counterparty commitment</span>
                      <textarea
                        autoFocus
                        className={`${styles.textarea} ${styles.commitmentInput}`}
                        maxLength={5000}
                        onChange={(event) => update("requestedAction", event.target.value)}
                        placeholder="A concrete reciprocal action"
                        value={values.requestedAction}
                      />
                    </label>
                    <span className={styles.helper}>
                      The other participant will review this exact text before confirming anything.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What happens without the trade?</h1>
                    <p>Record the real status quo so the proposal does not reward a manufactured worse baseline.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>No-trade baseline</span>
                      <textarea
                        autoFocus
                        className={`${styles.textarea} ${styles.baselineInput}`}
                        maxLength={5000}
                        onChange={(event) => update("noTradeBaseline", event.target.value)}
                        placeholder="What each side would actually do if no agreement forms"
                        value={values.noTradeBaseline}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>How is the burden bounded?</h1>
                    <p>Set the duration, optional dates, and the largest burden either side can incur.</p>
                  </div>
                  <div className={styles.fields}>
                    <div className={`${styles.fieldGrid} ${styles.fieldGridThree}`}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Duration</span>
                        <input
                          autoFocus
                          className={styles.input}
                          onChange={(event) => update("duration", event.target.value)}
                          placeholder="For example: 12 months"
                          value={values.duration}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Start date</span>
                        <input
                          className={styles.input}
                          onChange={(event) => update("startDate", event.target.value)}
                          type="date"
                          value={values.startDate}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Evidence due</span>
                        <input
                          className={styles.input}
                          onChange={(event) => update("evidenceDueDate", event.target.value)}
                          type="date"
                          value={values.evidenceDueDate}
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Maximum burden or exposure</span>
                      <textarea
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("maximumBurden", event.target.value)}
                        placeholder="The maximum money, time, action burden, and duration"
                        value={values.maximumBurden}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {step === 5 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>How is completion proved?</h1>
                    <p>Define the proof that counts. Evidence records and certified public-safe source copies are public by default; private messages remain private.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Evidence rule</span>
                      <textarea
                        autoFocus
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("evidenceRule", event.target.value)}
                        placeholder="Receipt, external record, log, or participant attestation that will count"
                        value={values.evidenceRule}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Public evidence and safety scope</span>
                      <textarea
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("privacyScope", event.target.value)}
                        value={values.privacyScope}
                      />
                    </label>
                    <span className={styles.helper}>
                      Remove exact addresses, account numbers, private contact details, and unrelated personal information before evidence submission. A narrow, documented safety exception may withhold specific proof.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 6 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>Review the complete record.</h1>
                    <p>A saved draft is private. Submission starts operator review; neither action confirms an agreement.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Exit conditions</span>
                      <textarea
                        autoFocus
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("exitConditions", event.target.value)}
                        placeholder="How either side can end future obligations"
                        value={values.exitConditions}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Context or constraints (optional)</span>
                      <textarea
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("notes", event.target.value)}
                        placeholder="Context that helps a counterparty evaluate the proposal"
                        value={values.notes}
                      />
                    </label>
                  </div>

                  <dl className={styles.receipt}>
                    <div className={styles.receiptRow}>
                      <dt>Priorities</dt>
                      <dd>{prioritySummary}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>You commit</dt>
                      <dd>{concise(values.proposedAction, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>They commit</dt>
                      <dd>{concise(values.requestedAction, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Without trade</dt>
                      <dd>{concise(values.noTradeBaseline, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Evidence</dt>
                      <dd>{concise(values.evidenceRule, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Evidence visibility</dt>
                      <dd>{concise(values.privacyScope, "Public by default")}</dd>
                    </div>
                  </dl>

                  <label className={styles.certification}>
                    <input
                      className={styles.checkbox}
                      checked={values.voluntaryCertification}
                      onChange={(event) => update("voluntaryCertification", event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      This proposal is voluntary. It does not threaten harm, retaliation, or a worse baseline if the other person declines.
                    </span>
                  </label>

                  <label className={styles.certification}>
                    <input
                      className={styles.checkbox}
                      checked={values.publicEvidenceCertification}
                      onChange={(event) => update("publicEvidenceCertification", event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      I understand that evidence submitted under an active agreement is public by default. I will submit only public-safe copies with sensitive identifiers and unrelated personal information removed.
                    </span>
                  </label>

                  <div className={styles.safetyList}>
                    <div className={styles.safetyItem}>
                      <strong>No payment or custody</strong>
                      <span>This route records non-financial commitments. Moral Trade does not hold or release funds here.</span>
                    </div>
                    <div className={styles.safetyItem}>
                      <strong>Public-safe evidence</strong>
                      <span>Evidence is public by default; only necessary, redacted, or certified public-safe copies should be submitted.</span>
                    </div>
                    <div className={styles.safetyItem}>
                      <strong>Separate confirmation</strong>
                      <span>After review and a counterparty response, both people confirm one frozen version independently.</span>
                    </div>
                  </div>
                </>
              ) : null}

              {error ? <div className={styles.error} role="alert">{error}</div> : null}

              <div className={styles.summary}>
                <span className={styles.kicker}>Draft summary</span>
                <span className={styles.summaryValue}>
                  <strong>{concise(values.proposedAction, "Your commitment")}</strong>
                  {" ↔ "}
                  {concise(values.requestedAction, "Their commitment")}
                </span>
              </div>
            </article>
          </div>

          <aside className={styles.guardrailRail} aria-label="Trade safeguards">
            <div className={styles.guardrail}>
              <TradeFlowIcon name="shield" />
              Voluntary baseline required
            </div>
            <div className={styles.guardrail}>
              <TradeFlowIcon name="evidence" />
              Public-safe evidence specified
            </div>
            <div className={styles.guardrail}>
              <TradeFlowIcon name="lock" />
              Same frozen terms for both people
            </div>
          </aside>
        </section>

        <footer className={styles.controls}>
          <button
            className={`${styles.button} ${styles.buttonBack}`}
            disabled={step === 0}
            onClick={previousStep}
            type="button"
          >
            Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={nextStep}
              type="button"
            >
              Next
              <TradeFlowIcon name="arrow" />
            </button>
          ) : (
            <>
              <span className={styles.footerNote}>
                Save privately, or certify voluntariness and public-safe evidence before submitting once for operator review.
              </span>
              <PendingSubmitButton
                className={`${styles.button} ${styles.buttonDark}`}
                disabled={!finalTermsComplete}
                name="intent"
                pendingLabel="Saving private draft..."
                value="draft"
              >
                Save private draft
              </PendingSubmitButton>
              <PendingSubmitButton
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={
                  !finalTermsComplete ||
                  !values.voluntaryCertification ||
                  !values.publicEvidenceCertification
                }
                name="intent"
                pendingLabel="Submitting for review..."
                value="submit"
              >
                Submit for review
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </>
          )}
        </footer>
      </form>
    </main>
  );
}

export function TradeDraftSignInGate() {
  return (
    <main className={`${styles.page} ${styles.gate}`} id="main-content" tabIndex={-1}>
      <header className={styles.gateHeader}>
        <Link aria-label="Moral Trade, home" className={styles.brandLink} href="/">
          <MoralTradeWordmark />
        </Link>
        <Link className={`${styles.button} ${styles.buttonBack}`} href="/discover">
          Exit
        </Link>
      </header>
      <div className={styles.gateMain}>
        <article className={styles.gateCard}>
          <span className={styles.kicker}>Private draft</span>
          <h1>Sign in to build a trade.</h1>
          <p>
            The card stack saves real proposal terms to your account. Nothing is public or binding until review, invitation, and separate bilateral confirmation.
          </p>
          <div className={styles.gateActions}>
            <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/signup?returnTo=/trades/new">
              Create account
            </Link>
            <Link className={`${styles.button} ${styles.buttonDark}`} href="/login?returnTo=/trades/new">
              Sign in
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
