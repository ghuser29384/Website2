"use client";

import Link from "next/link";
import { useState } from "react";

import {
  CREATE_ROUTE_DEFINITIONS,
  buildCreateTargetHref,
  getCreateRoute,
  type CreateMode,
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
          <h1 id="create-heading">What do you want to create?</h1>
          <p>
            Choose one route. The page will show what happens when it succeeds and what happens
            when it does not.
          </p>
        </div>

        <div className={styles.heroBoundary}>
          <strong>Nothing happens on this page.</strong>
          <span>No charge, publication, or commitment until a later confirmation.</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.routeSection}`} aria-labelledby="route-heading">
        <h2 className={styles.routeHeading} id="route-heading">
          Choose one.
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
                  {route.later ? <small>Reviewed</small> : null}
                </span>
                <RouteGlyph mode={route.key} />
                <span className={styles.routeCopy}>
                  <strong>{route.title}</strong>
                  <span>{route.summary}</span>
                </span>
                <span className={styles.routeChoice}>
                  {isSelected ? "Selected" : "Choose"}
                  <span aria-hidden="true">{isSelected ? "✓" : "→"}</span>
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
          <article className={styles.explanationPanel}>
            <div className={styles.selectedHeader}>
              <span>{selectedRoute.title}</span>
              <h2 id="selected-route-heading">{selectedRoute.headline}</h2>
              <p>{selectedRoute.proposition}</p>
            </div>

            <div className={styles.flowBlock}>
              <h3>How it works</h3>
              <ol className={styles.flowList}>
                {selectedRoute.requirements.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className={styles.outcomeBlock} aria-label={`${selectedRoute.title} outcomes`}>
              <div className={styles.successOutcome}>
                <span>If {selectedRoute.success.label.toLowerCase()}</span>
                <strong>{selectedRoute.success.value}</strong>
              </div>
              <div className={styles.fallbackOutcome}>
                <span>If {selectedRoute.fallback.label.toLowerCase()}</span>
                <strong>{selectedRoute.fallback.value}</strong>
              </div>
            </div>

            <details className={styles.fitDetails}>
              <summary>
                Who this is for <span aria-hidden="true">+</span>
              </summary>
              <div>
                <p>
                  <strong>Good fit</strong>
                  {selectedRoute.bestFor}
                </p>
                <p>
                  <strong>Not for</strong>
                  {selectedRoute.boundary}
                </p>
              </div>
            </details>
          </article>

          <aside className={styles.actionPanel} aria-labelledby="next-step-heading">
            <span>Next step</span>
            <h3 id="next-step-heading">{selectedRoute.nextTitle}</h3>
            <p>{selectedRoute.nextNote}</p>
            <Link className="button button-primary" href={targetHref}>
              {primaryLabel}
            </Link>
            <small>
              {selectedRoute.authRequired && !isAuthenticated
                ? "Sign in, then return to this route."
                : "No charge or commitment yet."}
            </small>
            <Link className={styles.safetyLink} href="/safety">
              Read the safety rules
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
