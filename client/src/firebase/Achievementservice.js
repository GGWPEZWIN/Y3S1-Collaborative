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

/**
 * Achievement definitions live in a flat top-level "achievements" collection.
 * Shape:
 * {
 *   title: string,
 *   description: string,
 *   category: "Waste" | "General" | "Transport" | "Water" | "Energy",
 *   icon: string,     // one of ICON_OPTIONS keys below — rendered via lucide-react
 *   points: number,
 *   created_at, updated_at: serverTimestamp
 * }
 *
 * This is the admin-managed catalog — separate from any per-user
 * "earned achievements" records (e.g. users/{uid}/earnedAchievements),
 * which you'd write to separately when a user actually unlocks one.
 */

export const CATEGORY_OPTIONS = ["Waste", "General", "Transport", "Water", "Energy"];

// Keys here must match the icon map used in AdminAchievementsPage.jsx
// and anywhere else you render an achievement (e.g. AchievementCard.jsx).
export const ICON_OPTIONS = [
  "Recycle",
  "Sprout",
  "Bus",
  "Droplet",
  "Zap",
  "Leaf",
  "Award",
  "TreePine",
];

/** Live subscription to all achievement definitions, most recently created first. */
export function listenToAchievements(callback) {
  const q = query(collection(db, "achievements"), orderBy("created_at", "desc"));
  return onSnapshot(q, (snap) => {
    const achievements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(achievements);
  });
}

/** Creates a new achievement definition. Returns the new doc's ID. */
export async function createAchievement({ title, description, category, icon, points }) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Title can't be empty.");
  if (!CATEGORY_OPTIONS.includes(category)) throw new Error("Pick a valid category.");
  if (!ICON_OPTIONS.includes(icon)) throw new Error("Pick a valid icon.");
  const pointsNum = Number(points);
  if (!Number.isFinite(pointsNum) || pointsNum < 0) throw new Error("Points must be a positive number.");

  const docRef = await addDoc(collection(db, "achievements"), {
    title: trimmedTitle,
    description: description.trim(),
    category,
    icon,
    points: pointsNum,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return docRef.id;
}

/** Updates an existing achievement definition. Pass only the fields you want to change. */
export async function updateAchievement(achievementId, fields) {
  const updates = { ...fields, updated_at: serverTimestamp() };

  if ("title" in updates) {
    updates.title = updates.title.trim();
    if (!updates.title) throw new Error("Title can't be empty.");
  }
  if ("category" in updates && !CATEGORY_OPTIONS.includes(updates.category)) {
    throw new Error("Pick a valid category.");
  }
  if ("icon" in updates && !ICON_OPTIONS.includes(updates.icon)) {
    throw new Error("Pick a valid icon.");
  }
  if ("points" in updates) {
    const pointsNum = Number(updates.points);
    if (!Number.isFinite(pointsNum) || pointsNum < 0) throw new Error("Points must be a positive number.");
    updates.points = pointsNum;
  }

  await updateDoc(doc(db, "achievements", achievementId), updates);
}

/** Permanently deletes an achievement definition. */
export async function deleteAchievement(achievementId) {
  await deleteDoc(doc(db, "achievements", achievementId));
}