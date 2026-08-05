import React from "react";
import { Calendar, MapPin, TrendingDown, Award, Download, Share2, ChevronRight } from "lucide-react";

// Grade -> ring color. A+ and A both read as "great", but A+ gets the
// slightly deeper green to match the design's two-tone badge circles.
const GRADE_STYLES = {
  "A+": { ring: "bg-green-100 text-green-700", bar: "bg-gray-900" },
  A: { ring: "bg-green-50 text-green-600", bar: "bg-gray-900" },
};

/**
 * ReportCard
 *
 * One trip entry in Travel History: name, status, dates/location, eco
 * score with progress bar, carbon total, badges earned, and actions.
 *
 * Props: a trip object from dashboardService.getTravelHistory(), plus
 * onViewReport(trip), onDownload(trip), onShare(trip) callbacks.
 */
export default function ReportCard({ trip, onViewReport, onDownload, onShare }) {
  const gradeStyle = GRADE_STYLES[trip.grade] || GRADE_STYLES.A;
  // Eco score is out of 100 — use it directly as the bar fill percentage.
  const scorePct = Math.min(Math.max(trip.ecoScore, 0), 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1.5 bg-green-500" />
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{trip.name}</h3>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                {trip.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar size={14} />
              <span>{trip.dateRange}</span>
            </div>
            {trip.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin size={14} />
                <span>{trip.location}</span>
              </div>
            )}
          </div>

          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${gradeStyle.ring}`}
          >
            {trip.grade}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">Eco Score</div>
            <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
              <span aria-hidden="true">🌱</span>
              <span>{trip.ecoScore}</span>
              <span className="text-sm font-semibold text-green-600">{trip.grade}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${gradeStyle.bar}`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">Carbon</div>
            <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
              <TrendingDown size={16} className="text-blue-600" />
              <span>{trip.carbonKg} kg CO₂</span>
            </div>
          </div>

          {trip.badgesEarned > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Badges</div>
              <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
                <Award size={16} className="text-amber-500" />
                <span>{trip.badgesEarned} earned</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onViewReport?.(trip)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
          >
            View Eco-Report Card
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onDownload?.(trip)}
            className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
          >
            <Download size={16} />
            Download Report
          </button>
          <button
            onClick={() => onShare?.(trip)}
            className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}