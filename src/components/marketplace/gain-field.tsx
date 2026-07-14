"use client";

import { useId, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./interactive-gain-field.module.css";

interface GainFieldProps {
  className?: string;
  compact?: boolean;
  caption?: string;
}

type GainPair = {
  paul: number;
  victoria: number;
};

type TradeOption = {
  id: string;
  label: string;
  shortLabel: string;
  detail: string;
  gain: GainPair;
  frontier: boolean;
};

type StatusTone = "mutual" | "caution" | "blocked" | "neutral";

const MIN_GAIN = -40;
const MAX_GAIN = 100;
const PLOT = {
  left: 74,
  right: 672,
  top: 58,
  bottom: 454,
  defaultX: 218,
  defaultY: 374,
} as const;

const TRADE_OPTIONS: readonly TradeOption[] = [
  {
    id: "vegetarian-only",
    label: "Vegetarian pledge only",
    shortLabel: "Pledge only",
    detail: "Paul bears the diet cost without receiving Victoria’s poverty commitment.",
    gain: { paul: -18, victoria: 58 },
    frontier: false,
  },
  {
    id: "donation-only",
    label: "Donation only",
    shortLabel: "Donation only",
    detail: "Victoria bears the donation cost without receiving Paul’s animal-welfare commitment.",
    gain: { paul: 54, victoria: -16 },
    frontier: false,
  },
  {
    id: "lighter-swap",
    label: "Lighter swap",
    shortLabel: "Lighter swap",
    detail: "Both prefer this to no deal, but another shown agreement improves both views further.",
    gain: { paul: 33, victoria: 30 },
    frontier: false,
  },
  {
    id: "victoria-favoured",
    label: "Victoria-favoured bargain",
    shortLabel: "Victoria-favoured",
    detail: "A stronger animal-welfare commitment is paired with a smaller poverty commitment.",
    gain: { paul: 24, victoria: 88 },
    frontier: true,
  },
  {
    id: "ord-agreement",
    label: "Victoria ↔ Paul",
    shortLabel: "Ord example",
    detail: "Victoria donates 1% to poverty reduction; Paul adopts vegetarianism for the agreed term.",
    gain: { paul: 68, victoria: 70 },
    frontier: true,
  },
  {
    id: "paul-favoured",
    label: "Paul-favoured bargain",
    shortLabel: "Paul-favoured",
    detail: "A larger poverty commitment is paired with a lighter animal-welfare commitment.",
    gain: { paul: 90, victoria: 28 },
    frontier: true,
  },
] as const;

const INITIAL_OPTION = TRADE_OPTIONS.find((option) => option.id === "ord-agreement") ?? TRADE_OPTIONS[0];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function gainToX(value: number) {
  if (value >= 0) {
    return PLOT.defaultX + (value / MAX_GAIN) * (PLOT.right - PLOT.defaultX);
  }

  return PLOT.defaultX + (value / Math.abs(MIN_GAIN)) * (PLOT.defaultX - PLOT.left);
}

function gainToY(value: number) {
  if (value >= 0) {
    return PLOT.defaultY - (value / MAX_GAIN) * (PLOT.defaultY - PLOT.top);
  }

  return PLOT.defaultY - (value / Math.abs(MIN_GAIN)) * (PLOT.bottom - PLOT.defaultY);
}

function xToGain(value: number) {
  if (value >= PLOT.defaultX) {
    return ((value - PLOT.defaultX) / (PLOT.right - PLOT.defaultX)) * MAX_GAIN;
  }

  return ((value - PLOT.defaultX) / (PLOT.defaultX - PLOT.left)) * Math.abs(MIN_GAIN);
}

function yToGain(value: number) {
  if (value <= PLOT.defaultY) {
    return ((PLOT.defaultY - value) / (PLOT.defaultY - PLOT.top)) * MAX_GAIN;
  }

  return ((PLOT.defaultY - value) / (PLOT.bottom - PLOT.defaultY)) * Math.abs(MIN_GAIN);
}

function gainToPoint(gain: GainPair) {
  return {
    x: gainToX(gain.paul),
    y: gainToY(gain.victoria),
  };
}

function pointToGain(x: number, y: number): GainPair {
  return {
    paul: clamp(xToGain(clamp(x, PLOT.left, PLOT.right)), MIN_GAIN, MAX_GAIN),
    victoria: clamp(yToGain(clamp(y, PLOT.top, PLOT.bottom)), MIN_GAIN, MAX_GAIN),
  };
}

function comparisonLabel(value: number) {
  if (value > 1) {
    return "Better than no deal";
  }

  if (value < -1) {
    return "Worse than no deal";
  }

  return "At the default";
}

function comparisonOutput(value: number) {
  if (value > 1) {
    return "above default";
  }

  if (value < -1) {
    return "below default";
  }

  return "at default";
}

function comparisonClass(value: number) {
  if (value > 1) {
    return styles.isPositive;
  }

  if (value < -1) {
    return styles.isNegative;
  }

  return styles.isDefault;
}

function nearestOption(gain: GainPair) {
  let nearest: TradeOption | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const option of TRADE_OPTIONS) {
    const distance = Math.hypot(option.gain.paul - gain.paul, option.gain.victoria - gain.victoria);
    if (distance < nearestDistance) {
      nearest = option;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= 8 ? nearest : undefined;
}

function statusFor(gain: GainPair, activeId: string | null) {
  const paulGains = gain.paul > 1;
  const victoriaGains = gain.victoria > 1;

  if (paulGains && victoriaGains) {
    const dominator = TRADE_OPTIONS.find((option) => {
      if (option.id === activeId) {
        return false;
      }

      const noWorse = option.gain.paul >= gain.paul - 0.5 && option.gain.victoria >= gain.victoria - 0.5;
      const strictlyBetter = option.gain.paul > gain.paul + 0.5 || option.gain.victoria > gain.victoria + 0.5;
      return noWorse && strictlyBetter;
    });

    if (dominator) {
      return {
        label: "Mutual gain, with room to improve",
        detail: `${dominator.shortLabel} is at least as good by both shown views and better by one.`,
        tone: "caution" as StatusTone,
        mutual: true,
      };
    }

    return {
      label: "Possible moral trade",
      detail: "Both parties rank this proposal above the no-deal default; no shown option dominates it.",
      tone: "mutual" as StatusTone,
      mutual: true,
    };
  }

  if (paulGains || victoriaGains) {
    const rejectingParty = paulGains ? "Victoria" : "Paul";
    return {
      label: "One party would reject",
      detail: `${rejectingParty} ranks this below the no-deal default, so it fails the voluntary mutual-gain test.`,
      tone: "blocked" as StatusTone,
      mutual: false,
    };
  }

  if (gain.paul < -1 || gain.victoria < -1) {
    return {
      label: "Worse than no deal",
      detail: "Neither party has a reason, by the shown views, to replace the default with this proposal.",
      tone: "blocked" as StatusTone,
      mutual: false,
    };
  }

  return {
    label: "No-deal default",
    detail: "This cross marks what happens without an agreement. Every voluntary trade is tested against it.",
    tone: "neutral" as StatusTone,
    mutual: false,
  };
}

function StaticGainField({ className, caption }: Pick<GainFieldProps, "className" | "caption">) {
  const rawId = useId().replace(/:/g, "");
  const titleId = `gain-field-title-${rawId}`;
  const descriptionId = `gain-field-description-${rawId}`;
  const gridId = `mt-gain-grid-${rawId}`;
  const hatchId = `mt-gain-hatch-${rawId}`;

  return (
    <figure className={["mt-gain-field", "is-compact", className].filter(Boolean).join(" ")}>
      <svg aria-labelledby={`${titleId} ${descriptionId}`} role="img" viewBox="0 0 720 520">
        <title id={titleId}>Mutual-gain field</title>
        <desc id={descriptionId}>
          Two independent participant measures cross at a no-deal default. A marked agreement sits
          above and to the right, inside the region both participants prefer.
        </desc>
        <defs>
          <pattern height="28" id={gridId} patternUnits="userSpaceOnUse" width="28">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity="0.09" strokeWidth="1" />
          </pattern>
          <pattern height="14" id={hatchId} patternUnits="userSpaceOnUse" width="14" patternTransform="rotate(45)">
            <line stroke="currentColor" strokeOpacity="0.17" strokeWidth="2" x1="0" x2="0" y1="0" y2="14" />
          </pattern>
        </defs>

        <rect className="mt-gain-field-paper" height="520" width="720" />
        <rect className="mt-gain-field-grid" fill={`url(#${gridId})`} height="520" width="720" />
        <path className="mt-gain-field-region" d="M208 382H640V76H208Z" fill={`url(#${hatchId})`} />
        <line className="mt-gain-axis" x1="92" x2="660" y1="382" y2="382" />
        <line className="mt-gain-axis" x1="208" x2="208" y1="446" y2="56" />
        <line className="mt-gain-default-guide" x1="208" x2="208" y1="382" y2="76" />
        <line className="mt-gain-default-guide" x1="208" x2="640" y1="382" y2="382" />

        <g className="mt-gain-default-point" transform="translate(208 382)">
          <rect height="18" width="18" x="-9" y="-9" />
          <path d="M-5-5L5 5M5-5L-5 5" />
        </g>

        <path className="mt-gain-path mt-gain-path-a" d="M208 382C270 344 318 300 382 246" />
        <path className="mt-gain-path mt-gain-path-b" d="M208 382C330 370 436 318 530 220" />

        <g className="mt-gain-agreement-point" transform="translate(530 220)">
          <circle r="24" />
          <circle r="7" />
        </g>

        <g className="mt-gain-option-points">
          <circle cx="310" cy="316" r="4" />
          <circle cx="350" cy="210" r="4" />
          <circle cx="454" cy="334" r="4" />
          <circle cx="590" cy="142" r="4" />
        </g>

        <text className="mt-gain-label mt-gain-label-default" x="224" y="412">No-deal default</text>
        <text className="mt-gain-label mt-gain-label-agreement" x="558" y="214">Agreement</text>
        <text className="mt-gain-label mt-gain-label-field" x="424" y="104">Better for both</text>
        <text className="mt-gain-axis-label" textAnchor="end" x="654" y="420">More by your lights</text>
        <text className="mt-gain-axis-label" textAnchor="end" transform="rotate(-90 166 68)" x="166" y="68">
          More by their lights
        </text>
      </svg>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function InteractiveGainField({ className, caption }: Pick<GainFieldProps, "className" | "caption">) {
  const rawId = useId().replace(/:/g, "");
  const titleId = `interactive-gain-title-${rawId}`;
  const descriptionId = `interactive-gain-description-${rawId}`;
  const gridId = `interactive-gain-grid-${rawId}`;
  const hatchId = `interactive-gain-hatch-${rawId}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [gain, setGain] = useState<GainPair>(INITIAL_OPTION.gain);
  const [activeId, setActiveId] = useState<string | null>(INITIAL_OPTION.id);
  const [dragging, setDragging] = useState(false);

  const activeOption = useMemo(
    () => TRADE_OPTIONS.find((option) => option.id === activeId),
    [activeId],
  );
  const status = useMemo(() => statusFor(gain, activeId), [gain, activeId]);
  const selectedPoint = gainToPoint(gain);
  const defaultSelected = Math.abs(gain.paul) <= 1 && Math.abs(gain.victoria) <= 1;
  const selectedName = activeOption?.label ?? (defaultSelected ? "No-deal default" : "Custom proposal");
  const selectedDetail = activeOption?.detail ?? "Move the proposal to test how each party ranks it against no deal.";
  const frontierPoints = TRADE_OPTIONS
    .filter((option) => option.frontier)
    .sort((left, right) => left.gain.paul - right.gain.paul)
    .map((option) => gainToPoint(option.gain));
  const frontierPath = frontierPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const statusClass = {
    mutual: styles.statusMutual,
    caution: styles.statusCaution,
    blocked: styles.statusBlocked,
    neutral: styles.statusNeutral,
  }[status.tone];

  function selectOption(option: TradeOption) {
    setGain(option.gain);
    setActiveId(option.id);
  }

  function setCustomGain(nextGain: GainPair) {
    setGain({
      paul: clamp(nextGain.paul, MIN_GAIN, MAX_GAIN),
      victoria: clamp(nextGain.victoria, MIN_GAIN, MAX_GAIN),
    });
    setActiveId(null);
  }

  function gainFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) {
      return gain;
    }

    const bounds = svg.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * 720;
    const y = ((clientY - bounds.top) / bounds.height) * 520;
    return pointToGain(x, y);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setCustomGain(gainFromClient(event.clientX, event.clientY));
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging || activePointerId.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setCustomGain(gainFromClient(event.clientX, event.clientY));
  }

  function finishPointer(event: ReactPointerEvent<SVGSVGElement>, snap: boolean) {
    if (activePointerId.current !== event.pointerId) {
      return;
    }

    const finalGain = gainFromClient(event.clientX, event.clientY);
    const snappedOption = snap ? nearestOption(finalGain) : undefined;

    if (snappedOption) {
      selectOption(snappedOption);
    } else {
      setCustomGain(finalGain);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerId.current = null;
    setDragging(false);
  }

  function handleSelectedKeyDown(event: ReactKeyboardEvent<SVGGElement>) {
    const step = event.shiftKey ? 10 : 3;
    let nextGain: GainPair | null = null;

    if (event.key === "ArrowRight") {
      nextGain = { ...gain, paul: gain.paul + step };
    } else if (event.key === "ArrowLeft") {
      nextGain = { ...gain, paul: gain.paul - step };
    } else if (event.key === "ArrowUp") {
      nextGain = { ...gain, victoria: gain.victoria + step };
    } else if (event.key === "ArrowDown") {
      nextGain = { ...gain, victoria: gain.victoria - step };
    } else if (event.key === "Home") {
      nextGain = { paul: 0, victoria: 0 };
    }

    if (nextGain) {
      event.preventDefault();
      setCustomGain(nextGain);
    }
  }

  function handleOptionKeyDown(event: ReactKeyboardEvent<SVGGElement>, option: TradeOption) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(option);
    }
  }

  const selectedTextAnchor = selectedPoint.x > 555 ? "end" : "start";
  const selectedTextX = selectedPoint.x > 555 ? selectedPoint.x - 13 : selectedPoint.x + 13;
  const selectedTextY = selectedPoint.y < 92 ? selectedPoint.y + 26 : selectedPoint.y - 15;

  return (
    <figure className={[styles.field, dragging ? styles.dragging : "", className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <span className={styles.kicker}>Interactive mutual-gain field</span>
          <h3>{status.label}</h3>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.noScore}>No shared moral score</span>
          <span className={[styles.statusChip, statusClass].join(" ")}>Ord-style test</span>
        </div>
      </div>

      <div className={styles.stage}>
        <svg
          aria-labelledby={`${titleId} ${descriptionId}`}
          className={styles.canvas}
          onPointerCancel={(event) => finishPointer(event, false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event, true)}
          ref={svgRef}
          role="img"
          viewBox="0 0 720 520"
        >
          <title id={titleId}>Interactive Toby Ord-style mutual-gain field</title>
          <desc id={descriptionId}>
            The horizontal axis shows how Paul ranks each option and the vertical axis shows how Victoria ranks it.
            Drag the proposal. A voluntary moral trade is possible only above and to the right of the no-deal default.
          </desc>
          <defs>
            <pattern height="24" id={gridId} patternUnits="userSpaceOnUse" width="24">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeOpacity="0.085" strokeWidth="1" />
            </pattern>
            <pattern height="12" id={hatchId} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="12">
              <line stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" x1="0" x2="0" y1="0" y2="12" />
            </pattern>
          </defs>

          <rect className={styles.paper} height="520" width="720" />
          <rect className={styles.grid} fill={`url(#${gridId})`} height="520" width="720" />
          <rect
            className={styles.mutualWash}
            height={PLOT.defaultY - PLOT.top}
            width={PLOT.right - PLOT.defaultX}
            x={PLOT.defaultX}
            y={PLOT.top}
          />
          <rect
            className={styles.mutualHatch}
            fill={`url(#${hatchId})`}
            height={PLOT.defaultY - PLOT.top}
            width={PLOT.right - PLOT.defaultX}
            x={PLOT.defaultX}
            y={PLOT.top}
          />

          <line className={styles.axis} x1={PLOT.left} x2={PLOT.right} y1={PLOT.defaultY} y2={PLOT.defaultY} />
          <line className={styles.axis} x1={PLOT.defaultX} x2={PLOT.defaultX} y1={PLOT.bottom} y2={PLOT.top} />
          <line className={styles.defaultGuide} x1={PLOT.defaultX} x2={PLOT.right} y1={PLOT.defaultY} y2={PLOT.defaultY} />
          <line className={styles.defaultGuide} x1={PLOT.defaultX} x2={PLOT.defaultX} y1={PLOT.defaultY} y2={PLOT.top} />
          <rect
            className={styles.quadrantRule}
            height={PLOT.bottom - PLOT.top}
            width={PLOT.right - PLOT.left}
            x={PLOT.left}
            y={PLOT.top}
          />

          <path className={styles.frontierHalo} d={frontierPath} />
          <path className={styles.frontier} d={frontierPath} />
          <text className={styles.frontierLabel} textAnchor="end" x="651" y="92">Pareto frontier among shown options</text>

          <text className={[styles.quadrantLabel, styles.quadrantLabelMutual].join(" ")} textAnchor="end" x="652" y="116">
            Both prefer this
          </text>
          <text className={styles.quadrantLabel} x="86" y="82">Victoria gains · Paul rejects</text>
          <text className={styles.quadrantLabel} textAnchor="end" x="652" y="438">Paul gains · Victoria rejects</text>
          <text className={styles.quadrantLabel} x="86" y="438">Neither gains</text>

          {TRADE_OPTIONS.map((option) => {
            const point = gainToPoint(option.gain);
            const labelAnchor = point.x > 540 ? "end" : "start";
            const labelX = point.x > 540 ? -11 : 11;
            const labelY = point.y < 92 ? 22 : -11;

            return (
              <g
                aria-label={`${option.label}. ${comparisonLabel(option.gain.victoria)} for Victoria; ${comparisonLabel(option.gain.paul)} for Paul.`}
                className={styles.candidate}
                key={option.id}
                onClick={() => selectOption(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, option)}
                onPointerDown={(event) => event.stopPropagation()}
                role="button"
                tabIndex={0}
                transform={`translate(${point.x} ${point.y})`}
              >
                <title>{option.label}</title>
                <circle
                  className={[styles.candidateDot, option.frontier ? styles.candidateFrontier : ""].filter(Boolean).join(" ")}
                  r={option.frontier ? 6.5 : 5}
                />
                <text className={styles.candidateLabel} textAnchor={labelAnchor} x={labelX} y={labelY}>
                  {option.shortLabel}
                </text>
              </g>
            );
          })}

          <line className={styles.projection} x1={selectedPoint.x} x2={selectedPoint.x} y1={selectedPoint.y} y2={PLOT.defaultY} />
          <line className={styles.projection} x1={PLOT.defaultX} x2={selectedPoint.x} y1={selectedPoint.y} y2={selectedPoint.y} />
          <path className={styles.vector} d={`M${PLOT.defaultX} ${PLOT.defaultY}L${selectedPoint.x} ${selectedPoint.y}`} />

          <g className={styles.defaultPoint} transform={`translate(${PLOT.defaultX} ${PLOT.defaultY})`}>
            <rect height="18" width="18" x="-9" y="-9" />
            <path d="M-5-5L5 5M5-5L-5 5" />
          </g>
          <text className={styles.defaultLabel} x={PLOT.defaultX + 12} y={PLOT.defaultY + 28}>No-deal default</text>

          <g
            aria-label={`Proposed agreement. ${comparisonLabel(gain.victoria)} for Victoria; ${comparisonLabel(gain.paul)} for Paul. Use arrow keys to move it.`}
            className={[styles.selected, status.mutual ? "" : styles.selectedBlocked].filter(Boolean).join(" ")}
            onKeyDown={handleSelectedKeyDown}
            role="button"
            tabIndex={0}
            transform={`translate(${selectedPoint.x} ${selectedPoint.y})`}
          >
            <circle className={styles.selectedPulse} r="30" />
            <circle className={styles.selectedOuter} r="19" />
            <circle className={styles.selectedInner} r="6" />
          </g>
          <text
            className={styles.selectedLabel}
            textAnchor={selectedTextAnchor}
            x={selectedTextX}
            y={selectedTextY}
          >
            {selectedName}
          </text>

          <text className={styles.axisLabel} textAnchor="end" x={PLOT.right} y="494">Better by Paul’s lights →</text>
          <text
            className={styles.axisLabel}
            textAnchor="end"
            transform="rotate(-90 38 64)"
            x="38"
            y="64"
          >
            Better by Victoria’s lights ↑
          </text>
        </svg>
      </div>

      <div className={styles.inspector}>
        <div className={styles.readout} aria-live="polite">
          <div className={styles.readoutTitle}>
            <span>Selected proposal</span>
            <strong>{selectedName}</strong>
          </div>
          <p>{selectedDetail}</p>
          <p>{status.detail}</p>
          <div className={styles.partyResults}>
            <div className={styles.partyResult}>
              <span>Victoria’s view</span>
              <strong className={comparisonClass(gain.victoria)}>{comparisonLabel(gain.victoria)}</strong>
            </div>
            <div className={styles.partyResult}>
              <span>Paul’s view</span>
              <strong className={comparisonClass(gain.paul)}>{comparisonLabel(gain.paul)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsIntro}>
            <strong>Drag the point or tune each view</strong>
            <span>Shift + arrows = faster</span>
          </div>
          <label className={styles.axisControl}>
            <span>Paul’s relative ranking</span>
            <output>{comparisonOutput(gain.paul)}</output>
            <input
              aria-label="Paul’s ranking of the proposal relative to no deal"
              aria-valuetext={comparisonLabel(gain.paul)}
              max={MAX_GAIN}
              min={MIN_GAIN}
              onChange={(event) => setCustomGain({ ...gain, paul: Number(event.target.value) })}
              step="1"
              type="range"
              value={Math.round(gain.paul)}
            />
          </label>
          <label className={styles.axisControl}>
            <span>Victoria’s relative ranking</span>
            <output>{comparisonOutput(gain.victoria)}</output>
            <input
              aria-label="Victoria’s ranking of the proposal relative to no deal"
              aria-valuetext={comparisonLabel(gain.victoria)}
              max={MAX_GAIN}
              min={MIN_GAIN}
              onChange={(event) => setCustomGain({ ...gain, victoria: Number(event.target.value) })}
              step="1"
              type="range"
              value={Math.round(gain.victoria)}
            />
          </label>
        </div>
      </div>

      <div className={styles.options} aria-label="Illustrative proposals">
        <button
          aria-pressed={defaultSelected}
          className={[styles.optionButton, defaultSelected ? styles.optionButtonActive : ""].filter(Boolean).join(" ")}
          onClick={() => setCustomGain({ paul: 0, victoria: 0 })}
          type="button"
        >
          No deal
        </button>
        {TRADE_OPTIONS.map((option) => (
          <button
            aria-pressed={activeId === option.id}
            className={[styles.optionButton, activeId === option.id ? styles.optionButtonActive : ""].filter(Boolean).join(" ")}
            key={option.id}
            onClick={() => selectOption(option)}
            type="button"
          >
            {option.shortLabel}
          </button>
        ))}
      </div>

      <details className={styles.explainer}>
        <summary>How to read the Ord-style field</summary>
        <div className={styles.explainerGrid}>
          <div>
            <strong>1 · Start at no deal</strong>
            <p>The cross is the status quo: what each person expects to happen without an agreement.</p>
          </div>
          <div>
            <strong>2 · Require mutual gain</strong>
            <p>A voluntary trade is possible only above and to the right—better by each party’s own lights.</p>
          </div>
          <div>
            <strong>3 · Bargain on the frontier</strong>
            <p>Undominated options preserve more surplus. Side payments or lotteries can create additional options.</p>
          </div>
        </div>
      </details>

      <figcaption className={styles.caption}>
        <strong>{caption}</strong>
        <span>
          This field tests default-relative mutual gain only. It does not certify consent, evidence,
          legality, side constraints, effects on third parties, trustworthiness, or freedom from threats.
        </span>
      </figcaption>
    </figure>
  );
}

export function GainField({
  className,
  compact = false,
  caption = "An Ord-style moral trade is possible only when every participant prefers the proposal to the no-deal default.",
}: GainFieldProps) {
  if (compact) {
    return <StaticGainField caption={caption} className={className} />;
  }

  return <InteractiveGainField caption={caption} className={className} />;
}

interface OffsetFlowFigureProps {
  className?: string;
}

export function OffsetFlowFigure({ className }: OffsetFlowFigureProps) {
  const rawId = useId().replace(/:/g, "");
  const titleId = `offset-flow-title-${rawId}`;
  const descriptionId = `offset-flow-description-${rawId}`;

  return (
    <figure className={["mt-offset-flow", className].filter(Boolean).join(" ")}>
      <svg aria-labelledby={`${titleId} ${descriptionId}`} role="img" viewBox="0 0 760 360">
        <title id={titleId}>Donation-offset redirection</title>
        <desc id={descriptionId}>
          Two opposed planned donations stop at a matched amount and redirect into one shared destination.
        </desc>
        <rect className="mt-offset-paper" height="360" width="760" />
        <path className="mt-offset-source mt-offset-source-a" d="M80 86H334" />
        <path className="mt-offset-source mt-offset-source-b" d="M80 270H334" />
        <path className="mt-offset-turn mt-offset-turn-a" d="M334 86V174H472" />
        <path className="mt-offset-turn mt-offset-turn-b" d="M334 270V186H472" />
        <path className="mt-offset-shared" d="M472 180H690" />
        <circle className="mt-offset-junction" cx="472" cy="180" r="15" />
        <rect className="mt-offset-stop" height="42" width="8" x="330" y="65" />
        <rect className="mt-offset-stop" height="42" width="8" x="330" y="249" />
        <text className="mt-offset-label" x="80" y="62">Planned donation A</text>
        <text className="mt-offset-label" x="80" y="246">Planned donation B</text>
        <text className="mt-offset-label" textAnchor="middle" x="402" y="150">Matched amount</text>
        <text className="mt-offset-label mt-offset-label-shared" textAnchor="end" x="690" y="158">Shared destination</text>
        <text className="mt-offset-note" x="80" y="328">Unmatched surplus keeps its stated rule; it is never silently redirected.</text>
      </svg>
    </figure>
  );
}

interface ThresholdFieldProps {
  className?: string;
  progress?: number;
}

export function ThresholdField({ className, progress = 64 }: ThresholdFieldProps) {
  const boundedProgress = Math.min(100, Math.max(0, progress));

  return (
    <figure className={["mt-threshold-field", className].filter(Boolean).join(" ")}>
      <div className="mt-threshold-heading">
        <span>Conditional pool</span>
        <strong>{boundedProgress}% pledged</strong>
      </div>
      <div className="mt-threshold-track" aria-label={`${boundedProgress}% of the funding condition pledged`}>
        <span className="mt-threshold-progress" style={{ width: `${boundedProgress}%` }} />
        <span className="mt-threshold-line" aria-hidden="true" />
      </div>
      <div className="mt-threshold-participants" aria-label="Distinct participant commitments">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            className={index < Math.round((boundedProgress / 100) * 12) ? "is-pledged" : ""}
            key={index}
          >
            {String.fromCharCode(65 + index)}
          </span>
        ))}
      </div>
      <figcaption>
        Every participant keeps a named maximum exposure. Settlement activates only when the published condition passes.
      </figcaption>
    </figure>
  );
}
