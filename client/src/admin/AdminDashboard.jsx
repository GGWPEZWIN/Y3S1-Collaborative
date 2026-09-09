import React, { useState } from "react";
import { 
  Leaf, 
  Award, 
  Target, 
  Hotel,
  ChevronLeft
} from "lucide-react";
import AdminAchievementsPage from "./Achievement/AdminAchievementsPage";
import AdminChallengesPage from "./Challenges/AdminChallengesPage";
import HotelAdminReview from "../HotelManagement/HotelAdminReview";
import AdminProfile from "../HotelManagement/AdminProfile";
import { useCurrentUser } from "../firebase/useCurrentUser";

export default function AdminDashboard({ onNavigate }) {
  // Available tabs: "achievements" | "challenges" | "hotels" | "profile"
  const [activeTab, setActiveTab] = useState("hotels");
  const { profile, authUser } = useCurrentUser();

  // Dynamic admin display name
  const adminDisplayName = profile?.name || profile?.username || authUser?.displayName || "Admin";

  const navItems = [
    { id: "achievements", label: "Achievements", icon: Award },
    { id: "challenges", label: "Challenges", icon: Target },
    { id: "hotels", label: "Certification", icon: Hotel },
  ];

  return (
    <div style={styles.layout}>
      {/* Left Sidebar */}
      <aside style={styles.sidebar}>
        {/* Brand / Logo */}
        <div style={styles.brandContainer}>
          <div style={styles.logoBadge}>
            <Leaf size={18} color="#fff" />
          </div>
          <span style={styles.brandTitle}>GreenTrip</span>
        </div>

        {/* Vertical Nav List */}
        <nav style={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={20} color={isActive ? "#065f46" : "#374151"} />
                <span style={{ color: isActive ? "#065f46" : "#1f2937" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Button (Displays Live Admin Name) */}
        <div style={styles.sidebarFooter}>
          <div 
            onClick={() => setActiveTab("profile")}
            style={{
              ...styles.profileRow,
              backgroundColor: activeTab === "profile" ? "#e5e7eb" : "transparent",
            }}
            title="Manage Admin Profile"
          >
            <div style={styles.avatar}>🛡️</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={styles.profileName}>{adminDisplayName}</div>
              <div style={styles.profileRole}>System Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Body */}
      <main style={styles.mainContent}>
        <div style={styles.contentContainer}>
          {/* Top Back Navigation visible when in Profile */}
          {activeTab === "profile" && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setActiveTab("hotels")}
                style={styles.topBackBtn}
              >
                <ChevronLeft size={16} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          )}

          {activeTab === "achievements" && <AdminAchievementsPage />}
          {activeTab === "challenges" && <AdminChallengesPage />}
          {activeTab === "hotels" && <HotelAdminReview onNavigate={onNavigate} />}
          {activeTab === "profile" && (
            <AdminProfile 
              onNavigate={(path) => {
                if (path === "/admin" || path === "/dashboard" || path === "/hotels") {
                  setActiveTab("hotels");
                } else if (onNavigate) {
                  onNavigate(path);
                }
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  sidebar: {
    width: 250,
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    position: "sticky",
    top: 0,
    height: "100vh",
    boxSizing: "border-box",
  },
  brandContainer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 10px",
    marginBottom: 32,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: "-0.01em",
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s ease",
  },
  navItemActive: {
    backgroundColor: "#bbf7d0",
    fontWeight: 700,
  },
  sidebarFooter: {
    borderTop: "1px solid #f3f4f6",
    paddingTop: 12,
  },
  profileRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  profileName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profileRole: {
    fontSize: 11.5,
    color: "#6b7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "36px 40px",
  },
  contentContainer: {
    maxWidth: 1060,
    margin: "0 auto",
  },
  topBackBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    padding: 0,
  },
};