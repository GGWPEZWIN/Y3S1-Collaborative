import React, { useState, useEffect } from "react";
import Layout from "../../../shared/components/Layout";
import StatCard from "../../../shared/components/StatCard";
import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  Award,
  Calendar,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  TrendingDown,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";

const STATS = [
  { icon: Award, iconColor: "#f97316", label: "Available Challenges", value: "6", sub: "Active nationwide" },
  { icon: Calendar, iconColor: "#7c3aed", label: "Total Participants", value: "13,360", sub: "Active eco-warriors" },
  { icon: TrendingUp, iconColor: "#3b82f6", label: "Collective Impact", value: "12,450 kg", sub: "CO₂ saved this month" },
];

const RANK = { position: 5 };

const CHALLENGES = [
  {
    id: 1,
    title: "KL Car-Free Weekend",
    description: "Complete a full weekend in Kuala Lumpur using only public transport, walking, or cycling.",
    difficulty: "Medium",
    tag: "Low-Carbon Transit",
    location: "Kuala Lumpur",
    points: 50,
    carbonKg: 12.5,
    participants: 2847,
    imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&q=80",
  },
  {
    id: 2,
    title: "Pasar Malam Plastic-Free",
    description: "Visit a night market with your own containers and avoid all single-use plastics.",
    difficulty: "Easy",
    tag: "Zero-Plastic",
    location: "National",
    points: 30,
    carbonKg: null,
    participants: 5234,
    imageUrl: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80",
  },
  {
    id: 3,
    title: "George Town Heritage Walk",
    description: "Ditch the car and explore Penang's UNESCO Heritage site entirely on foot or by bicycle for a day.",
    difficulty: "Easy",
    tag: "Low-Carbon Transit",
    location: "Penang",
    points: 40,
    carbonKg: 8.2,
    participants: 1932,
    imageUrl: "https://images.unsplash.com/photo-1599423528441-2a07d3b5b62b?w=600&q=80",
  },
  {
    id: 4,
    title: "Kinabalu Reforestation",
    description: "Join local rangers to plant 5 native tree saplings at the base of Mount Kinabalu.",
    difficulty: "Hard",
    tag: "Reforestation",
    location: "Sabah",
    points: 150,
    carbonKg: 45.0,
    participants: 412,
    imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?w=600&q=80",
  },
  {
    id: 5,
    title: "Melaka River Cleanup",
    description: "Participate in the weekend volunteer drive to collect and sort plastic waste along the Melaka River.",
    difficulty: "Medium",
    tag: "Zero-Plastic",
    location: "Melaka",
    points: 80,
    carbonKg: null,
    participants: 845,
    imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80fbfc9?w=600&q=80",
  },
  {
    id: 6,
    title: "Bako Coastal Conservation",
    description: "Help clear washed-up debris and plant mangroves along the Sarawak coastline.",
    difficulty: "Hard",
    tag: "Reforestation",
    location: "Sarawak",
    points: 120,
    carbonKg: 25.5,
    participants: 320,
    imageUrl: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80",
  },
];

function difficultyPillStyle(level) {
  if (level === "Easy") return { background: "#dcfce7", color: "#15803d" };
  if (level === "Medium") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function ChallengeCard({ c, onNavigate, userChallengeState }) {
  const isJoined = userChallengeState?.joined || false;
  const progress = userChallengeState?.progress || 0;
  const isCompleted = progress >= 100;

  const handleViewChallenge = () => {
    onNavigate?.("/challenges/details", c.id);
  };

  return (
    <div style={{ ...styles.challengeCard, ...(isJoined ? styles.joinedCardBorder : {}) }}>
      <img src={c.imageUrl} alt={c.title} style={styles.challengeImage} />

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={styles.challengeTitle}>{c.title}</div>
          {isCompleted ? (
            <span style={styles.completedBadge}>
              <CheckCircle2 size={12} /> Completed
            </span>
          ) : isJoined ? (
            <span style={styles.inProgressBadge}>
              <Clock size={12} /> In Progress
            </span>
          ) : null}
        </div>

        <p style={styles.challengeDesc}>{c.description}</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <span style={{ ...styles.pill, ...difficultyPillStyle(c.difficulty) }}>
            {c.difficulty}
          </span>
          <span style={{ ...styles.pill, background: "#DBEAFE", color: "#2563EB" }}>
            {c.tag}
          </span>
        </div>

        <div style={styles.locationPill}>
          <MapPin size={14} />
          {c.location}
        </div>

        {isJoined && (
          <div style={styles.cardProgressSection}>
            <div style={styles.cardProgressRow}>
              <span style={styles.cardProgressLabel}>Progress</span>
              <span style={styles.cardProgressVal}>{progress}%</span>
            </div>
            <div style={styles.cardProgressTrack}>
              <div
                style={{
                  ...styles.cardProgressFill,
                  width: `${progress}%`,
                  background: isCompleted ? "#16a34a" : "#2563eb",
                }}
              />
            </div>
          </div>
        )}

        <div style={styles.statRow}>
          <span style={styles.statRowLabel}>Reward</span>
          <span style={styles.rewardValue}>+{c.points} pts</span>
        </div>

        {c.carbonKg && (
          <div style={styles.statRow}>
            <span style={styles.statRowLabel}>Carbon Impact</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
              <TrendingDown size={14} color="#2563EB" />
              {c.carbonKg} kg CO₂
            </span>
          </div>
        )}

        <div style={styles.statRow}>
          <span style={styles.statRowLabel}>Participants</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
            <Users size={14} />
            {(c.participants + (isJoined ? 1 : 0)).toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          style={{
            ...styles.viewChallengeBtn,
            ...(isCompleted
              ? styles.completedBtnStyle
              : isJoined
              ? styles.inProgressBtnStyle
              : {}),
          }}
          onClick={handleViewChallenge}
        >
          {isCompleted ? "View Achievement" : isJoined ? "Continue Challenge" : "View Challenge"}
        </button>
      </div>
    </div>
  );
}

export default function ChallengesPage({ onNavigate }) {
  // ============================================================
  // FIREBASE USER AUTHENTICATION & PROFILE
  // ============================================================
  const { authUser, profile, loading } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [themeFilter, setThemeFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [userChallenges, setUserChallenges] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("greentrip_user_challenges");
    if (saved) {
      try {
        setUserChallenges(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse user challenges", e);
      }
    }
  }, []);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  // ============================================================
  // LOGIN CHECK
  // ============================================================
  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>You're not logged in.</p>
        <button
          type="button"
          onClick={() => onNavigate?.("/login")}
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Extract user info from Firebase Profile
  const user = {
    name: profile.name,
    ecoScore: profile.eco_score ?? 0,
  };

  const filteredChallenges = CHALLENGES.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === "All" || c.location === stateFilter;
    const matchesTheme = themeFilter === "All" || c.tag === themeFilter;
    const matchesDifficulty = difficultyFilter === "All" || c.difficulty === difficultyFilter;

    return matchesSearch && matchesState && matchesTheme && matchesDifficulty;
  });

  return (
    <Layout active="challenges" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Community Eco-Challenges</h1>
        <p style={styles.pageSubtitle}>Join sustainable activities and earn rewards</p>

        {/* Stat cards */}
        <div style={styles.statGrid}>
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Leaderboard summary */}
        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.rowHeader}>
            <span style={styles.cardTitle}>Global Leaderboard</span>
            <div style={styles.viewMore} onClick={() => onNavigate?.("/challenges/leaderboard")}>
              View All <ChevronRight size={16} />
            </div>
          </div>
          <p style={styles.leaderboardTagline}>🏆 Climb the ranks, inspire change.</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={styles.rankNumber}>#{RANK.position}</span>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>Your Rank</span>
          </div>
          <div style={styles.rankSub}>with {user.ecoScore.toLocaleString()} Eco Points</div>
        </div>

        {/* Search & Filters */}
        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.searchBox}>
            <Search size={16} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGrid}>
            <div>
              <div style={styles.filterLabel}>State</div>
              <div style={styles.selectWrapper}>
                <select
                  style={styles.filterSelectNative}
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <option value="All">All States</option>
                  <option value="Kuala Lumpur">Kuala Lumpur</option>
                  <option value="National">National</option>
                  <option value="Penang">Penang</option>
                  <option value="Sabah">Sabah</option>
                  <option value="Melaka">Melaka</option>
                  <option value="Sarawak">Sarawak</option>
                </select>
                <ChevronDown size={16} color="#6b7280" style={styles.selectIcon} />
              </div>
            </div>

            <div>
              <div style={styles.filterLabel}>Theme</div>
              <div style={styles.selectWrapper}>
                <select
                  style={styles.filterSelectNative}
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                >
                  <option value="All">All Themes</option>
                  <option value="Low-Carbon Transit">Low-Carbon Transit</option>
                  <option value="Zero-Plastic">Zero-Plastic</option>
                  <option value="Reforestation">Reforestation</option>
                </select>
                <ChevronDown size={16} color="#6b7280" style={styles.selectIcon} />
              </div>
            </div>

            <div>
              <div style={styles.filterLabel}>Difficulty</div>
              <div style={styles.selectWrapper}>
                <select
                  style={styles.filterSelectNative}
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="All">All Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <ChevronDown size={16} color="#6b7280" style={styles.selectIcon} />
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Cards Grid */}
        <div style={styles.challengeGrid}>
          {filteredChallenges.length > 0 ? (
            filteredChallenges.map((c) => (
              <ChallengeCard
                key={c.id}
                c={c}
                onNavigate={onNavigate}
                userChallengeState={userChallenges[c.id]}
              />
            ))
          ) : (
            <div style={styles.noResults}>
              No challenges found matching your filters.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  loadingText: {
    color: "#6b7280",
  },
  loginRedirectBtn: {
    marginTop: 10,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto", boxSizing: "border-box" },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: 0, color: "#111827" },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 20, fontSize: 14.5 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  cardTitle: { fontWeight: 700, fontSize: 15.5 },
  rowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  viewMore: { display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#374151" },
  leaderboardTagline: { color: "#6b7280", fontSize: 13.5, margin: "8px 0 16px" },
  rankNumber: { fontSize: 32, fontWeight: 800, color: "#15803d" },
  rankSub: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f3f4f6",
    borderRadius: 10,
    padding: "12px 16px",
  },
  searchInput: { border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 },
  filterLabel: { fontSize: 13.5, fontWeight: 600, marginBottom: 6 },
  challengeGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginTop: 20, marginBottom: 32 },
  challengeCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", position: "relative" },
  joinedCardBorder: { borderColor: "#93c5fd" },
  challengeImage: { width: "100%", height: 180, objectFit: "cover", display: "block" },
  challengeTitle: { fontWeight: 800, fontSize: 17 },
  challengeDesc: { color: "#6b7280", fontSize: 13.5, marginBottom: 14, lineHeight: 1.5 },
  pill: { fontSize: 12.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999 },
  locationPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #d1d5db",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 12.5,
    marginBottom: 16,
  },
  inProgressBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
  },
  completedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
  },
  cardProgressSection: {
    marginBottom: 14,
    background: "#f8fafc",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #f1f5f9",
  },
  cardProgressRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 6 },
  cardProgressLabel: { color: "#475569" },
  cardProgressVal: { color: "#0f172a" },
  cardProgressTrack: { height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
  cardProgressFill: { height: "100%", borderRadius: 999, transition: "width 0.3s ease" },
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, marginBottom: 8 },
  statRowLabel: { color: "#6b7280" },
  rewardValue: { color: "#15803d", fontWeight: 800, fontSize: 15 },
  viewChallengeBtn: {
    width: "100%",
    marginTop: 8,
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  inProgressBtnStyle: { background: "#2563eb" },
  completedBtnStyle: { background: "#16a34a" },
  selectWrapper: { position: "relative", width: "100%" },
  filterSelectNative: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    fontSize: 13.5,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    color: "#111827",
    fontFamily: "inherit",
  },
  selectIcon: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  noResults: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "40px 0",
    color: "#6b7280",
    fontSize: 15,
    fontWeight: 500,
  },
};