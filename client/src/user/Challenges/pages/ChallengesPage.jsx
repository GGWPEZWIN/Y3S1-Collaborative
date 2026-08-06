import React, { useState } from "react";
import StatCard from "../../../shared/components/StatCard";

import {
  Home,
  Map,
  Navigation,
  Users,
  Zap,
  Award,
  Trash2,
  Leaf,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  TrendingDown,
  Calendar,
  TrendingUp,
} from "lucide-react";

const USER = { name: "Keshi", ecoScore: 8750 };

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", route: "/dashboard" },
  { icon: Map, label: "Itinerary", route: "/itinerary" },
  { icon: Navigation, label: "Recommendations", route: "/recommendations" },
  { icon: Users, label: "Community", route: "/community" },
  { icon: Zap, label: "Challenges", route: "/challenges" },
  { icon: Award, label: "Certification", route: "/certification" },
  { icon: Trash2, label: "Waste", route: "/waste" },
];

// StatCard.jsx expects icon as an actual lucide-react component + "sub" (not "sublabel")
const STATS = [
  { icon: Award, iconColor: "#f97316", label: "Available Challenges", value: "5", sub: "Active nationwide" },
  { icon: Calendar, iconColor: "#7c3aed", label: "Total Participants", value: "13,360", sub: "Active eco-warriors" },
  { icon: TrendingUp, iconColor: "#3b82f6", label: "Collective Impact", value: "12,450 kg", sub: "CO₂ saved this month" },
];

const RANK = { position: 5, points: 8750 };

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
];

function difficultyPillStyle(level) {
  if (level === "Easy") return { background: "#dcfce7", color: "#15803d" };
  if (level === "Medium") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function ChallengeCard({ c, onNavigate }) {
  const handleViewChallenge = () => {
    // TEMPORARY DEBUG WRAPPER — remove once navigation is confirmed working.
    try {
      if (typeof onNavigate !== "function") {
        alert("BUG FOUND: onNavigate is " + typeof onNavigate + " (not a function). It never reached this component as a prop.");
        return;
      }
      onNavigate("/challenges/details", c.id);
    } catch (err) {
      alert("ERROR while navigating: " + err.message);
    }
  };

  return (
    <div style={styles.challengeCard}>
      <img
        src={c.imageUrl}
        alt={c.title}
        style={styles.challengeImage}
      />

      <div style={{ padding: 20 }}>
        <div style={styles.challengeTitle}>{c.title}</div>

        <p style={styles.challengeDesc}>
          {c.description}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <span
            style={{
              ...styles.pill,
              ...difficultyPillStyle(c.difficulty),
            }}
          >
            {c.difficulty}
          </span>

          <span
            style={{
              ...styles.pill,
              background: "#DBEAFE",
              color: "#2563EB",
            }}
          >
            {c.tag}
          </span>
        </div>

        <div style={styles.locationPill}>
          <MapPin size={14} />
          {c.location}
        </div>

        <div style={styles.statRow}>
          <span style={styles.statRowLabel}>Reward</span>
          <span style={styles.rewardValue}>
            +{c.points} pts
          </span>
        </div>

        {c.carbonKg && (
          <div style={styles.statRow}>
            <span style={styles.statRowLabel}>
              Carbon Impact
            </span>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
              }}
            >
              <TrendingDown
                size={14}
                color="#2563EB"
              />
              {c.carbonKg} kg CO₂
            </span>
          </div>
        )}

        <div style={styles.statRow}>
          <span style={styles.statRowLabel}>
            Participants
          </span>

          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontWeight: 600,
            }}
          >
            <Users size={14} />
            {c.participants.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          style={styles.viewChallengeBtn}
          onClick={handleViewChallenge}
        >
          View Challenge
        </button>
      </div>
    </div>
  );
}

export default function ChallengesPage({ onNavigate, activeRoute = "/challenges" }) {
  const [search, setSearch] = useState("");

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Leaf size={20} color="#fff" />
          </div>
          <span style={styles.brandName}>GreenTrip Malaysia</span>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.route === activeRoute;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate?.(item.route)}
                style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
              >
                <item.icon size={18} color={isActive ? "#15803d" : "#374151"} />
                <span style={{ color: isActive ? "#15803d" : "#374151", fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <header style={styles.topbar}>
          <div />
          <div style={styles.userBlock}>
            <div style={{ textAlign: "right" }}>
              <div style={styles.userName}>{USER.name}</div>
              <div style={styles.userSub}>Eco Score: {USER.ecoScore.toLocaleString()}</div>
            </div>
            <div style={styles.avatar}>🐨</div>
          </div>
        </header>

        <div style={styles.content}>
          <h1 style={styles.pageTitle}>Community Eco-Challenges</h1>
          <p style={styles.pageSubtitle}>Join sustainable activities and earn rewards</p>

          {/* Stat cards */}
          <div style={styles.statGrid}>
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Leaderboard */}
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
            <div style={styles.rankSub}>with {RANK.points.toLocaleString()} Eco Points</div>
          </div>

          {/* Search + filters */}
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
              {["State", "Theme", "Difficulty"].map((label) => (
                <div key={label}>
                  <div style={styles.filterLabel}>{label}</div>
                  <button type="button" style={styles.filterSelect}>
                    <span>All {label === "State" ? "States" : label === "Theme" ? "Themes" : "Difficulty"}</span>
                    <ChevronDown size={16} color="#6b7280" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Challenge cards */}
          <div style={styles.challengeGrid}>
            {CHALLENGES.filter((c) =>
              c.title.toLowerCase().includes(search.toLowerCase())
            ).map((c) => (
                 <ChallengeCard key={c.id} c={c} onNavigate={onNavigate}/>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#f2f3f5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#111827",
  },
  sidebar: { width: 240, background: "#fff", borderRight: "1px solid #e5e7eb", padding: "20px 16px", flexShrink: 0 },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "0 8px 24px" },
  brandIcon: { width: 34, height: 34, borderRadius: 8, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontWeight: 700, fontSize: 15 },
  nav: { display: "flex", flexDirection: "column", gap: 4 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, fontSize: 14.5, cursor: "pointer", border: "none", background: "transparent", textAlign: "left", width: "100%" },
  navItemActive: { background: "#dcfce7" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "#fff", borderBottom: "1px solid #e5e7eb" },
  userBlock: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontWeight: 700, fontSize: 14.5 },
  userSub: { fontSize: 12.5, color: "#6b7280" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto" },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: 0 },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 20, fontSize: 14.5 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  cardTitle: { fontWeight: 700, fontSize: 15.5 },
  rowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  viewMore: { display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#6b7280" },
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
  filterSelect: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    fontSize: 13.5,
    cursor: "pointer",
  },
  challengeGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginTop: 20, marginBottom: 32 },
  challengeCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" },
  challengeImage: { width: "100%", height: 180, objectFit: "cover", display: "block" },
  challengeTitle: { fontWeight: 800, fontSize: 17, marginBottom: 6 },
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
  },
};