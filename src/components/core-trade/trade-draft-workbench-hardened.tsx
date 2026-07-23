"use client";

import Link from "next/link";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";

export interface TradeDraftValues {
  duration: string;
  evidenceDueDate: string;
  evidenceRule: string;
  exitConditions: string;
  maximumBurden: string;
  noTradeBaseline: string;
  notes: string;
  offeredCause: string;
  privacyScope: string;
  proposedAction: string;
  requestedAction: string;
  requestedCause: string;
  startDate: string;
}

interface HardenedTradeDraftWorkbenchProps {
  formMessage?: { text: string; tone: "error" | "success" } | null;
  initialValues?: Partial<TradeDraftValues>;
  saveAction: (formData: FormData) => void | Promise<void>;
  submissionKey: string;
  templateLabel?: string | null;
}

const DEFAULT_PRIVACY_SCOPE =
  "Agreement evidence is private to the two participants and the operator. Publishing any evidence requires a separate, explicit redaction and publication step.";

function value(initialValues: Partial<TradeDraftValues> | undefined, key: keyof TradeDraftValues) {
  if (key === "privacyScope") {
    return initialValues?.privacyScope || DEFAULT_PRIVACY_SCOPE;
  }
  return initialValues?.[key] ?? "";
}

export function HardenedTradeDraftWorkbench({
  formMessage,
  initialValues,
  saveAction,
  submissionKey,
  templateLabel,
}: HardenedTradeDraftWorkbenchProps) {
  return (
    <main className="page-shell marketplace-app-shell" id="main-content" tabIndex={-1}>
      <header className="v72-route-header">
        <nav aria-label="Trade builder" className="topbar">
          <Link aria-label="Moral Trade, home" className="brand" href="/">
            <MoralTradeWordmark />
          </Link>
          <div className="topbar-links">
            <Link href="/offers">Offers</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/commitments">Commitments</Link>
          </div>
        </nav>
      </header>

      <section className="section section-white">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Create a bounded proposal</p>
          <h1>State the exchange, the no-deal baseline, the evidence rule, and the exit rule.</h1>
          <p>
            Saving creates a private draft. Submitting sends the proposal to review; it does not
            create an agreement. Evidence remains private unless a participant later publishes a
            separate redacted copy.
          </p>
        </div>

        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : ""
            }`}
            role="status"
          >
            <strong>{formMessage.tone === "error" ? "Could not save" : "Saved"}</strong>
            <p>{formMessage.text}</p>
          </div>
        ) : templateLabel ? (
          <div className="status-banner" role="status">
            <strong>{templateLabel}</strong>
            <p>Template text is only a starting point. Replace every term with one that is true.</p>
          </div>
        ) : null}

        <form action={saveAction} className="panel stack-form">
          <input name="submission_key" type="hidden" value={submissionKey} />

          <div className="field-grid">
            <label className="field">
              <span>Priority you advance</span>
              <input
                defaultValue={value(initialValues, "offeredCause")}
                maxLength={180}
                name="offered_cause"
                placeholder="For example: global poverty reduction"
                required
              />
            </label>
            <label className="field">
              <span>Priority you want advanced</span>
              <input
                defaultValue={value(initialValues, "requestedCause")}
                maxLength={180}
                name="requested_cause"
                placeholder="For example: animal welfare"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Your concrete commitment</span>
            <textarea
              defaultValue={value(initialValues, "proposedAction")}
              maxLength={5000}
              name="proposed_action"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>Requested counterparty commitment</span>
            <textarea
              defaultValue={value(initialValues, "requestedAction")}
              maxLength={5000}
              name="requested_action"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>What happens without this trade?</span>
            <textarea
              defaultValue={value(initialValues, "noTradeBaseline")}
              maxLength={5000}
              name="no_trade_baseline"
              required
              rows={3}
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Duration</span>
              <input
                defaultValue={value(initialValues, "duration")}
                maxLength={5000}
                name="duration"
                required
              />
            </label>
            <label className="field">
              <span>Start date</span>
              <input defaultValue={value(initialValues, "startDate")} name="start_date" type="date" />
            </label>
            <label className="field">
              <span>Evidence due date</span>
              <input
                defaultValue={value(initialValues, "evidenceDueDate")}
                name="evidence_due_date"
                type="date"
              />
            </label>
          </div>

          <label className="field">
            <span>Evidence that will count</span>
            <textarea
              defaultValue={value(initialValues, "evidenceRule")}
              maxLength={5000}
              name="evidence_rule"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>Maximum burden or commitment limit</span>
            <textarea
              defaultValue={value(initialValues, "maximumBurden")}
              maxLength={5000}
              name="maximum_burden"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>Privacy scope</span>
            <textarea
              defaultValue={value(initialValues, "privacyScope")}
              maxLength={5000}
              name="privacy_scope"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>How future obligations can end</span>
            <textarea
              defaultValue={value(initialValues, "exitConditions")}
              maxLength={5000}
              name="exit_conditions"
              required
              rows={3}
            />
          </label>
          <label className="field">
            <span>Context or constraints (optional)</span>
            <textarea
              defaultValue={value(initialValues, "notes")}
              maxLength={5000}
              name="notes"
              rows={3}
            />
          </label>

          <label className="radio-row">
            <input name="voluntary_certification" required type="checkbox" />
            <span>
              This proposal is voluntary and does not threaten harm, retaliation, or a worse
              baseline if the other person declines.
            </span>
          </label>
          <label className="radio-row">
            <input name="public_evidence_certification" required type="checkbox" />
            <span>
              I understand that submitted evidence is private by default. Any public record must
              be created later as a separate, explicitly selected, redacted copy.
            </span>
          </label>

          <div className="form-actions">
            <button className="button button-secondary" name="intent" type="submit" value="draft">
              Save private draft
            </button>
            <button className="button button-primary" name="intent" type="submit" value="submit">
              Submit for review
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
