import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import NumberField from "./NumberField";
import { getBenchmarks } from "../services/baselineService";

/* ==================================================================
   RESOURCE LOGGER  (F3)
   ------------------------------------------------------------------
   Full-page logger matching the Figma specification: two numeric
   fields, a single water slider, and an impact summary.
   ================================================================== */

const WATER_MAX = 200;

export default function ResourceLoggerView({ onBack, onCommit }) {
  const [plastic, setPlastic] = useState(0);
  const [water, setWater] = useState(50);
  const [disposables, setDisposables] = useState(0);

  const benchmarks = getBenchmarks();

  return (
    // flex-1 fills the space beside the sidebar; the inner wrapper caps the
    // reading width and centres it. Putting max-w on <main> alone would cap
    // the width but pin the card to the left edge, with no centring.
    <main className="flex-1 px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-base font-medium hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back
        </button>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Resource Logger</h1>
        <p className="mt-2 text-lg text-slate-500">Track your daily consumption</p>

        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Log Today&apos;s Usage</h2>

          <div className="mt-6 space-y-6">
            <NumberField
              label="Single-Use Plastic Items"
              hint="Bottles, bags, straws, containers, etc."
              value={plastic}
              onChange={setPlastic}
            />

            <div>
              <label className="block text-base font-semibold">Water Usage (Liters)</label>
              <input
                type="range"
                min={0}
                max={WATER_MAX}
                step={5}
                value={water}
                onChange={(e) => setWater(Number(e.target.value))}
                aria-label="Water usage in liters"
                className="mt-3 w-full accent-slate-950 cursor-pointer"
              />
              <div className="mt-1 flex items-center justify-between text-base">
                <span className="text-slate-500">0L</span>
                <span className="font-semibold tabular-nums">{water}L</span>
                <span className="text-slate-500">{WATER_MAX}L</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Shower, washing, drinking water</p>
            </div>

            <NumberField
              label="Disposable Amenities"
              hint="Toothbrushes, razors, slippers, etc."
              value={disposables}
              onChange={setDisposables}
            />
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 px-5 py-4">
            <h3 className="text-base font-semibold">Impact Summary</h3>
            <ul className="mt-3 space-y-1.5 text-base text-slate-700">
              <li>
                • Plastic items: {plastic} (Avg: {benchmarks.plastic.toFixed(1)}/day)
              </li>
              <li>
                • Water: {water}L (Avg: {benchmarks.water}L/day)
              </li>
              <li>
                {/* No published baseline exists for hotel amenities, so this is
                    an app-defined target rather than a statistical average. */}
                • Disposables: {disposables} (Target: {benchmarks.disposables}/day)
              </li>
            </ul>
          </div>

          <button
            onClick={() =>
              onCommit({
                type: "Resource",
                source: "manual",
                foodWaste: 0,
                plastic,
                water,
                disposables,
                showerMin: 0,
              })
            }
            className="mt-6 w-full rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
          >
            Save Log
          </button>
        </section>
      </div>
    </main>
  );
}
