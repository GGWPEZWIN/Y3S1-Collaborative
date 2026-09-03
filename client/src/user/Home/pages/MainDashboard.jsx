import {
  useEffect,
  useState,
} from "react";

import {
  Leaf,
  TrendingDown,
  Calendar,
  Award,
  Navigation,
  Zap,
  Users,
  ChevronRight,
} from "lucide-react";

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
} from "../services/Homedashboard";

import {
  listenToAchievements,
} from "../../../firebase/achievementService";

const STAT_ICONS = {
  "Eco Score": {
    icon: Leaf,
    color: "#22c55e",
  },

  "Carbon Saved": {
    icon: TrendingDown,
    color: "#3b82f6",
  },

  "Trips Completed": {
    icon: Calendar,
    color: "#8b5cf6",
  },

  "Badges Earned": {
    icon: Award,
    color: "#f97316",
  },
};

export default function MainDashboard({
  onNavigate,
}) {
  const {
    authUser,
    profile,
    loading,
  } = useCurrentUser();

  const [stats, setStats] =
    useState([]);

  const [trips, setTrips] =
    useState([]);

  const [challenges, setChallenges] =
    useState([]);

  const [achievements, setAchievements] =
    useState([]);

  /*
  |--------------------------------------------------------------------------
  | Load dashboard data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    getSummaryStats().then(setStats);

    getActiveTrips().then(setTrips);

    getFeaturedChallenges().then(
      setChallenges
    );
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Listen to achievements from Firestore
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe =
      listenToAchievements((list) => {
        setAchievements(list);
      });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          Loading...
        </p>
      </div>
    );
  }

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/login")
          }
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>
      </div>
    );
  }

  const user = {
    name: profile.name,
    ecoScore:
      profile.eco_score ?? 0,
  };

  /*
  |--------------------------------------------------------------------------
  | User progress
  |--------------------------------------------------------------------------
  |
  | Adjust these fields if your Firestore user
  | document uses different names.
  |
  */

  const userProgress = {
    trips_completed:
      Number(
        profile.trips_completed ??
          profile.completed_trips ??
          0
      ),

    eco_score:
      Number(
        profile.eco_score ?? 0
      ),

    carbon_saved:
      Number(
        profile.carbon_saved ?? 0
      ),

    challenges_completed:
      Number(
        profile.challenges_completed ??
          0
      ),

    community_posts:
      Number(
        profile.community_posts ?? 0
      ),

    waste_reduced:
      Number(
        profile.waste_reduced ?? 0
      ),
  };

  /*
  |--------------------------------------------------------------------------
  | Determine whether each achievement is unlocked
  |--------------------------------------------------------------------------
  */

  const achievementsWithStatus =
    achievements.map(
      (achievement) => {
        const ruleType =
          achievement.rule_type ||
          "trips_completed";

        const target =
          Number(
            achievement.rule_target
          ) || 1;

        const progress =
          userProgress[
            ruleType
          ] ?? 0;

        const unlocked =
          progress >= target;

        return {
          ...achievement,
          unlocked,
          progress,
          ruleTarget: target,
          ruleUnit:
            achievement.rule_unit ||
            "",
        };
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Sort unlocked achievements first
  |--------------------------------------------------------------------------
  */

  const sortedAchievements =
    [...achievementsWithStatus].sort(
      (a, b) => {
        if (
          a.unlocked &&
          !b.unlocked
        ) {
          return -1;
        }

        if (
          !a.unlocked &&
          b.unlocked
        ) {
          return 1;
        }

        return 0;
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Quick actions
  |--------------------------------------------------------------------------
  */

  const QUICK_ACTIONS = [
    {
      icon: Calendar,
      iconColor: "#7c3aed",
      title: "Plan Itinerary",
      subtitle: "Create eco-trip",
      route: "/itinerary",
    },

    {
      icon: Navigation,
      iconColor: "#3b82f6",
      title: "AI Routes",
      subtitle: "Smart Navigation",
      route: "/recommendations",
    },

    {
      icon: Zap,
      iconColor: "#f97316",
      title: "Challenges",
      subtitle: "Earn Rewards",
      route: "/challenges",
    },

    {
      icon: Users,
      iconColor: "#3b82f6",
      title: "Community",
      subtitle: "Connect & Share",
      route: "/community",
    },
  ];

  const unlockedCount =
    sortedAchievements.filter(
      (achievement) =>
        achievement.unlocked
    ).length;

  return (
    <Layout
      active="dashboard"
      user={user}
      onNavigate={onNavigate}
    >
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>
          Welcome back, {user.name}!
        </h1>

        <p style={styles.pageSubtitle}>
          Track your eco-journey and make
          every trip sustainable
        </p>

        {/* Stats */}

        <div style={styles.statGrid}>
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              icon={
                STAT_ICONS[
                  stat.label
                ]?.icon
              }
              iconColor={
                STAT_ICONS[
                  stat.label
                ]?.color
              }
              label={stat.label}
              value={stat.value}
              note={stat.note}
              progress={stat.progress}
              sub={stat.sub}
              subColor={stat.subColor}
            />
          ))}
        </div>

        {/* Quick actions */}

        <div
          style={{
            ...styles.card,
            marginTop: 24,
          }}
        >
          <div style={styles.sectionTitle}>
            Quick Actions
          </div>

          <p style={styles.sectionSubtitle}>
            Start planning your next
            sustainable adventure
          </p>

          <div style={styles.actionGrid}>
            {QUICK_ACTIONS.map(
              (action) => (
                <QuickActionCard
                  key={action.title}
                  {...action}
                  onClick={() =>
                    onNavigate?.(
                      action.route
                    )
                  }
                />
              )
            )}
          </div>
        </div>

        {/* Active trips + challenges */}

        <div style={styles.twoCol}>
          <div style={styles.card}>
            <div style={styles.rowHeader}>
              <span
                style={styles.sectionTitle}
              >
                Active Trips
              </span>

              <div
                style={styles.viewMore}
                onClick={() =>
                  onNavigate?.(
                    "/itinerary"
                  )
                }
              >
                View All
                <ChevronRight size={16} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              {trips.length === 0 ? (
                <div
                  style={styles.noData}
                >
                  No active trips.
                </div>
              ) : (
                trips.map((trip) => (
                  <ActiveTripRow
                    key={trip.title}
                    {...trip}
                  />
                ))
              )}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.rowHeader}>
              <span
                style={styles.sectionTitle}
              >
                Featured Challenges
              </span>

              <div
                style={styles.viewMore}
                onClick={() =>
                  onNavigate?.(
                    "/challenges"
                  )
                }
              >
                View All
                <ChevronRight size={16} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              {challenges.length === 0 ? (
                <div
                  style={styles.noData}
                >
                  No featured challenges.
                </div>
              ) : (
                challenges.map(
                  (challenge) => (
                    <ChallengeRow
                      key={
                        challenge.title
                      }
                      {...challenge}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>

        {/* Achievements */}

        <div
          style={{
            ...styles.card,
            marginTop: 24,
            marginBottom: 32,
          }}
        >
          <div style={styles.achievementHeader}>
            <div>
              <div
                style={styles.sectionTitle}
              >
                Achievements
              </div>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                {unlockedCount === 0
                  ? "You haven't unlocked any achievements yet."
                  : `${unlockedCount} achievement${
                      unlockedCount !== 1
                        ? "s"
                        : ""
                    } unlocked`}
              </p>
            </div>

            <div
              style={styles.achievementCount}
            >
              {unlockedCount}/
              {sortedAchievements.length}
            </div>
          </div>

          {sortedAchievements.length ===
          0 ? (
            <div
              style={
                styles.noAchievements
              }
            >
              <div
                style={
                  styles.noAchievementIcon
                }
              >
                <Award size={28} />
              </div>

              <div
                style={
                  styles.noAchievementTitle
                }
              >
                No achievements available yet
              </div>

              <div
                style={
                  styles.noAchievementText
                }
              >
                Check back later for new
                achievements.
              </div>
            </div>
          ) : (
            <div
              style={
                styles.achievementGrid
              }
            >
              {sortedAchievements.map(
                (achievement) => (
                  <AchievementCard
                    key={
                      achievement.id
                    }
                    title={
                      achievement.title
                    }
                    description={
                      achievement.description
                    }
                    category={
                      achievement.category
                    }
                    icon={
                      achievement.icon
                    }
                    points={
                      achievement.points
                    }
                    unlocked={
                      achievement.unlocked
                    }
                    progress={
                      achievement.progress
                    }
                    ruleTarget={
                      achievement.ruleTarget
                    }
                    ruleUnit={
                      achievement.ruleUnit
                    }
                  />
                )
              )}
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

  content: {
    padding: "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    color: "#111827",
  },

  pageSubtitle: {
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14.5,
  },

  statGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: 16,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  },

  sectionTitle: {
    fontWeight: 700,
    fontSize: 17,
    color: "#111827",
  },

  sectionSubtitle: {
    color: "#6b7280",
    fontSize: 13.5,
    marginTop: 4,
    marginBottom: 16,
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: 12,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: 16,
    marginTop: 24,
  },

  rowHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  viewMore: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
  },

  noData: {
    color: "#9ca3af",
    fontSize: 13,
    padding: "15px 0",
  },

  achievementHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
  },

  achievementCount: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#f0fdf4",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 800,
  },

  achievementGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
  },

  noAchievements: {
    textAlign: "center",
    padding: "35px 20px",
  },

  noAchievementIcon: {
    width: 56,
    height: 56,
    margin: "0 auto 12px",
    borderRadius: 14,
    background: "#f3f4f6",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  noAchievementTitle: {
    color: "#374151",
    fontWeight: 700,
    fontSize: 14,
  },

  noAchievementText: {
    marginTop: 5,
    color: "#9ca3af",
    fontSize: 12.5,
  },
};