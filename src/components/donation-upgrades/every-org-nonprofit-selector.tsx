"use client";

import { useEffect, useId, useState } from "react";

import type { EveryOrgNonprofitSearchResult } from "@/lib/direct-donation-upgrade";

interface EveryOrgNonprofitSelectorProps {
  inputName: string;
  label: string;
  description: string;
  placeholder?: string;
  defaultQuery?: string;
}

export function EveryOrgNonprofitSelector({
  inputName,
  label,
  description,
  placeholder = "Search Every.org nonprofits",
  defaultQuery = "",
}: EveryOrgNonprofitSelectorProps) {
  const id = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<EveryOrgNonprofitSearchResult[]>([]);
  const [selected, setSelected] = useState<EveryOrgNonprofitSearchResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (selected || normalized.length < 2) {
      setResults([]);
      setStatus("idle");
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setError("");
      try {
        const response = await fetch(
          `/api/donation-upgrades/nonprofits/search?q=${encodeURIComponent(normalized)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: EveryOrgNonprofitSearchResult[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Nonprofit search failed.");
        setResults(Array.isArray(payload.results) ? payload.results : []);
        setStatus("ready");
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setResults([]);
        setStatus("error");
        setError(searchError instanceof Error ? searchError.message : "Nonprofit search failed.");
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  return (
    <fieldset className="form-stack" aria-describedby={`${id}-description`}>
      <legend>{label}</legend>
      <p className="field-note" id={`${id}-description`}>{description}</p>
      <input name={inputName} type="hidden" value={selected?.identifier ?? ""} />

      {selected ? (
        <div className="panel data-card" aria-live="polite">
          <p className="detail-kicker">Selected Every.org recipient</p>
          <h3>{selected.name}</h3>
          <p>
            every.org/{selected.primarySlug}
            {selected.ein ? ` · EIN ${selected.ein}` : ""}
          </p>
          {selected.description ? <p className="field-note">{selected.description}</p> : null}
          <button
            className="button button-secondary"
            onClick={() => {
              setSelected(null);
              setQuery(selected.name);
            }}
            type="button"
          >
            Change recipient
          </button>
        </div>
      ) : (
        <div className="form-stack">
          <label htmlFor={`${id}-query`}>
            Search by nonprofit name, slug, or EIN
            <input
              autoComplete="off"
              id={`${id}-query`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              type="search"
              value={query}
            />
          </label>
          <div aria-live="polite" className="field-note">
            {status === "loading" ? "Searching Every.org…" : null}
            {status === "error" ? error : null}
            {status === "ready" && !results.length
              ? "No eligible Every.org nonprofits matched that search."
              : null}
          </div>
          {results.length ? (
            <div className="data-grid" role="listbox" aria-label={`${label} search results`}>
              {results.map((result) => (
                <button
                  aria-label={`Select ${result.name}`}
                  className="panel data-card"
                  key={`${result.identifier}:${result.ein}`}
                  onClick={() => {
                    setSelected(result);
                    setQuery(result.name);
                    setResults([]);
                  }}
                  role="option" aria-selected={false}
                  type="button"
                >
                  <span className="detail-kicker">Every.org nonprofit</span>
                  <strong>{result.name}</strong>
                  <span className="field-note">
                    every.org/{result.primarySlug}
                    {result.ein ? ` · EIN ${result.ein}` : ""}
                  </span>
                  {result.description ? (
                    <span className="field-note">{result.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </fieldset>
  );
}
