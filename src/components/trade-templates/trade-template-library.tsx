"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import "./trade-template-library.css";

import {
  findTradeTemplateGuideResult,
  TRADE_TEMPLATE_LIBRARY,
  type TradeTemplateFilter,
  type TradeTemplateGuideAnswers,
  type TradeTemplateGuideQuestionKey,
  type TradeTemplateLibraryEntry,
} from "@/lib/trade-template-library";

type TemplateView = "library" | "guide";

interface GuideOption {
  value: string;
  label: string;
  detail: string;
  symbol: string;
}

interface GuideQuestion {
  key: TradeTemplateGuideQuestionKey;
  prompt: string;
  helper: string;
  options: readonly GuideOption[];
}

const FILTERS: readonly { value: TradeTemplateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "money", label: "Money" },
  { value: "actions", label: "Actions" },
  { value: "groups", label: "Groups" },
];

const GUIDE_QUESTIONS: readonly GuideQuestion[] = [
  {
    key: "moves",
    prompt: "What should move?",
    helper: "Choose the main object of the exchange. You can refine every term later.",
    options: [
      { value: "action", label: "An action", detail: "A behavior, habit, or bounded commitment", symbol: "○" },
      { value: "money", label: "Money", detail: "A donation, redirect, or conditional contribution", symbol: "$" },
      { value: "skill", label: "Skill or time", detail: "A review, service, deliverable, or introduction", symbol: "◎" },
      { value: "project", label: "A shared project", detail: "A public good that needs several contributors", symbol: "↗" },
      { value: "unsure", label: "I am not sure", detail: "Keep every structure available for comparison", symbol: "+" },
    ],
  },
  {
    key: "coordination",
    prompt: "Who needs to coordinate?",
    helper: "The topology changes which terms, permissions, and fallback rules are required.",
    options: [
      { value: "two_sides", label: "Two sides", detail: "One reciprocal or sponsored arrangement", symbol: "↔" },
      { value: "market", label: "A matched market", detail: "Compatible intentions clear under a stated rule", symbol: "⇄" },
      { value: "group", label: "A group", detail: "Many contributions activate a shared outcome", symbol: "⋮" },
      { value: "team", label: "One shared team", detail: "People contribute different work to one result", symbol: "+" },
      { value: "custom", label: "Not decided", detail: "Start compositional and choose topology later", symbol: "□" },
    ],
  },
  {
    key: "trust",
    prompt: "How should it be trusted?",
    helper: "Choose the strongest method that is still proportionate and privacy-preserving.",
    options: [
      { value: "evidence", label: "Direct evidence", detail: "Receipts, artifacts, or a bounded attestation", symbol: "◇" },
      { value: "verifier", label: "Independent verifier", detail: "A named reviewer checks the agreed standard", symbol: "◈" },
      { value: "conditional", label: "Conditional activation", detail: "Nothing activates until the stated condition is met", symbol: "↗" },
      { value: "honor", label: "Honor with a record", detail: "A low-stakes promise with a clear unresolved state", symbol: "✓" },
    ],
  },
];

function guideReason(question: GuideQuestion, value: string | undefined) {
  const option = question.options.find((candidate) => candidate.value === value);
  return option ? `${question.prompt.replace("?", "")}: ${option.label}.` : null;
}

function TemplateHandoff({
  className,
  template,
}: {
  className: string;
  template: TradeTemplateLibraryEntry;
}) {
  return (
    <Link
      aria-label={`Use ${template.name} template`}
      className={className}
      href={template.handoff.href}
    >
      Use {template.name} →
    </Link>
  );
}

export function TradeTemplateLibrary() {
  const [view, setView] = useState<TemplateView>("library");
  const [filter, setFilter] = useState<TradeTemplateFilter>("all");
  const [query, setQuery] = useState("");
  const [guideStep, setGuideStep] = useState(0);
  const [guideAnswers, setGuideAnswers] = useState<TradeTemplateGuideAnswers>({});

  const guideResult = useMemo(
    () => findTradeTemplateGuideResult(guideAnswers),
    [guideAnswers],
  );
  const completedGuideAnswers = GUIDE_QUESTIONS.filter((question) => guideAnswers[question.key]).length;
  const alignedGuideQuestions = GUIDE_QUESTIONS.filter((guideQuestion) => {
    const answer = guideAnswers[guideQuestion.key];
    const guideValues = guideResult.guide[guideQuestion.key] as readonly string[];
    return Boolean(answer && guideValues.includes(answer));
  });
  const guideReasons = alignedGuideQuestions
    .map((guideQuestion) => guideReason(guideQuestion, guideAnswers[guideQuestion.key]))
    .filter((reason): reason is string => Boolean(reason));
  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return TRADE_TEMPLATE_LIBRARY.filter((template) => {
      const filters = template.filters as readonly TradeTemplateFilter[];
      const filterMatches = filter === "all" || filters.includes(filter);
      const haystack = [
        template.name,
        template.family,
        template.summary,
        template.exchangeType,
        template.sourceBasis,
      ]
        .join(" ")
        .toLowerCase();
      return filterMatches && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [filter, query]);
  const question = GUIDE_QUESTIONS[guideStep];
  const currentGuideAnswer = guideAnswers[question.key];

  function focusHeading(id: string) {
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function showLibrary() {
    setView("library");
    window.scrollTo({ top: 0, behavior: "auto" });
    focusHeading("template-library-intro-heading");
  }

  function showGuide() {
    setView("guide");
    window.scrollTo({ top: 0, behavior: "auto" });
    focusHeading("template-guide-heading");
  }

  function selectGuideOption(value: string) {
    setGuideAnswers((current) => ({ ...current, [question.key]: value }));
  }

  function moveGuideStep(nextStep: number) {
    setGuideStep(Math.max(0, Math.min(GUIDE_QUESTIONS.length - 1, nextStep)));
    focusHeading("template-guide-heading");
  }

  function showGuideResult() {
    document.getElementById("template-guide-result")?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }

  return (
    <div className="mt-template-layer mt-template-page">
      <div className="mt-template-shell">
        <header className="mt-template-header">
          <div className="mt-template-brand">
            <span aria-hidden="true" className="mt-template-mark" />
            <div className="mt-template-brand-copy">
              <strong>Trade templates</strong>
              <span>Structure first. Exact terms stay editable.</span>
            </div>
          </div>

          <div aria-label="Template tools" className="mt-template-mode-tabs" role="group">
            <button
              aria-pressed={view !== "guide"}
              className="mt-template-tab"
              onClick={showLibrary}
              type="button"
            >
              Browse templates
            </button>
            <button
              aria-pressed={view === "guide"}
              className="mt-template-tab"
              onClick={showGuide}
              type="button"
            >
              Guided match
            </button>
          </div>

          <div className="mt-template-header-actions">
            <Link className="mt-template-button mt-template-button-ghost" href="/#trade">
              ← Back to Trade
            </Link>
          </div>
        </header>

        <main className="mt-template-main" id="main-content" tabIndex={-1}>
          {view === "library" ? (
            <div className="mt-template-library-layout">
              <aside className="mt-template-intro">
                <div className="mt-template-intro-copy">
                  <p className="mt-template-kicker">Prefilled starting points</p>
                  <h1 id="template-library-intro-heading" tabIndex={-1}>Choose a template.</h1>
                  <p>
                    Click a template to open a prefilled draft. You can edit every term before
                    saving or submitting it for review.
                  </p>
                </div>
                <div className="mt-template-safety-note">
                  <strong>Draft boundary</strong>
                  Nothing is published or binding until review and confirmation. No template click
                  authorizes payment or creates a counterparty commitment.
                </div>
                <div className="mt-template-intro-actions">
                  <button
                    className="mt-template-button mt-template-button-primary"
                    onClick={showGuide}
                    type="button"
                  >
                    Help me choose →
                  </button>
                  <Link className="mt-template-button" href="/trades/new">
                    Start from blank
                  </Link>
                </div>
              </aside>

              <section className="mt-template-library" aria-labelledby="template-library-heading">
                <h2 className="sr-only" id="template-library-heading">Template library</h2>
                <div className="mt-template-toolbar">
                  <label className="mt-template-search">
                    <span aria-hidden="true">⌕</span>
                    <span className="sr-only">Search templates</span>
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by outcome, action, or mechanism…"
                      type="search"
                      value={query}
                    />
                  </label>
                  <div aria-label="Filter templates" className="mt-template-filters">
                    {FILTERS.map((option) => (
                      <button
                        aria-pressed={filter === option.value}
                        className="mt-template-filter"
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p aria-live="polite" className="mt-template-count">
                  {visibleTemplates.length} template{visibleTemplates.length === 1 ? "" : "s"} shown
                </p>

                {visibleTemplates.length ? (
                  <div className="mt-template-grid">
                    {visibleTemplates.map((template) => (
                      <article className="mt-template-card" key={template.id}>
                        <Link
                          aria-label={`Use ${template.name} template`}
                          className="mt-template-card-link"
                          href={template.handoff.href}
                        >
                          <span className="mt-template-card-head">
                            <span aria-hidden="true" className="mt-template-symbol">{template.symbol}</span>
                            <span className="mt-template-family">{template.family}</span>
                          </span>
                          <h2>{template.name}</h2>
                          <p>{template.summary}</p>
                          <span className="mt-template-card-foot">
                            <span className="mt-template-exchange-type">{template.exchangeType}</span>
                            <strong className="mt-template-card-use">Use template →</strong>
                          </span>
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-template-empty">
                    <div>
                      <strong>No template matches that search.</strong>
                      <span>Clear the search, change the filter, or start a custom draft.</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {view === "guide" ? (
            <section className="mt-template-guide" aria-labelledby="template-guide-heading">
              <div className="mt-template-guide-question">
                <div
                  aria-label={`Question ${guideStep + 1} of ${GUIDE_QUESTIONS.length}`}
                  aria-valuemax={GUIDE_QUESTIONS.length}
                  aria-valuemin={1}
                  aria-valuenow={guideStep + 1}
                  className="mt-template-guide-progress"
                  role="progressbar"
                >
                  {GUIDE_QUESTIONS.map((guideQuestion, index) => (
                    <i className={index <= guideStep ? "active" : ""} key={guideQuestion.key} />
                  ))}
                </div>
                <p className="mt-template-kicker">Question {guideStep + 1} of {GUIDE_QUESTIONS.length}</p>
                <h1 id="template-guide-heading" tabIndex={-1}>{question.prompt}</h1>
                <p>{question.helper}</p>

                <div className="mt-template-options">
                  {question.options.map((option) => (
                    <button
                      aria-pressed={currentGuideAnswer === option.value}
                      className="mt-template-option"
                      key={option.value}
                      onClick={() => selectGuideOption(option.value)}
                      type="button"
                    >
                      <i aria-hidden="true">{option.symbol}</i>
                      <span>
                        <strong>{option.label}</strong>
                        <span>{option.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-template-guide-actions">
                  <button className="mt-template-button" onClick={showLibrary} type="button">
                    Browse every template
                  </button>
                  <div>
                    <button
                      className="mt-template-button"
                      disabled={guideStep === 0}
                      onClick={() => moveGuideStep(guideStep - 1)}
                      type="button"
                    >
                      Back
                    </button>
                    {guideStep < GUIDE_QUESTIONS.length - 1 ? (
                      <button
                        className="mt-template-button mt-template-button-primary"
                        disabled={!currentGuideAnswer}
                        onClick={() => moveGuideStep(guideStep + 1)}
                        type="button"
                      >
                        Next →
                      </button>
                    ) : currentGuideAnswer ? (
                      <button
                        className="mt-template-button mt-template-button-primary"
                        onClick={showGuideResult}
                        type="button"
                      >
                        See recommendation ↓
                      </button>
                    ) : (
                      <button className="mt-template-button mt-template-button-primary" disabled type="button">
                        See recommendation ↓
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <aside className="mt-template-guide-result" id="template-guide-result">
                <p aria-live="polite" className="sr-only">
                  Recommended: {guideResult.name}
                </p>
                <p className="mt-template-kicker">
                  {completedGuideAnswers === GUIDE_QUESTIONS.length ? "Best structural fit" : "Live structural fit"}
                </p>
                <div aria-hidden="true" className="mt-template-result-symbol">{guideResult.symbol}</div>
                <h2>{guideResult.name}</h2>
                <p>{guideResult.summary}</p>
                <div className="mt-template-fit">
                  <span>Inputs aligned</span>
                  <strong>{alignedGuideQuestions.length} of {completedGuideAnswers}</strong>
                </div>
                <ul className="mt-template-guide-reasons">
                  {guideReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                <div className="mt-template-result-actions">
                  {completedGuideAnswers === GUIDE_QUESTIONS.length ? (
                    <TemplateHandoff
                      className="mt-template-button mt-template-button-primary"
                      template={guideResult}
                    />
                  ) : (
                    <span className="mt-template-result-hint">Answer all three questions to use this template.</span>
                  )}
                  <button className="mt-template-button mt-template-button-ghost" onClick={showLibrary} type="button">
                    Browse every template
                  </button>
                </div>
              </aside>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
