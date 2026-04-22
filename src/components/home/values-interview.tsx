"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";

const INTERVIEW_STORAGE_KEY = "moralTradeValuesInterview";
const INTERVIEW_DISMISSED_KEY = "moralTradeValuesInterviewDismissed";

const CAUSE_PROMPTS = [
  "Animal welfare",
  "Existential risk",
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

type InterviewStep = "values" | "wishes" | "offers" | "asks" | "summary";

type InterviewAnswers = {
  causes: string[];
  wish: string;
  offers: string[];
  ask: string;
  tradeShape: string;
};

const EMPTY_ANSWERS: InterviewAnswers = {
  causes: [],
  wish: "",
  offers: [],
  ask: "",
  tradeShape: "Open to proposals",
};

const STEPS: InterviewStep[] = ["values", "wishes", "offers", "asks", "summary"];

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

function summarizeList(values: string[], fallback: string) {
  return values.length ? values.join(", ") : fallback;
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

    return {
      causes: Array.isArray(parsed.causes) ? parsed.causes : [],
      wish: typeof parsed.wish === "string" ? parsed.wish : "",
      offers: Array.isArray(parsed.offers) ? parsed.offers : [],
      ask: typeof parsed.ask === "string" ? parsed.ask : "",
      tradeShape: typeof parsed.tradeShape === "string" ? parsed.tradeShape : "Open to proposals",
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

export function ValuesInterview() {
  const [answers, setAnswers] = useState<InterviewAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<InterviewStep>("values");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

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
    field: "wish" | "ask",
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    updateAnswer(field, event.target.value);
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
                <h2 id="values-interview-title">What matters most to you?</h2>
                <p>
                  Choose the areas where you would most want another person&apos;s action to
                  change the world.
                </p>
                <div className="values-chip-grid">
                  {CAUSE_PROMPTS.map((cause) => (
                    <button
                      className={answers.causes.includes(cause) ? "is-selected" : ""}
                      key={cause}
                      onClick={() => updateAnswer("causes", toggleValue(answers.causes, cause))}
                      type="button"
                    >
                      {cause}
                    </button>
                  ))}
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
                  onChange={(event) => handleTextChange("wish", event)}
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
                  onChange={(event) => handleTextChange("ask", event)}
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

            {step === "summary" ? (
              <div className="values-interview-step">
                <h2 id="values-interview-title">A first trade profile</h2>
                <p>
                  This is stored only in this browser for now. It helps you enter the site with a
                  clearer view of what you value and what you might ask.
                </p>
                <dl className="values-summary">
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
                    <dd>{summarizeList(answers.offers, "No offers selected yet.")}</dd>
                  </div>
                  <div>
                    <dt>Ask</dt>
                    <dd>{answers.ask.trim() || "No ask entered yet."}</dd>
                  </div>
                  <div>
                    <dt>Likely form</dt>
                    <dd>{answers.tradeShape}</dd>
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
