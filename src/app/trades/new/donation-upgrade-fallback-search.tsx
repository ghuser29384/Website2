"use client";

import { useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

interface SearchResult {
  identifier: string;
  name: string;
  description: string;
  ein: string | null;
  slug: string;
  profileUrl: string;
  websiteUrl: string | null;
}

export interface DonationUpgradeDestinationRequest {
  id: string;
  display_name: string;
  nonprofit_slug: string;
  nonprofit_ein: string;
  website_url: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string;
  destination_id: string | null;
  created_at: string;
}

interface SearchResponse {
  results?: SearchResult[];
  configured?: boolean;
  error?: string;
}

function RequestButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-secondary" type="submit" disabled={disabled || pending}>
      {pending ? "Requesting review…" : "Request this charity"}
    </button>
  );
}

function requestStatus(request: DonationUpgradeDestinationRequest) {
  if (request.status === "approved") return "Approved — available in the charity selectors";
  if (request.status === "rejected") return "Not approved";
  return "Under review";
}

export function DonationUpgradeFallbackSearch({
  action,
  requests,
}: {
  action: (formData: FormData) => void | Promise<void>;
  requests: DonationUpgradeDestinationRequest[];
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "ready" | "empty" | "unavailable"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
      setSearchState("idle");
      setMessage("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchState("loading");
      setMessage("");
      try {
        const response = await fetch(
          `/api/donation-upgrade/nonprofits/search?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json()) as SearchResponse;
        if (!response.ok) {
          setResults([]);
          setSearchState("unavailable");
          setMessage(
            payload.configured === false
              ? "Charity search is not configured yet."
              : payload.error || "Charity search is temporarily unavailable.",
          );
          return;
        }

        const nextResults = Array.isArray(payload.results) ? payload.results : [];
        setResults(nextResults);
        setSearchState(nextResults.length ? "ready" : "empty");
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchState("unavailable");
        setMessage(
          error instanceof Error
            ? "Charity search is temporarily unavailable."
            : "Unable to search charities.",
        );
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="panel form-stack">
      <div className="form-stack">
        <label htmlFor={searchId}>Search Every.org</label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          autoComplete="off"
          placeholder="Charity name, city, or cause"
        />
        <p className="field-note">
          Search Every.org’s nonprofit directory. Moral Trade re-fetches the exact provider
          record before storing a request, so browser-supplied charity details are never trusted.
        </p>
      </div>

      <div aria-live="polite">
        {searchState === "loading" ? <p>Searching charities…</p> : null}
        {searchState === "empty" ? <p>No eligible directory results matched that search.</p> : null}
        {searchState === "unavailable" ? (
          <div className="status-banner status-banner-error" role="status">
            {message}
          </div>
        ) : null}
      </div>

      {results.length ? (
        <div className="data-grid" role="list" aria-label="Every.org charity search results">
          {results.map((result) => {
            const isSelected = selected?.identifier === result.identifier;
            return (
              <article className="data-card" key={`${result.identifier}:${result.slug}`} role="listitem">
                <p className="detail-kicker">Every.org</p>
                <h3>{result.name}</h3>
                {result.description ? <p>{result.description}</p> : null}
                <p className="field-note">
                  {result.ein ? `EIN ${result.ein}` : `Provider slug ${result.slug}`}
                </p>
                <div className="button-row">
                  <button
                    className={isSelected ? "button button-primary" : "button button-secondary"}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelected(result)}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                  <a
                    className="button button-secondary"
                    href={result.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Every.org record
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <form action={action} className="form-stack">
        <input
          type="hidden"
          name="every_org_identifier"
          value={selected?.identifier ?? ""}
        />
        {selected ? (
          <div className="status-banner" role="status">
            Request review of <strong>{selected.name}</strong>. An approved charity appears in
            both destination selectors; requesting review does not create a payment authorization.
          </div>
        ) : null}
        <RequestButton disabled={!selected} />
      </form>

      {requests.length ? (
        <div className="form-stack">
          <h3>Your recent charity requests</h3>
          <div className="data-grid">
            {requests.map((request) => (
              <article className="data-card" key={request.id}>
                <p className="detail-kicker">{requestStatus(request)}</p>
                <h3>{request.display_name}</h3>
                <p>
                  Every.org slug <code>{request.nonprofit_slug}</code>
                  {request.nonprofit_ein ? ` · EIN ${request.nonprofit_ein}` : ""}
                </p>
                {request.review_notes ? <p>{request.review_notes}</p> : null}
                <a
                  className="button button-secondary"
                  href={request.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View frozen provider record
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
