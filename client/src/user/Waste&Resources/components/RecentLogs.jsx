import { BarChart3, ClipboardList, Image as ImageIcon, Pencil } from "lucide-react";
import Metric from "./Metric";

export default function RecentLogs({ logs, onOpenReports, onInspect, onEdit }) {
  const empty = logs.length === 0;

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between">
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

      {empty ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
          <ClipboardList size={26} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-lg font-medium">Nothing logged yet</p>
          <p className="mt-1 text-slate-500">
            Scan a plate or log your resources to start tracking your footprint.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {logs.map((log) => (
            <article key={log.id} className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">
                  {log.date}
                  {log.editedAtMs && (
                    <span className="ml-2 align-middle text-sm font-normal text-slate-500">
                      edited
                    </span>
                  )}
                </h3>
                <span className="text-base text-slate-500">{log.type}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
                <Metric label="Food Waste" value={`${log.foodWaste}g`} />
                <Metric label="Plastic" value={`${log.plastic} items`} />
                <Metric label="Water" value={`${log.water}L`} />
                <Metric label="Disposables" value={`${log.disposables} items`} />
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
