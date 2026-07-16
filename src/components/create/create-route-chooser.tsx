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

function ChoiceGlyph({ selected }: { selected: boolean }) {
  return selected ? (
    <svg aria-hidden="true" className={styles.choiceGlyph} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m7.8 12.2 2.8 2.8 5.8-6" />
    </svg>
  ) : (
    <svg aria-hidden="true" className={styles.choiceGlyph} viewBox="0 0 24 24">
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function FlowArrow() {
  return (
    <svg aria-hidden="true" className={styles.flowArrow} viewBox="0 0 28 28">
      <path d="M3 14h20" />
      <path d="m17 8 6 6-6 6" />
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

export function CreateRouteChooser({ initialMode, isAuthenticated }: CreateRouteChooserProps) {
  const [selectedMode, setSelectedMode] = useState<CreateMode>(initialMode);
  const [hoveredMode, setHoveredMode] = useState<CreateMode | null>(null);
  const selectedRoute = getCreateRoute(selectedMode);
  const targetHref = buildCreateTargetHref(selectedMode, isAuthenticated);
  const primaryLabel =
    selectedRoute.authRequired && !isAuthenticated ? "Sign up to draft" : selectedRoute.cta;

  function selectMode(mode: CreateMode) {
    setSelectedMode(mode);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", mode);
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <section className={styles.workbench} aria-labelledby="create-heading">
      <header className={styles.intro}>
        <h1 id="create-heading">Create.</h1>
        <p>Choose a route. Nothing happens until you confirm.</p>
      </header>

      <div className={styles.routeGrid} role="group" aria-label="Creation routes">
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
              <RouteGlyph mode={route.key} />
              <span className={styles.routeCopy}>
                <strong>{route.title}</strong>
                <span>{route.summary}</span>
              </span>
              <span className={styles.routeChoice}>
                <ChoiceGlyph selected={isSelected} />
              </span>
            </button>
          );
        })}
      </div>

      <p className={styles.liveRegion} aria-live="polite">
        {selectedRoute.title} selected. {selectedRoute.summary}
      </p>

      <div
        aria-labelledby="selected-route-heading"
        className={styles.routeDetail}
        id="selected-route-panel"
      >
        <article className={styles.mechanismPanel}>
          <header className={styles.detailHeader}>
            <span>{selectedRoute.title}</span>
            <h2 id="selected-route-heading">{selectedRoute.headline}</h2>
          </header>

          <ol className={styles.flowList} aria-label={`${selectedRoute.title} process`}>
            {selectedRoute.requirements.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
                {index < selectedRoute.requirements.length - 1 ? <FlowArrow /> : null}
              </li>
            ))}
          </ol>

          <div className={styles.outcomeBlock} aria-label={`${selectedRoute.title} outcomes`}>
            <div className={styles.successOutcome}>
              <OutcomeGlyph positive />
              <span>{selectedRoute.success.label}</span>
              <strong>{selectedRoute.success.value}</strong>
            </div>
            <div className={styles.fallbackOutcome}>
              <OutcomeGlyph positive={false} />
              <span>{selectedRoute.fallback.label}</span>
              <strong>{selectedRoute.fallback.value}</strong>
            </div>
          </div>

          <details className={styles.fitDetails}>
            <summary>
              Details <span aria-hidden="true">+</span>
            </summary>
            <div>
              <p>
                <strong>Best for</strong>
                {selectedRoute.bestFor}
              </p>
              <p>
                <strong>Not for</strong>
                {selectedRoute.boundary}
              </p>
            </div>
          </details>
        </article>

        <aside className={styles.actionPanel} aria-label={`${selectedRoute.title} next action`}>
          <RouteGlyph mode={selectedRoute.key} />
          <Link className="button button-primary" href={targetHref}>
            {primaryLabel}
          </Link>
          <span className={styles.boundaryNote}>
            {selectedRoute.authRequired && !isAuthenticated
              ? "Sign in, then return here."
              : "No charge yet."}
          </span>
          <Link className={styles.safetyLink} href="/safety">
            Safety rules
          </Link>
        </aside>
      </div>
    </section>
  );
}
