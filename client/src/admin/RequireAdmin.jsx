import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCurrentUser } from "../firebase/useCurrentUser";

/**
 * Wrap any admin-only page with this. Re-checks the signed-in user's
 * actual role on their Firestore users/{uid} doc — not just "did they
 * arrive via AdminLogin" — so typing #/admin directly in the URL bar
 * (or a stale session) can't bypass the gate.
 *
 * Usage (in App.jsx):
 *   case "/admin":
 *     return (
 *       <RequireAdmin onNavigate={navigate}>
 *         <AdminDashboard onNavigate={navigate} />
 *       </RequireAdmin>
 *     );
 */
export default function RequireAdmin({ children, onNavigate }) {
  const { authUser, loading: userLoading } = useCurrentUser();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRole() {
      if (userLoading) return; // wait for auth state to resolve first

      if (!authUser) {
        if (!cancelled) {
          setChecking(false);
          setIsAdmin(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", authUser.uid));
        const role = snap.exists() ? snap.data().role : null;
        if (!cancelled) {
          setIsAdmin(role === "admin");
          setChecking(false);
        }
      } catch (err) {
        console.error("RequireAdmin role check failed:", err);
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
        }
      }
    }

    checkRole();
    return () => {
      cancelled = true;
    };
  }, [authUser, userLoading]);

  if (userLoading || checking) {
    return (
      <div style={styles.page}>
        <p style={styles.text}>Checking access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.page}>
        <p style={styles.text}>You don't have access to this page.</p>
        <button
          type="button"
          onClick={() => onNavigate?.("/admin-login")}
          style={styles.btn}
        >
          Go to Admin Login
        </button>
      </div>
    );
  }

  return children;
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  text: { color: "#6b7280", fontSize: 14.5 },
  btn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};