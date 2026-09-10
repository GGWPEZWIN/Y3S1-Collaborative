import React from "react";
import {
  Home,
  Map,
  Navigation,
  Users,
  Zap,
  Award,
  Trash2,
  Leaf,
} from "lucide-react";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";

const USER = { name: "Nadia Rumesh", ecoScore: 8750 };

// Same order and routes as the Challenges page sidebar, so the two modules
// look and navigate identically.
const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", route: "/dashboard" },
  { icon: Map, label: "Itinerary", route: "/itinerary" },
  { icon: Navigation, label: "Recommendations", route: "/recommendations" },
  { icon: Users, label: "Community", route: "/community" },
  { icon: Zap, label: "Challenges", route: "/challenges" },
  { icon: Award, label: "Certification", route: "/certification" },
  { icon: Trash2, label: "Waste", route: "/waste" },
];

/**
 * Phone tab bars fit about five items. Recommendations and Certification are
 * the two least-used destinations in this module's flows, so they drop off
 * the bar and stay reachable from the Dashboard.
 */
const PHONE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  ["/dashboard", "/itinerary", "/community", "/challenges", "/waste"].includes(
    item.route
  )
);

/** Shortened labels — "Recommendations" cannot fit in a tab bar cell. */
const PHONE_LABELS = {
  "/dashboard": "Home",
  "/itinerary": "Trips",
  "/community": "Community",
  "/challenges": "Challenges",
  "/waste": "Waste",
};

/**
 * ItineraryShell
 *
 * Page chrome for every screen in the Itinerary module.
 *
 * Desktop keeps the mockup's layout: brand + sidebar on the left, user chip
 * top right. Below 640px the sidebar would eat most of the screen, so it
 * becomes a fixed bottom tab bar — the pattern people expect from an
 * installed PWA — and the brand moves into the top bar.
 *
 * Props:
 * - onNavigate(route) — hash router callback passed down from App.jsx
 * - activeRoute       — sidebar item to highlight (defaults to "/itinerary")
 * - children          — page content
 */
export default function ItineraryShell({
  onNavigate,
  activeRoute = "/itinerary",
  children,
}) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  return (
    <div style={{ ...styles.app, ...(isPhone ? styles.appPhone : null) }}>
      {!isPhone && (
        <aside style={styles.sidebar}>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>
              <Leaf size={20} color="#fff" />
            </div>
            <span style={styles.brandName}>GreenTrip Malaysia</span>
          </div>

          <nav style={styles.nav}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.route === activeRoute;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate?.(item.route)}
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  }}
                >
                  <item.icon size={18} color={isActive ? "#15803d" : "#374151"} />
                  <span
                    style={{
                      color: isActive ? "#15803d" : "#374151",
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      <main style={styles.main}>
        <header style={{ ...styles.topbar, ...(isPhone ? styles.topbarPhone : null) }}>
          {isPhone ? (
            <div style={styles.brandPhone}>
              <div style={styles.brandIconPhone}>
                <Leaf size={16} color="#fff" />
              </div>
              <span style={styles.brandNamePhone}>GreenTrip</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => onNavigate?.("/profile")}
            style={styles.userBlock}
          >
            <div style={{ textAlign: "right" }}>
              <div style={styles.userName}>{USER.name}</div>
              <div style={styles.userSub}>
                Eco Score: {USER.ecoScore.toLocaleString()}
              </div>
            </div>
            <div style={{ ...styles.avatar, ...(isPhone ? styles.avatarPhone : null) }}>
              🐨
            </div>
          </button>
        </header>

        <div style={{ ...styles.content, ...(isPhone ? styles.contentPhone : null) }}>
          {children}
        </div>
      </main>

      {isPhone && (
        <nav style={styles.tabBar}>
          {PHONE_NAV_ITEMS.map((item) => {
            const isActive = item.route === activeRoute;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate?.(item.route)}
                aria-current={isActive ? "page" : undefined}
                style={styles.tabItem}
              >
                <item.icon size={21} color={isActive ? "#15803d" : "#9ca3af"} />
                <span
                  style={{
                    ...styles.tabLabel,
                    color: isActive ? "#15803d" : "#9ca3af",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {PHONE_LABELS[item.route]}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#f2f3f5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#111827",
  },
  appPhone: { flexDirection: "column" },
  sidebar: {
    width: 240,
    background: "#fff",
    borderRight: "1px solid #e5e7eb",
    padding: "20px 16px",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 8px 24px",
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontWeight: 700, fontSize: 15 },
  brandPhone: { display: "flex", alignItems: "center", gap: 8 },
  brandIconPhone: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandNamePhone: { fontWeight: 800, fontSize: 15 },
  nav: { display: "flex", flexDirection: "column", gap: 4 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14.5,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    textAlign: "left",
    width: "100%",
  },
  navItemActive: { background: "#dcfce7" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  topbarPhone: {
    padding: "10px 16px",
    // Sticky so the profile chip stays reachable while a long activity list
    // scrolls, and padded for the status bar / notch when installed.
    position: "sticky",
    top: 0,
    zIndex: 20,
    paddingTop: "calc(10px + env(safe-area-inset-top))",
  },
  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  userName: { fontWeight: 700, fontSize: 14.5 },
  userSub: { fontSize: 12.5, color: "#6b7280" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  avatarPhone: { width: 34, height: 34, fontSize: 16 },
  // boxSizing matters here: without it the 32px side padding is added on top
  // of width:100%, which pushes the page 64px wider than the viewport and
  // clips the right-hand column of cards.
  content: {
    padding: "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  contentPhone: {
    padding: "18px 16px",
    // Bottom room for the fixed tab bar (60px) plus the home-indicator inset,
    // so the last card is never trapped underneath it.
    paddingBottom: "calc(78px + env(safe-area-inset-bottom))",
  },
  tabBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    display: "flex",
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  tabItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    // 56px clears the ~44px minimum touch target on both iOS and Android.
    minHeight: 56,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "6px 2px",
  },
  tabLabel: { fontSize: 10.5, lineHeight: 1.2 },
};
