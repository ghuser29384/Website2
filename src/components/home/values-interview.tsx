"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { saveWishProfileAction } from "@/app/actions";

const INTERVIEW_STORAGE_KEY = "moralTradeValuesInterview";
const INTERVIEW_DISMISSED_KEY = "moralTradeValuesInterviewDismissed";

const CAUSE_PROMPTS = [
  "Animal welfare",
  "Existential risk",
  "Future flourishing",
  "Moral status of digital minds",
  "Extreme power concentration",
  "S-risks",
  "Global poverty",
  "Climate",
  "Public health",
  "Democracy",
  "Civil liberties",
  "Scientific progress",
] as const;

const OFFER_PROMPTS = [
  "Money",
  "A personal pledge",
  "Time or labor",
  "Public advocacy",
  "A donation redirection",
  "Evidence or verification",
] as const;

const TRADE_SHAPES = [
  "Pledge swap",
  "Donation offset",
  "Paid action offer",
  "Open to proposals",
] as const;

type InterviewStep = "values" | "wishes" | "offers" | "asks" | "conditions" | "summary";

type InterviewAnswers = {
  participantKind: "individual" | "collective" | "institution";
  collectiveName: string;
  causes: string[];
  wish: string;
  offers: string[];
  ask: string;
  tradeShape: string;
  capabilities: string;
  constraints: string;
  locationCity: string;
  locationRegion: string;
  verificationPreferences: string;
  uncertaintyNotes: string;
  privacyStage: "strict" | "broad" | "limited";
  brokeragePreference: string;
  matchFrequency: "manual" | "weekly" | "monthly";
  openToPayment: boolean;
  openToPledges: boolean;
  backgroundSearchEnabled: boolean;
  manualSourceReviewEnabled: boolean;
  notificationEmailEnabled: boolean;
  notificationDashboardEnabled: boolean;
  isDiscoverable: boolean;
  sharePublicPreview: boolean;
  shareLocation: boolean;
  sourceLabel: string;
  sourceUrl: string;
  sourceNotes: string;
};

const EMPTY_ANSWERS: InterviewAnswers = {
  participantKind: "individual",
  collectiveName: "",
  causes: [],
  wish: "",
  offers: [],
  ask: "",
  tradeShape: "Open to proposals",
  capabilities: "",
  constraints: "",
  locationCity: "",
  locationRegion: "",
  verificationPreferences: "",
  uncertaintyNotes: "",
  privacyStage: "broad",
  brokeragePreference: "",
  matchFrequency: "weekly",
  openToPayment: false,
  openToPledges: true,
  backgroundSearchEnabled: true,
  manualSourceReviewEnabled: false,
  notificationEmailEnabled: false,
  notificationDashboardEnabled: true,
  isDiscoverable: true,
  sharePublicPreview: true,
  shareLocation: false,
  sourceLabel: "",
  sourceUrl: "",
  sourceNotes: "",
};

const STEPS: InterviewStep[] = ["values", "wishes", "offers", "asks", "conditions", "summary"];

function getNextStep(step: InterviewStep) {
  return STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)];
}

function getPreviousStep(step: InterviewStep) {
  return STEPS[Math.max(STEPS.indexOf(step) - 1, 0)];
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function getRankedCauses(causes: string[]) {
  return causes
    .map((cause) => cause.trim())
    .filter((cause, index, ranking) => cause && ranking.indexOf(cause) === index);
}

function summarizeList(values: string[], fallback: string) {
  return values.length ? values.join(", ") : fallback;
}

function CauseAreaLabel({ cause }: { cause: string }) {
  return (
    <span className="cause-area-label">
      <span className="cause-area-label-text">{cause}</span>
      <span aria-hidden="true" className="cause-area-info-icon">
        i
      </span>
    </span>
  );
}

function readControlValue(target: unknown) {
  return (target as { value: string }).value;
}

function readControlChecked(target: unknown) {
  return (target as { checked: boolean }).checked;
}

function readStoredInterview(): InterviewAnswers | null {
  const storage = (globalThis as unknown as {
    localStorage?: {
      getItem: (key: string) => string | null;
    };
  }).localStorage;

  if (!storage) {
    return null;
  }

  const raw = storage.getItem(INTERVIEW_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InterviewAnswers>;
    const participantKind =
      parsed.participantKind === "collective" || parsed.participantKind === "institution"
        ? parsed.participantKind
        : "individual";
    const privacyStage =
      parsed.privacyStage === "strict" || parsed.privacyStage === "limited"
        ? parsed.privacyStage
        : "broad";
    const matchFrequency =
      parsed.matchFrequency === "manual" || parsed.matchFrequency === "monthly"
        ? parsed.matchFrequency
        : "weekly";

    return {
      participantKind,
      collectiveName: typeof parsed.collectiveName === "string" ? parsed.collectiveName : "",
      causes: Array.isArray(parsed.causes) ? parsed.causes : [],
      wish: typeof parsed.wish === "string" ? parsed.wish : "",
      offers: Array.isArray(parsed.offers) ? parsed.offers : [],
      ask: typeof parsed.ask === "string" ? parsed.ask : "",
      tradeShape: typeof parsed.tradeShape === "string" ? parsed.tradeShape : "Open to proposals",
      capabilities: typeof parsed.capabilities === "string" ? parsed.capabilities : "",
      constraints: typeof parsed.constraints === "string" ? parsed.constraints : "",
      locationCity: typeof parsed.locationCity === "string" ? parsed.locationCity : "",
      locationRegion: typeof parsed.locationRegion === "string" ? parsed.locationRegion : "",
      verificationPreferences:
        typeof parsed.verificationPreferences === "string" ? parsed.verificationPreferences : "",
      uncertaintyNotes: typeof parsed.uncertaintyNotes === "string" ? parsed.uncertaintyNotes : "",
      privacyStage,
      brokeragePreference:
        typeof parsed.brokeragePreference === "string" ? parsed.brokeragePreference : "",
      matchFrequency,
      openToPayment: typeof parsed.openToPayment === "boolean" ? parsed.openToPayment : false,
      openToPledges: typeof parsed.openToPledges === "boolean" ? parsed.openToPledges : true,
      backgroundSearchEnabled:
        typeof parsed.backgroundSearchEnabled === "boolean"
          ? parsed.backgroundSearchEnabled
          : true,
      manualSourceReviewEnabled:
        typeof parsed.manualSourceReviewEnabled === "boolean"
          ? parsed.manualSourceReviewEnabled
          : false,
      notificationEmailEnabled:
        typeof parsed.notificationEmailEnabled === "boolean"
          ? parsed.notificationEmailEnabled
          : false,
      notificationDashboardEnabled:
        typeof parsed.notificationDashboardEnabled === "boolean"
          ? parsed.notificationDashboardEnabled
          : true,
      isDiscoverable: typeof parsed.isDiscoverable === "boolean" ? parsed.isDiscoverable : true,
      sharePublicPreview:
        typeof parsed.sharePublicPreview === "boolean" ? parsed.sharePublicPreview : true,
      shareLocation: typeof parsed.shareLocation === "boolean" ? parsed.shareLocation : false,
      sourceLabel: typeof parsed.sourceLabel === "string" ? parsed.sourceLabel : "",
      sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : "",
      sourceNotes: typeof parsed.sourceNotes === "string" ? parsed.sourceNotes : "",
    };
  } catch {
    return null;
  }
}

function writeStoredInterview(answers: InterviewAnswers) {
  const storage = (globalThis as unknown as {
    localStorage?: {
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
    };
  }).localStorage;

  if (!storage) {
    return;
  }

  storage.setItem(
    INTERVIEW_STORAGE_KEY,
    JSON.stringify({
      ...answers,
      completedAt: new Date().toISOString(),
    }),
  );
  storage.removeItem(INTERVIEW_DISMISSED_KEY);
}

function writeDismissedInterview() {
  const storage = (globalThis as unknown as {
    localStorage?: {
      setItem: (key: string, value: string) => void;
    };
  }).localStorage;

  storage?.setItem(INTERVIEW_DISMISSED_KEY, new Date().toISOString());
}

function getWasDismissed() {
  const storage = (globalThis as unknown as {
    localStorage?: {
      getItem: (key: string) => string | null;
    };
  }).localStorage;

  return Boolean(storage?.getItem(INTERVIEW_DISMISSED_KEY));
}

interface ValuesInterviewProps {
  isAuthenticated: boolean;
}

export function ValuesInterview({ isAuthenticated }: ValuesInterviewProps) {
  const [answers, setAnswers] = useState<InterviewAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<InterviewStep>("values");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [draggedCause, setDraggedCause] = useState<string | null>(null);
  const [customCause, setCustomCause] = useState("");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const stored = readStoredInterview();

      if (stored) {
        setAnswers(stored);
        setHasCompleted(true);
        setIsOpen(false);
      } else {
        setIsOpen(!getWasDismissed());
      }

      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAnswer<Key extends keyof InterviewAnswers>(
    key: Key,
    value: InterviewAnswers[Key],
  ) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTextChange(
    field:
      | "wish"
      | "ask"
      | "collectiveName"
      | "capabilities"
      | "constraints"
      | "locationCity"
      | "locationRegion"
      | "verificationPreferences"
      | "uncertaintyNotes"
      | "brokeragePreference"
      | "sourceLabel"
      | "sourceUrl"
      | "sourceNotes",
    value: string,
  ) {
    updateAnswer(field, value);
  }

  function handleInputChange(
    field: "locationCity" | "locationRegion",
    value: string,
  ) {
    updateAnswer(field, value);
  }

  function addCauseToRanking(cause: string) {
    const normalizedCause = cause.trim();

    if (!normalizedCause) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      causes: getRankedCauses(current.causes).includes(normalizedCause)
        ? getRankedCauses(current.causes)
        : [...getRankedCauses(current.causes), normalizedCause],
    }));
  }

  function addCustomCauseToRanking() {
    addCauseToRanking(customCause);
    setCustomCause("");
  }

  function moveCauseToRank(cause: string, rankIndex: number) {
    setAnswers((current) => {
      const currentRanking = getRankedCauses(current.causes).filter((entry) => entry !== cause);
      const nextRanking = [...currentRanking];

      nextRanking.splice(Math.min(rankIndex, nextRanking.length), 0, cause);

      return {
        ...current,
        causes: nextRanking,
      };
    });
  }

  function moveCauseByOffset(cause: string, offset: number) {
    const rankedCauses = getRankedCauses(answers.causes);
    const currentIndex = rankedCauses.indexOf(cause);

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(rankedCauses.length - 1, currentIndex + offset));

    moveCauseToRank(cause, nextIndex);
  }

  function removeCauseFromRanking(cause: string) {
    updateAnswer(
      "causes",
      getRankedCauses(answers.causes).filter((entry) => entry !== cause),
    );
  }

  function closeInterview() {
    writeDismissedInterview();
    setIsOpen(false);
  }

  function completeInterview() {
    writeStoredInterview(answers);
    setHasCompleted(true);
    setIsOpen(false);
  }

  function reopenInterview() {
    setStep(hasCompleted ? "summary" : "values");
    setIsOpen(true);
  }

  if (!isLoaded) {
    return null;
  }

  const rankedCauses = getRankedCauses(answers.causes);
  const availableCauses = CAUSE_PROMPTS.filter((cause) => !rankedCauses.includes(cause));
  const causeSlotCount = Math.max(CAUSE_PROMPTS.length, rankedCauses.length + 1);

  return (
    <>
      <button
        className="values-interview-launch"
        onClick={reopenInterview}
        type="button"
      >
        {hasCompleted ? "Review your values" : "Start values interview"}
      </button>

      {isOpen ? (
        <div
          aria-labelledby="values-interview-title"
          aria-modal="true"
          className="values-interview-overlay"
          role="dialog"
        >
          <section className="values-interview-panel panel">
            <div className="values-interview-head">
              <p className="eyebrow">First visit interview</p>
              <button
                aria-label="Close values interview"
                className="values-interview-close"
                onClick={closeInterview}
                type="button"
              >
                Not now
              </button>
            </div>

            <div className="values-interview-progress" aria-hidden="true">
              {STEPS.map((entry) => (
                <span
                  className={STEPS.indexOf(entry) <= STEPS.indexOf(step) ? "is-active" : ""}
                  key={entry}
                />
              ))}
            </div>

            {step === "values" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">Rank the cause areas by importance to you.</h2>
                <p>
                  Drag each cause area into the numbered slots, starting with the area where
                  you would most want another person&apos;s action to change the world.
                </p>
                <div className="cause-ranking-builder">
                  <div className="cause-ranking-slots">
                    {Array.from({ length: causeSlotCount }).map((_, index) => {
                      const cause = rankedCauses[index];

                      return (
                        <div
                          className={`cause-rank-slot${cause ? " is-filled" : ""}`}
                          key={`cause-rank-${index}`}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();

                            if (draggedCause) {
                              moveCauseToRank(draggedCause, index);
                              setDraggedCause(null);
                            }
                          }}
                        >
                          <span className="cause-rank-number">{index + 1}.</span>
                          {cause ? (
                            <div
                              className="cause-rank-card"
                              draggable
                              onDragEnd={() => setDraggedCause(null)}
                              onDragStart={() => setDraggedCause(cause)}
                            >
                              <CauseAreaLabel cause={cause} />
                              <span className="cause-rank-controls">
                                <button
                                  aria-label={`Move ${cause} up`}
                                  disabled={index === 0}
                                  onClick={() => moveCauseByOffset(cause, -1)}
                                  type="button"
                                >
                                  Up
                                </button>
                                <button
                                  aria-label={`Move ${cause} down`}
                                  disabled={index === rankedCauses.length - 1}
                                  onClick={() => moveCauseByOffset(cause, 1)}
                                  type="button"
                                >
                                  Down
                                </button>
                                <button
                                  aria-label={`Remove ${cause} from ranking`}
                                  onClick={() => removeCauseFromRanking(cause)}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </span>
                            </div>
                          ) : (
                            <span className="cause-rank-placeholder">Drop a cause area here</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="cause-ranking-pool">
                    <p className="cause-ranking-label">Cause areas</p>
                    <div className="values-chip-grid">
                      {availableCauses.map((cause) => (
                        <button
                          className="cause-option-button"
                          draggable
                          key={cause}
                          onClick={() => addCauseToRanking(cause)}
                          onDragEnd={() => setDraggedCause(null)}
                          onDragStart={() => setDraggedCause(cause)}
                          type="button"
                        >
                          <CauseAreaLabel cause={cause} />
                        </button>
                      ))}
                    </div>
                    <div className="cause-other-box">
                      <label className="field compact-field">
                        <span>Other cause area</span>
                        <input
                          onChange={(event) => setCustomCause(readControlValue(event.target))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCustomCauseToRanking();
                            }
                          }}
                          placeholder="Type another cause area"
                          value={customCause}
                        />
                      </label>
                      <button
                        className="button button-secondary button-mini"
                        disabled={!customCause.trim()}
                        onClick={addCustomCauseToRanking}
                        type="button"
                      >
                        Add other
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === "wishes" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">What change would you most like to see?</h2>
                <p>
                  Name the concrete wish, not just the cause area. Specific wishes make better
                  moral trades.
                </p>
                <textarea
                  onChange={(event) => handleTextChange("wish", readControlValue(event.target))}
                  placeholder="For example: more people trying a vegetarian diet for a fixed period; more money to a global health charity; fewer resources spent on mutually cancelling campaigns."
                  value={answers.wish}
                />
              </div>
            ) : null}

            {step === "offers" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">What could you offer?</h2>
                <p>
                  Moral trade works best when each side states its real cost, not a heroic version
                  of itself.
                </p>
                <div className="values-chip-grid">
                  {OFFER_PROMPTS.map((offer) => (
                    <button
                      className={answers.offers.includes(offer) ? "is-selected" : ""}
                      key={offer}
                      onClick={() => updateAnswer("offers", toggleValue(answers.offers, offer))}
                      type="button"
                    >
                      {offer}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "asks" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">What would you ask from others?</h2>
                <p>
                  This can be an action, a pledge, a donation redirection, a payment, or an offer
                  to stop wasting resources on opposed efforts.
                </p>
                <textarea
                  onChange={(event) => handleTextChange("ask", readControlValue(event.target))}
                  placeholder="For example: become vegetarian for 40 days; redirect a donation; fund a cause I value; verify a pledge publicly."
                  value={answers.ask}
                />
                <div className="values-radio-grid">
                  {TRADE_SHAPES.map((shape) => (
                    <label key={shape}>
                      <input
                        checked={answers.tradeShape === shape}
                        name="tradeShape"
                        onChange={() => updateAnswer("tradeShape", shape)}
                        type="radio"
                      />
                      <span>{shape}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "conditions" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">What are the boundaries?</h2>
                <div className="field-grid">
                  <label className="field">
                    <span>Participant type</span>
                    <select
                      onChange={(event) =>
                        updateAnswer(
                          "participantKind",
                          readControlValue(event.target) as InterviewAnswers["participantKind"],
                        )
                      }
                      value={answers.participantKind}
                    >
                      <option value="individual">Individual</option>
                      <option value="collective">Collective</option>
                      <option value="institution">Institution</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Collective or institution name</span>
                    <input
                      onChange={(event) =>
                        handleTextChange("collectiveName", readControlValue(event.target))
                      }
                      placeholder="Optional"
                      type="text"
                      value={answers.collectiveName}
                    />
                  </label>
                  <label className="field">
                    <span>City</span>
                    <input
                      name="locationCityPreview"
                      onChange={(event) =>
                        handleInputChange("locationCity", readControlValue(event.target))
                      }
                      placeholder="Optional"
                      type="text"
                      value={answers.locationCity}
                    />
                  </label>
                  <label className="field">
                    <span>Region</span>
                    <input
                      name="locationRegionPreview"
                      onChange={(event) =>
                        handleInputChange("locationRegion", readControlValue(event.target))
                      }
                      placeholder="State, province, or country"
                      type="text"
                      value={answers.locationRegion}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Capabilities</span>
                  <textarea
                    onChange={(event) =>
                      handleTextChange("capabilities", readControlValue(event.target))
                    }
                    placeholder="For example: can fund small trials; can make public pledges; can introduce donors; can verify a commitment."
                    value={answers.capabilities}
                  />
                </label>
                <label className="field">
                  <span>Constraints</span>
                  <textarea
                    onChange={(event) =>
                      handleTextChange("constraints", readControlValue(event.target))
                    }
                    placeholder="For example: no legal commitments without review; no public disclosure unless both parties agree; only reversible trials."
                    value={answers.constraints}
                  />
                </label>
                <label className="field">
                  <span>Verification preferences</span>
                  <textarea
                    onChange={(event) =>
                      handleTextChange(
                        "verificationPreferences",
                        readControlValue(event.target),
                      )
                    }
                    placeholder="For example: private check-ins, receipts, public pledges, third-party verification, or no verification for low-stakes trials."
                    value={answers.verificationPreferences}
                  />
                </label>
                <label className="field">
                  <span>Uncertainty notes</span>
                  <textarea
                    onChange={(event) =>
                      handleTextChange("uncertaintyNotes", readControlValue(event.target))
                    }
                    placeholder="For example: unsure which verification standard is enough; open to either money or pledge terms; not sure how long the commitment should last."
                    value={answers.uncertaintyNotes}
                  />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Privacy stage</span>
                    <select
                      onChange={(event) =>
                        updateAnswer(
                          "privacyStage",
                          readControlValue(event.target) as InterviewAnswers["privacyStage"],
                        )
                      }
                      value={answers.privacyStage}
                    >
                      <option value="strict">Strict: reveal the minimum</option>
                      <option value="broad">Broad: show cause-level previews</option>
                      <option value="limited">Limited: allow more context after opt-in</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Match frequency</span>
                    <select
                      onChange={(event) =>
                        updateAnswer(
                          "matchFrequency",
                          readControlValue(event.target) as InterviewAnswers["matchFrequency"],
                        )
                      }
                      value={answers.matchFrequency}
                    >
                      <option value="manual">Manual scans only</option>
                      <option value="weekly">Weekly background scans</option>
                      <option value="monthly">Monthly background scans</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Brokerage or payment preference</span>
                  <textarea
                    onChange={(event) =>
                      handleTextChange("brokeragePreference", readControlValue(event.target))
                    }
                    placeholder="Optional: whether you would consider brokerage fees, payment-mediated trades, or only non-payment commitments."
                    value={answers.brokeragePreference}
                  />
                </label>
                <div className="values-radio-grid values-consent-grid">
                  <label>
                    <input
                      checked={answers.openToPayment}
                      onChange={(event) =>
                        updateAnswer("openToPayment", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Open to payment-mediated trades</span>
                  </label>
                  <label>
                    <input
                      checked={answers.openToPledges}
                      onChange={(event) =>
                        updateAnswer("openToPledges", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Open to pledge-based trades</span>
                  </label>
                  <label>
                    <input
                      checked={answers.backgroundSearchEnabled}
                      onChange={(event) =>
                        updateAnswer("backgroundSearchEnabled", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Run non-AI background scans</span>
                  </label>
                  <label>
                    <input
                      checked={answers.manualSourceReviewEnabled}
                      onChange={(event) =>
                        updateAnswer(
                          "manualSourceReviewEnabled",
                          readControlChecked(event.target),
                        )
                      }
                      type="checkbox"
                    />
                    <span>Save manual source notes</span>
                  </label>
                  <label>
                    <input
                      checked={answers.notificationDashboardEnabled}
                      onChange={(event) =>
                        updateAnswer(
                          "notificationDashboardEnabled",
                          readControlChecked(event.target),
                        )
                      }
                      type="checkbox"
                    />
                    <span>Notify me in the dashboard</span>
                  </label>
                  <label>
                    <input
                      checked={answers.notificationEmailEnabled}
                      onChange={(event) =>
                        updateAnswer("notificationEmailEnabled", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Allow future email alerts</span>
                  </label>
                  <label>
                    <input
                      checked={answers.isDiscoverable}
                      onChange={(event) =>
                        updateAnswer("isDiscoverable", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Allow safe match suggestions</span>
                  </label>
                  <label>
                    <input
                      checked={answers.sharePublicPreview}
                      onChange={(event) =>
                        updateAnswer("sharePublicPreview", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Show only a broad public preview</span>
                  </label>
                  <label>
                    <input
                      checked={answers.shareLocation}
                      onChange={(event) =>
                        updateAnswer("shareLocation", readControlChecked(event.target))
                      }
                      type="checkbox"
                    />
                    <span>Include city/region in the public preview</span>
                  </label>
                </div>
                {answers.manualSourceReviewEnabled ? (
                  <div className="field-grid">
                    <label className="field">
                      <span>Manual source label</span>
                      <input
                        onChange={(event) =>
                          handleTextChange("sourceLabel", readControlValue(event.target))
                        }
                        placeholder="For example: public essay, profile summary, project page"
                        type="text"
                        value={answers.sourceLabel}
                      />
                    </label>
                    <label className="field">
                      <span>Source URL</span>
                      <input
                        onChange={(event) =>
                          handleTextChange("sourceUrl", readControlValue(event.target))
                        }
                        placeholder="Optional"
                        type="url"
                        value={answers.sourceUrl}
                      />
                    </label>
                    <label className="field field-wide">
                      <span>Source notes</span>
                      <textarea
                        onChange={(event) =>
                          handleTextChange("sourceNotes", readControlValue(event.target))
                        }
                        placeholder="Summarize the source manually. It will not be automatically ingested."
                        value={answers.sourceNotes}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === "summary" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">A first trade profile</h2>
                <p>
                  Exact wishes and asks stay private. If you save this profile, Moral Trade stores
                  it in the wish registry and only uses broad previews for safe matching.
                </p>
                <dl className="values-summary">
                  <div>
                    <dt>Participant</dt>
                    <dd>
                      {answers.participantKind}
                      {answers.collectiveName.trim() ? `: ${answers.collectiveName.trim()}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Values</dt>
                    <dd>{summarizeList(answers.causes, "No cause areas selected yet.")}</dd>
                  </div>
                  <div>
                    <dt>Wish</dt>
                    <dd>{answers.wish.trim() || "No concrete wish entered yet."}</dd>
                  </div>
                  <div>
                    <dt>Could offer</dt>
                    <dd>
                      {[summarizeList(answers.offers, ""), answers.capabilities.trim()]
                        .filter(Boolean)
                        .join(" / ") || "No offers selected yet."}
                    </dd>
                  </div>
                  <div>
                    <dt>Ask</dt>
                    <dd>{answers.ask.trim() || "No ask entered yet."}</dd>
                  </div>
                  <div>
                    <dt>Likely form</dt>
                    <dd>{answers.tradeShape}</dd>
                  </div>
                  <div>
                    <dt>Constraints</dt>
                    <dd>{answers.constraints.trim() || "No constraints entered yet."}</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>
                      {answers.verificationPreferences.trim() ||
                        "No verification preferences entered yet."}
                    </dd>
                  </div>
                  <div>
                    <dt>Uncertainty</dt>
                    <dd>{answers.uncertaintyNotes.trim() || "No uncertainty notes entered yet."}</dd>
                  </div>
                  <div>
                    <dt>Privacy</dt>
                    <dd>
                      {answers.privacyStage}; {answers.matchFrequency} scans;{" "}
                      {answers.manualSourceReviewEnabled
                        ? "manual sources may be saved"
                        : "no manual sources"}
                    </dd>
                  </div>
                  <div>
                    <dt>Discovery</dt>
                    <dd>
                      {answers.isDiscoverable
                        ? "Safe match suggestions enabled; exact wishes remain private."
                        : "Private only; no match suggestions."}
                    </dd>
                  </div>
                </dl>
                <div className="values-next-actions">
                  <Link className="button button-primary" href="/offers">
                    Review matching offers
                  </Link>
                  <Link className="button button-secondary" href="/offers/new">
                    Draft an offer
                  </Link>
                </div>
                {isAuthenticated ? (
                  <form action={saveWishProfileAction} className="values-save-form">
                    <input name="return_to" type="hidden" value="/dashboard" />
                    <input name="participant_kind" type="hidden" value={answers.participantKind} />
                    <input name="collective_name" type="hidden" value={answers.collectiveName} />
                    <input name="causes_json" type="hidden" value={JSON.stringify(answers.causes)} />
                    <input name="offers_json" type="hidden" value={JSON.stringify(answers.offers)} />
                    <input name="wish" type="hidden" value={answers.wish} />
                    <input name="ask" type="hidden" value={answers.ask} />
                    <input name="trade_shape" type="hidden" value={answers.tradeShape} />
                    <input name="capabilities" type="hidden" value={answers.capabilities} />
                    <input name="constraints" type="hidden" value={answers.constraints} />
                    <input name="location_city" type="hidden" value={answers.locationCity} />
                    <input name="location_region" type="hidden" value={answers.locationRegion} />
                    <input
                      name="verification_preferences"
                      type="hidden"
                      value={answers.verificationPreferences}
                    />
                    <input
                      name="uncertainty_notes"
                      type="hidden"
                      value={answers.uncertaintyNotes}
                    />
                    <input name="privacy_stage" type="hidden" value={answers.privacyStage} />
                    <input
                      name="brokerage_preference"
                      type="hidden"
                      value={answers.brokeragePreference}
                    />
                    <input name="match_frequency" type="hidden" value={answers.matchFrequency} />
                    <input
                      name="open_to_payment"
                      type="hidden"
                      value={answers.openToPayment ? "true" : "false"}
                    />
                    <input
                      name="open_to_pledges"
                      type="hidden"
                      value={answers.openToPledges ? "true" : "false"}
                    />
                    <input
                      name="background_search_enabled"
                      type="hidden"
                      value={answers.backgroundSearchEnabled ? "true" : "false"}
                    />
                    <input
                      name="manual_source_review_enabled"
                      type="hidden"
                      value={answers.manualSourceReviewEnabled ? "true" : "false"}
                    />
                    <input
                      name="notification_email_enabled"
                      type="hidden"
                      value={answers.notificationEmailEnabled ? "true" : "false"}
                    />
                    <input
                      name="notification_dashboard_enabled"
                      type="hidden"
                      value={answers.notificationDashboardEnabled ? "true" : "false"}
                    />
                    <input
                      name="is_discoverable"
                      type="hidden"
                      value={answers.isDiscoverable ? "true" : "false"}
                    />
                    <input
                      name="share_public_preview"
                      type="hidden"
                      value={answers.sharePublicPreview ? "true" : "false"}
                    />
                    <input
                      name="share_location"
                      type="hidden"
                      value={answers.shareLocation ? "true" : "false"}
                    />
                    <input name="source_label" type="hidden" value={answers.sourceLabel} />
                    <input name="source_url" type="hidden" value={answers.sourceUrl} />
                    <input name="source_notes" type="hidden" value={answers.sourceNotes} />
                    <input name="source_type" type="hidden" value="manual" />
                    <input name="source_access_level" type="hidden" value="manual_summary" />
                    <button className="button button-primary" type="submit">
                      Save private wish profile
                    </button>
                    <p>
                      Consent gates remain in place: possible counterparties see a broad preview,
                      not your identity-specific wish details.
                    </p>
                  </form>
                ) : (
                  <div className="values-save-form">
                    <p>
                      Create an account to save this as a private wish profile and receive safe
                      match suggestions.
                    </p>
                    <Link className="button button-primary" href="/signup">
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            <div className="values-interview-actions">
              <button
                className="button button-secondary"
                disabled={step === "values"}
                onClick={() => setStep(getPreviousStep(step))}
                type="button"
              >
                Back
              </button>
              {step === "summary" ? (
                <button className="button button-primary" onClick={completeInterview} type="button">
                  Save locally
                </button>
              ) : (
                <button
                  className="button button-primary"
                  onClick={() => setStep(getNextStep(step))}
                  type="button"
                >
                  Continue
                </button>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
