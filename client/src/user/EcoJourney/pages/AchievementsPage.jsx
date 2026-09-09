import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Award,
  CheckCircle2,
  Lock,
  Trophy,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";

import AchievementCard from "../../../shared/components/achievementCard";

import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  listenToPublishedAchievements,
  checkAndAwardAchievements,
  listenToUserAchievements,
} from "../../../firebase/achievementService";

const STATUS_FILTERS = [
  "All",
  "Unlocked",
  "In Progress",
  "Locked",
];

export default function AchievementsPage({
  onNavigate,
}) {
  const {
    authUser,
    profile,
    loading,
  } = useCurrentUser();

  const [
    achievements,
    setAchievements,
  ] = useState([]);

  const [
    userRecords,
    setUserRecords,
  ] = useState([]);

  const [
    userProgress,
    setUserProgress,
  ] = useState({
    trips_completed: 0,
    eco_score: 0,
    challenges_completed: 0,
    carbon_saved: 0,
    waste_reduced: 0,
  });

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("All");

  const [
    newlyUnlocked,
    setNewlyUnlocked,
  ] = useState([]);

  const [
    checking,
    setChecking,
  ] = useState(false);

  // ============================================================
  // LISTEN TO PUBLISHED ACHIEVEMENTS
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setAchievements([]);

      return undefined;
    }

    const unsubscribe =
      listenToPublishedAchievements(
        async (list) => {
          setAchievements(list);

          try {
            setChecking(true);

            const result =
              await checkAndAwardAchievements(
                authUser.uid,
                list
              );

            setUserProgress(
              result.userProgress || {}
            );

            if (
              result.newlyAwarded?.length
            ) {
              setNewlyUnlocked(
                result.newlyAwarded
              );

              window.setTimeout(
                () => {
                  setNewlyUnlocked([]);
                },
                5000
              );
            }
          } catch (error) {
            console.error(
              "Failed to check achievements:",
              error
            );
          } finally {
            setChecking(false);
          }
        }
      );

    return unsubscribe;
  }, [authUser?.uid]);

  // ============================================================
  // LISTEN TO USER ACHIEVEMENTS
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setUserRecords([]);

      return undefined;
    }

    return listenToUserAchievements(
      authUser.uid,
      setUserRecords
    );
  }, [authUser?.uid]);

  // ============================================================
  // USER PROGRESS
  // ============================================================

  const displayedProgress =
    useMemo(
      () => ({
        trips_completed:
          Number(
            userProgress.trips_completed ??
              0
          ),

        eco_score:
          Number(
            userProgress.eco_score ??
              profile?.eco_score ??
              0
          ),

        challenges_completed:
          Number(
            userProgress.challenges_completed ??
              profile?.challenges_completed ??
              0
          ),

        carbon_saved:
          Number(
            userProgress.carbon_saved ??
              profile?.carbon_saved ??
              0
          ),

        waste_reduced:
          Number(
            userProgress.waste_reduced ??
              profile?.waste_reduced ??
              0
          ),
      }),
      [
        userProgress,
        profile,
      ]
    );

  // ============================================================
  // ADD STATUS TO EACH ACHIEVEMENT
  // ============================================================

  const achievementsWithStatus =
    useMemo(() => {
      const awardedIds =
        new Set(
          userRecords.map(
            (record) =>
              record.achievementId ||
              record.id
          )
        );

      return achievements.map(
        (achievement) => {
          const ruleType =
            achievement.ruleType ||
            "trips_completed";

          const target =
            Math.max(
              Number(
                achievement.ruleTarget
              ) || 1,
              1
            );

          const progress =
            Number(
              displayedProgress[
                ruleType
              ]
            ) || 0;

          const unlocked =
            awardedIds.has(
              achievement.id
            ) ||
            progress >= target;

          let status = "Locked";

          if (unlocked) {
            status = "Unlocked";
          } else if (
            progress > 0
          ) {
            status = "In Progress";
          }

          return {
            ...achievement,

            progress,

            ruleTarget:
              target,

            ruleUnit:
              achievement.ruleUnit ||
              "",

            unlocked,

            status,
          };
        }
      );
    }, [
      achievements,
      displayedProgress,
      userRecords,
    ]);

  // ============================================================
  // CATEGORY OPTIONS
  // ============================================================

  const categories = useMemo(
    () => [
      "All",

      ...Array.from(
        new Set(
          achievements
            .map(
              (item) =>
                item.category
            )
            .filter(Boolean)
        )
      ),
    ],
    [achievements]
  );

  // ============================================================
  // FILTER
  // ============================================================

  const filteredAchievements =
    useMemo(() => {
      return achievementsWithStatus.filter(
        (achievement) => {
          const statusMatch =
            statusFilter === "All" ||
            achievement.status ===
              statusFilter;

          const categoryMatch =
            categoryFilter === "All" ||
            achievement.category ===
              categoryFilter;

          return (
            statusMatch &&
            categoryMatch
          );
        }
      );
    }, [
      achievementsWithStatus,
      statusFilter,
      categoryFilter,
    ]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const unlockedCount =
    achievementsWithStatus.filter(
      (item) => item.unlocked
    ).length;

  const totalCount =
    achievementsWithStatus.length;

  const percentage =
    totalCount === 0
      ? 0
      : Math.round(
          (unlockedCount /
            totalCount) *
            100
        );

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        Loading...
      </div>
    );
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (
    !authUser ||
    !profile
  ) {
    return (
      <div style={styles.loadingPage}>
        <p
          style={
            styles.loginText
          }
        >
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/login")
          }
          style={
            styles.loginButton
          }
        >
          Go to Login
        </button>
      </div>
    );
  }

  const user = {
    name:
      profile.name || "User",

    ecoScore:
      profile.eco_score ?? 0,

    profile_photo_url:
      profile.profile_photo_url ||
      "",
  };

  return (
    <Layout
      active="community"
      user={user}
      onNavigate={onNavigate}
    >
      <div style={styles.page}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Achievements
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Complete sustainable
              actions and unlock
              rewards.
            </p>
          </div>

          <div
            style={
              styles.summaryBox
            }
          >
            <Trophy
              size={18}
              color="#16a34a"
            />

            <div
              style={
                styles.summaryText
              }
            >
              <strong>
                {unlockedCount} /{" "}
                {totalCount}
              </strong>

              <span>
                achievements unlocked
              </span>
            </div>
          </div>
        </div>

        {/* OVERALL PROGRESS */}

        <div
          style={
            styles.progressCard
          }
        >
          <div
            style={
              styles.progressTop
            }
          >
            <div>
              <div
                style={
                  styles.progressTitle
                }
              >
                Your Achievement
                Progress
              </div>

              <div
                style={
                  styles.progressSubtitle
                }
              >
                {percentage}% completed
              </div>
            </div>

            <Award
              size={24}
              color="#16a34a"
            />
          </div>

          <div
            style={
              styles.progressBar
            }
          >
            <div
              style={{
                ...styles.progressFill,
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>

        {/* NEW ACHIEVEMENT */}

        {newlyUnlocked.length >
          0 && (
          <div
            style={
              styles.successBox
            }
          >
            <CheckCircle2
              size={20}
              color="#15803d"
            />

            <div>
              <strong>
                New achievement
                unlocked!
              </strong>

              <div>
                {newlyUnlocked
                  .map(
                    (item) =>
                      item.title
                  )
                  .join(", ")}
              </div>
            </div>
          </div>
        )}

        {/* FILTERS */}

        <div
          style={styles.filters}
        >
          <div
            style={
              styles.filterGroup
            }
          >
            {STATUS_FILTERS.map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      filter
                    )
                  }
                  style={{
                    ...styles.filterButton,

                    ...(statusFilter ===
                    filter
                      ? styles.activeFilter
                      : {}),
                  }}
                >
                  {filter}
                </button>
              )
            )}
          </div>

          <select
            value={
              categoryFilter
            }
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
            style={
              styles.categorySelect
            }
          >
            {categories.map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>
        </div>

        {/* ACHIEVEMENT GRID */}

        {checking &&
        achievements.length ===
          0 ? (
          <div
            style={
              styles.empty
            }
          >
            Checking
            achievements...
          </div>
        ) : filteredAchievements.length ===
          0 ? (
          <div
            style={
              styles.empty
            }
          >
            <div
              style={
                styles.emptyIcon
              }
            >
              <Lock size={26} />
            </div>

            <div
              style={
                styles.emptyTitle
              }
            >
              No achievements
              found
            </div>

            <div
              style={
                styles.emptyText
              }
            >
              There are no
              published
              achievements
              matching your
              filter.
            </div>
          </div>
        ) : (
          <div
            style={
              styles.grid
            }
          >
            {filteredAchievements.map(
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
    </Layout>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  page: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding:
      "28px 32px 40px",
    boxSizing: "border-box",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    background: "#f9fafb",
  },

  loginText: {
    marginBottom: 12,
  },

  loginButton: {
    border: "none",
    borderRadius: 9,
    padding:
      "10px 16px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    margin:
      "6px 0 0",
    color: "#6b7280",
    fontSize: 14,
  },

  summaryBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding:
      "10px 14px",
    borderRadius: 12,
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    flexShrink: 0,
  },

  summaryText: {
    display: "flex",
    flexDirection:
      "column",
    gap: 2,
  },

  progressCard: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 15,
    padding: 18,
    marginBottom: 16,
  },

  progressTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  progressTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#111827",
  },

  progressSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },

  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#22c55e",
    transition:
      "width 0.25s ease",
  },

  successBox: {
    display: "flex",
    alignItems:
      "flex-start",
    gap: 10,
    padding:
      "12px 14px",
    borderRadius: 11,
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 12.5,
    marginBottom: 16,
  },

  filters: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  filterGroup: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
  },

  filterButton: {
    border:
      "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    borderRadius: 999,
    padding:
      "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  activeFilter: {
    background: "#16a34a",
    borderColor: "#16a34a",
    color: "#fff",
  },

  categorySelect: {
    border:
      "1px solid #d1d5db",
    borderRadius: 9,
    padding:
      "8px 10px",
    background: "#fff",
    color: "#374151",
    fontSize: 12,
    fontWeight: 600,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },

  empty: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 15,
    padding: 50,
    textAlign: "center",
    color: "#6b7280",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    margin:
      "0 auto 12px",
    borderRadius: 14,
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    color: "#9ca3af",
  },

  emptyTitle: {
    fontWeight: 800,
    color: "#374151",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12.5,
  },
};