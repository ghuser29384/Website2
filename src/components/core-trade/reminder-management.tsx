"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  rotateReminderCalendarFeedAction,
  saveReminderConfigurationAction,
  setReminderCalendarFeedAction,
} from "@/app/trade-agreements/[agreementId]/reminders/actions";
import type {
  ReminderCalendarFeed,
  ReminderMilestone,
  ReminderPreferences,
  ReminderRule,
  SaveReminderConfigurationInput,
} from "@/lib/trade-reminders";

import styles from "./reminder-management.module.css";

type ReminderView = "schedule" | "timeline" | "rules" | "calendar";

interface ReminderManagementProps {
  agreementId: string;
  agreementTitle: string;
  counterpartName: string;
  hasSavedPreferences: boolean;
  initialPreferences: ReminderPreferences;
  initialRules: ReminderRule[];
  initialMilestones: ReminderMilestone[];
  initialCalendarFeed: ReminderCalendarFeed | null;
  initialView?: ReminderView;
  initialNow: string;
  siteUrl: string;
}

const VIEWS: Array<{
  id: ReminderView;
  number: string;
  label: string;
  description: string;
}> = [
  {
    id: "schedule",
    number: "01",
    label: "Schedule",
    description: "Edit each milestone and delivery rule.",
  },
  {
    id: "timeline",
    number: "02",
    label: "Timeline",
    description: "Audit the exact chronological sequence.",
  },
  {
    id: "rules",
    number: "03",
    label: "Rules",
    description: "Apply repeatable offsets in bulk.",
  },
  {
    id: "calendar",
    number: "04",
    label: "Calendar",
    description: "Review dates and subscribe externally.",
  },
];

const OFFSET_OPTIONS = [
  { label: "3 days before", minutes: -4_320 },
  { label: "1 day before", minutes: -1_440 },
  { label: "3 hours before", minutes: -180 },
  { label: "1 hour before", minutes: -60 },
  { label: "At due time", minutes: 0 },
  { label: "1 hour after", minutes: 60 },
] as const;

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function makeClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function localInputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value: string, timezone: string, options?: Intl.DateTimeFormatOptions) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Date unavailable";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
      ...options,
    }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
      ...options,
    }).format(timestamp);
  }
}

function dateKey(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    }).format(Date.parse(value));
  } catch {
    return new Date(value).toISOString().slice(0, 10);
  }
}

function offsetLabel(offsetMinutes: number) {
  const option = OFFSET_OPTIONS.find((item) => item.minutes === offsetMinutes);
  if (option) return option.label;
  const absolute = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? "before" : "after";
  if (absolute % 1_440 === 0) {
    const days = absolute / 1_440;
    return `${days} day${days === 1 ? "" : "s"} ${direction}`;
  }
  if (absolute % 60 === 0) {
    const hours = absolute / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} ${direction}`;
  }
  return `${absolute} minute${absolute === 1 ? "" : "s"} ${direction}`;
}

function reminderTime(rule: ReminderRule) {
  return new Date(Date.parse(rule.dueAt) + rule.offsetMinutes * 60_000).toISOString();
}

function withComputedTime(rule: ReminderRule): ReminderRule {
  return { ...rule, remindAt: reminderTime(rule) };
}

function channelLabels(rule: ReminderRule, preferences: ReminderPreferences) {
  const labels: string[] = [];
  if (rule.inAppEnabled && preferences.inAppEnabled) labels.push("In-app");
  if (rule.emailEnabled && preferences.emailEnabled) labels.push("Email");
  if (rule.calendarEnabled) labels.push("Calendar");
  return labels;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarMark({ provider }: { provider: "apple" | "google" | "microsoft" }) {
  if (provider === "apple") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M16.7 12.8c0-2.5 2-3.7 2.1-3.8-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.2 1-4 .9-.8 0-2-1-3.4-.9-1.8 0-3.5 1.1-4.4 2.7-1.9 3.3-.5 8.2 1.3 10.9.9 1.3 2 2.7 3.4 2.6 1.4-.1 1.9-.9 3.6-.9 1.7 0 2.2.9 3.6.9 1.5 0 2.5-1.3 3.4-2.6 1.1-1.5 1.5-3 1.5-3.1-.1 0-3.3-1.3-3.3-4.7ZM14 5.3c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.6 1.8-.8.9-1.5 2.3-1.3 3.7 1.4.1 2.8-.7 3.7-1.7Z" fill="currentColor" />
      </svg>
    );
  }
  if (provider === "google") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M21.4 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.3a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 2.9-4.3 2.9-7.3Z" fill="currentColor" />
        <path d="M12 21.7c2.7 0 5-.9 6.6-2.3l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 21.7Z" fill="currentColor" opacity=".75" />
        <path d="M6.4 13.7a6 6 0 0 1 0-3.4V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.6Z" fill="currentColor" opacity=".55" />
        <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 3.1 7.7l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z" fill="currentColor" opacity=".35" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2 3.5 11 2v9H2v-7.5Zm10-1.7L22 0v11H12V1.8ZM2 12h9v9L2 19.5V12Zm10 0h10v11l-10-1.8V12Z" fill="currentColor" />
    </svg>
  );
}

export function ReminderManagement({
  agreementId,
  agreementTitle,
  counterpartName,
  hasSavedPreferences,
  initialPreferences,
  initialRules,
  initialMilestones,
  initialCalendarFeed,
  initialView = "schedule",
  initialNow,
  siteUrl,
}: ReminderManagementProps) {
  const stableNow = Number.isNaN(Date.parse(initialNow)) ? 0 : Date.parse(initialNow);
  const [view, setView] = useState<ReminderView>(initialView);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [rules, setRules] = useState(initialRules.map(withComputedTime));
  const [milestones, setMilestones] = useState(initialMilestones);
  const [calendarFeed, setCalendarFeed] = useState(initialCalendarFeed);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [selectedRuleId, setSelectedRuleId] = useState(initialRules[0]?.id ?? "");
  const [customLabel, setCustomLabel] = useState("");
  const [customDueAt, setCustomDueAt] = useState("");
  const [isPending, startTransition] = useTransition();

  const allMilestones = useMemo(() => {
    const byKey = new Map(milestones.map((milestone) => [milestone.key, milestone]));
    for (const rule of rules) {
      if (!byKey.has(rule.milestoneKey)) {
        byKey.set(rule.milestoneKey, {
          key: rule.milestoneKey,
          label: rule.milestoneLabel,
          dueAt: rule.dueAt,
          source: rule.source,
        });
      }
    }
    return [...byKey.values()].sort(
      (left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt),
    );
  }, [milestones, rules]);

  const activeRules = useMemo(
    () =>
      rules
        .filter((rule) => rule.enabled)
        .map(withComputedTime)
        .sort((left, right) => Date.parse(left.remindAt) - Date.parse(right.remindAt)),
    [rules],
  );

  const nextRule = useMemo(
    () =>
      activeRules.find((rule) => Date.parse(rule.remindAt) >= stableNow) ??
      activeRules[0] ??
      null,
    [activeRules, stableNow],
  );

  const selectedRule =
    activeRules.find((rule) => rule.id === selectedRuleId) ?? activeRules[0] ?? null;

  const showStatus = (message: string, tone: "success" | "error" = "success") => {
    setStatus(message);
    setStatusTone(tone);
  };

  const updatePreference = <Key extends keyof ReminderPreferences>(
    key: Key,
    value: ReminderPreferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const updateRule = (id: string, patch: Partial<ReminderRule>) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? withComputedTime({ ...rule, ...patch }) : rule)),
    );
  };

  const removeRule = (id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
    if (selectedRuleId === id) setSelectedRuleId("");
  };

  const addRule = (milestone: ReminderMilestone, offsetMinutes = -60) => {
    const duplicate = rules.some(
      (rule) =>
        rule.milestoneKey === milestone.key && rule.offsetMinutes === offsetMinutes,
    );
    if (duplicate) {
      showStatus("That milestone already has a reminder at this offset.", "error");
      return;
    }

    const rule = withComputedTime({
      id: makeClientId("rule"),
      agreementId,
      source: milestone.source,
      milestoneKey: milestone.key,
      milestoneLabel: milestone.label,
      dueAt: milestone.dueAt,
      offsetMinutes,
      remindAt: milestone.dueAt,
      enabled: true,
      inAppEnabled: true,
      emailEnabled: preferences.emailEnabled,
      calendarEnabled: true,
    });
    setRules((current) => [...current, rule]);
    setSelectedRuleId(rule.id);
    showStatus("Reminder added. Save changes to activate it.");
  };

  const changeCustomMilestoneDueAt = (milestoneKey: string, inputValue: string) => {
    const dueAt = localInputToIso(inputValue);
    if (!dueAt) return;
    const milestone = allMilestones.find((item) => item.key === milestoneKey);
    if (!milestone || milestone.source !== "custom") return;
    setMilestones((current) =>
      current.map((item) => (item.key === milestoneKey ? { ...item, dueAt } : item)),
    );
    setRules((current) =>
      current.map((rule) =>
        rule.milestoneKey === milestoneKey ? withComputedTime({ ...rule, dueAt }) : rule,
      ),
    );
  };

  const addCustomMilestone = () => {
    const label = customLabel.trim();
    const dueAt = localInputToIso(customDueAt);
    if (!label || !dueAt) {
      showStatus("Name the personal checkpoint and choose its due time.", "error");
      return;
    }
    if (label.length > 180) {
      showStatus("Checkpoint labels must be 180 characters or fewer.", "error");
      return;
    }

    const milestone: ReminderMilestone = {
      key: makeClientId("custom"),
      label,
      dueAt,
      source: "custom",
    };
    setMilestones((current) => [...current, milestone]);
    setCustomLabel("");
    setCustomDueAt("");
    addRule(milestone, -60);
  };

  const changeOffset = (rule: ReminderRule, offsetMinutes: number) => {
    const duplicate = rules.some(
      (candidate) =>
        candidate.id !== rule.id &&
        candidate.milestoneKey === rule.milestoneKey &&
        candidate.offsetMinutes === offsetMinutes,
    );
    if (duplicate) {
      showStatus("That milestone already has a reminder at this offset.", "error");
      return;
    }
    updateRule(rule.id, { offsetMinutes });
  };

  const toggleMatrixRule = (milestone: ReminderMilestone, offsetMinutes: number) => {
    const existing = rules.find(
      (rule) =>
        rule.milestoneKey === milestone.key && rule.offsetMinutes === offsetMinutes,
    );
    if (existing) {
      removeRule(existing.id);
      return;
    }
    addRule(milestone, offsetMinutes);
  };

  const save = () => {
    const payload: SaveReminderConfigurationInput = {
      agreementId,
      preferences,
      rules: rules.map((rule) => ({
        source: rule.source,
        milestoneKey: rule.milestoneKey,
        milestoneLabel: rule.milestoneLabel,
        dueAt: rule.dueAt,
        offsetMinutes: rule.offsetMinutes,
        enabled: rule.enabled,
        inAppEnabled: rule.inAppEnabled,
        emailEnabled: rule.emailEnabled,
        calendarEnabled: rule.calendarEnabled,
      })),
    };

    startTransition(async () => {
      const result = await saveReminderConfigurationAction(payload);
      showStatus(result.message, result.ok ? "success" : "error");
    });
  };

  const setCalendarFeedEnabled = (enabled: boolean, includeCommitmentTitle?: boolean) => {
    startTransition(async () => {
      const result = await setReminderCalendarFeedAction({
        agreementId,
        enabled,
        includeCommitmentTitle:
          includeCommitmentTitle ?? calendarFeed?.includeCommitmentTitle ?? false,
      });
      if (result.calendarFeed !== undefined) setCalendarFeed(result.calendarFeed);
      showStatus(result.message, result.ok ? "success" : "error");
    });
  };

  const rotateCalendarFeed = () => {
    startTransition(async () => {
      const result = await rotateReminderCalendarFeedAction({ agreementId });
      if (result.calendarFeed !== undefined) setCalendarFeed(result.calendarFeed);
      showStatus(result.message, result.ok ? "success" : "error");
    });
  };

  const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const feedUrl = calendarFeed?.feedToken
    ? new URL(
        `api/calendar/reminders/${encodeURIComponent(calendarFeed.feedToken)}.ics`,
        normalizedSiteUrl,
      ).toString()
    : "";
  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:/, "webcal:") : "";

  const copyFeedUrl = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      showStatus("Private calendar URL copied.");
    } catch {
      showStatus("Could not copy automatically. Select and copy the URL below.", "error");
    }
  };

  const calendarAnchor =
    activeRules.find((rule) => Date.parse(rule.remindAt) >= stableNow)?.remindAt ?? initialNow;
  const calendarStart = new Date(calendarAnchor);
  calendarStart.setHours(0, 0, 0, 0);
  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });

  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <div>
          <p className={styles.kicker}>Commitment reminder control</p>
          <h1>Manage reminders</h1>
          <p>
            {agreementTitle} · with {counterpartName}. Reminder settings are personal and do not
            change the frozen Deal Receipt.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href={`/trade-agreements/${agreementId}`}>
            Back to commitment
          </Link>
          <button className={styles.primaryButton} disabled={isPending} onClick={save} type="button">
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      <nav aria-label="Reminder management layers" className={styles.layerNav}>
        {VIEWS.map((item) => (
          <button
            aria-current={view === item.id ? "page" : undefined}
            className={view === item.id ? styles.layerActive : styles.layerButton}
            key={item.id}
            onClick={() => setView(item.id)}
            type="button"
          >
            <span className={styles.layerNumber}>{item.number}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className={styles.sequenceNote}>
        <strong>Sequence:</strong> set concrete reminders in Schedule, verify their order in Timeline,
        apply bulk logic in Rules, then subscribe or inspect them in Calendar.
      </div>

      {status ? (
        <div
          aria-live="polite"
          className={statusTone === "error" ? styles.statusError : styles.statusSuccess}
          role="status"
        >
          {status}
        </div>
      ) : null}

      {view === "schedule" ? (
        <section aria-labelledby="schedule-layer-heading" className={styles.layerSurface}>
          <div className={styles.layerHeading}>
            <div>
              <p className={styles.kicker}>01 · Scoped schedule</p>
              <h2 id="schedule-layer-heading">Set the exact reminder plan.</h2>
              <p>Agreement dates stay canonical; the reminder time and channels are personal.</p>
            </div>
            <dl className={styles.metrics}>
              <div>
                <dt>Milestones</dt>
                <dd>{allMilestones.length}</dd>
              </div>
              <div>
                <dt>Active rules</dt>
                <dd>{activeRules.length}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{nextRule ? formatDate(nextRule.remindAt, preferences.timezone) : "None"}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.scheduleGrid}>
            <div className={styles.milestoneStack}>
              {allMilestones.length ? (
                allMilestones.map((milestone) => {
                  const milestoneRules = rules
                    .filter((rule) => rule.milestoneKey === milestone.key)
                    .sort((left, right) => left.offsetMinutes - right.offsetMinutes);
                  return (
                    <article className={styles.milestoneCard} key={milestone.key}>
                      <div className={styles.milestoneHeader}>
                        <div>
                          <span className={styles.sourceLabel}>
                            {milestone.source === "agreement"
                              ? "Deal Receipt milestone"
                              : "Personal checkpoint"}
                          </span>
                          <h3>{milestone.label}</h3>
                        </div>
                        {milestone.source === "agreement" ? (
                          <div className={styles.dueField}>
                            <span>Deal Receipt due time</span>
                            <strong>{formatDate(milestone.dueAt, preferences.timezone)}</strong>
                          </div>
                        ) : (
                          <label className={styles.dueField}>
                            <span>Personal due time</span>
                            <input
                              onChange={(event) =>
                                changeCustomMilestoneDueAt(
                                  milestone.key,
                                  event.currentTarget.value,
                                )
                              }
                              type="datetime-local"
                              value={toLocalInputValue(milestone.dueAt)}
                            />
                          </label>
                        )}
                      </div>

                      <div className={styles.reminderRows}>
                        {milestoneRules.length ? (
                          milestoneRules.map((rule) => (
                            <div className={styles.reminderRow} key={rule.id}>
                              <label className={styles.offsetField}>
                                <span>When</span>
                                <select
                                  onChange={(event) =>
                                    changeOffset(rule, Number(event.currentTarget.value))
                                  }
                                  value={rule.offsetMinutes}
                                >
                                  {OFFSET_OPTIONS.map((option) => (
                                    <option key={option.minutes} value={option.minutes}>
                                      {option.label}
                                    </option>
                                  ))}
                                  {!OFFSET_OPTIONS.some(
                                    (option) => option.minutes === rule.offsetMinutes,
                                  ) ? (
                                    <option value={rule.offsetMinutes}>
                                      {offsetLabel(rule.offsetMinutes)}
                                    </option>
                                  ) : null}
                                </select>
                                <small>
                                  {formatDate(reminderTime(rule), preferences.timezone)}
                                </small>
                              </label>

                              <div aria-label="Delivery channels" className={styles.channelControls}>
                                <label>
                                  <input
                                    checked={rule.inAppEnabled}
                                    onChange={(event) =>
                                      updateRule(rule.id, {
                                        inAppEnabled: event.currentTarget.checked,
                                      })
                                    }
                                    type="checkbox"
                                  />
                                  In-app
                                </label>
                                <label>
                                  <input
                                    checked={rule.emailEnabled}
                                    onChange={(event) =>
                                      updateRule(rule.id, {
                                        emailEnabled: event.currentTarget.checked,
                                      })
                                    }
                                    type="checkbox"
                                  />
                                  Email
                                </label>
                                <label>
                                  <input
                                    checked={rule.calendarEnabled}
                                    onChange={(event) =>
                                      updateRule(rule.id, {
                                        calendarEnabled: event.currentTarget.checked,
                                      })
                                    }
                                    type="checkbox"
                                  />
                                  Calendar
                                </label>
                              </div>

                              <label className={styles.switchLabel}>
                                <input
                                  checked={rule.enabled}
                                  onChange={(event) =>
                                    updateRule(rule.id, { enabled: event.currentTarget.checked })
                                  }
                                  type="checkbox"
                                />
                                <span aria-hidden="true" className={styles.switchTrack} />
                                <span className={styles.srOnly}>Enable reminder</span>
                              </label>

                              <button
                                aria-label={`Remove ${offsetLabel(rule.offsetMinutes)} reminder`}
                                className={styles.iconButton}
                                onClick={() => removeRule(rule.id)}
                                type="button"
                              >
                                ×
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className={styles.emptyInline}>
                            <strong>No reminders for this milestone.</strong>
                            <span>
                              The commitment date remains visible but no notification will be sent.
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        className={styles.inlineAction}
                        onClick={() => addRule(milestone)}
                        type="button"
                      >
                        + Add reminder
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <strong>No dated milestones are recorded.</strong>
                  <p>
                    Add an evidence due date through an agreement amendment, or create a personal
                    checkpoint below. Personal checkpoints do not modify the Deal Receipt.
                  </p>
                </div>
              )}

              <article className={styles.customCheckpoint}>
                <div>
                  <span className={styles.sourceLabel}>Personal checkpoint</span>
                  <h3>Add a date that is not part of the agreement.</h3>
                </div>
                <label>
                  <span>Label</span>
                  <input
                    maxLength={180}
                    onChange={(event) => setCustomLabel(event.currentTarget.value)}
                    placeholder="Prepare evidence package"
                    value={customLabel}
                  />
                </label>
                <label>
                  <span>Due time</span>
                  <input
                    onChange={(event) => setCustomDueAt(event.currentTarget.value)}
                    type="datetime-local"
                    value={customDueAt}
                  />
                </label>
                <button
                  className={styles.secondaryButton}
                  onClick={addCustomMilestone}
                  type="button"
                >
                  Add checkpoint
                </button>
              </article>
            </div>

            <aside className={styles.settingsPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <span className={styles.sourceLabel}>Delivery settings</span>
                  <h3>Personal defaults</h3>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    checked={!preferences.paused}
                    onChange={(event) =>
                      updatePreference("paused", !event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span aria-hidden="true" className={styles.switchTrack} />
                  <span>{preferences.paused ? "Paused" : "Active"}</span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <span>
                  <strong>In-app</strong>
                  <small>Delivered to Moral Trade notifications.</small>
                </span>
                <label className={styles.switchLabel}>
                  <input
                    checked={preferences.inAppEnabled}
                    onChange={(event) =>
                      updatePreference("inAppEnabled", event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span aria-hidden="true" className={styles.switchTrack} />
                  <span className={styles.srOnly}>Enable in-app delivery</span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <span>
                  <strong>Email</strong>
                  <small>Queued without private terms or evidence.</small>
                </span>
                <label className={styles.switchLabel}>
                  <input
                    checked={preferences.emailEnabled}
                    onChange={(event) =>
                      updatePreference("emailEnabled", event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span aria-hidden="true" className={styles.switchTrack} />
                  <span className={styles.srOnly}>Enable email delivery</span>
                </label>
              </div>

              <div className={styles.settingBlock}>
                <label className={styles.checkboxLine}>
                  <input
                    checked={preferences.quietHoursEnabled}
                    onChange={(event) =>
                      updatePreference("quietHoursEnabled", event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  Respect quiet hours
                </label>
                <div className={styles.timeGrid}>
                  <label>
                    <span>From</span>
                    <input
                      disabled={!preferences.quietHoursEnabled}
                      onChange={(event) =>
                        updatePreference("quietHoursStart", event.currentTarget.value)
                      }
                      type="time"
                      value={preferences.quietHoursStart}
                    />
                  </label>
                  <label>
                    <span>Until</span>
                    <input
                      disabled={!preferences.quietHoursEnabled}
                      onChange={(event) =>
                        updatePreference("quietHoursEnd", event.currentTarget.value)
                      }
                      type="time"
                      value={preferences.quietHoursEnd}
                    />
                  </label>
                </div>
              </div>

              <label className={styles.settingBlock}>
                <span>Timezone</span>
                <input
                  list="reminder-timezones"
                  onChange={(event) => updatePreference("timezone", event.currentTarget.value)}
                  value={preferences.timezone}
                />
                <datalist id="reminder-timezones">
                  {TIMEZONE_OPTIONS.map((timezone) => (
                    <option key={timezone} value={timezone} />
                  ))}
                </datalist>
                <small>Use an IANA name, such as Europe/London.</small>
              </label>

              <button
                className={styles.primaryButton}
                disabled={isPending}
                onClick={save}
                type="button"
              >
                {isPending ? "Saving…" : "Save reminder plan"}
              </button>
            </aside>
          </div>
        </section>
      ) : null}

      {view === "timeline" ? (
        <section aria-labelledby="timeline-layer-heading" className={styles.layerSurface}>
          <div className={styles.layerHeading}>
            <div>
              <p className={styles.kicker}>02 · Deadline timeline</p>
              <h2 id="timeline-layer-heading">Audit what will happen next.</h2>
              <p>Every row is calculated from the saved milestone time plus its offset.</p>
            </div>
            <span className={styles.countBadge}>{activeRules.length} active</span>
          </div>

          <div className={styles.timelineGrid}>
            <div className={styles.timeline}>
              {activeRules.length ? (
                activeRules.map((rule) => {
                  const channels = channelLabels(rule, preferences);
                  const past = Date.parse(rule.remindAt) < stableNow;
                  return (
                    <article className={styles.timelineItem} key={rule.id}>
                      <time>
                        {formatDate(rule.remindAt, preferences.timezone, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                      <div className={past ? styles.timelineDotPast : styles.timelineDot} />
                      <div className={styles.timelineCard}>
                        <div>
                          <span className={styles.sourceLabel}>
                            {offsetLabel(rule.offsetMinutes)}
                          </span>
                          <h3>{rule.milestoneLabel}</h3>
                        </div>
                        <p>Milestone due {formatDate(rule.dueAt, preferences.timezone)}.</p>
                        <div className={styles.tagRow}>
                          {channels.length ? (
                            channels.map((channel) => <span key={channel}>{channel}</span>)
                          ) : (
                            <span>No active delivery channel</span>
                          )}
                          {past ? <span>Elapsed</span> : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <strong>No active reminder occurrences.</strong>
                  <p>Return to Schedule or Rules to add one.</p>
                </div>
              )}
            </div>

            <aside className={styles.previewPanel}>
              <span className={styles.sourceLabel}>Next notification</span>
              {nextRule ? (
                <>
                  <h3>{formatDate(nextRule.remindAt, preferences.timezone)}</h3>
                  <div className={styles.notificationPreview}>
                    <span className={styles.previewDot} />
                    <div>
                      <strong>{nextRule.milestoneLabel}</strong>
                      <p>
                        {offsetLabel(nextRule.offsetMinutes)}. Open the private commitment to review
                        the Deal Receipt and evidence rule.
                      </p>
                    </div>
                  </div>
                  <Link
                    className={styles.secondaryButton}
                    href={`/trade-agreements/${agreementId}`}
                  >
                    Open commitment
                  </Link>
                </>
              ) : (
                <p>No future occurrence is currently active.</p>
              )}
              <p className={styles.privacyNote}>
                Email copy excludes participant names, private terms, payment information, and
                evidence.
              </p>
            </aside>
          </div>
        </section>
      ) : null}

      {view === "rules" ? (
        <section aria-labelledby="rules-layer-heading" className={styles.layerSurface}>
          <div className={styles.layerHeading}>
            <div>
              <p className={styles.kicker}>03 · Rule matrix</p>
              <h2 id="rules-layer-heading">Apply a consistent assurance pattern.</h2>
              <p>Checked cells create one rule. Unchecked cells remove it from your personal plan.</p>
            </div>
            <button
              className={styles.secondaryButton}
              onClick={() => setView("schedule")}
              type="button"
            >
              Edit custom offsets
            </button>
          </div>

          <div className={styles.matrixWrap}>
            <table className={styles.ruleMatrix}>
              <thead>
                <tr>
                  <th scope="col">Milestone</th>
                  {OFFSET_OPTIONS.map((option) => (
                    <th key={option.minutes} scope="col">
                      {option.label}
                    </th>
                  ))}
                  <th scope="col">Other</th>
                </tr>
              </thead>
              <tbody>
                {allMilestones.map((milestone) => {
                  const milestoneRules = rules.filter(
                    (rule) => rule.milestoneKey === milestone.key,
                  );
                  const otherCount = milestoneRules.filter(
                    (rule) =>
                      !OFFSET_OPTIONS.some(
                        (option) => option.minutes === rule.offsetMinutes,
                      ),
                  ).length;
                  return (
                    <tr key={milestone.key}>
                      <th scope="row">
                        <strong>{milestone.label}</strong>
                        <small>{formatDate(milestone.dueAt, preferences.timezone)}</small>
                      </th>
                      {OFFSET_OPTIONS.map((option) => {
                        const rule = milestoneRules.find(
                          (candidate) => candidate.offsetMinutes === option.minutes,
                        );
                        return (
                          <td key={option.minutes}>
                            <button
                              aria-label={`${rule ? "Remove" : "Add"} ${option.label} reminder for ${milestone.label}`}
                              aria-pressed={Boolean(rule)}
                              className={rule ? styles.matrixCellActive : styles.matrixCell}
                              onClick={() => toggleMatrixRule(milestone, option.minutes)}
                              type="button"
                            >
                              {rule ? "✓" : "+"}
                            </button>
                          </td>
                        );
                      })}
                      <td>{otherCount || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!allMilestones.length ? (
            <div className={styles.emptyState}>
              <strong>No milestones are available for bulk rules.</strong>
              <p>Add a personal checkpoint in Schedule first.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "calendar" ? (
        <section aria-labelledby="calendar-layer-heading" className={styles.layerSurface}>
          <div className={styles.layerHeading}>
            <div>
              <p className={styles.kicker}>04 · Calendar + drawer</p>
              <h2 id="calendar-layer-heading">See the week, then subscribe once.</h2>
              <p>
                The private feed is read-only. Moral Trade never receives or reads events from your
                calendar account.
              </p>
            </div>
            <span className={styles.countBadge}>{activeRules.length} calendar-ready</span>
          </div>

          <div className={styles.calendarShell}>
            <div className={styles.weekGrid}>
              {calendarDays.map((day) => {
                const key = dateKey(day.toISOString(), preferences.timezone);
                const dayRules = activeRules.filter(
                  (rule) => dateKey(rule.remindAt, preferences.timezone) === key,
                );
                return (
                  <section className={styles.dayColumn} key={key}>
                    <header>
                      <span>
                        {new Intl.DateTimeFormat("en", {
                          weekday: "short",
                          timeZone: preferences.timezone,
                        }).format(day)}
                      </span>
                      <strong>
                        {new Intl.DateTimeFormat("en", {
                          day: "numeric",
                          month: "short",
                          timeZone: preferences.timezone,
                        }).format(day)}
                      </strong>
                    </header>
                    <div>
                      {dayRules.map((rule) => (
                        <button
                          className={
                            selectedRule?.id === rule.id ? styles.eventSelected : styles.event
                          }
                          key={rule.id}
                          onClick={() => setSelectedRuleId(rule.id)}
                          type="button"
                        >
                          <time>
                            {new Intl.DateTimeFormat("en", {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: preferences.timezone,
                            }).format(Date.parse(rule.remindAt))}
                          </time>
                          <span>{rule.milestoneLabel}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <aside className={styles.calendarDrawer}>
              <span className={styles.sourceLabel}>Selected occurrence</span>
              {selectedRule ? (
                <>
                  <h3>{selectedRule.milestoneLabel}</h3>
                  <p>{offsetLabel(selectedRule.offsetMinutes)}</p>
                  <dl>
                    <div>
                      <dt>Reminder</dt>
                      <dd>{formatDate(selectedRule.remindAt, preferences.timezone)}</dd>
                    </div>
                    <div>
                      <dt>Milestone</dt>
                      <dd>{formatDate(selectedRule.dueAt, preferences.timezone)}</dd>
                    </div>
                    <div>
                      <dt>Channels</dt>
                      <dd>{channelLabels(selectedRule, preferences).join(", ") || "None"}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p>Select a calendar occurrence to inspect it.</p>
              )}
            </aside>
          </div>

          <div className={styles.integrationPanel}>
            <div className={styles.integrationIntro}>
              <span className={styles.sourceLabel}>External calendar integration</span>
              <h3>One private URL for Apple, Google, and Microsoft.</h3>
              <p>
                Subscribe rather than import. Future saved changes update in the calendar provider
                without granting Moral Trade access to the rest of your calendar.
              </p>
            </div>

            {calendarFeed?.enabled && feedUrl ? (
              <div className={styles.integrationControls}>
                <div className={styles.providerGrid}>
                  <a className={styles.providerButton} href={webcalUrl}>
                    <CalendarMark provider="apple" />
                    <span>
                      <strong>Apple Calendar</strong>
                      <small>Subscribe directly</small>
                    </span>
                    <ArrowIcon />
                  </a>
                  <a
                    className={styles.providerButton}
                    href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <CalendarMark provider="google" />
                    <span>
                      <strong>Google Calendar</strong>
                      <small>Open “From URL,” then paste</small>
                    </span>
                    <ArrowIcon />
                  </a>
                  <a
                    className={styles.providerButton}
                    href="https://outlook.live.com/calendar/0/addcalendar"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <CalendarMark provider="microsoft" />
                    <span>
                      <strong>Microsoft Outlook</strong>
                      <small>Open “Subscribe from web”</small>
                    </span>
                    <ArrowIcon />
                  </a>
                </div>

                <label className={styles.privateUrlField}>
                  <span>Private subscription URL</span>
                  <div>
                    <input readOnly value={feedUrl} />
                    <button onClick={copyFeedUrl} type="button">
                      Copy
                    </button>
                  </div>
                </label>

                <label className={styles.checkboxLine}>
                  <input
                    checked={calendarFeed.includeCommitmentTitle}
                    disabled={isPending}
                    onChange={(event) =>
                      setCalendarFeedEnabled(true, event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  Include commitment titles in calendar event names
                </label>

                <div className={styles.integrationActions}>
                  <button
                    className={styles.secondaryButton}
                    disabled={isPending}
                    onClick={rotateCalendarFeed}
                    type="button"
                  >
                    Rotate private URL
                  </button>
                  <button
                    className={styles.dangerButton}
                    disabled={isPending}
                    onClick={() => setCalendarFeedEnabled(false)}
                    type="button"
                  >
                    Disable subscription
                  </button>
                </div>
                <p className={styles.privacyNote}>
                  Treat this URL like a password. Rotating it immediately stops the old feed from
                  receiving updates.
                </p>
              </div>
            ) : (
              <div className={styles.integrationEnable}>
                <p>
                  Calendar access is off. Enabling it creates a revocable, read-only subscription URL
                  containing only reminder labels, times, and links back to Moral Trade.
                </p>
                <button
                  className={styles.primaryButton}
                  disabled={isPending}
                  onClick={() => setCalendarFeedEnabled(true)}
                  type="button"
                >
                  {isPending ? "Enabling…" : "Enable calendar subscription"}
                </button>
                {!hasSavedPreferences ? (
                  <p className={styles.privacyNote}>
                    Save the reminder plan before enabling the subscription.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
