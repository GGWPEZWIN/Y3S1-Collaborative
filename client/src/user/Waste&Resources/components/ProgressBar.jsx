/** Slim determinate progress bar. */
export default function ProgressBar({ value, className = "h-2" }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className={"w-full rounded-full bg-slate-200 overflow-hidden " + className}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-slate-950" style={{ width: `${pct}%` }} />
    </div>
  );
}
