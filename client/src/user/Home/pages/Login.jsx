import React, { useEffect, useState } from "react";
import { Leaf, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  loginUser,
  loginWithGoogle,
  handleGoogleRedirectResult,
  logoutUser,
  resetPassword,
  friendlyAuthError,
} from "../../../firebase/authService";

export default function Login({ onNavigate }) {
  const [mode, setMode] = useState("user"); // "user" | "admin"
  const [isAdminMode, setIsAdminMode] = useState(mode === "admin");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Password reset state (user mode only)
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  // Admin registration state
  const [showAdminRegister, setShowAdminRegister] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Keep isAdminMode in sync with mode
  useEffect(() => {
    setIsAdminMode(mode === "admin");
  }, [mode]);

  // Google redirect result
  useEffect(() => {
    (async () => {
      try {
        const user = await handleGoogleRedirectResult();
        if (user && isAdminMode) await verifyAdminAndProceed(user);
      } catch (err) {
        setError(friendlyAuthError(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAdminAndProceed = async (user) => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : null;
    if (role !== "admin") {
      await logoutUser();
      setError("This account doesn't have admin access.");
      return;
    }
    onNavigate("/admin");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setShowReset(false);
    setShowAdminRegister(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await loginUser({ email, password });
      if (isAdminMode) {
        await verifyAdminAndProceed(user);
      } else {
        onNavigate("/dashboard");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      if (isAdminMode) {
        if (user) await verifyAdminAndProceed(user);
      } else if (user) {
        onNavigate("/dashboard");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetStatus("");
    try {
      await resetPassword(resetEmail);
      setResetStatus("Reset link sent — check your inbox.");
    } catch (err) {
      setResetStatus(friendlyAuthError(err));
    }
  };

  // Admin registration handler (NO invite code)
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      // Create user with email/password
      const userCred = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      console.log("Auth user created:", userCred.user.uid);
      
      // Set role to admin in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: regEmail,
        role: "admin",
        createdAt: new Date(),
      });
      console.log("Firestore doc created with admin role");
      
      // Show success message
      alert(`Admin account created successfully!\nEmail: ${regEmail}\nPlease login now.`);
      
      // Pre-fill login form with new email
      setEmail(regEmail);
      setPassword("");
      
      // Switch back to login
      setShowAdminRegister(false);
      
      // Clear registration fields
      setRegEmail("");
      setRegPassword("");
      
    } catch (err) {
      console.error("Registration error:", err.code, err.message);
      setRegError(friendlyAuthError(err));
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{ ...styles.page, ...(isAdminMode ? styles.pageAdmin : {}) }}>
      <div style={{ ...styles.card, ...(isAdminMode ? styles.cardAdmin : {}) }}>
        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => switchMode("user")}
            style={{ ...styles.tabBtn, ...(!isAdminMode ? styles.tabBtnActive : {}) }}
          >
            Traveler
          </button>
          <button
            type="button"
            onClick={() => switchMode("admin")}
            style={{ ...styles.tabBtn, ...(isAdminMode ? styles.tabBtnActiveAdmin : {}) }}
          >
            Admin
          </button>
        </div>

        <div style={{ ...styles.brandIcon, ...(isAdminMode ? styles.brandIconAdmin : {}) }}>
          {isAdminMode ? <ShieldCheck size={26} color="#fff" /> : <Leaf size={26} color="#fff" />}
        </div>
        <h1 style={{ ...styles.title, ...(isAdminMode ? styles.titleAdmin : {}) }}>
          {isAdminMode ? (showAdminRegister ? "Admin Registration" : "Admin Login") : "Welcome back"}
        </h1>
        <p style={{ ...styles.subtitle, ...(isAdminMode ? styles.subtitleAdmin : {}) }}>
          {isAdminMode
            ? showAdminRegister
              ? "Create an admin account"
              : "Restricted access — admin accounts only"
            : "Log in to continue your eco-journey"}
        </p>

        {error && !showAdminRegister && <div style={styles.errorBox}>{error}</div>}

        {/* ============ ADMIN REGISTRATION FORM ============ */}
        {isAdminMode && showAdminRegister ? (
          <form onSubmit={handleAdminRegister} style={styles.form}>
            <label style={styles.labelAdmin}>Email</label>
            <div style={styles.inputWrapAdmin}>
              <Mail size={18} color="#64748b" />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                style={styles.inputAdmin}
              />
            </div>

            <label style={styles.labelAdmin}>Password</label>
            <div style={styles.inputWrapAdmin}>
              <Lock size={18} color="#64748b" />
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                required
                minLength={6}
                style={styles.inputAdmin}
              />
            </div>

            {regError && <div style={styles.errorBox}>{regError}</div>}

            <button
              type="submit"
              disabled={regLoading}
              style={styles.submitBtnAdmin}
            >
              {regLoading ? "Creating..." : "Register Admin"}
            </button>

            <button
              type="button"
              onClick={() => setShowAdminRegister(false)}
              style={styles.backToLoginBtn}
            >
              ← Back to Admin Login
            </button>
          </form>
        ) : (
          <>
            {/* ============ GOOGLE LOGIN BUTTON ============ */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{ ...styles.googleBtn, ...(isAdminMode ? styles.googleBtnAdmin : {}) }}
            >
              <GoogleIcon />
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </button>

            <div style={styles.dividerRow}>
              <div style={{ ...styles.dividerLine, ...(isAdminMode ? styles.dividerLineAdmin : {}) }} />
              <span style={{ ...styles.dividerText, ...(isAdminMode ? styles.dividerTextAdmin : {}) }}>or</span>
              <div style={{ ...styles.dividerLine, ...(isAdminMode ? styles.dividerLineAdmin : {}) }} />
            </div>

            {/* ============ EMAIL / PASSWORD LOGIN FORM ============ */}
            <form onSubmit={handleLogin} style={styles.form}>
              <label style={{ ...styles.label, ...(isAdminMode ? styles.labelAdmin : {}) }}>Email</label>
              <div style={{ ...styles.inputWrap, ...(isAdminMode ? styles.inputWrapAdmin : {}) }}>
                <Mail size={18} color={isAdminMode ? "#64748b" : "#9ca3af"} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ ...styles.input, ...(isAdminMode ? styles.inputAdmin : {}) }}
                />
              </div>

              <label style={{ ...styles.label, ...(isAdminMode ? styles.labelAdmin : {}) }}>Password</label>
              <div style={{ ...styles.inputWrap, ...(isAdminMode ? styles.inputWrapAdmin : {}) }}>
                <Lock size={18} color={isAdminMode ? "#64748b" : "#9ca3af"} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ ...styles.input, ...(isAdminMode ? styles.inputAdmin : {}) }}
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff size={18} color={isAdminMode ? "#64748b" : "#9ca3af"} />
                  ) : (
                    <Eye size={18} color={isAdminMode ? "#64748b" : "#9ca3af"} />
                  )}
                </button>
              </div>

              {!isAdminMode && (
                <button type="button" onClick={() => setShowReset((s) => !s)} style={styles.forgotBtn}>
                  Forgot Password?
                </button>
              )}

              {showReset && !isAdminMode && (
                <div style={styles.resetBox}>
                  <p style={styles.resetText}>Enter your email and we'll send a reset link.</p>
                  <div style={styles.resetRow}>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={styles.resetInput}
                    />
                    <button type="button" onClick={handleReset} style={styles.resetBtn}>
                      Send
                    </button>
                  </div>
                  {resetStatus && <p style={styles.resetStatus}>{resetStatus}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ ...styles.submitBtn, ...(isAdminMode ? styles.submitBtnAdmin : {}) }}
              >
                {loading ? "Checking..." : "Log In"}
              </button>
            </form>

            {/* ============ REGISTER LINK (Admin only) ============ */}
            {isAdminMode && (
              <p style={styles.switchText}>
                Don't have an admin account?{" "}
                <span style={styles.switchLink} onClick={() => setShowAdminRegister(true)}>
                  Register as Admin
                </span>
              </p>
            )}

            {!isAdminMode && (
              <p style={styles.switchText}>
                Don't have an account?{" "}
                <span style={styles.switchLink} onClick={() => onNavigate("/register")}>
                  Sign Up
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f2f3f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
    transition: "background 0.2s",
  },
  pageAdmin: { background: "#0f172a" },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
  cardAdmin: {
    background: "#1e293b",
    border: "1px solid #334155",
    boxShadow: "0 20px 45px rgba(0,0,0,0.4)",
  },
  tabRow: {
    display: "flex",
    gap: 4,
    background: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    borderRadius: 8,
    padding: "9px 0",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#6b7280",
    cursor: "pointer",
  },
  tabBtnActive: { background: "#fff", color: "#16a34a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  tabBtnActiveAdmin: { background: "#0f172a", color: "#38bdf8" },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  brandIconAdmin: { background: "#334155" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  titleAdmin: { color: "#f1f5f9" },
  subtitle: { color: "#6b7280", fontSize: 14, marginTop: 6, marginBottom: 28 },
  subtitleAdmin: { color: "#94a3b8" },
  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 13.5,
    padding: "10px 14px",
    borderRadius: 10,
    marginBottom: 16,
    textAlign: "left",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14.5,
    fontWeight: 600,
    color: "#111827",
    cursor: "pointer",
  },
  googleBtnAdmin: { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" },
  dividerRow: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0" },
  dividerLine: { flex: 1, height: 1, background: "#e5e7eb" },
  dividerLineAdmin: { background: "#334155" },
  dividerText: { fontSize: 12.5, color: "#9ca3af" },
  dividerTextAdmin: { color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  label: { fontSize: 13.5, fontWeight: 600, color: "#374151", marginTop: 10, marginBottom: 4 },
  labelAdmin: { color: "#cbd5e1" },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#f9fafb",
  },
  inputWrapAdmin: { border: "1px solid #334155", background: "#0f172a" },
  input: { border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14.5 },
  inputAdmin: { color: "#f1f5f9" },
  eyeBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex" },
  forgotBtn: {
    alignSelf: "flex-end",
    border: "none",
    background: "transparent",
    color: "#16a34a",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    padding: "6px 0",
  },
  resetBox: { background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 4 },
  resetText: { fontSize: 13, color: "#6b7280", margin: "0 0 10px" },
  resetRow: { display: "flex", gap: 8 },
  resetInput: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13.5,
    outline: "none",
  },
  resetBtn: {
    border: "none",
    background: "#111827",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  resetStatus: { fontSize: 12.5, color: "#16a34a", marginTop: 8, marginBottom: 0 },
  submitBtn: {
    marginTop: 20,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  submitBtnAdmin: { background: "#38bdf8", color: "#0f172a", fontWeight: 800 },
  switchText: { fontSize: 13.5, color: "#6b7280", marginTop: 24 },
  switchLink: { color: "#16a34a", fontWeight: 700, cursor: "pointer" },
  backToLoginBtn: {
    marginTop: 10,
    background: "none",
    border: "none",
    color: "#38bdf8",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
  },
};