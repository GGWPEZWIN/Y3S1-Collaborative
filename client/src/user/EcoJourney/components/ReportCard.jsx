import React from "react";
import { Calendar, MapPin, TrendingDown, Award, Download, Share2, ChevronRight } from "lucide-react";

// Grade -> ring color. A+ and A both read as "great", but A+ gets the
// slightly deeper green to match the design's two-tone badge circles.
const GRADE_STYLES = {
  "A+": { bg: "#dcfce7", text: "#15803d" },
  A: { bg: "#dcfce7", text: "#16a34a" },
};

/**
 * ReportCard
 *
 * One trip entry in Travel History: name, status, dates/location, eco
 * score with progress bar, carbon total, badges earned, and actions.
 *
 * Props: a trip object from dashboardService.getTravelHistory(), plus
 * onViewReport(trip), onDownload(trip), onShare(trip) callbacks.
 */
export default function ReportCard({ trip, onViewReport, onDownload, onShare }) {
  const gradeStyle = GRADE_STYLES[trip.grade] || GRADE_STYLES.A;
  // Eco score is out of 100 — use it directly as the bar fill percentage.
  const scorePct = Math.min(Math.max(trip.ecoScore, 0), 100);

  return (
    <div style={styles.card}>
      <div style={styles.topBar} />
      <div style={styles.body}>
        <div style={styles.headRow}>
          <div style={styles.headLeft}>
            <div style={styles.nameRow}>
              <h3 style={styles.name}>{trip.name}</h3>
              <span style={styles.statusPill}>{trip.status}</span>
            </div>
            <div style={styles.metaRow}>
              <Calendar size={14} color="#9ca3af" />
              <span>{trip.dateRange}</span>
            </div>
            {trip.location && (
              <div style={styles.metaRow}>
                <MapPin size={14} color="#9ca3af" />
                <span>{trip.location}</span>
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.gradeCircle,
              background: gradeStyle.bg,
              color: gradeStyle.text,
            }}
          >
            {trip.grade}
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div>
            <div style={styles.statLabel}>Eco Score</div>
            <div style={styles.statValueRow}>
              <span aria-hidden="true">🌱</span>
              <span style={styles.statValue}>{trip.ecoScore}</span>
              <span style={styles.gradeInline}>{trip.grade}</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${scorePct}%` }} />
            </div>
          </div>

          <div>
            <div style={styles.statLabel}>Carbon</div>
            <div style={styles.statValueRow}>
              <TrendingDown size={16} color="#2563eb" />
              <span style={styles.statValue}>{trip.carbonKg} kg CO₂</span>
            </div>
          </div>

          {trip.badgesEarned > 0 && (
            <div>
              <div style={styles.statLabel}>Badges</div>
              <div style={styles.statValueRow}>
                <Award size={16} color="#f59e0b" />
                <span style={styles.statValue}>{trip.badgesEarned} earned</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.actionsRow}>
          <button onClick={() => onViewReport?.(trip)} style={styles.btnPrimary}>
            View Eco-Report Card
            <ChevronRight size={16} />
          </button>
          <button onClick={() => onDownload?.(trip)} style={styles.btnOutline}>
            <Download size={16} />
            Download Report
          </button>
          <button onClick={() => onShare?.(trip)} style={styles.btnOutline}>
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  topBar: { height: 6, background: "#22c55e" },
  body: { padding: 24, display: "flex", flexDirection: "column", gap: 20 },
  headRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  headLeft: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, textAlign: "left" },
  nameRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  name: { fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 },
  statusPill: {
    fontSize: 12,
    fontWeight: 600,
    background: "#dcfce7",
    color: "#15803d",
    padding: "4px 10px",
    borderRadius: 999,
  },
  metaRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#6b7280" },
  gradeCircle: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 17,
    flexShrink: 0,
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "left" },
  statLabel: { fontSize: 12, fontWeight: 500, color: "#9ca3af", marginBottom: 4 },
  statValueRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 700, color: "#111827" },
  statValue: { fontSize: 17, fontWeight: 700, color: "#111827" },
  gradeInline: { fontSize: 13.5, fontWeight: 600, color: "#16a34a" },
  progressTrack: { width: "100%", height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", background: "#111827", borderRadius: 999 },
  actionsRow: { display: "flex", flexWrap: "wrap", gap: 12 },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 18px",
    borderRadius: 999,
    cursor: "pointer",
  },
  btnOutline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: "#374151",
    border: "1px solid #e5e7eb",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 18px",
    borderRadius: 999,
    cursor: "pointer",
  },
};