export default function StatCard({ label, icon: Icon, iconClass, value, caption, captionClass }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold">{label}</h3>
        <Icon size={21} className={iconClass} aria-hidden="true" />
      </div>
      <p className="mt-6 text-4xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className={"mt-2 text-sm " + captionClass}>{caption}</p>
    </div>
  );
}
