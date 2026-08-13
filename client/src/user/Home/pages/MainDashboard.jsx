import React, { useEffect, useState } from "react";
import { Leaf, TrendingDown, Calendar, Award, Navigation, Zap, Users, ChevronRight } from "lucide-react";

import Layout from "../../../shared/components/Layout";
import StatCard from "../../../shared/components/StatCard";
import QuickActionCard from "../components/QuickActionCard";
import ActiveTripRow from "../components/ActiveTripRow";
import ChallengeRow from "../components/ChallengeRow";
import AchievementCard from "../../../shared/components/AchievementCard";
import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  getSummaryStats,
  getActiveTrips,
  getFeaturedChallenges,
  getRecentAchievements,
} from "../services/Homedashboard";

const STAT_ICONS = {
  "Eco Score": { icon: Leaf, color: "#22c55e" },
  "Carbon Saved": { icon: TrendingDown, color: "#3b82f6" },
  "Trips Completed": { icon: Calendar, color: "#8b5cf6" },
  "Badges Earned": { icon: Award, color: "#f97316" },
};

/**
 * MainDashboard
 *
 * Props: onNavigate(route) — passed down to Layout's sidebar so clicking
 * "Community", "Itinerary", etc. can switch pages in the parent app.
 */
export default function MainDashboard({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();

  const [stats, setStats] = useState([]);
  const [trips, setTrips] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    // NOTE: these four are still mock data from services/Homedashboard —
    // only the user's name/eco score below now come from Firestore.
    getSummaryStats().then(setStats);
    getActiveTrips().then(setTrips);
    getFeaturedChallenges().then(setChallenges);
    getRecentAchievements().then(setAchievements);
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>You're not logged in.</p>
        <button type="button" onClick={() => onNavigate("/login")} style={styles.loginRedirectBtn}>
          Go to Login
        </button>
      </div>
    );
  }

  const user = { name: profile.name, ecoScore: profile.eco_score ?? 0 };

  // route builder shared by all four quick-action tiles
  const QUICK_ACTIONS = [
    { icon: Calendar, iconColor: "#7c3aed", title: "Plan Itinerary", subtitle: "Create eco-trip", route: "/itinerary" },
    { icon: Navigation, iconColor: "#3b82f6", title: "AI Routes", subtitle: "Smart Navigation", route: "/recommendations" },
    { icon: Zap, iconColor: "#f97316", title: "Challenges", subtitle: "Earn Rewards", route: "/challenges" },
    { icon: Users, iconColor: "#3b82f6", title: "Community", subtitle: "Connect & Share", route: "/community" },
  ];

  return (
    <Layout active="dashboard" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Welcome back, {user.name}!</h1>
        <p style={styles.pageSubtitle}>Track your eco-journey and make every trip sustainable</p>

        {/* Stat cards */}
        <div style={styles.statGrid}>
          {stats.map((s) => (
            <StatCard
              key={s.label}
              icon={STAT_ICONS[s.label]?.icon}
              iconColor={STAT_ICONS[s.label]?.color}
              label={s.label}
              value={s.value}
              note={s.note}
              progress={s.progress}
              sub={s.sub}
              subColor={s.subColor}
            />
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ ...styles.card, marginTop: 24 }}>
          <div style={styles.sectionTitle}>Quick Actions</div>
          <p style={styles.sectionSubtitle}>Start planning your next sustainable adventure</p>
          <div style={styles.actionGrid}>
            {QUICK_ACTIONS.map((a) => (
              <QuickActionCard key={a.title} {...a} onClick={() => onNavigate?.(a.route)} />
            ))}
          </div>
        </div>

        {/* Active trips + Featured challenges */}
        <div style={styles.twoCol}>
          <div style={styles.card}>
            <div style={styles.rowHeader}>
              <span style={styles.sectionTitle}>Active Trips</span>
              <div style={styles.viewMore} onClick={() => onNavigate?.("/itinerary")}>
                View All <ChevronRight size={16} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              {trips.map((t) => (
                <ActiveTripRow key={t.title} {...t} />
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.rowHeader}>
              <span style={styles.sectionTitle}>Featured Challenges</span>
              <div style={styles.viewMore} onClick={() => onNavigate?.("/challenges")}>
                View All <ChevronRight size={16} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              {challenges.map((c) => (
                <ChallengeRow key={c.title} {...c} />
              ))}
            </div>
          </div>
        </div>

        {/* Recent achievements */}
        <div style={{ ...styles.card, marginTop: 24, marginBottom: 32 }}>
          <div style={styles.sectionTitle}>Recent Achievements</div>
          <p style={styles.sectionSubtitle}>Your latest eco-badges & milestones</p>
          <div style={styles.achievementGrid}>
            {achievements.map((a) => (
              <AchievementCard key={a.title} {...a} />
            ))}
          </div>
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
  loginRedirectBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto" },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: 0 },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 20, fontSize: 14.5 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  sectionTitle: { fontWeight: 700, fontSize: 17 },
  sectionSubtitle: { color: "#6b7280", fontSize: 13.5, marginTop: 4, marginBottom: 16 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 },
  rowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  viewMore: { display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  achievementGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
};