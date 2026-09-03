import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Award,
  Trophy,
  LogOut,
  Leaf,
} from "lucide-react";

import { useCurrentUser } from "../firebase/useCurrentUser";
import { signOutUser } from "../firebase/authService";
import { listenToAchievements } from "../firebase/achievementService";
import { listenToChallenges } from "../firebase/challengeService";

import AdminChallengesPage from "./Challenges/AdminChallengesPage";
import AdminAchievementsPage from "./Achievement/AdminAchievementsPage";

const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "achievements",
    label: "Achievements",
    icon: Award,
  },
  {
    id: "challenges",
    label: "Challenges",
    icon: Trophy,
  },
];

export default function AdminDashboard({ onNavigate }) {
  const { profile } = useCurrentUser();

  const [activeTab, setActiveTab] = useState("overview");
  const [achievementCount, setAchievementCount] = useState(null);
  const [challengeCount, setChallengeCount] = useState(null);

  useEffect(() => {
    const unsubscribeAchievements = listenToAchievements((list) => {
      setAchievementCount(Array.isArray(list) ? list.length : 0);
    });

    const unsubscribeChallenges = listenToChallenges((list) => {
      setChallengeCount(Array.isArray(list) ? list.length : 0);
    });

    return () => {
      if (typeof unsubscribeAchievements === "function") {
        unsubscribeAchievements();
      }

      if (typeof unsubscribeChallenges === "function") {
        unsubscribeChallenges();
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
      onNavigate?.("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        {/* BRAND */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Leaf size={19} />
          </div>

          <span style={styles.brandText}>Admin</span>
        </div>

        {/* NAVIGATION */}
        <nav style={styles.nav}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div style={styles.sidebarFooter}>
          <div style={styles.adminInfo}>
            <div style={styles.adminAvatar}>
              {(profile?.name || "A").charAt(0).toUpperCase()}
            </div>

            <div style={styles.adminDetails}>
              <div style={styles.adminName}>
                {profile?.name || "Admin"}
              </div>

              <div style={styles.adminRole}>Administrator</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutBtn}
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.content}>
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.overviewTitle}>Overview</h1>

                <p style={styles.overviewSubtitle}>
                  Manage your eco-friendly achievements and challenges.
                </p>
              </div>
            </div>

            <div style={styles.statsRow}>
              {/* ACHIEVEMENTS */}
              <button
                type="button"
                style={styles.statCard}
                onClick={() => setActiveTab("achievements")}
              >
                <div
                  style={{
                    ...styles.statIcon,
                    background: "#dcfce7",
                    color: "#15803d",
                  }}
                >
                  <Award size={22} />
                </div>

                <div style={styles.statContent}>
                  <div style={styles.statValue}>
                    {achievementCount ?? "—"}
                  </div>

                  <div style={styles.statLabel}>
                    Achievements
                  </div>

                  <div style={styles.statDescription}>
                    Create and manage achievement rules
                  </div>
                </div>
              </button>

              {/* CHALLENGES */}
              <button
                type="button"
                style={styles.statCard}
                onClick={() => setActiveTab("challenges")}
              >
                <div
                  style={{
                    ...styles.statIcon,
                    background: "#fef3c7",
                    color: "#d97706",
                  }}
                >
                  <Trophy size={22} />
                </div>

                <div style={styles.statContent}>
                  <div style={styles.statValue}>
                    {challengeCount ?? "—"}
                  </div>

                  <div style={styles.statLabel}>
                    Challenges
                  </div>

                  <div style={styles.statDescription}>
                    Create and manage eco challenges
                  </div>
                </div>
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div style={styles.quickSection}>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>

              <div style={styles.quickGrid}>
                <button
                  type="button"
                  style={styles.quickCard}
                  onClick={() => setActiveTab("achievements")}
                >
                  <div
                    style={{
                      ...styles.quickIcon,
                      background: "#dcfce7",
                      color: "#15803d",
                    }}
                  >
                    <Award size={19} />
                  </div>

                  <div>
                    <div style={styles.quickTitle}>
                      Manage Achievements
                    </div>

                    <div style={styles.quickDescription}>
                      Create, edit, publish or delete achievements.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  style={styles.quickCard}
                  onClick={() => setActiveTab("challenges")}
                >
                  <div
                    style={{
                      ...styles.quickIcon,
                      background: "#fef3c7",
                      color: "#d97706",
                    }}
                  >
                    <Trophy size={19} />
                  </div>

                  <div>
                    <div style={styles.quickTitle}>
                      Manage Challenges
                    </div>

                    <div style={styles.quickDescription}>
                      Create and manage challenges for users.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === "achievements" && (
          <AdminAchievementsPage />
        )}

        {/* CHALLENGES */}
        {activeTab === "challenges" && (
          <AdminChallengesPage />
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827",
  },

  /* SIDEBAR */

  sidebar: {
    width: 230,
    flexShrink: 0,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "22px 14px",
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "2px 9px",
    marginBottom: 30,
  },

  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brandText: {
    fontSize: 17,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: "-0.3px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
  },

  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 11,
    border: "none",
    background: "transparent",
    borderRadius: 10,
    padding: "11px 12px",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
  },

  navItemActive: {
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: 700,
  },

  /* SIDEBAR FOOTER */

  sidebarFooter: {
    borderTop: "1px solid #f3f4f6",
    paddingTop: 15,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  adminInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 6px",
  },

  adminAvatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },

  adminDetails: {
    minWidth: 0,
  },

  adminName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#374151",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 145,
  },

  adminRole: {
    marginTop: 2,
    fontSize: 10.5,
    color: "#9ca3af",
    fontWeight: 500,
  },

  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #fecaca",
    background: "#fff",
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#b91c1c",
    cursor: "pointer",
  },

  /* CONTENT */

  content: {
    flex: 1,
    minWidth: 0,
    padding: "34px 38px",
    overflowY: "auto",
    boxSizing: "border-box",
  },

  pageHeader: {
    marginBottom: 24,
  },

  overviewTitle: {
    margin: 0,
    fontSize: 25,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: "-0.5px",
  },

  overviewSubtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 13.5,
  },

  /* STAT CARDS */

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
    maxWidth: 760,
  },

  statCard: {
    appearance: "none",
    width: "100%",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    alignItems: "flex-start",
    gap: 15,
    textAlign: "left",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  statContent: {
    minWidth: 0,
  },

  statValue: {
    fontSize: 27,
    lineHeight: 1,
    fontWeight: 800,
    color: "#111827",
  },

  statLabel: {
    marginTop: 6,
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
  },

  statDescription: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 1.4,
    color: "#9ca3af",
  },

  /* QUICK ACTIONS */

  quickSection: {
    marginTop: 30,
    maxWidth: 760,
  },

  sectionTitle: {
    margin: "0 0 13px",
    fontSize: 17,
    fontWeight: 800,
    color: "#111827",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  quickCard: {
    appearance: "none",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 13,
    textAlign: "left",
    cursor: "pointer",
  },

  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  quickTitle: {
    fontSize: 13,
    fontWeight: 750,
    color: "#111827",
  },

  quickDescription: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 1.4,
    color: "#9ca3af",
  },
};