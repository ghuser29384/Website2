"use client";

import { useState } from "react";

function localInputValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DirectUpgradeDeadlineField({
  defaultValueIso,
  maximumIso,
  minimumIso,
}: {
  defaultValueIso: string;
  maximumIso: string;
  minimumIso: string;
}) {
  const [localValue, setLocalValue] = useState(() => localInputValue(defaultValueIso));
  const parsed = new Date(localValue);
  const isoValue = Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString();

  return (
    <label>
      Matching deadline
      <input
        aria-describedby="direct-upgrade-deadline-note"
        max={localInputValue(maximumIso)}
        min={localInputValue(minimumIso)}
        onChange={(event) => setLocalValue(event.target.value)}
        required
        type="datetime-local"
        value={localValue}
      />
      <input name="match_deadline_at" type="hidden" value={isoValue} />
      <span className="field-note" id="direct-upgrade-deadline-note">
        Choose one hour to 30 days from now. The default is seven days in your local time.
      </span>
    </label>
  );
}

export function DirectUpgradeLocalDateTime({ value }: { value: string }) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {new Date(value).toLocaleString()}
    </time>
  );
}
