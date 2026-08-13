import React from "react";
import { Home, Map, Navigation2, Users, Zap, Award, Trash2 } from "lucide-react";

// Nav id doubles as the route segment passed to onNavigate, e.g. "dashboard" -> "/dashboard".
// Keep this list identical to the one used by the Community page (pages/Dashboard.jsx)
// so both sidebars highlight and navigate the same way.
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "itinerary", label: "Itinerary", Icon: Map },
  { id: "recommendations", label: "Recommendations", Icon: Navigation2 },
  { id: "community", label: "Community", Icon: Users },
  { id: "challenges", label: "Challenges", Icon: Zap },
  { id: "certification", label: "Certification", Icon: Award },
  { id: "waste", label: "Waste", Icon: Trash2 },
];

/**
 * Layout
 *
 * Shared page shell: top bar (logo + user chip) and left sidebar nav.
 * Wrap any page's content in this so navigation stays consistent.
 *
 * Props:
 * - active: string — nav item id to highlight (e.g. "dashboard")
 * - user: { name, ecoScore }
 * - onNavigate(route): called with "/{id}" when a nav item is clicked
 * - children: page content
 */
export default function Layout({ active, user, onNavigate, children }) {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>🌿</div>
          <span style={styles.brandName}>GreenTrip Malaysia</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("/profile")}
          style={styles.userChip}
        >
          <div style={styles.userText}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userScore}>Eco Score: {user?.ecoScore?.toLocaleString?.() ?? "—"}</div>
          </div>
          <div style={styles.avatar}>🐼</div>
        </button>
      </header>

      <div style={styles.body}>
        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                onClick={() => onNavigate?.(`/${id}`)}
                style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : null) }}
              >
                <Icon size={20} />
                {label}
              </button>
            );
          })}
        </nav>

        <main style={styles.main}>{children}</main>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f9fafb" },
  header: {
    background: "#fff",
    borderBottom: "1px solid #f3f4f6",
    padding: "16px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: {
    width: 36,
    height: 36,
    background: "#16a34a",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  brandName: { fontSize: 20, fontWeight: 700, color: "#111827" },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    borderRadius: 10,
  },
  userText: { textAlign: "right", lineHeight: 1.3 },
  userName: { fontWeight: 600, color: "#111827" },
  userScore: { fontSize: 13.5, color: "#9ca3af" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  body: { display: "flex" },
  nav: { width: 256, flexShrink: 0, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    borderRadius: 8,
    textAlign: "left",
    fontWeight: 500,
    color: "#374151",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  navItemActive: { background: "#dcfce7", color: "#15803d" },
  main: { flex: 1, minWidth: 0 },
};