import type { GameState } from '../sim/types';

export function ComparisonChart({ world, baseline }: { world: GameState; baseline: GameState }) {
  const points = (state: GameState) => {
    let previousExists = false;
    return state.snapshots
      .map((s, i) => {
        const value = s.metrics.publicationShare;
        if (value === null) {
          previousExists = false;
          return '';
        }
        const segment = `${previousExists ? 'L' : 'M'}${50 + i * 68} ${194 - value * 160}`;
        previousExists = true;
        return segment;
      })
      .join(' ');
  };
  return (
    <svg
      viewBox="0 0 640 250"
      className="comparison-chart"
      role="img"
      aria-label="Women's weekly share of published work, your town versus no intervention, weeks zero through eight. Exact values are in the comparison table below."
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <path d={`M50 ${194 - p * 160}H594`} className="chart-grid" />
          <text x="36" y={198 - p * 160} textAnchor="end">
            {p * 100}%
          </text>
        </g>
      ))}
      <path d={points(baseline)} className="baseline-line" />
      <path d={points(world)} className="actual-line" />
      {world.snapshots.map((s, i) => (
        <g key={i}>
          {s.metrics.publicationShare !== null && (
            <circle
              cx={50 + i * 68}
              cy={194 - s.metrics.publicationShare * 160}
              r="3.5"
              fill="var(--olive)"
            />
          )}
          <text x={50 + i * 68} y="222" textAnchor="middle">
            {i}
          </text>
        </g>
      ))}
      <text x="320" y="247" textAnchor="middle">
        Week (0 = opening edition)
      </text>
    </svg>
  );
}
