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

const CREATE_FLOW = [
  {
    description:
      "Record what would happen without the proposal. If the baseline is not credible, the proposal should stop.",
    number: "01",
    title: "Default",
  },
  {
    description:
      "Make the exchange concrete: actions, amounts, timing, conditions, and maximum exposure.",
    number: "02",
    title: "Terms",
  },
  {
    description:
      "Choose the least intrusive proof that can demonstrate performance and name who reviews it.",
    number: "03",
    title: "Evidence",
  },
  {
    description:
      "Read one frozen summary of the terms, evidence, settlement, externalities, and exit rules.",
    number: "04",
    title: "Receipt",
  },
  {
    description:
      "Only then move from a draft to a separately confirmed authorization state.",
    number: "05",
    title: "Authorize",
  },
] as const;

function buildPreviewRows(route: CreateRouteDefinition): readonly DealReceiptRow[] {
  return [
    { label: "Without this deal", value: route.receipt.baseline },
    { label: "Your commitment", value: route.receipt.commitment },
    { label: "Other commitments", value: route.receipt.other },
    { label: "Condition", value: route.receipt.condition },
    { label: "Maximum exposure", value: route.receipt.exposure, emphasis: true },
    { label: "Evidence", value: route.receipt.evidence },
    { label: "Exit", value: route.receipt.exit },
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

export function CreateRouteChooser({ initialMode, isAuthenticated }: CreateRouteChooserProps) {
  const [selectedMode, setSelectedMode] = useState<CreateMode>(initialMode);
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
          <p className="mt-product-kicker">Create</p>
          <h1 id="create-heading">Choose the coordination move.</h1>
          <p className={styles.heroText}>
            Start with the public action you are trying to arrange. Select a route, inspect the
            terms it will require, and continue only when the no-deal default and maximum exposure
            are clear.
          </p>

          <ul className={styles.assuranceList} aria-label="Draft boundaries">
            <li>
              <span>Draft only</span>
              Selecting a route creates no commitment.
            </li>
            <li>
              <span>No settlement</span>
              No money or obligation moves from this page.
            </li>
            <li>
              <span>Separate consent</span>
              Authorization happens after frozen-term review.
            </li>
          </ul>
        </div>

        <div className={styles.heroPreview}>
          <DealReceipt
            className={styles.receipt}
            note="Preview only. Selecting a route changes this receipt but does not save, publish, match, or authorize anything."
            rows={buildPreviewRows(selectedRoute)}
            state="Draft"
            title={`${selectedRoute.title} preview`}
          />
        </div>
      </section>

      <section className={`${styles.section} ${styles.routeSection}`} aria-labelledby="route-heading">
        <div className={styles.sectionHead}>
          <div>
            <p className="mt-product-kicker">Choose a route</p>
            <h2 id="route-heading">Four verbs. One safety model.</h2>
          </div>
          <p>
            Compare the routes before opening a form. Trade, Offset, and Pool are primary lanes;
            Back remains a higher-review lane.
          </p>
        </div>

        <div className={styles.routeGrid}>
          {CREATE_ROUTE_DEFINITIONS.map((route) => {
            const isSelected = route.key === selectedMode;

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
                type="button"
              >
                <span className={styles.routeMeta}>
                  <small>{route.index}</small>
                  <small>{route.later ? "Review first" : "Available"}</small>
                </span>
                <RouteGlyph mode={route.key} />
                <span className={styles.routeCopy}>
                  <strong>{route.title}</strong>
                  <span>{route.summary}</span>
                </span>
                <span className={styles.routeProposition}>{route.proposition}</span>
                <span className={styles.routeAction}>
                  {isSelected ? "Selected" : "Select route"}
                  <span aria-hidden="true">→</span>
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
        <div className={styles.sectionHead}>
          <div>
            <p className="mt-product-kicker">Selected route</p>
            <h2 id="selected-route-heading">{selectedRoute.headline}</h2>
          </div>
          <p>{selectedRoute.summary}</p>
        </div>

        <div className={styles.decisionPanel}>
          <article className={styles.decisionIntro}>
            <span className={styles.decisionIndex}>{selectedRoute.index}</span>
            <RouteGlyph mode={selectedRoute.key} />
            <p className={styles.decisionProposition}>{selectedRoute.proposition}</p>
            <dl className={styles.fitList}>
              <div>
                <dt>Best for</dt>
                <dd>{selectedRoute.bestFor}</dd>
              </div>
              <div>
                <dt>Boundary</dt>
                <dd>{selectedRoute.boundary}</dd>
              </div>
            </dl>
          </article>

          <article className={styles.requirementsPanel}>
            <span className={styles.panelLabel}>Bring these facts</span>
            <ol>
              {selectedRoute.requirements.map((requirement, index) => (
                <li key={requirement}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{requirement}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className={styles.continuePanel}>
            <span className={styles.panelLabel}>Next state</span>
            <h3>Open a non-binding draft.</h3>
            <p>
              The next screen asks for complete terms. Saving a draft is not authorization, and a
              match candidate is not a locked deal.
            </p>
            <div className={styles.actions}>
              <Link className="button button-primary" href={targetHref}>
                {primaryLabel}
              </Link>
              <Link className="button button-secondary" href="/trust">
                Review trust rules
              </Link>
            </div>
            <small>
              {selectedRoute.authRequired && !isAuthenticated
                ? "Account creation returns you to the selected drafting route."
                : "You can leave before authorization without creating a live commitment."}
            </small>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.flowSection}`} aria-labelledby="create-flow-heading">
        <div className={styles.sectionHead}>
          <div>
            <p className="mt-product-kicker">The creation flow</p>
            <h2 id="create-flow-heading">Make the default explicit first.</h2>
          </div>
          <p>
            The interface exposes the fields that determine whether a proposal is voluntary,
            additional, reviewable, and safe before anyone is asked to rely on it.
          </p>
        </div>

        <ol className={styles.flowGrid}>
          {CREATE_FLOW.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
