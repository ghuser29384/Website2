"use client";

import { useMemo, useState } from "react";

import {
  COMMON_GROUND_POOL_MAX_PARTICIPANTS,
  blockerLabel,
  buildBalancedCommonGroundPoolDraft,
  evaluateCommonGroundPoolDraft,
  formatCommonGroundPoolProposalTerms,
  formatUsd,
  parseUsdInputToCents,
} from "@/lib/mpgf/common-ground-pool";
import styles from "./common-ground-pool.module.css";

type SplitMode = "balanced" | "manual";

interface ParticipantEditor {
  id: string;
  name: string;
  defaultProject: string;
  budgetInput: string;
  sharedValuePercentInput: string;
  manualContributionInput: string;
}

const WORKED_EXAMPLE_PARTICIPANTS: ParticipantEditor[] = [
  {
    id: "animal-welfare",
    name: "Animal-welfare funder",
    defaultProject: "Animal-welfare project",
    budgetInput: "10000.00",
    sharedValuePercentInput: "60",
    manualContributionInput: "5000.00",
  },
  {
    id: "long-run-future",
    name: "Long-term-future funder",
    defaultProject: "Long-term-future project",
    budgetInput: "10000.00",
    sharedValuePercentInput: "60",
    manualContributionInput: "5000.00",
  },
];

function parsePercentInputToBasisPoints(value: string) {
  const trimmed = value.trim().replace("%", "");
  if (!/^\d{0,3}(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    return 0;
  }
  return Math.min(50_000, Math.round(Number(trimmed) * 100));
}

function formatPercentFromBasisPoints(basisPoints: number) {
  const value = basisPoints / 100;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`;
}

function formatSignedUsd(cents: number) {
  if (cents === 0) return formatUsd(0);
  return `${cents > 0 ? "+" : "−"}${formatUsd(Math.abs(cents))}`;
}

function copyWithTextareaFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy was blocked by the browser.");
}

export function CommonGroundPoolBuilder() {
  const [sharedProject, setSharedProject] = useState("Cause-general research and coordination");
  const [targetInput, setTargetInput] = useState("10000.00");
  const [participants, setParticipants] = useState<ParticipantEditor[]>(WORKED_EXAMPLE_PARTICIPANTS);
  const [splitMode, setSplitMode] = useState<SplitMode>("balanced");
  const [nextParticipantNumber, setNextParticipantNumber] = useState(3);
  const [copyStatus, setCopyStatus] = useState("");

  const participantInputs = useMemo(
    () => participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      defaultProject: participant.defaultProject,
      budgetCents: parseUsdInputToCents(participant.budgetInput),
      sharedValueBps: parsePercentInputToBasisPoints(participant.sharedValuePercentInput),
    })),
    [participants],
  );
  const targetCents = parseUsdInputToCents(targetInput);
  const balancedDraft = useMemo(
    () => buildBalancedCommonGroundPoolDraft({
      participants: participantInputs,
      sharedProject,
      targetCents,
    }),
    [participantInputs, sharedProject, targetCents],
  );
  const manualDraft = useMemo(
    () => evaluateCommonGroundPoolDraft({
      participants: participantInputs,
      sharedProject,
      targetCents,
      contributionCentsByParticipantId: Object.fromEntries(
        participants.map((participant) => [
          participant.id,
          parseUsdInputToCents(participant.manualContributionInput),
        ]),
      ),
    }),
    [participantInputs, participants, sharedProject, targetCents],
  );
  const draft = splitMode === "balanced" ? balancedDraft : manualDraft;

  function updateParticipant(
    participantId: string,
    field: Exclude<keyof ParticipantEditor, "id">,
    value: string,
  ) {
    setParticipants((current) => current.map((participant) =>
      participant.id === participantId ? { ...participant, [field]: value } : participant,
    ));
    setCopyStatus("");
  }

  function addParticipant() {
    if (participants.length >= COMMON_GROUND_POOL_MAX_PARTICIPANTS) return;
    const participantNumber = nextParticipantNumber;
    setParticipants((current) => [
      ...current,
      {
        id: `participant-${participantNumber}`,
        name: `Participant ${participantNumber}`,
        defaultProject: "Their preferred project",
        budgetInput: "10000.00",
        sharedValuePercentInput: "55",
        manualContributionInput: "0.00",
      },
    ]);
    setNextParticipantNumber((current) => current + 1);
    setCopyStatus("");
  }

  function removeParticipant(participantId: string) {
    if (participants.length <= 2) return;
    setParticipants((current) => current.filter((participant) => participant.id !== participantId));
    setCopyStatus("");
  }

  function restoreWorkedExample() {
    setSharedProject("Cause-general research and coordination");
    setTargetInput("10000.00");
    setParticipants(WORKED_EXAMPLE_PARTICIPANTS);
    setSplitMode("balanced");
    setNextParticipantNumber(3);
    setCopyStatus("");
  }

  async function copyProposalTerms() {
    if (!draft.ok) return;
    const terms = formatCommonGroundPoolProposalTerms(draft);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(terms);
      } else {
        copyWithTextareaFallback(terms);
      }
      setCopyStatus("Copied proposal terms. Private value estimates were omitted.");
    } catch (error) {
      setCopyStatus(error instanceof Error ? error.message : "The proposal could not be copied.");
    }
  }

  return (
    <section className={styles.builderShell} aria-labelledby="common-ground-pool-builder-heading">
      <div className={styles.builderHeader}>
        <div>
          <h2 id="common-ground-pool-builder-heading">Build a pool proposal</h2>
          <p>
            Record each no-pool default, estimate private value, and find a cost split that every
            participant prefers to acting alone.
          </p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={restoreWorkedExample}>
          Restore worked example
        </button>
      </div>

      <div className={styles.workspaceGrid}>
        <div className={styles.editorColumn}>
          <section className={styles.card} aria-labelledby="shared-project-heading">
            <div className={styles.cardHeading}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 id="shared-project-heading">Define the shared project</h3>
                <p>Use a concrete project or grant opportunity, not a general cause label.</p>
              </div>
            </div>
            <div className={styles.twoFieldGrid}>
              <label className={styles.field}>
                <span>Shared project</span>
                <input
                  name="sharedProject"
                  type="text"
                  value={sharedProject}
                  onChange={(event) => {
                    setSharedProject(event.target.value);
                    setCopyStatus("");
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Shared funding target</span>
                <span className={styles.moneyInput}>
                  <span aria-hidden="true">$</span>
                  <input
                    inputMode="decimal"
                    name="targetAmount"
                    type="text"
                    value={targetInput}
                    onChange={(event) => {
                      setTargetInput(event.target.value);
                      setCopyStatus("");
                    }}
                  />
                  <span>USD</span>
                </span>
              </label>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="participants-heading">
            <div className={styles.cardHeadingWithAction}>
              <div className={styles.cardHeading}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h3 id="participants-heading">Record participants and defaults</h3>
                  <p>Each budget is valued at 100% when used for that participant&apos;s own default.</p>
                </div>
              </div>
              <button
                className={styles.secondaryButton}
                disabled={participants.length >= COMMON_GROUND_POOL_MAX_PARTICIPANTS}
                type="button"
                onClick={addParticipant}
              >
                Add participant
              </button>
            </div>

            <div className={styles.privateNotice} id="private-value-notice">
              <strong>Private calculation</strong>
              <span>
                Private value estimates stay in this browser tab. They are not saved or included in copied proposal terms.
              </span>
            </div>

            <div className={styles.participantList}>
              {participants.map((participant, index) => (
                <fieldset className={styles.participantCard} key={participant.id}>
                  <legend>Participant {index + 1}</legend>
                  <div className={styles.participantHeader}>
                    <strong>{participant.name || `Participant ${index + 1}`}</strong>
                    {participants.length > 2 ? (
                      <button
                        aria-label={`Remove ${participant.name || `participant ${index + 1}`}`}
                        className={styles.textButton}
                        type="button"
                        onClick={() => removeParticipant(participant.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className={styles.participantFields}>
                    <label className={styles.field}>
                      <span>Name or role</span>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(event) => updateParticipant(participant.id, "name", event.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>No-pool default project</span>
                      <input
                        type="text"
                        value={participant.defaultProject}
                        onChange={(event) => updateParticipant(participant.id, "defaultProject", event.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Controlled budget</span>
                      <span className={styles.moneyInput}>
                        <span aria-hidden="true">$</span>
                        <input
                          inputMode="decimal"
                          type="text"
                          value={participant.budgetInput}
                          onChange={(event) => updateParticipant(participant.id, "budgetInput", event.target.value)}
                        />
                        <span>USD</span>
                      </span>
                    </label>
                    <label className={styles.field}>
                      <span>Private value of $1 to the shared project</span>
                      <span className={styles.percentInput}>
                        <input
                          aria-describedby="private-value-notice"
                          inputMode="decimal"
                          max="500"
                          min="0"
                          type="text"
                          value={participant.sharedValuePercentInput}
                          onChange={(event) => updateParticipant(
                            participant.id,
                            "sharedValuePercentInput",
                            event.target.value,
                          )}
                        />
                        <span>% of $1 to their default</span>
                      </span>
                    </label>
                    {splitMode === "manual" ? (
                      <label className={styles.field}>
                        <span>Proposed contribution</span>
                        <span className={styles.moneyInput}>
                          <span aria-hidden="true">$</span>
                          <input
                            inputMode="decimal"
                            type="text"
                            value={participant.manualContributionInput}
                            onChange={(event) => updateParticipant(
                              participant.id,
                              "manualContributionInput",
                              event.target.value,
                            )}
                          />
                          <span>USD</span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className={styles.card} aria-labelledby="split-heading">
            <div className={styles.cardHeading}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 id="split-heading">Choose the cost split</h3>
                <p>Balanced split equalizes the surplus margin among participants who contribute.</p>
              </div>
            </div>
            <div className={styles.segmentedControl} role="group" aria-label="Cost split method">
              <button
                aria-pressed={splitMode === "balanced"}
                className={splitMode === "balanced" ? styles.segmentSelected : ""}
                type="button"
                onClick={() => {
                  setSplitMode("balanced");
                  setCopyStatus("");
                }}
              >
                Balanced split
              </button>
              <button
                aria-pressed={splitMode === "manual"}
                className={splitMode === "manual" ? styles.segmentSelected : ""}
                type="button"
                onClick={() => {
                  setSplitMode("manual");
                  setCopyStatus("");
                }}
              >
                Manual split
              </button>
            </div>
            <p className={styles.methodNote}>
              {splitMode === "balanced"
                ? "The suggestion finds cost shares below each participant's private value share and equalizes the gain margin where possible."
                : "Enter an exact contribution for each participant. The checker rejects splits that miss the target, exceed a budget, or leave anyone no better off."}
            </p>
          </section>
        </div>

        <aside className={styles.previewColumn} aria-label="Common Ground Pool result">
          <section className={styles.previewCard} aria-live="polite">
            <div className={styles.previewHeading}>
              <div>
                <span className={draft.ok ? styles.readyStatus : styles.blockedStatus}>
                  {draft.ok ? "Positive-sum draft" : "Needs changes"}
                </span>
                <h2>Pool result</h2>
              </div>
              <span className={styles.modeLabel}>{splitMode === "balanced" ? "Balanced" : "Manual"}</span>
            </div>

            <dl className={styles.summaryMetrics}>
              <div>
                <dt>Shared project</dt>
                <dd>{draft.sharedProject || "Not named"}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{formatUsd(draft.targetCents)}</dd>
              </div>
              <div>
                <dt>Combined private value</dt>
                <dd>{formatPercentFromBasisPoints(draft.combinedSharedValueBps)}</dd>
              </div>
              <div>
                <dt>Coordination margin</dt>
                <dd className={draft.coordinationMarginBps > 0 ? styles.positiveText : styles.negativeText}>
                  {draft.coordinationMarginBps > 0 ? "+" : ""}
                  {formatPercentFromBasisPoints(draft.coordinationMarginBps)} of target
                </dd>
              </div>
            </dl>

            <div className={styles.resultList}>
              {draft.participants.map((participant) => (
                <article className={styles.resultRow} key={participant.id}>
                  <div className={styles.resultTitle}>
                    <strong>{participant.name || "Unnamed participant"}</strong>
                    <span>{formatPercentFromBasisPoints(participant.costShareBps)} of pool cost</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Contributes</dt>
                      <dd>{formatUsd(participant.contributionCents)}</dd>
                    </div>
                    <div>
                      <dt>Keeps for default</dt>
                      <dd>{formatUsd(participant.retainedDefaultCents)}</dd>
                    </div>
                    <div>
                      <dt>Value from shared project</dt>
                      <dd>{formatUsd(participant.sharedProjectValueCents)}</dd>
                    </div>
                    <div>
                      <dt>Equivalent value</dt>
                      <dd>{formatUsd(participant.equivalentValueCents)}</dd>
                    </div>
                    <div>
                      <dt>Gain vs. default</dt>
                      <dd className={participant.gainCents > 0 ? styles.positiveText : styles.negativeText}>
                        {formatSignedUsd(participant.gainCents)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            {draft.blockers.length ? (
              <div className={styles.blockerBox} role="alert">
                <strong>Resolve before sharing</strong>
                <ul>
                  {draft.blockers.map((blocker) => (
                    <li key={blocker}>{blockerLabel(blocker)}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.readyBox}>
                <strong>Every listed participant gains by their own private estimate.</strong>
                <span>
                  This is a calculation result, not proof of counterfactual additionality or project quality.
                </span>
              </div>
            )}

            <button
              className={styles.primaryButton}
              disabled={!draft.ok}
              type="button"
              onClick={() => void copyProposalTerms()}
            >
              Copy proposal terms
            </button>
            <p className={styles.copyBoundary}>
              No payment, authorization, hold, escrow, custody event, donation, or binding agreement is created by this draft.
            </p>
            <p className={styles.copyStatus} role="status">{copyStatus}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
