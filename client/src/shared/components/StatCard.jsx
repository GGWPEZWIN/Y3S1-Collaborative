import React from "react";
import { Leaf, TrendingUp, Calendar, Award } from "lucide-react";

// Some call sites pass icon as a string key (icon="leaf"); others pass the
// actual lucide component directly (icon={Leaf}) plus iconColor. Both work.
const ICON_MAP = {
  leaf: { Icon: Leaf, color: "#16A34A" },
  trend: { Icon: TrendingUp, color: "#2563EB" },
  calendar: { Icon: Calendar, color: "#7C3AED" },
  award: { Icon: Award, color: "#EA8C1E" },
};

/**
 * StatCard — shared across Community and Home dashboards.
 *
 * icon: "leaf" | "trend" | "calendar" | "award"  OR  a lucide component (pair with iconColor)
 * label / value: header label + big number
 * note: bold caption directly under the value (Home)
 * sub / sublabel: gray caption at the bottom (Community / Home) — aliases of each other
 * subColor: overrides the sub/sublabel color
 * trendLabel + trendDirection ("up"|"down"): green/red arrow + delta line (Community)
 * progress: 0–1, renders a progress bar
 * underlineLabel: underlines the header label
 */
export default function StatCard({
  icon = "leaf",
  iconColor,
  label,
  value,
  note,
  sub,
  sublabel,
  subColor,
  trendLabel,
  trendDirection = "up",
  progress,
  underlineLabel = false,
}) {
  let Icon, resolvedColor;
  if (typeof icon === "string") {
    const mapped = ICON_MAP[icon] || ICON_MAP.leaf;
    Icon = mapped.Icon;
    resolvedColor = iconColor || mapped.color;
  } else {
    Icon = icon;
    resolvedColor = iconColor;
  }

  const bottomCaption = sub ?? sublabel;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ ...styles.label, ...(underlineLabel ? styles.labelUnderline : null) }}>
          {label}
        </span>
        {Icon && <Icon size={18} color={resolvedColor} strokeWidth={2.25} />}
      </div>

      <div style={styles.value}>{value}</div>

      {note && <div style={styles.note}>{note}</div>}

      {trendLabel && (
        <div style={{ ...styles.trend, color: trendDirection === "up" ? "#16a34a" : "#ef4444" }}>
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

      {bottomCaption && (
        <span style={{ ...styles.sublabel, color: subColor || "#9ca3af" }}>{bottomCaption}</span>
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
    gap: 8,
    minWidth: 0,
    textAlign: "left",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  labelUnderline: { textDecoration: "underline", textUnderlineOffset: 3 },
  value: { fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 },
  note: { fontSize: 13.5, color: "#374151", fontWeight: 600 },
  trend: { fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 },
  progressTrack: { width: "100%", height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: "#111827", borderRadius: 999, transition: "width 0.3s ease" },
  sublabel: { fontSize: 12 },
};