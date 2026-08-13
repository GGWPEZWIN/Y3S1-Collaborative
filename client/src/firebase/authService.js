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
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
    email,
    role: "tourist",
    eco_score: 0,
    level: 1,
    profile_photo_url: "",
    created_at: serverTimestamp(),
  });

  return user;
}

export async function loginUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const userDocRef = doc(db, "users", user.uid);
  const existingDoc = await getDoc(userDocRef);

  if (!existingDoc.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      email: user.email || "",
      role: "tourist",
      eco_score: 0,
      level: 1,
      profile_photo_url: "",
      created_at: serverTimestamp(),
    });
  }

  return user;
}

async function ensureUserDoc(user) {
  const userDocRef = doc(db, "users", user.uid);
  const existingDoc = await getDoc(userDocRef);

  if (!existingDoc.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      email: user.email || "",
      role: "tourist",
      eco_score: 0,
      level: 1,
      profile_photo_url: user.photoURL || "",
      created_at: serverTimestamp(),
    });
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

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
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
  };
  return map[error?.code] || error?.message || "Something went wrong. Please try again.";
}