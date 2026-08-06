import React from "react";
import { ChevronLeft } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

// ---- Sample / placeholder data (swap with real API data later) ----
const TRIPS = [
  { name: "Cameron Highlands", month: "Jun 2026", grade: "A+", ecoScore: 95, carbonKg: 28.4 },
  { name: "Malacca Heritage", month: "May 2026", grade: "A+", ecoScore: 97, carbonKg: 18.2 },
  { name: "Taman Negara", month: "Apr 2026", grade: "A", ecoScore: 89, carbonKg: 52.1 },
  { name: "Penang Nature", month: "Jul 2026", grade: "A+", ecoScore: 92, carbonKg: 45.3 },
];

const ECO_TREND = TRIPS.map((t) => ({ name: t.name, score: t.ecoScore }));
const CARBON_DATA = TRIPS.map((t) => ({ name: t.name, carbon: t.carbonKg }));

const RADAR_DATA = [
  { category: "Transport", value: 85 },
  { category: "Food Waste", value: 80 },
  { category: "Plastic", value: 70 },
  { category: "Water", value: 68 },
  { category: "Activities", value: 74 },
  { category: "Lodging", value: 72 },
];

const GRADE_STYLES = {
  "A+": { bg: "#dcfce7", text: "#15803d" },
  A: { bg: "#dcfce7", text: "#16a34a" },
};

function TripGradeCard({ trip }) {
  const g = GRADE_STYLES[trip.grade] || GRADE_STYLES.A;
  return (
    <div style={styles.tripCard}>
      <div style={styles.tripHeadRow}>
        <div>
          <div style={styles.tripName}>{trip.name}</div>
          <div style={styles.tripMonth}>{trip.month}</div>
        </div>
        <div style={{ ...styles.gradeCircle, background: g.bg, color: g.text }}>{trip.grade}</div>
      </div>
      <div style={styles.tripStatsRow}>
        <div>
          <div style={styles.tripStatLabel}>Eco Score</div>
          <div style={styles.tripStatValueGreen}>{trip.ecoScore}</div>
        </div>
        <div>
          <div style={styles.tripStatLabel}>Carbon</div>
          <div style={styles.tripStatValue}>{trip.carbonKg} kg</div>
        </div>
      </div>
    </div>
  );
}

export default function ProgressTracker({ onBack }) {
  return (
    <div style={styles.content}>
      <h1 style={styles.pageTitle}>Progress Tracker</h1>
      <p style={styles.pageSubtitle}>Track your sustainability performance over time</p>

      <button type="button" onClick={onBack} style={styles.backBtn}>
        <ChevronLeft size={16} />
        Back
      </button>

      {/* Eco Score Across Trips */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Eco Score Across Trips</div>
        <div style={{ width: "100%", height: 220, marginTop: 12 }}>
          <ResponsiveContainer>
            <AreaChart data={ECO_TREND} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ecoScoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis domain={[80, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#ecoScoreFill)"
                dot={{ r: 5, fill: "#22c55e", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carbon Footprint per Trip - bar */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        <div style={styles.cardTitle}>Carbon Footprint per Trip (kg CO₂)</div>
        <div style={{ width: "100%", height: 220, marginTop: 12 }}>
          <ResponsiveContainer>
            <BarChart data={CARBON_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis domain={[0, 60]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Bar dataKey="carbon" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sustainability radar */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        <div style={styles.cardTitle}>Carbon Footprint per Trip (kg CO₂)</div>
        <div style={{ width: "100%", height: 260, marginTop: 12 }}>
          <ResponsiveContainer>
            <RadarChart data={RADAR_DATA} outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Radar dataKey="value" stroke="#22c55e" strokeWidth={2} fill="#22c55e" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trip grade cards */}
      <div style={styles.tripGrid}>
        {TRIPS.map((trip) => (
          <TripGradeCard key={trip.name} trip={trip} />
        ))}
      </div>
    </div>
  );
}

const styles = {
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto", textAlign: "left" },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: 0, color: "#111827" },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 16, fontSize: 14.5 },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 0",
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
  tripGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
    marginTop: 20,
    paddingBottom: 32,
  },
  tripCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
  },
  tripHeadRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  tripName: { fontSize: 16, fontWeight: 700, color: "#111827" },
  tripMonth: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14.5,
    flexShrink: 0,
  },
  tripStatsRow: { display: "flex", gap: 40, marginTop: 20 },
  tripStatLabel: { fontSize: 12.5, color: "#9ca3af", marginBottom: 4 },
  tripStatValueGreen: { fontSize: 17, fontWeight: 700, color: "#16a34a" },
  tripStatValue: { fontSize: 17, fontWeight: 700, color: "#111827" },
};