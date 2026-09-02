/** Shared numeric input. Used by the resource logger and the edit modal. */
export default function NumberField({ label, hint, value, onChange, suffix }) {
  return (
    <div>
      <label className="block text-base font-semibold">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={
            "mt-3 w-full rounded-lg bg-slate-100 px-5 py-3.5 text-base text-slate-900 " +
            "tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 " +
            (suffix ? "pr-14" : "")
          }
        />
        {suffix && (
          <span className="pointer-events-none absolute right-5 top-1/2 mt-1.5 -translate-y-1/2 text-base text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
