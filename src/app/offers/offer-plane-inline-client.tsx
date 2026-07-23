"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import type { OfferPlaneItem } from "@/lib/offer-plane";

import styles from "./offer-plane-inline.module.css";

type SourceFilter = "all" | OfferPlaneItem["source"];
type ModeFilter = "all" | OfferPlaneItem["mode"];
type EvidenceFilter = "all" | "light" | "structured";

interface OfferPlaneInlineClientProps {
  initialCause?: string;
  initialMode?: ModeFilter;
  initialQuery?: string;
  items: OfferPlaneItem[];
  liveOffersAvailable: boolean;
}

const EXPOSURE_OPTIONS = [
  { label: "Any stated maximum", value: "any" },
  { label: "$25 or less", value: "2500" },
  { label: "$100 or less", value: "10000" },
  { label: "$500 or less", value: "50000" },
  { label: "$1,000 or less", value: "100000" },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function modeLabel(mode: OfferPlaneItem["mode"]) {
  if (mode === "offset") return "Donation offset";
  if (mode === "payment") return "Paid action";
  return "Pledge swap";
}

function sourceLabel(source: OfferPlaneItem["source"]) {
  return source === "live" ? "Live offer" : "Worked example";
}

function formatMoney(cents: number | null) {
  if (cents === null) return "No monetary exposure stated";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function evidenceLevel(item: OfferPlaneItem): EvidenceFilter {
  const text = item.verification.toLowerCase();
  return /manual|evidence|receipt|witness|payment/.test(text) ? "structured" : "light";
}

function searchMatches(item: OfferPlaneItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    item.title,
    item.actionRequested,
    item.actionReturned,
    item.offererName,
    item.verification,
    item.duration,
    ...item.causeAreas,
  ]
    .join(" ")
    .toLowerCase();

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function fitScore(item: OfferPlaneItem, maxChallenge: number, minReturn: number) {
  const challengeHeadroom = Math.max(0, maxChallenge - item.challengeScore);
  const returnHeadroom = Math.max(0, item.returnScore - minReturn);
  return returnHeadroom * 1.3 + challengeHeadroom * 0.7 + (item.creditScore ?? 45) * 0.06;
}

function stableJitter(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return {
    x: ((hash % 9) - 4) * 0.45,
    y: (Math.floor(hash / 9) % 9 - 4) * 0.45,
  };
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const displayed = value ?? 0;

  return (
    <div className={styles.scoreBar}>
      <div>
        <span>{label}</span>
        <strong>{value ?? "Unrated"}</strong>
      </div>
      <span aria-hidden="true" className={styles.scoreTrack}>
        <span style={{ width: `${displayed}%` }} />
      </span>
    </div>
  );
}

export function OfferPlaneInlineClient({
  initialCause = "all",
  initialMode = "all",
  initialQuery = "",
  items,
  liveOffersAvailable,
}: OfferPlaneInlineClientProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [maxChallenge, setMaxChallenge] = useState(72);
  const [minReturn, setMinReturn] = useState(42);
  const [query, setQuery] = useState(initialQuery);
  const [cause, setCause] = useState(initialCause);
  const [source, setSource] = useState<SourceFilter>("all");
  const [mode, setMode] = useState<ModeFilter>(initialMode);
  const [evidence, setEvidence] = useState<EvidenceFilter>("all");
  const [maxExposure, setMaxExposure] = useState("any");
  const [minimumReliability, setMinimumReliability] = useState(0);
  const [includeUnrated, setIncludeUnrated] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [dragging, setDragging] = useState(false);

  const causes = useMemo(
    () => [...new Set(items.flatMap((item) => item.causeAreas))].sort((left, right) => left.localeCompare(right)),
    [items],
  );

  const effectiveCause = causes.includes(cause) ? cause : "all";

  const facetMatches = useMemo(() => {
    const exposureLimit = maxExposure === "any" ? null : Number.parseInt(maxExposure, 10);

    return items.filter((item) => {
      if (!searchMatches(item, query)) return false;
      if (effectiveCause !== "all" && !item.causeAreas.includes(effectiveCause)) return false;
      if (source !== "all" && item.source !== source) return false;
      if (mode !== "all" && item.mode !== mode) return false;
      if (evidence !== "all" && evidenceLevel(item) !== evidence) return false;

      if (exposureLimit !== null) {
        const effectiveExposure =
          item.maxExposureCents ?? (item.mode === "pledge" ? 0 : Number.POSITIVE_INFINITY);
        if (effectiveExposure > exposureLimit) return false;
      }

      if (item.creditScore === null) return includeUnrated;
      return item.creditScore >= minimumReliability;
    });
  }, [effectiveCause, evidence, includeUnrated, items, maxExposure, minimumReliability, mode, query, source]);

  const matchingItems = useMemo(
    () =>
      facetMatches
        .filter((item) => item.challengeScore <= maxChallenge && item.returnScore >= minReturn)
        .sort(
          (left, right) =>
            fitScore(right, maxChallenge, minReturn) - fitScore(left, maxChallenge, minReturn) ||
            right.returnScore - left.returnScore ||
            left.challengeScore - right.challengeScore,
        ),
    [facetMatches, maxChallenge, minReturn],
  );

  const visibleIds = useMemo(() => new Set(facetMatches.map((item) => item.id)), [facetMatches]);
  const matchingIds = useMemo(() => new Set(matchingItems.map((item) => item.id)), [matchingItems]);
  const selectedCandidate = items.find((item) => item.id === selectedId) ?? null;
  const selected =
    selectedCandidate && visibleIds.has(selectedCandidate.id)
      ? selectedCandidate
      : matchingItems[0] ?? facetMatches[0] ?? null;

  function updateThresholds(event: ReactPointerEvent<HTMLDivElement>) {
    const plot = plotRef.current;
    if (!plot) return;

    const bounds = plot.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    setMaxChallenge(Math.round(x * 100));
    setMinReturn(Math.round((1 - y) * 100));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, select")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateThresholds(event);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updateThresholds(event);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function resetFilters() {
    setMaxChallenge(72);
    setMinReturn(42);
    setQuery(initialQuery);
    setCause(causes.includes(initialCause) ? initialCause : "all");
    setSource("all");
    setMode(initialMode);
    setEvidence("all");
    setMaxExposure("any");
    setMinimumReliability(0);
    setIncludeUnrated(true);
  }

  return (
    <section className={styles.explorer} id="challenge-return-explorer" aria-labelledby="challenge-return-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Ordinary offer search</p>
          <h2 id="challenge-return-heading">Find moral trades by challenge and return.</h2>
          <p>
            Each dot is an ordinary Moral Trade offer or worked example. Click or drag on the plane
            to set the most challenging action you would accept and the minimum return you want.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/create?mode=trade">Create a pledge swap</Link>
          <button type="button" onClick={resetFilters}>Reset plane</button>
        </div>
      </header>

      <div className={styles.boundaryNote} role="note">
        <strong>Discovery heuristics, not moral rankings.</strong>
        <span>
          Return is estimated from the public terms. Offerer reliability uses public platform history
          only; it is not a consumer credit score. Public-goods rounds are excluded from this plane.
        </span>
      </div>

      {!liveOffersAvailable ? (
        <div className={styles.dataNotice} role="status">
          Live offers could not be loaded, so the plane currently shows worked examples only.
        </div>
      ) : null}

      <div className={styles.quickFilters} aria-label="Challenge-return offer filters">
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>Search terms</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Vegetarian, climate, donation…"
            type="search"
            value={query}
          />
        </label>

        <label className={styles.field}>
          <span>Cause area</span>
          <select value={effectiveCause} onChange={(event) => setCause(event.target.value)}>
            <option value="all">All causes</option>
            {causes.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Offer type</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as ModeFilter)}>
            <option value="all">All ordinary offers</option>
            <option value="pledge">Pledge swaps</option>
            <option value="offset">Donation offsets</option>
            <option value="payment">Paid actions</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
            <option value="all">Live + examples</option>
            <option value="live">Live offers</option>
            <option value="worked_example">Worked examples</option>
          </select>
        </label>
      </div>

      <details className={styles.advancedFilters}>
        <summary>More filters</summary>
        <div>
          <label className={styles.field}>
            <span>Evidence needed</span>
            <select value={evidence} onChange={(event) => setEvidence(event.target.value as EvidenceFilter)}>
              <option value="all">Any evidence level</option>
              <option value="light">Light-touch</option>
              <option value="structured">Structured review</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Most this can cost</span>
            <select value={maxExposure} onChange={(event) => setMaxExposure(event.target.value)}>
              {EXPOSURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.rangeField}>
            <span>
              <span>Minimum offerer reliability</span>
              <strong>{minimumReliability}</strong>
            </span>
            <input
              max="100"
              min="0"
              onChange={(event) => setMinimumReliability(Number(event.target.value))}
              step="1"
              type="range"
              value={minimumReliability}
            />
          </label>

          <label className={styles.checkRow}>
            <input
              checked={includeUnrated}
              onChange={(event) => setIncludeUnrated(event.target.checked)}
              type="checkbox"
            />
            <span>Include unrated offers and worked examples</span>
          </label>
        </div>
      </details>

      <div className={styles.workspace}>
        <div className={styles.plotPanel}>
          <div className={styles.plotHeader}>
            <div>
              <p>Click or drag to move the threshold</p>
              <h3>Acceptable region</h3>
            </div>
            <div className={styles.thresholdBadges} aria-live="polite">
              <span>Challenge ≤ {maxChallenge}</span>
              <span>Return ≥ {minReturn}</span>
              <strong>{matchingItems.length} match</strong>
            </div>
          </div>

          <div className={styles.plotFrame}>
            <span className={styles.yTitle}>Return</span>
            <div
              aria-label="Offer plane. Horizontal axis is challengingness. Vertical axis is estimated return."
              className={`${styles.plot} ${dragging ? styles.dragging : ""}`}
              onPointerCancel={handlePointerEnd}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              ref={plotRef}
            >
              <div
                aria-hidden="true"
                className={styles.acceptableRegion}
                style={{ height: `${100 - minReturn}%`, width: `${maxChallenge}%` }}
              />
              <span aria-hidden="true" className={styles.verticalThreshold} style={{ left: `${maxChallenge}%` }} />
              <span aria-hidden="true" className={styles.horizontalThreshold} style={{ top: `${100 - minReturn}%` }} />
              <span
                aria-hidden="true"
                className={styles.thresholdHandle}
                style={{ left: `${maxChallenge}%`, top: `${100 - minReturn}%` }}
              />

              {facetMatches.map((item) => {
                const jitter = stableJitter(item.id);
                const isMatching = matchingIds.has(item.id);
                const isSelected = selected?.id === item.id;
                const pointStyle = {
                  "--point-x": `${clamp(item.challengeScore + jitter.x, 1.5, 98.5)}%`,
                  "--point-y": `${clamp(100 - item.returnScore + jitter.y, 1.5, 98.5)}%`,
                } as CSSProperties;

                return (
                  <button
                    aria-label={`${item.title}. Challenge ${item.challengeScore}; return ${item.returnScore}.`}
                    className={`${styles.dot} ${isMatching ? styles.dotMatching : styles.dotOutside} ${isSelected ? styles.dotSelected : ""}`}
                    data-mode={item.mode}
                    key={item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(item.id);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={pointStyle}
                    title={`${item.title} — challenge ${item.challengeScore}, return ${item.returnScore}`}
                    type="button"
                  >
                    <span className={styles.dotLabel}>{item.challengeScore}/{item.returnScore}</span>
                  </button>
                );
              })}

              <span aria-hidden="true" className={`${styles.cornerLabel} ${styles.highReturn}`}>Higher return</span>
              <span aria-hidden="true" className={`${styles.cornerLabel} ${styles.lowReturn}`}>Lower return</span>
              <span aria-hidden="true" className={`${styles.cornerLabel} ${styles.lowChallenge}`}>Easier</span>
              <span aria-hidden="true" className={`${styles.cornerLabel} ${styles.highChallenge}`}>More challenging</span>
            </div>
            <span className={styles.xTitle}>Challengingness</span>
          </div>

          <div className={styles.accessibleThresholds}>
            <label className={styles.rangeField}>
              <span>
                <span>Maximum challengingness</span>
                <strong>{maxChallenge}</strong>
              </span>
              <input
                max="100"
                min="0"
                onChange={(event) => setMaxChallenge(Number(event.target.value))}
                step="1"
                type="range"
                value={maxChallenge}
              />
            </label>
            <label className={styles.rangeField}>
              <span>
                <span>Minimum return</span>
                <strong>{minReturn}</strong>
              </span>
              <input
                max="100"
                min="0"
                onChange={(event) => setMinReturn(Number(event.target.value))}
                step="1"
                type="range"
                value={minReturn}
              />
            </label>
          </div>
        </div>

        <aside className={styles.inspector} aria-live="polite">
          {selected ? (
            <>
              <div className={styles.inspectorMeta}>
                <span>{sourceLabel(selected.source)}</span>
                <span>{modeLabel(selected.mode)}</span>
                <strong>{matchingIds.has(selected.id) ? "Inside thresholds" : "Outside thresholds"}</strong>
              </div>
              <h3>{selected.title}</h3>
              <p className={styles.offerer}>Offered by {selected.offererName}</p>

              <dl className={styles.actionList}>
                <div>
                  <dt>You would do</dt>
                  <dd>{selected.actionRequested}</dd>
                </div>
                <div>
                  <dt>You would receive</dt>
                  <dd>{selected.actionReturned}</dd>
                </div>
              </dl>

              <div className={styles.scoreGrid}>
                <ScoreBar label="Challenge" value={selected.challengeScore} />
                <ScoreBar label="Return" value={selected.returnScore} />
                <ScoreBar label="Offerer reliability" value={selected.creditScore} />
              </div>

              <dl className={styles.factGrid}>
                <div>
                  <dt>Duration</dt>
                  <dd>{selected.duration}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{selected.verification}</dd>
                </div>
                <div>
                  <dt>Exposure</dt>
                  <dd>{formatMoney(selected.maxExposureCents)}</dd>
                </div>
                <div>
                  <dt>Causes</dt>
                  <dd>{selected.causeAreas.join(", ") || "Not classified"}</dd>
                </div>
              </dl>

              <details className={styles.explanation}>
                <summary>How these scores were estimated</summary>
                <div>
                  <strong>Challenge</strong>
                  <ul>{selected.scoreExplanation.challenge.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <strong>Return</strong>
                  <ul>{selected.scoreExplanation.return.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <strong>Offerer reliability</strong>
                  <ul>{selected.scoreExplanation.credit.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                </div>
              </details>

              <Link className={styles.primaryAction} href={selected.href}>Review full offer</Link>
            </>
          ) : (
            <div className={styles.emptyInspector}>
              <strong>No offers match these filters.</strong>
              <p>Loosen a threshold, include worked examples, or reset the plane.</p>
              <button type="button" onClick={resetFilters}>Reset plane</button>
            </div>
          )}
        </aside>
      </div>

      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.kicker}>Current matches</p>
          <h3>{matchingItems.length} {matchingItems.length === 1 ? "offer" : "offers"} in the shaded region</h3>
        </div>
        <span>Dots remain visible outside the region so you can inspect near misses.</span>
      </div>

      {matchingItems.length ? (
        <div className={styles.resultGrid}>
          {matchingItems.slice(0, 6).map((item) => (
            <article className={styles.resultCard} key={item.id}>
              <div>
                <span>{sourceLabel(item.source)}</span>
                <span>{modeLabel(item.mode)}</span>
              </div>
              <h4>{item.title}</h4>
              <p>{item.actionRequested}</p>
              <dl>
                <div><dt>Challenge</dt><dd>{item.challengeScore}</dd></div>
                <div><dt>Return</dt><dd>{item.returnScore}</dd></div>
                <div><dt>Reliability</dt><dd>{item.creditScore ?? "Unrated"}</dd></div>
              </dl>
              <button type="button" onClick={() => setSelectedId(item.id)}>Inspect dot</button>
              <Link href={item.href}>Open offer</Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
