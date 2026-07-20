import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  formatLocalDateTimeValue,
  LocalDateTime,
} from "./local-date-time";

const conciseDate: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

test("calendar-only dates do not shift between visitor time zones", () => {
  const losAngeles = formatLocalDateTimeValue("2026-05-01", {
    locale: "en-US",
    options: conciseDate,
    timeZone: "America/Los_Angeles",
  });
  const tokyo = formatLocalDateTimeValue("2026-05-01", {
    locale: "en-US",
    options: conciseDate,
    timeZone: "Asia/Tokyo",
  });

  assert.deepEqual(losAngeles, {
    dateTime: "2026-05-01",
    label: "May 1, 2026",
  });
  assert.deepEqual(tokyo, losAngeles);
});

test("the same instant renders on the visitor's local calendar date", () => {
  const instant = "2026-05-01T00:00:00.000Z";

  assert.equal(
    formatLocalDateTimeValue(instant, {
      dateOnly: true,
      locale: "en-US",
      options: conciseDate,
      timeZone: "America/Los_Angeles",
    })?.label,
    "Apr 30, 2026",
  );
  assert.equal(
    formatLocalDateTimeValue(instant, {
      dateOnly: true,
      locale: "en-US",
      options: conciseDate,
      timeZone: "Asia/Tokyo",
    })?.label,
    "May 1, 2026",
  );
});

test("dateOnly uses the native numeric date default", () => {
  const presentation = formatLocalDateTimeValue("2026-05-01T00:00:00.000Z", {
    dateOnly: true,
    locale: "en-US",
    timeZone: "America/Los_Angeles",
  });

  assert.equal(presentation?.label, "4/30/2026");
});

test("datetime defaults include the native numeric date and time fields", () => {
  const presentation = formatLocalDateTimeValue("2026-05-01T00:00:00.000Z", {
    locale: "en-US",
    timeZone: "Asia/Tokyo",
  });

  assert.equal(presentation?.label, "5/1/2026, 9:00:00 AM");
});

test("DST transitions use the visitor's IANA zone rules", () => {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
  };
  const before = formatLocalDateTimeValue("2026-03-08T09:30:00.000Z", {
    locale: "en-US",
    options,
    timeZone: "America/Los_Angeles",
  });
  const after = formatLocalDateTimeValue("2026-03-08T10:30:00.000Z", {
    locale: "en-US",
    options,
    timeZone: "America/Los_Angeles",
  });

  assert.equal(before?.label, "01:30");
  assert.equal(after?.label, "03:30");
});

test("invalid, ambiguous, and absent values use the fallback path", () => {
  const input = [null, "not-a-date", "2026-02-30", "2026-05-01T12:00:00"];

  for (const value of input) {
    assert.equal(
      formatLocalDateTimeValue(value, {
        locale: "en-US",
        timeZone: "UTC",
      }),
      null,
    );
  }
});

test("the caller cannot override the browser time zone", () => {
  const presentation = formatLocalDateTimeValue("2026-05-01T00:00:00.000Z", {
    dateOnly: true,
    locale: "en-US",
    options: { ...conciseDate, timeZone: "Asia/Tokyo" },
    timeZone: "America/Los_Angeles",
  });

  assert.equal(presentation?.label, "Apr 30, 2026");
});

test("server and hydration markup share a semantic fallback", () => {
  const markup = renderToStaticMarkup(
    createElement(LocalDateTime, {
      className: "timestamp",
      fallback: "Loading local time",
      value: "2026-05-01T00:00:00.000Z",
    }),
  );

  assert.match(markup, /^<time class="timestamp"/);
  assert.match(markup, /dateTime="2026-05-01T00:00:00\.000Z"/);
  assert.match(markup, />Loading local time<\/time>$/);
});
