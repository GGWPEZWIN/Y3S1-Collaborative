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
 * Challenges live in a flat top-level "challenges" collection.
 * Shape:
 * {
 *   title: string,
 *   description: string,
 *   category: "Waste" | "General" | "Transport" | "Water" | "Energy",
 *   difficulty: "Easy" | "Medium" | "Hard",
 *   points: number,
 *   startDate: string (YYYY-MM-DD),
 *   endDate: string (YYYY-MM-DD),
 *   created_at, updated_at: serverTimestamp
 * }
 *
 * Adjust these fields to match whatever ChallengeDetails.jsx /
 * ChallengesPage.jsx already expect — this is a reasonable default shape,
 * not necessarily your existing one.
 */

export const CHALLENGE_CATEGORY_OPTIONS = ["Waste", "General", "Transport", "Water", "Energy"];
export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];

/** Live subscription to all challenges, most recently created first. */
export function listenToChallenges(callback) {
  const q = query(collection(db, "challenges"), orderBy("created_at", "desc"));
  return onSnapshot(q, (snap) => {
    const challenges = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(challenges);
  });
}

/** Creates a new challenge. Returns the new doc's ID. */
export async function createChallenge({ title, description, category, difficulty, points, startDate, endDate }) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Title can't be empty.");
  if (!CHALLENGE_CATEGORY_OPTIONS.includes(category)) throw new Error("Pick a valid category.");
  if (!DIFFICULTY_OPTIONS.includes(difficulty)) throw new Error("Pick a valid difficulty.");
  const pointsNum = Number(points);
  if (!Number.isFinite(pointsNum) || pointsNum < 0) throw new Error("Points must be a positive number.");
  if (!startDate || !endDate) throw new Error("Start and end dates are required.");
  if (new Date(endDate) < new Date(startDate)) throw new Error("End date can't be before start date.");

  const docRef = await addDoc(collection(db, "challenges"), {
    title: trimmedTitle,
    description: description.trim(),
    category,
    difficulty,
    points: pointsNum,
    startDate,
    endDate,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return docRef.id;
}

/** Updates an existing challenge. Pass only the fields you want to change. */
export async function updateChallenge(challengeId, fields) {
  const updates = { ...fields, updated_at: serverTimestamp() };

  if ("title" in updates) {
    updates.title = updates.title.trim();
    if (!updates.title) throw new Error("Title can't be empty.");
  }
  if ("category" in updates && !CHALLENGE_CATEGORY_OPTIONS.includes(updates.category)) {
    throw new Error("Pick a valid category.");
  }
  if ("difficulty" in updates && !DIFFICULTY_OPTIONS.includes(updates.difficulty)) {
    throw new Error("Pick a valid difficulty.");
  }
  if ("points" in updates) {
    const pointsNum = Number(updates.points);
    if (!Number.isFinite(pointsNum) || pointsNum < 0) throw new Error("Points must be a positive number.");
    updates.points = pointsNum;
  }
  if (("startDate" in updates || "endDate" in updates)) {
    const start = updates.startDate ?? undefined;
    const end = updates.endDate ?? undefined;
    if (start && end && new Date(end) < new Date(start)) {
      throw new Error("End date can't be before start date.");
    }
  }

  await updateDoc(doc(db, "challenges", challengeId), updates);
}

/** Permanently deletes a challenge. */
export async function deleteChallenge(challengeId) {
  await deleteDoc(doc(db, "challenges", challengeId));
}