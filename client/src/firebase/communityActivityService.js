import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./config";

const COMMUNITY_ACTIVITIES = "communityActivities";
const FRIENDS_SUBCOLLECTION = "friends";

export const COMMUNITY_ACTIVITY_TYPES = {
  TRIP_COMPLETED: "trip_completed",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
};

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export async function getFriendUids(uid) {
  if (!uid) return [];

  const snapshot = await getDocs(
    collection(db, "users", uid, FRIENDS_SUBCOLLECTION)
  );

  return unique(snapshot.docs.map((friendDoc) => friendDoc.id));
}

/**
 * Creates one activity visible to the actor and their friends at the
 * moment the activity is created. Only community-safe summary fields
 * are stored; private travel history/achievement documents are not read.
 */
export async function createCommunityActivity({
  actorUid,
  actorName = "User",
  actorPhotoUrl = "",
  type,
  tripId = null,
  tripName = null,
  ecoScore = null,
  startDate = null,
  endDate = null,
  achievementId = null,
  achievementTitle = null,
  achievementIcon = "",
  achievementIconUrl = "",
  points = 0,
}) {
  if (!actorUid || !type) return null;

  const friendUids = await getFriendUids(actorUid);
  const audienceUids = unique([actorUid, ...friendUids]);

  if (audienceUids.length <= 1) return null;

  const payload = {
    actorUid,
    actorName: actorName || "User",
    actorPhotoUrl: actorPhotoUrl || "",
    type,
    visibility: "friends",
    audienceUids,
    tripId,
    tripName,
    ecoScore:
      ecoScore === null || ecoScore === undefined
        ? null
        : Number(ecoScore),
    startDate,
    endDate,
    achievementId,
    achievementTitle,
    achievementIcon: achievementIcon || "",
    achievementIconUrl: achievementIconUrl || "",
    points: Number(points) || 0,
    createdAt: serverTimestamp(),
  };

  const result = await addDoc(
    collection(db, COMMUNITY_ACTIVITIES),
    payload
  );

  return { id: result.id, ...payload };
}

export function listenToCommunityActivities(uid, callback, onError) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const activityQuery = query(
    collection(db, COMMUNITY_ACTIVITIES),
    where("audienceUids", "array-contains", uid)
  );

  return onSnapshot(
    activityQuery,
    (snapshot) => {
      const activities = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      callback(activities);
    },
    (error) => {
      console.error("Community activity listener failed:", error);
      callback([]);
      onError?.(error);
    }
  );
}
