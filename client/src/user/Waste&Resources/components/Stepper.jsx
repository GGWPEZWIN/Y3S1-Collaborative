import { Minus, Plus } from "lucide-react";

export default function Stepper({ label, hint, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label}`}
          className="w-11 h-11 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <Minus size={18} />
        </button>
        <span className="w-12 text-center text-xl font-semibold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="w-11 h-11 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
