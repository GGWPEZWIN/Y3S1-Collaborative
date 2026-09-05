import React from "react";

/**
 * EcoScoreBadge
 *
 * The small green "Eco Score / 90" chip used on activity, accommodation and
 * itinerary cards. Colour steps down as the score drops so a weak option is
 * visible at a glance.
 *
 * Props:
 * - score — 0–100
 * - label — text above the number (defaults to "Eco Score")
 * - size  — "sm" | "md"
 */
export default function EcoScoreBadge({ score, label = "Eco Score", size = "md" }) {
  const tone = toneFor(score);
  const compact = size === "sm";

  return (
    <div style={styles.wrap}>
      {label && (
        <span style={{ ...styles.label, fontSize: compact ? 10.5 : 11.5 }}>
          {label}
        </span>
      )}
      <span
        style={{
          ...styles.value,
          background: tone.bg,
          color: tone.fg,
          fontSize: compact ? 12.5 : 14,
          padding: compact ? "2px 10px" : "4px 14px",
        }}
      >
        {score}
      </span>
    </div>
  );
}

function toneFor(score) {
  if (score >= 85) return { bg: "#dcfce7", fg: "#15803d" };
  if (score >= 70) return { bg: "#fef3c7", fg: "#b45309" };
  return { bg: "#fee2e2", fg: "#b91c1c" };
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  label: { color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" },
  value: { fontWeight: 800, borderRadius: 8, lineHeight: 1.6 },
};
