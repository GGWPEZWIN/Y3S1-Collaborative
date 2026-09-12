import {
  useEffect,
  useState,
} from "react";

import {
  Leaf,
  TrendingUp,
  Calendar,
  Users,
  MessageCircle,
  BarChart2,
  FileText,
  Medal,
  ChevronRight,
  Award,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import Layout from "../../../shared/components/Layout";
import StatCard from "../../../shared/components/StatCard";

// IMPORTANT:
// Actual filename is achievementCard.jsx
import AchievementCard from "../../../shared/components/achievementCard";

import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  listenToUserChats,
} from "../../../firebase/chatService";

import {
  listenToPublishedAchievements,
} from "../../../firebase/achievementService";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

const FEATURE_CARDS = [
  {
    icon: Calendar,
    iconColor: "#7c3aed",
    title: "Travel History",
    desc: "View your past trips and eco-reports",
    cta: "View History",
    variant: "outline",
  },

  {
    icon: Users,
    iconColor: "#3b82f6",
    title: "Friends",
    desc: "Connect with other eco-travelers",
    cta: "Manage Friends",
    variant: "outline",
  },

  {
    icon: MessageCircle,
    iconColor: "#22c55e",
    title: "Chat & Groups",
    desc: "Discuss travel experiences",
    cta: "Open Chat",
    variant: "outline",
  },

  {
    icon: BarChart2,
    iconColor: "#16a34a",
    title: "Progress Tracker",
    desc: "Charts, milestones and eco grades",
    cta: "View Progress",
    variant: "outline",
  },

  {
    icon: FileText,
    iconColor: "#0d9488",
    title: "Eco-Report Card",
    desc: "View, download and share your trip sustainability reports",
    cta: "View Reports",
    variant: "outline",
  },

  {
    icon: Medal,
    iconColor: "#f43f5e",
    title: "Challenge Team",
    desc: "Form eco-squads and earn shared badges",
    cta: "View More",
    variant: "filled",
  },
];

function FeatureCard({
  icon: Icon,
  iconColor,
  title,
  desc,
  cta,
  variant,
  onClick,
  hasUnreadChat,
}) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureHeader}>
        <Icon
          size={18}
          color={iconColor}
        />

        <div style={styles.featureTitleRow}>
          <span style={styles.featureTitle}>
            {title}
          </span>

          {title === "Chat & Groups" &&
            hasUnreadChat && (
              <span
                style={styles.unreadDot}
              />
            )}
        </div>
      </div>

      <p style={styles.featureDesc}>
        {desc}
      </p>

      <button
        style={
          variant === "filled"
            ? styles.btnFilled
            : styles.btnOutline
        }
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

function formatTripDate(trip) {
  const formatDate = (value) => {
    if (!value) return null;

    if (value?.toDate) {
      return value.toDate().toLocaleDateString(
        "en-MY",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    }

    if (value instanceof Date) {
      return value.toLocaleDateString(
        "en-MY",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    }

    if (typeof value === "string") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(
          "en-MY",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
        );
      }
    }

    return null;
  };

  const start =
    formatDate(trip?.startDate);

  const end =
    formatDate(trip?.endDate);

  if (start && end) {
    return start === end
      ? start
      : `${start} - ${end}`;
  }

  if (
    trip?.dateRange &&
    trip.dateRange !== "Date unavailable"
  ) {
    return trip.dateRange;
  }

  const completed =
    formatDate(trip?.completedAt);

  return (
    completed ||
    "Date unavailable"
  );
}

function SnapshotTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const point =
    payload[0]?.payload;

  if (!point) return null;

  return (
    <div
      style={styles.chartTooltip}
    >
      <div
        style={styles.tooltipTrip}
      >
        Trip {point.tripNumber}
      </div>

      <div
        style={styles.tooltipTitle}
      >
        {point.name ||
          point.title ||
          "Untitled Trip"}
      </div>

      <div
        style={styles.tooltipDate}
      >
        {formatTripDate(point)}
      </div>

      <div
        style={styles.tooltipScore}
      >
        Eco Score:{" "}
        <strong>
          {point.score}
        </strong>
      </div>
    </div>
  );
}

export default function CommunityPage({
  onNavigate,
}) {
  const {
    authUser,
    profile,
    loading,
  } = useCurrentUser();

  const [chats, setChats] =
    useState([]);

  const [achievements, setAchievements] =
    useState([]);

  const [travelHistory, setTravelHistory] =
    useState([]);

  // ============================================================
  // CHAT LISTENER
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      return undefined;
    }

    const unsubscribe =
      listenToUserChats(
        authUser.uid,
        setChats
      );

    return unsubscribe;
  }, [authUser?.uid]);

  // ============================================================
  // ADMIN ACHIEVEMENTS
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
  // USER TRAVEL HISTORY
  // ============================================================
  //
  // NEW STRUCTURE:
  //
  // travelHistory/{itineraryId}
  //
  // We query only the current user's documents.
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      return undefined;
    }

    const travelHistoryRef =
      collection(
        db,
        "travelHistory"
      );

    const travelHistoryQuery =
      query(
        travelHistoryRef,
        where(
          "userId",
          "==",
          authUser.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        travelHistoryQuery,
        (snapshot) => {
          const trips =
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            );

          console.log(
            "Community travel history:",
            trips
          );

          setTravelHistory(
            trips
          );
        },
        (error) => {
          console.error(
            "Failed to listen to top-level travel history:",
            error
          );

          setTravelHistory([]);
        }
      );

    return () => {
      unsubscribe();
      setTravelHistory([]);
    };
  }, [authUser?.uid]);

  // ============================================================
  // UNREAD CHAT
  // ============================================================

  const hasUnreadChat =
    chats.some(
      (chat) =>
        (
          chat.unreadCounts?.[
            authUser?.uid
          ] || 0
        ) > 0
    );

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={
          styles.loadingPage
        }
      >
        <p
          style={{
            color: "#6b7280",
          }}
        >
          Loading...
        </p>
      </div>
    );
  }

  // ============================================================
  // LOGIN
  // ============================================================

  if (
    !authUser ||
    !profile
  ) {
    return (
      <div
        style={
          styles.loadingPage
        }
      >
        <p
          style={{
            color: "#6b7280",
            marginBottom: 16,
          }}
        >
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.(
              "/login"
            )
          }
          style={
            styles.loginRedirectBtn
          }
        >
          Go to Login
        </button>
      </div>
    );
  }

  // ============================================================
  // COMPLETED TRIPS
  // ============================================================
  //
  // Source of truth:
  // travelHistory
  //
  // A trip is completed when:
  //
  // status = "Completed"
  // OR status = "complete"
  // OR completed = true
  // OR isCompleted = true
  // ============================================================

  const completedHistory =
    [...travelHistory]
      .filter((trip) => {
        if (!trip) {
          return false;
        }

        const status =
          typeof trip.status === "string"
            ? trip.status.toLowerCase()
            : "";

        return (
          status === "completed" ||
          status === "complete" ||
          trip.completed === true ||
          trip.isCompleted === true
        );
      })
      .sort((a, b) => {
        const getTime = (
          trip
        ) => {
          const value =
            trip?.startDate ||
            trip?.completedAt ||
            trip?.createdAt ||
            trip?.date;

          if (
            value?.toMillis
          ) {
            return value.toMillis();
          }

          if (
            value?.toDate
          ) {
            return value
              .toDate()
              .getTime();
          }

          if (
            value instanceof Date
          ) {
            return value.getTime();
          }

          if (
            typeof value ===
            "string"
          ) {
            const parsed =
              new Date(
                value
              ).getTime();

            return Number.isNaN(
              parsed
            )
              ? 0
              : parsed;
          }

          return 0;
        };

        return (
          getTime(a) -
          getTime(b)
        );
      });

  // ============================================================
  // TOTAL COMPLETED TRIPS
  // ============================================================

  const totalTrips =
    completedHistory.length;

  // ============================================================
  // CUMULATIVE ECO SCORE
  // ============================================================
  //
  // Example:
  //
  // Trip 1 = 93
  // Trip 2 = 94
  //
  // Total = 187
  //
  // This is NOT limited to 100 because this is the
  // user's accumulated Eco Score.
  // ============================================================

  const cumulativeEcoScore =
    completedHistory.reduce(
      (total, trip) => {
        const score =
          Number(
            trip?.finalEcoScore ??
              trip?.ecoScore ??
              trip?.eco_score ??
              0
          );

        return (
          total +
          Math.max(
            0,
            Math.min(
              100,
              score
            )
          )
        );
      },
      0
    );

  // ============================================================
  // USER
  // ============================================================

  const user = {
    name: profile.name,

    // Header uses cumulative Eco Score.
    ecoScore:
      cumulativeEcoScore,

    profile_photo_url:
      profile.profile_photo_url ||
      "",
  };

  // ============================================================
  // USER PROGRESS
  // ============================================================

  const userProgress = {
    trips_completed:
      totalTrips,

    eco_score:
      cumulativeEcoScore,

    challenges_completed:
      Number(
        profile.challenges_completed ??
          0
      ),

    community_posts:
      Number(
        profile.community_posts ??
          0
      ),

    waste_reduced:
      Number(
        profile.waste_reduced ??
          0
      ),
  };

  // ============================================================
  // ACHIEVEMENT STATUS
  // ============================================================

  const achievementsWithStatus =
    achievements.map(
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
          userProgress[
            ruleType
          ] ?? 0;

        return {
          ...achievement,

          unlocked:
            progress >= target,

          progress,

          ruleTarget:
            target,

          ruleUnit:
            achievement.ruleUnit ||
            "",
        };
      }
    );

  // ============================================================
  // SORT ACHIEVEMENTS
  // ============================================================

  const sortedAchievements =
    [...achievementsWithStatus]
      .sort((a, b) => {
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
          a.createdAt?.toMillis?.() ||
          0;

        const dateB =
          b.createdAt?.toMillis?.() ||
          0;

        return (
          dateB - dateA
        );
      });

  // ============================================================
  // PROGRESS SNAPSHOT DATA
  // ============================================================
  //
  // Latest 4 completed trips.
  //
  // X-axis:
  // Trip date/date range
  //
  // Y-axis:
  // finalEcoScore
  // ============================================================

  const snapshotData =
    completedHistory
      .slice(-4)
      .map(
        (
          trip,
          index,
          window
        ) => {
          const tripNumber =
            completedHistory.length -
            window.length +
            index +
            1;

          const score =
            Math.max(
              0,
              Math.min(
                100,
                Number(
                  trip?.finalEcoScore ??
                    trip?.ecoScore ??
                    trip?.eco_score ??
                    0
                )
              )
            );

          return {
            ...trip,

            tripNumber,

            name:
              trip?.name ||
              trip?.title ||
              "Untitled Trip",

            score,

            dateLabel:
              formatTripDate(
                trip
              ),
          };
        }
      );

  // ============================================================
  // ECO SCORE LEVEL
  // ============================================================
  //
  // Cumulative score:
  //
  // Level 1: 0 - 499
  // Level 2: 500 - 1499
  // Level 3: 1500 - 2999
  // Level 4: 3000 - 4999
  // Level 5: 5000+
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

  const currentLevel =
    [...ECO_LEVELS]
      .reverse()
      .find(
        (item) =>
          cumulativeEcoScore >=
          item.min
      ) ||
    ECO_LEVELS[0];

  const nextLevel =
    ECO_LEVELS.find(
      (item) =>
        item.level ===
        currentLevel.level +
          1
    ) || null;

  const levelProgress =
    nextLevel
      ? Math.min(
          1,
          Math.max(
            0,
            (
              cumulativeEcoScore -
              currentLevel.min
            ) /
              (
                nextLevel.min -
                currentLevel.min
              )
          )
        )
      : 1;

  const levelText =
    nextLevel
      ? `Level ${currentLevel.level} • ${cumulativeEcoScore.toLocaleString()} / ${nextLevel.min.toLocaleString()} XP`
      : `Level ${currentLevel.level} • ${cumulativeEcoScore.toLocaleString()} XP • Max Level`;

  // ============================================================
  // TOP STAT CARDS
  // ============================================================
  //
  // Only:
  //
  // Eco Score
  // Global Rank
  // Trips Completed
  //
  // No Badges Earned card.
  // ============================================================

  const stats = [
    {
      label: "Eco Score",

      icon: Leaf,

      iconColor:
        "#22c55e",

      value:
        cumulativeEcoScore.toLocaleString(),

      sub:
        levelText,

      progress:
        levelProgress,
    },

    {
      label:
        "Global Rank",

      icon:
        TrendingUp,

      iconColor:
        "#3b82f6",

      value:
        "-",

      trendLabel:
        "Coming soon",

      trendDirection:
        "up",
    },

    {
      label:
        "Trips Completed",

      icon:
        Calendar,

      iconColor:
        "#7c3aed",

      value:
        String(
          totalTrips
        ),

      sub:
        totalTrips === 1
          ? "Completed journey"
          : "Completed journeys",
    },
  ];

  // ============================================================
  // ROUTES
  // ============================================================

  const routeFor = {
    "Travel History":
      "/community/history",

    Friends:
      "/community/friends",

    "Chat & Groups":
      "/community/chat",

    "Progress Tracker":
      "/community/progress",

    "Eco-Report Card":
      "/community/reports",

    "Challenge Team":
      "/community/challenges",
  };

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <Layout
      active="community"
      user={user}
      onNavigate={
        onNavigate
      }
    >
      <div
        style={
          styles.content
        }
      >
        {/* ====================================================
            PAGE HEADER
            ==================================================== */}

        <h1
          style={
            styles.pageTitle
          }
        >
          Eco Journey & Community
        </h1>

        <p
          style={
            styles.pageSubtitle
          }
        >
          Connect with fellow
          eco-travelers and track
          your impact
        </p>

        {/* ====================================================
            STATS
            ==================================================== */}

        <div
          style={
            styles.statGrid
          }
        >
          {stats.map(
            (stat) => (
              <StatCard
                key={
                  stat.label
                }
                {...stat}
              />
            )
          )}
        </div>

        {/* ====================================================
            PROGRESS SNAPSHOT
            ==================================================== */}

        <div
          style={{
            ...styles.card,
            marginTop: 24,
          }}
        >
          <div
            style={
              styles.featureHeader
            }
          >
            <BarChart2
              size={18}
              color="#22c55e"
            />

            <span
              style={
                styles.featureTitle
              }
            >
              Progress Snapshot
            </span>
          </div>

          <p
            style={
              styles.featureDesc
            }
          >
            Your final Eco Score
            across recent trips
          </p>

          <div
            style={{
              width: "100%",
              height: 300,
              marginTop: 8,
            }}
          >
            {snapshotData.length ===
            0 ? (
              <div
                style={
                  styles.snapshotEmpty
                }
              >
                <BarChart2
                  size={30}
                />

                <div>
                  No completed trips
                  yet.
                </div>

                <p>
                  Complete a trip to
                  see your Eco Score
                  trend here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    snapshotData
                  }
                  margin={{
                    top: 20,
                    right: 30,
                    left: 10,
                    bottom: 55,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  {/* Y AXIS */}
                  <YAxis
                    domain={[
                      0,
                      100,
                    ]}
                    ticks={[
                      0,
                      20,
                      40,
                      60,
                      80,
                      100,
                    ]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill:
                        "#6b7280",
                    }}
                    width={35}
                  />

                  {/* X AXIS */}
                  <XAxis
                    dataKey={
                      "dateLabel"
                    }
                    axisLine={{
                      stroke:
                        "#d1d5db",
                    }}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fontWeight: 600,
                      fill:
                        "#374151",
                    }}
                    angle={-20}
                    textAnchor="end"
                    height={65}
                  />

                  {/* TOOLTIP */}
                  <Tooltip
                    content={
                      <SnapshotTooltip />
                    }
                    cursor={{
                      stroke:
                        "#d1d5db",
                      strokeDasharray:
                        "4 4",
                    }}
                  />

                  {/* SCORE LINE */}
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{
                      r: 6,
                      fill:
                        "#22c55e",
                      stroke:
                        "#ffffff",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 8,
                    }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ====================================================
            FEATURE CARDS
            ==================================================== */}

        <div
          style={
            styles.featureGrid
          }
        >
          {FEATURE_CARDS.map(
            (f) => (
              <FeatureCard
                key={f.title}
                {...f}
                hasUnreadChat={
                  hasUnreadChat
                }
                onClick={() =>
                  onNavigate?.(
                    routeFor[
                      f.title
                    ]
                  )
                }
              />
            )
          )}
        </div>

        {/* ====================================================
            RECENT ACHIEVEMENTS
            ==================================================== */}

        <div
          style={{
            ...styles.card,
            marginTop: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={
              styles.achievementsHeader
            }
          >
            <span
              style={
                styles.featureTitle
              }
            >
              Recent Achievements
            </span>

            {sortedAchievements.length >
              0 && (
              <button
                type="button"
                style={
                  styles.viewMore
                }
                onClick={() =>
                  onNavigate?.(
                    "/community/achievements"
                  )
                }
              >
                View More

                <ChevronRight
                  size={16}
                />
              </button>
            )}
          </div>

          {sortedAchievements.length ===
          0 ? (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "35px 20px",
              }}
            >
              <div
                style={
                  styles.noAchievementIcon
                }
              >
                <Award
                  size={28}
                />
              </div>

              <div
                style={
                  styles.noAchievementTitle
                }
              >
                No achievements
                available yet
              </div>

              <div
                style={
                  styles.noAchievementText
                }
              >
                Check back later
                for new
                achievements.
              </div>
            </div>
          ) : (
            <div
              style={
                styles.achievementGrid
              }
            >
              {sortedAchievements
                .slice(0, 3)
                .map(
                  (
                    achievement
                  ) => (
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
      </div>
    </Layout>
  );
}

/* ================================================================
   STYLES
   ================================================================ */

const styles = {
  snapshotEmpty: {
    height: "100%",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
  },

  chartTooltip: {
    background:
      "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow:
      "0 8px 20px rgba(0, 0, 0, 0.10)",
    padding:
      "10px 12px",
    fontFamily:
      "Arial, sans-serif",
    width: 190,
    boxSizing:
      "border-box",
  },

  tooltipTrip: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 3,
  },

  tooltipTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    lineHeight: 1.35,
    marginBottom: 3,
  },

  tooltipDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 5,
  },

  tooltipScore: {
    fontSize: 11.5,
    color: "#22a55a",
    fontWeight: 500,
  },

  loadingPage: {
    minHeight:
      "100vh",
    display: "flex",
    flexDirection:
      "column",
    alignItems:
      "center",
    justifyContent:
      "center",
    background:
      "#f9fafb",
  },

  loginRedirectBtn: {
    background:
      "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding:
      "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },

  content: {
    padding:
      "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
  },

  pageSubtitle: {
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14.5,
  },

  statGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
  },

  card: {
    background:
      "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  },

  featureHeader: {
    display: "flex",
    alignItems:
      "center",
    gap: 8,
  },

  featureTitleRow: {
    display: "flex",
    alignItems:
      "center",
    gap: 7,
  },

  featureTitle: {
    fontWeight: 700,
    fontSize: 15.5,
  },

  unreadDot: {
    width: 8,
    height: 8,
    minWidth: 8,
    borderRadius:
      "50%",
    background:
      "#ef4444",
    display:
      "inline-block",
  },

  featureDesc: {
    color: "#6b7280",
    fontSize: 13.5,
    marginTop: 8,
    marginBottom: 16,
    minHeight: 36,
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
    marginTop: 24,
  },

  featureCard: {
    background:
      "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  },

  btnOutline: {
    width: "100%",
    padding:
      "9px 0",
    borderRadius: 8,
    border:
      "1px solid #d1d5db",
    background:
      "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  btnFilled: {
    width: "100%",
    padding:
      "9px 0",
    borderRadius: 8,
    border: "none",
    background:
      "#22c55e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  achievementsHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  viewMore: {
    display: "flex",
    alignItems:
      "center",
    gap: 4,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
    background:
      "transparent",
    border: "none",
    padding: 0,
  },

  achievementGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
    marginTop: 16,
  },

  noAchievementIcon: {
    width: 56,
    height: 56,
    margin:
      "0 auto 12px",
    borderRadius: 14,
    background:
      "#f3f4f6",
    color: "#9ca3af",
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
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