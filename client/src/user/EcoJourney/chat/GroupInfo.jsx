import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  Users,
  Pencil,
  Check,
  UserPlus,
  UserMinus,
  LogOut,
  Bell,
  BellOff,
  Pin,
  Crown,
  Shield,
  ShieldOff,
} from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToFriends } from "../../../firebase/friendService";
import { leaveGroup, toggleMuteChat } from "../../../firebase/chatService";

/**
 * GroupInfo
 *
 * Group features:
 * - View all members
 * - Mute / unmute notifications
 * - Pin / unpin group on the Chat List
 * - Creator + admins can invite members
 * - Creator + admins can kick normal members
 * - Creator can promote / remove admins
 * - Creator + admins can rename the group
 *
 * chatId is passed from the router:
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
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [friendSearch, setFriendSearch] = useState("");

  useEffect(() => {
    if (!chatId) {
      setChatLoading(false);
      setChatError("Missing group ID.");
      return;
    }

    setChatLoading(true);
    setChatError("");

    const unsub = onSnapshot(
      doc(db, "chats", chatId),
      (snap) => {
        if (!snap.exists()) {
          setChat(null);
          setChatError("This group does not exist in Firebase.");
        } else {
          const data = { id: snap.id, ...snap.data() };
          setChat(data);
          setNameInput(data.name || "");
          setChatError("");
        }
        setChatLoading(false);
      },
      (err) => {
        console.error("Group info listener error:", err);
        setChat(null);
        setChatError(err?.message || "Unable to load group information.");
        setChatLoading(false);
      }
    );

    return unsub;
  }, [chatId]);

  useEffect(() => {
    if (!authUser?.uid) return;

    const unsub = listenToFriends(authUser.uid, setFriends);
    return unsub;
  }, [authUser?.uid]);

  if (loading || chatLoading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading group...</p>
      </div>
    );
  }

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() => onNavigate?.("/login")}
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!chat) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#b91c1c", marginBottom: 16, textAlign: "center" }}>{chatError || "Group could not be loaded."}</p>
        <button type="button" onClick={() => onNavigate?.("/community/chat")} style={styles.loginRedirectBtn}>Back to Chats</button>
      </div>
    );
  }

  const memberUids = chat.members || [];

  /*
   * Old groups may not have an admins field.
   * In that case, the original creator is automatically treated as admin.
   */
  const adminUids =
    Array.isArray(chat.admins) && chat.admins.length > 0
      ? chat.admins
      : chat.createdBy
        ? [chat.createdBy]
        : [];

  const isCreator = chat.createdBy === authUser.uid;
  const isAdmin = adminUids.includes(authUser.uid);

  const isMuted = !!chat.mutedBy?.includes(authUser.uid);
  const isPinned = !!chat.pinnedBy?.includes(authUser.uid);

  const memberList = memberUids.map((uid) => ({
    uid,
    name: chat.memberNames?.[uid] || "Unknown",
    photo: chat.memberPhotos?.[uid] || "",
    isCreator: uid === chat.createdBy,
    isAdmin: adminUids.includes(uid),
  }));

  const addableFriends = friends.filter(
    (friend) => !memberUids.includes(friend.uid)
  );

  const sortedMembers = [...memberList].sort((a, b) => {
    if (a.isCreator) return -1;
    if (b.isCreator) return 1;
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const filteredAddableFriends = addableFriends.filter((friend) => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return true;
    return [friend.name, friend.email, friend.displayName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const getUserLabel = (uid) => {
    const member = memberList.find((m) => m.uid === uid);
    return member?.name || "this member";
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setError("Group name cannot be empty.");
      return;
    }

    if (!isAdmin) {
      setError("Only group admins can rename the group.");
      return;
    }

    setError("");
    setBusy("rename");

    try {
      await updateDoc(doc(db, "chats", chatId), {
        name: trimmed,
      });

      setEditingName(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to rename the group.");
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
    if (!isAdmin) {
      setError("Only group admins can invite members.");
      return;
    }

    if (selectedToAdd.length === 0) return;

    setError("");
    setBusy("add");

    try {
      const nextMembers = [
        ...memberUids,
        ...selectedToAdd
          .map((friend) => friend.uid)
          .filter((uid) => !memberUids.includes(uid)),
      ];

      const nextMemberNames = {
        ...(chat.memberNames || {}),
      };

      const nextMemberPhotos = {
        ...(chat.memberPhotos || {}),
      };

      selectedToAdd.forEach((friend) => {
        nextMemberNames[friend.uid] =
          friend.name || friend.email || "Unknown";

        if (friend.profile_photo_url) {
          nextMemberPhotos[friend.uid] = friend.profile_photo_url;
        }
      });

      await updateDoc(doc(db, "chats", chatId), {
        members: nextMembers,
        memberNames: nextMemberNames,
        memberPhotos: nextMemberPhotos,
      });

      setSelectedToAdd([]);
      setShowAddFriends(false);
      setFriendSearch("");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to add members.");
    } finally {
      setBusy("");
    }
  };

  const handleRemoveMember = async (memberUid) => {
    if (!isAdmin) {
      setError("Only group admins can remove members.");
      return;
    }

    if (memberUid === authUser.uid) {
      setError("You cannot remove yourself. Use Leave Group instead.");
      return;
    }

    if (memberUid === chat.createdBy) {
      setError("The group creator cannot be removed.");
      return;
    }

    if (adminUids.includes(memberUid)) {
      setError("Remove this person's admin role before kicking them.");
      return;
    }

    if (!window.confirm(`Remove ${getUserLabel(memberUid)} from the group?`)) {
      return;
    }

    setBusy(memberUid);
    setError("");

    try {
      const nextMembers = memberUids.filter((uid) => uid !== memberUid);

      const nextMemberNames = {
        ...(chat.memberNames || {}),
      };
      delete nextMemberNames[memberUid];

      const nextMemberPhotos = {
        ...(chat.memberPhotos || {}),
      };
      delete nextMemberPhotos[memberUid];

      await updateDoc(doc(db, "chats", chatId), {
        members: nextMembers,
        memberNames: nextMemberNames,
        memberPhotos: nextMemberPhotos,
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to remove member.");
    } finally {
      setBusy("");
    }
  };

  const handleToggleAdmin = async (memberUid) => {
    if (!isCreator) {
      setError("Only the group creator can manage admins.");
      return;
    }

    if (memberUid === chat.createdBy) {
      return;
    }

    setBusy(`admin-${memberUid}`);
    setError("");

    try {
      const currentlyAdmin = adminUids.includes(memberUid);

      let nextAdmins = currentlyAdmin
        ? adminUids.filter((uid) => uid !== memberUid)
        : [...adminUids, memberUid];

      /*
       * Never remove the creator from the admins list.
       */
      if (!nextAdmins.includes(chat.createdBy)) {
        nextAdmins = [chat.createdBy, ...nextAdmins];
      }

      await updateDoc(doc(db, "chats", chatId), {
        admins: [...new Set(nextAdmins)],
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update admin role.");
    } finally {
      setBusy("");
    }
  };

  const handleToggleMute = async () => {
    setError("");
    setBusy("mute");

    try {
      await toggleMuteChat(chatId, authUser.uid, isMuted);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update notifications.");
    } finally {
      setBusy("");
    }
  };

  const handleTogglePin = async () => {
    setError("");
    setBusy("pin");

    try {
      const currentPinned = Array.isArray(chat.pinnedBy)
        ? chat.pinnedBy
        : [];

      const nextPinned = isPinned
        ? currentPinned.filter((uid) => uid !== authUser.uid)
        : [...currentPinned, authUser.uid];

      await updateDoc(doc(db, "chats", chatId), {
        pinnedBy: [...new Set(nextPinned)],
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update pinned status.");
    } finally {
      setBusy("");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;

    setBusy("leave");
    setError("");

    try {
      await leaveGroup(chatId, chat, authUser.uid);
      onNavigate?.("/community/chat");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to leave the group.");
      setBusy("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          type="button"
          onClick={() => onNavigate?.("/community/chat/room", chatId)}
          style={styles.backBtn}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={styles.headerTitle}>Group Info</div>
      </div>

      <div style={styles.content}>
        <div style={styles.groupHeaderCard}>
          <div style={styles.avatarGroup}>
            <Users size={28} />
          </div>

          {editingName ? (
            <div style={styles.editNameRow}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={styles.nameInput}
                autoFocus
              />

              <button
                type="button"
                onClick={handleSaveName}
                disabled={busy === "rename"}
                style={styles.saveNameBtn}
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div style={styles.groupNameRow}>
              <div style={styles.groupName}>
                {chat.name || "Unnamed Group"}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  style={styles.editBtn}
                  title="Rename group"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}

          <div style={styles.memberCount}>
            {memberList.length} members
          </div>

          {isAdmin && (
            <div style={styles.adminStatus}>
              <Shield size={13} />
              {isCreator ? "Creator" : "Group Admin"}
            </div>
          )}
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        {/* GROUP SETTINGS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Group Settings</h2>

          <button
            type="button"
            onClick={handleToggleMute}
            disabled={busy === "mute"}
            style={styles.settingRow}
          >
            <div style={styles.settingIcon}>
              {isMuted ? <Bell size={18} /> : <BellOff size={18} />}
            </div>

            <div style={styles.settingInfo}>
              <div style={styles.settingName}>
                {isMuted ? "Unmute Notifications" : "Mute Notifications"}
              </div>
              <div style={styles.settingDescription}>
                {isMuted
                  ? "You will receive group notifications again."
                  : "Stop notifications from this group on your account."}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleTogglePin}
            disabled={busy === "pin"}
            style={styles.settingRow}
          >
            <div style={styles.settingIcon}>
              <Pin size={18} />
            </div>

            <div style={styles.settingInfo}>
              <div style={styles.settingName}>
                {isPinned ? "Unpin from Top" : "Pin to Top"}
              </div>
              <div style={styles.settingDescription}>
                {isPinned
                  ? "Remove this group from the top of your chat list."
                  : "Keep this group at the top of your chat list."}
              </div>
            </div>

            {isPinned && <span style={styles.activeTag}>Pinned</span>}
          </button>
        </div>

        {/* MEMBERS */}
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <div>
              <h2 style={styles.cardTitle}>Members</h2>
              <p style={styles.cardSubtitle}>
                {isAdmin
                  ? "Admins can invite members and manage normal members."
                  : "View everyone in this group."}
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddFriends((s) => !s)}
                style={styles.addMemberBtn}
              >
                <UserPlus size={14} />
                Invite
              </button>
            )}
          </div>

          {showAddFriends && (
            <div style={styles.addFriendsBox}>
              {addableFriends.length === 0 ? (
                <p style={styles.emptyText}>
                  All your friends are already in this group.
                </p>
              ) : (
                <>
                  <div style={styles.inviteHint}>
                    Select friends to invite into this group.
                  </div>

                  <div style={styles.inviteSearchRow}>
                    <input type="text" value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} placeholder="Search friends..." style={styles.inviteSearchInput} />
                  </div>

                  {filteredAddableFriends.length === 0 ? (
                    <p style={styles.emptyText}>No matching friends found.</p>
                  ) : filteredAddableFriends.map((friend) => {
                    const selected = selectedToAdd.some(
                      (f) => f.uid === friend.uid
                    );

                    return (
                      <button
                        key={friend.uid}
                        type="button"
                        onClick={() => toggleSelectToAdd(friend)}
                        style={{
                          ...styles.friendPickRow,
                          ...(selected
                            ? styles.friendPickRowSelected
                            : {}),
                        }}
                      >
                        <div style={styles.avatarFallbackSm}>
                          {(friend.name || friend.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span style={styles.friendPickName}>
                          {friend.name || friend.email || "Unknown"}
                        </span>

                        {selected && (
                          <span style={styles.selectedTag}>Selected</span>
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={
                      busy === "add" || selectedToAdd.length === 0
                    }
                    style={styles.confirmAddBtn}
                  >
                    {busy === "add"
                      ? "Inviting..."
                      : `Invite ${selectedToAdd.length || ""}`}
                  </button>
                </>
              )}
            </div>
          )}

          <div style={styles.memberList}>
            {sortedMembers.map((member) => (
              <div key={member.uid} style={styles.memberRow}>
                <div style={styles.memberInfo}>
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt=""
                      style={styles.memberPhoto}
                    />
                  ) : (
                    <div style={styles.avatarFallbackSm}>
                      {(member.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div style={styles.memberText}>
                    <div style={styles.memberName}>
                      {member.name}
                      {member.uid === authUser.uid && (
                        <span style={styles.youTag}> (You)</span>
                      )}
                    </div>

                    <div style={styles.memberRoles}>
                      {member.isCreator && (
                        <span style={styles.creatorTag}>
                          <Crown size={11} />
                          Creator
                        </span>
                      )}

                      {!member.isCreator && member.isAdmin && (
                        <span style={styles.adminTag}>
                          <Shield size={11} />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isCreator && member.uid !== authUser.uid && (
                  <button
                    type="button"
                    onClick={() => handleToggleAdmin(member.uid)}
                    disabled={busy === `admin-${member.uid}`}
                    style={
                      member.isAdmin
                        ? styles.adminActionBtnActive
                        : styles.adminActionBtn
                    }
                    title={
                      member.isAdmin
                        ? "Remove admin role"
                        : "Make group admin"
                    }
                  >
                    {member.isAdmin ? (
                      <ShieldOff size={15} />
                    ) : (
                      <Shield size={15} />
                    )}
                  </button>
                )}

                {isAdmin &&
                  member.uid !== authUser.uid &&
                  !member.isCreator &&
                  !member.isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.uid)}
                      disabled={busy === member.uid}
                      style={styles.removeMemberBtn}
                      title="Remove member"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLeaveGroup}
          disabled={busy === "leave"}
          style={styles.leaveBtn}
        >
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

  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },

  backBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    color: "#374151",
    padding: 0,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },

  content: {
    padding: "24px 20px 40px",
    maxWidth: 560,
    margin: "0 auto",
  },

  groupHeaderCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    marginBottom: 20,
  },

  avatarGroup: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },

  groupNameRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  groupName: {
    fontSize: 20,
    fontWeight: 800,
    color: "#111827",
  },

  editBtn: {
    border: "none",
    background: "#f3f4f6",
    borderRadius: 8,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6b7280",
  },

  editNameRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
  },

  nameInput: {
    border: "1px solid #d1d5db",
    borderRadius: 9,
    padding: "8px 12px",
    fontSize: 15,
    outline: "none",
    minWidth: 220,
  },

  saveNameBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 8,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  memberCount: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 8,
  },

  adminStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    padding: "5px 9px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: 11.5,
    fontWeight: 700,
  },

  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 12px",
    margin: "0 0 14px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },

  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },

  cardSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    margin: "4px 0 0",
  },

  settingRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    border: "none",
    borderBottom: "1px solid #f3f4f6",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  settingInfo: {
    flex: 1,
    minWidth: 0,
  },

  settingName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#111827",
  },

  settingDescription: {
    marginTop: 3,
    fontSize: 11.5,
    color: "#9ca3af",
    lineHeight: 1.4,
  },

  activeTag: {
    fontSize: 11,
    fontWeight: 700,
    color: "#16a34a",
    background: "#dcfce7",
    borderRadius: 999,
    padding: "4px 8px",
  },

  addMemberBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "none",
    background: "#dcfce7",
    color: "#16a34a",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  inviteSearchRow: { marginBottom: 10 },
  inviteSearchInput: { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 9, padding: "10px 12px", fontSize: 13.5, outline: "none", background: "#fff" },

  addFriendsBox: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  inviteHint: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 9,
  },

  friendPickRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: "#fff",
    cursor: "pointer",
    marginBottom: 6,
    textAlign: "left",
    boxSizing: "border-box",
  },

  friendPickRowSelected: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
  },

  friendPickName: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#111827",
    flex: 1,
  },

  selectedTag: {
    fontSize: 11,
    fontWeight: 700,
    color: "#16a34a",
  },

  confirmAddBtn: {
    width: "100%",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 0",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },

  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
  },

  memberList: {
    borderTop: "1px solid #f3f4f6",
  },

  memberRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "11px 0",
    borderBottom: "1px solid #f3f4f6",
  },

  memberInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flex: 1,
  },

  memberPhoto: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },

  avatarFallbackSm: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },

  memberText: {
    minWidth: 0,
  },

  memberName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  memberRoles: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },

  creatorTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10.5,
    color: "#ea580c",
    fontWeight: 700,
  },

  adminTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10.5,
    color: "#2563eb",
    fontWeight: 700,
  },

  youTag: {
    fontSize: 11.5,
    color: "#9ca3af",
    fontWeight: 500,
  },

  adminActionBtn: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: 8,
    width: 31,
    height: 31,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  adminActionBtnActive: {
    border: "none",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: 8,
    width: 31,
    height: 31,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  removeMemberBtn: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: 8,
    width: 31,
    height: 31,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  leaveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};
