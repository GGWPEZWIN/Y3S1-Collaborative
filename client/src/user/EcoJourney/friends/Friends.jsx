import React, { useEffect, useState, useRef } from "react";
import { Search, UserPlus, Check, X, MessageCircle, Trash2, Users, MoreVertical } from "lucide-react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  listenToFriends,
  listenToIncomingRequests,
  listenToOutgoingRequests,
} from "../../../firebase/friendService";
import { createOrGetDirectChat } from "../../../firebase/chatService";

export default function Friends({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [actionBusy, setActionBusy] = useState("");

  // "You and X are now friends!" banner, shown briefly after accepting a request.
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // Which friend's settings (⋮) menu is currently open, if any.
  const [openSettingsFor, setOpenSettingsFor] = useState(null);

  useEffect(() => {
    if (!authUser) return;
    const unsubFriends = listenToFriends(authUser.uid, setFriends);
    const unsubIncoming = listenToIncomingRequests(authUser.uid, setIncoming);
    const unsubOutgoing = listenToOutgoingRequests(authUser.uid, setOutgoing);
    return () => {
      unsubFriends();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [authUser]);

  // Clear any pending toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3500);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchStatus("");
    setSearchResults([]);
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const results = await searchUsers(searchEmail, authUser.uid);
      if (results.length === 0) {
        setSearchStatus("No users found. Try their exact email, or the start of their name.");
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setSearchStatus(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUser) => {
    setActionBusy(targetUser.uid);
    setSearchStatus("");
    try {
      await sendFriendRequest(
        { uid: authUser.uid, displayName: profile?.name, email: profile?.email },
        targetUser
      );
      setSearchStatus(`Friend request sent to ${targetUser.name || targetUser.email}!`);
      setSearchResults((prev) => prev.filter((u) => u.uid !== targetUser.uid));
    } catch (err) {
      setSearchStatus(err.message);
    } finally {
      setActionBusy("");
    }
  };

  const handleAccept = async (request) => {
    setActionBusy(request.id);
    try {
      await acceptFriendRequest(request);
      showToast(`You and ${request.fromName || "this traveler"} are now friends! 🎉`);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy("");
    }
  };

  const handleDecline = async (request) => {
    setActionBusy(request.id);
    try {
      await declineFriendRequest(request);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy("");
    }
  };

  const handleCancel = async (request) => {
    setActionBusy(request.id);
    try {
      await cancelFriendRequest(request);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy("");
    }
  };

  const handleRemoveFriend = async (friend) => {
    if (!window.confirm(`Remove ${friend.name || "this friend"}?`)) return;
    setActionBusy(friend.uid);
    setOpenSettingsFor(null);
    try {
      await removeFriend(authUser.uid, friend.uid);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy("");
    }
  };

  const handleMessage = async (friend) => {
    setActionBusy(friend.uid);
    try {
      const chatId = await createOrGetDirectChat(
        { uid: authUser.uid, displayName: profile?.name },
        friend
      );
      onNavigate("/community/chat/room", chatId);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy("");
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
    <Layout active="friends" user={layoutUser} onNavigate={onNavigate}>
      <div style={styles.content}>
        {toast && (
          <div style={styles.toast}>
            <Check size={16} />
            <span>{toast}</span>
          </div>
        )}

        <h1 style={styles.title}>Friends</h1>
        <p style={styles.subtitle}>Find travelers and grow your eco-community</p>

        {/* Add friend by email */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Add a Friend</h2>
          <form onSubmit={handleSearch} style={styles.searchRow}>
            <div style={styles.searchInputWrap}>
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by username or email"
                style={styles.searchInput}
              />
            </div>
            <button type="submit" disabled={searching} style={styles.searchBtn}>
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchStatus && <p style={styles.statusText}>{searchStatus}</p>}

          {searchResults.map((result) => (
            <div key={result.uid} style={styles.resultRow}>
              <div style={styles.resultInfo}>
                <div style={styles.avatarFallback}>
                  {(result.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.resultName}>{result.name || "Unnamed traveler"}</div>
                  <div style={styles.resultEmail}>{result.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSendRequest(result)}
                disabled={actionBusy === result.uid}
                style={styles.addBtn}
              >
                <UserPlus size={16} />
                {actionBusy === result.uid ? "Sending..." : "Add Friend"}
              </button>
            </div>
          ))}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Friend Requests ({incoming.length})</h2>
            {incoming.map((request) => (
              <div key={request.id} style={styles.requestRow}>
                <div style={styles.resultInfo}>
                  <div style={styles.avatarFallback}>
                    {(request.fromName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.resultName}>{request.fromName || "Unnamed traveler"}</div>
                    <div style={styles.resultEmail}>{request.fromEmail}</div>
                  </div>
                </div>
                <div style={styles.requestActions}>
                  <button
                    type="button"
                    onClick={() => handleAccept(request)}
                    disabled={actionBusy === request.id}
                    style={styles.acceptBtn}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(request)}
                    disabled={actionBusy === request.id}
                    style={styles.declineBtn}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Sent Requests ({outgoing.length})</h2>
            {outgoing.map((request) => (
              <div key={request.id} style={styles.requestRow}>
                <div style={styles.resultInfo}>
                  <div style={styles.avatarFallback}>
                    {(request.toName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.resultName}>{request.toName || request.toEmail}</div>
                    <div style={styles.resultEmail}>Pending...</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancel(request)}
                  disabled={actionBusy === request.id}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Users size={18} style={{ marginRight: 6, verticalAlign: -3 }} />
            My Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <p style={styles.emptyText}>No friends yet — search for someone above to get started.</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.uid} style={styles.requestRow}>
                <div style={styles.resultInfo}>
                  <div style={styles.avatarFallback}>
                    {(friend.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.resultName}>{friend.name || "Unnamed traveler"}</div>
                    <div style={styles.resultEmail}>{friend.email}</div>
                  </div>
                </div>
                <div style={{ ...styles.requestActions, position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => handleMessage(friend)}
                    disabled={actionBusy === friend.uid}
                    style={styles.messageBtn}
                    title="Message"
                  >
                    <MessageCircle size={16} />
                  </button>

                  {/* Settings menu — Remove Friend now lives in here instead of a bare row button */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSettingsFor((prev) => (prev === friend.uid ? null : friend.uid))
                    }
                    style={styles.settingsBtn}
                    title="Friend settings"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openSettingsFor === friend.uid && (
                    <div style={styles.settingsMenu}>
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend)}
                        disabled={actionBusy === friend.uid}
                        style={styles.settingsMenuItem}
                      >
                        <Trash2 size={15} />
                        Remove Friend
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #86efac",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" },
  searchRow: { display: "flex", gap: 10 },
  searchInputWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 14px",
    background: "#f9fafb",
  },
  searchInput: { border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14.5 },
  searchBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 12,
    padding: "0 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  statusText: { fontSize: 13.5, color: "#6b7280", marginTop: 12, marginBottom: 0 },
  resultRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 12,
    background: "#f9fafb",
    borderRadius: 12,
  },
  requestRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  resultInfo: { display: "flex", alignItems: "center", gap: 12 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  },
  resultName: { fontSize: 14.5, fontWeight: 700, color: "#111827" },
  resultEmail: { fontSize: 12.5, color: "#9ca3af", marginTop: 2 },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  requestActions: { display: "flex", gap: 8 },
  acceptBtn: {
    border: "none",
    background: "#dcfce7",
    color: "#16a34a",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  declineBtn: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  messageBtn: {
    border: "none",
    background: "#dbeafe",
    color: "#2563eb",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  settingsBtn: {
    border: "none",
    background: "#f3f4f6",
    color: "#6b7280",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  settingsMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    padding: 6,
    zIndex: 10,
    minWidth: 160,
  },
  settingsMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#b91c1c",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  cancelBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyText: { fontSize: 13.5, color: "#9ca3af", margin: 0 },
};