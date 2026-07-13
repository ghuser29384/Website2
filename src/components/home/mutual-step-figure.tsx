export function MutualStepFigure() {
  return (
    <figure className="mt-home-figure" aria-labelledby="mutual-step-caption">
      <div className="mt-home-figure-topline">
        <span>Mutual Step / 01</span>
        <span>Conceptual map</span>
      </div>
      <div className="mt-home-figure-plot" role="img" aria-label="A short diagonal step from the no-trade baseline to an outcome both participants prefer">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 560 500">
          <g className="mt-home-figure-grid">
            <path d="M78 52v370M176 52v370M274 52v370M372 52v370M470 52v370" />
            <path d="M78 52h392M78 144h392M78 236h392M78 328h392M78 422h392" />
          </g>
          <path className="mt-home-figure-axis" d="M78 52v370h392" />
          <path className="mt-home-figure-vector" d="M176 328 372 144" />
          <rect className="mt-home-figure-start" height="26" width="26" x="163" y="315" />
          <rect className="mt-home-figure-end" height="26" width="26" x="359" y="131" />
        </svg>
        <span className="mt-home-figure-label mt-home-figure-label-start">No trade</span>
        <span className="mt-home-figure-label mt-home-figure-label-end">Both prefer</span>
        <span className="mt-home-figure-axis-label mt-home-figure-axis-label-y">Value to A</span>
        <span className="mt-home-figure-axis-label mt-home-figure-axis-label-x">Value to B</span>
      </div>
      <figcaption id="mutual-step-caption">
        <strong>One move. Two gains.</strong>
        <span>Each party evaluates the change by its own lights.</span>
      </figcaption>
    </figure>
  );
}
