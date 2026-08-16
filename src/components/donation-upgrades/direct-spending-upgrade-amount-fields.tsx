"use client";

import { useMemo, useState } from "react";

function parseUsd(value: string) {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function money(cents: number | null) {
  if (cents === null) return "Enter a valid USD amount";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function DirectSpendingUpgradeAmountFields() {
  const [planned, setPlanned] = useState("30.00");
  const [creator, setCreator] = useState("25.00");
  const [matcher, setMatcher] = useState("20.00");
  const preview = useMemo(() => {
    const plannedCents = parseUsd(planned);
    const creatorCents = parseUsd(creator);
    const matcherCents = parseUsd(matcher);
    const plannedValid =
      plannedCents !== null && plannedCents >= 100 && plannedCents <= 5_000_000;
    const creatorValid =
      creatorCents !== null &&
      creatorCents >= 100 &&
      creatorCents <= 5_000_000 &&
      plannedCents !== null &&
      creatorCents <= plannedCents;
    const matcherValid =
      matcherCents !== null && matcherCents >= 100 && matcherCents <= 5_000_000;
    const retained =
      plannedValid && creatorValid && plannedCents !== null && creatorCents !== null
        ? plannedCents - creatorCents
        : null;
    const share =
      retained !== null && plannedCents
        ? Math.floor(
            (creatorCents! * 10_000 + Math.floor(plannedCents / 2)) /
              plannedCents,
          ) / 100
        : null;
    return {
      plannedCents,
      creatorCents,
      matcherCents,
      plannedValid,
      creatorValid,
      matcherValid,
      retained,
      share,
    };
  }, [creator, matcher, planned]);

  return (
    <fieldset className="form-stack">
      <legend>How much planned nonessential spending becomes a donation?</legend>
      <div className="form-grid">
        <label>
          Planned nonessential expense
          <input
            aria-invalid={!preview.plannedValid}
            inputMode="decimal"
            max="50000"
            min="1"
            name="planned_spend_amount"
            onChange={(event) => setPlanned(event.target.value)}
            required
            step="0.01"
            type="number"
            value={planned}
          />
          <span className="field-note">
            This freezes the prospective expense ceiling; it does not require
            you to complete that purchase if no one matches.
          </span>
        </label>
        <label>
          Your direct donation after a match
          <input
            aria-invalid={!preview.creatorValid}
            inputMode="decimal"
            max="50000"
            min="1"
            name="creator_diversion_amount"
            onChange={(event) => setCreator(event.target.value)}
            required
            step="0.01"
            type="number"
            value={creator}
          />
          <span className="field-note">
            Must be no more than the frozen prospective expense.
          </span>
        </label>
        <label>
          Matcher&apos;s separate direct donation
          <input
            aria-invalid={!preview.matcherValid}
            inputMode="decimal"
            max="50000"
            min="1"
            name="matcher_amount"
            onChange={(event) => setMatcher(event.target.value)}
            required
            step="0.01"
            type="number"
            value={matcher}
          />
          <span className="field-note">
            The matcher donates independently to the same nonprofit.
          </span>
        </label>
      </div>
      <dl className="detail-grid" aria-live="polite">
        <div>
          <dt>Prospective expense</dt>
          <dd>{preview.plannedValid ? money(preview.plannedCents) : "Invalid"}</dd>
        </div>
        <div>
          <dt>Creator donates if matched</dt>
          <dd>{preview.creatorValid ? money(preview.creatorCents) : "Invalid"}</dd>
        </div>
        <div>
          <dt>Spending remainder</dt>
          <dd>{money(preview.retained)}</dd>
        </div>
        <div>
          <dt>Converted share</dt>
          <dd>{preview.share === null ? "Invalid" : `${preview.share}%`}</dd>
        </div>
        <div>
          <dt>Matcher adds</dt>
          <dd>{preview.matcherValid ? money(preview.matcherCents) : "Invalid"}</dd>
        </div>
      </dl>
    </fieldset>
  );
}
