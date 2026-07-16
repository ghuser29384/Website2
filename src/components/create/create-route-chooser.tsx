"use client";

import Link from "next/link";
import { useState } from "react";

import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";
import {
  CREATE_ROUTE_DEFINITIONS,
  buildCreateTargetHref,
  getCreateRoute,
  type CreateMode,
  type CreateRouteDefinition,
} from "@/lib/create-routes";

import styles from "./create-route-chooser.module.css";

interface CreateRouteChooserProps {
  initialMode: CreateMode;
  isAuthenticated: boolean;
}

const ROUTE_HOVER_COLORS: Record<CreateMode, string> = {
  trade: "#dceffd",
  offset: "#eceaff",
  pool: "#f1f7cc",
  back: "#e7efe5",
};

function buildPreviewRows(route: CreateRouteDefinition): readonly DealReceiptRow[] {
  return [
    { label: "Default", value: route.receipt.baseline },
    { label: "You", value: route.receipt.commitment },
    { label: "Condition", value: route.receipt.condition },
    { label: "Maximum", value: route.receipt.exposure, emphasis: true },
  ];
}

function RouteGlyph({ mode }: { mode: CreateMode }) {
  if (mode === "offset") {
    return (
      <svg aria-hidden="true" className={styles.routeGlyph} viewBox="0 0 120 72">
        <path d="M12 18h34c8 0 14 6 14 14v5" />
        <path className={styles.glyphAccent} d="M108 54H74c-8 0-14-6-14-14v-3" />
        <path d="m40 12 8 6-8 6" />
        <path className={styles.glyphAccent} d="m80 48-8 6 8 6" />
        <rect className={styles.glyphSignal} height="22" width="34" x="43" y="25" />
      </svg>
    );
  }

  if (mode === "pool") {
    return (
      <svg aria-hidden="true" className={styles.routeGlyph} viewBox="0 0 120 72">
        <rect height="22" width="92" x="14" y="25" />
        <path className={styles.glyphAccent} d="M15 36h62" />
        <path d="M78 16v40" />
        <circle className={styles.glyphSignal} cx="24" cy="61" r="5" />
        <circle className={styles.glyphSignal} cx="43" cy="61" r="5" />
        <circle className={styles.glyphSignal} cx="62" cy="61" r="5" />
        <circle cx="81" cy="61" r="5" />
        <circle cx="100" cy="61" r="5" />
      </svg>
    );
  }

  if (mode === "back") {
    return (
      <svg aria-hidden="true" className={styles.routeGlyph} viewBox="0 0 120 72">
        <rect height="32" width="30" x="13" y="28" />
        <rect className={styles.glyphAccent} height="48" width="30" x="77" y="12" />
        <path d="M43 43h15" />
        <path className={styles.glyphAccent} d="M62 43h15" />
        <path className={styles.glyphSignal} d="m54 37 8 6-8 6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={styles.routeGlyph} viewBox="0 0 120 72">
      <circle cx="19" cy="22" r="8" />
      <circle className={styles.glyphAccent} cx="101" cy="50" r="8" />
      <path d="M31 22h53" />
      <path d="m78 16 8 6-8 6" />
      <path className={styles.glyphAccent} d="M89 50H36" />
      <path className={styles.glyphAccent} d="m42 44-8 6 8 6" />
      <rect className={styles.glyphSignal} height="16" width="22" x="49" y="28" />
    </svg>
  );
}

function SetupGlyph({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg aria-hidden="true" className={styles.stepGlyph} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="14" />
        <circle className={styles.stepGlyphSignal} cx="24" cy="24" r="4" />
        <path d="M24 4v6M24 38v6M4 24h6M38 24h6" />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg aria-hidden="true" className={styles.stepGlyph} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="17" />
        <path d="M24 13v12l8 5" />
        <path className={styles.stepGlyphSignal} d="M17 8h14" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={styles.stepGlyph} viewBox="0 0 48 48">
      <path d="M24 5 39 11v11c0 10-6 17-15 21C15 39 9 32 9 22V11l15-6Z" />
      <path className={styles.stepGlyphSignal} d="m16 24 5 5 11-12" />
    </svg>
  );
}

function OutcomeGlyph({ positive }: { positive: boolean }) {
  return positive ? (
    <svg aria-hidden="true" className={styles.outcomeGlyph} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" />
      <path d="m9 16 5 5 9-10" />
    </svg>
  ) : (
    <svg aria-hidden="true" className={styles.outcomeGlyph} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" />
      <path d="M10 16h12" />
    </svg>
  );
}

function ContinueGlyph() {
  return (
    <svg aria-hidden="true" className={styles.continueGlyph} viewBox="0 0 180 150">
      <path d="M37 24h68v102H37z" />
      <path d="m37 24 39 17v68l-39 17z" />
      <circle cx="67" cy="75" r="3" />
      <path className={styles.continueGlyphAccent} d="M91 75h54" />
      <path className={styles.continueGlyphAccent} d="m127 57 18 18-18 18" />
    </svg>
  );
}

function SafetyGlyph() {
  return (
    <svg aria-hidden="true" className={styles.safetyGlyph} viewBox="0 0 24 24">
      <path d="M12 3 20 6v6c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

export function CreateRouteChooser({ initialMode, isAuthenticated }: CreateRouteChooserProps) {
  const [selectedMode, setSelectedMode] = useState<CreateMode>(initialMode);
  const [hoveredMode, setHoveredMode] = useState<CreateMode | null>(null);
  const selectedRoute = getCreateRoute(selectedMode);
  const targetHref = buildCreateTargetHref(selectedMode, isAuthenticated);
  const primaryLabel =
    selectedRoute.authRequired && !isAuthenticated
      ? "Create account to continue"
      : selectedRoute.cta;

  function selectMode(mode: CreateMode) {
    setSelectedMode(mode);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", mode);
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="create-heading">
        <div className={styles.heroCopy}>
          <h1 id="create-heading">Choose a route.</h1>
          <p className={styles.heroText}>
            Pick a mechanism. Review the cap and fallback. Nothing is binding until final
            confirmation.
          </p>

          <ol className={styles.routePath} aria-label="Creation flow">
            <li>
              <span>1</span>
              <strong>Pick</strong>
            </li>
            <li>
              <span>2</span>
              <strong>Set terms</strong>
            </li>
            <li>
              <span>3</span>
              <strong>Confirm</strong>
            </li>
          </ol>
        </div>

        <div className={styles.heroPreview}>
          <DealReceipt
            className={styles.receipt}
            note="Preview only."
            rows={buildPreviewRows(selectedRoute)}
            state="Draft"
            title={`${selectedRoute.title} preview`}
          />
        </div>
      </section>

      <section className={`${styles.section} ${styles.routeSection}`} aria-labelledby="route-heading">
        <h2 className={styles.routeHeading} id="route-heading">
          Pick one.
        </h2>

        <div className={styles.routeGrid}>
          {CREATE_ROUTE_DEFINITIONS.map((route) => {
            const isSelected = route.key === selectedMode;
            const isHovered = route.key === hoveredMode;

            return (
              <button
                aria-controls="selected-route-panel"
                aria-pressed={isSelected}
                className={[
                  styles.routeButton,
                  isSelected ? styles.routeButtonSelected : "",
                  route.later ? styles.routeButtonLater : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-create-mode={route.key}
                key={route.key}
                onClick={() => selectMode(route.key)}
                onMouseEnter={() => setHoveredMode(route.key)}
                onMouseLeave={() => setHoveredMode(null)}
                style={isHovered ? { backgroundColor: ROUTE_HOVER_COLORS[route.key] } : undefined}
                type="button"
              >
                <span className={styles.routeMeta}>
                  <small>{route.index}</small>
                  {route.later ? <small>Review</small> : null}
                </span>
                <RouteGlyph mode={route.key} />
                <span className={styles.routeCopy}>
                  <strong>{route.title}</strong>
                  <span>{route.summary}</span>
                </span>
                <span className={styles.routeAction} aria-hidden="true">
                  {isSelected ? "✓" : "→"}
                </span>
              </button>
            );
          })}
        </div>

        <p className={styles.liveRegion} aria-live="polite">
          {selectedRoute.title} selected. {selectedRoute.summary}
        </p>
      </section>

      <section
        aria-labelledby="selected-route-heading"
        className={`${styles.section} ${styles.selectedSection}`}
        id="selected-route-panel"
      >
        <div className={styles.decisionPanel}>
          <article className={styles.decisionIntro}>
            <div className={styles.mechanismMeta}>
              <span>{selectedRoute.index}</span>
              <strong>{selectedRoute.title}</strong>
            </div>
            <RouteGlyph mode={selectedRoute.key} />
            <h2 id="selected-route-heading">{selectedRoute.headline}</h2>

            <div className={styles.outcomeGrid} aria-label={`${selectedRoute.title} outcomes`}>
              <div className={`${styles.outcomeCard} ${styles.outcomeCardPositive}`}>
                <OutcomeGlyph positive />
                <span>{selectedRoute.success.label}</span>
                <strong>{selectedRoute.success.value}</strong>
              </div>
              <div className={styles.outcomeCard}>
                <OutcomeGlyph positive={false} />
                <span>{selectedRoute.fallback.label}</span>
                <strong>{selectedRoute.fallback.value}</strong>
              </div>
            </div>

            <details className={styles.fitDetails}>
              <summary>
                Fit &amp; limits <span aria-hidden="true">+</span>
              </summary>
              <div>
                <p>
                  <strong>Works for</strong>
                  {selectedRoute.bestFor}
                </p>
                <p>
                  <strong>Not for</strong>
                  {selectedRoute.boundary}
                </p>
              </div>
            </details>
          </article>

          <article className={styles.requirementsPanel}>
            <h3>Set 3 things.</h3>
            <ol>
              {selectedRoute.requirements.map((requirement, index) => (
                <li key={requirement}>
                  <SetupGlyph index={index} />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{requirement}</strong>
                </li>
              ))}
            </ol>
          </article>

          <article className={styles.continuePanel}>
            <ContinueGlyph />
            <h3>{selectedRoute.nextTitle}</h3>
            <p>{selectedRoute.nextNote}</p>
            <div className={styles.actions}>
              <Link className="button button-primary" href={targetHref}>
                {primaryLabel}
              </Link>
              <Link className={styles.safetyLink} href="/safety">
                <SafetyGlyph />
                <span>Safety</span>
              </Link>
            </div>
            <span className={styles.actionHint}>
              {selectedRoute.authRequired && !isAuthenticated
                ? "Sign in, then return here."
                : "No charge or commitment yet."}
            </span>
          </article>
        </div>
      </section>
    </>
  );
}
