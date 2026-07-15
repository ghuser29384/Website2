"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import styles from "./interactive-gain-field.module.css";

interface GainFieldProps { className?: string; compact?: boolean; caption?: string }
type Gain = { paul: number; victoria: number };
type Option = { id: string; label: string; short: string; detail: string; gain: Gain; frontier: boolean };
type Tone = "mutual" | "caution" | "blocked" | "neutral";

const MIN = -40;
const MAX = 100;
const P = { left: 74, right: 672, top: 58, bottom: 454, x0: 218, y0: 374 } as const;
const OPTIONS: readonly Option[] = [
  { id: "vegetarian-only", label: "Vegetarian pledge only", short: "Pledge only", detail: "Paul bears the diet cost without receiving Victoria’s poverty commitment.", gain: { paul: -18, victoria: 58 }, frontier: false },
  { id: "donation-only", label: "Donation only", short: "Donation only", detail: "Victoria bears the donation cost without receiving Paul’s animal-welfare commitment.", gain: { paul: 54, victoria: -16 }, frontier: false },
  { id: "lighter-swap", label: "Lighter swap", short: "Lighter swap", detail: "Both prefer this to no deal, but another shown agreement improves both views further.", gain: { paul: 33, victoria: 30 }, frontier: false },
  { id: "victoria-favoured", label: "Victoria-favoured bargain", short: "Victoria-favoured", detail: "A stronger animal-welfare commitment is paired with a smaller poverty commitment.", gain: { paul: 24, victoria: 88 }, frontier: true },
  { id: "ord-agreement", label: "Victoria ↔ Paul", short: "Victoria ↔ Paul", detail: "Victoria donates 1% to poverty reduction; Paul adopts vegetarianism for the agreed term.", gain: { paul: 68, victoria: 70 }, frontier: true },
  { id: "paul-favoured", label: "Paul-favoured bargain", short: "Paul-favoured", detail: "A larger poverty commitment is paired with a lighter animal-welfare commitment.", gain: { paul: 90, victoria: 28 }, frontier: true },
];
const INITIAL = OPTIONS.find((o) => o.id === "ord-agreement") ?? OPTIONS[0];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const gx = (n: number) => n >= 0 ? P.x0 + (n / MAX) * (P.right - P.x0) : P.x0 + (n / Math.abs(MIN)) * (P.x0 - P.left);
const gy = (n: number) => n >= 0 ? P.y0 - (n / MAX) * (P.y0 - P.top) : P.y0 - (n / Math.abs(MIN)) * (P.bottom - P.y0);
const xg = (n: number) => n >= P.x0 ? ((n - P.x0) / (P.right - P.x0)) * MAX : ((n - P.x0) / (P.x0 - P.left)) * Math.abs(MIN);
const yg = (n: number) => n <= P.y0 ? ((P.y0 - n) / (P.y0 - P.top)) * MAX : ((P.y0 - n) / (P.bottom - P.y0)) * Math.abs(MIN);
const toPoint = (g: Gain) => ({ x: gx(g.paul), y: gy(g.victoria) });
const toGain = (x: number, y: number): Gain => ({ paul: clamp(xg(clamp(x, P.left, P.right)), MIN, MAX), victoria: clamp(yg(clamp(y, P.top, P.bottom)), MIN, MAX) });
const comparison = (n: number) => n > 1 ? "Better than no deal" : n < -1 ? "Worse than no deal" : "At the default";
const output = (n: number) => n > 1 ? "above default" : n < -1 ? "below default" : "at default";
const comparisonClass = (n: number) => n > 1 ? styles.isPositive : n < -1 ? styles.isNegative : styles.isDefault;

function statusFor(g: Gain, active: string | null) {
  const p = g.paul > 1, v = g.victoria > 1;
  if (p && v) {
    const d = OPTIONS.find((o) => o.id !== active && o.gain.paul >= g.paul - .5 && o.gain.victoria >= g.victoria - .5 && (o.gain.paul > g.paul + .5 || o.gain.victoria > g.victoria + .5));
    return d
      ? { label: "Mutual gain, with room to improve", detail: `${d.short} is at least as good by both shown views and better by one.`, tone: "caution" as Tone, mutual: true }
      : { label: "Possible moral trade", detail: "Both parties rank this proposal above the no-deal default; no shown option dominates it.", tone: "mutual" as Tone, mutual: true };
  }
  if (p || v) {
    const rejecting = p ? "Victoria" : "Paul";
    return { label: "One party would reject", detail: `${rejecting} ranks this below the no-deal default, so it fails the voluntary mutual-gain test.`, tone: "blocked" as Tone, mutual: false };
  }
  if (g.paul < -1 || g.victoria < -1) return { label: "Worse than no deal", detail: "Neither party has a reason, by the shown views, to replace the default with this proposal.", tone: "blocked" as Tone, mutual: false };
  return { label: "No-deal default", detail: "This cross marks what happens without an agreement. Every voluntary trade is tested against it.", tone: "neutral" as Tone, mutual: false };
}

function StaticField({ className, caption }: Pick<GainFieldProps, "className" | "caption">) {
  const id = useId().replace(/:/g, "");
  return <figure className={["mt-gain-field", "is-compact", className].filter(Boolean).join(" ")}>
    <svg aria-labelledby={`gain-title-${id} gain-desc-${id}`} role="img" viewBox="0 0 720 520">
      <title id={`gain-title-${id}`}>Mutual-gain field</title>
      <desc id={`gain-desc-${id}`}>Two participant measures cross at a no-deal default. The agreement is better for both.</desc>
      <rect className="mt-gain-field-paper" height="520" width="720" />
      <path className="mt-gain-field-region" d="M208 382H640V76H208Z" />
      <line className="mt-gain-axis" x1="92" x2="660" y1="382" y2="382" />
      <line className="mt-gain-axis" x1="208" x2="208" y1="446" y2="56" />
      <line className="mt-gain-default-guide" x1="208" x2="640" y1="382" y2="382" />
      <line className="mt-gain-default-guide" x1="208" x2="208" y1="382" y2="76" />
      <g className="mt-gain-default-point" transform="translate(208 382)"><rect height="18" width="18" x="-9" y="-9" /><path d="M-5-5L5 5M5-5L-5 5" /></g>
      <path className="mt-gain-path mt-gain-path-a" d="M208 382C270 344 318 300 382 246" />
      <path className="mt-gain-path mt-gain-path-b" d="M208 382C330 370 436 318 530 220" />
      <g className="mt-gain-agreement-point" transform="translate(530 220)"><circle r="24" /><circle r="7" /></g>
      <text className="mt-gain-label mt-gain-label-default" x="224" y="412">No-deal default</text>
      <text className="mt-gain-label mt-gain-label-agreement" x="558" y="214">Agreement</text>
      <text className="mt-gain-label mt-gain-label-field" x="424" y="104">Better for both</text>
      <text className="mt-gain-axis-label" textAnchor="end" x="654" y="420">More by your lights</text>
      <text className="mt-gain-axis-label" textAnchor="end" transform="rotate(-90 166 68)" x="166" y="68">More by their lights</text>
    </svg>
    {caption ? <figcaption>{caption}</figcaption> : null}
  </figure>;
}

function InteractiveField({ className, caption }: Pick<GainFieldProps, "className" | "caption">) {
  const id = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const [gain, setGain] = useState<Gain>(INITIAL.gain);
  const [active, setActive] = useState<string | null>(INITIAL.id);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const activeOption = useMemo(() => OPTIONS.find((o) => o.id === active), [active]);
  const status = useMemo(() => statusFor(gain, active), [gain, active]);
  const point = toPoint(gain);
  const atDefault = Math.abs(gain.paul) <= 1 && Math.abs(gain.victoria) <= 1;
  const name = activeOption?.label ?? (atDefault ? "No-deal default" : "Custom proposal");
  const detail = activeOption?.detail ?? "Move through the field to test how each party ranks the proposal.";
  const frontier = OPTIONS.filter((o) => o.frontier).sort((a, b) => a.gain.paul - b.gain.paul).map((o, i) => `${i ? "L" : "M"}${toPoint(o.gain).x.toFixed(1)} ${toPoint(o.gain).y.toFixed(1)}`).join(" ");
  const tone = { mutual: styles.statusMutual, caution: styles.statusCaution, blocked: styles.statusBlocked, neutral: styles.statusNeutral }[status.tone];
  const select = (o: Option) => { setGain(o.gain); setActive(o.id); };
  const custom = (g: Gain) => { setGain({ paul: clamp(g.paul, MIN, MAX), victoria: clamp(g.victoria, MIN, MAX) }); setActive(null); };
  const fromClient = (clientX: number, clientY: number) => {
    if (!svg.current) return gain;
    const b = svg.current.getBoundingClientRect();
    return toGain(((clientX - b.left) / b.width) * 720, ((clientY - b.top) / b.height) * 520);
  };
  const schedule = (clientX: number, clientY: number) => {
    pending.current = { x: clientX, y: clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const p = pending.current;
      if (p) custom(fromClient(p.x, p.y));
    });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => { if (e.pointerType !== "touch" || e.buttons !== 0) schedule(e.clientX, e.clientY); };
  const down = (e: ReactPointerEvent<SVGSVGElement>) => { if (e.pointerType === "touch") { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); schedule(e.clientX, e.clientY); } };
  const end = (e: ReactPointerEvent<SVGSVGElement>) => { if (e.pointerType === "touch" && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); };
  const key = (e: ReactKeyboardEvent<SVGGElement>) => {
    const step = e.shiftKey ? 10 : 3;
    const next = e.key === "ArrowRight" ? { ...gain, paul: gain.paul + step } : e.key === "ArrowLeft" ? { ...gain, paul: gain.paul - step } : e.key === "ArrowUp" ? { ...gain, victoria: gain.victoria + step } : e.key === "ArrowDown" ? { ...gain, victoria: gain.victoria - step } : e.key === "Home" ? { paul: 0, victoria: 0 } : null;
    if (next) { e.preventDefault(); custom(next); }
  };
  const anchor = point.x > 555 ? "end" : "start";
  const labelX = point.x > 555 ? point.x - 13 : point.x + 13;
  const labelY = point.y < 92 ? point.y + 26 : point.y - 15;

  return <figure className={[styles.field, className].filter(Boolean).join(" ")}>
    <div className={styles.header}><div className={styles.headerCopy}><span className={styles.kicker}>Mutual-gain field</span><h3>{status.label}</h3></div><div className={styles.headerMeta}><span className={[styles.statusChip, tone].join(" ")}>Compared with no deal</span></div></div>
    <div className={styles.stage}>
      <svg aria-labelledby={`interactive-gain-title-${id} interactive-gain-desc-${id}`} className={styles.canvas} onPointerCancel={end} onPointerDown={down} onPointerMove={move} onPointerUp={end} ref={svg} role="img" style={{ cursor: "crosshair" }} viewBox="0 0 720 520">
        <title id={`interactive-gain-title-${id}`}>Mutual-gain field</title>
        <desc id={`interactive-gain-desc-${id}`}>The proposal follows the pointer inside the field. It qualifies only above and to the right of the no-deal default.</desc>
        <rect className={styles.paper} height="520" width="720" />
        <rect className={styles.mutualWash} height={P.y0 - P.top} width={P.right - P.x0} x={P.x0} y={P.top} />
        <line className={styles.axis} x1={P.left} x2={P.right} y1={P.y0} y2={P.y0} /><line className={styles.axis} x1={P.x0} x2={P.x0} y1={P.bottom} y2={P.top} />
        <line className={styles.defaultGuide} x1={P.x0} x2={P.right} y1={P.y0} y2={P.y0} /><line className={styles.defaultGuide} x1={P.x0} x2={P.x0} y1={P.y0} y2={P.top} />
        <rect className={styles.quadrantRule} height={P.bottom - P.top} width={P.right - P.left} x={P.left} y={P.top} />
        <path className={styles.frontierHalo} d={frontier} /><path className={styles.frontier} d={frontier} /><text className={styles.frontierLabel} textAnchor="end" x="651" y="92">Pareto frontier among shown options</text>
        <text className={[styles.quadrantLabel, styles.quadrantLabelMutual].join(" ")} textAnchor="end" x="652" y="116">Both prefer this</text><text className={styles.quadrantLabel} x="86" y="82">Victoria gains · Paul rejects</text><text className={styles.quadrantLabel} textAnchor="end" x="652" y="438">Paul gains · Victoria rejects</text><text className={styles.quadrantLabel} x="86" y="438">Neither gains</text>
        {OPTIONS.map((o) => { const q = toPoint(o.gain); const endLabel = q.x > 540; return <g aria-label={`${o.label}. ${comparison(o.gain.victoria)} for Victoria; ${comparison(o.gain.paul)} for Paul.`} className={styles.candidate} key={o.id} onClick={() => select(o)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(o); } }} onPointerDown={(e) => e.stopPropagation()} role="button" tabIndex={0} transform={`translate(${q.x} ${q.y})`}><title>{o.label}</title><circle className={[styles.candidateDot, o.frontier ? styles.candidateFrontier : ""].filter(Boolean).join(" ")} r={o.frontier ? 6.5 : 5} /><text className={styles.candidateLabel} textAnchor={endLabel ? "end" : "start"} x={endLabel ? -11 : 11} y={q.y < 92 ? 22 : -11}>{o.short}</text></g>; })}
        <line className={styles.projection} x1={point.x} x2={point.x} y1={point.y} y2={P.y0} /><line className={styles.projection} x1={P.x0} x2={point.x} y1={point.y} y2={point.y} /><path className={styles.vector} d={`M${P.x0} ${P.y0}L${point.x} ${point.y}`} />
        <g className={styles.defaultPoint} transform={`translate(${P.x0} ${P.y0})`}><rect height="18" width="18" x="-9" y="-9" /><path d="M-5-5L5 5M5-5L-5 5" /></g><text className={styles.defaultLabel} x={P.x0 + 12} y={P.y0 + 28}>No-deal default</text>
        <g aria-label={`Proposed agreement. ${comparison(gain.victoria)} for Victoria; ${comparison(gain.paul)} for Paul. It follows pointer movement; use arrow keys for keyboard control.`} className={[styles.selected, status.mutual ? "" : styles.selectedBlocked].filter(Boolean).join(" ")} onKeyDown={key} role="button" style={{ cursor: "crosshair" }} tabIndex={0} transform={`translate(${point.x} ${point.y})`}><circle className={styles.selectedPulse} r="30" /><circle className={styles.selectedOuter} r="19" /><circle className={styles.selectedInner} r="6" /></g>
        <text className={styles.selectedLabel} textAnchor={anchor} x={labelX} y={labelY}>{name}</text><text className={styles.axisLabel} textAnchor="end" x={P.right} y="494">Better by Paul’s lights →</text><text className={styles.axisLabel} textAnchor="end" transform="rotate(-90 38 64)" x="38" y="64">Better by Victoria’s lights ↑</text>
      </svg>
    </div>
    <div className={styles.inspector}><div className={styles.readout} aria-live="polite"><div className={styles.readoutTitle}><span>Selected proposal</span><strong>{name}</strong></div><p>{detail}</p><p>{status.detail}</p><div className={styles.partyResults}><div className={styles.partyResult}><span>Victoria’s view</span><strong className={comparisonClass(gain.victoria)}>{comparison(gain.victoria)}</strong></div><div className={styles.partyResult}><span>Paul’s view</span><strong className={comparisonClass(gain.paul)}>{comparison(gain.paul)}</strong></div></div></div>
      <div className={styles.controls}><div className={styles.controlsIntro}><strong>Move your cursor across the field</strong><span>Arrow keys also work</span></div><label className={styles.axisControl}><span>Paul’s relative ranking</span><output>{output(gain.paul)}</output><input aria-label="Paul’s ranking of the proposal relative to no deal" aria-valuetext={comparison(gain.paul)} max={MAX} min={MIN} onChange={(e) => custom({ ...gain, paul: Number(e.target.value) })} step="1" type="range" value={Math.round(gain.paul)} /></label><label className={styles.axisControl}><span>Victoria’s relative ranking</span><output>{output(gain.victoria)}</output><input aria-label="Victoria’s ranking of the proposal relative to no deal" aria-valuetext={comparison(gain.victoria)} max={MAX} min={MIN} onChange={(e) => custom({ ...gain, victoria: Number(e.target.value) })} step="1" type="range" value={Math.round(gain.victoria)} /></label></div>
    </div>
    <div className={styles.options} aria-label="Illustrative proposals"><button aria-pressed={atDefault} className={[styles.optionButton, atDefault ? styles.optionButtonActive : ""].filter(Boolean).join(" ")} onClick={() => custom({ paul: 0, victoria: 0 })} type="button">No deal</button>{OPTIONS.map((o) => <button aria-pressed={active === o.id} className={[styles.optionButton, active === o.id ? styles.optionButtonActive : ""].filter(Boolean).join(" ")} key={o.id} onClick={() => select(o)} type="button">{o.short}</button>)}</div>
    <details className={styles.explainer}><summary>How to read the field</summary><div className={styles.explainerGrid}><div><strong>1 · Start at no deal</strong><p>The cross is what each person expects without an agreement.</p></div><div><strong>2 · Require mutual gain</strong><p>A voluntary trade is possible only above and to the right—better by each party’s own lights.</p></div><div><strong>3 · Bargain on the frontier</strong><p>Undominated options preserve more surplus. Side payments or lotteries can create additional options.</p></div></div></details>
    <figcaption className={styles.caption}><strong>{caption}</strong><span>This field tests default-relative mutual gain only. It does not certify consent, evidence, legality, side constraints, effects on third parties, trustworthiness, or freedom from threats.</span></figcaption>
  </figure>;
}

export function GainField({ className, compact = false, caption = "A moral trade is possible only when every participant prefers the proposal to the no-deal default." }: GainFieldProps) {
  return compact ? <StaticField caption={caption} className={className} /> : <InteractiveField caption={caption} className={className} />;
}

interface OffsetFlowFigureProps { className?: string }
export function OffsetFlowFigure({ className }: OffsetFlowFigureProps) {
  const id = useId().replace(/:/g, "");
  return <figure className={["mt-offset-flow", className].filter(Boolean).join(" ")}><svg aria-labelledby={`offset-title-${id} offset-desc-${id}`} role="img" viewBox="0 0 760 360"><title id={`offset-title-${id}`}>Donation-offset redirection</title><desc id={`offset-desc-${id}`}>Two opposed planned donations stop at a matched amount and redirect into one shared destination.</desc><rect className="mt-offset-paper" height="360" width="760" /><path className="mt-offset-source mt-offset-source-a" d="M80 86H334" /><path className="mt-offset-source mt-offset-source-b" d="M80 270H334" /><path className="mt-offset-turn mt-offset-turn-a" d="M334 86V174H472" /><path className="mt-offset-turn mt-offset-turn-b" d="M334 270V186H472" /><path className="mt-offset-shared" d="M472 180H690" /><circle className="mt-offset-junction" cx="472" cy="180" r="15" /><rect className="mt-offset-stop" height="42" width="8" x="330" y="65" /><rect className="mt-offset-stop" height="42" width="8" x="330" y="249" /><text className="mt-offset-label" x="80" y="62">Planned donation A</text><text className="mt-offset-label" x="80" y="246">Planned donation B</text><text className="mt-offset-label" textAnchor="middle" x="402" y="150">Matched amount</text><text className="mt-offset-label mt-offset-label-shared" textAnchor="end" x="690" y="158">Shared destination</text><text className="mt-offset-note" x="80" y="328">Unmatched surplus keeps its stated rule; it is never silently redirected.</text></svg></figure>;
}

interface ThresholdFieldProps { className?: string; progress?: number }
export function ThresholdField({ className, progress = 64 }: ThresholdFieldProps) {
  const bounded = Math.min(100, Math.max(0, progress));
  return <figure className={["mt-threshold-field", className].filter(Boolean).join(" ")}><div className="mt-threshold-heading"><span>Conditional pool</span><strong>{bounded}% pledged</strong></div><div className="mt-threshold-track" aria-label={`${bounded}% of the funding condition pledged`}><span className="mt-threshold-progress" style={{ width: `${bounded}%` }} /><span className="mt-threshold-line" aria-hidden="true" /></div><div className="mt-threshold-participants" aria-label="Distinct participant commitments">{Array.from({ length: 12 }, (_, i) => <span className={i < Math.round((bounded / 100) * 12) ? "is-pledged" : ""} key={i}>{String.fromCharCode(65 + i)}</span>)}</div><figcaption>Every participant keeps a named maximum exposure. Settlement activates only when the published condition passes.</figcaption></figure>;
}
