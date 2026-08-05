import React from "react";
import { Leaf, TrendingUp, Calendar, Award } from "lucide-react";

// Maps a short icon key to the lucide-react component + accent color used
// on the dashboard's summary row. Keeping this local avoids importing every
// icon everywhere StatCard is used.
const ICONS = {
  leaf: { Icon: Leaf, color: "#16A34A" },
  trend: { Icon: TrendingUp, color: "#2563EB" },
  calendar: { Icon: Calendar, color: "#7C3AED" },
  award: { Icon: Award, color: "#EA8C1E" },
};

/**
 * StatCard
 *
 * A single metric tile: icon + label in the header row, a large value,
 * and an optional sublabel (plain text) or progress bar underneath.
 *
 * Props:
 * - icon: "leaf" | "trend" | "calendar" | "award"
 * - label: string — header label next to the icon
 * - value: string | number — the big number
 * - sublabel: string — optional caption under the value (e.g. "Level 8")
 * - trendLabel: string — optional small green/red delta line (e.g. "▲ 12 this week")
 * - trendDirection: "up" | "down" — colors the trendLabel
 * - progress: number (0–1) — optional progress bar under the value
 * - underlineLabel: boolean — underlines the header label (e.g. "Total trips")
 */
export default function StatCard({
  icon = "leaf",
  label,
  value,
  sublabel,
  trendLabel,
  trendDirection = "up",
  progress,
  underlineLabel = false,
}) {
  const { Icon, color } = ICONS[icon] || ICONS.leaf;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span
          style={{
            ...styles.label,
            ...(underlineLabel ? styles.labelUnderline : null),
          }}
        >
          {label}
        </span>
        <Icon size={18} color={color} strokeWidth={2.25} />
      </div>

      <div style={styles.value}>{value}</div>

      {trendLabel && (
        <div
          style={{
            ...styles.trend,
            color: trendDirection === "up" ? "#16a34a" : "#ef4444",
          }}
        >
          <span>{trendDirection === "up" ? "▲" : "▼"}</span>
          <span>{trendLabel}</span>
        </div>
      )}

      {typeof progress === "number" && (
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
            }}
          />
        </div>
      )}

      {sublabel && (
        <span style={typeof progress === "number" ? styles.sublabelTight : styles.sublabel}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
    textAlign: "left",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  labelUnderline: {
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
  value: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1,
  },
  trend: {
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 999,
    transition: "width 0.3s ease",
  },
  sublabel: {
    fontSize: 12,
    color: "#9ca3af",
  },
  sublabelTight: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: -4,
  },
};