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
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

const googleProvider = new GoogleAuthProvider();

/**
 * Registers a new tourist account.
 **/
export async function registerTourist({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    name,
    name_lower: name.trim().toLowerCase(),
    email,
    role: "tourist",
    eco_score: 0,
    level: 1,
    profile_photo_url: "",
    created_at: serverTimestamp(),
  });

  return user;
}

/**
 * Patches a user doc with a searchable lowercase name if it's missing —
 * covers accounts created before username search existed.
 */
async function ensureSearchFields(userDocRef) {
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    const data = snap.data();
    if (!data.name_lower && data.name) {
      await setDoc(userDocRef, { name_lower: data.name.trim().toLowerCase() }, { merge: true });
    }
  }
}

export async function loginUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const userDocRef = doc(db, "users", user.uid);
  const existingDoc = await getDoc(userDocRef);

  if (!existingDoc.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      name_lower: (user.displayName || "").trim().toLowerCase(),
      email: user.email || "",
      role: "tourist",
      eco_score: 0,
      level: 1,
      profile_photo_url: "",
      created_at: serverTimestamp(),
    });
  } else {
    await ensureSearchFields(userDocRef);
  }

  return user;
}

async function ensureUserDoc(user) {
  const userDocRef = doc(db, "users", user.uid);
  const existingDoc = await getDoc(userDocRef);

  if (!existingDoc.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      name_lower: (user.displayName || "").trim().toLowerCase(),
      email: user.email || "",
      role: "tourist",
      eco_score: 0,
      level: 1,
      profile_photo_url: user.photoURL || "",
      created_at: serverTimestamp(),
    });
  } else {
    await ensureSearchFields(userDocRef);
  }
}

export async function loginWithGoogle() {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;
    await ensureUserDoc(user);
    return user;
  } catch (err) {
    // Popup blocked or unavailable (common inside iframes/embedded previews) —
    // fall back to a full-page redirect flow instead.
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
      return null; // page will navigate away; result is picked up by handleGoogleRedirectResult on return
    }
    throw err;
  }
}

/**
 * Call this once on app startup (e.g. in your top-level App component's
 * useEffect) to pick up the result after a redirect-based Google login.
 * Returns the user if a redirect sign-in just completed, otherwise null.
 */
export async function handleGoogleRedirectResult() {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await ensureUserDoc(result.user);
    return result.user;
  }
  return null;
}

export function logoutUser() {
  return signOut(auth);
}

// Alias — some parts of the codebase (admin module) import this same
// function as "signOutUser" instead of "logoutUser". Both names point to
// the exact same function so either import works.
export const signOutUser = logoutUser;

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Re-authenticates the current user with their password. Firebase requires
 * this to have happened "recently" before allowing email, password, or
 * account-deletion changes — call this right before updateUserEmail,
 * updateUserPassword, or deleteAccount.
 */
export async function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No signed-in user to re-authenticate.");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Updates the user's display name, in both Firebase Auth and their
 * Firestore user doc (keeping name_lower in sync for friend search).
 * Does NOT require re-authentication.
 */
export async function updateUserName(newName) {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Name can't be empty.");

  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");

  await updateProfile(user, { displayName: trimmed });
  await setDoc(
    doc(db, "users", user.uid),
    { name: trimmed, name_lower: trimmed.toLowerCase() },
    { merge: true }
  );
}

/**
 * Updates the user's email address. Requires the caller to have just
 * called reauthenticate(currentPassword) first — Firebase will throw
 * "auth/requires-recent-login" otherwise.
 */
export async function updateUserEmail(newEmail) {
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error("Email can't be empty.");

  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");

  await updateEmail(user, trimmed);
  await setDoc(doc(db, "users", user.uid), { email: trimmed }, { merge: true });
}

/**
 * Updates the user's password. Requires the caller to have just called
 * reauthenticate(currentPassword) first.
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");

  await updatePassword(user, newPassword);
}

/**
 * Permanently deletes the signed-in user's account: their Firestore
 * users/{uid} doc first, then the Firebase Auth user itself. Requires
 * the caller to have just called reauthenticate(currentPassword) first —
 * Firebase throws "auth/requires-recent-login" otherwise, same as
 * updateUserEmail/updateUserPassword.
 *
 * Deletes the Firestore doc before the Auth user on purpose: if the
 * Auth user were deleted first and the Firestore delete then failed,
 * you'd be left with an orphaned Firestore doc and no way to
 * re-authenticate to clean it up. Doing the Firestore delete first means
 * a failure there just leaves the account intact and the error surfaces
 * to the caller normally.
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");

  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
}

/**
 * Turns a Firebase error code into the kind of plain-language message
 * you'd want to show in the UI, instead of "Firebase: Error (auth/...)".
 */
export function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/configuration-not-found": "Sign-in method isn't enabled yet in Firebase Console.",
    "auth/requires-recent-login": "For security, please re-enter your password to confirm this change.",
  };
  return map[error?.code] || error?.message || "Something went wrong. Please try again.";
}