import { Camera, ClipboardList } from "lucide-react";

/** F1 + F3 — the two ways a traveller adds a log. */
export default function EntryPoints({ onScan, onLog }) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
        <div className="flex items-center gap-3">
          <Camera size={22} className="text-purple-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Food Waste Scanner</h2>
        </div>
        <p className="mt-3 text-lg text-slate-500">Use AI to scan and log plate waste</p>
        <div className="flex-1" />
        <button
          onClick={onScan}
          className="mt-6 w-full flex items-center justify-center gap-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
        >
          <Camera size={19} aria-hidden="true" />
          Scan Plate
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Resource Logger</h2>
        </div>
        <p className="mt-3 text-lg text-slate-500">
          Manually log food waste, plastic, water, and amenities
        </p>
        <div className="flex-1" />
        <button
          onClick={onLog}
          className="mt-6 w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 py-3.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <ClipboardList size={19} aria-hidden="true" />
          Log Resources
        </button>
      </div>
    </div>
  );
}
