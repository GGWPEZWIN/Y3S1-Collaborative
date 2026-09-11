import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./config";

const ACHIEVEMENTS_COLLECTION = "achievements";
const USERS_COLLECTION = "users";
const TRAVEL_HISTORY_COLLECTION = "travelHistory";
const USER_ACHIEVEMENTS_COLLECTION = "achievements";

// ============================================================
// ADMIN OPTIONS
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
  {
    value: "carbon_saved",
    label: "Save Carbon",
    unit: "kg CO₂",
  },
  {
    value: "waste_reduced",
    label: "Reduce Waste",
    unit: "kg",
  },
  {
    value: "user_registered",
    label: "Register an Account",
    unit: "registration",
  },
  {
    value: "itinerary_saved",
    label: "Save an Itinerary",
    unit: "itinerary",
  },
];

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

export const getRandomDefaultIcon = () => {
  return DEFAULT_ICON_OPTIONS[
    Math.floor(
      Math.random() * DEFAULT_ICON_OPTIONS.length
    )
  ];
};

// ============================================================
// ADMIN ACHIEVEMENT LISTENER
// ============================================================
//
// IMPORTANT:
//
// The achievement catalogue is GLOBAL.
//
// ALL admins read the SAME top-level `achievements`
// collection.
//
// Do NOT filter by createdBy.
//
// `createdBy` is only audit metadata.
// It is NOT ownership.
//
// Admins manage the catalogue.
// Users earn the achievements.
// ============================================================

export const listenToAchievements = (callback) => {
  const achievementRef = collection(
    db,
    ACHIEVEMENTS_COLLECTION
  );

  return onSnapshot(
    achievementRef,
    (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      list.sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() || 0;

        const bTime =
          b.createdAt?.toMillis?.() || 0;

        return bTime - aTime;
      });

      callback(list);
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
// USER SIDE - PUBLISHED ACHIEVEMENTS ONLY
// ============================================================

export const listenToPublishedAchievements = (
  callback
) => {
  const achievementRef = collection(
    db,
    ACHIEVEMENTS_COLLECTION
  );

  return onSnapshot(
    achievementRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter(
          (item) =>
            item.status === "published"
        );

      list.sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() || 0;

        const bTime =
          b.createdAt?.toMillis?.() || 0;

        return bTime - aTime;
      });

      callback(list);
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

export const getAchievement = async (
  achievementId
) => {
  if (!achievementId) {
    return null;
  }

  const achievementRef = doc(
    db,
    ACHIEVEMENTS_COLLECTION,
    achievementId
  );

  const snapshot = await getDoc(
    achievementRef
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

// ============================================================
// UPLOAD ACHIEVEMENT IMAGE
// ============================================================

export const uploadAchievementImage = async (
  file
) => {
  if (!file) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Please select an image file."
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      "Image must be smaller than 5 MB."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";

  const fileName =
    `achievement_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;

  const storageRef = ref(
    storage,
    `achievements/${fileName}`
  );

  await uploadBytes(
    storageRef,
    file
  );

  return getDownloadURL(
    storageRef
  );
};

// ============================================================
// DELETE ACHIEVEMENT IMAGE
// ============================================================

export const deleteAchievementImage = async (
  imageUrl
) => {
  if (!imageUrl) {
    return;
  }

  try {
    const imageRef = ref(
      storage,
      imageUrl
    );

    await deleteObject(
      imageRef
    );
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

export const createAchievement = async ({
  title,
  description,
  category,
  ruleType,
  ruleTarget,
  ruleUnit,
  icon,
  iconUrl,
  createdBy,
  status = "draft",
}) => {
  const data = {
    title:
      title?.trim() ||
      "Untitled Achievement",

    description:
      description?.trim() ||
      "Complete the requirement to unlock this achievement.",

    category:
      category || "Eco Travel",

    ruleType:
      ruleType || "trips_completed",

    ruleTarget:
      Math.max(
        Number(ruleTarget) || 1,
        1
      ),

    ruleUnit:
      ruleUnit || "trips",

    icon:
      icon || getRandomDefaultIcon(),

    iconUrl:
      iconUrl || "",

    status:
      status === "published"
        ? "published"
        : "draft",

    // Audit information only.
    // This does NOT make the achievement belong
    // to the admin who created it.
    createdBy:
      createdBy || null,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const result = await addDoc(
    collection(
      db,
      ACHIEVEMENTS_COLLECTION
    ),
    data
  );

  return result.id;
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

  await updateDoc(
    achievementRef,
    {
      title:
        title?.trim() ||
        "Untitled Achievement",

      description:
        description?.trim() ||
        "Complete the requirement to unlock this achievement.",

      category:
        category || "Eco Travel",

      ruleType:
        ruleType ||
        "trips_completed",

      ruleTarget:
        Math.max(
          Number(ruleTarget) || 1,
          1
        ),

      ruleUnit:
        ruleUnit || "trips",

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
    }
  );
};

// ============================================================
// PUBLISH ACHIEVEMENT
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

  await updateDoc(
    achievementRef,
    {
      status: "published",

      publishedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );
};

// ============================================================
// SAVE AS DRAFT
// ============================================================

export const saveAchievementDraft =
  async (
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

  await deleteDoc(
    achievementRef
  );

  if (imageUrl) {
    await deleteAchievementImage(
      imageUrl
    );
  }
};

// ============================================================
// COUNT COMPLETED TRIPS
// ============================================================

const getCompletedTripCount =
  async (uid) => {
    const historyRef =
      collection(
        db,
        USERS_COLLECTION,
        uid,
        TRAVEL_HISTORY_COLLECTION
      );

    const snapshot =
      await getDocs(
        historyRef
      );

    let count = 0;

    snapshot.forEach(
      (tripDoc) => {
        const trip =
          tripDoc.data();

        const status =
          String(
            trip.status || ""
          ).toLowerCase();

        if (
          status === "completed" ||
          status === "complete" ||
          trip.completed === true ||
          trip.isCompleted === true
        ) {
          count += 1;
        }
      }
    );

    return count;
  };

// ============================================================
// GET USER PROGRESS
// ============================================================

export const getUserAchievementProgress =
  async (uid) => {
    if (!uid) {
      return {
        trips_completed: 0,
        eco_score: 0,
        challenges_completed: 0,
        carbon_saved: 0,
        waste_reduced: 0,
      };
    }

    const userRef =
      doc(
        db,
        USERS_COLLECTION,
        uid
      );

    const userSnapshot =
      await getDoc(userRef);

    const profile =
      userSnapshot.exists()
        ? userSnapshot.data()
        : {};

    const tripsCompleted =
      await getCompletedTripCount(
        uid
      );

    return {
      trips_completed:
        tripsCompleted,

      eco_score:
        Number(
          profile.eco_score ??
            profile.ecoScore ??
            0
        ),

      challenges_completed:
        Number(
          profile.challenges_completed ??
            0
        ),

      carbon_saved:
        Number(
          profile.carbon_saved ??
            profile.carbonSaved ??
            0
        ),

      waste_reduced:
        Number(
          profile.waste_reduced ??
            profile.wasteReduced ??
            0
        ),
    };
  };

// ============================================================
// CHECK IF UNLOCKED
// ============================================================

export const isAchievementUnlocked = (
  achievement,
  progress
) => {
  const ruleType =
    achievement?.ruleType ||
    "trips_completed";

  const target =
    Math.max(
      Number(
        achievement?.ruleTarget
      ) || 1,
      1
    );

  const current =
    Number(
      progress?.[ruleType]
    ) || 0;

  return current >= target;
};

// ============================================================
// GET USER ACHIEVEMENT
// ============================================================

export const getUserAchievement = async (
  uid,
  achievementId
) => {
  if (!uid || !achievementId) {
    return null;
  }

  const achievementRef =
    doc(
      db,
      USERS_COLLECTION,
      uid,
      USER_ACHIEVEMENTS_COLLECTION,
      achievementId
    );

  const snapshot =
    await getDoc(
      achievementRef
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

// ============================================================
// AWARD ACHIEVEMENT ONCE
// ============================================================
//
// IMPORTANT:
//
// This function awards the achievement to the UID passed in.
//
// It does NOT check whether the caller is an admin.
//
// The registration page passes the newly-created USER UID.
//
// The admin page does NOT call this function.
//
// Firestore Security Rules should control who can write
// achievement records.
// ============================================================

export const awardAchievement = async (
  uid,
  achievement
) => {
  if (
    !uid ||
    !achievement?.id
  ) {
    throw new Error(
      "User ID and achievement ID are required."
    );
  }

  const userRef =
    doc(
      db,
      USERS_COLLECTION,
      uid
    );

  const userAchievementRef =
    doc(
      db,
      USERS_COLLECTION,
      uid,
      USER_ACHIEVEMENTS_COLLECTION,
      achievement.id
    );

  const awardResult =
    await runTransaction(
      db,
      async (transaction) => {
        const existing =
          await transaction.get(
            userAchievementRef
          );

        // Already awarded.
        if (existing.exists()) {
          return {
            awarded: false,
            alreadyAwarded: true,
          };
        }

        transaction.set(
          userAchievementRef,
          {
            achievementId:
              achievement.id,

            title:
              achievement.title ||
              "",

            category:
              achievement.category ||
              "",

            unlocked: true,

            unlockedAt:
              serverTimestamp(),
          }
        );

        // Increase only the user's badge count.
        transaction.set(
          userRef,
          {
            badges_earned:
              increment(1),

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return {
          awarded: true,
          alreadyAwarded: false,
        };
      }
    );

  // Notify currently-open GreenTrip app
  // after a NEW achievement is awarded.
  if (
    awardResult?.awarded === true &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "greentrip:achievement-unlocked",
        {
          detail: {
            achievement: {
              id:
                achievement.id,

              title:
                achievement.title ||
                "Achievement Unlocked",

              description:
                achievement.description ||
                "You reached the achievement requirement.",

              category:
                achievement.category ||
                "",

              icon:
                achievement.icon ||
                "",

              iconUrl:
                achievement.iconUrl ||
                "",

              ruleType:
                achievement.ruleType ||
                "",

              ruleTarget:
                achievement.ruleTarget ||
                1,

              ruleUnit:
                achievement.ruleUnit ||
                "",
            },
          },
        }
      )
    );
  }

  return awardResult;
};

// ============================================================
// CHECK + AWARD ALL PUBLISHED ACHIEVEMENTS
// ============================================================

export const checkAndAwardAchievements =
  async (
    uid,
    achievements
  ) => {
    if (!uid) {
      return {
        achievements: [],
        newlyAwarded: [],
        userProgress: {},
      };
    }

    const published =
      Array.isArray(
        achievements
      )
        ? achievements.filter(
            (item) =>
              item.status ===
              "published"
          )
        : [];

    const userProgress =
      await getUserAchievementProgress(
        uid
      );

    const result = [];
    const newlyAwarded = [];

    for (
      const achievement of published
    ) {
      // Registration achievements are handled
      // separately immediately after registration.
      //
      // This prevents the normal progress checker
      // from treating registration as a numeric
      // progress value.
      if (
        achievement.ruleType ===
        "user_registered"
      ) {
        result.push({
          ...achievement,

          progress: 0,

          ruleTarget: 1,

          ruleUnit:
            achievement.ruleUnit ||
            "registration",

          unlocked: false,

          awarded: false,
        });

        continue;
      }

      const target =
        Math.max(
          Number(
            achievement.ruleTarget
          ) || 1,
          1
        );

      const progress =
        Number(
          userProgress[
            achievement.ruleType
          ]
        ) || 0;

      const unlocked =
        progress >= target;

      let awarded = false;

      if (unlocked) {
        const awardResult =
          await awardAchievement(
            uid,
            achievement
          );

        awarded =
          awardResult?.awarded ===
          true;

        if (awarded) {
          newlyAwarded.push(
            achievement
          );
        }
      }

      result.push({
        ...achievement,

        progress,

        ruleTarget:
          target,

        ruleUnit:
          achievement.ruleUnit ||
          "",

        unlocked,

        awarded,
      });
    }

    return {
      achievements: result,
      newlyAwarded,
      userProgress,
    };
  };

// ============================================================
// LISTEN TO USER'S AWARDED ACHIEVEMENTS
// ============================================================

export const listenToUserAchievements = (
  uid,
  callback
) => {
  if (!uid) {
    callback([]);

    return () => {};
  }

  const achievementRef =
    collection(
      db,
      USERS_COLLECTION,
      uid,
      USER_ACHIEVEMENTS_COLLECTION
    );

  return onSnapshot(
    achievementRef,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );
    },
    (error) => {
      console.error(
        "Error listening to user achievements:",
        error
      );

      callback([]);
    }
  );
};

// ============================================================
// CHECK AFTER ANOTHER MODULE UPDATES PROGRESS
// ============================================================

export const checkAchievementsAfterProgressChange =
  async (uid) => {
    if (!uid) {
      return {
        newlyAwarded: [],
      };
    }

    const achievements =
      await new Promise(
        (resolve) => {
          let finished = false;
          let unsubscribe;

          unsubscribe =
            listenToPublishedAchievements(
              (list) => {
                if (finished) {
                  return;
                }

                finished = true;

                unsubscribe?.();

                resolve(list);
              }
            );
        }
      );

    return checkAndAwardAchievements(
      uid,
      achievements
    );
  };

// ============================================================
// CHECK FIRST-REGISTRATION ACHIEVEMENT
// ============================================================
//
// This function is ONLY called by the registration flow.
//
// Admins CRUD the achievement catalogue.
//
// Admins do NOT receive registration achievements.
//
// When a NEW USER successfully registers:
//
// Register.jsx
//      ↓
// registerTourist()
//      ↓
// get new user's UID
//      ↓
// checkRegistrationAchievement(uid)
//      ↓
// awardAchievement(uid, achievement)
//      ↓
// users/{uid}/achievements/{achievementId}
//
// ============================================================

export const checkRegistrationAchievement =
  async (uid) => {
    if (!uid) {
      return {
        newlyAwarded: [],
      };
    }

    try {
      const achievementRef =
        collection(
          db,
          ACHIEVEMENTS_COLLECTION
        );

      const snapshot =
        await getDocs(
          achievementRef
        );

      const registrationAchievements =
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (achievement) =>
              achievement.status ===
                "published" &&
              achievement.ruleType ===
                "user_registered"
          );

      const newlyAwarded = [];

      for (
        const achievement of
          registrationAchievements
      ) {
        const result =
          await awardAchievement(
            uid,
            achievement
          );

        if (
          result?.awarded === true
        ) {
          newlyAwarded.push(
            achievement
          );
        }
      }

      return {
        newlyAwarded,
      };
    } catch (error) {
      console.error(
        "Failed to check registration achievement:",
        error
      );

      return {
        newlyAwarded: [],
      };
    }
  };

// ============================================================
// CHECK FIRST ITINERARY SAVED ACHIEVEMENT
// ============================================================
//
// This function is called after a user successfully saves an
// itinerary. The achievement is awarded once and stored under:
//
// users/{uid}/achievements/{achievementId}
//
// Because awardAchievement() checks whether that user achievement
// document already exists, deleting the itinerary later does NOT
// unlock the achievement again. Saving another itinerary also
// cannot award the same achievement twice.
//
// ============================================================

export const checkItinerarySavedAchievement = async (uid) => {
  if (!uid) {
    return {
      newlyAwarded: [],
    };
  }

  try {
    const achievementRef = collection(
      db,
      ACHIEVEMENTS_COLLECTION
    );

    const snapshot = await getDocs(
      achievementRef
    );

    const itineraryAchievements = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .filter(
        (achievement) =>
          achievement.status === "published" &&
          achievement.ruleType === "itinerary_saved"
      );

    const newlyAwarded = [];

    for (const achievement of itineraryAchievements) {
      const result = await awardAchievement(
        uid,
        achievement
      );

      if (result?.awarded === true) {
        newlyAwarded.push(achievement);
      }
    }

    return {
      newlyAwarded,
    };
  } catch (error) {
    console.error(
      "Failed to check itinerary saved achievement:",
      error
    );

    return {
      newlyAwarded: [],
    };
  }
};
