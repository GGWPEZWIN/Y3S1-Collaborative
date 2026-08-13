import React, { useState } from "react";
import { ChevronLeft, LogOut, Leaf, Award, Calendar, Mail } from "lucide-react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { logoutUser } from "../../../firebase/authService";

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Profile({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      onNavigate("/login");
    } catch (err) {
      alert("Failed to log out: " + err.message);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading profile...</p>
      </div>
    );
  }

  // Shouldn't normally happen (route should be protected), but handle gracefully.
  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>You're not logged in.</p>
        <button type="button" onClick={() => onNavigate("/login")} style={styles.loginRedirectBtn}>
          Go to Login
        </button>
      </div>
    );
  }

  const layoutUser = { name: profile.name, ecoScore: profile.eco_score ?? 0 };

  return (
    <Layout active="" user={layoutUser} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button type="button" onClick={() => onNavigate("/dashboard")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        <h1 style={styles.title}>Profile</h1>
        <p style={styles.subtitle}>Your account details</p>

        <div style={styles.card}>
          <div style={styles.avatarRow}>
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={profile.name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarFallback}>{(profile.name || "?").charAt(0).toUpperCase()}</div>
            )}
            <div>
              <div style={styles.name}>{profile.name || "Unnamed traveler"}</div>
              <div style={styles.role}>{profile.role === "tourist" ? "Traveler" : profile.role}</div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoRow}>
              <Mail size={16} color="#9ca3af" />
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{profile.email}</span>
            </div>
            <div style={styles.infoRow}>
              <Leaf size={16} color="#16a34a" />
              <span style={styles.infoLabel}>Eco Score</span>
              <span style={styles.infoValue}>{(profile.eco_score ?? 0).toLocaleString()}</span>
            </div>
            <div style={styles.infoRow}>
              <Award size={16} color="#f97316" />
              <span style={styles.infoLabel}>Level</span>
              <span style={styles.infoValue}>{profile.level ?? 1}</span>
            </div>
            <div style={styles.infoRow}>
              <Calendar size={16} color="#7c3aed" />
              <span style={styles.infoLabel}>Member since</span>
              <span style={styles.infoValue}>{formatDate(profile.created_at)}</span>
            </div>
          </div>

          <button type="button" onClick={handleLogout} disabled={loggingOut} style={styles.logoutBtn}>
            <LogOut size={16} />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  loginRedirectBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: { padding: "28px 32px", maxWidth: 640, width: "100%", margin: "0 auto", textAlign: "left" },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 28,
  },
  avatarRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 },
  avatarImg: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
  },
  name: { fontSize: 20, fontWeight: 700, color: "#111827" },
  role: { fontSize: 13.5, color: "#9ca3af", marginTop: 2 },
  infoGrid: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 },
  infoRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 },
  infoLabel: { color: "#6b7280", minWidth: 100 },
  infoValue: { color: "#111827", fontWeight: 600 },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};