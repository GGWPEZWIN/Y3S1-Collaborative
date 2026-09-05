import React from "react";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";

/**
 * StepProgress
 *
 * The "Step N of 5" line plus the connected dots above every wizard screen.
 * Dots already passed and the current dot are green; the rest stay grey, and
 * the connecting bar fills to match.
 *
 * Props:
 * - current — 1-based index of the active step
 * - total   — how many steps there are (5 here)
 * - onStepClick(step) — optional; lets the user jump back to a finished step
 */
export default function StepProgress({ current, total = 5, onStepClick }) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  return (
    <div style={{ ...styles.wrap, ...(isPhone ? styles.wrapPhone : null) }}>
      <span style={styles.label}>
        Step {current} of {total}
      </span>

      <div style={styles.track}>
        {/* Grey rail behind the dots, then the green fill on top of it. */}
        <div style={styles.rail} />
        <div
          style={{
            ...styles.railFill,
            width: total > 1 ? `${((current - 1) / (total - 1)) * 100}%` : "0%",
          }}
        />

        {steps.map((step) => {
          const done = step <= current;
          // Only finished steps are clickable — jumping ahead would skip
          // required fields the later steps depend on.
          const clickable = typeof onStepClick === "function" && step < current;
          return (
            <button
              key={step}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(step)}
              aria-label={`Step ${step}`}
              aria-current={step === current ? "step" : undefined}
              style={{
                ...styles.dot,
                background: done ? "#22c55e" : "#d1d5db",
                cursor: clickable ? "pointer" : "default",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", alignItems: "center", gap: 20, marginBottom: 20 },
  // The label sits above the dots on a phone so the track keeps full width
  // instead of being squeezed into whatever "Step 3 of 5" leaves over.
  wrapPhone: { flexDirection: "column", alignItems: "stretch", gap: 10, marginBottom: 16 },
  label: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  track: {
    position: "relative",
    flex: 1,
    maxWidth: 420,
    width: "100%",
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rail: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    background: "#d1d5db",
    borderRadius: 999,
  },
  railFill: {
    position: "absolute",
    left: 0,
    height: 3,
    background: "#22c55e",
    borderRadius: 999,
    transition: "width 200ms ease",
  },
  dot: {
    position: "relative",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "none",
    padding: 0,
  },
};
