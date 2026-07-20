"use client";

import {
  useSyncExternalStore,
  type ReactNode,
  type TimeHTMLAttributes,
} from "react";

export type LocalDateTimeValue = string | number | Date | null;

type LocalDateTimeProps = Omit<
  TimeHTMLAttributes<HTMLTimeElement>,
  "children" | "dateTime"
> & {
  value: LocalDateTimeValue;
  fallback?: ReactNode;
  dateOnly?: boolean;
  locale?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
};

type ParsedDateTime = {
  canonical: string;
  date: Date;
  calendarDate: boolean;
};

type LocalDateTimePresentation = {
  dateTime: string;
  label: string;
};

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

function parseCalendarDate(value: string): ParsedDateTime | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    calendarDate: true,
    canonical: value,
    date,
  };
}

function parseDateTimeValue(value: LocalDateTimeValue): ParsedDateTime | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    const calendarDate = parseCalendarDate(value);
    if (calendarDate) {
      return calendarDate;
    }

    // Offset-free timestamps are ambiguous: the server and visitor could parse
    // them in different zones. Site timestamps must identify an actual instant.
    if (!ISO_INSTANT_PATTERN.test(value)) {
      return null;
    }
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return {
    calendarDate: false,
    canonical: date.toISOString(),
    date,
  };
}

function defaultFormatOptions(dateOnly: boolean): Intl.DateTimeFormatOptions {
  if (dateOnly) {
    return {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    };
  }

  return {
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    month: "numeric",
    second: "numeric",
    year: "numeric",
  };
}

/**
 * Produces the presentation used by LocalDateTime. The explicit zone makes the
 * formatter deterministic for tests; the component always supplies the
 * visitor's browser-resolved IANA time zone.
 */
export function formatLocalDateTimeValue(
  value: LocalDateTimeValue,
  {
    dateOnly = false,
    locale,
    options,
    timeZone,
  }: {
    dateOnly?: boolean;
    locale?: Intl.LocalesArgument;
    options?: Intl.DateTimeFormatOptions;
    timeZone: string;
  },
): LocalDateTimePresentation | null {
  const parsed = parseDateTimeValue(value);
  if (!parsed) {
    return null;
  }

  // A caller-supplied timeZone must never override the visitor's zone. Exact
  // YYYY-MM-DD values represent calendar dates, so UTC keeps that date stable.
  const { timeZone: _ignoredTimeZone, ...formatOptions } =
    options ?? defaultFormatOptions(dateOnly);
  const effectiveTimeZone = parsed.calendarDate ? "UTC" : timeZone;

  try {
    return {
      dateTime: parsed.canonical,
      label: new Intl.DateTimeFormat(locale, {
        ...formatOptions,
        timeZone: effectiveTimeZone,
      }).format(parsed.date),
    };
  } catch {
    return null;
  }
}

function subscribeToTimeZoneChanges(onStoreChange: () => void) {
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);

  return () => {
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

function getBrowserTimeZone(): string | null {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getServerTimeZone(): string | null {
  return null;
}

export function LocalDateTime({
  value,
  fallback = "—",
  dateOnly = false,
  locale,
  options,
  ...timeProps
}: LocalDateTimeProps) {
  const timeZone = useSyncExternalStore(
    subscribeToTimeZoneChanges,
    getBrowserTimeZone,
    getServerTimeZone,
  );
  const parsed = parseDateTimeValue(value);
  const presentation = timeZone
    ? formatLocalDateTimeValue(value, {
        dateOnly,
        locale,
        options,
        timeZone,
      })
    : null;

  return (
    <time {...timeProps} dateTime={parsed?.canonical}>
      {presentation?.label ?? fallback}
    </time>
  );
}
