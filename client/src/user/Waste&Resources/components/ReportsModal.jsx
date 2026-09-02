import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "./Modal";
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_UNITS } from "../constants/waste";
import { gradeTone, varianceLabel } from "../services/benchmarkService";

/* ==================================================================
   REPORTING  (F7)
   ================================================================== */

const TABS = [
  { id: "monthly", label: "Monthly Eco-Summary" },
  { id: "annual", label: "Annual Ledger" },
];

export default function ReportsModal({ monthlies, mcc, onClose }) {
  const [tab, setTab] = useState("monthly");
  const [idx, setIdx] = useState(() => Math.max(0, monthlies.length - 1));
  const m = monthlies[idx];

  if (monthlies.length === 0) {
    return (
      <Modal title="Eco Reports" onClose={onClose} wide>
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
          <BarChart3 size={28} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-lg font-medium">No reports yet</p>
          <p className="mt-1 text-slate-500">
            Monthly summaries and your conservation contribution appear once you have
            logged a few days.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Eco Reports" onClose={onClose} wide>
      <div className="flex gap-2 border-b border-slate-200 -mt-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-4 py-3 text-base font-medium border-b-2 -mb-px transition-colors " +
              (tab === t.id
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && m && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-xl font-semibold">{m.label}</p>
              <p className="text-slate-500">{m.days} days logged</p>
            </div>
            <button
              onClick={() => setIdx((i) => Math.min(monthlies.length - 1, i + 1))}
              disabled={idx === monthlies.length - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-5">
            <div
              className={
                "w-24 h-24 rounded-2xl flex items-center justify-center " + gradeTone(m.grade)
              }
            >
              <span className="text-4xl font-bold">{m.grade}</span>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{Math.round(m.score)}/100</p>
              <p className="text-slate-500">Sustainability grade</p>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {m.categories.map((c) => {
              const better = c.variance < 0;
              const pct = Math.min(100, (c.perDay / (c.benchmark * 1.6)) * 100);
              return (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-medium">{CATEGORY_LABELS[c.key]}</span>
                    <span className="text-base tabular-nums">
                      {c.perDay.toFixed(c.key === "plastic" || c.key === "disposables" ? 1 : 0)}
                      {CATEGORY_UNITS[c.key]}
                      <span className="text-slate-500">
                        {" "}/ day vs {c.benchmark}
                        {CATEGORY_UNITS[c.key]}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-slate-100 relative overflow-hidden">
                    <div
                      className={"h-full rounded-full " + (better ? "bg-green-500" : "bg-orange-500")}
                      style={{ width: `${pct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                      style={{ left: "62.5%" }}
                      title="National baseline"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className={better ? "text-green-600" : "text-orange-600"}>
                      {varianceLabel(c.variance, c.key)}
                    </span>
                    {c.change !== null && (
                      <span className={c.change < 0 ? "text-green-600" : "text-slate-500"}>
                        {c.change < 0 ? "↓" : "↑"} {Math.abs(c.change).toFixed(0)}% vs last month
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "annual" && (
        <div className="mt-6">
          <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center">
            <p className="text-base text-green-800 font-medium">
              Malaysian Conservation Contribution
            </p>
            <p className="mt-2 text-6xl font-bold text-green-900 tabular-nums">{mcc.score}</p>
            <p className="mt-2 text-green-800">
              {mcc.totalAvoided.toFixed(1)} kg CO₂e avoided across {mcc.days} logged days
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Contribution by category</h3>
            <dl className="mt-4 space-y-3">
              {CATEGORY_KEYS.map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="text-base text-slate-500">{CATEGORY_LABELS[k]}</dt>
                  <dd
                    className={
                      "text-base font-semibold tabular-nums " +
                      (mcc.avoided[k] >= 0 ? "text-green-600" : "text-red-600")
                    }
                  >
                    {mcc.avoided[k] >= 0 ? "+" : ""}
                    {mcc.avoided[k].toFixed(2)} kg CO₂e
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Monthly ledger</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-slate-500 text-sm">
                    <th className="text-left font-medium py-2">Month</th>
                    <th className="text-right font-medium py-2">Days</th>
                    <th className="text-right font-medium py-2">Food</th>
                    <th className="text-right font-medium py-2">Plastic</th>
                    <th className="text-right font-medium py-2">Water</th>
                    <th className="text-right font-medium py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlies.map((mm) => (
                    <tr key={mm.key} className="border-t border-slate-200">
                      <td className="py-2.5">{mm.label}</td>
                      <td className="py-2.5 text-right tabular-nums">{mm.days}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {(mm.totals.foodWaste / 1000).toFixed(1)}kg
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{mm.totals.plastic}</td>
                      <td className="py-2.5 text-right tabular-nums">{mm.totals.water}L</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={
                            "inline-block px-2 py-0.5 rounded text-sm font-semibold " +
                            gradeTone(mm.grade)
                          }
                        >
                          {mm.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
