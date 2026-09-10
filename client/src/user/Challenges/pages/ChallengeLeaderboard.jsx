import { useState, useEffect } from "react";
import { Trophy, ChevronLeft, TrendingDown } from "lucide-react";
import Layout from "../../../shared/components/Layout";

// Firebase Imports
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { db } from "../../../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const AVATAR_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const RANK_STYLES = {
  1: { bg: "#f59e0b", emoji: "🥇" },
  2: { bg: "#9ca3af", emoji: "🥈" },
  3: { bg: "#cd7c2f", emoji: "🥉" },
};

const TABS = ["Global", "By State", "Friends"];

export default function ChallengeLeaderboard({ onNavigate }) {
  const { authUser, profile, loading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState("Global");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Fetch users from Firestore and sort by eco_score
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("eco_score", "desc"));
        const querySnapshot = await getDocs(q);

        const fetchedUsers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            id: doc.id,
            name: data.name || data.displayName || "Eco Warrior",
            points: data.eco_score ?? data.ecoScore ?? 0,
            co2: data.co2_saved
              ? `${data.co2_saved} kg`
              : data.co2Saved
              ? `${data.co2Saved} kg`
              : `${((data.eco_score ?? data.ecoScore ?? 0) * 0.035).toFixed(1)} kg`,
          });
        });

        // Fallback client-side sort
        fetchedUsers.sort((a, b) => b.points - a.points);

        // Format for UI structure
        const formatted = fetchedUsers.map((u, index) => ({
          rank: index + 1,
          name: u.name,
          avatarBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
          avatarLetter: (u.name[0] || "U").toUpperCase(),
          points: u.points,
          co2: u.co2,
          me: authUser ? u.id === authUser.uid : false,
        }));

        setLeaderboard(formatted);
      } catch (err) {
        console.error("Error fetching leaderboard from Firestore:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [authUser]);

  // Construct current user for Layout & Highlight Card
  const currentUserObj = profile
    ? {
        ...profile,
        name: profile.name || "User",
        ecoScore: profile.eco_score ?? profile.ecoScore ?? 0,
        eco_score: profile.eco_score ?? profile.ecoScore ?? 0,
      }
    : { name: "Keshi", ecoScore: 0 };

  const currentUserInLeaderboard = leaderboard.find((p) => p.me);
  const myRank = currentUserInLeaderboard ? `#${currentUserInLeaderboard.rank}` : "#-";
  const myPoints = currentUserInLeaderboard
    ? currentUserInLeaderboard.points.toLocaleString()
    : (currentUserObj.ecoScore || 0).toLocaleString();

  if (userLoading || loadingLeaderboard) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <Layout active="challenges" user={currentUserObj} onNavigate={onNavigate}>
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
          <div style={styles.highlightRank}>{myRank}</div>
          <div style={styles.highlightSub}>{myPoints} Eco Points</div>
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
          {leaderboard.map((p) => {
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
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
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