interface GainFieldProps {
  className?: string;
  compact?: boolean;
  caption?: string;
}

export function GainField({
  className,
  compact = false,
  caption = "The marked agreement improves on the no-deal default for both participants.",
}: GainFieldProps) {
  const titleId = compact ? "gain-field-title-compact" : "gain-field-title";
  const descriptionId = compact ? "gain-field-description-compact" : "gain-field-description";

  return (
    <figure className={["mt-gain-field", compact ? "is-compact" : "", className]
      .filter(Boolean)
      .join(" ")}>
      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        role="img"
        viewBox="0 0 720 520"
      >
        <title id={titleId}>Mutual-gain field</title>
        <desc id={descriptionId}>
          Two independent participant measures cross at a no-deal default. A marked agreement sits
          above and to the right, inside the region both participants prefer.
        </desc>
        <defs>
          <pattern height="28" id="mt-gain-grid" patternUnits="userSpaceOnUse" width="28">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity="0.09" strokeWidth="1" />
          </pattern>
          <pattern height="14" id="mt-gain-hatch" patternUnits="userSpaceOnUse" width="14" patternTransform="rotate(45)">
            <line stroke="currentColor" strokeOpacity="0.17" strokeWidth="2" x1="0" x2="0" y1="0" y2="14" />
          </pattern>
        </defs>

        <rect className="mt-gain-field-paper" height="520" width="720" />
        <rect className="mt-gain-field-grid" fill="url(#mt-gain-grid)" height="520" width="720" />
        <path
          className="mt-gain-field-region"
          d="M208 382H640V76H208Z"
          fill="url(#mt-gain-hatch)"
        />
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

interface OffsetFlowFigureProps {
  className?: string;
}

export function OffsetFlowFigure({ className }: OffsetFlowFigureProps) {
  return (
    <figure className={["mt-offset-flow", className].filter(Boolean).join(" ")}>
      <svg aria-labelledby="offset-flow-title offset-flow-description" role="img" viewBox="0 0 760 360">
        <title id="offset-flow-title">Donation-offset redirection</title>
        <desc id="offset-flow-description">
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
