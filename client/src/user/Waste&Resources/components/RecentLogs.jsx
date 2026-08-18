import { BarChart3 } from "lucide-react";
import Metric from "./Metric";

export default function RecentLogs({ logs, onOpenReports, onInspect }) {
  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Logs</h2>
        <button
          onClick={onOpenReports}
          className="flex items-center gap-2.5 text-base text-slate-900 hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <BarChart3 size={19} aria-hidden="true" />
          View Reports
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {logs.map((log) => {
          const clickable = Boolean(log.detections);
          return (
            <article
              key={log.id}
              onClick={() => clickable && onInspect(log)}
              className={
                "border border-slate-200 rounded-lg p-5 " +
                (clickable ? "cursor-pointer hover:border-slate-300 transition-colors" : "")
              }
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{log.date}</h3>
                <span className="text-base text-slate-500">{log.type}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
                <Metric label="Food Waste" value={`${log.foodWaste}g`} />
                <Metric label="Plastic" value={`${log.plastic} items`} />
                <Metric label="Water" value={`${log.water}L`} />
                <Metric label="Disposables" value={`${log.disposables} items`} />
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
