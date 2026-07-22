"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";

import styles from "./backing-create.module.css";

type BackingRole = "candidate" | "backer" | "coordinator";
type BackingCurrency = "USD" | "GBP" | "EUR" | "AUD" | "CAD" | "CHF";

interface BackingDraft {
  role: BackingRole;
  causeAreas: string;
  noDealPath: string;
  backedPath: string;
  impactCase: string;
  currency: BackingCurrency;
  totalGap: string;
  requestedCap: string;
  duration: string;
  clearingCondition: string;
  candidateCommitment: string;
  evidence: string;
  reviewer: string;
  privacyConstraints: string;
  exitRule: string;
  desiredTimeline: string;
}

interface BackingCreateFormProps {
  formMessage:
    | {
        text: string;
        tone: "error" | "success";
      }
    | null;
  isAuthenticated: boolean;
}

const RETURN_TO = "/create?mode=back";

const roleLabels: Record<BackingRole, string> = {
  candidate: "Candidate seeking backing",
  backer: "Backer proposing support",
  coordinator: "Institution or round coordinator",
};

const initialDraft: BackingDraft = {
  role: "candidate",
  causeAreas: "",
  noDealPath: "",
  backedPath: "",
  impactCase: "",
  currency: "USD",
  totalGap: "",
  requestedCap: "",
  duration: "12 months",
  clearingCondition: "",
  candidateCommitment: "",
  evidence: "",
  reviewer: "",
  privacyConstraints: "",
  exitRule: "",
  desiredTimeline: "",
};

function formatAmount(currency: BackingCurrency, value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Not set";
  }

  return new Intl.NumberFormat("en", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function clip(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function buildIntentSummary(draft: BackingDraft) {
  return [
    "Career-impact backing request",
    `Requester role: ${roleLabels[draft.role]}`,
    `Cause areas: ${clip(draft.causeAreas, 180)}`,
    `No-deal baseline: ${clip(draft.noDealPath, 280)}`,
    `Backed path: ${clip(draft.backedPath, 280)}`,
  ].join("\n\n");
}

function buildOfferSummary(draft: BackingDraft) {
  return [
    `Impact case: ${clip(draft.impactCase, 440)}`,
    `Compensation gap to verify: ${formatAmount(draft.currency, draft.totalGap)}`,
    `Requested backing cap: ${formatAmount(draft.currency, draft.requestedCap)}`,
    `Backing duration: ${draft.duration}`,
  ].join("\n\n");
}

function buildAskSummary(draft: BackingDraft) {
  return [
    `Clearing condition: ${clip(draft.clearingCondition, 300)}`,
    `Candidate commitment: ${clip(draft.candidateCommitment, 300)}`,
    `Desired review timeline: ${clip(draft.desiredTimeline, 140)}`,
  ].join("\n\n");
}

function buildConstraintsSummary(draft: BackingDraft) {
  return [
    `Evidence plan: ${clip(draft.evidence, 240)}`,
    `Proposed reviewer: ${clip(draft.reviewer, 120)}`,
    `Privacy and safety constraints: ${clip(draft.privacyConstraints, 150) || "No additional constraints stated."}`,
    `Exit and fallback rule: ${clip(draft.exitRule, 190)}`,
    "Review-only submission; voluntary, capped, time-bounded, and separately authorized.",
  ].join("\n\n");
}

function buildTargetPreview(draft: BackingDraft) {
  const causeSummary = clip(draft.causeAreas, 160) || "the stated cause area";
  const pathSummary = clip(draft.backedPath, 280) || "a reviewed higher-impact path";
  return `Career-impact backing counterparties for ${causeSummary}: ${pathSummary}`;
}

export function BackingCreateForm({ formMessage, isAuthenticated }: BackingCreateFormProps) {
  const [draft, setDraft] = useState<BackingDraft>(initialDraft);

  function updateField<Key extends keyof BackingDraft>(
    key: Key,
    value: BackingDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function bindField<Key extends keyof BackingDraft>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(key, event.target.value as BackingDraft[Key]);
    };
  }

  function preventSignedOutSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isAuthenticated) {
      event.preventDefault();
    }
  }

  const requestedCap = formatAmount(draft.currency, draft.requestedCap);
  const totalGap = formatAmount(draft.currency, draft.totalGap);
  const receiptRows = useMemo<readonly DealReceiptRow[]>(
    () => [
      {
        label: "Without backing",
        value: draft.noDealPath || "State the path that is likely without this arrangement.",
      },
      {
        label: "Backed path",
        value: draft.backedPath || "Name the role, project, or career move under review.",
      },
      {
        label: "Requested backing",
        value: `${requestedCap} toward a reviewed gap of ${totalGap} over ${draft.duration}.`,
      },
      {
        label: "Condition",
        value:
          draft.clearingCondition ||
          "Name the offer, gap verification, funding threshold, review, and consent gates.",
      },
      {
        emphasis: true,
        label: "Most that may be requested",
        value:
          draft.requestedCap && draft.duration
            ? `${requestedCap}; nothing beyond the stated ${draft.duration} term.`
            : "Set a hard contribution cap and term before review.",
      },
      {
        label: "Evidence",
        value: draft.evidence || "Name the documents, milestones, reviewer, and who may see each item.",
      },
      {
        label: "Exit",
        value: draft.exitRule || "State cancellation, expiry, fallback, and completed-period rules.",
      },
    ],
    [draft, requestedCap, totalGap],
  );

  const signupHref = `/signup?returnTo=${encodeURIComponent(RETURN_TO)}`;

  return (
    <div className={styles.formLayout}>
      <form
        action={isAuthenticated ? createMatchConciergeRequestAction : undefined}
        className={styles.formPanel}
        onSubmit={preventSignedOutSubmit}
      >
        <input name="return_to" type="hidden" value={RETURN_TO} />
        <input name="route" type="hidden" value="other" />
        <input name="intent_summary" type="hidden" value={buildIntentSummary(draft)} />
        <input name="offer_summary" type="hidden" value={buildOfferSummary(draft)} />
        <input name="ask_summary" type="hidden" value={buildAskSummary(draft)} />
        <input name="constraints" type="hidden" value={buildConstraintsSummary(draft)} />
        <input name="target_preview" type="hidden" value={buildTargetPreview(draft)} />
        <input name="desired_timeline" type="hidden" value={draft.desiredTimeline} />
        <input name="cause_areas_json" type="hidden" value={draft.causeAreas} />

        {formMessage ? (
          <div
            className={[
              styles.status,
              formMessage.tone === "error" ? styles.statusError : styles.statusSuccess,
            ].join(" ")}
            role={formMessage.tone === "error" ? "alert" : "status"}
          >
            {formMessage.text}
          </div>
        ) : null}

        <fieldset className={styles.step}>
          <legend className={styles.stepHeading}>
            <span>01</span>
            <span>
              <strong>Default and path</strong>
              <small>Establish what is additional before discussing money.</small>
            </span>
          </legend>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>I am</span>
              <select
                name="backing_role"
                onChange={(event) => updateField("role", event.target.value as BackingRole)}
                value={draft.role}
              >
                <option value="candidate">A candidate seeking backing</option>
                <option value="backer">A backer proposing support</option>
                <option value="coordinator">An institution or round coordinator</option>
              </select>
              <small>This controls how the review request is framed; it creates no authority.</small>
            </label>

            <label className={styles.field}>
              <span>Cause areas</span>
              <input
                name="backing_cause_areas"
                onChange={bindField("causeAreas")}
                maxLength={180}
                placeholder="AI safety, global health, animal welfare"
                required
                value={draft.causeAreas}
              />
              <small>Use broad categories. Exact private details stay in the review queue.</small>
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>No-deal baseline</span>
              <textarea
                name="backing_no_deal_path"
                onChange={bindField("noDealPath")}
                maxLength={280}
                placeholder="Without backing, which role or path is most likely, and what compensation or constraints make it the default?"
                required
                rows={4}
                value={draft.noDealPath}
              />
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>Path to be backed</span>
              <textarea
                name="backing_path"
                onChange={bindField("backedPath")}
                maxLength={280}
                placeholder="Name the specific offer, role, project, or transition that backing would make more feasible."
                required
                rows={4}
                value={draft.backedPath}
              />
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>Why this path may have more impact</span>
              <textarea
                name="backing_impact_case"
                onChange={bindField("impactCase")}
                maxLength={440}
                placeholder="Give the reviewable impact case, including major uncertainties and plausible alternatives."
                required
                rows={5}
                value={draft.impactCase}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.step}>
          <legend className={styles.stepHeading}>
            <span>02</span>
            <span>
              <strong>Bounded terms</strong>
              <small>Separate the verified gap from the maximum request.</small>
            </span>
          </legend>

          <div className={styles.moneyGrid}>
            <label className={styles.field}>
              <span>Currency</span>
              <select
                name="backing_currency"
                onChange={(event) =>
                  updateField("currency", event.target.value as BackingCurrency)
                }
                value={draft.currency}
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
                <option value="CHF">CHF</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Total compensation gap</span>
              <input
                inputMode="decimal"
                min="1"
                name="backing_total_gap"
                onChange={bindField("totalGap")}
                placeholder="50000"
                required
                step="1"
                type="number"
                value={draft.totalGap}
              />
              <small>The amount to verify, not an automatic entitlement.</small>
            </label>

            <label className={styles.field}>
              <span>Maximum backing requested</span>
              <input
                inputMode="decimal"
                max={draft.totalGap || undefined}
                min="1"
                name="backing_requested_cap"
                onChange={bindField("requestedCap")}
                placeholder="30000"
                required
                step="1"
                type="number"
                value={draft.requestedCap}
              />
              <small>This is the most that may be requested from all backers combined.</small>
            </label>

            <label className={styles.field}>
              <span>Backing term</span>
              <select
                name="backing_duration"
                onChange={bindField("duration")}
                value={draft.duration}
              >
                <option value="One-time transition payment">One-time transition payment</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="12 months">12 months</option>
                <option value="18 months">18 months</option>
                <option value="24 months">24 months</option>
              </select>
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>When this starts</span>
              <textarea
                name="backing_clearing_condition"
                onChange={bindField("clearingCondition")}
                maxLength={300}
                placeholder="For example: the offer is accepted, pay evidence is reviewed, at least $25,000 is promised by the deadline, and the candidate separately accepts the final terms."
                required
                rows={4}
                value={draft.clearingCondition}
              />
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>Candidate commitment</span>
              <textarea
                name="backing_candidate_commitment"
                onChange={bindField("candidateCommitment")}
                maxLength={300}
                placeholder="State the specific action the candidate would take if the condition is met. Do not create an open-ended duty to remain in a role."
                required
                rows={4}
                value={draft.candidateCommitment}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.step}>
          <legend className={styles.stepHeading}>
            <span>03</span>
            <span>
              <strong>Evidence and review</strong>
              <small>Name what can be checked and who is accountable for checking it.</small>
            </span>
          </legend>

          <div className={styles.fieldGrid}>
            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>Evidence plan</span>
              <textarea
                name="backing_evidence"
                onChange={bindField("evidence")}
                maxLength={240}
                placeholder="Offer letter, compensation comparison, start confirmation, milestone evidence, review dates, and the privacy level for each item."
                required
                rows={5}
                value={draft.evidence}
              />
            </label>

            <label className={styles.field}>
              <span>Reviewer</span>
              <input
                name="backing_reviewer"
                onChange={bindField("reviewer")}
                maxLength={120}
                placeholder="Named person, committee, or reviewer profile"
                required
                value={draft.reviewer}
              />
              <small>Conflicts and permission to review must be checked before the request starts.</small>
            </label>

            <label className={styles.field}>
              <span>Desired review timeline</span>
              <input
                name="backing_timeline"
                onChange={bindField("desiredTimeline")}
                maxLength={140}
                placeholder="Review by 30 September 2026"
                required
                value={draft.desiredTimeline}
              />
            </label>

            <label className={`${styles.field} ${styles.spanTwo}`}>
              <span>Privacy and safety constraints</span>
              <textarea
                name="backing_privacy_constraints"
                onChange={bindField("privacyConstraints")}
                maxLength={150}
                placeholder="State what must remain private, who may see salary or offer evidence, and any conflicts or power imbalances the reviewer should consider."
                rows={4}
                value={draft.privacyConstraints}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className={`${styles.step} ${styles.lastStep}`}>
          <legend className={styles.stepHeading}>
            <span>04</span>
            <span>
              <strong>Exit and confirmation</strong>
              <small>Explain refusal, end dates, and failure before review.</small>
            </span>
          </legend>

          <label className={styles.field}>
            <span>Exit and fallback rule</span>
            <textarea
              name="backing_exit_rule"
              onChange={bindField("exitRule")}
              maxLength={190}
              placeholder="Explain what happens if the role changes, the funding threshold is missed, evidence fails, either side withdraws before authorization, or the candidate leaves after a completed period."
              required
              rows={5}
              value={draft.exitRule}
            />
          </label>

          <div className={styles.attestations}>
            <label className={styles.attestation}>
              <input name="attest_voluntary" required type="checkbox" />
              <span>
                The candidate may decline the arrangement without retaliation, loss of unrelated
                benefits, or public disclosure.
              </span>
            </label>
            <label className={styles.attestation}>
              <input name="attest_bounded" required type="checkbox" />
              <span>
                The request has a spending limit and an end date. It does not create an indefinite duty to
                remain in a role.
              </span>
            </label>
            <label className={styles.attestation}>
              <input name="attest_review_only" required type="checkbox" />
              <span>
                I understand that submission asks for staff review only; it does not reserve funds,
                certify impact, or create an employment agreement.
              </span>
            </label>
          </div>
        </fieldset>

        <div className={styles.submitBar}>
          <p>
            {isAuthenticated
              ? "The request will enter a private review queue. The other participant is not contacted, and no money moves."
              : "This signed-out preview is not saved. Create an account before entering sensitive details or requesting review."}
          </p>
          {isAuthenticated ? (
            <button className="button button-primary" type="submit">
              Request review
            </button>
          ) : (
            <Link className="button button-primary" href={signupHref}>
              Create account before drafting
            </Link>
          )}
        </div>
      </form>

      <aside className={styles.receiptColumn} aria-label="Backing request preview">
        <div className={styles.receiptIntro}>
          <p className="mt-product-kicker">Live preview</p>
          <h3>Review the limits.</h3>
          <p>
            The receipt mirrors the review fields. Empty or vague rows are a signal to keep drafting,
            not an invitation to rely on the request.
          </p>
        </div>
        <DealReceipt
          note="Preview only. This is not a pledge, employment contract, escrow instruction, tax opinion, or impact certification."
          rows={receiptRows}
          state="Draft"
          title="Career-impact backing"
        />
      </aside>
    </div>
  );
}
