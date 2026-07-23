"use client";

import type { FormEvent, ReactNode } from "react";
import { useId, useRef, useState } from "react";

import type {
  SmartQueryClarification,
  SmartQueryInterpretation,
  SmartQuerySurface,
} from "@/lib/smart-query";

interface SmartQueryApiResponse {
  error?: string;
  interpretation?: SmartQueryInterpretation;
  refinedQuery?: string;
  target?: string;
  usedLlm?: boolean;
}

interface SmartQueryFormProps {
  action: string;
  children: ReactNode;
  className?: string;
  method?: "get";
  queryName: string;
  surface: SmartQuerySurface;
}

function formEntries(form: HTMLFormElement) {
  return [...new FormData(form).entries()]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => [name, value.trim()] as [string, string]);
}

function nativeTarget(action: string, entries: readonly [string, string][]) {
  const url = new URL(action, window.location.origin);
  url.search = "";
  for (const [name, value] of entries) {
    if (value) url.searchParams.append(name, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function mergeExplicitFields(
  target: string,
  entries: readonly [string, string][],
  queryName: string,
) {
  const url = new URL(target, window.location.origin);
  const explicitNames = new Set(
    entries
      .map(([name]) => name)
      .filter((name) => name !== queryName && !name.startsWith("smart_")),
  );
  for (const name of explicitNames) url.searchParams.delete(name);
  for (const [name, value] of entries) {
    if (!value || name === queryName || name.startsWith("smart_")) continue;
    url.searchParams.append(name, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function SmartQueryForm({
  action,
  children,
  className,
  method = "get",
  queryName,
  surface,
}: SmartQueryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const answerId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState<SmartQueryClarification | null>(null);
  const [pendingEntries, setPendingEntries] = useState<Array<[string, string]>>([]);
  const [pendingQuery, setPendingQuery] = useState("");
  const [answer, setAnswer] = useState("");

  async function interpret(
    query: string,
    entries: Array<[string, string]>,
    clarificationAnswer?: { field: string; answer: string },
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/query/interpret", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          surface,
          clarification: clarificationAnswer,
        }),
      });
      const payload = await response.json() as SmartQueryApiResponse;
      if (!response.ok || !payload.interpretation || !payload.target) {
        throw new Error(payload.error || "The query could not be interpreted.");
      }

      if (payload.interpretation.needsClarification && payload.interpretation.clarification) {
        setClarification(payload.interpretation.clarification);
        setPendingEntries(entries);
        setPendingQuery(query);
        setAnswer("");
        return;
      }

      const target = mergeExplicitFields(payload.target, entries, queryName);
      window.location.assign(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The query could not be interpreted.");
      window.location.assign(nativeTarget(action, entries));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const entries = formEntries(event.currentTarget);
    const query = entries.find(([name]) => name === queryName)?.[1] ?? "";
    if (!query) return;
    event.preventDefault();
    void interpret(query, entries);
  }

  function answerClarification(value: string) {
    if (!clarification || !value.trim() || !pendingQuery) return;
    void interpret(pendingQuery, pendingEntries, {
      field: clarification.field,
      answer: value.trim(),
    });
  }

  return (
    <form
      action={action}
      aria-busy={busy}
      className={className}
      data-smart-query-surface={surface}
      method={method}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {children}
      {clarification ? (
        <div
          aria-live="polite"
          className="status-banner smart-query-clarification"
          data-testid="smart-query-clarification"
          role="status"
        >
          <strong>One detail changes the results.</strong>
          <p>{clarification.question}</p>
          {clarification.options?.length ? (
            <div className="form-actions" aria-label="Clarification choices">
              {clarification.options.map((option) => (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  key={option}
                  onClick={() => answerClarification(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="field-grid">
              <label className="field" htmlFor={answerId}>
                <span>Your answer</span>
                <input
                  autoFocus
                  id={answerId}
                  onChange={(event) => setAnswer(event.target.value)}
                  value={answer}
                />
              </label>
              <div className="form-actions">
                <button
                  className="button button-primary"
                  disabled={busy || !answer.trim()}
                  onClick={() => answerClarification(answer)}
                  type="button"
                >
                  Continue search
                </button>
              </div>
            </div>
          )}
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() => {
              setClarification(null);
              setPendingEntries([]);
              setPendingQuery("");
            }}
            type="button"
          >
            Keep editing
          </button>
        </div>
      ) : null}
      {busy ? <p aria-live="polite">Interpreting search…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
