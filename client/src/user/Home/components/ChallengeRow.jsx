import React from "react";

const DIFFICULTY_STYLES = {
  Easy: {
    background: "#f3f4f6",
    color: "#374151",
  },

  Medium: {
    background: "#111827",
    color: "#fff",
  },

  Hard: {
    background: "#dc2626",
    color: "#fff",
  },
};

export default function ChallengeRow({
  title = "Untitled Challenge",
  description = "",
  difficulty = "Easy",
  points = 0,
  joined = 0,
}) {
  const badgeStyle =
    DIFFICULTY_STYLES[difficulty] ||
    DIFFICULTY_STYLES.Easy;

  // Make sure Firebase values cannot crash the component.
  const safePoints =
    Number.isFinite(Number(points))
      ? Number(points)
      : 0;

  const safeJoined =
    Number.isFinite(Number(joined))
      ? Number(joined)
      : 0;

  return (
    <div style={styles.row}>
      <div style={styles.topLine}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.title}>
            {title}
          </div>

          <div style={styles.description}>
            {description}
          </div>
        </div>

        <span
          style={{
            ...styles.badge,
            ...badgeStyle,
          }}
        >
          {difficulty}
        </span>
      </div>

      <div style={styles.meta}>
        <span style={styles.points}>
          + {safePoints} pts
        </span>

        <span style={styles.joined}>
          {safeJoined.toLocaleString()} joined
        </span>
      </div>
    </div>
  );
}

const styles = {
  row: {
    padding: "14px 0",
    borderBottom: "1px solid #f3f4f6",
  },

  topLine: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontWeight: 700,
    fontSize: 14.5,
    color: "#111827",
  },

  description: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  badge: {
    fontSize: 12.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },

  meta: {
    display: "flex",
    gap: 16,
    marginTop: 8,
    alignItems: "center",
  },

  points: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#16a34a",
  },

  joined: {
    fontSize: 13,
    color: "#6b7280",
  },
};