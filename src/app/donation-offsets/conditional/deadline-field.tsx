"use client";

import { useState } from "react";

function localInputValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DeadlineField({
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
      Match deadline
      <input
        aria-describedby="conditional-deadline-note"
        max={localInputValue(maximumIso)}
        min={localInputValue(minimumIso)}
        onChange={(event) => setLocalValue(event.target.value)}
        required
        type="datetime-local"
        value={localValue}
      />
      <input name="deadline_at" type="hidden" value={isoValue} />
      <span className="field-note" id="conditional-deadline-note">
        Choose 30 minutes to 30 days from now. The default is seven days in your local
        time.
      </span>
    </label>
  );
}

export function LocalDateTime({ value }: { value: string }) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {new Date(value).toLocaleString()}
    </time>
  );
}
