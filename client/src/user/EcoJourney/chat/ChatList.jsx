import React, { useEffect, useState } from "react";
import { Users, Plus, X } from "lucide-react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToFriends } from "../../../firebase/friendService";
import { listenToUserChats, createGroupChat } from "../../../firebase/chatService";

function otherMemberName(chat, myUid) {
  const otherUid = chat.members.find((m) => m !== myUid);
  return chat.memberNames?.[otherUid] || "Unknown";
}

export default function ChatList({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [creating, setCreating] = useState(false);
  const [groupError, setGroupError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    const unsubChats = listenToUserChats(authUser.uid, setChats);
    const unsubFriends = listenToFriends(authUser.uid, setFriends);
    return () => {
      unsubChats();
      unsubFriends();
    };
  }, [authUser]);

  const toggleFriend = (friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.uid === friend.uid)
        ? prev.filter((f) => f.uid !== friend.uid)
        : [...prev, friend]
    );
  };

  const handleCreateGroup = async () => {
    setGroupError("");
    if (!groupName.trim()) {
      setGroupError("Group name is required.");
      return;
    }
    if (selectedFriends.length === 0) {
      setGroupError("Pick at least one friend.");
      return;
    }

    setCreating(true);
    try {
      const chatId = await createGroupChat(
        { uid: authUser.uid, displayName: profile?.name },
        groupName,
        selectedFriends
      );
      setShowNewGroup(false);
      setGroupName("");
      setSelectedFriends([]);
      onNavigate("/community/chat/room", chatId);
    } catch (err) {
      setGroupError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

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
    <Layout active="chat" user={layoutUser} onNavigate={onNavigate}>
      <div style={styles.content}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Chats</h1>
            <p style={styles.subtitle}>Message your friends, or start a group</p>
          </div>
          <button type="button" onClick={() => setShowNewGroup(true)} style={styles.newGroupBtn}>
            <Plus size={16} />
            New Group
          </button>
        </div>

        {chats.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>
              No chats yet. Add some friends and tap the message icon to start one.
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {chats.map((chat) => {
              const isGroup = chat.type === "group";
              const title = isGroup ? chat.name : otherMemberName(chat, authUser.uid);
              return (
                <div
                  key={chat.id}
                  style={styles.chatRow}
                  onClick={() => onNavigate("/community/chat/room", chat.id)}
                >
                  <div style={isGroup ? styles.avatarGroup : styles.avatarFallback}>
                    {isGroup ? <Users size={18} /> : (title || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.chatInfo}>
                    <div style={styles.chatTitle}>{title}</div>
                    <div style={styles.chatPreview}>
                      {chat.lastMessage || "No messages yet"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewGroup && (
        <div style={styles.modalOverlay} onClick={() => setShowNewGroup(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>New Group Chat</h2>
              <button type="button" onClick={() => setShowNewGroup(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <label style={styles.label}>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Penang Trip Squad"
              style={styles.groupNameInput}
            />

            <label style={styles.label}>Add Friends</label>
            {friends.length === 0 ? (
              <p style={styles.emptyText}>Add some friends first before creating a group.</p>
            ) : (
              <div style={styles.friendPickList}>
                {friends.map((friend) => {
                  const selected = selectedFriends.some((f) => f.uid === friend.uid);
                  return (
                    <div
                      key={friend.uid}
                      onClick={() => toggleFriend(friend)}
                      style={{
                        ...styles.friendPickRow,
                        background: selected ? "#dcfce7" : "#f9fafb",
                      }}
                    >
                      <div style={styles.avatarFallbackSm}>
                        {(friend.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span style={styles.friendPickName}>{friend.name || friend.email}</span>
                      {selected && <span style={styles.selectedTag}>Selected</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {groupError && <p style={styles.errorText}>{groupError}</p>}

            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={creating}
              style={styles.createGroupBtn}
            >
              {creating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      )}
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
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  newGroupBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  emptyCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 32,
    textAlign: "center",
  },
  emptyText: { fontSize: 13.5, color: "#9ca3af", margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  chatRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    fontWeight: 700,
    flexShrink: 0,
  },
  avatarGroup: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chatInfo: { minWidth: 0 },
  chatTitle: { fontSize: 15, fontWeight: 700, color: "#111827" },
  chatPreview: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 100,
  },
  modal: {
    background: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80vh",
    overflowY: "auto",
  },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex", color: "#6b7280" },
  label: { fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, marginTop: 14 },
  groupNameInput: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14.5,
    outline: "none",
    boxSizing: "border-box",
  },
  friendPickList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" },
  friendPickRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
  },
  avatarFallbackSm: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#fff",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  friendPickName: { fontSize: 13.5, fontWeight: 600, color: "#111827", flex: 1 },
  selectedTag: { fontSize: 11, fontWeight: 700, color: "#16a34a" },
  errorText: { fontSize: 13, color: "#b91c1c", marginTop: 12, marginBottom: 0 },
  createGroupBtn: {
    marginTop: 20,
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};