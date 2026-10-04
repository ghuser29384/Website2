"use client";

import { useState } from "react";
import { PROFILE_SETUP_LIMITS } from "@/lib/profile-setup-draft";
import {
  formatMatchingPreference, matchingPreferenceDetailsLimit, parseMatchingPreference,
  type MatchingPreferenceGroup,
} from "@/lib/profile-matching-choices";
import styles from "./profile-setup.module.css";

interface MatchingPreferenceChoicesProps {
  group: MatchingPreferenceGroup;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function MatchingPreferenceChoices({ group, value, disabled, onChange }: MatchingPreferenceChoicesProps) {
  const { selected, other } = parseMatchingPreference(value, group.options);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");
  const detailsLimit = matchingPreferenceDetailsLimit(group, selected);
  function toggle(option: string, checked: boolean) {
    const next = group.options.filter((choice) => choice === option ? checked : selected.includes(choice));
    const result = formatMatchingPreference({ selected: next, other });
    if (result.length > PROFILE_SETUP_LIMITS[group.name]) {
      setError("Shorten the additional details before adding more choices.");
      return;
    }
    setError("");
    onChange(result);
  }

  return <fieldset disabled={disabled} className={styles.preferenceGroup} aria-describedby={error ? `${group.name}-error` : undefined}>
    <legend>{group.label}</legend>
    <input type="hidden" name={group.name} value={value} />
    <div className={styles.choiceGrid}>
      {group.options.map((option) => <label className={styles.choice} key={option}>
        <input type="checkbox" checked={selected.includes(option)} onChange={(event) => toggle(option, event.target.checked)} />
        <span>{option}</span>
      </label>)}
    </div>
    <details className={styles.customPreference} open={Boolean(other) || detailsOpen}
      onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
      <summary>Other / add details</summary>
      <label htmlFor={`${group.name}-other`}>{group.label} — other details</label>
      <textarea id={`${group.name}-other`} rows={2} maxLength={detailsLimit} value={other}
        aria-describedby={`${group.name}-remaining`}
        onChange={(event) => { setError(""); onChange(formatMatchingPreference({ selected, other: event.target.value })); }} />
      <small id={`${group.name}-remaining`}>{detailsLimit - other.length} characters remaining</small>
    </details>
    {error ? <p id={`${group.name}-error`} role="alert" className={styles.preferenceError}>{error}</p> : null}
  </fieldset>;
}
