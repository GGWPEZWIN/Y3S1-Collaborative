import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  loginUser,
  loginWithGoogle,
  handleGoogleRedirectResult,
  logoutUser,
  friendlyAuthError,
} from "../../firebase/authService";

/**
 * Separate login screen for admins only. This does NOT create accounts —
 * admin accounts must already exist with role: "admin" set on their
 * users/{uid} Firestore doc (set that manually in Firebase Console; see
 * chat history for the steps). If someone already has a regular account,
 * DO NOT delete/recreate it — just add role: "admin" to their existing
 * users/{uid} doc so their existing data (eco_score, friends, etc.) stays
 * intact. Same account, extra permission — not a separate identity.
 *
 * Deliberately does not accept an "admin code" or similar client-side
 * secret — anything in frontend JS can be read via DevTools, so the only
 * real gate is checking the account's actual role after a normal login,
 * whether that login was email/password or Google.
 *
 * Visual design is deliberately distinct from the tourist Login screen —
 * dark slate page + card instead of light green — so it reads immediately
 * as a separate, restricted area rather than just a re-skinned version of
 * the same screen. Structure (icon, title, form, divider, Google button)
 * intentionally mirrors Login.jsx so it's still recognizable as "the same
 * app, admin mode" rather than a jarring unrelated design.
 *
 * File location: src/admin/pages/Adminlogin.jsx — imports below go up TWO
 * levels (../../firebase/...) to reach src/firebase/, not one
 * (../firebase/...), which was the bug that broke this file originally.
 *
 * Usage: <AdminLogin onNavigate={onNavigate} />
 * On success, navigates to "/admin". Wrap your actual /admin route with
 * RequireAdmin regardless — this page is just a nicer front door, not a
 * replacement for that guard.
 */
export default function AdminLogin({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Verifies whichever account just signed in actually has admin access.
  // Signs them back out and shows an error if not.
  const verifyAdminAndProceed = async (user) => {
    if (!user) return; // e.g. mid Google redirect — nothing to check yet

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : null;

    if (role !== "admin") {
      await logoutUser();
      setError("This account doesn't have admin access.");
      return;
    }

    onNavigate?.("/admin");
  };

  // Picks up the result if Google sign-in fell back to a full-page
  // redirect (e.g. popup blocked) and the browser just came back here.
  useEffect(() => {
    (async () => {
      try {
        const user = await handleGoogleRedirectResult();
        if (user) await verifyAdminAndProceed(user);
      } catch (err) {
        setError(friendlyAuthError(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await loginUser({ email: email.trim(), password });
      await verifyAdminAndProceed(user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setError("");
    setSubmitting(true);
    try {
      const user = await loginWithGoogle(); // null if it fell back to redirect
      if (user) await verifyAdminAndProceed(user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <span style={styles.badge}>RESTRICTED</span>

        <div style={styles.iconWrap}>
          <ShieldCheck size={26} color="#e2e8f0" />
        </div>
        <div style={styles.title}>Admin Login</div>
        <div style={styles.subtitle}>Restricted access — admin accounts only</div>

        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            autoComplete="username"
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

        <button type="submit" disabled={submitting} style={styles.submitBtn}>
          {submitting ? "Checking..." : "Log In"}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={submitting}
          style={styles.googleBtn}
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("/login")}
          style={styles.backLink}
        >
          Not an admin? Back to regular login
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
  },
  card: {
    position: "relative",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 32,
    width: "100%",
    maxWidth: 360,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 20px 45px rgba(0,0,0,0.4)",
  },
  badge: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
    color: "#94a3b8",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 999,
    padding: "3px 9px",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: 800, color: "#f1f5f9" },
  subtitle: { fontSize: 12.5, color: "#94a3b8", marginBottom: 8, textAlign: "center" },
  label: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#cbd5e1",
  },
  input: {
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f1f5f9",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  },
  errorBanner: {
    width: "100%",
    textAlign: "center",
    fontSize: 12.5,
    color: "#fca5a5",
    fontWeight: 600,
    padding: "9px 12px",
    background: "rgba(185, 28, 28, 0.15)",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    borderRadius: 10,
  },
  submitBtn: {
    width: "100%",
    border: "none",
    background: "#38bdf8",
    color: "#0f172a",
    borderRadius: 10,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 4,
  },
  divider: { display: "flex", alignItems: "center", gap: 10, width: "100%", margin: "2px 0" },
  dividerLine: { flex: 1, height: 1, background: "#334155" },
  dividerText: { fontSize: 12, color: "#64748b", fontWeight: 600 },
  googleBtn: {
    width: "100%",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 10,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  backLink: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
};