"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeFlowIcon } from "@/components/core-trade/trade-flow-icons";
import { consumeCommandCenterHandoff } from "@/lib/command-center-handoff";
import { deriveCommitmentLimit } from "@/lib/trade-draft-standards";

import styles from "./trade-draft-workbench.module.css";

export interface TradeDraftValues {
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  duration: string;
  startDate: string;
  evidenceDueDate: string;
  evidenceRule: string;
  maximumBurden: string;
  privacyScope: string;
  exitConditions: string;
  notes: string;
  voluntaryCertification: boolean;
}

export interface TradeDraftSourceContext {
  mode: "counteroffer";
  counterpartyName: string;
  sourceUrl: string;
  sourceOpportunityId: string;
  exposureRequestId: string;
  sourceRevision: number;
  matchContextStorageKey: string;
  duplicateDraftCount: number;
  sourceSnapshot: {
    offeredCause: string;
    requestedCause: string;
    offerAction: string;
    requestAction: string;
    verification: string;
    duration: string;
  };
}

type ImportedReviewKey =
  | "counterparty"
  | "offered_cause"
  | "requested_cause"
  | "proposed_action"
  | "requested_action"
  | "duration"
  | "evidence_rule";

interface TransientFeedMatchContext {
  actionFitLabel: string;
  matchPercent: number | null;
  ownerAlias: string;
  reason: string;
  reasonDetails: string[];
}

interface TradeDraftWorkbenchProps {
  acceptCommandHandoff?: boolean;
  formMessage?: { text: string; tone: "error" | "success" } | null;
  initialValues?: Partial<TradeDraftValues>;
  saveAction: (formData: FormData) => void | Promise<void>;
  submissionKey: string;
  sourceContext?: TradeDraftSourceContext | null;
  templateLabel?: string | null;
}

const DEFAULT_VALUES: TradeDraftValues = {
  offeredCause: "",
  requestedCause: "",
  proposedAction: "",
  requestedAction: "",
  noTradeBaseline: "",
  duration: "",
  startDate: "",
  evidenceDueDate: "",
  evidenceRule: "",
  maximumBurden: "",
  privacyScope: "Original evidence, identities, payment details, and exact timestamps stay private. Only safe outcome metadata may be published: action category, lifecycle status, confidence band, completion fraction, payout percentage, and calendar date.",
  exitConditions: "",
  notes: "",
  voluntaryCertification: false,
};

const STEP_LABELS = [
  "Priorities",
  "Your commitment",
  "Their commitment",
  "Baseline",
  "Bounds",
  "Evidence",
  "Review",
] as const;

const IMPORTED_REVIEW_LABELS: ReadonlyArray<{
  key: ImportedReviewKey;
  label: string;
}> = [
  { key: "counterparty", label: "Counterparty" },
  { key: "offered_cause", label: "Priority you advance" },
  { key: "requested_cause", label: "Priority you want advanced" },
  { key: "proposed_action", label: "Your commitment" },
  { key: "requested_action", label: "Counterparty commitment" },
  { key: "duration", label: "Duration" },
  { key: "evidence_rule", label: "Evidence requirements" },
];

const VALUE_REVIEW_KEY: Partial<Record<keyof TradeDraftValues, ImportedReviewKey>> = {
  offeredCause: "offered_cause",
  requestedCause: "requested_cause",
  proposedAction: "proposed_action",
  requestedAction: "requested_action",
  duration: "duration",
  evidenceRule: "evidence_rule",
};

const DATE_SNAPSHOT_SUBSCRIBE = () => () => {};

type CommandHandoffState = "loading" | "loaded" | "unavailable" | null;

function localDateSnapshot() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function localTimeZoneSnapshot() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
}

function serverDateSnapshot() {
  return "";
}

function concise(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 88 ? `${normalized.slice(0, 85)}…` : normalized;
}

function hasUnresolvedTemplatePrompt(value: string) {
  return value.includes("[Replace:");
}

function validateStep(step: number, values: TradeDraftValues, localToday = "") {
  if (localToday && values.startDate && values.startDate < localToday) {
    return "Choose a start date that has not passed.";
  }
  if (localToday && values.evidenceDueDate && values.evidenceDueDate < localToday) {
    return "Choose an evidence due date that has not passed.";
  }
  if (
    values.startDate &&
    values.evidenceDueDate &&
    values.evidenceDueDate < values.startDate
  ) {
    return "Evidence cannot be due before the commitment starts.";
  }
  if (step === 0 && (!values.offeredCause.trim() || !values.requestedCause.trim())) {
    return "Name both priorities before continuing.";
  }
  if (step === 1 && !values.proposedAction.trim()) {
    return "State the concrete action you are willing to take.";
  }
  if (step === 2 && !values.requestedAction.trim()) {
    return "State the concrete action requested from the other participant.";
  }
  if (step === 3 && !values.noTradeBaseline.trim()) {
    return "Describe what both sides would actually do without this trade.";
  }
  if (step === 4 && (!values.duration.trim() || !values.maximumBurden.trim())) {
    return "Add the duration and commitment limit before continuing.";
  }
  if (step === 5 && (!values.evidenceRule.trim() || !values.privacyScope.trim())) {
    return "Add the evidence and privacy scope before continuing.";
  }
  if (step === 6 && !values.exitConditions.trim()) {
    return "State how future obligations can end before saving the record.";
  }

  const valuesForStep: readonly string[] =
    step === 0
      ? [values.offeredCause, values.requestedCause]
      : step === 1
        ? [values.proposedAction]
        : step === 2
          ? [values.requestedAction]
          : step === 3
            ? [values.noTradeBaseline]
            : step === 4
              ? [values.duration, values.maximumBurden]
              : step === 5
                ? [values.evidenceRule, values.privacyScope]
                : [values.exitConditions];
  if (valuesForStep.some(hasUnresolvedTemplatePrompt)) {
    return "Replace every [Replace: ...] template prompt with terms that are true for this trade.";
  }
  return null;
}

export function TradeDraftWorkbench({
  acceptCommandHandoff = false,
  formMessage,
  initialValues,
  saveAction,
  submissionKey,
  sourceContext = null,
  templateLabel,
}: TradeDraftWorkbenchProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<TradeDraftValues>(() => {
    const seededValues = {
      ...DEFAULT_VALUES,
      ...initialValues,
    };
    if (!seededValues.maximumBurden) {
      seededValues.maximumBurden = deriveCommitmentLimit(seededValues);
    }
    return seededValues;
  });
  const [usesCustomCommitmentLimit, setUsesCustomCommitmentLimit] = useState(
    () => {
      const initialLimit = initialValues?.maximumBurden?.trim() ?? "";
      const generatedLimit = deriveCommitmentLimit({
        ...DEFAULT_VALUES,
        ...initialValues,
      });
      return Boolean(initialLimit && initialLimit !== generatedLimit);
    },
  );
  const [isCommitmentLimitEditorOpen, setIsCommitmentLimitEditorOpen] =
    useState(false);
  const [commandHandoffState, setCommandHandoffState] =
    useState<CommandHandoffState>(acceptCommandHandoff ? "loading" : null);
  const [importedReviews, setImportedReviews] = useState<Record<ImportedReviewKey, boolean>>(
    () =>
      Object.fromEntries(
        IMPORTED_REVIEW_LABELS.map(({ key }) => [key, false]),
      ) as Record<ImportedReviewKey, boolean>,
  );
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [transientMatchContext, setTransientMatchContext] =
    useState<TransientFeedMatchContext | null>(null);
  const commandHandoff = useRef<
    ReturnType<typeof consumeCommandCenterHandoff> | undefined
  >(undefined);

  useEffect(() => {
    if (!sourceContext?.matchContextStorageKey) return;
    try {
      const raw = window.sessionStorage.getItem(sourceContext.matchContextStorageKey);
      window.sessionStorage.removeItem(sourceContext.matchContextStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const createdAt = Number(parsed.createdAt);
      if (!Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000) return;
      const reasonDetails = Array.isArray(parsed.reasonDetails)
        ? parsed.reasonDetails
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 240))
            .filter(Boolean)
            .slice(0, 6)
        : [];
      const rawPercent = Number(parsed.matchPercent);
      const timeoutId = window.setTimeout(() => {
        setTransientMatchContext({
          actionFitLabel:
            typeof parsed.actionFitLabel === "string"
              ? parsed.actionFitLabel.trim().slice(0, 40)
              : "",
          matchPercent: Number.isFinite(rawPercent)
            ? Math.max(0, Math.min(100, Math.round(rawPercent)))
            : null,
          ownerAlias:
            typeof parsed.ownerAlias === "string"
              ? parsed.ownerAlias.trim().slice(0, 100)
              : "",
          reason:
            typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 240) : "",
          reasonDetails,
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    } catch {
      // Match context is intentionally optional and session-only.
    }
  }, [sourceContext?.matchContextStorageKey]);

  useEffect(() => {
    if (!acceptCommandHandoff) return;

    if (commandHandoff.current === undefined) {
      try {
        commandHandoff.current = consumeCommandCenterHandoff(window.sessionStorage);
      } catch {
        commandHandoff.current = null;
      }
    }

    const restoredHandoff = commandHandoff.current;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!restoredHandoff) {
        setCommandHandoffState("unavailable");
        return;
      }

      setValues((current) => {
        const next: TradeDraftValues = { ...current, ...restoredHandoff.values };
        next.maximumBurden = deriveCommitmentLimit(next);
        return next;
      });
      setUsesCustomCommitmentLimit(false);
      setIsCommitmentLimitEditorOpen(false);
      setError(null);
      setStep(0);
      setCommandHandoffState("loaded");
    });

    return () => {
      cancelled = true;
    };
  }, [acceptCommandHandoff]);

  const localToday = useSyncExternalStore(
    DATE_SNAPSHOT_SUBSCRIBE,
    localDateSnapshot,
    serverDateSnapshot,
  );
  const localTimeZone = useSyncExternalStore(
    DATE_SNAPSHOT_SUBSCRIBE,
    localTimeZoneSnapshot,
    serverDateSnapshot,
  );
  const evidenceMinimumDate =
    values.startDate && values.startDate > localToday ? values.startDate : localToday;

  const termsComplete = STEP_LABELS.every(
    (_label, index) => validateStep(index, values, localToday) === null,
  );
  const importedReviewsComplete =
    !sourceContext || IMPORTED_REVIEW_LABELS.every(({ key }) => importedReviews[key]);
  const duplicateDecisionComplete =
    !sourceContext || sourceContext.duplicateDraftCount === 0 || duplicateAcknowledged;
  const finalTermsComplete =
    termsComplete && importedReviewsComplete && duplicateDecisionComplete;

  function update<K extends keyof TradeDraftValues>(key: K, value: TradeDraftValues[K]) {
    setValues((current) => {
      const next: TradeDraftValues = { ...current, [key]: value };
      if (
        !usesCustomCommitmentLimit &&
        (key === "proposedAction" || key === "requestedAction" || key === "duration")
      ) {
        next.maximumBurden = deriveCommitmentLimit(next);
      }
      return next;
    });
    const importedKey = VALUE_REVIEW_KEY[key];
    if (sourceContext && importedKey) {
      setImportedReviews((current) => ({ ...current, [importedKey]: false }));
    }
    setError(null);
  }

  function importedLabel(label: string, key: ImportedReviewKey) {
    return (
      <span className={styles.fieldLabelLine} data-imported-field={key}>
        <span>{label}</span>
        {sourceContext ? <span className={styles.sourceBadge}>From source</span> : null}
      </span>
    );
  }

  function nextStep() {
    const validationError = validateStep(step, values, localToday);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(STEP_LABELS.length - 1, current + 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  const prioritySummary = `${concise(values.offeredCause, "Your priority")} ↔ ${concise(
    values.requestedCause,
    "Their priority",
  )}`;

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <form action={saveAction} className={styles.shell}>
        <input name="submission_key" type="hidden" value={submissionKey} />
        <input name="client_local_date" type="hidden" value={localToday} />
        <input name="client_time_zone" type="hidden" value={localTimeZone} />
        <input name="offered_cause" type="hidden" value={values.offeredCause} />
        <input name="requested_cause" type="hidden" value={values.requestedCause} />
        <input name="proposed_action" type="hidden" value={values.proposedAction} />
        <input name="requested_action" type="hidden" value={values.requestedAction} />
        <input name="no_trade_baseline" type="hidden" value={values.noTradeBaseline} />
        <input name="duration" type="hidden" value={values.duration} />
        <input name="start_date" type="hidden" value={values.startDate} />
        <input name="evidence_due_date" type="hidden" value={values.evidenceDueDate} />
        <input name="evidence_rule" type="hidden" value={values.evidenceRule} />
        <input name="maximum_burden" type="hidden" value={values.maximumBurden} />
        <input name="privacy_scope" type="hidden" value={values.privacyScope} />
        <input name="exit_conditions" type="hidden" value={values.exitConditions} />
        <input name="notes" type="hidden" value={values.notes} />
        {sourceContext ? (
          <>
            <input name="source_opportunity_type" type="hidden" value="offer" />
            <input
              name="source_opportunity_id"
              type="hidden"
              value={sourceContext.sourceOpportunityId}
            />
            <input
              name="exposure_request_id"
              type="hidden"
              value={sourceContext.exposureRequestId}
            />
            <input
              name="source_terms_version"
              type="hidden"
              value={sourceContext.sourceRevision}
            />
            {IMPORTED_REVIEW_LABELS.map(({ key }) =>
              importedReviews[key] ? (
                <input key={key} name={`review_${key}`} type="hidden" value="true" />
              ) : null,
            )}
            {duplicateAcknowledged ? (
              <input name="duplicate_acknowledged" type="hidden" value="true" />
            ) : null}
          </>
        ) : null}
        {values.voluntaryCertification ? (
          <input name="voluntary_certification" type="hidden" value="on" />
        ) : null}

        <header className={styles.top}>
          <Link aria-label="Moral Trade, home" className={styles.brandLink} href="/">
            <MoralTradeWordmark />
          </Link>
          <div aria-label="Draft progress" className={styles.progress}>
            {STEP_LABELS.map((label, index) => (
              <i
                aria-label={label}
                className={`${styles.progressBar} ${index <= step ? styles.progressBarActive : ""}`}
                key={label}
              />
            ))}
          </div>
          <div className={styles.stepCount}>
            Step {step + 1} / {STEP_LABELS.length} · Build
          </div>
        </header>

        <div>
          {sourceContext ? (
            <section className={styles.sourceContext} aria-label="Feed source context">
              <div className={styles.sourceContextHead}>
                <div>
                  <span className={styles.kicker}>Counteroffer source</span>
                  <h2>Based on {sourceContext.counterpartyName}&apos;s open offer</h2>
                </div>
                <Link className={styles.inlineButton} href={sourceContext.sourceUrl}>
                  View original
                </Link>
              </div>
              <p>
                The original participant is preselected as the counterparty. Nothing has been
                sent, and this Phase-1 draft cannot be published, invited, messaged, or converted
                into an agreement. A true counteroffer remains linked to its exact source revision.
              </p>
              <dl className={styles.sourceTerms}>
                <div>
                  <dt>They offered</dt>
                  <dd>{sourceContext.sourceSnapshot.offerAction}</dd>
                </div>
                <div>
                  <dt>They requested</dt>
                  <dd>{sourceContext.sourceSnapshot.requestAction}</dd>
                </div>
                <div>
                  <dt>Source revision</dt>
                  <dd>{sourceContext.sourceRevision}</dd>
                </div>
              </dl>
              <div className={styles.matchContext}>
                <strong>Why it appeared in your Feed</strong>
                {transientMatchContext ? (
                  <>
                    <p>
                      {transientMatchContext.matchPercent !== null
                        ? `${transientMatchContext.matchPercent}% match · `
                        : ""}
                      {transientMatchContext.actionFitLabel || transientMatchContext.reason || "Feed match"}
                    </p>
                    {transientMatchContext.reasonDetails.length ? (
                      <ul>
                        {transientMatchContext.reasonDetails.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : transientMatchContext.reason ? (
                      <p>{transientMatchContext.reason}</p>
                    ) : null}
                  </>
                ) : (
                  <p>
                    This source was verified against your authenticated exposure receipt. Match
                    scores and explanations are session-only and are not stored with the draft.
                  </p>
                )}
              </div>
              {sourceContext.duplicateDraftCount > 0 ? (
                <div className={`${styles.message} ${styles.messageError}`} role="status">
                  You already have {sourceContext.duplicateDraftCount} active draft
                  {sourceContext.duplicateDraftCount === 1 ? "" : "s"} based on this source.
                  You may create another only after explicitly acknowledging the duplicate below.
                </div>
              ) : null}
            </section>
          ) : null}
          {formMessage ? (
            <div
              className={`${styles.message} ${
                formMessage.tone === "error" ? styles.messageError : styles.messageSuccess
              }`}
              role="status"
            >
              {formMessage.text}
            </div>
          ) : commandHandoffState === "loading" ? (
            <div className={`${styles.message} ${styles.messageSuccess}`} role="status">
              Loading your command into the editor…
            </div>
          ) : commandHandoffState === "loaded" ? (
            <div className={`${styles.message} ${styles.messageSuccess}`} role="status">
              Command loaded into the editable terms below. Review the no-trade baseline and add any missing dates and evidence before saving. No draft has been saved yet.
            </div>
          ) : commandHandoffState === "unavailable" ? (
            <div className={`${styles.message} ${styles.messageError}`} role="alert">
              The command could not be restored. Enter the terms below. No draft was created.
            </div>
          ) : templateLabel ? (
            <div className={`${styles.message} ${styles.messageSuccess}`} role="status">
              {templateLabel} loaded as an editable starting point. Review every field before saving or submitting.
            </div>
          ) : null}
        </div>

        <section className={styles.main} aria-label="Trade proposal builder">
          <div />
          <div className={styles.deck}>
            <div className={`${styles.ghostCard} ${styles.ghostTwo}`} />
            <div className={`${styles.ghostCard} ${styles.ghostOne}`} />
            <article className={`${styles.card} ${styles.cardEnter}`} key={step}>
              <div className={styles.cardHead}>
                <span className={styles.kicker}>{STEP_LABELS[step]}</span>
                <span className={styles.stepBadge}>{step + 1}</span>
              </div>

              {step === 0 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What priorities are being exchanged?</h1>
                    <p>Name the value you advance and the value you want the other participant to advance.</p>
                  </div>
                  <div className={`${styles.fields} ${styles.fieldGrid}`}>
                    <label className={styles.field}>
                      {importedLabel("Priority you advance", "offered_cause")}
                      <input
                        autoComplete="off"
                        autoFocus
                        className={styles.input}
                        data-mt-autocomplete="priorities"
                        maxLength={180}
                        onChange={(event) => update("offeredCause", event.target.value)}
                        placeholder="For example: global poverty reduction"
                        value={values.offeredCause}
                      />
                      <span className={styles.autocompleteHint}>
                        Suggestions appear as you type.
                      </span>
                    </label>
                    <label className={styles.field}>
                      {importedLabel("Priority you want advanced", "requested_cause")}
                      <input
                        autoComplete="off"
                        className={styles.input}
                        data-mt-autocomplete="priorities"
                        maxLength={180}
                        onChange={(event) => update("requestedCause", event.target.value)}
                        placeholder="For example: animal welfare"
                        value={values.requestedCause}
                      />
                      <span className={styles.autocompleteHint}>
                        Try “Animal” to see related priorities.
                      </span>
                    </label>
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What will you do?</h1>
                    <p>Use a bounded action another person can understand and later verify.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      {importedLabel("Your commitment", "proposed_action")}
                      <textarea
                        autoComplete="off"
                        autoFocus
                        className={`${styles.textarea} ${styles.commitmentInput}`}
                        data-mt-autocomplete="commitments"
                        maxLength={5000}
                        onChange={(event) => update("proposedAction", event.target.value)}
                        placeholder="A concrete action, amount, service, or behavior you are willing to undertake"
                        value={values.proposedAction}
                      />
                      <span className={styles.autocompleteHint}>
                        Standardized commitments appear as you type. Website mentions become links below.
                      </span>
                    </label>
                    <span className={styles.helper}>
                      Avoid open-ended promises. State quantity, scope, or frequency where possible.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What will the other participant do?</h1>
                    <p>This becomes the reciprocal commitment in the frozen agreement version.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      {importedLabel("Counterparty commitment", "requested_action")}
                      <textarea
                        autoComplete="off"
                        autoFocus
                        className={`${styles.textarea} ${styles.commitmentInput}`}
                        data-mt-autocomplete="commitments"
                        maxLength={5000}
                        onChange={(event) => update("requestedAction", event.target.value)}
                        placeholder="A concrete reciprocal action"
                        value={values.requestedAction}
                      />
                      <span className={styles.autocompleteHint}>
                        Standardized commitments appear as you type. Website mentions become links below.
                      </span>
                    </label>
                    <span className={styles.helper}>
                      The other participant will review this exact text before confirming anything.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What happens without the trade?</h1>
                    <p>Record the real status quo so the proposal does not reward a manufactured worse baseline.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>No-trade baseline</span>
                      <textarea
                        autoComplete="off"
                        autoFocus
                        className={`${styles.textarea} ${styles.baselineInput}`}
                        data-mt-autocomplete="baselines"
                        maxLength={5000}
                        onChange={(event) => update("noTradeBaseline", event.target.value)}
                        placeholder="What each side would actually do if no agreement forms"
                        value={values.noTradeBaseline}
                      />
                      <span className={styles.autocompleteHint}>
                        Standardized no-trade baselines appear as you type.
                      </span>
                    </label>
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>When does this trade happen?</h1>
                    <p>Set the duration and dates. The commitment limit is generated from the commitments you already entered.</p>
                  </div>
                  <div className={styles.fields}>
                    <div className={`${styles.fieldGrid} ${styles.fieldGridThree}`}>
                      <label className={styles.field}>
                        {importedLabel("Duration", "duration")}
                        <input
                          autoComplete="off"
                          autoFocus
                          className={styles.input}
                          data-mt-autocomplete="durations"
                          onChange={(event) => update("duration", event.target.value)}
                          placeholder="For example: 12 months"
                          value={values.duration}
                        />
                        <span className={styles.autocompleteHint}>
                          Suggested durations appear as you type.
                        </span>
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Start date</span>
                        <input
                          className={styles.input}
                          min={localToday || undefined}
                          onChange={(event) => update("startDate", event.target.value)}
                          type="date"
                          value={values.startDate}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Evidence due</span>
                        <input
                          className={styles.input}
                          min={evidenceMinimumDate || undefined}
                          onChange={(event) => update("evidenceDueDate", event.target.value)}
                          type="date"
                          value={values.evidenceDueDate}
                        />
                      </label>
                    </div>
                    <div className={styles.limitCard}>
                      <div>
                        <span className={styles.fieldLabel}>Commitment limit</span>
                        <p>
                          {values.maximumBurden ||
                            "Complete both commitments and the duration to generate this limit."}
                        </p>
                      </div>
                      {isCommitmentLimitEditorOpen ? (
                        <>
                          <label className={styles.field}>
                            <span className={styles.fieldLabel}>Stricter commitment limit</span>
                            <textarea
                              autoComplete="off"
                              className={styles.textarea}
                              maxLength={5000}
                              onChange={(event) => update("maximumBurden", event.target.value)}
                              placeholder="Add only a stricter cap, safety boundary, or excluded exposure"
                              value={values.maximumBurden}
                            />
                          </label>
                          <button
                            className={styles.inlineButton}
                            onClick={() => {
                              setUsesCustomCommitmentLimit(false);
                              setIsCommitmentLimitEditorOpen(false);
                              update("maximumBurden", deriveCommitmentLimit(values));
                            }}
                            type="button"
                          >
                            Use the generated limit
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.inlineButton}
                          disabled={!values.maximumBurden}
                          onClick={() => {
                            setUsesCustomCommitmentLimit(true);
                            setIsCommitmentLimitEditorOpen(true);
                          }}
                          type="button"
                        >
                          {usesCustomCommitmentLimit
                            ? "Edit commitment limit"
                            : "Set a stricter limit"}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 5 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>What evidence will show completion?</h1>
                    <p>Choose a standardized evidence type or describe another clear record. Original evidence stays private to participants and assigned reviewers.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      {importedLabel("Evidence", "evidence_rule")}
                      <textarea
                        autoComplete="off"
                        autoFocus
                        className={styles.textarea}
                        data-mt-autocomplete="evidence"
                        maxLength={5000}
                        onChange={(event) => update("evidenceRule", event.target.value)}
                        placeholder="Receipt, external record, log, or participant attestation that will count"
                        value={values.evidenceRule}
                      />
                      <span className={styles.autocompleteHint}>
                        Standardized evidence types appear as you type. Website mentions become links below.
                      </span>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Evidence privacy and public metadata</span>
                      <textarea
                        autoComplete="off"
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("privacyScope", event.target.value)}
                        value={values.privacyScope}
                      />
                    </label>
                    <span className={styles.helper}>
                      Submit only what the reviewer needs. Public outcome metadata never includes identities, the amount, provider, receipt, exact timestamps, links, or files.
                    </span>
                  </div>
                </>
              ) : null}

              {step === 6 ? (
                <>
                  <div className={styles.prompt}>
                    <h1>Review the complete record.</h1>
                    <p>A saved draft is private. Submission starts operator review; neither action confirms an agreement.</p>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Exit conditions</span>
                      <textarea
                        autoComplete="off"
                        autoFocus
                        className={styles.textarea}
                        data-mt-autocomplete="exits"
                        maxLength={5000}
                        onChange={(event) => update("exitConditions", event.target.value)}
                        placeholder="How either side can end future obligations"
                        value={values.exitConditions}
                      />
                      <span className={styles.autocompleteHint}>
                        Standardized exit conditions appear as you type.
                      </span>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Context or constraints (optional)</span>
                      <textarea
                        autoComplete="off"
                        className={styles.textarea}
                        maxLength={5000}
                        onChange={(event) => update("notes", event.target.value)}
                        placeholder="Context that helps a counterparty evaluate the proposal"
                        value={values.notes}
                      />
                    </label>
                  </div>

                  <dl className={styles.receipt}>
                    <div className={styles.receiptRow}>
                      <dt>Priorities</dt>
                      <dd>{prioritySummary}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>You commit</dt>
                      <dd>{concise(values.proposedAction, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>They commit</dt>
                      <dd>{concise(values.requestedAction, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Without trade</dt>
                      <dd>{concise(values.noTradeBaseline, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Evidence</dt>
                      <dd>{concise(values.evidenceRule, "Not stated")}</dd>
                    </div>
                    <div className={styles.receiptRow}>
                      <dt>Evidence visibility</dt>
                      <dd>{concise(values.privacyScope, "Originals private")}</dd>
                    </div>
                  </dl>

                  {sourceContext ? (
                    <section className={styles.importReview} aria-labelledby="import-review-heading">
                      <div>
                        <span className={styles.kicker}>Imported-field review</span>
                        <h2 id="import-review-heading">Confirm each material field separately.</h2>
                        <p>
                          Editing an imported field clears its confirmation. These confirmations
                          are stored; the Feed match score and reasons are not.
                        </p>
                      </div>
                      <div className={styles.importReviewGrid}>
                        {IMPORTED_REVIEW_LABELS.map(({ key, label }) => (
                          <label className={styles.importReviewItem} key={key}>
                            <input
                              checked={importedReviews[key]}
                              onChange={(event) =>
                                setImportedReviews((current) => ({
                                  ...current,
                                  [key]: event.target.checked,
                                }))
                              }
                              type="checkbox"
                            />
                            <span>
                              <strong>{label}</strong>
                              <small>
                                {key === "counterparty"
                                  ? sourceContext.counterpartyName
                                  : "Reviewed against the original source"}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                      {sourceContext.duplicateDraftCount > 0 ? (
                        <label className={`${styles.importReviewItem} ${styles.duplicateReview}`}>
                          <input
                            checked={duplicateAcknowledged}
                            onChange={(event) => setDuplicateAcknowledged(event.target.checked)}
                            type="checkbox"
                          />
                          <span>
                            <strong>Create another draft from this source</strong>
                            <small>
                              I understand that {sourceContext.duplicateDraftCount} active draft
                              {sourceContext.duplicateDraftCount === 1 ? " already exists" : "s already exist"}.
                            </small>
                          </span>
                        </label>
                      ) : null}
                    </section>
                  ) : null}

                  <label className={styles.certification}>
                    <input
                      className={styles.checkbox}
                      checked={values.voluntaryCertification}
                      onChange={(event) => update("voluntaryCertification", event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      This proposal is voluntary. It does not threaten harm, retaliation, or a worse baseline if the other person declines.
                    </span>
                  </label>

                  <div className={styles.safetyList}>
                    <div className={styles.safetyItem}>
                      <strong>No payment or custody</strong>
                      <span>This route records non-financial commitments. Moral Trade does not hold or release funds here.</span>
                    </div>
                    <div className={styles.safetyItem}>
                      <strong>Private evidence originals</strong>
                      <span>Only safe outcome metadata is public. Files, links, identities, payment details, and exact timestamps remain private.</span>
                    </div>
                    <div className={styles.safetyItem}>
                      <strong>Separate confirmation</strong>
                      <span>After review and a counterparty response, both people confirm one frozen version independently.</span>
                    </div>
                  </div>
                </>
              ) : null}

              {error ? <div className={styles.error} role="alert">{error}</div> : null}

              <div className={styles.summary}>
                <span className={styles.kicker}>Draft summary</span>
                <span className={styles.summaryValue}>
                  <strong>{concise(values.proposedAction, "Your commitment")}</strong>
                  {" ↔ "}
                  {concise(values.requestedAction, "Their commitment")}
                </span>
              </div>
            </article>
          </div>

          <aside className={styles.guardrailRail} aria-label="Trade safeguards">
            <div className={styles.guardrail}>
              <TradeFlowIcon name="shield" />
              Voluntary baseline required
            </div>
            <div className={styles.guardrail}>
              <TradeFlowIcon name="evidence" />
              Private evidence scope specified
            </div>
            <div className={styles.guardrail}>
              <TradeFlowIcon name="lock" />
              Same frozen terms for both people
            </div>
          </aside>
        </section>

        <footer className={styles.controls}>
          <button
            className={`${styles.button} ${styles.buttonBack}`}
            disabled={step === 0}
            onClick={previousStep}
            type="button"
          >
            Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={nextStep}
              type="button"
            >
              Next
              <TradeFlowIcon name="arrow" />
            </button>
          ) : (
            <>
              <span className={styles.footerNote}>
                {sourceContext
                  ? importedReviewsComplete && duplicateDecisionComplete
                    ? "Save a private source-bound counteroffer, or submit it for operator review. It will not be delivered in Phase 1."
                    : "Review every imported field and resolve the duplicate warning before saving."
                  : "Save privately, or certify voluntariness before submitting once for operator review."}
              </span>
              <PendingSubmitButton
                className={`${styles.button} ${styles.buttonDark}`}
                disabled={!finalTermsComplete}
                name="intent"
                pendingLabel="Saving private draft..."
                value="draft"
              >
                Save private draft
              </PendingSubmitButton>
              <PendingSubmitButton
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={!finalTermsComplete || !values.voluntaryCertification}
                name="intent"
                pendingLabel="Submitting for review..."
                value="submit"
              >
                Submit for review
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </>
          )}
        </footer>
      </form>
    </main>
  );
}

export function TradeDraftSignInGate({ returnTo = "/trades/new" }: { returnTo?: string }) {
  const encodedReturnTo = encodeURIComponent(returnTo);

  return (
    <main className={`${styles.page} ${styles.gate}`} id="main-content" tabIndex={-1}>
      <header className={styles.gateHeader}>
        <Link aria-label="Moral Trade, home" className={styles.brandLink} href="/">
          <MoralTradeWordmark />
        </Link>
        <Link className={`${styles.button} ${styles.buttonBack}`} href="/discover">
          Exit
        </Link>
      </header>
      <div className={styles.gateMain}>
        <article className={styles.gateCard}>
          <span className={styles.kicker}>Private draft</span>
          <h1>Sign in to build a trade.</h1>
          <p>
            The card stack saves real proposal terms to your account. Nothing is public or binding until review, invitation, and separate bilateral confirmation.
          </p>
          <div className={styles.gateActions}>
            <Link className={`${styles.button} ${styles.buttonPrimary}`} href={`/signup?returnTo=${encodedReturnTo}`}>
              Create account
            </Link>
            <Link className={`${styles.button} ${styles.buttonDark}`} href={`/login?returnTo=${encodedReturnTo}`}>
              Sign in
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
