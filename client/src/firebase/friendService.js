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

import { db, auth } from "./config";


function getLoggedInUser() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    let unsubscribe;

    unsubscribe = auth.onAuthStateChanged(
      (user) => {
        unsubscribe?.();

        if (user) {
          resolve(user);
        } else {
          reject(new Error("No user is currently logged in."));
        }
      },
      (error) => {
        unsubscribe?.();
        reject(error);
      }
    );
  });
}

function requestId(
  fromUid,
  toUid
) {
  return `${fromUid}_${toUid}`;
}

export async function searchUserByEmail(
  email,
  currentUid
) {
  const user = await getLoggedInUser();
  const effectiveUid = currentUid || user.uid;

  const normalized =
    email.trim().toLowerCase();

  if (!normalized) return null;

  const q = query(
    collection(db, "users"),
    where(
      "email",
      "==",
      normalized
    ),
    limit(1)
  );

  try {
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const found = snap.docs[0];

    if (found.id === effectiveUid) {
      return {
        self: true,
      };
    }

    return {
      uid: found.id,
      ...found.data(),
    };
  } catch (error) {
    console.error(
      "Friend email search failed:",
      error
    );

    if (error?.code === "permission-denied") {
      throw new Error(
        "Firestore denied the user search. Make sure you are signed in and the latest Firestore rules are published to the same Firebase project used by this app."
      );
    }

    throw error;
  }
}

export async function searchUsers(
  queryText,
  currentUid
) {
  const user = await getLoggedInUser();
  const effectiveUid = currentUid || user.uid;

  const trimmed =
    queryText.trim();

  if (!trimmed) return [];

  const results =
    new Map();

  if (trimmed.includes("@")) {
    const emailMatch =
      await searchUserByEmail(
        trimmed,
        effectiveUid
      );

    if (
      emailMatch &&
      !emailMatch.self
    ) {
      results.set(
        emailMatch.uid,
        emailMatch
      );
    }

    return Array.from(
      results.values()
    );
  }

  const lower =
    trimmed.toLowerCase();

  const q = query(
    collection(db, "users"),
    orderBy("name_lower"),
    startAt(lower),
    endAt(
      lower + "\uf8ff"
    ),
    limit(10)
  );

  const snap =
    await getDocs(q);

  snap.docs.forEach((d) => {
    if (d.id === effectiveUid)
      return;

    results.set(
      d.id,
      {
        uid: d.id,
        ...d.data(),
      }
    );
  });

  if (results.size === 0) {
    const fallbackSnap =
      await getDocs(
        query(
          collection(db, "users"),
          limit(50)
        )
      );

    fallbackSnap.docs.forEach(
      (d) => {
        if (
          d.id === effectiveUid
        ) {
          return;
        }

        const data =
          d.data();

        if (
          data.name &&
          data.name
            .toLowerCase()
            .includes(lower)
        ) {
          results.set(
            d.id,
            {
              uid: d.id,
              ...data,
            }
          );
        }
      }
    );
  }

  return Array.from(
    results.values()
  );
}

/**
 * Sends a friend request.
 */
export async function sendFriendRequest(
  currentUser,
  targetUser
) {
  const {
    uid: fromUid,
    displayName,
    email: fromEmail,
    profile_photo_url:
      fromProfilePhotoUrl,
  } = currentUser;

  const {
    uid: toUid,
    email: toEmail,
    name: toName,
    profile_photo_url:
      toProfilePhotoUrl,
  } = targetUser;

  if (fromUid === toUid) {
    throw new Error(
      "You can't add yourself."
    );
  }

  const friendDoc =
    await getDoc(
      doc(
        db,
        "users",
        fromUid,
        "friends",
        toUid
      )
    );

  if (friendDoc.exists()) {
    throw new Error(
      "You're already friends."
    );
  }

  const forwardRef =
    doc(
      db,
      "friendRequests",
      requestId(
        fromUid,
        toUid
      )
    );

  const reverseRef =
    doc(
      db,
      "friendRequests",
      requestId(
        toUid,
        fromUid
      )
    );

  const [
    forwardSnap,
    reverseSnap,
  ] = await Promise.all([
    getDoc(forwardRef),
    getDoc(reverseRef),
  ]);

  if (
    forwardSnap.exists() &&
    forwardSnap.data().status ===
      "pending"
  ) {
    throw new Error(
      "Friend request already sent."
    );
  }

  if (
    reverseSnap.exists() &&
    reverseSnap.data().status ===
      "pending"
  ) {
    throw new Error(
      "This user already sent you a request — check your incoming requests."
    );
  }

  await setDoc(
    forwardRef,
    {
      fromUid,

      fromName:
        displayName || "",

      fromEmail:
        fromEmail || "",

      fromProfilePhotoUrl:
        fromProfilePhotoUrl || "",

      toUid,

      toEmail:
        toEmail || "",

      toName:
        toName || "",

      toProfilePhotoUrl:
        toProfilePhotoUrl || "",

      status: "pending",

      created_at:
        serverTimestamp(),
    }
  );
}

/**
 * Accept friend request.
 */
export async function acceptFriendRequest(
  request
) {
  const batch =
    writeBatch(db);

  const requestRef =
    doc(
      db,
      "friendRequests",
      requestId(
        request.fromUid,
        request.toUid
      )
    );

  batch.update(
    requestRef,
    {
      status: "accepted",
    }
  );

  const meRef =
    doc(
      db,
      "users",
      request.toUid,
      "friends",
      request.fromUid
    );

  batch.set(
    meRef,
    {
      name:
        request.fromName || "",

      email:
        request.fromEmail || "",

      profile_photo_url:
        request.fromProfilePhotoUrl ||
        "",

      addedAt:
        serverTimestamp(),
    }
  );

  const themRef =
    doc(
      db,
      "users",
      request.fromUid,
      "friends",
      request.toUid
    );

  batch.set(
    themRef,
    {
      name:
        request.toName || "",

      email:
        request.toEmail || "",

      profile_photo_url:
        request.toProfilePhotoUrl ||
        "",

      addedAt:
        serverTimestamp(),
    }
  );

  await batch.commit();
}

export async function declineFriendRequest(
  request
) {
  await deleteDoc(
    doc(
      db,
      "friendRequests",
      requestId(
        request.fromUid,
        request.toUid
      )
    )
  );
}

export async function cancelFriendRequest(
  request
) {
  await deleteDoc(
    doc(
      db,
      "friendRequests",
      requestId(
        request.fromUid,
        request.toUid
      )
    )
  );
}

export async function removeFriend(
  currentUid,
  friendUid
) {
  const batch =
    writeBatch(db);

  batch.delete(
    doc(
      db,
      "users",
      currentUid,
      "friends",
      friendUid
    )
  );

  batch.delete(
    doc(
      db,
      "users",
      friendUid,
      "friends",
      currentUid
    )
  );

  await batch.commit();
}

/**
 * IMPORTANT:
 *
 * The friend document contains cached
 * information, but the actual users/{uid}
 * document is the source of truth.
 *
 * This listener watches both:
 *
 * users/{myUid}/friends/{friendUid}
 *
 * AND
 *
 * users/{friendUid}
 *
 * Therefore, if the friend changes their
 * profile picture, the Friends page updates
 * automatically.
 */
export function listenToFriends(
  uid,
  callback
) {
  const friendsRef =
    collection(
      db,
      "users",
      uid,
      "friends"
    );

  let userUnsubscribers =
    [];

  const unsubscribeFriends =
    onSnapshot(
      friendsRef,
      (friendsSnap) => {
        /*
         * Remove old user listeners.
         */
        userUnsubscribers.forEach(
          (unsub) => unsub()
        );

        userUnsubscribers =
          [];

        const friendDocs =
          friendsSnap.docs;

        /*
         * Empty list.
         */
        if (
          friendDocs.length === 0
        ) {
          callback([]);
          return;
        }

        /*
         * Keep the cached friend
         * records immediately.
         */
        const friendMap =
          new Map();

        friendDocs.forEach(
          (friendDoc) => {
            friendMap.set(
              friendDoc.id,
              {
                uid: friendDoc.id,
                ...friendDoc.data(),
              }
            );
          }
        );

        callback(
          Array.from(
            friendMap.values()
          )
        );

        /*
         * Watch every friend's
         * real users/{uid} document.
         */
        friendDocs.forEach(
          (friendDoc) => {
            const friendUid =
              friendDoc.id;

            const userRef =
              doc(
                db,
                "users",
                friendUid
              );

            const unsubscribeUser =
              onSnapshot(
                userRef,
                (userSnap) => {
                  const cached =
                    friendMap.get(
                      friendUid
                    );

                  if (
                    !cached
                  ) {
                    return;
                  }

                  if (
                    userSnap.exists()
                  ) {
                    /*
                     * Real user profile
                     * overrides cached
                     * friend data.
                     */
                    friendMap.set(
                      friendUid,
                      {
                        ...cached,
                        ...userSnap.data(),
                        uid: friendUid,
                      }
                    );
                  } else {
                    /*
                     * User document no
                     * longer exists.
                     */
                    friendMap.delete(
                      friendUid
                    );
                  }

                  callback(
                    Array.from(
                      friendMap.values()
                    )
                  );
                }
              );

            userUnsubscribers.push(
              unsubscribeUser
            );
          }
        );
      }
    );

  return () => {
    unsubscribeFriends();

    userUnsubscribers.forEach(
      (unsub) => unsub()
    );

    userUnsubscribers = [];
  };
}

export function listenToIncomingRequests(
  uid,
  callback
) {
  const q = query(
    collection(
      db,
      "friendRequests"
    ),
    where(
      "toUid",
      "==",
      uid
    ),
    where(
      "status",
      "==",
      "pending"
    )
  );

  return onSnapshot(
    q,
    (snap) => {
      const requests =
        snap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        );

      callback(requests);
    }
  );
}

export function listenToOutgoingRequests(
  uid,
  callback
) {
  const q = query(
    collection(
      db,
      "friendRequests"
    ),
    where(
      "fromUid",
      "==",
      uid
    ),
    where(
      "status",
      "==",
      "pending"
    )
  );

  return onSnapshot(
    q,
    (snap) => {
      const requests =
        snap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        );

      callback(requests);
    }
  );
}
