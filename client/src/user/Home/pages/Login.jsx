import React, { useEffect, useState } from "react";
import { Leaf, Mail, Lock, Eye, EyeOff, ShieldCheck, Hotel } from "lucide-react";
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
  const [mode, setMode] = useState("user");
  const isAdminMode = mode === "admin";
  const isHotelMode = mode === "hotel";

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Password reset state
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  // Admin registration state
  const [showAdminRegister, setShowAdminRegister] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Google redirect result
  useEffect(() => {
    (async () => {
      try {
        const user = await handleGoogleRedirectResult();

        if (user) {
          if (isAdminMode) {
            await verifyAdminAndProceed(user);
          } else if (isHotelMode) {
            if (onNavigate) onNavigate("/hotel-dashboard");
          } else {
            if (onNavigate) onNavigate("/dashboard");
          }
        }
      } catch (err) {
        setError(friendlyAuthError(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verify admin role
  const verifyAdminAndProceed = async (user) => {
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : null;

    if (role !== "admin") {
      await logoutUser();
      setError("This account doesn't have admin access.");
      return;
    }

    if (onNavigate) onNavigate("/admin");
  };

  // Switch between User, Hotel, and Admin mode
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setShowReset(false);
    setShowAdminRegister(false);
    setRegError("");
    setLoading(false);
  };

  // Normal login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Hotel portal direct prototype bypass
      if (isHotelMode) {
        setLoading(false);
        if (onNavigate) {
          onNavigate("/hotel-dashboard");
        } else {
          window.location.hash = "/hotel-dashboard";
        }
        return;
      }

      const user = await loginUser({
        email,
        password,
      });

      if (isAdminMode) {
        await verifyAdminAndProceed(user);
      } else {
        if (onNavigate) onNavigate("/dashboard");
      }
    } catch (err) {
      if (isHotelMode) {
        if (onNavigate) {
          onNavigate("/hotel-dashboard");
        } else {
          window.location.hash = "/hotel-dashboard";
        }
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();

      if (isAdminMode) {
        if (user) {
          await verifyAdminAndProceed(user);
        }
      } else if (isHotelMode) {
        if (onNavigate) onNavigate("/hotel-dashboard");
      } else if (user) {
        if (onNavigate) onNavigate("/dashboard");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Password reset
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

  // Admin registration
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setRegError("");

    const cleanEmail = regEmail.trim();

    if (!cleanEmail) {
      setRegError("Please enter an email address.");
      return;
    }

    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }

    setRegLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        regPassword
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        email: cleanEmail,
        role: "admin",
        createdAt: new Date(),
      });

      alert(
        `Admin account created successfully!\n\nEmail: ${cleanEmail}\n\nYou can now log in.`
      );

      setEmail(cleanEmail);
      setPassword("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      setShowRegPassword(false);
      setShowRegConfirmPassword(false);
      setShowAdminRegister(false);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setRegError("This email is already registered. Please use another email.");
      } else if (err.code === "auth/invalid-email") {
        setRegError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setRegError("Password is too weak. Please use at least 6 characters.");
      } else {
        setRegError(friendlyAuthError(err));
      }
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.page,
        ...(isAdminMode ? styles.pageAdmin : {}),
        ...(isHotelMode ? styles.pageHotel : {}),
      }}
    >
      <div
        style={{
          ...styles.card,
          ...(isAdminMode ? styles.cardAdmin : {}),
          ...(isHotelMode ? styles.cardHotel : {}),
        }}
      >
        {/* USER / HOTEL / ADMIN TABS */}
        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => switchMode("user")}
            style={{
              ...styles.tabBtn,
              ...(mode === "user" ? styles.tabBtnActive : {}),
            }}
          >
            Traveler
          </button>

          <button
            type="button"
            onClick={() => switchMode("hotel")}
            style={{
              ...styles.tabBtn,
              ...(isHotelMode ? styles.tabBtnActiveHotel : {}),
            }}
          >
            Hotel
          </button>

          <button
            type="button"
            onClick={() => switchMode("admin")}
            style={{
              ...styles.tabBtn,
              ...(isAdminMode ? styles.tabBtnActiveAdmin : {}),
            }}
          >
            Admin
          </button>
        </div>

        {/* ICON */}
        <div
          style={{
            ...styles.brandIcon,
            ...(isAdminMode ? styles.brandIconAdmin : {}),
            ...(isHotelMode ? styles.brandIconHotel : {}),
          }}
        >
          {isAdminMode ? (
            <ShieldCheck size={26} color="#fff" />
          ) : isHotelMode ? (
            <Hotel size={26} color="#fff" />
          ) : (
            <Leaf size={26} color="#fff" />
          )}
        </div>

        {/* TITLE */}
        <h1
          style={{
            ...styles.title,
            ...(isAdminMode ? styles.titleAdmin : {}),
          }}
        >
          {isAdminMode
            ? showAdminRegister
              ? "Admin Registration"
              : "Admin Login"
            : isHotelMode
            ? "Hotel Management"
            : "Welcome back"}
        </h1>

        {/* SUBTITLE */}
        <p
          style={{
            ...styles.subtitle,
            ...(isAdminMode ? styles.subtitleAdmin : {}),
          }}
        >
          {isAdminMode
            ? showAdminRegister
              ? "Create an admin account"
              : "Restricted access — admin accounts only"
            : isHotelMode
            ? "Log in to view your eco-certification & spot-checks"
            : "Log in to continue your eco-journey"}
        </p>

        {/* LOGIN ERROR */}
        {error && !showAdminRegister && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {/* =====================================================
            ADMIN REGISTRATION FORM
        ===================================================== */}
        {isAdminMode && showAdminRegister ? (
          <form onSubmit={handleAdminRegister} style={styles.form}>
            <label style={styles.labelAdmin}>Email</label>
            <div style={styles.inputWrapAdmin}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  setRegError("");
                }}
                placeholder="admin@example.com"
                required
                autoComplete="email"
                style={styles.inputAdmin}
              />
            </div>

            <label style={styles.labelAdmin}>Password</label>
            <div style={styles.inputWrapAdmin}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type={showRegPassword ? "text" : "password"}
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  setRegError("");
                }}
                placeholder="Create a password (min 6 characters)"
                required
                minLength={6}
                autoComplete="new-password"
                style={styles.inputAdmin}
              />
              <button
                type="button"
                onClick={() => setShowRegPassword((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showRegPassword ? "Hide password" : "Show password"}
              >
                {showRegPassword ? (
                  <EyeOff size={18} color="#64748b" />
                ) : (
                  <Eye size={18} color="#64748b" />
                )}
              </button>
            </div>

            <label style={styles.labelAdmin}>Confirm Password</label>
            <div style={styles.inputWrapAdmin}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type={showRegConfirmPassword ? "text" : "password"}
                value={regConfirmPassword}
                onChange={(e) => {
                  setRegConfirmPassword(e.target.value);
                  setRegError("");
                }}
                placeholder="Re-enter your password"
                required
                minLength={6}
                autoComplete="new-password"
                style={styles.inputAdmin}
              />
              <button
                type="button"
                onClick={() => setShowRegConfirmPassword((s) => !s)}
                style={styles.eyeBtn}
                aria-label={
                  showRegConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showRegConfirmPassword ? (
                  <EyeOff size={18} color="#64748b" />
                ) : (
                  <Eye size={18} color="#64748b" />
                )}
              </button>
            </div>

            {regError && <div style={styles.errorBox}>{regError}</div>}

            <button
              type="submit"
              disabled={regLoading}
              style={{
                ...styles.submitBtnAdmin,
                ...(regLoading ? styles.disabledBtn : {}),
              }}
            >
              {regLoading ? "Creating..." : "Register Admin"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAdminRegister(false);
                setRegError("");
                setRegPassword("");
                setRegConfirmPassword("");
                setShowRegPassword(false);
                setShowRegConfirmPassword(false);
              }}
              style={styles.backToLoginBtn}
            >
              ← Back to Admin Login
            </button>
          </form>
        ) : (
          <>
            {/* GOOGLE LOGIN */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{
                ...styles.googleBtn,
                ...(isAdminMode ? styles.googleBtnAdmin : {}),
              }}
            >
              <GoogleIcon />
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </button>

            {/* DIVIDER */}
            <div style={styles.dividerRow}>
              <div
                style={{
                  ...styles.dividerLine,
                  ...(isAdminMode ? styles.dividerLineAdmin : {}),
                }}
              />
              <span
                style={{
                  ...styles.dividerText,
                  ...(isAdminMode ? styles.dividerTextAdmin : {}),
                }}
              >
                or
              </span>
              <div
                style={{
                  ...styles.dividerLine,
                  ...(isAdminMode ? styles.dividerLineAdmin : {}),
                }}
              />
            </div>

            {/* EMAIL / PASSWORD LOGIN */}
            <form onSubmit={handleLogin} style={styles.form}>
              <label
                style={{
                  ...styles.label,
                  ...(isAdminMode ? styles.labelAdmin : {}),
                }}
              >
                {isHotelMode ? "Partner Email" : "Email"}
              </label>

              <div
                style={{
                  ...styles.inputWrap,
                  ...(isAdminMode ? styles.inputWrapAdmin : {}),
                }}
              >
                <Mail
                  size={18}
                  color={isAdminMode ? "#64748b" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isHotelMode ? "hotel@greentrip.com" : "you@example.com"}
                  required
                  autoComplete="email"
                  style={{
                    ...styles.input,
                    ...(isAdminMode ? styles.inputAdmin : {}),
                  }}
                />
              </div>

              <label
                style={{
                  ...styles.label,
                  ...(isAdminMode ? styles.labelAdmin : {}),
                }}
              >
                Password
              </label>

              <div
                style={{
                  ...styles.inputWrap,
                  ...(isAdminMode ? styles.inputWrapAdmin : {}),
                }}
              >
                <Lock
                  size={18}
                  color={isAdminMode ? "#64748b" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    ...styles.input,
                    ...(isAdminMode ? styles.inputAdmin : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      color={isAdminMode ? "#64748b" : "#9ca3af"}
                    />
                  ) : (
                    <Eye
                      size={18}
                      color={isAdminMode ? "#64748b" : "#9ca3af"}
                    />
                  )}
                </button>
              </div>

              {/* FORGOT PASSWORD */}
              {!isAdminMode && (
                <button
                  type="button"
                  onClick={() => setShowReset((s) => !s)}
                  style={{
                    ...styles.forgotBtn,
                    ...(isHotelMode ? { color: "#d97706" } : {}),
                  }}
                >
                  Forgot Password?
                </button>
              )}

              {/* RESET PASSWORD */}
              {showReset && !isAdminMode && (
                <div style={styles.resetBox}>
                  <p style={styles.resetText}>
                    Enter your email and we'll send a reset link.
                  </p>
                  <div style={styles.resetRow}>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={styles.resetInput}
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      style={styles.resetBtn}
                    >
                      Send
                    </button>
                  </div>
                  {resetStatus && (
                    <p style={styles.resetStatus}>{resetStatus}</p>
                  )}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitBtn,
                  ...(isAdminMode ? styles.submitBtnAdmin : {}),
                  ...(isHotelMode ? styles.submitBtnHotel : {}),
                  ...(loading ? styles.disabledBtn : {}),
                }}
              >
                {loading
                  ? "Checking..."
                  : isHotelMode
                  ? "Log In to Hotel Portal"
                  : "Log In"}
              </button>
            </form>

            {/* BOTTOM NAVIGATION LINKS */}
            {isAdminMode ? (
              <p style={styles.switchText}>
                Don't have an admin account?{" "}
                <span
                  style={styles.switchLinkAdmin}
                  onClick={() => {
                    setShowAdminRegister(true);
                    setRegError("");
                  }}
                >
                  Register as Admin
                </span>
              </p>
            ) : isHotelMode ? (
              <p style={styles.switchText}>
                New hotel partner?{" "}
                <span
                  style={styles.switchLinkHotel}
                  onClick={() => onNavigate?.("/register")}
                >
                  Register hotel property
                </span>
              </p>
            ) : (
              <p style={styles.switchText}>
                Don't have an account?{" "}
                <span
                  style={styles.switchLink}
                  onClick={() => onNavigate?.("/register")}
                >
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

// =========================================================
// GOOGLE ICON
// =========================================================

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 .96 13.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f2f3f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
    transition: "background 0.2s",
    boxSizing: "border-box",
  },

  pageAdmin: {
    background: "#0f172a",
  },

  pageHotel: {
    background: "#fdf8f6",
  },

  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.06)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  cardAdmin: {
    background: "#1e293b",
    border: "1px solid #334155",
    boxShadow:
      "0 20px 45px rgba(0,0,0,0.4)",
  },

  cardHotel: {
    background: "#fff",
    border: "1px solid #fed7aa",
    boxShadow:
      "0 10px 30px rgba(217, 119, 6, 0.08)",
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
    transition: "all 0.15s ease",
  },

  tabBtnActive: {
    background: "#fff",
    color: "#16a34a",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.08)",
  },

  tabBtnActiveAdmin: {
    background: "#0f172a",
    color: "#38bdf8",
  },

  tabBtnActiveHotel: {
    background: "#fff",
    color: "#d97706",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.08)",
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

  brandIconAdmin: {
    background: "#334155",
  },

  brandIconHotel: {
    background: "#f59e0b",
  },

  title: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },

  titleAdmin: {
    color: "#f1f5f9",
  },

  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
  },

  subtitleAdmin: {
    color: "#94a3b8",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 13.5,
    padding: "10px 14px",
    borderRadius: 10,
    marginBottom: 16,
    textAlign: "left",
    lineHeight: 1.4,
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

  googleBtnAdmin: {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#e2e8f0",
  },

  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },

  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e5e7eb",
  },

  dividerLineAdmin: {
    background: "#334155",
  },

  dividerText: {
    fontSize: 12.5,
    color: "#9ca3af",
  },

  dividerTextAdmin: {
    color: "#64748b",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    textAlign: "left",
  },

  label: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    marginTop: 10,
    marginBottom: 4,
  },

  labelAdmin: {
    color: "#cbd5e1",
  },

  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#f9fafb",
    minHeight: 48,
    boxSizing: "border-box",
  },

  inputWrapAdmin: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "11px 12px",
    background: "#0f172a",
    minHeight: 48,
    boxSizing: "border-box",
  },

  inputIcon: {
    flexShrink: 0,
  },

  input: {
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#111827",
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    fontFamily: "inherit",
  },

  inputAdmin: {
    color: "#f1f5f9",
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14.5,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  eyeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    flexShrink: 0,
  },

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

  resetBox: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },

  resetText: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 10px",
  },

  resetRow: {
    display: "flex",
    gap: 8,
  },

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

  resetStatus: {
    fontSize: 12.5,
    color: "#16a34a",
    marginTop: 8,
    marginBottom: 0,
  },

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

  submitBtnAdmin: {
    marginTop: 20,
    background: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: 10,
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  submitBtnHotel: {
    marginTop: 20,
    background: "#d97706",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledBtn: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  switchText: {
    fontSize: 13.5,
    color: "#6b7280",
    marginTop: 24,
  },

  switchLink: {
    color: "#16a34a",
    fontWeight: 700,
    cursor: "pointer",
  },

  switchLinkAdmin: {
    color: "#38bdf8",
    fontWeight: 700,
    cursor: "pointer",
  },

  switchLinkHotel: {
    color: "#d97706",
    fontWeight: 700,
    cursor: "pointer",
  },

  backToLoginBtn: {
    marginTop: 10,
    background: "none",
    border: "none",
    color: "#38bdf8",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
    alignSelf: "center",
  },
};