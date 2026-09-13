import React, {
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

// IMPORTANT:
// Your actual file name is achievementCard.jsx
import AchievementCard from "../../../shared/components/achievementCard";

import QuickActionCard from "../components/QuickActionCard";
import ActiveTripRow from "../components/ActiveTripRow";
import ChallengeRow from "../components/ChallengeRow";

import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToCumulativeEcoScore } from "../../../firebase/ecoScoreService";

import {
  getSummaryStats,
  getRecentTrips,
  getFeaturedChallenges,
} from "../services/Homedashboard";

import {
  listenToPublishedAchievements,
  listenToUserAchievements,
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

  "Achievements": {
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

  const [stats, setStats] = useState([]);
  const [trips, setTrips] = useState([]);
  const [challenges, setChallenges] = useState([]);

  // All published achievements from Firebase
  const [achievements, setAchievements] =
    useState([]);

  // Actual achievements already earned by this user.
  // Source: users/{uid}/achievements
  const [earnedAchievements, setEarnedAchievements] =
    useState([]);

  const [cumulativeEcoScore, setCumulativeEcoScore] =
    useState(0);



  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    getSummaryStats().then(setStats);

    getRecentTrips().then(setTrips);

    getFeaturedChallenges().then(
      setChallenges
    );
  }, []);


  // ============================================================
  // LIVE CUMULATIVE ECO SCORE
  // Source: completed top-level travelHistory records.
  // Does not modify users/{uid}.eco_score.
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setCumulativeEcoScore(0);
      return;
    }

    return listenToCumulativeEcoScore(
      authUser.uid,
      setCumulativeEcoScore
    );
  }, [authUser?.uid]);


  // ============================================================
  // LISTEN TO ADMIN-CREATED PUBLISHED ACHIEVEMENTS
  // ============================================================

  useEffect(() => {
    const unsubscribe =
      listenToPublishedAchievements(
        (list) => {
          setAchievements(list);
        }
      );

    return unsubscribe;
  }, []);


  // ============================================================
  // LISTEN TO ACTUAL EARNED ACHIEVEMENTS
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setEarnedAchievements([]);
      return;
    }

    return listenToUserAchievements(
      authUser.uid,
      (list) => {
        setEarnedAchievements(
          Array.isArray(list) ? list : []
        );
      }
    );
  }, [authUser?.uid]);




  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          Loading...
        </p>
      </div>
    );
  }


  // ============================================================
  // LOGIN CHECK
  // ============================================================

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


  // ============================================================
  // USER
  // ============================================================

  const user = {
    name: profile.name,

    ecoScore: cumulativeEcoScore,
  };


  // ============================================================
  // USER PROGRESS
  // ============================================================

  const userProgress = {
    trips_completed: trips.filter(
      (trip) => trip.completed === true
    ).length,

    eco_score: cumulativeEcoScore,

    carbon_saved: Number(
      profile.carbon_saved ?? 0
    ),

    challenges_completed: Number(
      profile.challenges_completed ?? 0
    ),

    community_posts: Number(
      profile.community_posts ?? 0
    ),

    waste_reduced: Number(
      profile.waste_reduced ?? 0
    ),
  };


  // ============================================================
  // CALCULATE ACHIEVEMENT STATUS
  // ============================================================

  const achievementsWithStatus =
    achievements.map(
      (achievement) => {
        const ruleType =
          achievement.ruleType ||
          "trips_completed";

        const target = Math.max(
          Number(
            achievement.ruleTarget
          ) || 1,
          1
        );

        const progress =
          userProgress[ruleType] ?? 0;

        const unlocked =
          progress >= target;

        return {
          ...achievement,

          unlocked,

          progress,

          ruleTarget:
            target,

          ruleUnit:
            achievement.ruleUnit || "",
        };
      }
    );


  // ============================================================
  // DISPLAY STATS
  // ============================================================
  //
  // Eco Score is derived from the LIVE cumulative listener.
  // This avoids a race where getSummaryStats() can overwrite the
  // live Eco Score with its initial placeholder value of 0.
  //
  // Achievements count is derived from the achievements that are
  // actually unlocked by the current user's real progress.
  // ============================================================

  const unlockedAchievementsCount =
    earnedAchievements.length;

  const displayStats =
    stats.map((stat) => {
      if (
        stat.label === "Eco Score" ||
        stat.title === "Eco Score"
      ) {
        return {
          ...stat,
          value: cumulativeEcoScore,
          note: "Cumulative Eco Score",
        };
      }

      if (
        stat.label === "Achievements" ||
        stat.title === "Achievements" ||
        stat.label === "Badges Earned" ||
        stat.title === "Badges Earned"
      ) {
        return {
          ...stat,
          label: "Achievements",
          value: String(unlockedAchievementsCount),
          sub: "Unlocked achievements",
        };
      }

      return stat;
    });


  // ============================================================
  // SORT ACHIEVEMENTS
  // UNLOCKED FIRST
  // THEN NEWEST
  // ============================================================

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

        const dateA =
          a.createdAt?.toMillis?.() || 0;

        const dateB =
          b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      }
    );




  // ============================================================
  // QUICK ACTIONS
  // ============================================================

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



  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <Layout
      active="dashboard"
      user={user}
      onNavigate={onNavigate}
    >
      <div style={styles.content}>

        {/* ======================================================
            PAGE HEADER
            ====================================================== */}

        <h1 style={styles.pageTitle}>
          Welcome back, {user.name}!
        </h1>

        <p style={styles.pageSubtitle}>
          Track your eco-journey and make
          every trip sustainable
        </p>


        {/* ======================================================
            STATS
            ====================================================== */}

        <div style={styles.statGrid}>
          {displayStats.map((stat) => (
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


        {/* ======================================================
            QUICK ACTIONS
            ====================================================== */}

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


        {/* ======================================================
            RECENT TRIPS + CHALLENGES
            ====================================================== */}

        <div style={styles.twoCol}>

          {/* RECENT TRIPS */}

          <div style={styles.card}>
            <div style={styles.rowHeader}>
              <span
                style={styles.sectionTitle}
              >
                Recent Trips
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

            <div
              style={{
                marginTop: 16,
              }}
            >
              {trips.length === 0 ? (
                <div style={styles.noData}>
                  No trips found.
                </div>
              ) : (
                trips.map((trip) => (
                  <ActiveTripRow
                    key={trip.itineraryId || trip.id || trip.title}
                    {...trip}
                  />
                ))
              )}
            </div>
          </div>


          {/* FEATURED CHALLENGES */}

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

            <div
              style={{
                marginTop: 16,
              }}
            >
              {challenges.length === 0 ? (
                <div style={styles.noData}>
                  No featured challenges.
                </div>
              ) : (
                challenges.map(
                  (challenge) => (
                    <ChallengeRow
                      key={challenge.title}
                      {...challenge}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>


        {/* ======================================================
            ACHIEVEMENTS
            ====================================================== */}

        <div
          style={{
            ...styles.card,
            marginTop: 24,
            marginBottom: 32,
          }}
        >

          {/* HEADER */}

          <div
            style={
              styles.achievementHeader
            }
          >
            <div>
              <div
                style={
                  styles.sectionTitle
                }
              >
                Achievements
              </div>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                {achievements.length === 0
                  ? "No achievements available yet."
                  : "View your latest achievements and track your progress."}
              </p>
            </div>


            {/* RIGHT SIDE */}

            <div
              style={
                styles.achievementActions
              }
            >

              {/* VIEW MORE */}

              {sortedAchievements.length >
                0 && (
                <button
                  type="button"
                  style={
                    styles.viewMoreButton
                  }
                  onClick={() =>
                    onNavigate?.(
                      "/community/achievements"
                    )
                  }
                >
                  View More
                  <ChevronRight size={16} />
                </button>
              )}

            </div>
          </div>


          {/* ====================================================
              NO ACHIEVEMENTS
              ==================================================== */}

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

            /* ==================================================
               ONLY SHOW FIRST 3
               ================================================== */

            <div
              style={
                styles.achievementGrid
              }
            >
              {sortedAchievements
                .slice(0, 3)
                .map(
                  (achievement) => (
                    <AchievementCard
                      key={achievement.id}
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
                      iconUrl={
                        achievement.iconUrl ||
                        ""
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


/* ================================================================
   STYLES
   ================================================================ */

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
    justifyContent: "space-between",
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



  /* ==============================================================
     ACHIEVEMENT HEADER
     ============================================================== */

  achievementHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  achievementActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  viewMoreButton: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    border: "none",
    background: "transparent",
    color: "#374151",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
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