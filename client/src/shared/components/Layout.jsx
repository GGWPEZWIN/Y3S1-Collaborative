import React, { useEffect, useState } from "react";

import {
  Home,
  Map,
  Navigation2,
  Users,
  Zap,
  Award,
  Trash2,
} from "lucide-react";

import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../../firebase/config";
import { useCurrentUser } from "../../firebase/useCurrentUser";
import { listenToUserChats } from "../../firebase/chatService";

// Nav id doubles as the route segment passed to onNavigate.
// Example: "dashboard" -> "/dashboard"
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "itinerary", label: "Itinerary", Icon: Map },
  { id: "recommendations", label: "Recommendations", Icon: Navigation2 },
  { id: "community", label: "Community", Icon: Users },
  { id: "challenges", label: "Challenges", Icon: Zap },
  { id: "certification", label: "Certification", Icon: Award },
  { id: "waste", label: "Waste", Icon: Trash2 },
];

export default function Layout({
  active,
  user,
  onNavigate,
  children,
}) {
  const { authUser } = useCurrentUser();

  const [liveProfile, setLiveProfile] = useState(null);
  const [chats, setChats] = useState([]);

  /*
   * ------------------------------------------------------------
   * LIVE USER PROFILE
   * ------------------------------------------------------------
   *
   * We listen directly to:
   *
   * users/{currentUserUid}
   *
   * This means the navbar always receives the latest:
   *
   * - name
   * - profile_photo_url
   * - eco_score
   *
   * You don't have to modify every page just to pass the photo.
   */
  useEffect(() => {
    if (!authUser?.uid) {
      setLiveProfile(null);
      return;
    }

    const userRef = doc(db, "users", authUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setLiveProfile({
            uid: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setLiveProfile(null);
        }
      },
      (error) => {
        console.error("Failed to listen to user profile:", error);
      }
    );

    return () => unsubscribe();
  }, [authUser?.uid]);

  /*
   * ------------------------------------------------------------
   * LIVE CHAT NOTIFICATION
   * ------------------------------------------------------------
   *
   * Checks every chat the current user belongs to.
   *
   * If:
   *
   * unreadCounts[currentUserUid] > 0
   *
   * then the Community navigation item gets a red dot.
   */
  useEffect(() => {
    if (!authUser?.uid) {
      setChats([]);
      return;
    }

    const unsubscribe = listenToUserChats(
      authUser.uid,
      (chatList) => {
        setChats(chatList);
      }
    );

    return () => unsubscribe();
  }, [authUser?.uid]);

  const hasUnreadChat = chats.some((chat) => {
    const unreadCount =
      chat?.unreadCounts?.[authUser?.uid] ?? 0;

    return unreadCount > 0;
  });

  /*
   * Prefer the realtime Firestore profile.
   *
   * Fallback to the user prop so Layout still works while
   * Firestore is loading.
   */
  const displayName =
    liveProfile?.name ||
    user?.name ||
    authUser?.displayName ||
    "Traveler";

  const displayEcoScore =
    liveProfile?.eco_score ??
    user?.ecoScore ??
    0;

  const profilePhoto =
    liveProfile?.profile_photo_url ||
    authUser?.photoURL ||
    user?.profile_photo_url ||
    "";

  const avatarLetter =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  return (
    <div style={styles.page}>

      {/* ======================================================
          TOP HEADER
      ====================================================== */}
      <header style={styles.header}>

        <div style={styles.brand}>
          <div style={styles.logoMark}>
            🌿
          </div>

          <span style={styles.brandName}>
            GreenTrip Malaysia
          </span>
        </div>

        {/* User profile button */}
        <button
          type="button"
          onClick={() => onNavigate?.("/profile")}
          style={styles.userChip}
          title="Open Profile"
        >

          <div style={styles.userText}>

            <div style={styles.userName}>
              {displayName}
            </div>

            <div style={styles.userScore}>
              Eco Score:{" "}
              {displayEcoScore.toLocaleString()}
            </div>

          </div>

          {/* REAL PROFILE PICTURE */}
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={displayName}
              style={styles.avatarImage}
            />
          ) : (
            <div style={styles.avatarFallback}>
              {avatarLetter}
            </div>
          )}

        </button>
      </header>

      {/* ======================================================
          BODY
      ====================================================== */}
      <div style={styles.body}>

        {/* ====================================================
            SIDEBAR
        ==================================================== */}
        <nav style={styles.nav}>

          {NAV_ITEMS.map(
            ({ id, label, Icon }) => {

              const isActive =
                id === active;

              const showUnread =
                id === "community" &&
                hasUnreadChat;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onNavigate?.(`/${id}`)
                  }
                  style={{
                    ...styles.navItem,
                    ...(isActive
                      ? styles.navItemActive
                      : {}),
                  }}
                >

                  <Icon size={20} />

                  <span style={styles.navLabel}>
                    {label}
                  </span>

                  {/* RED NOTIFICATION DOT */}
                  {showUnread && (
                    <span
                      style={styles.unreadDot}
                      aria-label="Unread messages"
                    />
                  )}

                </button>
              );
            }
          )}

        </nav>

        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}
        <main style={styles.main}>
          {children}
        </main>

      </div>
    </div>
  );
}

const styles = {

  page: {
    minHeight: "100vh",
    background: "#f9fafb",
  },

  header: {
    background: "#fff",
    borderBottom: "1px solid #f3f4f6",
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

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

  brandName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
  },

  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 0 4px 8px",
    borderRadius: 10,
  },

  userText: {
    textAlign: "right",
    lineHeight: 1.3,
  },

  userName: {
    fontWeight: 600,
    color: "#111827",
    fontSize: 14.5,
  },

  userScore: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },

  /*
   * REAL PROFILE IMAGE
   */
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "2px solid #dcfce7",
  },

  /*
   * FALLBACK LETTER
   */
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
  },

  body: {
    display: "flex",
  },

  nav: {
    width: 256,
    flexShrink: 0,
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxSizing: "border-box",
  },

  navItem: {
    position: "relative",
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
    width: "100%",
  },

  navItemActive: {
    background: "#dcfce7",
    color: "#15803d",
  },

  navLabel: {
    flex: 1,
  },

  /*
   * SMALL RED ROUND NOTIFICATION
   */
  unreadDot: {
    width: 8,
    height: 8,
    minWidth: 8,
    borderRadius: "50%",
    background: "#ef4444",
    marginLeft: "auto",
  },

  main: {
    flex: 1,
    minWidth: 0,
  },
};