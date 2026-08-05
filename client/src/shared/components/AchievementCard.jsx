import React from "react";

/**
 * AchievementCard
 *
 * Small tile used in the main dashboard's "Recent Achievements" grid:
 * emoji icon, title, category, and the date earned (already formatted).
 *
 * Props: { icon, title, category, dateEarned }
 */
export default function AchievementCard({ icon, title, category, dateEarned }) {
  return (
    <div style={styles.card}>
      <div style={styles.icon}>{icon}</div>
      <div style={styles.title}>{title}</div>
      <div style={styles.category}>{category}</div>
      <div style={styles.date}>{dateEarned}</div>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #f3f4f6",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 4,
  },
  icon: { fontSize: 34, marginBottom: 6 },
  title: { fontWeight: 700, color: "#111827" },
  category: { fontSize: 13, color: "#9ca3af" },
  date: { fontSize: 13, color: "#9ca3af" },
};