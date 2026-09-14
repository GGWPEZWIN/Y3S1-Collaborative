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

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

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

  const [cumulativeEcoScore, setCumulativeEcoScore] =
    useState(0);

  // Live count of all itineraries saved by the current user.
  // This powers the "itinerary_saved" achievement rule.
  const [savedItineraryCount, setSavedItineraryCount] =
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
        async (list) => {
          setAchievements(Array.isArray(list) ? list : []);
        }
      );

    return unsubscribe;
  }, [authUser?.uid]);


  // ============================================================
  // LIVE SAVED ITINERARY COUNT
  // Source: top-level itineraries collection.
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setSavedItineraryCount(0);
      return;
    }

    const itinerariesQuery = query(
      collection(db, "itineraries"),
      where("userId", "==", authUser.uid)
    );

    return onSnapshot(
      itinerariesQuery,
      (snapshot) => {
        setSavedItineraryCount(snapshot.size);
      },
      (error) => {
        console.error(
          "Failed to load saved itinerary count:",
          error
        );
        setSavedItineraryCount(0);
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

  // Prefer the live Firestore count. During the first render, when the
  // snapshot has not arrived yet, fall back to the itineraries already
  // loaded by the dashboard. This prevents First Itinerary from getting
  // stuck at 0/1 even though the saved itinerary is already visible.
  const effectiveSavedItineraryCount = Math.max(
    Number(savedItineraryCount) || 0,
    Array.isArray(trips) ? trips.length : 0
  );

  const userProgress = {
    itinerary_saved: effectiveSavedItineraryCount,

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
        const rawRuleType = String(
          achievement.ruleType ||
            "trips_completed"
        ).trim().toLowerCase();

        // Normalise common spellings used by older achievement records.
        const ruleTypeAliases = {
          itinerarysaved: "itinerary_saved",
          "itinerary-saved": "itinerary_saved",
          save_itinerary: "itinerary_saved",
          first_itinerary: "itinerary_saved",
          itinerary_saved: "itinerary_saved",
          tripscompleted: "trips_completed",
          "trips-completed": "trips_completed",
        };

        const ruleType =
          ruleTypeAliases[rawRuleType] ||
          rawRuleType;

        const normalizedTitle = String(
          achievement?.title || ""
        ).trim().toLowerCase();

        // Explicitly recognize the First Itinerary milestone even if an
        // older achievement document has a different ruleType.
        const isFirstItinerary =
          normalizedTitle === "first itinerary" ||
          ruleType === "itinerary_saved";

        const target = Math.max(
          Number(
            achievement.ruleTarget
          ) || 1,
          1
        );

        // IMPORTANT:
        // The First Itinerary achievement must use the live
        // Firestore saved-itinerary counter, not the initial
        // dashboard snapshot.
        const progress =
          isFirstItinerary
            ? effectiveSavedItineraryCount
            : userProgress[ruleType] ?? 0;

        const unlocked =
          isFirstItinerary
            ? effectiveSavedItineraryCount >= target
            : progress >= target;

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
  // ECO SCORE LEVEL / PROGRESS
  // Same level system used by the Community page.
  // ============================================================

  const ECO_LEVELS = [
    {
      level: 1,
      min: 0,
      max: 499,
    },
    {
      level: 2,
      min: 500,
      max: 1499,
    },
    {
      level: 3,
      min: 1500,
      max: 2999,
    },
    {
      level: 4,
      min: 3000,
      max: 4999,
    },
    {
      level: 5,
      min: 5000,
      max: Infinity,
    },
  ];

  const currentEcoLevel =
    [...ECO_LEVELS]
      .reverse()
      .find(
        (level) =>
          Number(cumulativeEcoScore) >= level.min
      ) || ECO_LEVELS[0];

  const nextEcoLevel =
    ECO_LEVELS.find(
      (level) =>
        level.level ===
        currentEcoLevel.level + 1
    ) || null;

  const ecoLevelProgress = nextEcoLevel
    ? Math.min(
        1,
        Math.max(
          0,
          (Number(cumulativeEcoScore) -
            currentEcoLevel.min) /
            (nextEcoLevel.min -
              currentEcoLevel.min)
        )
      )
    : 1;

  const ecoLevelText = nextEcoLevel
    ? `Level ${currentEcoLevel.level} • ${Number(
        cumulativeEcoScore
      ).toLocaleString()} / ${nextEcoLevel.min.toLocaleString()} XP`
    : `Level ${currentEcoLevel.level} • ${Number(
        cumulativeEcoScore
      ).toLocaleString()} XP • Max Level`;

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
    achievementsWithStatus.filter(
      (achievement) => achievement.unlocked
    ).length;

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
        stat.title === "Achievements"
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
          {displayStats.map((stat) => {
            // Eco Score uses the same level/progress presentation
            // as the Community page.
            if (stat.label === "Eco Score") {
              return (
                <div
                  key="Eco Score"
                  style={styles.ecoScoreCard}
                >
                  <div style={styles.ecoScoreHeader}>
                    <div style={styles.ecoScoreLabel}>
                      Eco Score
                    </div>
                    <Leaf
                      size={23}
                      strokeWidth={2}
                      style={styles.ecoScoreIcon}
                    />
                  </div>

                  <div style={styles.ecoScoreValue}>
                    {Number(cumulativeEcoScore) || 0}
                  </div>

                  <div style={styles.ecoScoreLevelText}>
                    {ecoLevelText}
                  </div>

                  <div
                    style={styles.ecoScoreProgressTrack}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        ...styles.ecoScoreProgressFill,
                        width: `${ecoLevelProgress * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }

            return (
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
            );
          })}
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
                  (challenge) => {
                    // ChallengeRow expects numeric fields that may not exist
                    // on every Firestore challenge document.
                    // Normalise them here so one incomplete field cannot
                    // crash the entire dashboard.
                    const safeChallenge = {
                      ...challenge,

                      title:
                        challenge?.title ||
                        challenge?.name ||
                        challenge?.challengeName ||
                        "Untitled Challenge",

                      description:
                        challenge?.description ||
                        challenge?.details ||
                        "",

                      points:
                        Number(
                          challenge?.points ??
                          challenge?.rewardPoints ??
                          challenge?.target ??
                          0
                        ) || 0,

                      carbonKg:
                        Number(
                          challenge?.carbonKg ??
                          challenge?.carbon_saved ??
                          challenge?.carbonSaved ??
                          0
                        ) || 0,

                      participants:
                        Number(
                          challenge?.participants ??
                          challenge?.participantCount ??
                          0
                        ) || 0,

                      target:
                        Number(
                          challenge?.target ??
                          challenge?.goal ??
                          challenge?.pointsTarget ??
                          1
                        ) || 1,

                      difficulty:
                        challenge?.difficulty ||
                        "Easy",

                      tag:
                        challenge?.tag ||
                        challenge?.category ||
                        "Sustainability",

                      location:
                        challenge?.location ||
                        "",

                      imageUrl:
                        challenge?.imageUrl ||
                        challenge?.image ||
                        challenge?.bannerUrl ||
                        "",
                    };

                    return (
                      <ChallengeRow
                        key={
                          safeChallenge.id ||
                          safeChallenge.title
                        }
                        {...safeChallenge}
                      />
                    );
                  }
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
                      "/achievements"
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
                      showPoints={false}
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

  // Requested Eco Score card design.
  ecoScoreCard: {
    position: "relative",
    minHeight: 160,
    boxSizing: "border-box",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "28px 26px 22px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  ecoScoreHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ecoScoreLabel: {
    fontSize: 16,
    lineHeight: 1.2,
    fontWeight: 500,
    color: "#50627b",
  },

  ecoScoreIcon: {
    color: "#16c55a",
    flexShrink: 0,
  },

  ecoScoreValue: {
    marginTop: 12,
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },

  ecoScoreLevelText: {
    marginTop: 12,
    fontSize: 15.5,
    lineHeight: 1.2,
    fontWeight: 500,
    color: "#152f51",
  },

  ecoScoreProgressTrack: {
    width: "100%",
    height: 8,
    marginTop: 14,
    borderRadius: 999,
    background: "#eef0f2",
    overflow: "hidden",
  },

  ecoScoreProgressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#0f172a",
    transition: "width 0.3s ease",
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