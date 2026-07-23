"use client";

import { useEffect } from "react";

import type {
  SmartQueryClarification,
  SmartQueryInterpretation,
  SmartQuerySurface,
} from "@/lib/smart-query";

interface SmartQueryApiResponse {
  error?: string;
  interpretation?: SmartQueryInterpretation;
  target?: string;
}

const SURFACE_BY_PATH: Record<string, SmartQuerySurface> = {
  "/offers": "offers",
  "/people": "people",
  "/wish-registry": "wishes",
  "/evidence": "evidence",
  "/pools": "pools",
  "/mpgf/pools": "mpgf_pools",
};

function entriesFor(form: HTMLFormElement) {
  return [...new FormData(form).entries()]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => [name, value.trim()] as [string, string]);
}

function queryEntry(entries: readonly [string, string][]) {
  return entries.find(([name]) => ["search", "q", "query"].includes(name));
}

function surfaceFor(form: HTMLFormElement) {
  const action = new URL(form.action || window.location.href, window.location.origin);
  return SURFACE_BY_PATH[action.pathname] ?? null;
}

function nativeTarget(form: HTMLFormElement, entries: readonly [string, string][]) {
  const target = new URL(form.action || window.location.href, window.location.origin);
  target.search = "";
  for (const [name, value] of entries) {
    if (value) target.searchParams.append(name, value);
  }
  return `${target.pathname}${target.search}${target.hash}`;
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

function clearGenerated(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>("[data-smart-query-generated]").forEach((node) => node.remove());
}

function button(label: string, onClick: () => void) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "button button-secondary";
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function renderClarification(
  form: HTMLFormElement,
  clarification: SmartQueryClarification,
  onAnswer: (answer: string) => void,
) {
  clearGenerated(form);
  const panel = document.createElement("div");
  panel.className = "status-banner smart-query-clarification";
  panel.dataset.smartQueryGenerated = "true";
  panel.dataset.testid = "smart-query-clarification";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");

  const heading = document.createElement("strong");
  heading.textContent = "One detail changes the results.";
  const question = document.createElement("p");
  question.textContent = clarification.question;
  panel.append(heading, question);

  const actions = document.createElement("div");
  actions.className = "form-actions";
  if (clarification.options?.length) {
    clarification.options.forEach((option) => actions.append(button(option, () => onAnswer(option))));
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("aria-label", "Clarification answer");
    input.autocomplete = "off";
    const submit = button("Continue search", () => {
      if (input.value.trim()) onAnswer(input.value.trim());
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (input.value.trim()) onAnswer(input.value.trim());
      }
    });
    actions.append(input, submit);
    queueMicrotask(() => input.focus());
  }

  actions.append(button("Keep editing", () => clearGenerated(form)));
  panel.append(actions);
  form.append(panel);
}

async function interpretAndNavigate({
  clarification,
  entries,
  form,
  query,
  queryName,
  surface,
}: {
  clarification?: { field: string; answer: string };
  entries: Array<[string, string]>;
  form: HTMLFormElement;
  query: string;
  queryName: string;
  surface: SmartQuerySurface;
}) {
  form.setAttribute("aria-busy", "true");
  clearGenerated(form);
  try {
    const response = await fetch("/api/query/interpret", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, surface, clarification }),
    });
    const payload = await response.json() as SmartQueryApiResponse;
    if (!response.ok || !payload.interpretation || !payload.target) {
      throw new Error(payload.error || "The query could not be interpreted.");
    }

    if (payload.interpretation.needsClarification && payload.interpretation.clarification) {
      const prompt = payload.interpretation.clarification;
      renderClarification(form, prompt, (answer) => {
        void interpretAndNavigate({
          clarification: { field: prompt.field, answer },
          entries,
          form,
          query,
          queryName,
          surface,
        });
      });
      return;
    }

    window.location.assign(mergeExplicitFields(payload.target, entries, queryName));
  } catch {
    window.location.assign(nativeTarget(form, entries));
  } finally {
    form.removeAttribute("aria-busy");
  }
}

export function SmartQueryAutoEnhancer() {
  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.matches("[data-smart-query-surface], .topbar-search")) return;
      if ((form.method || "get").toLowerCase() !== "get") return;
      const surface = surfaceFor(form);
      if (!surface) return;

      const entries = entriesFor(form);
      const queryField = queryEntry(entries);
      if (!queryField?.[1]) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void interpretAndNavigate({
        entries,
        form,
        query: queryField[1],
        queryName: queryField[0],
        surface,
      });
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
