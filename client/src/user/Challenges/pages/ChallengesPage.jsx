import React, { useState, useEffect } from "react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";

import { db } from "../../../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";

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

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80";

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
    badge: { name: "Transit Pioneer", icon: "🚌" },
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
    badge: { name: "Zero Waste Hero", icon: "♻️" },
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
    badge: { name: "Heritage Strider", icon: "🏛️" },
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
    badge: { name: "Forest Defender", icon: "🌳" },
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
    badge: { name: "River Guardian", icon: "🌊" },
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
    badge: { name: "Coastal Protector", icon: "🏝️" },
    imageUrl: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80",
  },
];

function difficultyPillStyle(level) {
  if (level === "Easy") return { background: "#dcfce7", color: "#15803d" };
  if (level === "Medium") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function calculateRank(score) {
  if (score >= 1000) return 1;
  if (score >= 750) return 2;
  if (score >= 500) return 3;
  if (score >= 300) return 4;
  if (score >= 150) return 5;
  if (score >= 80) return 8;
  if (score >= 30) return 12;
  return 20;
}

function StatCard({ icon: Icon, iconColor, label, value, sub }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {Icon && <Icon size={20} color={iconColor} />}
        <span style={{ fontSize: 13.5, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function BadgeItem({ challenge }) {
  const [hover, setHover] = useState(false);
  const badge = challenge.badge || { name: "Eco Badge", icon: "🏆" };

  return (
    <div
      style={styles.badgeWrapper}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.badgeIconCircle}>
        <span style={{ fontSize: 24 }}>{badge.icon}</span>
      </div>
      <span style={styles.badgeNameLabel}>{badge.name}</span>

      {hover && (
        <div style={styles.badgeTooltip}>
          <div style={styles.badgeTooltipHeader}>
            <span>{badge.icon}</span> <strong>{badge.name}</strong>
          </div>
          <div style={styles.badgeTooltipSub}>
            Earned by completing <strong>{challenge.title}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ c, onNavigate, userChallengeState }) {
  const isJoined = userChallengeState?.joined || false;
  const progress = userChallengeState?.progress || 0;
  const isCompleted = progress >= 100;

  const baseParticipants =
    c.participants !== undefined && c.participants !== null
      ? Number(c.participants) || 0
      : 0;
  const totalCardParticipants = baseParticipants + (isJoined ? 1 : 0);

  const handleViewChallenge = () => {
    onNavigate?.("/challenges/details", c.id);
  };

  return (
    <div style={{ ...styles.challengeCard, ...(isJoined ? styles.joinedCardBorder : {}) }}>
      <img
        src={c.imageUrl || DEFAULT_IMAGE_URL}
        alt={c.title}
        style={styles.challengeImage}
        onError={(e) => {
          e.currentTarget.src = DEFAULT_IMAGE_URL;
        }}
      />

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={styles.challengeTitle}>{c.title}</div>
          {isCompleted ? (
            <span style={styles.completedBadge}>
              <CheckCircle2 size={12} /> Earned {c.points} pts
            </span>
          ) : isJoined ? (
            <span style={styles.inProgressBadge}>
              <Clock size={12} /> In Progress
            </span>
          ) : null}
        </div>

        <p style={styles.challengeDesc}>{c.description}</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ ...styles.pill, ...difficultyPillStyle(c.difficulty) }}>
            {c.difficulty}
          </span>
          <span style={{ ...styles.pill, background: "#DBEAFE", color: "#2563EB" }}>
            {c.tag}
          </span>
          {c.badge && (
            <span style={{ ...styles.pill, background: "#FEF3C7", color: "#B45309", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Award size={12} /> Badge Reward
            </span>
          )}
        </div>

        <div style={styles.locationPill}>
          <MapPin size={14} />
          {c.location}
        </div>

        {isJoined && !isCompleted && (
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
          <span style={styles.statRowLabel}>{isCompleted ? "Reward Earned" : "Reward"}</span>
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
            {totalCardParticipants.toLocaleString()}
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
  const { authUser, profile, loading } = useCurrentUser();

  const [challengesList, setChallengesList] = useState(CHALLENGES);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [themeFilter, setThemeFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#completed") {
        setActiveTab("completed");
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    let deletedIds = [];
    try {
      const saved = localStorage.getItem("greentrip_deleted_challenge_ids");
      if (saved) deletedIds = JSON.parse(saved);
    } catch (e) {}

    const unsubscribe = onSnapshot(
      collection(db, "challenges"),
      (querySnapshot) => {
        const fetched = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: data.id || docSnap.id,
            ...data,
            imageUrl: data.imageUrl || DEFAULT_IMAGE_URL,
            participants:
              data.participants !== undefined && data.participants !== null
                ? Number(data.participants) || 0
                : 0,
          });
        });

        const firestoreIds = new Set(fetched.map((item) => String(item.id)));
        const activeDummies = CHALLENGES.filter(
          (dummy) =>
            !firestoreIds.has(String(dummy.id)) &&
            !deletedIds.includes(String(dummy.id))
        );

        setChallengesList([...fetched, ...activeDummies]);
      },
      (error) => {
        console.error("Error fetching challenges list in real-time:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const userChallenges = profile?.user_challenges || profile?.userChallenges || {};

  const completedChallenges = challengesList.filter(
    (c) => userChallenges[c.id]?.progress >= 100
  );

  const earnedBadgesChallenges = completedChallenges.filter(
    (c) => Boolean(c.badge)
  );

  const joinedChallengesCount = Object.values(userChallenges).filter(
    (state) => state?.joined
  ).length;

  const availableCount = challengesList.length - completedChallenges.length;

  const baseParticipants = 13360;
  const totalParticipants = baseParticipants + joinedChallengesCount;

  const baseCarbonKg = 12450;
  const addedCarbonKg = completedChallenges.reduce(
    (acc, c) => acc + (c.carbonKg || 0),
    0
  );
  const totalCarbonImpact = baseCarbonKg + addedCarbonKg;

  const totalEcoScore = profile?.eco_score ?? profile?.ecoScore ?? 0;
  const currentRankPosition = calculateRank(totalEcoScore);

  const dynamicStats = [
    {
      icon: Award,
      iconColor: "#f97316",
      label: "Available Challenges",
      value: availableCount.toString(),
      sub: "Active nationwide",
    },
    {
      icon: Calendar,
      iconColor: "#7c3aed",
      label: "Total Participants",
      value: totalParticipants.toLocaleString(),
      sub: "Active eco-warriors",
    },
    {
      icon: TrendingUp,
      iconColor: "#3b82f6",
      label: "Collective Impact",
      value: `${totalCarbonImpact.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`,
      sub: "CO₂ saved this month",
    },
  ];

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

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

  const user = {
    ...profile,
    name: profile.name,
    eco_score: totalEcoScore,
    ecoScore: totalEcoScore,
  };

  const filteredChallenges = challengesList.filter((c) => {
    const isCompleted = userChallenges[c.id]?.progress >= 100;
    
    if (activeTab === "active" && isCompleted) return false;
    if (activeTab === "completed" && !isCompleted) return false;

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

        <div style={styles.statGrid}>
          {dynamicStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.rowHeader}>
            <span style={styles.cardTitle}>Global Leaderboard</span>
            <div style={styles.viewMore} onClick={() => onNavigate?.("/challenges/leaderboard")}>
              View All <ChevronRight size={16} />
            </div>
          </div>
          <p style={styles.leaderboardTagline}>🏆 Climb the ranks, inspire change.</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={styles.rankNumber}>#{currentRankPosition}</span>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>Your Rank</span>
          </div>
          <div style={styles.rankSub}>with {user.eco_score.toLocaleString()} Eco Points</div>
        </div>

        {/* Earned Badges Section */}
        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.rowHeader}>
            <span style={styles.cardTitle}>🏅 Earned Badges</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {earnedBadgesChallenges.length} Badge{earnedBadgesChallenges.length !== 1 ? "s" : ""} Earned
            </span>
          </div>
          <p style={{ color: "#6b7280", fontSize: 13.5, margin: "6px 0 16px" }}>
            Hover over a badge to see which challenge awarded it.
          </p>

          {earnedBadgesChallenges.length > 0 ? (
            <div style={styles.badgesContainer}>
              {earnedBadgesChallenges.map((c) => (
                <BadgeItem key={c.id} challenge={c} />
              ))}
            </div>
          ) : (
            <div style={styles.noBadgesBox}>
              Complete challenges with badge rewards to collect your achievements here!
            </div>
          )}
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={styles.tabsContainer}>
            <button
              style={activeTab === "active" ? styles.activeTabBtn : styles.inactiveTabBtn}
              onClick={() => setActiveTab("active")}
            >
              Active Challenges
            </button>
            <button
              style={activeTab === "completed" ? styles.activeTabBtn : styles.inactiveTabBtn}
              onClick={() => setActiveTab("completed")}
            >
              Completed Challenges
            </button>
          </div>
          
          <div style={styles.card}>
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
        </div>

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
              {activeTab === "completed" 
                ? "You haven't completed any challenges matching these filters yet."
                : "No available challenges found matching your filters."}
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
  loadingText: { color: "#6b7280" },
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
  badgesContainer: { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 },
  badgeWrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  badgeIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 999,
    background: "#fffbeb",
    border: "2px solid #fcd34d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  badgeNameLabel: { fontSize: 12, fontWeight: 700, color: "#374151" },
  badgeTooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: 8,
    width: 200,
    background: "#1e293b",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 20,
    pointerEvents: "none",
  },
  badgeTooltipHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  badgeTooltipSub: { fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.3 },
  noBadgesBox: {
    padding: "16px 0",
    color: "#9ca3af",
    fontSize: 13.5,
    fontStyle: "italic",
  },
  tabsContainer: { display: "flex", gap: 10, marginBottom: 16 },
  activeTabBtn: { padding: "10px 24px", background: "#111827", color: "#fff", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", fontSize: 14 },
  inactiveTabBtn: { padding: "10px 24px", background: "#e5e7eb", color: "#4b5563", borderRadius: 8, fontWeight: 600, border: "none", cursor: "pointer", fontSize: 14 },
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