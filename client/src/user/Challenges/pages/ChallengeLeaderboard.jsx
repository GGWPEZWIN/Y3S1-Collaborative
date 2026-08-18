import { useState } from "react";
import { Trophy, ChevronLeft, TrendingDown } from "lucide-react";
import Layout from "../../../shared/components/Layout";

const user = { name: "Keshi", ecoScore: 8750 };

const LEADERBOARD = [
  { rank: 1, name: "Alan Walker", avatarBg: "#f59e0b", avatarLetter: "A", points: 15240, co2: "567.8 kg" },
  { rank: 2, name: "Wim", avatarBg: "#3b82f6", avatarLetter: "W", points: 14890, co2: "532.1 kg" },
  { rank: 3, name: "Nur Ain", avatarBg: "#22c55e", avatarLetter: "N", points: 11020, co2: "387 kg" },
  { rank: 4, name: "Jason Lee", avatarBg: "#8b5cf6", avatarLetter: "J", points: 9350, co2: "320 kg" },
  { rank: 5, name: "Keshi", avatarBg: "#06b6d4", avatarLetter: "K", points: 8750, co2: "301 kg", me: true },
  { rank: 6, name: "Emily Wong", avatarBg: "#ec4899", avatarLetter: "E", points: 8410, co2: "295 kg" },
  { rank: 7, name: "Daniel", avatarBg: "#84cc16", avatarLetter: "D", points: 8010, co2: "281 kg" },
];

const RANK_STYLES = {
  1: { bg: "#f59e0b", emoji: "🥇" },
  2: { bg: "#9ca3af", emoji: "🥈" },
  3: { bg: "#cd7c2f", emoji: "🥉" },
};

const TABS = ["Global", "By State", "Friends"];

export default function ChallengeLeaderboard({ onNavigate }) {
  const [tab, setTab] = useState("Global");

  return (
    <Layout active="challenges" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button type="button" onClick={() => onNavigate("/challenges")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back
        </button>

        <h1 style={styles.title}>Leaderboard</h1>
        <p style={styles.subtitle}>Top eco-warriors across Malaysia</p>

        {/* Rank highlight card */}
        <div style={styles.highlightCard}>
          <div style={styles.trophyCircle}>
            <Trophy size={30} color="#fbbf24" fill="#fbbf24" />
          </div>
          <div style={styles.highlightLabel}>Your Rank</div>
          <div style={styles.highlightRank}>#5</div>
          <div style={styles.highlightSub}>8,750 Eco Points</div>
        </div>

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

        {/* List */}
        <div style={styles.list}>
          {LEADERBOARD.map((p) => {
            const rankStyle = RANK_STYLES[p.rank];
            return (
              <div key={p.rank} style={{ ...styles.row, ...(p.me ? styles.rowMe : {}) }}>
                <div style={styles.avatarWrap}>
                  <div style={{ ...styles.avatar, background: p.avatarBg }}>{p.avatarLetter}</div>
                  {rankStyle ? (
                    <div style={{ ...styles.rankBadge, background: rankStyle.bg }}>{rankStyle.emoji}</div>
                  ) : (
                    <div style={styles.rankBadgePlain}>{p.rank}</div>
                  )}
                </div>
                <div style={styles.nameCol}>
                  <div style={styles.name}>
                    {p.name}
                    {p.me && <span style={styles.youPill}>YOU</span>}
                  </div>
                  <div style={styles.pointsText}>{p.points.toLocaleString()} points</div>
                </div>
                <div style={styles.co2Col}>
                  <div style={styles.co2Value}>
                    <TrendingDown size={16} color="#16a34a" />
                    {p.co2}
                  </div>
                  <div style={styles.co2Label}>CO₂ saved</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
    marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 15 },
  highlightCard: {
    background: "#a7f3d0",
    borderRadius: 20,
    padding: "48px 24px",
    textAlign: "center",
    marginBottom: 24,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  highlightLabel: { fontSize: 20, fontWeight: 700, color: "#111827" },
  highlightRank: { fontSize: 48, fontWeight: 800, color: "#065f46", margin: "8px 0" },
  highlightSub: { fontSize: 15, color: "#374151" },
  tabBar: {
    display: "flex",
    background: "#e5e7eb",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 24,
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
  list: { display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 },
  row: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  rowMe: { background: "#ecfdf5", borderColor: "#a7f3d0" },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 17,
  },
  rankBadge: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    border: "2px solid #fff",
  },
  rankBadgePlain: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#e5e7eb",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11.5,
    fontWeight: 700,
    border: "2px solid #fff",
  },
  nameCol: { flex: 1, minWidth: 0 },
  name: { fontWeight: 700, fontSize: 16, color: "#111827", display: "flex", alignItems: "center", gap: 8 },
  youPill: {
    background: "#16a34a",
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
  },
  pointsText: { fontSize: 13.5, color: "#9ca3af", marginTop: 2 },
  co2Col: { textAlign: "right", flexShrink: 0 },
  co2Value: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    fontWeight: 700,
    fontSize: 16,
    color: "#111827",
  },
  co2Label: { fontSize: 12.5, color: "#9ca3af", marginTop: 2 },
};