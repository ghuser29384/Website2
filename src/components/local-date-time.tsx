"use client";

import { useEffect, useMemo, useState } from "react";

interface LocalDateTimeProps {
  value: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
}

function fallbackLabel(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().replace("T", " ").replace(".000Z", " UTC") : value;
}

export function LocalDateTime({
  value,
  dateStyle = "medium",
  timeStyle = "short",
}: LocalDateTimeProps) {
  const fallback = useMemo(() => fallbackLabel(value), [value]);
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      setLabel(value);
      return;
    }

    setLabel(
      new Intl.DateTimeFormat(undefined, {
        dateStyle,
        timeStyle,
      }).format(parsed),
    );
  }, [dateStyle, timeStyle, value]);

  return (
    <time dateTime={value} title={fallback}>
      {label}
    </time>
  );
}
