export default function Slider({ label, value, onChange, min, max, step, format, note }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-base font-medium">{label}</p>
        <span className="text-xl font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-3 w-full accent-green-600 cursor-pointer"
      />
      {note && <p className="mt-1.5 text-sm text-slate-500">{note}</p>}
    </div>
  );
}
