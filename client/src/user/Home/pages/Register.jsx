import React, { useEffect, useState } from "react";
import { Leaf, User, Mail, Lock, Eye, EyeOff, Hotel } from "lucide-react";
import { registerTourist, registerHotel, friendlyAuthError } from "../../../firebase/authService";

export default function Register({ onNavigate, initialMode = "traveler" }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("registerMode");
      if (saved === "hotel" || saved === "traveler") {
        return saved;
      }
      if (window.location.hash.includes("hotel")) {
        return "hotel";
      }
    }
    return initialMode;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("registerMode");
    }
  }, []);

  const isHotelMode = mode === "hotel";

  // Traveler state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hotel state (Email & Password)
  const [hotelEmail, setHotelEmail] = useState("");
  const [hotelPassword, setHotelPassword] = useState("");
  const [hotelConfirmPassword, setHotelConfirmPassword] = useState("");
  const [showHotelPassword, setShowHotelPassword] = useState(false);
  const [showHotelConfirm, setShowHotelConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTravelerSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerTourist({ name: name.trim(), email: email.trim(), password });
      onNavigate("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleHotelSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = hotelEmail.trim();

    if (!cleanEmail) {
      setError("Business email is required.");
      return;
    }
    if (hotelPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (hotelPassword !== hotelConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerHotel({ email: cleanEmail, password: hotelPassword });

      alert("Hotel partner account created! Please log in to complete your certification application.");

      // Store hotel login preference
      if (typeof window !== "undefined") {
        sessionStorage.setItem("loginMode", "hotel");
      }
      onNavigate("/login");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("loginMode", isHotelMode ? "hotel" : "user");
    }
    onNavigate("/login");
  };

  return (
    <div
      style={{
        ...styles.page,
        ...(isHotelMode ? styles.pageHotel : {}),
      }}
    >
      <div
        style={{
          ...styles.card,
          ...(isHotelMode ? styles.cardHotel : {}),
        }}
      >
        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => {
              setMode("traveler");
              setError("");
            }}
            style={{
              ...styles.tabBtn,
              ...(!isHotelMode ? styles.tabBtnActive : {}),
            }}
          >
            Traveler
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("hotel");
              setError("");
            }}
            style={{
              ...styles.tabBtn,
              ...(isHotelMode ? styles.tabBtnActiveHotel : {}),
            }}
          >
            Hotel Partner
          </button>
        </div>

        <div
          style={{
            ...styles.brandIcon,
            ...(isHotelMode ? styles.brandIconHotel : {}),
          }}
        >
          {isHotelMode ? (
            <Hotel size={26} color="#fff" />
          ) : (
            <Leaf size={26} color="#fff" />
          )}
        </div>

        <h1 style={styles.title}>
          {isHotelMode ? "Register Hotel Partner" : "Join GreenTrip Malaysia"}
        </h1>
        <p style={styles.subtitle}>
          {isHotelMode
            ? "Create an account to begin your eco-certification audit"
            : "Create your traveler account"}
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        {isHotelMode ? (
          <form onSubmit={handleHotelSubmit} style={styles.form}>
            <label style={styles.label}>Business Email</label>
            <div style={styles.inputWrap}>
              <Mail size={18} color="#9ca3af" />
              <input
                type="email"
                value={hotelEmail}
                onChange={(e) => setHotelEmail(e.target.value)}
                placeholder="partner@hotel.com"
                required
                style={styles.input}
              />
            </div>

            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <Lock size={18} color="#9ca3af" />
              <input
                type={showHotelPassword ? "text" : "password"}
                value={hotelPassword}
                onChange={(e) => setHotelPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowHotelPassword((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showHotelPassword ? "Hide password" : "Show password"}
              >
                {showHotelPassword ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </button>
            </div>

            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrap}>
              <Lock size={18} color="#9ca3af" />
              <input
                type={showHotelConfirm ? "text" : "password"}
                value={hotelConfirmPassword}
                onChange={(e) => setHotelConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowHotelConfirm((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showHotelConfirm ? "Hide password" : "Show password"}
              >
                {showHotelConfirm ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtnHotel}>
              {loading ? "Creating Account..." : "Create Hotel Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTravelerSubmit} style={styles.form}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrap}>
              <User size={18} color="#9ca3af" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Keshi Tan"
                required
                style={styles.input}
              />
            </div>

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
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </button>
            </div>

            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrap}>
              <Lock size={18} color="#9ca3af" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p style={styles.switchText}>
          Already have an account?{" "}
          <span
            style={isHotelMode ? styles.switchLinkHotel : styles.switchLink}
            onClick={handleGoToLogin}
          >
            Log In
          </span>
        </p>
      </div>
    </div>
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
    boxSizing: "border-box",
  },
  pageHotel: { background: "#fdf8f6" },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 36px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    textAlign: "center",
    boxSizing: "border-box",
  },
  cardHotel: { border: "1px solid #fed7aa", boxShadow: "0 10px 30px rgba(217, 119, 6, 0.08)" },
  tabRow: { display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20 },
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
  tabBtnActive: { background: "#fff", color: "#16a34a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  tabBtnActiveHotel: { background: "#fff", color: "#d97706", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  brandIconHotel: { background: "#f59e0b" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", fontSize: 14, marginTop: 6, marginBottom: 20 },
  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 13.5,
    padding: "10px 14px",
    borderRadius: 10,
    marginBottom: 16,
    textAlign: "left",
  },
  form: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 8, marginBottom: 2 },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#f9fafb",
    minHeight: 46,
    boxSizing: "border-box",
  },
  input: { border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, minWidth: 0 },
  eyeBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0 },
  submitBtn: {
    marginTop: 18,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  submitBtnHotel: {
    marginTop: 18,
    background: "#d97706",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  switchText: { fontSize: 13.5, color: "#6b7280", marginTop: 20 },
  switchLink: { color: "#16a34a", fontWeight: 700, cursor: "pointer" },
  switchLinkHotel: { color: "#d97706", fontWeight: 700, cursor: "pointer" },
};