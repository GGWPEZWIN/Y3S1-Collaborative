/** Pill tab bar. */
export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? "page" : undefined}
          className={
            "rounded-full px-4 py-2 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 " +
            (active === t.id
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
