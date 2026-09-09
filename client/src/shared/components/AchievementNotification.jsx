import React, { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  X,
  Recycle,
  Sprout,
  Bus,
  Droplet,
  Zap,
  Leaf,
  TreePine,
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

function getIcon(iconName) {
  if (!iconName) return Award;
  if (ICON_MAP[iconName]) return ICON_MAP[iconName];

  const key = Object.keys(ICON_MAP).find(
    (item) => item.toLowerCase() === String(iconName).toLowerCase()
  );

  return key ? ICON_MAP[key] : Award;
}

function getRequirementText(achievement) {
  const target = Math.max(Number(achievement?.ruleTarget) || 1, 1);
  const unit = achievement?.ruleUnit || "";

  switch (achievement?.ruleType) {
    case "trips_completed":
      return target === 1
        ? "You completed your first trip."
        : `You completed ${target} ${unit || "trips"}.`;

    case "eco_score":
      return `You reached an Eco Score of ${target}.`;

    case "challenges_completed":
      return `You completed ${target} ${unit || "challenges"}.`;

    case "carbon_saved":
      return `You saved ${target} ${unit || "kg CO₂"}.`;

    case "waste_reduced":
      return `You reduced ${target} ${unit || "kg"} of waste.`;

    default:
      return "You reached the achievement requirement.";
  }
}

function AchievementToast({ item, onClose }) {
  const achievement = item?.achievement || {};
  const Icon = getIcon(achievement.icon);

  useEffect(() => {
    const timer = window.setTimeout(onClose, 6500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={styles.toast}>
      <div style={styles.topLine}>
        <div style={styles.label}>
          <CheckCircle2 size={14} />
          Achievement Unlocked
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close achievement notification"
          style={styles.closeButton}
        >
          <X size={16} />
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.iconWrap}>
          {achievement.iconUrl ? (
            <img
              src={achievement.iconUrl}
              alt=""
              style={styles.iconImage}
              onError={(event) => {
                event.currentTarget.style.display = "none";
                const fallback =
                  event.currentTarget.parentElement?.querySelector(
                    ".achievement-toast-fallback"
                  );
                if (fallback) fallback.style.display = "block";
              }}
            />
          ) : null}

          <span
            className="achievement-toast-fallback"
            style={{
              ...styles.iconFallback,
              display: achievement.iconUrl ? "none" : "block",
            }}
          >
            <Icon size={30} />
          </span>
        </div>

        <div style={styles.text}>
          <div style={styles.title}>
            {achievement.title || "Achievement Unlocked"}
          </div>

          {achievement.category ? (
            <div style={styles.category}>
              {achievement.category}
            </div>
          ) : null}

          <div style={styles.description}>
            {achievement.description ||
              "You reached a new GreenTrip achievement."}
          </div>

          <div style={styles.requirement}>
            ✓ {getRequirementText(achievement)}
          </div>
        </div>
      </div>

      <div style={styles.bottom}>
        <span>Keep up your sustainable journey 🌱</span>
      </div>
    </div>
  );
}

export default function AchievementNotification() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleUnlocked = (event) => {
      const achievement = event?.detail?.achievement;

      if (!achievement?.id) return;

      const notificationId = `${achievement.id}-${Date.now()}`;

      setNotifications((current) => [
        ...current,
        {
          id: notificationId,
          achievement,
        },
      ]);
    };

    window.addEventListener(
      "greentrip:achievement-unlocked",
      handleUnlocked
    );

    return () => {
      window.removeEventListener(
        "greentrip:achievement-unlocked",
        handleUnlocked
      );
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  return (
    <div style={styles.container}>
      {notifications.map((item) => (
        <AchievementToast
          key={item.id}
          item={item}
          onClose={() => removeNotification(item.id)}
        />
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 22,
    right: 22,
    zIndex: 99999,
    width: "min(390px, calc(100vw - 32px))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    pointerEvents: "none",
  },

  toast: {
    pointerEvents: "auto",
    background: "#ffffff",
    border: "1px solid #bbf7d0",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
    animation: "greentripAchievementIn 0.35s ease-out",
  },

  topLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#15803d",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  closeButton: {
    width: 28,
    height: 28,
    border: 0,
    borderRadius: 8,
    background: "#f3f4f6",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  content: {
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
  },

  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 15,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  iconImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  iconFallback: {
    lineHeight: 0,
  },

  text: {
    minWidth: 0,
    flex: 1,
  },

  title: {
    color: "#111827",
    fontSize: 16,
    fontWeight: 800,
    lineHeight: 1.25,
  },

  category: {
    marginTop: 3,
    color: "#16a34a",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },

  description: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 12.5,
    lineHeight: 1.45,
  },

  requirement: {
    marginTop: 8,
    color: "#166534",
    fontSize: 11.5,
    fontWeight: 700,
  },

  bottom: {
    marginTop: 13,
    paddingTop: 10,
    borderTop: "1px solid #f0fdf4",
    color: "#9ca3af",
    fontSize: 10.5,
    fontWeight: 600,
  },
};

// Inject the tiny entrance animation once.
// This keeps the component self-contained without a separate CSS file.
if (typeof document !== "undefined" &&
    !document.getElementById("greentrip-achievement-animation")) {
  const style = document.createElement("style");
  style.id = "greentrip-achievement-animation";
  style.textContent = `
    @keyframes greentripAchievementIn {
      from {
        opacity: 0;
        transform: translateX(28px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}
