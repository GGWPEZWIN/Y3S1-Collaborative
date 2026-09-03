import React from "react";

import {
  Recycle,
  Sprout,
  Bus,
  Droplet,
  Zap,
  Leaf,
  Award,
  TreePine,
  Lock,
  Check,
} from "lucide-react";

const ICON_MAP = {
  Recycle,
  Sprout,
  Bus,
  Droplet,
  Zap,
  Leaf,
  Award,
  TreePine,
};

export default function AchievementCard({
  title,
  description,
  category,
  icon = "Award",
  iconUrl = "",
  points = 0,

  unlocked = false,

  progress = 0,
  ruleTarget = 1,
  ruleUnit = "",
}) {
  const Icon =
    ICON_MAP[icon] || Award;

  const safeTarget = Math.max(
    Number(ruleTarget) || 1,
    1
  );

  const safeProgress = Math.max(
    0,
    Math.min(
      Number(progress) || 0,
      safeTarget
    )
  );

  const percentage = Math.min(
    100,
    Math.round(
      (safeProgress / safeTarget) * 100
    )
  );

  return (
    <div
      style={{
        ...styles.card,
        ...(unlocked
          ? styles.unlockedCard
          : styles.lockedCard),
      }}
    >
      {/* ICON */}

      <div style={styles.top}>
        <div
          style={{
            ...styles.iconWrap,
            ...(unlocked
              ? styles.iconUnlocked
              : styles.iconLocked),
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={title || "Achievement"}
              style={{
                ...styles.iconImage,

                ...(unlocked
                  ? {}
                  : styles.lockedImage),
              }}
            />
          ) : (
            <Icon
              size={27}
              color={
                unlocked
                  ? "#15803d"
                  : "#9ca3af"
              }
            />
          )}

          {!unlocked && (
            <div
              style={styles.lockOverlay}
            >
              <Lock size={12} />
            </div>
          )}
        </div>

        {unlocked ? (
          <div
            style={
              styles.unlockedBadge
            }
          >
            <Check size={12} />
            Unlocked
          </div>
        ) : (
          <div
            style={styles.lockedBadge}
          >
            Locked
          </div>
        )}
      </div>

      {/* TITLE */}

      <div style={styles.title}>
        {title || "Achievement"}
      </div>

      {/* CATEGORY */}

      {category && (
        <div style={styles.category}>
          {category}
        </div>
      )}

      {/* DESCRIPTION */}

      <div style={styles.description}>
        {description ||
          "Complete the requirement to unlock this achievement."}
      </div>

      {/* PROGRESS */}

      {!unlocked && (
        <div
          style={styles.progressSection}
        >
          <div
            style={styles.progressHeader}
          >
            <span>
              Progress
            </span>

            <span>
              {safeProgress} /{" "}
              {safeTarget}
            </span>
          </div>

          <div
            style={styles.progressBar}
          >
            <div
              style={{
                ...styles.progressFill,
                width: `${percentage}%`,
              }}
            />
          </div>

          <div
            style={styles.requirement}
          >
            Reach {safeTarget}{" "}
            {ruleUnit}
          </div>
        </div>
      )}

      {/* BOTTOM */}

      <div style={styles.bottom}>
        <span style={styles.points}>
          +{Number(points) || 0} pts
        </span>

        {!unlocked && (
          <span style={styles.lockText}>
            Keep going!
          </span>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    borderRadius: 15,
    padding: 17,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },

  unlockedCard: {
    background: "#fff",
  },

  lockedCard: {
    background: "#fafafa",
  },

  top: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  iconWrap: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  iconUnlocked: {
    background: "#dcfce7",
  },

  iconLocked: {
    background: "#f3f4f6",
  },

  iconImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  lockedImage: {
    opacity: 0.55,
    filter: "grayscale(70%)",
  },

  lockOverlay: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#6b7280",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },

  unlockedBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 10.5,
    fontWeight: 800,
  },

  lockedBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#9ca3af",
    fontSize: 10.5,
    fontWeight: 800,
  },

  title: {
    fontSize: 15,
    fontWeight: 800,
    color: "#111827",
  },

  category: {
    marginTop: 3,
    color: "#16a34a",
    fontSize: 10.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  description: {
    marginTop: 7,
    color: "#6b7280",
    fontSize: 12.5,
    lineHeight: 1.45,
  },

  progressSection: {
    marginTop: 13,
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#6b7280",
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 5,
  },

  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#22c55e",
  },

  requirement: {
    marginTop: 5,
    color: "#9ca3af",
    fontSize: 10.5,
  },

  bottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTop: "1px solid #f3f4f6",
  },

  points: {
    color: "#111827",
    fontSize: 12,
    fontWeight: 800,
  },

  lockText: {
    color: "#9ca3af",
    fontSize: 10.5,
    fontWeight: 600,
  },
};