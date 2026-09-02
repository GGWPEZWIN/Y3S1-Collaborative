import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import NumberField from "./NumberField";
import { getBenchmarks } from "../services/baselineService";

/* ==================================================================
   EDIT LOG  (F3)
   ------------------------------------------------------------------
   Mirrors ResourceLoggerView so correcting an entry looks and behaves
   exactly like creating one.

   Scanned masses carry roughly 20-30% error even in the published
   literature, so a user correction is what makes an estimate usable
   rather than a number to argue with. The first save snapshots the
   pre-edit values (see ledgerStore.updateLog), preserving the model's
   prediction alongside the correction.
   ================================================================== */

const WATER_STEP = 5;

export default function EditLogView({ log, onBack, onSave }) {
  const [values, setValues] = useState(() => ({
    foodWaste: Number(log.foodWaste) || 0,
    plastic: Number(log.plastic) || 0,
    water: Number(log.water) || 0,
    disposables: Number(log.disposables) || 0,
  }));
  const [saving, setSaving] = useState(false);

  const benchmarks = getBenchmarks();
  const original = log.original || null;

  // A stored log can exceed the logger's 200L default, so the ceiling has to
  // clear the existing value or the slider would silently clamp it down.
  const waterMax = Math.max(200, Math.ceil((Number(log.water) || 0) / 50) * 50);

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const changed = ["foodWaste", "plastic", "water", "disposables"].some(
    (k) => values[k] !== (Number(log[k]) || 0)
  );

  const revert = (key, suffix) =>
    original && original[key] !== values[key] ? (
      <button
        onClick={() => set(key)(original[key])}
        className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 focus:outline-none focus:underline"
      >
        <RotateCcw size={13} aria-hidden="true" />
        Originally {original[key]}
        {suffix}
      </button>
    ) : null;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(log, values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-base font-medium hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back
        </button>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Edit Log</h1>
        <p className="mt-2 text-lg text-slate-500">{log.date}</p>

        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Update Your Usage</h2>

          {log.source === "cv" && (
            <p className="mt-2 text-sm text-slate-500">
              This entry came from a plate scan. Correcting it keeps the original
              estimate on record.
            </p>
          )}

          <div className="mt-6 space-y-6">
            <div>
              <NumberField
                label="Food Waste"
                hint="Leftovers on the plate"
                suffix="g"
                value={values.foodWaste}
                onChange={set("foodWaste")}
              />
              {revert("foodWaste", "g")}
            </div>

            <div>
              <NumberField
                label="Single-Use Plastic Items"
                hint="Bottles, bags, straws, containers, etc."
                value={values.plastic}
                onChange={set("plastic")}
              />
              {revert("plastic", "")}
            </div>

            <div>
              <label className="block text-base font-semibold">Water Usage (Liters)</label>
              <input
                type="range"
                min={0}
                max={waterMax}
                step={WATER_STEP}
                value={values.water}
                onChange={(e) => set("water")(Number(e.target.value))}
                aria-label="Water usage in liters"
                className="mt-3 w-full accent-slate-950 cursor-pointer"
              />
              <div className="mt-1 flex items-center justify-between text-base">
                <span className="text-slate-500">0L</span>
                <span className="font-semibold tabular-nums">{values.water}L</span>
                <span className="text-slate-500">{waterMax}L</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Shower, washing, drinking water</p>
              {revert("water", "L")}
            </div>

            <div>
              <NumberField
                label="Disposable Amenities"
                hint="Toothbrushes, razors, slippers, etc."
                value={values.disposables}
                onChange={set("disposables")}
              />
              {revert("disposables", "")}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 px-5 py-4">
            <h3 className="text-base font-semibold">Impact Summary</h3>
            <ul className="mt-3 space-y-1.5 text-base text-slate-700">
              <li>
                • Food waste: {values.foodWaste}g (Avg: {benchmarks.foodWaste}g/day)
              </li>
              <li>
                • Plastic items: {values.plastic} (Avg: {benchmarks.plastic.toFixed(1)}/day)
              </li>
              <li>
                • Water: {values.water}L (Avg: {benchmarks.water}L/day)
              </li>
              <li>
                {/* No published baseline exists for hotel amenities, so this is
                    an app-defined target rather than a statistical average. */}
                • Disposables: {values.disposables} (Target: {benchmarks.disposables}/day)
              </li>
            </ul>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={onBack}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!changed || saving}
              className="rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 text-white py-3.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
