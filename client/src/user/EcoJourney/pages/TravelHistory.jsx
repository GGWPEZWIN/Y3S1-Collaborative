import React, { useEffect, useState } from "react";
import { ChevronLeft, Search, Calendar, TrendingDown, Award } from "lucide-react";
import ReportCard from "../components/ReportCard";
import {
  getCurrentUser,
  getTravelHistorySummary,
  getTravelHistory,
} from "../services/dashboardService";

const STATUS_OPTIONS = ["All Trips", "Completed", "Upcoming"];
const SORT_OPTIONS = ["Newest First", "Oldest First", "Highest Score"];

function MiniStat({ value, label, valueClassName = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

/**
 * TravelHistory
 *
 * Lists completed (and upcoming) trips with search, status filter, and
 * sort controls, each rendered as a ReportCard. Data comes from
 * dashboardService (mock for now).
 *
 * Props: onBack() — called when the "Back" link is clicked.
 */
export default function TravelHistory({ onBack }) {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trips, setTrips] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Trips");
  const [sortBy, setSortBy] = useState("Newest First");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCurrentUser(), getTravelHistorySummary()]).then(([u, s]) => {
      setUser(u);
      setSummary(s);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getTravelHistory({ status, sortBy, query }).then((data) => {
      setTrips(data);
      setLoading(false);
    });
  }, [status, sortBy, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center text-white text-lg">
            🌿
          </div>
          <span className="text-xl font-bold text-gray-900">GreenTrip Malaysia</span>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="font-semibold text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-400">Eco Score: {user.ecoScore.toLocaleString()}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">
              🐼
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Travel History</h1>
          <p className="text-gray-500 mt-1">
            Review your eco-journeys and download personalized report cards
          </p>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-700 font-medium w-fit hover:text-gray-900"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <MiniStat value={summary.tripsCompleted} label="Trips Completed" />
            <MiniStat
              value={summary.avgEcoScore}
              label="Avg Eco Score"
              valueClassName="text-green-600"
            />
            <MiniStat value={`${summary.totalCarbonKg} kg`} label="Total CO₂" />
            <MiniStat
              value={summary.badgesEarned}
              label="Badges Earned"
              valueClassName="text-amber-500"
            />
          </div>
        )}

        {/* Search + filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trips..."
              className="w-full bg-gray-100 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Trip list */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading trips…</div>
        ) : trips.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No trips match your search — try a different keyword or filter.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {trips.map((trip) => (
              <ReportCard
                key={trip.id}
                trip={trip}
                onViewReport={(t) => console.log("view report", t.id)}
                onDownload={(t) => console.log("download report", t.id)}
                onShare={(t) => console.log("share report", t.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}