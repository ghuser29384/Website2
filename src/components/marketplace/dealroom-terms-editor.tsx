"use client";

import { useMemo, useState } from "react";

import { saveAgreementTermsAction } from "@/app/actions";

import styles from "./dealroom-terms-editor.module.css";

export interface DealroomTerms {
  structuredTerms: string;
  noTradeBaseline: string;
  counterfactualDeclaration: string;
  durationTerms: string;
  exitConditions: string;
  evidenceRule: string;
  privacyScope: string;
  disclosureScope: string;
}

interface DealroomTermsEditorProps {
  agreementId: string;
  initialTerms: DealroomTerms;
  returnTo: string;
}

type TermKey = keyof DealroomTerms;

const FIELDS: ReadonlyArray<{
  key: TermKey;
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  rows: number;
}> = [
  {
    key: "structuredTerms",
    label: "Structured terms",
    name: "structured_terms",
    placeholder: "State both commitments, burdens, and the expected moral surplus.",
    required: true,
    rows: 5,
  },
  {
    key: "noTradeBaseline",
    label: "No-trade baseline",
    name: "no_trade_baseline",
    placeholder: "What would each side likely do if this trade did not happen?",
    required: true,
    rows: 3,
  },
  {
    key: "counterfactualDeclaration",
    label: "Counterfactual declaration",
    name: "counterfactual_declaration",
    placeholder: "Why is the action plausibly caused by this agreement?",
    required: true,
    rows: 3,
  },
  {
    key: "durationTerms",
    label: "Duration",
    name: "duration_terms",
    placeholder: "State the completion window and any recurring cadence.",
    required: true,
    rows: 3,
  },
  {
    key: "exitConditions",
    label: "Exit conditions",
    name: "exit_conditions",
    placeholder: "State how either party can pause, revise, or leave the agreement.",
    required: true,
    rows: 3,
  },
  {
    key: "evidenceRule",
    label: "Evidence rule",
    name: "evidence_rule",
    placeholder: "Name the receipts, logs, attestations, or review records that count.",
    required: true,
    rows: 3,
  },
  {
    key: "privacyScope",
    label: "Privacy scope",
    name: "privacy_scope",
    placeholder: "State who may see messages, evidence, and identifying details.",
    required: true,
    rows: 3,
  },
  {
    key: "disclosureScope",
    label: "Public disclosure scope",
    name: "disclosure_scope",
    placeholder: "State what, if anything, may be published after completion.",
    required: false,
    rows: 3,
  },
];

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function excerpt(value: string) {
  const normalized = normalize(value);
  return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
}

export function DealroomTermsEditor({
  agreementId,
  initialTerms,
  returnTo,
}: DealroomTermsEditorProps) {
  const [terms, setTerms] = useState(initialTerms);
  const changedFields = useMemo(
    () =>
      FIELDS.filter(
        (field) => normalize(terms[field.key]) !== normalize(initialTerms[field.key]),
      ),
    [initialTerms, terms],
  );

  return (
    <div className={styles.editorGrid}>
      <form action={saveAgreementTermsAction} className={styles.form}>
        <input name="agreement_id" type="hidden" value={agreementId} />
        <input name="return_to" type="hidden" value={returnTo} />

        {FIELDS.map((field) => (
          <label className={styles.field} key={field.key}>
            <span>{field.label}</span>
            <textarea
              name={field.name}
              onChange={(event) =>
                setTerms((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              placeholder={field.placeholder}
              required={field.required}
              rows={field.rows}
              value={terms[field.key]}
            />
          </label>
        ))}

        <div className={styles.formActions}>
          <span>
            {changedFields.length
              ? `${changedFields.length} unpublished change${changedFields.length === 1 ? "" : "s"}`
              : "No unpublished changes"}
          </span>
          <button
            className="button button-primary"
            disabled={!changedFields.length}
            type="submit"
          >
            Save revised terms
          </button>
        </div>
      </form>

      <aside className={styles.diff} aria-live="polite">
        <p className={styles.kicker}>Term diff</p>
        <h3>Review changes before saving</h3>
        {changedFields.length ? (
          <div className={styles.diffList}>
            {changedFields.map((field) => (
              <article key={field.key}>
                <h4>{field.label}</h4>
                <div>
                  <span>Current record</span>
                  <p>{excerpt(initialTerms[field.key]) || "Not recorded"}</p>
                </div>
                <div>
                  <span>Proposed revision</span>
                  <p>{excerpt(terms[field.key]) || "Cleared"}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyDiff}>
            Edit a field to compare the proposed revision with the current agreement
            record. Nothing is saved until you submit the form.
          </p>
        )}
      </aside>
    </div>
  );
}
