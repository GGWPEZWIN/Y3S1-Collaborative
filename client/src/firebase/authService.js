import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "./config";

const googleProvider = new GoogleAuthProvider();

/* =========================================================
   REGISTER
========================================================= */

export async function registerTourist({
  name,
  email,
  password,
}) {
  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = credential.user;

  await updateProfile(user, {
    displayName: name,
  });

  await setDoc(doc(db, "users", user.uid), {
    name,
    name_lower: name.trim().toLowerCase(),
    email,
    role: "tourist",
    eco_score: 0,
    level: 1,

    // Profile photo starts empty.
    profile_photo_url: "",

    created_at: serverTimestamp(),
  });

  return user;
}

/* =========================================================
   ENSURE SEARCH FIELDS
========================================================= */

async function ensureSearchFields(userDocRef) {
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    const data = snap.data();

    if (!data.name_lower && data.name) {
      await setDoc(
        userDocRef,
        {
          name_lower: data.name
            .trim()
            .toLowerCase(),
        },
        {
          merge: true,
        }
      );
    }
  }
}

/* =========================================================
   ENSURE USER DOCUMENT
========================================================= */

async function ensureUserDoc(user) {
  const userDocRef = doc(
    db,
    "users",
    user.uid
  );

  const existingDoc =
    await getDoc(userDocRef);

  if (!existingDoc.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      name_lower: (user.displayName || "")
        .trim()
        .toLowerCase(),

      email: user.email || "",

      role: "tourist",

      eco_score: 0,

      level: 1,

      /*
       * Keep Firebase Auth photoURL when
       * creating the Firestore profile.
       */
      profile_photo_url:
        user.photoURL || "",

      created_at: serverTimestamp(),
    });
  } else {
    const existingData =
      existingDoc.data();

    const updates = {};

    if (
      !existingData.name_lower &&
      existingData.name
    ) {
      updates.name_lower =
        existingData.name
          .trim()
          .toLowerCase();
    }

    /*
     * If Auth has a photo and Firestore
     * doesn't have one, sync it.
     */
    if (
      user.photoURL &&
      !existingData.profile_photo_url
    ) {
      updates.profile_photo_url =
        user.photoURL;
    }

    if (Object.keys(updates).length > 0) {
      await setDoc(
        userDocRef,
        updates,
        {
          merge: true,
        }
      );
    }
  }
}

/* =========================================================
   EMAIL LOGIN
========================================================= */

export async function loginUser({
  email,
  password,
}) {
  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = credential.user;

  await ensureUserDoc(user);

  return user;
}

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export async function loginWithGoogle() {
  try {
    const credential =
      await signInWithPopup(
        auth,
        googleProvider
      );

    const user = credential.user;

    await ensureUserDoc(user);

    return user;
  } catch (err) {
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code ===
        "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(
        auth,
        googleProvider
      );

      return null;
    }

    throw err;
  }
}

/* =========================================================
   GOOGLE REDIRECT RESULT
========================================================= */

export async function handleGoogleRedirectResult() {
  const result =
    await getRedirectResult(auth);

  if (result?.user) {
    await ensureUserDoc(result.user);

    return result.user;
  }

  return null;
}

/* =========================================================
   LOGOUT
========================================================= */

export function logoutUser() {
  return signOut(auth);
}

export const signOutUser = logoutUser;

/* =========================================================
   RESET PASSWORD
========================================================= */

export function resetPassword(email) {
  return sendPasswordResetEmail(
    auth,
    email
  );
}

/* =========================================================
   RE-AUTHENTICATE
========================================================= */

export async function reauthenticate(
  currentPassword
) {
  const user = auth.currentUser;

  if (!user || !user.email) {
    throw new Error(
      "No signed-in user to re-authenticate."
    );
  }

  const credential =
    EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

  await reauthenticateWithCredential(
    user,
    credential
  );
}

/* =========================================================
   UPDATE NAME
========================================================= */

export async function updateUserName(
  newName
) {
  const trimmed = newName.trim();

  if (!trimmed) {
    throw new Error("Name can't be empty.");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("No signed-in user.");
  }

  await updateProfile(user, {
    displayName: trimmed,
  });

  await setDoc(
    doc(db, "users", user.uid),
    {
      name: trimmed,
      name_lower: trimmed.toLowerCase(),
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   UPDATE PROFILE PHOTO
========================================================= */

export async function updateUserPhoto(
  photoURL
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No signed-in user.");
  }

  await updateProfile(user, {
    photoURL: photoURL || null,
  });

  await setDoc(
    doc(db, "users", user.uid),
    {
      profile_photo_url: photoURL || "",
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   UPDATE EMAIL
========================================================= */

export async function updateUserEmail(
  newEmail
) {
  const trimmed = newEmail.trim();

  if (!trimmed) {
    throw new Error("Email can't be empty.");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("No signed-in user.");
  }

  await updateEmail(user, trimmed);

  await setDoc(
    doc(db, "users", user.uid),
    {
      email: trimmed,
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   UPDATE PASSWORD
========================================================= */

export async function updateUserPassword(
  newPassword
) {
  if (
    !newPassword ||
    newPassword.length < 6
  ) {
    throw new Error(
      "Password must be at least 6 characters."
    );
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("No signed-in user.");
  }

  await updatePassword(
    user,
    newPassword
  );
}

/* =========================================================
   DELETE ACCOUNT
========================================================= */

/*
 * IMPORTANT:
 *
 * This removes:
 *
 * 1. users/{uid}/friends/*
 * 2. incoming friend requests
 * 3. outgoing friend requests
 * 4. reciprocal friend documents
 * 5. removes the user from chat members
 * 6. users/{uid}
 * 7. Firebase Authentication account
 *
 * Firestore does NOT automatically delete
 * subcollections when the parent document is deleted.
 */

export async function deleteAccount() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No signed-in user.");
  }

  const uid = user.uid;

  /*
   * ==========================================
   * 1. DELETE MY FRIEND SUBCOLLECTION
   * ==========================================
   */

  const myFriendsSnap = await getDocs(
    collection(
      db,
      "users",
      uid,
      "friends"
    )
  );

  /*
   * We also delete the reciprocal friend
   * documents from other users.
   */
  for (const friendDoc of myFriendsSnap.docs) {
    const friendUid = friendDoc.id;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          friendUid,
          "friends",
          uid
        )
      );
    } catch (err) {
      console.warn(
        "Could not delete reciprocal friend:",
        friendUid,
        err
      );
    }

    await deleteDoc(friendDoc.ref);
  }

  /*
   * ==========================================
   * 2. DELETE FRIEND REQUESTS
   * ==========================================
   */

  const incomingQuery = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid)
  );

  const outgoingQuery = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", uid)
  );

  const [
    incomingSnap,
    outgoingSnap,
  ] = await Promise.all([
    getDocs(incomingQuery),
    getDocs(outgoingQuery),
  ]);

  const requestBatch = writeBatch(db);

  incomingSnap.docs.forEach((d) => {
    requestBatch.delete(d.ref);
  });

  outgoingSnap.docs.forEach((d) => {
    requestBatch.delete(d.ref);
  });

  await requestBatch.commit();

  /*
   * ==========================================
   * 3. REMOVE USER FROM CHATS
   * ==========================================
   *
   * We DO NOT delete the entire chat because
   * other users may still need the conversation.
   */

  const chatsQuery = query(
    collection(db, "chats"),
    where("members", "array-contains", uid)
  );

  const chatsSnap = await getDocs(chatsQuery);

  for (const chatDoc of chatsSnap.docs) {
    const chat = chatDoc.data();

    const newMembers = (
      chat.members || []
    ).filter(
      (memberUid) => memberUid !== uid
    );

    const newMemberNames = {
      ...(chat.memberNames || {}),
    };

    delete newMemberNames[uid];

    const newUnreadCounts = {
      ...(chat.unreadCounts || {}),
    };

    delete newUnreadCounts[uid];

    /*
     * If this was a direct chat and there
     * is nobody left, delete the chat.
     *
     * Otherwise keep the chat for the
     * remaining members.
     */
    if (newMembers.length === 0) {
      await deleteDoc(chatDoc.ref);
    } else {
      await setDoc(
        chatDoc.ref,
        {
          members: newMembers,
          memberNames: newMemberNames,
          unreadCounts: newUnreadCounts,
        },
        {
          merge: true,
        }
      );
    }
  }

  /*
   * ==========================================
   * 4. DELETE FIRESTORE USER DOCUMENT
   * ==========================================
   */

  await deleteDoc(
    doc(db, "users", uid)
  );

  /*
   * ==========================================
   * 5. DELETE FIREBASE AUTH ACCOUNT
   * ==========================================
   */

  await deleteUser(user);
}

/* =========================================================
   FRIENDLY AUTH ERRORS
========================================================= */

export function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use":
      "This email is already registered.",

    "auth/weak-password":
      "Password must be at least 6 characters.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/user-not-found":
      "No account found with this email.",

    "auth/wrong-password":
      "Incorrect password.",

    "auth/invalid-credential":
      "Invalid email or password.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later.",

    "auth/popup-closed-by-user":
      "Sign-in was cancelled.",

    "auth/popup-blocked":
      "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.",

    "auth/cancelled-popup-request":
      "Sign-in was cancelled.",

    "auth/configuration-not-found":
      "Sign-in method isn't enabled yet in Firebase Console.",

    "auth/requires-recent-login":
      "For security, please re-enter your password to confirm this change.",
  };

  return (
    map[error?.code] ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}