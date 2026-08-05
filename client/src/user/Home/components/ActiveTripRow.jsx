import React from "react";
import { TrendingDown } from "lucide-react";

export default function ActiveTripRow({ title, dateRange, score, carbonKg, destinations }) {
  return (
    <div style={styles.row}>
      <div style={styles.topLine}>
        <div>
          <div style={styles.title}>{title}</div>
          <div style={styles.dates}>{dateRange}</div>
        </div>
        <span style={styles.scorePill}>Score: {score}</span>
      </div>
      <div style={styles.meta}>
        <span style={styles.metaItem}>
          <TrendingDown size={14} color="#3b82f6" /> {carbonKg} kg CO₂
        </span>
        <span style={styles.metaItem}>{destinations} destinations</span>
      </div>
    </div>
  );
}

const styles = {
  row: { padding: "14px 0", borderBottom: "1px solid #f3f4f6" },
  topLine: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: { fontWeight: 700, fontSize: 14.5, color: "#111827" },
  dates: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  scorePill: {
    background: "#111827",
    color: "#fff",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  meta: { display: "flex", gap: 16, marginTop: 8 },
  metaItem: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#374151" },
};