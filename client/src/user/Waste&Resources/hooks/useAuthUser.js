import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../firebase/config";

/**
 * Subscribes to Firebase Auth. Status is one of:
 *   loading | signedIn | signedOut
 *
 * setState happens inside the auth callback — an external system pushing
 * updates into React — never synchronously in the effect body.
 */
export default function useAuthUser() {
  const [state, setState] = useState({ status: "loading", user: null });

  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (user) => setState({ status: user ? "signedIn" : "signedOut", user }),
        () => setState({ status: "signedOut", user: null })
      ),
    []
  );

  return state;
}