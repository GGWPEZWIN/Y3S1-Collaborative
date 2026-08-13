import React, { useEffect, useState } from "react";
import { ChevronLeft, Users, Pencil, Check, UserPlus, UserMinus, LogOut } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToFriends } from "../../../firebase/friendService";
import {
  renameGroup,
  addMembersToGroup,
  removeMemberFromGroup,
  leaveGroup,
} from "../../../firebase/chatService";

/**
 * chatId is passed in as a prop by your router, same as ChatRoom:
 *   <GroupInfo chatId={params.chatId} onNavigate={onNavigate} />
 */
export default function GroupInfo({ chatId, onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [chat, setChat] = useState(null);
  const [friends, setFriends] = useState([]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setChat(data);
      if (data) setNameInput(data.name || "");
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    if (!authUser) return;
    const unsub = listenToFriends(authUser.uid, setFriends);
    return unsub;
  }, [authUser]);

  if (loading || !chat) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading group...</p>
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

  const isCreator = chat.createdBy === authUser.uid;
  const memberList = chat.members.map((uid) => ({
    uid,
    name: chat.memberNames?.[uid] || "Unknown",
  }));
  const addableFriends = friends.filter((f) => !chat.members.includes(f.uid));

  const handleSaveName = async () => {
    setError("");
    setBusy("rename");
    try {
      await renameGroup(chatId, nameInput);
      setEditingName(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const toggleSelectToAdd = (friend) => {
    setSelectedToAdd((prev) =>
      prev.some((f) => f.uid === friend.uid)
        ? prev.filter((f) => f.uid !== friend.uid)
        : [...prev, friend]
    );
  };

  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setError("");
    setBusy("add");
    try {
      await addMembersToGroup(chatId, chat, selectedToAdd);
      setSelectedToAdd([]);
      setShowAddFriends(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleRemoveMember = async (memberUid) => {
    if (!window.confirm("Remove this member from the group?")) return;
    setBusy(memberUid);
    try {
      await removeMemberFromGroup(chatId, chat, memberUid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    setBusy("leave");
    try {
      await leaveGroup(chatId, chat, authUser.uid);
      onNavigate("/community/chat");
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button type="button" onClick={() => onNavigate("/community/chat/room", chatId)} style={styles.backBtn}>
          <ChevronLeft size={20} />
        </button>
        <div style={styles.headerTitle}>Group Info</div>
      </div>

      <div style={styles.content}>
        <div style={styles.groupHeaderCard}>
          <div style={styles.avatarGroup}>
            <Users size={26} />
          </div>

          {editingName ? (
            <div style={styles.editNameRow}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={styles.nameInput}
              />
              <button type="button" onClick={handleSaveName} disabled={busy === "rename"} style={styles.saveNameBtn}>
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div style={styles.groupNameRow}>
              <div style={styles.groupName}>{chat.name}</div>
              {isCreator && (
                <button type="button" onClick={() => setEditingName(true)} style={styles.editBtn}>
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}
          <div style={styles.memberCount}>{memberList.length} members</div>
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>Members</h2>
            {isCreator && (
              <button type="button" onClick={() => setShowAddFriends((s) => !s)} style={styles.addMemberBtn}>
                <UserPlus size={14} />
                Add
              </button>
            )}
          </div>

          {showAddFriends && (
            <div style={styles.addFriendsBox}>
              {addableFriends.length === 0 ? (
                <p style={styles.emptyText}>All your friends are already in this group.</p>
              ) : (
                <>
                  {addableFriends.map((friend) => {
                    const selected = selectedToAdd.some((f) => f.uid === friend.uid);
                    return (
                      <div
                        key={friend.uid}
                        onClick={() => toggleSelectToAdd(friend)}
                        style={{
                          ...styles.friendPickRow,
                          background: selected ? "#dcfce7" : "#fff",
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
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={busy === "add" || selectedToAdd.length === 0}
                    style={styles.confirmAddBtn}
                  >
                    {busy === "add" ? "Adding..." : `Add ${selectedToAdd.length || ""}`}
                  </button>
                </>
              )}
            </div>
          )}

          {memberList.map((member) => (
            <div key={member.uid} style={styles.memberRow}>
              <div style={styles.memberInfo}>
                <div style={styles.avatarFallbackSm}>
                  {(member.name || "?").charAt(0).toUpperCase()}
                </div>
                <span style={styles.memberName}>
                  {member.name}
                  {member.uid === chat.createdBy && <span style={styles.creatorTag}> · Creator</span>}
                  {member.uid === authUser.uid && <span style={styles.youTag}> (You)</span>}
                </span>
              </div>
              {isCreator && member.uid !== authUser.uid && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.uid)}
                  disabled={busy === member.uid}
                  style={styles.removeMemberBtn}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={handleLeaveGroup} disabled={busy === "leave"} style={styles.leaveBtn}>
          <LogOut size={16} />
          {busy === "leave" ? "Leaving..." : "Leave Group"}
        </button>
      </div>
    </div>
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
  page: { minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  backBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex", color: "#374151", padding: 0 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
  content: { padding: "24px 20px", maxWidth: 520, margin: "0 auto" },
  groupHeaderCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  avatarGroup: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  groupNameRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  groupName: { fontSize: 19, fontWeight: 800, color: "#111827" },
  editBtn: { border: "none", background: "#f3f4f6", borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" },
  editNameRow: { display: "flex", gap: 8, justifyContent: "center" },
  nameInput: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 15, outline: "none" },
  saveNameBtn: { border: "none", background: "#16a34a", color: "#fff", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  memberCount: { fontSize: 13, color: "#9ca3af", marginTop: 8 },
  errorText: { fontSize: 13, color: "#b91c1c", marginBottom: 12 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 },
  addMemberBtn: { display: "flex", alignItems: "center", gap: 5, border: "none", background: "#dcfce7", color: "#16a34a", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  addFriendsBox: { background: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 14 },
  friendPickRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer", marginBottom: 6 },
  friendPickName: { fontSize: 13.5, fontWeight: 600, color: "#111827", flex: 1 },
  selectedTag: { fontSize: 11, fontWeight: 700, color: "#16a34a" },
  confirmAddBtn: { width: "100%", border: "none", background: "#16a34a", color: "#fff", borderRadius: 10, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginTop: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", margin: 0 },
  memberRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" },
  memberInfo: { display: "flex", alignItems: "center", gap: 10 },
  avatarFallbackSm: { width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  memberName: { fontSize: 14, fontWeight: 600, color: "#111827" },
  creatorTag: { fontSize: 11.5, color: "#f97316", fontWeight: 600 },
  youTag: { fontSize: 11.5, color: "#9ca3af", fontWeight: 500 },
  removeMemberBtn: { border: "none", background: "#fee2e2", color: "#b91c1c", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  leaveBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14.5, fontWeight: 700, cursor: "pointer" },
};