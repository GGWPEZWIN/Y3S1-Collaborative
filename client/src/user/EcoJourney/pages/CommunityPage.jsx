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
  Clock3,
  Trophy,
  Heart,
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
import AchievementCard from "../../../shared/components/achievementCard";

import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  listenToUserChats,
} from "../../../firebase/chatService";

import {
  listenToPublishedAchievements,
  getUserAchievementProgress,
  checkAndAwardAchievements,
  checkRegistrationAchievement,
  listenToUserAchievements,
} from "../../../firebase/achievementService";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

import {
  listenToFriends,
} from "../../../firebase/friendService";

/* ================================================================
   FEATURE CARDS
   ================================================================ */

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


/* ================================================================
   FEATURE CARD
   ================================================================ */

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
        type="button"
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


/* ================================================================
   DATE FORMATTER
   ================================================================ */

function formatDateValue(value) {
  if (!value) {
    return null;
  }

  if (value?.toDate) {
    return value
      .toDate()
      .toLocaleDateString(
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
    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
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
}


/* ================================================================
   TRIP DATE
   ================================================================ */

function formatTripDate(trip) {
  const start =
    formatDateValue(
      trip?.startDate
    );

  const end =
    formatDateValue(
      trip?.endDate
    );

  /*
    Prefer START DATE + END DATE.
  */

  if (start && end) {
    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  }

  /*
    Existing dateRange fallback.
  */

  if (
    trip?.dateRange &&
    trip.dateRange !==
      "Date unavailable"
  ) {
    return trip.dateRange;
  }

  /*
    completedAt fallback.
  */

  const completed =
    formatDateValue(
      trip?.completedAt
    );

  if (completed) {
    return completed;
  }

  /*
    createdAt fallback.
  */

  const created =
    formatDateValue(
      trip?.createdAt
    );

  return (
    created ||
    "Date unavailable"
  );
}


/* ================================================================
   SORT DATE
   ================================================================ */

function getTripTime(trip) {
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
      new Date(value).getTime();

    return Number.isNaN(
      parsed
    )
      ? 0
      : parsed;
  }

  return 0;
}


/* ================================================================
   SNAPSHOT TOOLTIP
   ================================================================ */

function SnapshotTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }

  const point =
    payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <div
      style={
        styles.chartTooltip
      }
    >
      <div
        style={
          styles.tooltipTrip
        }
      >
        Trip {point.tripNumber}
      </div>

      <div
        style={
          styles.tooltipTitle
        }
      >
        {point.name ||
          "Untitled Trip"}
      </div>

      <div
        style={
          styles.tooltipScore
        }
      >
        Eco Score:{" "}
        <strong>
          {point.score}
        </strong>
      </div>

      <div
        style={
          styles.tooltipDate
        }
      >
        Date:{" "}
        {point.dateLabel}
      </div>
    </div>
  );
}


/* ================================================================
   FRIEND ACTIVITY HELPERS
   ================================================================ */

function activityTime(value) {
  if (!value) return 0;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function relativeActivityTime(value) {
  const time = activityTime(value);
  if (!time) return "Recently";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateValue(value) || "Recently";
}

function activityDateRange(activity) {
  const start = formatDateValue(activity?.startDate);
  const end = formatDateValue(activity?.endDate);
  if (start && end) return start === end ? start : `${start} - ${end}`;
  return start || end || null;
}

function FriendActivityCard({ activities, friends, onNavigate, currentUid }) {
  const friendMap = new Map(
    (friends || []).map((friend) => [friend.uid, friend])
  );

  // IMPORTANT: the feed is a rolling window of the newest 5 activities.
  // Activities may be trips, achievements, or Eco Score level-ups.
  const visibleActivities = (activities || [])
    .map((activity) => ({
      ...activity,
      actorUid:
        activity?.actorUid ||
        activity?.userId ||
        activity?.uid ||
        "",
    }))
    .filter((activity) => friendMap.has(activity.actorUid))
    .sort(
      (a, b) =>
        activityTime(b.createdAt || b.updatedAt || b.awardedAt) -
        activityTime(a.createdAt || a.updatedAt || a.awardedAt)
    )
    .slice(0, 5);

  const [likeState, setLikeState] = useState({});

  // Likes are stored separately so synthesized/backfilled activities can be
  // liked even when the original communityActivities document did not exist.
  useEffect(() => {
    let cancelled = false;

    async function loadLikeState() {
      if (!currentUid || visibleActivities.length === 0) {
        if (!cancelled) setLikeState({});
        return;
      }

      const next = {};

      await Promise.all(
        visibleActivities.map(async (activity) => {
          if (!activity?.likeKey) return;

          try {
            const likesQuery = query(
              collection(db, "communityActivityLikes"),
              where("activityKey", "==", activity.likeKey)
            );

            const snapshot = await getDocs(likesQuery);
            const likedByCurrentUser = snapshot.docs.some(
              (likeDoc) => likeDoc.data()?.userId === currentUid
            );

            next[activity.likeKey] = {
              count: snapshot.size,
              liked: likedByCurrentUser,
            };
          } catch (error) {
            console.error(
              "Failed to load activity likes:",
              error
            );

            next[activity.likeKey] = {
              count: 0,
              liked: false,
            };
          }
        })
      );

      if (!cancelled) {
        setLikeState(next);
      }
    }

    loadLikeState();

    return () => {
      cancelled = true;
    };
  }, [
    currentUid,
    visibleActivities
      .map((activity) => activity.likeKey || activity.id)
      .join("|"),
  ]);

  const getActivityKind = (activity) => {
    const type = String(activity?.type || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (
      type === "level_up" ||
      type === "levelup" ||
      type === "eco_level_up" ||
      type === "eco_levelup"
    ) {
      return "level";
    }

    if (
      type === "achievement_unlocked" ||
      type === "achievement" ||
      type === "achievement_completed" ||
      type === "badge_unlocked"
    ) {
      return "achievement";
    }

    if (
      type === "trip_completed" ||
      type === "completed_trip" ||
      type === "trip_complete"
    ) {
      return "trip";
    }

    return type.includes("level") ? "level" : "achievement";
  };

  const handleLike = async (activity) => {
    if (!currentUid || !activity?.likeKey || !activity?.actorUid) return;

    const current =
      likeState[activity.likeKey] || {
        count: 0,
        liked: false,
      };

    const likeDocId = `${String(activity.likeKey).replace(/[^a-zA-Z0-9_-]/g, "_")}__${currentUid}`;
    const likeRef = doc(
      db,
      "communityActivityLikes",
      likeDocId
    );

    // Optimistic UI update.
    setLikeState((previous) => ({
      ...previous,
      [activity.likeKey]: {
        count: Math.max(
          0,
          current.count + (current.liked ? -1 : 1)
        ),
        liked: !current.liked,
      },
    }));

    try {
      if (current.liked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          activityKey: activity.likeKey,
          actorUid: activity.actorUid,
          userId: currentUid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(
        "Failed to update activity like:",
        error
      );

      // Revert optimistic state on failure.
      setLikeState((previous) => ({
        ...previous,
        [activity.likeKey]: current,
      }));
    }
  };

  return (
    <div style={{ ...styles.card, marginTop: 24 }}>
      <div style={styles.achievementsHeader}>
        <div style={styles.featureHeader}>
          <Users size={18} color="#3b82f6" />
          <span style={styles.featureTitle}>Friend Activity</span>
        </div>

        {friends.length > 0 && (
          <button
            type="button"
            style={styles.viewMore}
            onClick={() => onNavigate?.("/community/friends")}
          >
            View Friends
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <p style={styles.featureDesc}>
        See your friends' latest trips, achievements and Eco Score level-ups
      </p>

      {visibleActivities.length === 0 ? (
        <div style={styles.activityEmpty}>
          <Users size={28} />
          <div style={styles.noAchievementTitle}>
            No recent friend activity
          </div>
          <div style={styles.noAchievementText}>
            When your friends complete a trip, unlock an achievement or level up their Eco Score, it will show here.
          </div>
        </div>
      ) : (
        <div style={styles.activityList}>
          {visibleActivities.map((activity) => {
            const friend = friendMap.get(activity.actorUid);
            const name =
              friend?.name ||
              friend?.displayName ||
              activity.actorName ||
              "Friend";

            const photo =
              friend?.profile_photo_url ||
              friend?.profilePhotoUrl ||
              activity.actorPhotoUrl ||
              "";

            const kind = getActivityKind(activity);
            const isTrip = kind === "trip";
            const isLevel = kind === "level";

            const iconColor = isTrip
              ? "#7c3aed"
              : isLevel
              ? "#16a34a"
              : "#f59e0b";

            const ActivityIcon = isTrip
              ? Calendar
              : isLevel
              ? Leaf
              : Trophy;

            const actionText = isTrip
              ? "completed a trip"
              : isLevel
              ? "levelled up their Eco Score"
              : "unlocked an achievement";

            const title = isTrip
              ? activity.tripName ||
                activity.tripTitle ||
                activity.name ||
                "Untitled Trip"
              : isLevel
              ? `Level ${Number(
                  activity.level ??
                    activity.newLevel ??
                    activity.currentLevel ??
                    0
                ) || "Up"}`
              : activity.achievementTitle ||
                activity.title ||
                "Achievement";

            const currentLevel =
              Number(
                activity.level ??
                  activity.newLevel ??
                  activity.currentLevel ??
                  0
              ) || 0;

            const levelScore =
              Number(
                activity.ecoScore ??
                  activity.cumulativeEcoScore ??
                  activity.score ??
                  0
              ) || 0;

            const likeKey =
              activity.likeKey ||
              activity.id ||
              `${activity.actorUid}_${activity.createdAt || title}`;

            const currentLikes =
              likeState[likeKey] || {
                count: 0,
                liked: false,
              };

            return (
              <div key={activity.id || likeKey} style={styles.activityItem}>
                <div style={styles.activityAvatar}>
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      style={styles.activityAvatarImage}
                    />
                  ) : (
                    <span>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={styles.activityBody}>
                  <div style={styles.activityTextRow}>
                    <strong style={styles.activityName}>
                      {name}
                    </strong>
                    <span style={styles.activityAction}>
                      {actionText}
                    </span>
                  </div>

                  <div style={styles.activityTitleRow}>
                    <ActivityIcon
                      size={15}
                      color={iconColor}
                    />
                    <span style={styles.activityTitle}>
                      {title}
                    </span>
                  </div>

                  {isTrip && (
                    <div style={styles.activityMeta}>
                      <span>
                        Eco Score:{" "}
                        <strong>
                          {Number(
                            activity.ecoScore ?? 0
                          )}
                        </strong>
                      </span>

                      {activityDateRange(activity) && (
                        <span>
                          {activityDateRange(activity)}
                        </span>
                      )}
                    </div>
                  )}

                  {isLevel && (
                    <div style={styles.activityMeta}>
                      <span>
                        Level{" "}
                        <strong>
                          {currentLevel || "Up"}
                        </strong>
                      </span>

                      {levelScore > 0 && (
                        <span>
                          Eco Score:{" "}
                          <strong>{levelScore}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {!isTrip &&
                    !isLevel &&
                    Number(activity.points || 0) > 0 && (
                      <div style={styles.activityMeta}>
                        <span>
                          +
                          {Number(
                            activity.points
                          )}{" "}
                          XP
                        </span>
                      </div>
                    )}
                </div>

                <div style={styles.activityActions}>
                  <button
                    type="button"
                    aria-label={
                      currentLikes.liked
                        ? "Unlike activity"
                        : "Like activity"
                    }
                    title={
                      currentLikes.liked
                        ? "Unlike"
                        : "Like"
                    }
                    style={{
                      ...styles.likeButton,
                      color: currentLikes.liked
                        ? "#ef4444"
                        : "#9ca3af",
                    }}
                    onClick={() =>
                      handleLike({
                        ...activity,
                        likeKey,
                      })
                    }
                  >
                    <Heart
                      size={17}
                      fill={
                        currentLikes.liked
                          ? "currentColor"
                          : "none"
                      }
                    />
                    <span>
                      {currentLikes.count}
                    </span>
                  </button>

                  <div style={styles.activityTime}>
                    <Clock3 size={13} />
                    {relativeActivityTime(
                      activity.createdAt ||
                        activity.updatedAt ||
                        activity.awardedAt
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ================================================================
   COMMUNITY PAGE
   ================================================================ */

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

  const [
    achievements,
    setAchievements,
  ] = useState([]);

  const [achievementProgress, setAchievementProgress] =
    useState({
      itinerary_saved: 0,
      itineraries_completed: 0,
      trips_completed: 0,
      eco_score: 0,
    });

  const [
    travelHistory,
    setTravelHistory,
  ] = useState([]);

  const [friends, setFriends] = useState([]);
  const [friendActivities, setFriendActivities] = useState([]);
  const [userAchievementRecords, setUserAchievementRecords] = useState([]);

  // LIVE count of saved itineraries.
  // This is separate from achievementProgress because the user can
  // save an itinerary while this Community page is already open.
  const [savedItineraryCount, setSavedItineraryCount] = useState(0);


  /* ==============================================================
     CHAT LISTENER
     ============================================================== */

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
  }, [
    authUser?.uid,
  ]);


  /* ==============================================================
     ACHIEVEMENT LISTENER
     ============================================================== */

  useEffect(() => {
    const unsubscribe =
      listenToPublishedAchievements(
        async (list) => {
          setAchievements(list || []);

          if (!authUser?.uid || !Array.isArray(list)) {
            return;
          }

          try {
            await checkAndAwardAchievements(
              authUser.uid,
              list
            );
          } catch (error) {
            console.error(
              "Failed to check and award Community achievements:",
              error
            );
          }
        }
      );

    return unsubscribe;
  }, [authUser?.uid]);

  /* --------------------------------------------------------------
     USER ACHIEVEMENT RECORDS
     -------------------------------------------------------------- */

  useEffect(() => {
    if (!authUser?.uid) {
      setUserAchievementRecords([]);
      return undefined;
    }

    return listenToUserAchievements(
      authUser.uid,
      (records) => setUserAchievementRecords(records || [])
    );
  }, [authUser?.uid]);

  // Backfill the one-time registration achievement for an existing
  // traveler who registered before the achievement system was added.
  useEffect(() => {
    if (!authUser?.uid) return undefined;

    checkRegistrationAchievement(authUser.uid).catch(
      (error) => {
        console.error(
          "Failed to check registration achievement:",
          error
        );
      }
    );

    return undefined;
  }, [authUser?.uid]);


  /* ==============================================================
     TOP-LEVEL TRAVEL HISTORY
     ============================================================== */

  useEffect(() => {
    if (!authUser?.uid) {
      return undefined;
    }

    /*
      NEW FIRESTORE STRUCTURE:

      travelHistory/{itineraryId}
    */

    const travelHistoryRef =
      collection(
        db,
        "travelHistory"
      );

    /*
      IMPORTANT:

      Firestore rules require
      the document userId to
      equal the logged-in user.
    */

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
            "Community Travel History:",
            trips
          );

          setTravelHistory(
            trips
          );
        },
        (error) => {
          console.error(
            "Failed to load travel history:",
            error
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    authUser?.uid,
  ]);


  /* ==============================================================
     FRIEND LISTENER
     ============================================================== */

  useEffect(() => {
    if (!authUser?.uid) {
      setFriends([]);
      return undefined;
    }

    const unsubscribe = listenToFriends(
      authUser.uid,
      (list) => setFriends(list || [])
    );

    return unsubscribe;
  }, [authUser?.uid]);


  /* ==============================================================
     FRIEND ACTIVITY FEED
     ============================================================== */

  useEffect(() => {
    if (!authUser?.uid) {
      setFriendActivities([]);
      return undefined;
    }

    const friendIds = Array.from(
      new Set(
        (friends || [])
          .map((friend) => friend?.uid)
          .filter(
            (uid) => uid && uid !== authUser.uid
          )
      )
    );

    if (friendIds.length === 0) {
      setFriendActivities([]);
      return undefined;
    }

    // ----------------------------------------------------------------
    // We intentionally build the feed from the friends' real data rather
    // than requiring a pre-created communityActivities document.
    // This means a friend's recently completed trips (including trips that
    // happened before this feed was added) can appear immediately.
    // ----------------------------------------------------------------

    const activityMap = new Map();
    const unsubscribeFunctions = [];

    const isCompletedTrip = (trip) => {
      const status = String(trip?.status || "")
        .trim()
        .toLowerCase();

      return (
        status === "completed" ||
        status === "complete" ||
        trip?.completed === true ||
        trip?.isCompleted === true
      );
    };

    const getTripScore = (trip) =>
      Math.max(
        0,
        Math.min(
          100,
          Number(
            trip?.finalEcoScore ??
              trip?.ecoScore ??
              trip?.eco_score ??
              0
          ) || 0
        )
      );

    const buildTripActivities = (tripDocs) => {
      return tripDocs
        .filter(isCompletedTrip)
        .sort(
          (a, b) =>
            getTripTime(a) - getTripTime(b)
        );
    };

    const publishActivities = () => {
      const sorted = Array.from(
        activityMap.values()
      ).sort(
        (a, b) =>
          activityTime(
            b.createdAt ||
              b.updatedAt ||
              b.awardedAt
          ) -
          activityTime(
            a.createdAt ||
              a.updatedAt ||
              a.awardedAt
          )
      );

      // The UI deliberately receives only the newest five mixed activities.
      setFriendActivities(sorted.slice(0, 5));
    };

    // ----------------------------------------------------------------
    // FRIEND TRAVEL HISTORY
    // Supports up to 30 friend IDs per Firestore `in` query.
    // ----------------------------------------------------------------
    for (let i = 0; i < friendIds.length; i += 30) {
      const chunk = friendIds.slice(i, i + 30);

      const historyQuery = query(
        collection(db, "travelHistory"),
        where("userId", "in", chunk)
      );

      const unsubscribe = onSnapshot(
        historyQuery,
        (snapshot) => {
          // Remove old synthesized trip/level activity for this chunk.
          chunk.forEach((friendUid) => {
            Array.from(activityMap.keys()).forEach((key) => {
              if (String(key).startsWith(`trip:${friendUid}:`)) {
                activityMap.delete(key);
              }
              if (String(key).startsWith(`level:${friendUid}:`)) {
                activityMap.delete(key);
              }
            });
          });

          const grouped = new Map(
            chunk.map((friendUid) => [friendUid, []])
          );

          snapshot.docs.forEach((docSnap) => {
            const trip = {
              id: docSnap.id,
              ...docSnap.data(),
            };

            if (grouped.has(trip.userId)) {
              grouped.get(trip.userId).push(trip);
            }
          });

          grouped.forEach(
            (allTrips, friendUid) => {
              const completedTrips =
                buildTripActivities(allTrips);

              completedTrips.forEach((trip) => {
                const activityKey =
                  `trip:${friendUid}:${trip.id}`;

                const completedAt =
                  trip.completedAt ||
                  trip.updatedAt ||
                  trip.createdAt ||
                  trip.endDate ||
                  trip.startDate;

                activityMap.set(
                  activityKey,
                  {
                    id: activityKey,
                    likeKey: activityKey,
                    type: "trip_completed",
                    actorUid: friendUid,
                    actorName: trip.userName || "",
                    actorPhotoUrl: trip.userPhotoUrl || "",
                    tripName:
                      trip.tripName ||
                      trip.tripTitle ||
                      trip.name ||
                      trip.title ||
                      "Untitled Trip",
                    tripTitle:
                      trip.tripTitle ||
                      trip.title ||
                      trip.name ||
                      "Untitled Trip",
                    ecoScore: getTripScore(trip),
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    completedAt,
                    createdAt: completedAt,
                    updatedAt: trip.updatedAt,
                  }
                );
              });

              // Compute level-up milestones from the friend's cumulative
              // completed-trip Eco Score. A level-up is emitted only when the
              // cumulative score crosses the beginning of the next level.
              const levels = [
                { level: 1, min: 0 },
                { level: 2, min: 500 },
                { level: 3, min: 1500 },
                { level: 4, min: 3000 },
                { level: 5, min: 5000 },
              ];

              let cumulative = 0;
              let previousLevel = 1;

              completedTrips.forEach((trip, index) => {
                cumulative += getTripScore(trip);

                const currentLevel =
                  [...levels]
                    .reverse()
                    .find(
                      (level) =>
                        cumulative >= level.min
                    )?.level || 1;

                if (currentLevel > previousLevel) {
                  const reached = levels.find(
                    (level) =>
                      level.level === currentLevel
                  );

                  const levelKey =
                    `level:${friendUid}:${currentLevel}`;

                  activityMap.set(
                    levelKey,
                    {
                      id: levelKey,
                      likeKey: levelKey,
                      type: "level_up",
                      actorUid: friendUid,
                      level: currentLevel,
                      newLevel: currentLevel,
                      currentLevel,
                      cumulativeEcoScore: cumulative,
                      ecoScore: cumulative,
                      createdAt:
                        trip.completedAt ||
                        trip.updatedAt ||
                        trip.createdAt,
                      updatedAt:
                        trip.updatedAt,
                      milestoneXp:
                        reached?.min || 0,
                    }
                  );
                }

                previousLevel = currentLevel;
              });
            }
          );

          publishActivities();
        },
        (error) => {
          console.error(
            "Failed to load friend travel history:",
            error
          );
        }
      );

      unsubscribeFunctions.push(unsubscribe);
    }

    // ----------------------------------------------------------------
    // FRIEND ACHIEVEMENTS
    // ----------------------------------------------------------------
    friendIds.forEach((friendUid) => {
      const achievementsRef = collection(
        db,
        "users",
        friendUid,
        "achievements"
      );

      const unsubscribe = onSnapshot(
        achievementsRef,
        (snapshot) => {
          // Remove this friend's synthesized achievement activities first.
          Array.from(activityMap.keys()).forEach((key) => {
            if (
              String(key).startsWith(
                `achievement:${friendUid}:`
              )
            ) {
              activityMap.delete(key);
            }
          });

          snapshot.docs.forEach((docSnap) => {
            const achievement = {
              id: docSnap.id,
              ...docSnap.data(),
            };

            const awardedAt =
              achievement.awardedAt ||
              achievement.unlockedAt ||
              achievement.createdAt ||
              achievement.updatedAt;

            const activityKey =
              `achievement:${friendUid}:${achievement.id}`;

            activityMap.set(
              activityKey,
              {
                id: activityKey,
                likeKey: activityKey,
                type: "achievement_unlocked",
                actorUid: friendUid,
                achievementId:
                  achievement.achievementId ||
                  achievement.id,
                achievementTitle:
                  achievement.title ||
                  achievement.name ||
                  achievement.achievementTitle ||
                  "Achievement",
                title:
                  achievement.title ||
                  achievement.name ||
                  achievement.achievementTitle ||
                  "Achievement",
                points: Number(
                  achievement.points || 0
                ),
                createdAt: awardedAt,
                awardedAt,
                updatedAt: achievement.updatedAt,
              }
            );
          });

          publishActivities();
        },
        (error) => {
          console.error(
            "Failed to load friend achievements:",
            error
          );
        }
      );

      unsubscribeFunctions.push(unsubscribe);
    });

    // Also keep using any real communityActivities documents that may exist.
    // They are not required for backfill, but this preserves any richer
    // activity records already created by the app.
    for (let i = 0; i < friendIds.length; i += 30) {
      const chunk = friendIds.slice(i, i + 30);

      const activityQuery = query(
        collection(db, "communityActivities"),
        where("actorUid", "in", chunk)
      );

      const unsubscribe = onSnapshot(
        activityQuery,
        (snapshot) => {
          snapshot.docs.forEach((docSnap) => {
            const activity = {
              id: docSnap.id,
              likeKey: `activity:${docSnap.id}`,
              ...docSnap.data(),
            };

            // Real activity records should win over synthesized duplicates.
            const actorUid = activity.actorUid;
            const rawType = String(
              activity.type || ""
            ).toLowerCase();

            let key = activity.id;

            if (
              rawType === "trip_completed" &&
              activity.itineraryId
            ) {
              key = `trip:${actorUid}:${activity.itineraryId}`;
            }

            if (
              (rawType === "achievement_unlocked" ||
                rawType === "achievement") &&
              (activity.achievementId ||
                activity.userAchievementId)
            ) {
              key = `achievement:${actorUid}:${
                activity.achievementId ||
                activity.userAchievementId
              }`;
            }

            activityMap.set(
              key,
              {
                ...activity,
                likeKey: `activity:${docSnap.id}`,
              }
            );
          });

          publishActivities();
        },
        (error) => {
          console.error(
            "Failed to load stored community activities:",
            error
          );
        }
      );

      unsubscribeFunctions.push(unsubscribe);
    }

    return () => {
      unsubscribeFunctions.forEach(
        (unsubscribe) => unsubscribe?.()
      );
    };
  }, [
    authUser?.uid,
    friends
      .map((friend) => friend?.uid)
      .filter(Boolean)
      .sort()
      .join(","),
  ]);

  /* ==============================================================
     UNREAD CHAT
     ============================================================== */

  const hasUnreadChat =
    chats.some(
      (chat) =>
        (
          chat.unreadCounts?.[
            authUser?.uid
          ] || 0
        ) > 0
    );


  // Keep achievement counters in sync with the central achievement service.
  useEffect(() => {
    let cancelled = false;

    if (!authUser?.uid) {
      setAchievementProgress({
        itinerary_saved: 0,
        itineraries_completed: 0,
        trips_completed: 0,
        eco_score: 0,
      });
      return undefined;
    }

    getUserAchievementProgress(authUser.uid)
      .then((progress) => {
        if (!cancelled) {
          setAchievementProgress(progress || {});
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load achievement progress:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authUser?.uid]);

  // LIVE saved-itinerary counter.
  // The old getUserAchievementProgress() is only fetched when the UID
  // changes, so it can stay at 0 after the user saves an itinerary.
  // Listen directly to the top-level itineraries collection instead.
  useEffect(() => {
    if (!authUser?.uid) {
      setSavedItineraryCount(0);
      return undefined;
    }

    const savedItineraryQuery = query(
      collection(db, "itineraries"),
      where("userId", "==", authUser.uid)
    );

    const unsubscribe = onSnapshot(
      savedItineraryQuery,
      (snapshot) => {
        setSavedItineraryCount(snapshot.size);
      },
      (error) => {
        console.error(
          "Failed to listen to saved itinerary count:",
          error
        );
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);



  /* ==============================================================
     LOADING
     ============================================================== */

  if (loading) {
    return (
      <div
        style={
          styles.loadingPage
        }
      >
        <p
          style={{
            color:
              "#6b7280",
          }}
        >
          Loading...
        </p>
      </div>
    );
  }


  /* ==============================================================
     LOGIN CHECK
     ============================================================== */

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
            color:
              "#6b7280",
            marginBottom:
              16,
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


  /* ==============================================================
     COMPLETED HISTORY
     ============================================================== */

  const completedHistory =
    [...travelHistory]
      .filter(
        (trip) => {
          if (!trip) {
            return false;
          }

          const status =
            typeof trip.status ===
            "string"
              ? trip.status.toLowerCase()
              : "";

          /*
            Support both:
            status = Completed
            status = completed
            completed = true
            isCompleted = true
          */

          return (
            status ===
              "completed" ||
            status ===
              "complete" ||
            trip.completed ===
              true ||
            trip.isCompleted ===
              true
          );
        }
      )
      .sort(
        (a, b) =>
          getTripTime(a) -
          getTripTime(b)
      );


  /* ==============================================================
     TOTAL TRIPS
     ============================================================== */

  const totalTrips =
    completedHistory.length;


  /* ==============================================================
     CUMULATIVE ECO SCORE
     ============================================================== */

  /*
    Example:

    Trip 1 = 93
    Trip 2 = 94
    Trip 3 = 88

    Cumulative:
    93 + 94 + 88 = 275

    This number is allowed
    to exceed 100 because it
    represents accumulated XP.
  */

  const cumulativeEcoScore =
    completedHistory.reduce(
      (
        total,
        trip
      ) => {
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




  /* ==============================================================
     USER PROGRESS
     ============================================================== */

  const userProgress = {
    // Use the live Firestore count so First Itinerary updates immediately
    // after saving an itinerary, even when this page was already open.
    itinerary_saved:
      Number(savedItineraryCount),

    itineraries_completed:
      Number(
        achievementProgress.itineraries_completed ??
          0
      ),

    trips_completed:
      Number(
        achievementProgress.trips_completed ??
          totalTrips
      ),

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


  /* ==============================================================
     USER HEADER
     ============================================================== */

  const user = {
    name:
      profile.name,

    ecoScore:
      cumulativeEcoScore,

    profile_photo_url:
      profile.profile_photo_url ||
      "",
  };


  /* ==============================================================
     ACHIEVEMENT STATUS
     ============================================================== */

  const awardedAchievementIds =
    new Set(
      userAchievementRecords.map(
        (record) =>
          record?.achievementId ||
          record?.id
      )
    );

  const achievementsWithStatus =
    achievements.map(
      (
        achievement
      ) => {
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
            awardedAchievementIds.has(
              achievement.id
            ) ||
            progress >=
            target,

          progress,

          ruleTarget:
            target,

          ruleUnit:
            achievement.ruleUnit ||
            "",
        };
      }
    );


  /* ==============================================================
     SORT ACHIEVEMENTS
     ============================================================== */

  const sortedAchievements =
    [...achievementsWithStatus]
      .sort(
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
            a.createdAt?.toMillis?.() ||
            0;

          const dateB =
            b.createdAt?.toMillis?.() ||
            0;

          return (
            dateB -
            dateA
          );
        }
      );


  /* ==============================================================
     SNAPSHOT DATA
     ============================================================== */

  /*
    ALWAYS SHOW MAXIMUM 4.

    1 trip:
      T1

    2 trips:
      T1 T2

    3 trips:
      T1 T2 T3

    4 trips:
      T1 T2 T3 T4

    5 trips:
      T2 T3 T4 T5

    6 trips:
      T3 T4 T5 T6
  */

  const snapshotData =
    completedHistory
      .slice(-4)
      .map(
        (
          trip,
          index
        ) => {
          const firstDisplayedTrip =
            Math.max(
              1,
              completedHistory.length -
                4 +
                1
            );

          const tripNumber =
            firstDisplayedTrip +
            index;

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

            /*
              X-axis MUST be T1/T2/T3/T4.
            */

            nameLabel:
              `T${tripNumber}`,

            score,

            /*
              Used only by
              hover tooltip.
            */

            dateLabel:
              formatTripDate(
                trip
              ),
          };
        }
      );


  /* ==============================================================
     ECO LEVELS
     ============================================================== */

  /*
    CUMULATIVE SCORE LEVELS

    Level 1 = 0 - 499
    Level 2 = 500 - 1499
    Level 3 = 1500 - 2999
    Level 4 = 3000 - 4999
    Level 5 = 5000+
  */

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
        (level) =>
          cumulativeEcoScore >=
          level.min
      ) ||
    ECO_LEVELS[0];


  const nextLevel =
    ECO_LEVELS.find(
      (level) =>
        level.level ===
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


  /* ==============================================================
     TOP STAT CARDS
     ============================================================== */

  const stats = [
    {
      label:
        "Eco Score",

      icon:
        Leaf,

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


  /* ==============================================================
     ROUTES
     ============================================================== */

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


  /* ==============================================================
     RENDER
     ============================================================== */

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

        {/* ======================================================
            PAGE HEADER
            ====================================================== */}

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


        {/* ======================================================
            TOP STATS
            ====================================================== */}

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


        {/* ======================================================
            PROGRESS SNAPSHOT
            ====================================================== */}

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
              size={20}
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
            Your Eco Score trend
            across recent trips
          </p>


          <div
            style={{
              width: "100%",
              height: 290,
              marginTop: 4,
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
                  size={32}
                />

                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 600,
                  }}
                >
                  No completed trips yet.
                </div>

                <p
                  style={{
                    marginTop: 5,
                  }}
                >
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
                    top: 25,
                    right: 20,
                    left: 5,
                    bottom: 25,
                  }}
                >

                  {/* =================================================
                      GRID
                      ================================================= */}

                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                  />


                  {/* =================================================
                      Y AXIS
                      20 / 40 / 60 / 80 / 100
                      ================================================= */}

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

                    axisLine={{
                      stroke:
                        "#9ca3af",
                    }}

                    tickLine={{
                      stroke:
                        "#9ca3af",
                    }}

                    tick={{
                      fontSize: 12,
                      fill:
                        "#6b7280",
                      fontWeight: 500,
                    }}

                    width={38}
                  />


                  {/* =================================================
                      X AXIS
                      T1 / T2 / T3 / T4
                      ================================================= */}

                  <XAxis
                    dataKey={
                      "nameLabel"
                    }

                    axisLine={{
                      stroke:
                        "#111827",
                      strokeWidth:
                        1,
                    }}

                    tickLine={{
                      stroke:
                        "#111827",
                    }}

                    tick={{
                      fontSize: 14,
                      fontWeight: 700,
                      fill:
                        "#111827",
                    }}

                    height={35}

                    padding={{
                      left: 0,
                      right: 0,
                    }}
                  />


                  {/* =================================================
                      HOVER
                      ================================================= */}

                  <Tooltip
                    content={
                      <SnapshotTooltip />
                    }

                    cursor={{
                      stroke:
                        "#9ca3af",
                      strokeWidth:
                        1,
                    }}
                  />


                  {/* =================================================
                      GREEN LINE
                      ================================================= */}

                  <Line
                    type="monotone"

                    dataKey="score"

                    stroke="#22c55e"

                    strokeWidth={2.5}

                    dot={{
                      r: 6,

                      fill:
                        "#22c55e",

                      stroke:
                        "#22c55e",

                      strokeWidth:
                        1,
                    }}

                    activeDot={{
                      r: 8,

                      fill:
                        "#22c55e",

                      stroke:
                        "#ffffff",

                      strokeWidth:
                        2,
                    }}

                    connectNulls
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>


        {/* ======================================================
            FEATURE CARDS
            ====================================================== */}

        <div
          style={
            styles.featureGrid
          }
        >

          {FEATURE_CARDS.map(
            (feature) => (

              <FeatureCard
                key={
                  feature.title
                }

                {...feature}

                hasUnreadChat={
                  hasUnreadChat
                }

                onClick={() =>
                  onNavigate?.(
                    routeFor[
                      feature.title
                    ]
                  )
                }
              />

            )
          )}

        </div>


        {/* ======================================================
            RECENT ACHIEVEMENTS
            ====================================================== */}

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
                for new achievements.
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


        {/* ======================================================
            FRIEND ACTIVITY FEED
            ====================================================== */}

        <FriendActivityCard
          activities={friendActivities}
          friends={friends}
          currentUid={authUser?.uid}
          onNavigate={onNavigate}
        />

      </div>

    </Layout>
  );
}


/* ================================================================
   STYLES
   ================================================================ */

const styles = {

  loadingPage: {
    minHeight:
      "100vh",

    display:
      "flex",

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

    color:
      "#fff",

    border:
      "none",

    borderRadius:
      10,

    padding:
      "10px 20px",

    fontWeight:
      600,

    cursor:
      "pointer",
  },


  content: {
    padding:
      "28px 32px",

    maxWidth:
      1180,

    width:
      "100%",

    margin:
      "0 auto",

    boxSizing:
      "border-box",
  },


  pageTitle: {
    fontSize:
      28,

    fontWeight:
      800,

    margin:
      0,
  },


  pageSubtitle: {
    color:
      "#6b7280",

    marginTop:
      6,

    marginBottom:
      24,

    fontSize:
      14.5,
  },


  /* ==============================================================
     TOP 3 CARDS
     ============================================================== */

  statGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",

    gap:
      16,
  },


  /* ==============================================================
     GENERAL CARD
     ============================================================== */

  card: {
    background:
      "#ffffff",

    border:
      "1px solid #e5e7eb",

    borderRadius:
      14,

    padding:
      20,

    boxSizing:
      "border-box",
  },


  /* ==============================================================
     FEATURE HEADER
     ============================================================== */

  featureHeader: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      8,
  },


  featureTitleRow: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      7,
  },


  featureTitle: {
    fontWeight:
      700,

    fontSize:
      16,
  },


  featureDesc: {
    color:
      "#6b7280",

    fontSize:
      13.5,

    marginTop:
      8,

    marginBottom:
      12,
  },


  /* ==============================================================
     FRIEND ACTIVITY
     ============================================================== */

  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    marginTop: 8,
  },

  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 0",
    borderTop: "1px solid #f0f1f3",
  },

  activityAvatar: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: "50%",
    background: "#ecfdf5",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    overflow: "hidden",
  },

  activityAvatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  activityBody: {
    minWidth: 0,
    flex: 1,
  },

  activityTextRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 5,
    flexWrap: "wrap",
  },

  activityName: {
    fontSize: 14,
    color: "#111827",
  },

  activityAction: {
    fontSize: 13.5,
    color: "#6b7280",
  },

  activityTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  activityTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  activityMeta: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
    color: "#6b7280",
    fontSize: 12.5,
  },

  activityActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    alignSelf: "stretch",
    minWidth: 58,
  },

  likeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    border: "none",
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  activityTime: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#9ca3af",
    fontSize: 11.5,
    whiteSpace: "nowrap",
    alignSelf: "flex-start",
    marginTop: 2,
  },

  activityEmpty: {
    textAlign: "center",
    padding: "28px 20px 18px",
    color: "#9ca3af",
  },

  /* ==============================================================
     FEATURE GRID
     ============================================================== */

  featureGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",

    gap:
      16,

    marginTop:
      24,
  },


  featureCard: {
    background:
      "#ffffff",

    border:
      "1px solid #e5e7eb",

    borderRadius:
      14,

    padding:
      20,

    boxSizing:
      "border-box",
  },


  /* ==============================================================
     BUTTONS
     ============================================================== */

  btnOutline: {
    width:
      "100%",

    padding:
      "9px 0",

    borderRadius:
      8,

    border:
      "1px solid #d1d5db",

    background:
      "#ffffff",

    fontSize:
      14,

    fontWeight:
      600,

    cursor:
      "pointer",
  },


  btnFilled: {
    width:
      "100%",

    padding:
      "9px 0",

    borderRadius:
      8,

    border:
      "none",

    background:
      "#22c55e",

    color:
      "#ffffff",

    fontSize:
      14,

    fontWeight:
      600,

    cursor:
      "pointer",
  },


  /* ==============================================================
     CHAT NOTIFICATION
     ============================================================== */

  unreadDot: {
    width:
      8,

    height:
      8,

    minWidth:
      8,

    borderRadius:
      "50%",

    background:
      "#ef4444",

    display:
      "inline-block",
  },


  /* ==============================================================
     EMPTY CHART
     ============================================================== */

  snapshotEmpty: {
    height:
      "100%",

    display:
      "flex",

    flexDirection:
      "column",

    alignItems:
      "center",

    justifyContent:
      "center",

    color:
      "#9ca3af",

    fontSize:
      14,

    textAlign:
      "center",
  },


  /* ==============================================================
     TOOLTIP
     ============================================================== */

  chartTooltip: {
    background:
      "#ffffff",

    border:
      "1px solid #e5e7eb",

    borderRadius:
      5,

    boxShadow:
      "0 4px 12px rgba(0, 0, 0, 0.10)",

    padding:
      "10px 12px",

    minWidth:
      160,

    maxWidth:
      220,

    boxSizing:
      "border-box",
  },


  tooltipTrip: {
    fontSize:
      12,

    fontWeight:
      700,

    color:
      "#111827",

    marginBottom:
      4,
  },


  tooltipTitle: {
    fontSize:
      12,

    fontWeight:
      600,

    color:
      "#374151",

    lineHeight:
      1.35,

    marginBottom:
      5,
  },


  tooltipScore: {
    fontSize:
      12,

    color:
      "#22a55a",

    marginBottom:
      4,
  },


  tooltipDate: {
    fontSize:
      11,

    color:
      "#6b7280",

    lineHeight:
      1.35,
  },


  /* ==============================================================
     ACHIEVEMENTS
     ============================================================== */

  achievementsHeader: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",
  },


  viewMore: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      4,

    fontSize:
      13.5,

    fontWeight:
      600,

    cursor:
      "pointer",

    color:
      "#374151",

    background:
      "transparent",

    border:
      "none",

    padding:
      0,
  },


  achievementGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",

    gap:
      16,

    marginTop:
      16,
  },


  noAchievementIcon: {
    width:
      56,

    height:
      56,

    margin:
      "0 auto 12px",

    borderRadius:
      14,

    background:
      "#f3f4f6",

    color:
      "#9ca3af",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",
  },


  noAchievementTitle: {
    color:
      "#374151",

    fontWeight:
      700,

    fontSize:
      14,
  },


  noAchievementText: {
    marginTop:
      5,

    color:
      "#9ca3af",

    fontSize:
      12.5,
  },
};