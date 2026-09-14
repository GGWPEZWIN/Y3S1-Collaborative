import React, { useEffect, useState } from "react";
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

import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToCumulativeEcoScore } from "../../../firebase/ecoScoreService";

const NAV_ITEMS = [
  {
    icon: Home,
    label: "Dashboard",
    route: "/dashboard",
  },
  {
    icon: Map,
    label: "Itinerary",
    route: "/itinerary",
  },
  {
    icon: Navigation,
    label: "Recommendations",
    route: "/recommendations",
  },
  {
    icon: Users,
    label: "Community",
    route: "/community",
  },
  {
    icon: Zap,
    label: "Challenges",
    route: "/challenges",
  },
  {
    icon: Award,
    label: "Certification",
    route: "/certification",
  },
  {
    icon: Trash2,
    label: "Waste",
    route: "/waste",
  },
];

export default function ItineraryShell({
  children,
  onNavigate,
  activeRoute = "/itinerary",
}) {
  const { authUser, profile, loading } = useCurrentUser();

  const [ecoScore, setEcoScore] = useState(0);

  // ============================================================
  // LOAD CUMULATIVE ECO SCORE
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) {
      setEcoScore(0);
      return undefined;
    }

    return listenToCumulativeEcoScore(
      authUser.uid,

      (score) => {
        setEcoScore(Number(score) || 0);
      },

      () => {
        // Fallback to profile Eco Score if cumulative listener fails.
        const fallback = Number(
          profile?.eco_score ??
            profile?.ecoScore ??
            0
        );

        setEcoScore(
          Number.isFinite(fallback)
            ? fallback
            : 0
        );
      }
    );
  }, [
    authUser?.uid,
    profile?.eco_score,
    profile?.ecoScore,
  ]);

  // ============================================================
  // USER INFORMATION
  // ============================================================

  const displayName =
    profile?.name ||
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    "GreenTrip User";

  const photoUrl =
    profile?.profile_photo_url ||
    profile?.profilePhotoUrl ||
    profile?.photoURL ||
    authUser?.photoURL ||
    "";

  const avatarLetter =
    displayName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";

  // ============================================================
  // NAVIGATION
  // ============================================================

  const goTo = (route) => {
    onNavigate?.(route);
  };

  const goToProfile = () => {
    onNavigate?.("/profile");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingBrand}>
          <span style={styles.loadingBrandIcon}>
            <Leaf size={20} color="#fff" />
          </span>

          <span>GreenTrip Malaysia</span>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN LAYOUT
  // ============================================================

  return (
    <div
      className="greentrip-itinerary-shell"
      style={styles.app}
    >
      {/* ======================================================
          TOP HEADER
          ====================================================== */}

      <header
        className="greentrip-top-header"
        style={styles.topHeader}
      >
        {/* BRAND */}

        <button
          type="button"
          onClick={() => goTo("/dashboard")}
          style={styles.headerBrandButton}
          aria-label="Go to Dashboard"
        >
          <span style={styles.headerBrandIcon}>
            <Leaf
              size={22}
              color="#fff"
              strokeWidth={2.2}
            />
          </span>

          <span style={styles.headerBrandText}>
            GreenTrip Malaysia
          </span>
        </button>

        {/* USER */}

        <button
          type="button"
          onClick={goToProfile}
          style={styles.headerUserButton}
          aria-label="Open profile"
          title="Open Profile"
        >
          <div style={styles.headerUserInfo}>
            <div style={styles.headerUserName}>
              {displayName}
            </div>

            <div style={styles.headerEcoScore}>
              Eco Score:{" "}
              {ecoScore.toLocaleString()}
            </div>
          </div>

          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              style={styles.headerAvatar}
            />
          ) : (
            <span style={styles.headerAvatarFallback}>
              {avatarLetter}
            </span>
          )}
        </button>
      </header>

      {/* ======================================================
          BELOW HEADER
          ====================================================== */}

      <div
        className="greentrip-body"
        style={styles.body}
      >
        {/* ====================================================
            SIDEBAR
            ==================================================== */}

        <aside
          className="greentrip-sidebar"
          style={styles.sidebar}
        >
          <nav
            className="greentrip-sidebar-nav"
            style={styles.sidebarNav}
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map(
              ({
                icon: Icon,
                label,
                route,
              }) => {
                const isActive =
                  activeRoute === route;

                return (
                  <button
                    key={route}
                    type="button"
                    onClick={() =>
                      goTo(route)
                    }
                    className={
                      isActive
                        ? "greentrip-nav-active"
                        : ""
                    }
                    style={{
                      ...styles.navButton,

                      ...(isActive
                        ? styles.navButtonActive
                        : {}),
                    }}
                  >
                    <Icon
                      size={22}
                      strokeWidth={
                        isActive ? 2.2 : 1.9
                      }
                    />

                    <span>
                      {label}
                    </span>
                  </button>
                );
              }
            )}
          </nav>
        </aside>

        {/* ====================================================
            MAIN CONTENT
            ==================================================== */}

        <main
          className="greentrip-main-content"
          style={styles.main}
        >
          <div
            className="greentrip-content-inner"
            style={styles.content}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ======================================================
          MOBILE BOTTOM NAV
          ====================================================== */}

      <nav
        className="greentrip-mobile-bottom-nav"
        style={styles.mobileBottomNav}
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.slice(0, 5).map(
          ({
            icon: Icon,
            label,
            route,
          }) => {
            const isActive =
              activeRoute === route;

            return (
              <button
                key={route}
                type="button"
                onClick={() =>
                  goTo(route)
                }
                style={{
                  ...styles.mobileNavButton,

                  ...(isActive
                    ? styles.mobileNavButtonActive
                    : {}),
                }}
              >
                <Icon size={20} />

                <span>
                  {label}
                </span>
              </button>
            );
          }
        )}
      </nav>
    </div>
  );
}

/* ==============================================================
   STYLES
   ============================================================== */

const styles = {
  /* ============================================================
     APP
     ============================================================ */

  app: {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  /* ============================================================
     TOP HEADER
     ============================================================ */

  topHeader: {
    width: "100%",
    height: 88,
    minHeight: 88,
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 34px",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  headerBrandButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 14,
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    textAlign: "left",
  },

  headerBrandIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    background: "#16a34a",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  headerBrandText: {
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.3px",
    whiteSpace: "nowrap",
  },

  /* ============================================================
     HEADER USER
     ============================================================ */

  headerUserButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 13,
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    textAlign: "right",
  },

  headerUserInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
  },

  headerUserName: {
    color: "#111827",
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 1.1,
  },

  headerEcoScore: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.2,
  },

  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #bbf7d0",
    background: "#dcfce7",
    flexShrink: 0,
  },

  headerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 800,
    border: "2px solid #bbf7d0",
    flexShrink: 0,
  },

  /* ============================================================
     BODY
     ============================================================ */

  body: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    width: "100%",
  },

  /* ============================================================
     SIDEBAR
     ============================================================ */

  sidebar: {
    width: 320,
    minWidth: 320,
    background: "#ffffff",
    borderRight:
      "1px solid #e5e7eb",
    minHeight:
      "calc(100vh - 88px)",
    boxSizing: "border-box",
    padding:
      "30px 20px 30px",
    position: "sticky",
    top: 88,
    alignSelf: "flex-start",
  },

  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },

  navButton: {
    width: "100%",
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    gap: 17,
    border: "none",
    borderRadius: 11,
    background: "transparent",
    color: "#374151",
    padding: "0 20px",
    fontSize: 17,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
    transition:
      "background 0.15s ease, color 0.15s ease",
  },

  navButtonActive: {
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: 650,
  },

  /* ============================================================
     MAIN
     ============================================================ */

  main: {
    flex: 1,
    minWidth: 0,
    minHeight:
      "calc(100vh - 88px)",
    background: "#f8fafc",
    overflow: "hidden",
  },

  content: {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    padding:
      "30px 32px 50px",
    boxSizing: "border-box",
  },

  /* ============================================================
     MOBILE
     ============================================================ */

  mobileBottomNav: {
    display: "none",
  },

  mobileNavButton: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontSize: 10.5,
    fontWeight: 500,
    padding: "6px 2px",
    cursor: "pointer",
  },

  mobileNavButtonActive: {
    color: "#15803d",
    fontWeight: 700,
  },

  /* ============================================================
     LOADING
     ============================================================ */

  loadingPage: {
    minHeight: "100vh",
    width: "100%",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
  },

  loadingBrand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 800,
    fontSize: 20,
  },

  loadingBrandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#16a34a",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

/* ==============================================================
   RESPONSIVE CSS
   ============================================================== */

if (typeof document !== "undefined") {
  const STYLE_ID =
    "greentrip-itinerary-shell-layout";

  if (!document.getElementById(STYLE_ID)) {
    const style =
      document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      /* ========================================================
         DESKTOP
         ======================================================== */

      @media (min-width: 768px) {

        .greentrip-itinerary-shell {
          display: flex !important;
          flex-direction: column !important;
          min-height: 100vh !important;
        }

        .greentrip-top-header {
          display: flex !important;
        }

        .greentrip-body {
          display: flex !important;
          flex: 1 !important;
        }

        .greentrip-sidebar {
          display: block !important;
        }

        .greentrip-mobile-bottom-nav {
          display: none !important;
        }

        .greentrip-nav-active {
          background: #dcfce7 !important;
          color: #15803d !important;
        }

        .greentrip-sidebar button:hover:not(.greentrip-nav-active) {
          background: #f8fafc !important;
        }

        .greentrip-main-content {
          overflow: auto !important;
        }
      }

      /* ========================================================
         TABLET / MOBILE
         ======================================================== */

      @media (max-width: 767px) {

        .greentrip-itinerary-shell {
          display: flex !important;
          flex-direction: column !important;
          min-height: 100vh !important;
        }

        .greentrip-top-header {
          height: 76px !important;
          min-height: 76px !important;
          padding: 0 15px !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
        }

        .greentrip-top-header
          .greentrip-header-brand {
          display: flex !important;
        }

        .greentrip-top-header button:first-child
          span:last-child {
          font-size: 18px !important;
        }

        .greentrip-top-header button:first-child
          span:first-child {
          width: 38px !important;
          height: 38px !important;
        }

        .greentrip-top-header
          button:last-child {
          gap: 7px !important;
        }

        .greentrip-top-header
          button:last-child
          div {
          display: flex !important;
        }

        .greentrip-top-header
          button:last-child
          div
          div:first-child {
          font-size: 14px !important;
        }

        .greentrip-top-header
          button:last-child
          div
          div:last-child {
          font-size: 11px !important;
        }

        .greentrip-top-header
          button:last-child
          img,
        .greentrip-top-header
          button:last-child
          span:last-child {
          width: 40px !important;
          height: 40px !important;
        }

        .greentrip-body {
          display: block !important;
          min-height: calc(100vh - 76px) !important;
        }

        .greentrip-sidebar {
          display: none !important;
        }

        .greentrip-main-content {
          width: 100% !important;
          min-height: calc(100vh - 76px) !important;
          overflow: visible !important;
        }

        .greentrip-content-inner {
          padding:
            22px 15px 92px !important;
          max-width: none !important;
        }

        .greentrip-mobile-bottom-nav {
          display: grid !important;
          grid-template-columns:
            repeat(5, 1fr) !important;
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 200 !important;
          background: #ffffff !important;
          border-top:
            1px solid #e5e7eb !important;
          padding:
            6px 4px
            calc(
              6px +
              env(safe-area-inset-bottom)
            ) !important;
          box-sizing: border-box !important;
        }
      }

      /* ========================================================
         SMALL PHONES
         ======================================================== */

      @media (max-width: 420px) {

        .greentrip-top-header {
          padding: 0 12px !important;
        }

        .greentrip-top-header
          button:first-child
          span:last-child {
          font-size: 16px !important;
        }

        .greentrip-top-header
          button:last-child
          div {
          max-width: 95px !important;
        }

        .greentrip-top-header
          button:last-child
          div
          div:first-child {
          font-size: 13px !important;
        }

        .greentrip-top-header
          button:last-child
          div
          div:last-child {
          font-size: 10px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }
}