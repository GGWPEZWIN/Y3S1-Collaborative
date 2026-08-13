import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Builds a deterministic request ID so a user can't spam duplicate
 * requests to the same person — re-sending just overwrites the same doc.
 */
function requestId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

/**
 * Looks up a user by exact email match. Returns null if not found
 * or if the email belongs to the current user.
 */
export async function searchUserByEmail(email, currentUid) {
  const normalized = email.trim().toLowerCase();
  const q = query(collection(db, "users"), where("email", "==", normalized), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const found = snap.docs[0];
  if (found.id === currentUid) return { self: true };

  return { uid: found.id, ...found.data() };
}

/**
 * Searches by exact email OR by username prefix (case-insensitive),
 * returning up to 10 matches. Excludes the current user from results.
 */
export async function searchUsers(queryText, currentUid) {
  const trimmed = queryText.trim();
  if (!trimmed) return [];

  const results = new Map();

  if (trimmed.includes("@")) {
    const emailMatch = await searchUserByEmail(trimmed, currentUid);
    if (emailMatch && !emailMatch.self) {
      results.set(emailMatch.uid, emailMatch);
    }
    return Array.from(results.values());
  }

  const lower = trimmed.toLowerCase();
  const q = query(
    collection(db, "users"),
    orderBy("name_lower"),
    startAt(lower),
    endAt(lower + "\uf8ff"),
    limit(10)
  );
  const snap = await getDocs(q);
  snap.docs.forEach((d) => {
    if (d.id !== currentUid) results.set(d.id, { uid: d.id, ...d.data() });
  });

  // Fallback: accounts that haven't logged in since name_lower was added
  // won't match the query above (Firestore excludes docs missing the
  // ordered field). Scan a batch of users and match on name directly.
  if (results.size === 0) {
    const fallbackSnap = await getDocs(query(collection(db, "users"), limit(50)));
    fallbackSnap.docs.forEach((d) => {
      if (d.id === currentUid) return;
      const data = d.data();
      if (data.name && data.name.toLowerCase().includes(lower)) {
        results.set(d.id, { uid: d.id, ...data });
      }
    });
  }

  return Array.from(results.values());
}

/**
 * Sends a friend request. Throws if a request already exists either
 * direction, or if they're already friends.
 */
export async function sendFriendRequest(currentUser, targetUser) {
  const { uid: fromUid, displayName, email: fromEmail } = currentUser;
  const { uid: toUid, email: toEmail, name: toName } = targetUser;

  if (fromUid === toUid) throw new Error("You can't add yourself.");

  // Already friends?
  const friendDoc = await getDoc(doc(db, "users", fromUid, "friends", toUid));
  if (friendDoc.exists()) throw new Error("You're already friends.");

  // Existing request either direction?
  const forwardRef = doc(db, "friendRequests", requestId(fromUid, toUid));
  const reverseRef = doc(db, "friendRequests", requestId(toUid, fromUid));
  const [forwardSnap, reverseSnap] = await Promise.all([getDoc(forwardRef), getDoc(reverseRef)]);

  if (forwardSnap.exists() && forwardSnap.data().status === "pending") {
    throw new Error("Friend request already sent.");
  }
  if (reverseSnap.exists() && reverseSnap.data().status === "pending") {
    throw new Error("This user already sent you a request — check your incoming requests.");
  }

  await setDoc(forwardRef, {
    fromUid,
    fromName: displayName || "",
    fromEmail: fromEmail || "",
    toUid,
    toEmail: toEmail || "",
    toName: toName || "",
    status: "pending",
    created_at: serverTimestamp(),
  });
}

/**
 * Accepts a friend request: marks it accepted and writes a friend doc
 * to both users' friends subcollections in one atomic batch.
 */
export async function acceptFriendRequest(request) {
  const batch = writeBatch(db);

  const requestRef = doc(db, "friendRequests", requestId(request.fromUid, request.toUid));
  batch.update(requestRef, { status: "accepted" });

  const meRef = doc(db, "users", request.toUid, "friends", request.fromUid);
  batch.set(meRef, {
    name: request.fromName || "",
    email: request.fromEmail || "",
    addedAt: serverTimestamp(),
  });

  const themRef = doc(db, "users", request.fromUid, "friends", request.toUid);
  batch.set(themRef, {
    name: request.toName || "",
    email: request.toEmail || "",
    addedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function declineFriendRequest(request) {
  const requestRef = doc(db, "friendRequests", requestId(request.fromUid, request.toUid));
  await deleteDoc(requestRef);
}

export async function cancelFriendRequest(request) {
  const requestRef = doc(db, "friendRequests", requestId(request.fromUid, request.toUid));
  await deleteDoc(requestRef);
}

export async function removeFriend(currentUid, friendUid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", currentUid, "friends", friendUid));
  batch.delete(doc(db, "users", friendUid, "friends", currentUid));
  await batch.commit();
}

/**
 * Live subscription to the current user's friends list.
 * Calls callback(friendsArray) whenever it changes.
 */
export function listenToFriends(uid, callback) {
  const ref = collection(db, "users", uid, "friends");
  return onSnapshot(ref, (snap) => {
    const friends = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    callback(friends);
  });
}

/**
 * Live subscription to pending requests SENT TO the current user.
 */
export function listenToIncomingRequests(uid, callback) {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}

/**
 * Live subscription to pending requests SENT BY the current user.
 */
export function listenToOutgoingRequests(uid, callback) {
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", uid),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}