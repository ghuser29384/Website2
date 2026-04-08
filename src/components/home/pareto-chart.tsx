import type { EvaluatedPair, Offer } from "@/lib/offers";
import { clamp } from "@/lib/offers";

interface ParetoChartProps {
  selected: Offer | null;
  pairs: EvaluatedPair[];
}

export function ParetoChart({ selected, pairs }: ParetoChartProps) {
  const width = 520;
  const height = 360;
  const margin = 58;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const gridValues = [0, 25, 50, 75, 100];
  const statusQuo = { x: 18, y: 18 };

  const plotted = selected
    ? pairs.slice(0, 4).map((pair, index) => {
        const trustPenalty = Math.abs(selected.trustLevel - pair.offer.trustLevel) * 5;
        const selfValue = clamp(
          20 +
            selected.offerImpact * 5 +
            Math.max(0, pair.offer.offerImpact - selected.minCounterpartyImpact) * 7 +
            (pair.exact ? 10 : 0) -
            trustPenalty,
          5,
          96,
        );
        const otherValue = clamp(
          20 +
            pair.offer.offerImpact * 5 +
            Math.max(0, selected.offerImpact - pair.offer.minCounterpartyImpact) * 7 +
            (pair.exact ? 10 : 0) -
            trustPenalty,
          5,
          96,
        );

        return {
          label: pair.offer.alias,
          exact: pair.exact,
          x: margin + (otherValue / 100) * plotWidth,
          y: height - margin - (selfValue / 100) * plotHeight,
          color: pair.exact ? "#1f5e57" : "#b55d31",
          size: index === 0 ? 8 : 6,
        };
      })
    : [];

  const statusX = margin + (statusQuo.x / 100) * plotWidth;
  const statusY = height - margin - (statusQuo.y / 100) * plotHeight;

  return (
    <article className="panel chart-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Choiceworthiness view</p>
          <h3>Illustrative reciprocity map</h3>
        </div>
      </div>
      <svg
        aria-labelledby="pareto-title pareto-desc"
        className="pareto-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title id="pareto-title">Moral trade choiceworthiness chart</title>
        <desc id="pareto-desc">
          A chart showing a status quo point and possible matched outcomes that improve value
          for both sides.
        </desc>

        <rect fill="transparent" height={height} rx="22" width={width} x="0" y="0" />

        {gridValues.map((value) => {
          const y = height - margin - (value / 100) * plotHeight;
          const x = margin + (value / 100) * plotWidth;

          return (
            <g key={value}>
              <line
                stroke="rgba(31, 94, 87, 0.12)"
                strokeWidth="1"
                x1={margin}
                x2={width - margin}
                y1={y}
                y2={y}
              />
              <line
                stroke="rgba(31, 94, 87, 0.08)"
                strokeWidth="1"
                x1={x}
                x2={x}
                y1={margin}
                y2={height - margin}
              />
              <text fill="#536862" fontSize="12" textAnchor="end" x={margin - 10} y={y + 4}>
                {value}
              </text>
              <text
                fill="#536862"
                fontSize="12"
                textAnchor="middle"
                x={x}
                y={height - margin + 18}
              >
                {value}
              </text>
            </g>
          );
        })}

        <line
          stroke="#173530"
          strokeWidth="1.4"
          x1={margin}
          x2={width - margin}
          y1={height - margin}
          y2={height - margin}
        />
        <line
          stroke="#173530"
          strokeWidth="1.4"
          x1={margin}
          x2={margin}
          y1={margin}
          y2={height - margin}
        />

        <text fill="#173530" fontSize="13" textAnchor="middle" x={width / 2} y={height - 14}>
          Counterparty moral improvement
        </text>
        <text
          fill="#173530"
          fontSize="13"
          textAnchor="middle"
          transform={`rotate(-90 18 ${height / 2})`}
          x="18"
          y={height / 2}
        >
          Your moral improvement
        </text>

        <circle cx={statusX} cy={statusY} fill="#b98a2f" r="7" />
        <text fill="#173530" fontSize="12" x={statusX + 10} y={statusY - 10}>
          Status quo
        </text>

        {plotted.map((point) => (
          <line
            key={`line-${point.label}`}
            opacity="0.85"
            stroke={point.color}
            strokeDasharray={point.exact ? undefined : "5 5"}
            strokeWidth={point.exact ? 2.8 : 1.8}
            x1={statusX}
            x2={point.x}
            y1={statusY}
            y2={point.y}
          />
        ))}

        {plotted.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} fill={point.color} opacity="0.12" r={point.size + 6} />
            <circle cx={point.x} cy={point.y} fill={point.color} r={point.size} />
            <text fill="#173530" fontSize="12" x={point.x + 10} y={point.y - 10}>
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="chart-caption">
        Status quo is fixed in the lower-left. Better candidates move up and right when both
        sides clear each other&apos;s stated minimum threshold and align on trust.
      </p>
    </article>
  );
}
