import React, { useState } from "react";
import { Leaf, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { loginUser, loginWithGoogle, resetPassword, friendlyAuthError } from "../../../firebase/authService";

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser({ email, password });
      onNavigate("/dashboard");
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
      await loginWithGoogle();
      onNavigate("/dashboard");
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brandIcon}>
          <Leaf size={26} color="#fff" />
        </div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Log in to continue your eco-journey</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} style={styles.googleBtn}>
          <GoogleIcon />
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Email</label>
          <div style={styles.inputWrap}>
            <Mail size={18} color="#9ca3af" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          <label style={styles.label}>Password</label>
          <div style={styles.inputWrap}>
            <Lock size={18} color="#9ca3af" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={styles.eyeBtn}
            >
              {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowReset((s) => !s)}
            style={styles.forgotBtn}
          >
            Forgot Password?
          </button>

          {showReset && (
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

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{" "}
          <span style={styles.switchLink} onClick={() => onNavigate("/register")}>
            Sign Up
          </span>
        </p>

        {/* Admin entry point — deliberately understated (small, gray, icon-led)
            so it doesn't compete with the primary tourist flow above, but is
            still easy to find for the people who actually need it. */}
        <button
          type="button"
          onClick={() => onNavigate("/admin-login")}
          style={styles.adminSwitchBtn}
        >
          <ShieldCheck size={14} />
          Switch to Admin Login
        </button>
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
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
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
  title: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", fontSize: 14, marginTop: 6, marginBottom: 28 },
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
  dividerRow: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0" },
  dividerLine: { flex: 1, height: 1, background: "#e5e7eb" },
  dividerText: { fontSize: 12.5, color: "#9ca3af" },
  form: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  label: { fontSize: 13.5, fontWeight: 600, color: "#374151", marginTop: 10, marginBottom: 4 },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#f9fafb",
  },
  input: { border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14.5 },
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
  switchText: { fontSize: 13.5, color: "#6b7280", marginTop: 24 },
  switchLink: { color: "#16a34a", fontWeight: 700, cursor: "pointer" },
  adminSwitchBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: "18px auto 0",
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: "6px 10px",
  },
};