export function deriveCommitmentLimit(values: {
  duration: string;
  proposedAction: string;
  requestedAction: string;
}) {
  const proposedAction = values.proposedAction.trim().replace(/\s+/g, " ");
  const requestedAction = values.requestedAction.trim().replace(/\s+/g, " ");
  const duration = values.duration.trim().replace(/\s+/g, " ");
  if (!proposedAction || !requestedAction || !duration) return "";

  return `Limited to these two commitments for ${duration}: ${proposedAction} In return: ${requestedAction} No additional money, time, actions, or public exposure can be added without a newly confirmed agreement version.`;
}

export function isIsoCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarDateInTimeZone(
  timeZone: string,
  now = new Date(),
) {
  let resolvedTimeZone = timeZone.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: resolvedTimeZone }).format(now);
  } catch {
    resolvedTimeZone = "UTC";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: resolvedTimeZone,
    year: "numeric",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function validateTradeCalendarDates({
  evidenceDueDate,
  now,
  startDate,
  timeZone,
}: {
  evidenceDueDate: string | null;
  now?: Date;
  startDate: string | null;
  timeZone: string;
}) {
  if (startDate && !isIsoCalendarDate(startDate)) {
    return "Start date is invalid.";
  }
  if (evidenceDueDate && !isIsoCalendarDate(evidenceDueDate)) {
    return "Evidence due date is invalid.";
  }

  const today = calendarDateInTimeZone(timeZone, now);
  if (startDate && startDate < today) {
    return "Choose a start date that has not passed.";
  }
  if (evidenceDueDate && evidenceDueDate < today) {
    return "Choose an evidence due date that has not passed.";
  }
  if (startDate && evidenceDueDate && evidenceDueDate < startDate) {
    return "Evidence cannot be due before the commitment starts.";
  }
  return null;
}
