"use client";

import { useActionState, useMemo, useState } from "react";

import { createCollectiveCommitmentAction } from "@/app/collective-commitments/actions";
import { EMPTY_COLLECTIVE_ACTION_STATE } from "@/lib/collective-commitments/action-state";
import {
  COLLECTIVE_PROPOSITION_TYPE_META,
  COLLECTIVE_PROPOSITION_TYPES,
  COLLECTIVE_RISK_DIMENSIONS,
  getCollectiveRiskProfile,
  type CollectivePropositionType,
} from "@/lib/collective-commitments/types";

import { CollectiveSubmitButton } from "./submit-button";
import styles from "./collective-commitments.module.css";

function defaultDeadline(minimumMinutes: number) {
  const date = new Date(Date.now() + Math.max(24 * 60, minimumMinutes + 30) * 60_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CollectiveCommitmentForm({ minimumDeadlineMinutes }: { minimumDeadlineMinutes: number }) {
  const [state, action] = useActionState(
    createCollectiveCommitmentAction,
    EMPTY_COLLECTIVE_ACTION_STATE,
  );
  const [propositionType, setPropositionType] = useState<CollectivePropositionType>("public_letter");
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const risk = useMemo(
    () => getCollectiveRiskProfile(propositionType, selectedDimensions),
    [propositionType, selectedDimensions],
  );

  return (
    <form action={action} className={styles.form}>
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Proposition type</span>
          <select
            name="proposition_type"
            onChange={(event) => setPropositionType(event.target.value as CollectivePropositionType)}
            value={propositionType}
          >
            {COLLECTIVE_PROPOSITION_TYPES.map((value) => (
              <option key={value} value={value}>
                {COLLECTIVE_PROPOSITION_TYPE_META[value].label}
              </option>
            ))}
          </select>
          <small>{COLLECTIVE_PROPOSITION_TYPE_META[propositionType].description}</small>
        </label>

        <label className={styles.field}>
          <span>Verified-signer threshold</span>
          <input min={2} max={1_000_000} name="threshold_count" required type="number" defaultValue={4} />
          <small>All qualifying identities reveal together only when this exact number is reached.</small>
        </label>
      </div>

      <label className={styles.field}>
        <span>Title</span>
        <input maxLength={160} minLength={3} name="title" required />
      </label>

      <label className={styles.field}>
        <span>Exact proposition</span>
        <textarea maxLength={12_000} minLength={10} name="proposition_text" required rows={6} />
        <small>This text is frozen at creation. Signers accept this exact version.</small>
      </label>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Requirements for signers</span>
          <textarea maxLength={6_000} minLength={3} name="requirements_text" required rows={5} />
        </label>
        <label className={styles.field}>
          <span>Eligibility rule</span>
          <textarea maxLength={4_000} minLength={3} name="eligibility_rule" required rows={5} />
          <small>Eligibility review must be as strict as the identity assurance required by the proposition.</small>
        </label>
      </div>

      <label className={styles.field}>
        <span>Deadline</span>
        <input
          aria-describedby="deadline-help"
          defaultValue={defaultDeadline(minimumDeadlineMinutes)}
          min={defaultDeadline(minimumDeadlineMinutes)}
          name="deadline_at"
          required
          type="datetime-local"
        />
        <small id="deadline-help">At least {minimumDeadlineMinutes} minutes from creation. If unmet, encrypted signatures and the per-commitment key are erased.</small>
      </label>

      <fieldset className={styles.fieldset}>
        <legend>Additional risk dimensions</legend>
        <div className={styles.checkGrid}>
          {COLLECTIVE_RISK_DIMENSIONS.map((dimension) => (
            <label key={dimension}>
              <input
                name="risk_dimensions"
                type="checkbox"
                value={dimension}
                onChange={(event) => {
                  setSelectedDimensions((current) =>
                    event.target.checked
                      ? [...new Set([...current, dimension])]
                      : current.filter((value) => value !== dimension),
                  );
                }}
              />
              <span>{dimension}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <aside className={risk.riskClass === "high" ? styles.highRisk : styles.standardRisk}>
        <strong>{risk.riskClass === "high" ? "High-risk proposition" : "Standard-risk proposition"}</strong>
        <p>
          {risk.riskClass === "high"
            ? `Potential exposure: ${risk.riskDimensions.join(", ")}. A numerical threshold does not guarantee legal, employment, reputational, financial, political, or physical safety.`
            : "No additional risk dimension is currently selected. Moral Trade still does not guarantee that collective publication is safe."}
        </p>
      </aside>

      <label className={styles.checkboxRow}>
        <input name="publication_acknowledgment" required type="checkbox" />
        <span>I understand that every qualifying signer’s verified real name will be published together if the threshold is reached. Affiliation is published only when that signer opts in.</span>
      </label>

      {risk.riskClass === "high" ? (
        <label className={styles.checkboxRow}>
          <input name="high_risk_acknowledgment" required type="checkbox" />
          <span>I understand that the threshold and identity controls do not remove retaliation, legal, employment, political, financial, reputational, or physical risk.</span>
        </label>
      ) : null}

      {state.message ? (
        <p className={state.ok ? styles.successMessage : styles.errorMessage} role="status">
          {state.message}
        </p>
      ) : null}

      <div className={styles.actions}>
        <CollectiveSubmitButton pendingLabel="Creating frozen commitment…">
          Create collective commitment
        </CollectiveSubmitButton>
      </div>
    </form>
  );
}
