interface Slice {
  value: number;
  color: string;
}

/** Minimal SVG donut — values are fractions that need not sum to exactly 1. */
export function Donut({ slices, size = 92 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={12}
      />
      {slices.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={12}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={18}
        fontWeight={800}
        fill="var(--ink)"
      >
        {Math.round((slices[0]?.value ?? 0) * 100)}%
      </text>
    </svg>
  );
}
