import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  MapPin,
  Users,
  Zap,
  TrendingDown,
  MapPinned,
  Camera,
  Upload,
  Trophy,
} from "lucide-react";
import Layout from "../../../shared/components/Layout";

const user = { name: "Keshi", ecoScore: 8750 };

const TABS = ["Requirements", "Verification", "Leaderboard"];

export default function ChallengeDetails({ onNavigate }) {
  const [tab, setTab] = useState("Requirements");
  const [joined, setJoined] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(t);
  }, [showToast]);

  const handleJoin = () => {
    setJoined(true);
    setShowToast(true);
  };

  return (
    <Layout active="challenges" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button type="button" onClick={() => onNavigate("/challenges")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back to Challenges
        </button>

        <img
          src="https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200"
          alt="Kuala Lumpur skyline"
          style={styles.banner}
        />

        <h1 style={styles.title}>KL Car-Free Weekend</h1>
        <p style={styles.subtitle}>
          Complete a full weekend in Kuala Lumpur using only public transport, walking, or cycling.
        </p>

        <div style={styles.badgeRow}>
          <span style={styles.badgeMedium}>Medium</span>
          <span style={styles.badgeTheme}>Low-Carbon Transit</span>
          <span style={styles.badgeLocation}>
            <MapPin size={14} />
            Kuala Lumpur
          </span>
        </div>

        {/* Stat cards */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statHeadRow}>
              <span style={styles.statLabel}>Reward Points</span>
              <Zap size={18} color="#f97316" />
            </div>
            <div style={{ ...styles.statValue, color: "#16a34a" }}>+ 50</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statHeadRow}>
              <span style={styles.statLabel}>Participants</span>
              <Users size={18} color="#3b82f6" />
            </div>
            <div style={styles.statValue}>2,487</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statHeadRow}>
              <span style={styles.statLabel}>Carbon Impact</span>
              <TrendingDown size={18} color="#16a34a" />
            </div>
            <div style={styles.statValue}>12.5 kg</div>
            <div style={styles.statCaption}>CO₂ saved per person</div>
          </div>
        </div>

        {/* CTA / progress */}
        {!joined ? (
          <div style={styles.ctaCard}>
            <div>
              <div style={styles.ctaTitle}>Ready to make a difference?</div>
              <div style={styles.ctaSub}>Join 2,487 others in this challenge</div>
            </div>
            <button type="button" onClick={handleJoin} style={styles.joinBtn}>
              Join Challenge
            </button>
          </div>
        ) : (
          <div style={styles.progressCard}>
            <div style={styles.ctaTitle}>Your Progress</div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <div style={styles.ctaSub}>{progress}% complete</div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                ...styles.tabBtn,
                background: tab === t ? "#fff" : "transparent",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                color: tab === t ? "#111827" : "#6b7280",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "Requirements" && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>How to Complete</div>
            <div style={styles.stepList}>
              {[
                "Use only LRT, MRT, or Rapid KL buses",
                "Visit at least 3 tourist attractions",
                "Track all journey via GPS",
              ].map((text, i) => (
                <div key={text} style={styles.stepRow}>
                  <div style={styles.stepNumber}>{i + 1}</div>
                  <span style={styles.stepText}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Verification" && (
          <>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Verification Methods</div>
              <p style={styles.verificationIntro}>You can verify your participant using any of the follow:</p>
              <div style={styles.verifyOption}>
                <MapPinned size={18} color="#ef4444" />
                <div>
                  <div style={styles.verifyOptionTitle}>GPS Check-In</div>
                  <div style={styles.verifyOptionDesc}>
                    Allow location access to verify your presence at the challenge location
                  </div>
                </div>
              </div>
              <div style={styles.verifyOption}>
                <Camera size={18} color="#6b7280" />
                <div>
                  <div style={styles.verifyOptionTitle}>Photo Upload</div>
                  <div style={styles.verifyOptionDesc}>
                    Submit a photo showing your participation in the eco-activity
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              style={styles.submitBtn}
              onClick={() => setProgress((p) => Math.min(100, p + 20))}
            >
              <Upload size={16} />
              Submit Verification
            </button>
          </>
        )}

        {tab === "Leaderboard" && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Challenge Leaderboard</div>
            <p style={styles.verificationIntro}>See how you rank against other participants in this challenge.</p>
            <button
              type="button"
              style={styles.viewLeaderboardBtn}
              onClick={() => onNavigate("/challenges/leaderboard")}
            >
              <Trophy size={16} />
              View Full Leaderboard
            </button>
          </div>
        )}
      </div>

      {showToast && <div style={styles.toast}>Successfully Join the challenge!</div>}
    </Layout>
  );
}

const styles = {
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto", textAlign: "left" },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 20,
  },
  banner: {
    width: "100%",
    height: 340,
    objectFit: "cover",
    borderRadius: 16,
    marginBottom: 24,
    display: "block",
  },
  title: { fontSize: 32, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 10, marginBottom: 16, fontSize: 16, lineHeight: 1.6, maxWidth: 700 },
  badgeRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  badgeMedium: {
    background: "#fef3c7",
    color: "#b45309",
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
  },
  badgeTheme: {
    background: "#dbeafe",
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
  },
  badgeLocation: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 },
  statHeadRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  statLabel: { fontSize: 14.5, fontWeight: 500, color: "#374151" },
  statValue: { fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 10 },
  statCaption: { fontSize: 12.5, color: "#9ca3af", marginTop: 4 },
  ctaCard: {
    background: "#a7f3d0",
    borderRadius: 18,
    padding: "24px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  ctaTitle: { fontSize: 18, fontWeight: 700, color: "#111827" },
  ctaSub: { fontSize: 14.5, color: "#374151", marginTop: 4 },
  joinBtn: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  progressCard: {
    background: "#a7f3d0",
    borderRadius: 18,
    padding: "24px 28px",
    marginBottom: 24,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    background: "rgba(255,255,255,0.6)",
    borderRadius: 999,
    overflow: "hidden",
    margin: "16px 0 10px",
  },
  progressFill: { height: "100%", background: "#111827", borderRadius: 999, transition: "width 0.3s ease" },
  tabBar: {
    display: "flex",
    background: "#e5e7eb",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 24,
    maxWidth: 480,
  },
  tabBtn: {
    flex: 1,
    border: "none",
    borderRadius: 999,
    padding: "10px 0",
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 18 },
  stepList: { display: "flex", flexDirection: "column", gap: 16 },
  stepRow: { display: "flex", alignItems: "center", gap: 14 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  stepText: { fontSize: 15, color: "#374151" },
  verificationIntro: { color: "#6b7280", fontSize: 14.5, marginBottom: 16 },
  verifyOption: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  verifyOptionTitle: { fontWeight: 700, fontSize: 15, color: "#111827" },
  verifyOptionDesc: { fontSize: 13.5, color: "#6b7280", marginTop: 2 },
  submitBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "16px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 32,
  },
  viewLeaderboardBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "12px 22px",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    bottom: 28,
    right: 28,
    background: "#111827",
    color: "#fff",
    padding: "14px 22px",
    borderRadius: 12,
    fontSize: 14.5,
    fontWeight: 600,
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  },
};