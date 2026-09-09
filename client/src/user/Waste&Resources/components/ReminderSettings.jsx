import { useState } from "react";
import { Bell, BellOff, MapPin, Pencil } from "lucide-react";
import { getCurrentPosition } from "../services/geoService";
import { DEFAULT_RADIUS_M } from "../services/lodgingService";

const STATUS_COPY = {
  denied: "Location permission denied. Enable it in your browser settings.",
  unsupported: "Geolocation is not available in this context.",
  idle: "Off. No background location is collected.",
  "no-lodging": "Set your lodging below to enable reminders.",
};

/** F4 — lets the traveller register where they're staying, using their own
 *  current GPS fix. The geofence has nothing to compare against without it,
 *  so there is no default hotel baked into the app. */
function LodgingForm({ initialName, onCancel, onSave }) {
  const [name, setName] = useState(initialName || "");
  const [state, setState] = useState("idle"); // idle | locating | error

  const useCurrentLocation = async () => {
    setState("locating");
    const pos = await getCurrentPosition({ timeout: 10000 });
    if (!pos) {
      setState("error");
      return;
    }
    await onSave({ name: name.trim() || "My lodging", ...pos, radiusM: DEFAULT_RADIUS_M });
  };

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Lodging name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hotel Seri Malaysia, Butterworth"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </label>

      <p className="text-sm text-slate-500">
        Stand where you are staying and tap the button below — the geofence
        is centred on that position, not a typed address.
      </p>

      {state === "error" && (
        <p className="text-sm text-red-600">
          Could not get your location. Check permissions and try again.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={useCurrentLocation}
          disabled={state === "locating"}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 text-base font-medium transition-colors"
        >
          <MapPin size={17} aria-hidden="true" />
          {state === "locating" ? "Locating…" : "Use my current location"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-base font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/** F4 — geofence toggle and live status. */
export default function ReminderSettings({ enabled, onToggle, status, distance, lodging, onSaveLodging }) {
  const [editing, setEditing] = useState(false);

  const detail =
    status === "watching"
      ? `Geofence active · ${lodging.radiusM}m radius${
          distance !== null ? ` · ${distance}m away` : ""
        }`
      : STATUS_COPY[status];

  const showForm = editing || !lodging;

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Logging Reminders</h2>
          <p className="mt-2 text-lg text-slate-500">
            {lodging ? `Notify me when I return to ${lodging.name}` : "Notify me when I return to my lodging"}
          </p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lodging && !showForm && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Pencil size={15} aria-hidden="true" />
              Change
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={!lodging}
            role="switch"
            aria-checked={enabled}
            className={
              "flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed " +
              (enabled
                ? "bg-green-100 text-green-800 focus:ring-green-500"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400")
            }
          >
            {enabled ? <Bell size={18} /> : <BellOff size={18} />}
            {enabled ? "On" : "Off"}
          </button>
        </div>
      </div>

      {showForm && (
        <LodgingForm
          initialName={lodging ? lodging.name : ""}
          onCancel={lodging ? () => setEditing(false) : null}
          onSave={async (next) => {
            await onSaveLodging(next);
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}
