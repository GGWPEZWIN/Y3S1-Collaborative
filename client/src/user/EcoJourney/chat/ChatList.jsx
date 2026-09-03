import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  MessageCircle,
  X,
  Check,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  listenToUserChats,
  createGroupChat,
} from "../../../firebase/chatService";

import { listenToFriends } from "../../../firebase/friendService";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function ChatList({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();

  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [activeLetter, setActiveLetter] = useState("all");

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LISTEN TO USER CHATS
  ========================================================= */

  useEffect(() => {
    if (!authUser?.uid) return;

    const unsubscribe = listenToUserChats(authUser.uid, (data) => {
      setChats(data || []);
    });

    return () => unsubscribe?.();
  }, [authUser?.uid]);

  /* =========================================================
     LISTEN TO FRIENDS
  ========================================================= */

  useEffect(() => {
    if (!authUser?.uid) return;

    const unsubscribe = listenToFriends(authUser.uid, (data) => {
      setFriends(data || []);
    });

    return () => unsubscribe?.();
  }, [authUser?.uid]);

  /* =========================================================
     CURRENT USER
  ========================================================= */

  const user = {
    name:
      profile?.name ||
      authUser?.displayName ||
      "User",

    ecoScore: profile?.eco_score ?? 0,

    profilePhotoUrl:
      profile?.profile_photo_url ||
      authUser?.photoURL ||
      "",
  };

  /* =========================================================
     GET CHAT NAME
  ========================================================= */

  function getChatName(chat) {
    if (chat.type === "group") {
      return chat.name || "Unnamed Group";
    }

    const otherUid = chat.members?.find(
      (uid) => uid !== authUser?.uid
    );

    if (
      otherUid &&
      chat.memberNames &&
      chat.memberNames[otherUid]
    ) {
      return chat.memberNames[otherUid];
    }

    return "Chat";
  }

  /* =========================================================
     GET CHAT PHOTO
  ========================================================= */

  function getChatPhoto(chat) {
    if (chat.type === "group") {
      return "";
    }

    const otherUid = chat.members?.find(
      (uid) => uid !== authUser?.uid
    );

    if (!otherUid) return "";

    if (chat.memberPhotos?.[otherUid]) {
      return chat.memberPhotos[otherUid];
    }

    return "";
  }

  /* =========================================================
     SEARCH + ALPHABET FILTER
  ========================================================= */

  const filteredChats = useMemo(() => {
    let result = [...chats];

    const search = searchText.trim().toLowerCase();

    /* Search */
    if (search) {
      result = result.filter((chat) => {
        const name = getChatName(chat).toLowerCase();

        const lastMessage = (
          chat.lastMessage || ""
        ).toLowerCase();

        return (
          name.includes(search) ||
          lastMessage.includes(search)
        );
      });
    }

    /* Alphabet filter */
    if (activeLetter !== "all") {
      result = result.filter((chat) => {
        const name = getChatName(chat).trim();

        return (
          name &&
          name.charAt(0).toUpperCase() === activeLetter
        );
      });
    }

    return result;
  }, [
    chats,
    searchText,
    activeLetter,
    authUser?.uid,
  ]);

  /* =========================================================
     SORT CHATS
  ========================================================= */

  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const dateA =
        a.lastMessageAt?.seconds ||
        a.created_at?.seconds ||
        0;

      const dateB =
        b.lastMessageAt?.seconds ||
        b.created_at?.seconds ||
        0;

      return dateB - dateA;
    });
  }, [filteredChats]);

  /* =========================================================
     FRIENDS FOR GROUP
  ========================================================= */

  const availableFriends = useMemo(() => {
    return [...friends].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [friends]);

  /* =========================================================
     TOGGLE FRIEND
  ========================================================= */

  function toggleFriend(friend) {
    setSelectedFriends((current) => {
      const exists = current.some(
        (f) => f.uid === friend.uid
      );

      if (exists) {
        return current.filter(
          (f) => f.uid !== friend.uid
        );
      }

      return [...current, friend];
    });
  }

  /* =========================================================
     CREATE GROUP
  ========================================================= */

  async function handleCreateGroup() {
    setError("");

    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError("Please enter a group name.");
      return;
    }

    if (selectedFriends.length === 0) {
      setError("Please select at least one friend.");
      return;
    }

    try {
      setCreatingGroup(true);

      const chatId = await createGroupChat(
        {
          uid: authUser.uid,
          displayName:
            authUser.displayName ||
            profile?.name ||
            "",
        },
        trimmedName,
        selectedFriends
      );

      setShowGroupModal(false);
      setGroupName("");
      setSelectedFriends([]);
      setError("");

      onNavigate?.(
        "/community/chat/room",
        chatId
      );
    } catch (err) {
      console.error(
        "Failed to create group:",
        err
      );

      setError(
        err?.message ||
          "Failed to create the group. Please try again."
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  /* =========================================================
     OPEN CHAT
  ========================================================= */

  function openChat(chat) {
    onNavigate?.(
      "/community/chat/room",
      chat.id
    );
  }

  /* =========================================================
     LAST MESSAGE
  ========================================================= */

  function getLastMessage(chat) {
    if (!chat.lastMessage) {
      return "No messages yet";
    }

    return chat.lastMessage;
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          Loading...
        </p>
      </div>
    );
  }

  /* =========================================================
     NOT LOGGED IN
  ========================================================= */

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/login")
          }
          style={styles.loginButton}
        >
          Go to Login
        </button>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <Layout
      active="community"
      user={user}
      onNavigate={onNavigate}
    >
      <div style={styles.page}>

        {/* ================= HEADER ================= */}

        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>
              Chats
            </h1>

            <p style={styles.pageSubtitle}>
              Message your friends, or start a group
            </p>
          </div>

          <button
            type="button"
            style={styles.newGroupButton}
            onClick={() => {
              setError("");
              setShowGroupModal(true);
            }}
          >
            <Plus size={20} />
            New Group
          </button>
        </div>

        {/* ================= SEARCH ================= */}

        <div style={styles.searchCard}>
          <div style={styles.searchWrapper}>
            <Search
              size={21}
              color="#94a3b8"
              style={styles.searchIcon}
            />

            <input
              type="text"
              placeholder="Search chats or groups..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
              style={styles.searchInput}
            />

            {searchText && (
              <button
                type="button"
                onClick={() =>
                  setSearchText("")
                }
                style={styles.clearSearchButton}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        {/* ================= CHAT AREA ================= */}

        <div style={styles.chatArea}>

          {/* =================================================
              VERTICAL FILTER
              ALL = FIXED
              A-Z = SCROLLABLE
          ================================================= */}

          <aside style={styles.filterSidebar}>

            <div style={styles.filterTitle}>
              Filter
            </div>

            {/* ALL BUTTON - FIXED */}
            <button
              type="button"
              onClick={() =>
                setActiveLetter("all")
              }
              style={
                activeLetter === "all"
                  ? styles.filterButtonActive
                  : styles.filterButton
              }
            >
              All
            </button>

            {/* A-Z SCROLL AREA */}
            <div style={styles.alphabetScroll}>
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() =>
                    setActiveLetter(letter)
                  }
                  style={
                    activeLetter === letter
                      ? styles.filterButtonActive
                      : styles.filterButton
                  }
                >
                  {letter}
                </button>
              ))}
            </div>

          </aside>

          {/* ================= RESULTS ================= */}

          <section style={styles.resultsSection}>

            <div style={styles.resultsHeader}>
              <span>
                {sortedChats.length}{" "}
                {sortedChats.length === 1
                  ? "conversation"
                  : "conversations"}
              </span>

              {activeLetter !== "all" && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveLetter("all")
                  }
                  style={styles.clearFilterButton}
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* ================= EMPTY ================= */}

            {sortedChats.length === 0 ? (
              <div style={styles.emptyCard}>

                <div style={styles.emptyIcon}>
                  <MessageCircle
                    size={28}
                    color="#16a34a"
                  />
                </div>

                <h3 style={styles.emptyTitle}>
                  No conversations found
                </h3>

                <p style={styles.emptyText}>
                  {searchText
                    ? "Try a different search."
                    : activeLetter !== "all"
                    ? `No chats or groups start with "${activeLetter}".`
                    : "Start chatting with a friend or create a group."}
                </p>

              </div>
            ) : (

              /* ================= CHAT LIST ================= */

              <div style={styles.chatList}>

                {sortedChats.map((chat) => {
                  const chatName =
                    getChatName(chat);

                  const chatPhoto =
                    getChatPhoto(chat);

                  const isGroup =
                    chat.type === "group";

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() =>
                        openChat(chat)
                      }
                      style={styles.chatCard}
                    >

                      {/* AVATAR */}

                      {chatPhoto ? (
                        <img
                          src={chatPhoto}
                          alt={chatName}
                          style={
                            styles.chatAvatarImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            isGroup
                              ? styles.groupAvatar
                              : styles.chatAvatar
                          }
                        >
                          {isGroup ? (
                            <Users
                              size={22}
                              color="#16a34a"
                            />
                          ) : (
                            chatName
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>
                      )}

                      {/* CHAT INFO */}

                      <div style={styles.chatInfo}>

                        <div
                          style={
                            styles.chatNameRow
                          }
                        >
                          <span
                            style={
                              styles.chatName
                            }
                          >
                            {chatName}
                          </span>

                          {isGroup && (
                            <span
                              style={
                                styles.groupLabel
                              }
                            >
                              Group
                            </span>
                          )}
                        </div>

                        <div
                          style={
                            styles.lastMessage
                          }
                        >
                          {getLastMessage(chat)}
                        </div>

                      </div>

                      {/* ARROW */}

                      <div
                        style={
                          styles.chatArrow
                        }
                      >
                        ›
                      </div>

                    </button>
                  );
                })}

              </div>
            )}

          </section>
        </div>
      </div>

      {/* =====================================================
          NEW GROUP MODAL
      ===================================================== */}

      {showGroupModal && (
        <div style={styles.modalOverlay}>

          <div style={styles.modal}>

            {/* MODAL HEADER */}

            <div style={styles.modalHeader}>

              <div>
                <h2 style={styles.modalTitle}>
                  Create New Group
                </h2>

                <p style={styles.modalSubtitle}>
                  Choose a name and select your friends
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGroupModal(false)
                }
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>

            </div>

            {/* GROUP NAME */}

            <label style={styles.inputLabel}>
              Group name
            </label>

            <input
              type="text"
              value={groupName}
              onChange={(e) =>
                setGroupName(e.target.value)
              }
              placeholder="e.g. KL Eco Travelers"
              style={styles.groupNameInput}
            />

            {/* FRIEND HEADER */}

            <div style={styles.friendHeader}>

              <span style={styles.inputLabel}>
                Select friends
              </span>

              <span style={styles.selectedCount}>
                {selectedFriends.length} selected
              </span>

            </div>

            {/* FRIEND LIST */}

            <div style={styles.friendList}>

              {availableFriends.length === 0 ? (
                <div style={styles.noFriends}>

                  <Users
                    size={24}
                    color="#94a3b8"
                  />

                  <span>
                    You don't have any friends yet.
                  </span>

                </div>
              ) : (

                availableFriends.map((friend) => {

                  const selected =
                    selectedFriends.some(
                      (f) =>
                        f.uid === friend.uid
                    );

                  return (
                    <button
                      key={friend.uid}
                      type="button"
                      onClick={() =>
                        toggleFriend(friend)
                      }
                      style={{
                        ...styles.friendRow,
                        ...(selected
                          ? styles.friendRowSelected
                          : {}),
                      }}
                    >

                      <div
                        style={
                          styles.friendAvatar
                        }
                      >
                        {(friend.name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div
                        style={
                          styles.friendInfo
                        }
                      >
                        <div
                          style={
                            styles.friendName
                          }
                        >
                          {friend.name ||
                            "Unknown User"}
                        </div>

                        <div
                          style={
                            styles.friendEmail
                          }
                        >
                          {friend.email || ""}
                        </div>
                      </div>

                      <div
                        style={
                          selected
                            ? styles.checkboxSelected
                            : styles.checkbox
                        }
                      >
                        {selected && (
                          <Check
                            size={15}
                            color="#fff"
                          />
                        )}
                      </div>

                    </button>
                  );
                })
              )}

            </div>

            {/* ERROR */}

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div style={styles.modalActions}>

              <button
                type="button"
                onClick={() => {
                  setShowGroupModal(false);
                  setError("");
                }}
                style={styles.cancelButton}
                disabled={creatingGroup}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateGroup}
                style={styles.createGroupButton}
                disabled={creatingGroup}
              >
                {creatingGroup
                  ? "Creating..."
                  : "Create Group"}
              </button>

            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = {

  /* ================= LOADING ================= */

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },

  loadingText: {
    color: "#6b7280",
    fontSize: 15,
  },

  loginButton: {
    marginTop: 12,
    border: "none",
    borderRadius: 9,
    padding: "10px 18px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  /* ================= PAGE ================= */

  page: {
    padding: "28px 32px 48px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 26,
  },

  pageTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
  },

  pageSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 16,
  },

  newGroupButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    background: "#16a34a",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  /* ================= SEARCH ================= */

  searchCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },

  searchWrapper: {
    position: "relative",
    width: "100%",
  },

  searchIcon: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  searchInput: {
    width: "100%",
    height: 56,
    boxSizing: "border-box",
    border: "1px solid #dbe1e8",
    borderRadius: 12,
    padding: "0 48px",
    outline: "none",
    fontSize: 16,
    color: "#111827",
    background: "#f8fafc",
  },

  clearSearchButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "none",
    background: "#e5e7eb",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  /* =========================================================
     CHAT AREA
  ========================================================= */

  chatArea: {
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
  },

  /* =========================================================
     FILTER SIDEBAR
  ========================================================= */

  filterSidebar: {
    width: 58,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 0",
  },

  filterTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#475569",
    marginBottom: 7,
  },

  /* =========================================================
     FILTER BUTTONS
  ========================================================= */

  filterButton: {
    width: 42,
    height: 38,
    flexShrink: 0,
    borderRadius: 9,
    border: "1px solid #dbe1e8",
    background: "#fff",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  filterButtonActive: {
    width: 42,
    height: 38,
    flexShrink: 0,
    borderRadius: 9,
    border: "1px solid #16a34a",
    background: "#16a34a",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  /* =========================================================
     ⭐ IMPORTANT:
     ONLY A-Z SCROLLS
     
     All stays visible.
     Filter sidebar does not make the whole page huge.
  ========================================================= */

  alphabetScroll: {
    width: 48,
    maxHeight: 390,
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    paddingTop: 6,
    paddingBottom: 6,
    boxSizing: "border-box",

    /* Firefox */
    scrollbarWidth: "thin",

    /* Prevent scrollbar from changing layout */
    scrollbarColor: "#cbd5e1 transparent",
  },

  /* ================= RESULTS ================= */

  resultsSection: {
    flex: 1,
    minWidth: 0,
  },

  resultsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 14,
    margin: "0 4px 12px",
  },

  clearFilterButton: {
    border: "none",
    background: "transparent",
    color: "#16a34a",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  /* ================= CHAT LIST ================= */

  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  chatCard: {
    width: "100%",
    minHeight: 94,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s ease",
  },

  chatAvatar: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 21,
    fontWeight: 700,
  },

  chatAvatarImage: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #dcfce7",
  },

  groupAvatar: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatInfo: {
    flex: 1,
    minWidth: 0,
  },

  chatNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  chatName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  groupLabel: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    color: "#16a34a",
    background: "#dcfce7",
    borderRadius: 999,
    padding: "3px 8px",
  },

  lastMessage: {
    marginTop: 5,
    color: "#94a3b8",
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  chatArrow: {
    flexShrink: 0,
    color: "#94a3b8",
    fontSize: 28,
    lineHeight: 1,
  },

  /* ================= EMPTY ================= */

  emptyCard: {
    minHeight: 240,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 24,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    margin: 0,
    fontSize: 17,
    color: "#111827",
  },

  emptyText: {
    margin: "7px 0 0",
    color: "#94a3b8",
    fontSize: 14,
  },

  /* =========================================================
     MODAL
  ========================================================= */

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 18,
    padding: 24,
    boxSizing: "border-box",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.15)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },

  modalTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
  },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: 13.5,
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    flexShrink: 0,
    border: "1px solid #e5e7eb",
    borderRadius: 9,
    background: "#fff",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  inputLabel: {
    display: "block",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 8,
  },

  groupNameInput: {
    width: "100%",
    height: 46,
    boxSizing: "border-box",
    border: "1px solid #dbe1e8",
    borderRadius: 10,
    padding: "0 14px",
    fontSize: 14,
    outline: "none",
    marginBottom: 20,
  },

  friendHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedCount: {
    fontSize: 12.5,
    color: "#16a34a",
    fontWeight: 700,
  },

  friendList: {
    maxHeight: 260,
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  },

  friendRow: {
    width: "100%",
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
  },

  friendRowSelected: {
    background: "#f0fdf4",
  },

  friendAvatar: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },

  friendInfo: {
    flex: 1,
    minWidth: 0,
  },

  friendName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },

  friendEmail: {
    marginTop: 3,
    fontSize: 12,
    color: "#94a3b8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  checkbox: {
    width: 22,
    height: 22,
    flexShrink: 0,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    width: 22,
    height: 22,
    flexShrink: 0,
    border: "1px solid #16a34a",
    background: "#16a34a",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  noFriends: {
    minHeight: 130,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#94a3b8",
    fontSize: 13,
  },

  errorBox: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 9,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontSize: 13,
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    padding: "10px 18px",
    borderRadius: 9,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },

  createGroupButton: {
    padding: "10px 18px",
    borderRadius: 9,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};