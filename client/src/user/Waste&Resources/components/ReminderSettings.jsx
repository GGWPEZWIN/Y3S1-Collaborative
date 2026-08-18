import { Bell, BellOff } from "lucide-react";
import { LODGING } from "../constants/waste";

const STATUS_COPY = {
  denied: "Location permission denied. Enable it in your browser settings.",
  unsupported: "Geolocation is not available in this context.",
  idle: "Off. No background location is collected.",
};

/** F4 — geofence toggle and live status. */
export default function ReminderSettings({ enabled, onToggle, status, distance }) {
  const detail =
    status === "watching"
      ? `Geofence active · ${LODGING.radiusM}m radius${
          distance !== null ? ` · ${distance}m away` : ""
        }`
      : STATUS_COPY[status];

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Logging Reminders</h2>
          <p className="mt-2 text-lg text-slate-500">
            Notify me when I return to {LODGING.name}
          </p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={enabled}
          className={
            "shrink-0 flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 " +
            (enabled
              ? "bg-green-100 text-green-800 focus:ring-green-500"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400")
          }
        >
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
          {enabled ? "On" : "Off"}
        </button>
      </div>
    </section>
  );
}
