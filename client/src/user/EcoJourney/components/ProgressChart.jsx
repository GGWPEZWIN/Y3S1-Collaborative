import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom tooltip that mirrors the "Trip 2 / Eco Score: 92" callout style
// from the design — a small bordered card anchored above the point.
function SnapshotTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-white border border-green-200 rounded-lg shadow-md px-3 py-2">
      <div className="text-sm font-semibold text-gray-900">{point.tripName}</div>
      <div className="text-sm text-green-600">Eco Score: {point.ecoScore}</div>
    </div>
  );
}

/**
 * ProgressChart
 *
 * Sparkline-style line chart of Eco Score across recent trips.
 * data: [{ label: "T1", tripName: "Trip 1", ecoScore: 78 }, ...]
 */
export default function ProgressChart({ data = [] }) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={{ stroke: "#111827" }}
            tickLine={false}
            tick={{ fill: "#111827", fontSize: 13, fontWeight: 600 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
          <Tooltip
            content={<SnapshotTooltip />}
            cursor={{ stroke: "#111827", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="ecoScore"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={{ r: 5, fill: "#22C55E", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#22C55E", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}