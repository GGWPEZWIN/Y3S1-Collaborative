import { useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Image as ImageIcon,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Metric from "./Metric";

const TYPE_OPTIONS = [
  { value: "All", label: "All types" },
  { value: "Food", label: "Food waste" },
  { value: "Resource", label: "Resource logs" },
];

const NO_TRIP = "__no_trip__";
const tripLabel = (log) => (log.tripId ? log.tripTitle || "Untitled trip" : "No trip");

export default function RecentLogs({ logs, onOpenReports, onInspect, onEdit }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tripFilter, setTripFilter] = useState("All");

  // Only worth showing once at least one log actually carries a trip —
  // otherwise it's a filter with nothing to filter.
  const tripOptions = useMemo(() => {
    const seen = new Map();
    logs.forEach((log) => {
      const value = log.tripId || NO_TRIP;
      if (!seen.has(value)) seen.set(value, tripLabel(log));
    });
    return [
      { value: "All", label: "All trips" },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [logs]);
  const hasTripData = logs.some((log) => log.tripId);

  const filtersActive =
    typeFilter !== "All" || dateFrom !== "" || dateTo !== "" || tripFilter !== "All";

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        // "Food waste" means any log carrying a real food-waste amount, not
        // just ones created through the scanner — the Resource Logger lets
        // a user type that figure in by hand too.
        if (typeFilter === "Food" && !(Number(log.foodWaste) > 0)) return false;
        if (typeFilter === "Resource" && log.type !== "Resource") return false;
        if (dateFrom && log.iso < dateFrom) return false;
        if (dateTo && log.iso > dateTo) return false;
        if (tripFilter !== "All" && (log.tripId || NO_TRIP) !== tripFilter) return false;
        return true;
      }),
    [logs, typeFilter, dateFrom, dateTo, tripFilter]
  );

  const empty = logs.length === 0;
  const noMatches = !empty && filtered.length === 0;

  const clearFilters = () => {
    setTypeFilter("All");
    setDateFrom("");
    setDateTo("");
    setTripFilter("All");
  };

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Recent Logs</h2>
        {!empty && (
          <button
            onClick={onOpenReports}
            className="flex items-center gap-2.5 text-base text-slate-900 hover:text-slate-600 transition-colors focus:outline-none focus:underline"
          >
            <BarChart3 size={19} aria-hidden="true" />
            View Reports
          </button>
        )}
      </div>

      {!empty && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>

          {hasTripData && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Trip</span>
              <select
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {tripOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors px-2 py-2"
            >
              <X size={15} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {empty ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
          <ClipboardList size={26} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-lg font-medium">Nothing logged yet</p>
          <p className="mt-1 text-slate-500">
            Scan a plate or log your resources to start tracking your footprint.
          </p>
        </div>
      ) : noMatches ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
          <SlidersHorizontal size={26} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-lg font-medium">No logs match these filters</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-base text-slate-700 hover:text-slate-950 underline focus:outline-none"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 max-h-[640px] overflow-y-auto pr-1 -mr-1 space-y-4">
          {filtered.map((log) => (
            <article key={log.id} className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {log.date}
                    {log.editedAtMs && (
                      <span className="ml-2 align-middle text-sm font-normal text-slate-500">
                        edited
                      </span>
                    )}
                  </h3>
                  <p
                    className={
                      "mt-1 text-sm " + (log.tripId ? "text-green-700" : "text-slate-400")
                    }
                  >
                    {tripLabel(log)}
                  </p>
                </div>
                <span className="text-base text-slate-500">{log.type}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
                <Metric label="Food Waste" value={`${log.foodWaste}g`} empty={!log.foodWaste} />
                <Metric label="Plastic" value={`${log.plastic} items`} empty={!log.plastic} />
                <Metric label="Water" value={`${log.water}L`} empty={!log.water} />
                <Metric
                  label="Disposables"
                  value={`${log.disposables} items`}
                  empty={!log.disposables}
                />
              </dl>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4">
                <button
                  onClick={() => onEdit(log)}
                  className="flex items-center gap-2 text-base text-slate-700 hover:text-slate-950 transition-colors focus:outline-none focus:underline"
                >
                  <Pencil size={17} aria-hidden="true" />
                  Edit
                </button>
                {log.detections && (
                  <button
                    onClick={() => onInspect(log)}
                    className="flex items-center gap-2 text-base text-slate-700 hover:text-slate-950 transition-colors focus:outline-none focus:underline"
                  >
                    <ImageIcon size={17} aria-hidden="true" />
                    View scan
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
