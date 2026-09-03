import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./config";

// ============================================================
// FIRESTORE COLLECTION
// ============================================================

const ACHIEVEMENTS_COLLECTION = "achievements";

// ============================================================
// CATEGORY OPTIONS
// ============================================================

export const CATEGORY_OPTIONS = [
  "Eco Travel",
  "Transportation",
  "Carbon Saving",
  "Community",
  "Challenges",
  "Milestones",
  "Special",
];

// ============================================================
// RULE OPTIONS
// ============================================================

export const RULE_OPTIONS = [
  {
    value: "trips_completed",
    label: "Complete Trips",
    unit: "trips",
  },
  {
    value: "eco_score",
    label: "Reach Eco Score",
    unit: "eco score",
  },
  {
    value: "challenges_completed",
    label: "Complete Challenges",
    unit: "challenges",
  },
];

// ============================================================
// DEFAULT ICON OPTIONS
// ============================================================
// These are used when admin DOES NOT upload an image.
// The system randomly selects one of these icons.
// ============================================================

export const DEFAULT_ICON_OPTIONS = [
  "Recycle",
  "Sprout",
  "Bus",
  "Droplet",
  "Zap",
  "Leaf",
  "Award",
  "TreePine",
];

// ============================================================
// GET RANDOM DEFAULT ICON
// ============================================================

export const getRandomDefaultIcon = () => {
  const randomIndex = Math.floor(
    Math.random() * DEFAULT_ICON_OPTIONS.length
  );

  return DEFAULT_ICON_OPTIONS[randomIndex];
};

// ============================================================
// LISTEN TO ALL ACHIEVEMENTS
// ============================================================
// Admin uses this.
// Includes both drafts and published achievements.
// ============================================================

export const listenToAchievements = (callback) => {
  const collectionRef = collection(db, ACHIEVEMENTS_COLLECTION);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const achievements = snapshot.docs.map((achievementDoc) => ({
        id: achievementDoc.id,
        ...achievementDoc.data(),
      }));

      // Newest first
      achievements.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      });

      callback(achievements);
    },
    (error) => {
      console.error(
        "Error listening to achievements:",
        error
      );

      callback([]);
    }
  );
};

// ============================================================
// LISTEN TO PUBLISHED ACHIEVEMENTS
// ============================================================
// USER SIDE uses this.
// Draft achievements will NOT appear to users.
// ============================================================

export const listenToPublishedAchievements = (callback) => {
  const collectionRef = collection(db, ACHIEVEMENTS_COLLECTION);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const achievements = snapshot.docs
        .map((achievementDoc) => ({
          id: achievementDoc.id,
          ...achievementDoc.data(),
        }))
        .filter(
          (achievement) =>
            achievement.status === "published"
        );

      // Newest first
      achievements.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      });

      callback(achievements);
    },
    (error) => {
      console.error(
        "Error listening to published achievements:",
        error
      );

      callback([]);
    }
  );
};

// ============================================================
// GET SINGLE ACHIEVEMENT
// ============================================================

export const getAchievement = async (achievementId) => {
  // This function is kept for compatibility.
  // The admin page primarily uses listenToAchievements().
  return achievementId;
};

// ============================================================
// UPLOAD ACHIEVEMENT IMAGE
// ============================================================
// Admin can upload an image for the achievement icon.
// If no image is uploaded, the system uses a random
// default Lucide icon instead.
// ============================================================

export const uploadAchievementImage = async (file) => {
  if (!file) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  // Maximum 5 MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      "Image must be smaller than 5 MB."
    );
  }

  const fileExtension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName = `achievement_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}.${fileExtension}`;

  const storageRef = ref(
    storage,
    `achievements/${fileName}`
  );

  await uploadBytes(storageRef, file);

  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
};

// ============================================================
// DELETE ACHIEVEMENT IMAGE
// ============================================================

export const deleteAchievementImage = async (imageUrl) => {
  if (!imageUrl) {
    return;
  }

  try {
    const imageRef = ref(storage, imageUrl);

    await deleteObject(imageRef);
  } catch (error) {
    console.warn(
      "Could not delete achievement image:",
      error
    );
  }
};

// ============================================================
// CREATE ACHIEVEMENT
// ============================================================
// Default status = draft.
//
// Admin can:
// 1. Create achievement
// 2. Save Draft
// 3. Later Publish
//
// If iconUrl exists -> uploaded image is used.
// If iconUrl is empty -> random Lucide icon is used.
// ============================================================

export const createAchievement = async ({
  title,
  description,
  category,
  points,
  ruleType,
  ruleTarget,
  ruleUnit,
  icon,
  iconUrl,
  createdBy,
  status = "draft",
}) => {
  const finalIcon =
    icon || getRandomDefaultIcon();

  const achievementData = {
    title:
      title?.trim() || "Untitled Achievement",

    description:
      description?.trim() ||
      "Complete the requirement to unlock this achievement.",

    category:
      category || "Eco Travel",

    points:
      Number(points) || 0,

    ruleType:
      ruleType || "trips_completed",

    ruleTarget:
      Math.max(Number(ruleTarget) || 1, 1),

    ruleUnit:
      ruleUnit || "trips",

    // Default Lucide icon
    icon: finalIcon,

    // Uploaded image URL, if available
    iconUrl: iconUrl || "",

    // Draft or published
    status:
      status === "published"
        ? "published"
        : "draft",

    createdBy:
      createdBy || null,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, ACHIEVEMENTS_COLLECTION),
    achievementData
  );

  return docRef.id;
};

// ============================================================
// UPDATE ACHIEVEMENT
// ============================================================

export const updateAchievement = async (
  achievementId,
  {
    title,
    description,
    category,
    points,
    ruleType,
    ruleTarget,
    ruleUnit,
    icon,
    iconUrl,
    status,
  }
) => {
  if (!achievementId) {
    throw new Error(
      "Achievement ID is required."
    );
  }

  const achievementRef = doc(
    db,
    ACHIEVEMENTS_COLLECTION,
    achievementId
  );

  const updateData = {
    title:
      title?.trim() || "Untitled Achievement",

    description:
      description?.trim() ||
      "Complete the requirement to unlock this achievement.",

    category:
      category || "Eco Travel",

    points:
      Number(points) || 0,

    ruleType:
      ruleType || "trips_completed",

    ruleTarget:
      Math.max(Number(ruleTarget) || 1, 1),

    ruleUnit:
      ruleUnit || "trips",

    // Keep existing icon if supplied.
    // Otherwise randomly select one.
    icon:
      icon || getRandomDefaultIcon(),

    iconUrl:
      iconUrl || "",

    status:
      status === "published"
        ? "published"
        : "draft",

    updatedAt:
      serverTimestamp(),
  };

  await updateDoc(
    achievementRef,
    updateData
  );
};

// ============================================================
// PUBLISH ACHIEVEMENT
// ============================================================
// Changes draft -> published.
// Once published, it becomes visible on the USER side.
// ============================================================

export const publishAchievement = async (
  achievementId
) => {
  if (!achievementId) {
    throw new Error(
      "Achievement ID is required."
    );
  }

  const achievementRef = doc(
    db,
    ACHIEVEMENTS_COLLECTION,
    achievementId
  );

  await updateDoc(achievementRef, {
    status: "published",

    publishedAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });
};

// ============================================================
// SAVE AS DRAFT
// ============================================================
// If achievementId exists:
//     UPDATE existing achievement as draft.
//
// If achievementId does not exist:
//     CREATE a new achievement as draft.
//
// This is the method your Admin Achievement page should
// call when the admin clicks "Save Draft".
// ============================================================

export const saveAchievementDraft = async (
  achievementId,
  data
) => {
  if (achievementId) {
    await updateAchievement(
      achievementId,
      {
        ...data,
        status: "draft",
      }
    );

    return achievementId;
  }

  return createAchievement({
    ...data,
    status: "draft",
  });
};

// ============================================================
// DELETE ACHIEVEMENT
// ============================================================

export const deleteAchievement = async (
  achievementId,
  imageUrl = ""
) => {
  if (!achievementId) {
    throw new Error(
      "Achievement ID is required."
    );
  }

  const achievementRef = doc(
    db,
    ACHIEVEMENTS_COLLECTION,
    achievementId
  );

  // Delete Firestore document
  await deleteDoc(achievementRef);

  // Delete uploaded image if it exists
  if (imageUrl) {
    await deleteAchievementImage(
      imageUrl
    );
  }
};