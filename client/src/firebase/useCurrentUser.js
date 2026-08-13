import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./config";

/**
 * useCurrentUser
 *
 * Tracks both the Firebase Auth user and their matching Firestore profile
 * instead of hardcoding { name: "Keshi", ecoScore: 8750 } — it stays in sync
 * automatically if the profile changes (e.g. eco_score updates elsewhere).
 *
 */
export function useCurrentUser() {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const unsubscribeDoc = onSnapshot(doc(db, "users", authUser.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsubscribeDoc;
  }, [authUser]);

  return { authUser, profile, loading };
}