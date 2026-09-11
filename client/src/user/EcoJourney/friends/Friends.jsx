import React, { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, Search, UserPlus, Check, X, MessageCircle, Trash2, Users, MoreVertical } from "lucide-react";
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

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NON_ALPHA_FILTERS = ["0-9", "#"];

export default function Friends({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Search/filter for the friends already in My Friends.
  const [friendSearch, setFriendSearch] = useState("");
  const [friendLetter, setFriendLetter] = useState("all");
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
        {
          uid: authUser.uid,
          displayName: profile?.name,
          email: profile?.email,
          profile_photo_url: profile?.profile_photo_url,
        },
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

  const filteredFriends = useMemo(() => {
    const search = friendSearch.trim().toLowerCase();

    return [...friends]
      .filter((friend) => {
        if (!search) return true;

        const name = (friend.name || "").toLowerCase();
        const email = (friend.email || "").toLowerCase();

        return name.includes(search) || email.includes(search);
      })
      .filter((friend) => {
        if (friendLetter === "all") return true;

        const name = (friend.name || "").trim();
        const firstChar = name.charAt(0);

        if (friendLetter === "0-9") {
          return /^[0-9]/.test(firstChar);
        }

        if (friendLetter === "#") {
          return !/^[A-Za-z0-9]/.test(firstChar);
        }

        return firstChar.toUpperCase() === friendLetter;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [friends, friendSearch, friendLetter]);

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

        <button
          type="button"
          onClick={() => onNavigate("/community")}
          style={styles.backButton}
        >
          <ArrowLeft size={17} />
          <span>Back to Community</span>
        </button>

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
                <ProfileAvatar
                  src={result.profile_photo_url}
                  name={result.name}
                />
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
                  <ProfileAvatar
                    src={request.fromProfilePhotoUrl}
                    name={request.fromName}
                  />
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
                  <ProfileAvatar
                    src={request.toProfilePhotoUrl}
                    name={request.toName}
                  />
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
          <div style={styles.friendsListHeader}>
            <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>
              <Users size={18} />
              <span>My Friends ({friends.length})</span>
            </h2>
            <span style={styles.friendsResultCount}>
              {filteredFriends.length} shown
            </span>
          </div>

          {friends.length > 0 && (
            <>
              {/* Search existing friends */}
              <div style={styles.friendSearchBox}>
                <Search size={18} color="#9ca3af" />
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search my friends by name or email"
                  style={styles.friendSearchInput}
                />
                {friendSearch && (
                  <button
                    type="button"
                    onClick={() => setFriendSearch("")}
                    style={styles.friendSearchClear}
                    aria-label="Clear friend search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Alphabet filter moved from ChatList to Friends */}
              <div style={styles.friendFilterRow}>
                <button
                  type="button"
                  onClick={() => setFriendLetter("all")}
                  style={
                    friendLetter === "all"
                      ? styles.friendFilterActive
                      : styles.friendFilterButton
                  }
                >
                  All
                </button>

                {ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setFriendLetter(letter)}
                    style={
                      friendLetter === letter
                        ? styles.friendFilterActive
                        : styles.friendFilterButton
                    }
                  >
                    {letter}
                  </button>
                ))}

                {NON_ALPHA_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFriendLetter(filter)}
                    style={
                      friendLetter === filter
                        ? styles.friendFilterActive
                        : styles.friendFilterButton
                    }
                    title={
                      filter === "0-9"
                        ? "Names beginning with a number"
                        : "Names beginning with a symbol or non-Latin character"
                    }
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </>
          )}

          {friends.length === 0 ? (
            <p style={styles.emptyText}>
              No friends yet — search for someone above to get started.
            </p>
          ) : filteredFriends.length === 0 ? (
            <div style={styles.noFriendMatch}>
              <Search size={25} color="#94a3b8" />
              <strong>No friends found</strong>
              <span>Try another name, email, or letter.</span>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div key={friend.uid} style={styles.requestRow}>
                <div style={styles.resultInfo}>
                  <ProfileAvatar
                    src={friend.profile_photo_url}
                    name={friend.name}
                  />
                  <div>
                    <div style={styles.resultName}>
                      {friend.name || "Unnamed traveler"}
                    </div>
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

                  <button
                    type="button"
                    onClick={() =>
                      setOpenSettingsFor((prev) =>
                        prev === friend.uid ? null : friend.uid
                      )
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

function ProfileAvatar({ src, name }) {
  const [imageFailed, setImageFailed] = useState(false);

  const initial =
    (name || "?").charAt(0).toUpperCase();

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={`${name || "Friend"} profile`}
        onError={() => setImageFailed(true)}
        style={styles.avatarImage}
      />
    );
  }

  return (
    <div style={styles.avatarFallback}>
      {initial}
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
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    border: "none",
    background: "transparent",
    color: "#64748b",
    padding: 0,
    marginBottom: 14,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
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
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
  },
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
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    flexShrink: 0,
    background: "#dcfce7",
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
  friendsListHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  friendsResultCount: {
    color: "#94a3b8",
    fontSize: 12.5,
    fontWeight: 600,
  },
  friendSearchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#f9fafb",
    marginBottom: 12,
  },
  friendSearchInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    color: "#111827",
  },
  friendSearchClear: {
    width: 28,
    height: 28,
    border: "none",
    borderRadius: 8,
    background: "#e5e7eb",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  friendFilterRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  friendFilterButton: {
    minWidth: 30,
    height: 30,
    padding: "0 7px",
    border: "1px solid #dbe1e8",
    borderRadius: 8,
    background: "#fff",
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  friendFilterActive: {
    minWidth: 30,
    height: 30,
    padding: "0 7px",
    border: "1px solid #16a34a",
    borderRadius: 8,
    background: "#16a34a",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  noFriendMatch: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "30px 18px",
    color: "#64748b",
    textAlign: "center",
    border: "1px dashed #dbe1e8",
    borderRadius: 12,
    background: "#f8fafc",
    marginTop: 4,
  },
  emptyText: { fontSize: 13.5, color: "#9ca3af", margin: 0 },
};