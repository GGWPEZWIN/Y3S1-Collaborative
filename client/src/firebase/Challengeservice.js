import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./config";

export const CHALLENGE_CATEGORY_OPTIONS = [
  "Waste",
  "General",
  "Transport",
  "Water",
  "Energy",
];

export const DIFFICULTY_OPTIONS = [
  "Easy",
  "Medium",
  "Hard",
];

export const TEAM_REQUIREMENT_OPTIONS = [
  {
    value: "photo",
    label: "Photo Proof",
  },
  {
    value: "location",
    label: "GPS / Location Verification",
  },
];

/**
 * Challenges live in:
 *   challenges/{challengeId}
 *
 * Team-specific fields:
 *   requirementType: "photo" | "location"
 *   requirementDescription: string
 *   challengeAchievementId: optional achievement document ID
 *
 * These fields control the Challenge Team Mode.
 */

function normalizeRequirementType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (
    type === "location" ||
    type === "gps" ||
    type === "geolocation"
  ) {
    return "location";
  }

  return "photo";
}

export function normalizeChallengeData(data = {}) {
  const requirementType =
    normalizeRequirementType(
      data.requirementType ||
        data.teamRequirementType
    );

  return {
    ...data,
    requirementType,
    requirementDescription:
      data.requirementDescription ||
      data.teamRequirementDescription ||
      (requirementType === "location"
        ? "Allow GreenTrip to access your location to verify your participation."
        : "Take and submit a photo as proof that you completed the challenge."),
    challengeAchievementId:
      data.challengeAchievementId ||
      data.achievementId ||
      "",
  };
}

/**
 * Live subscription to all challenges,
 * most recently created first.
 */
export function listenToChallenges(
  callback
) {
  const q = query(
    collection(db, "challenges"),
    orderBy("created_at", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const challenges =
        snap.docs.map((d) => ({
          id: d.id,
          ...normalizeChallengeData(
            d.data()
          ),
        }));

      callback(challenges);
    },
    (error) => {
      console.error(
        "Challenge listener failed:",
        error
      );
      callback([]);
    }
  );
}

/**
 * Creates a new challenge.
 */
export async function createChallenge({
  title,
  description,
  category,
  difficulty,
  points,
  startDate,
  endDate,
  requirementType = "photo",
  requirementDescription = "",
  challengeAchievementId = "",
}) {
  const trimmedTitle =
    String(title || "").trim();

  if (!trimmedTitle) {
    throw new Error(
      "Title can't be empty."
    );
  }

  if (
    !CHALLENGE_CATEGORY_OPTIONS.includes(
      category
    )
  ) {
    throw new Error(
      "Pick a valid category."
    );
  }

  if (
    !DIFFICULTY_OPTIONS.includes(
      difficulty
    )
  ) {
    throw new Error(
      "Pick a valid difficulty."
    );
  }

  const pointsNum = Number(points);

  if (
    !Number.isFinite(pointsNum) ||
    pointsNum < 0
  ) {
    throw new Error(
      "Points must be a positive number."
    );
  }

  if (!startDate || !endDate) {
    throw new Error(
      "Start and end dates are required."
    );
  }

  if (
    new Date(endDate) <
    new Date(startDate)
  ) {
    throw new Error(
      "End date can't be before start date."
    );
  }

  const normalizedType =
    normalizeRequirementType(
      requirementType
    );

  const normalizedDescription =
    String(
      requirementDescription || ""
    ).trim() ||
    (normalizedType === "location"
      ? "Allow GreenTrip to access your location to verify your participation."
      : "Take and submit a photo as proof that you completed the challenge.");

  const docRef = await addDoc(
    collection(db, "challenges"),
    {
      title: trimmedTitle,
      description:
        String(
          description || ""
        ).trim(),
      category,
      difficulty,
      points: pointsNum,
      startDate,
      endDate,

      requirementType:
        normalizedType,
      requirementDescription:
        normalizedDescription,
      challengeAchievementId:
        String(
          challengeAchievementId || ""
        ).trim(),

      created_at:
        serverTimestamp(),
      updated_at:
        serverTimestamp(),
    }
  );

  return docRef.id;
}

/**
 * Updates an existing challenge.
 */
export async function updateChallenge(
  challengeId,
  fields
) {
  if (!challengeId) {
    throw new Error(
      "Challenge ID is required."
    );
  }

  const updates = {
    ...fields,
    updated_at:
      serverTimestamp(),
  };

  if ("title" in updates) {
    updates.title = String(
      updates.title || ""
    ).trim();

    if (!updates.title) {
      throw new Error(
        "Title can't be empty."
      );
    }
  }

  if (
    "description" in updates
  ) {
    updates.description =
      String(
        updates.description || ""
      ).trim();
  }

  if (
    "category" in updates &&
    !CHALLENGE_CATEGORY_OPTIONS.includes(
      updates.category
    )
  ) {
    throw new Error(
      "Pick a valid category."
    );
  }

  if (
    "difficulty" in updates &&
    !DIFFICULTY_OPTIONS.includes(
      updates.difficulty
    )
  ) {
    throw new Error(
      "Pick a valid difficulty."
    );
  }

  if ("points" in updates) {
    const pointsNum =
      Number(updates.points);

    if (
      !Number.isFinite(pointsNum) ||
      pointsNum < 0
    ) {
      throw new Error(
        "Points must be a positive number."
      );
    }

    updates.points =
      pointsNum;
  }

  if (
    "requirementType" in
      updates
  ) {
    updates.requirementType =
      normalizeRequirementType(
        updates.requirementType
      );
  }

  if (
    "requirementDescription" in
      updates
  ) {
    updates.requirementDescription =
      String(
        updates.requirementDescription ||
          ""
      ).trim();

    if (
      !updates.requirementDescription
    ) {
      updates.requirementDescription =
        updates.requirementType ===
        "location"
          ? "Allow GreenTrip to access your location to verify your participation."
          : "Take and submit a photo as proof that you completed the challenge.";
    }
  }

  if (
    "challengeAchievementId" in
      updates
  ) {
    updates.challengeAchievementId =
      String(
        updates.challengeAchievementId ||
          ""
      ).trim();
  }

  if (
    "startDate" in updates ||
    "endDate" in updates
  ) {
    const start =
      updates.startDate;
    const end =
      updates.endDate;

    if (
      start &&
      end &&
      new Date(end) <
        new Date(start)
    ) {
      throw new Error(
        "End date can't be before start date."
      );
    }
  }

  await updateDoc(
    doc(
      db,
      "challenges",
      challengeId
    ),
    updates
  );
}

/**
 * Permanently deletes a challenge.
 */
export async function deleteChallenge(
  challengeId
) {
  if (!challengeId) {
    throw new Error(
      "Challenge ID is required."
    );
  }

  await deleteDoc(
    doc(
      db,
      "challenges",
      challengeId
    )
  );
}
