import React, { useEffect, useState } from "react";
import { LayoutDashboard, Award, Trophy, LogOut, Leaf } from "lucide-react";
import { useCurrentUser } from "../firebase/useCurrentUser";
import { signOutUser } from "../firebase/authService";
import { listenToAchievements } from "../firebase/achievementService";
import { listenToChallenges } from "../firebase/challengeService";
import AdminChallengesPage from "./Challenges/AdminChallengesPage";
import AdminAchievementsPage from "./Achievement/AdminAchievementsPage";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "challenges", label: "Challenges", icon: Trophy },
];

/**
 * Top-level admin shell. Wrap this with RequireAdmin at the route level:
 *   <RequireAdmin onNavigate={onNavigate}>
 *     <AdminDashboard onNavigate={onNavigate} />
 *   </RequireAdmin>
 *
 * Tab switching is internal state, not real routes — simplest option for
 * a small admin panel. Swap for onNavigate("/admin/achievements") etc.
 * later if you want deep-linkable admin URLs.
 */
export default function AdminDashboard({ onNavigate }) {
  const { profile } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [achievementCount, setAchievementCount] = useState(null);
  const [challengeCount, setChallengeCount] = useState(null);

  useEffect(() => {
    const unsubA = listenToAchievements((list) => setAchievementCount(list.length));
    const unsubC = listenToChallenges((list) => setChallengeCount(list.length));
    return () => {
      unsubA();
      unsubC();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
      onNavigate?.("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <Leaf size={20} color="#16a34a" />
          <span style={styles.brandText}>Admin</span>
        </div>

        <nav style={styles.nav}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.adminName}>{profile?.name || "Admin"}</div>
          <button type="button" onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      <main style={styles.content}>
        {activeTab === "overview" && (
          <div>
            <div style={styles.overviewTitle}>Overview</div>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <Award size={22} color="#16a34a" />
                <div style={styles.statValue}>{achievementCount ?? "—"}</div>
                <div style={styles.statLabel}>Achievements</div>
              </div>
              <div style={styles.statCard}>
                <Trophy size={22} color="#16a34a" />
                <div style={styles.statValue}>{challengeCount ?? "—"}</div>
                <div style={styles.statLabel}>Challenges</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "achievements" && <AdminAchievementsPage />}
        {activeTab === "challenges" && <AdminChallengesPage />}
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "20px 14px",
  },
  brand: { display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24 },
  brandText: { fontSize: 16, fontWeight: 800, color: "#111827" },
  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    background: "transparent",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: { background: "#dcfce7", color: "#15803d" },
  sidebarFooter: {
    borderTop: "1px solid #f3f4f6",
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  adminName: { fontSize: 12.5, fontWeight: 700, color: "#374151", padding: "0 8px" },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#b91c1c",
    cursor: "pointer",
  },
  content: { flex: 1, padding: "28px 32px", overflowY: "auto" },
  overviewTitle: { fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 20 },
  statsRow: { display: "flex", gap: 16 },
  statCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    minWidth: 150,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statValue: { fontSize: 26, fontWeight: 800, color: "#111827" },
  statLabel: { fontSize: 12.5, color: "#9ca3af", fontWeight: 600 },
};