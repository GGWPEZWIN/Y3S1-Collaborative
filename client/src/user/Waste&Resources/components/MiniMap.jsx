/** Schematic radial map. Swap for Leaflet / Google Maps in production. */
export default function MiniMap({ pois }) {
  const max = Math.max(...pois.map((p) => p.km), 1);
  return (
    <div className="relative rounded-lg bg-slate-50 border border-slate-200 h-48 overflow-hidden">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {[0.33, 0.66, 1].map((r, i) => (
          <circle
            key={i}
            cx="100"
            cy="60"
            r={r * 52}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        ))}
        <circle cx="100" cy="60" r="5" fill="#16A34A" />
        <text x="100" y="78" textAnchor="middle" fontSize="7" fill="#64748B">
          You
        </text>
        {pois.map((p, i) => {
          const angle = (i / pois.length) * Math.PI * 2 - Math.PI / 3;
          const r = (p.km / max) * 48;
          const x = 100 + Math.cos(angle) * r;
          const y = 60 + Math.sin(angle) * r * 0.75;
          return (
            <g key={p.name}>
              <line x1="100" y1="60" x2={x} y2={y} stroke="#CBD5E1" strokeDasharray="2 2" />
              <circle cx={x} cy={y} r="4" fill="#0EA5E9" />
              <text x={x} y={y - 7} textAnchor="middle" fontSize="6.5" fill="#334155">
                {p.km}km
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
