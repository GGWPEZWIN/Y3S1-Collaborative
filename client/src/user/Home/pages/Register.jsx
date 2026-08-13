import React, { useState } from "react";
import { Leaf, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { registerTourist, friendlyAuthError } from "../../../firebase/authService";

export default function Register({ onNavigate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brandIcon}>
          <Leaf size={26} color="#fff" />
        </div>
        <h1 style={styles.title}>Join GreenTrip Malaysia</h1>
        <p style={styles.subtitle}>Create your traveler account</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
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
              style={styles.input}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
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
              style={styles.input}
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} style={styles.eyeBtn}>
              {showConfirm ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </button>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{" "}
          <span style={styles.switchLink} onClick={() => onNavigate("/login")}>
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
};