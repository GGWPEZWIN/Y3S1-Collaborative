import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronDown, Send, Users, MoreVertical, BellOff, Bell, Trash2, Paperclip, Search, CheckSquare, Pin, LogOut, UserPlus, X, Copy, Check, CheckCheck } from "lucide-react";
import { collection, doc, onSnapshot, query, where, updateDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  listenToMessages,
  sendMessage,
  sendImageMessage,
  sendVideoMessage,
  toggleMuteChat,
  deleteConversation,
  leaveGroup,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markMessagesAsRead,
} from "../../../firebase/chatService";

/**
 * chatId is passed in as a prop by your router — wire it up wherever
 * you navigate to `/chat/:chatId`, e.g.:
 *   <ChatRoom chatId={params.chatId} onNavigate={onNavigate} />
 */
function toDate(value) {
  try {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (value?.seconds != null) return new Date(Number(value.seconds) * 1000);
    if (value instanceof Date) return value;
    if (typeof value === "number") return new Date(value);
    if (typeof value === "string") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  } catch {}
  return null;
}

function formatMessageTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

function formatDateSeparator(value) {
  const date = toDate(value);
  if (!date) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - messageDay) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

export default function ChatRoom({ chatId, onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [chat, setChat] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const [showSettings, setShowSettings] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [hoverMessageId, setHoverMessageId] = useState(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState(null);
  const [forwardMessages, setForwardMessages] = useState([]);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [forwardChats, setForwardChats] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const messageHoverTimerRef = useRef(null);

  // Media is previewed first. Nothing is uploaded/sent until the user
  // explicitly presses Send, similar to WhatsApp.
  const [pendingMedia, setPendingMedia] = useState([]);
  const fileInputRef = useRef(null);

  // Visible in-page error banner — window.alert() can be silently
  // suppressed in some embedded/iframe browser previews, so surface
  // failures here too (and always log to console for devtools).
  const reportError = (err) => {
    console.error(err);
    setChatError(err?.message || "Something went wrong.");
    setTimeout(() => setChatError(""), 6000);
  };

  /* =========================================================
     LOAD THE CHAT DOCUMENT

     IMPORTANT:
     ChatList opens ChatRoom with:
       onNavigate("/community/chat/room", chat.id)

     Therefore ChatRoom receives the Firestore document id
     through the chatId prop. This listener loads that document.
  ========================================================= */

  useEffect(() => {
    if (!chatId) {
      console.error(
        "ChatRoom: chatId is missing.",
        { chatId }
      );

      setChat(null);
      setChatError(
        "No chat ID was passed to ChatRoom."
      );

      return;
    }

    setChat(null);
    setChatError("");

    const chatRef = doc(
      db,
      "chats",
      String(chatId)
    );

    const unsubscribe = onSnapshot(
      chatRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.error(
            "ChatRoom: chat document does not exist:",
            chatId
          );

          setChat(null);
          setChatError(
            "This chat does not exist anymore."
          );

          return;
        }

        setChat({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setChatError("");
      },
      (error) => {
        console.error(
          "ChatRoom: failed to load chat document:",
          error
        );

        setChat(null);
        setChatError(
          error?.message ||
            "Failed to load this chat."
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatId]);


  /* =========================================================
     LIVE DIRECT-CHAT FRIEND PROFILE

     chat.memberNames/memberPhotos are cached values. Always use
     users/{uid} as the source of truth for a direct chat so a
     renamed friend or changed profile picture appears immediately.
  ========================================================= */

  useEffect(() => {
    if (!chat || chat.type === "group" || !authUser?.uid) {
      setOtherProfile(null);
      return undefined;
    }

    const members = Array.isArray(chat.members) ? chat.members : [];
    const otherUid = members.find((uid) => uid !== authUser.uid);

    if (!otherUid) {
      setOtherProfile(null);
      return undefined;
    }

    const userRef = doc(db, "users", otherUid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setOtherProfile(null);
          return;
        }

        setOtherProfile({
          uid: otherUid,
          ...snapshot.data(),
        });
      },
      (error) => {
        console.error(
          "ChatRoom: failed to load live friend profile:",
          error
        );
      }
    );

    return () => unsubscribe?.();
  }, [chat, authUser?.uid]);


  /* =========================================================
     LISTEN TO CHAT MESSAGES
  ========================================================= */

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const unsubscribe =
      listenToMessages(
        chatId,
        (newMessages) => {
          setMessages(
            Array.isArray(newMessages)
              ? newMessages
              : []
          );
        },
        (error) => {
          console.error(
            "ChatRoom: failed to load messages:",
            error
          );

          setChatError(
            error?.message ||
              "Failed to load messages."
          );
        }
      );

    return () => {
      if (
        typeof unsubscribe ===
        "function"
      ) {
        unsubscribe();
      }
    };
  }, [chatId]);


  /* =========================================================
     MARK MESSAGES AS READ / SEEN
  ========================================================= */

  useEffect(() => {
    if (
      !chatId ||
      !authUser?.uid ||
      !chat
    ) {
      return;
    }

    markMessagesAsRead(
      chatId,
      authUser.uid
    ).catch((error) => {
      console.error(
        "ChatRoom: failed to mark messages as read:",
        error
      );
    });
  }, [
    chatId,
    authUser?.uid,
    chat,
    messages.length,
  ]);


  /* =========================================================
     AUTO-SCROLL WHEN NEW MESSAGES ARRIVE
  ========================================================= */

  useEffect(() => {
    if (!bottomRef.current) {
      return;
    }

    bottomRef.current.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);


  const isMuted = !!chat?.mutedBy?.includes(authUser?.uid);
  const isPinned = !!chat?.pinnedBy?.includes(authUser?.uid);
  const isGroup = chat?.type === "group";

  const handleToggleMute = async () => {
    setShowSettings(false);
    try {
      await toggleMuteChat(chatId, authUser.uid, isMuted);
    } catch (err) {
      reportError(err);
    }
  };

  const handleTogglePin = async () => {
    setShowSettings(false);

    try {
      const currentPinned = Array.isArray(chat?.pinnedBy)
        ? chat.pinnedBy
        : [];

      const nextPinned = isPinned
        ? currentPinned.filter((uid) => uid !== authUser.uid)
        : [...currentPinned, authUser.uid];

      await updateDoc(doc(db, "chats", chatId), {
        pinnedBy: [...new Set(nextPinned)],
      });
    } catch (err) {
      reportError(err);
    }
  };

  const handleDeleteConversation = async () => {
    setShowSettings(false);

    const confirmed = window.confirm(
      "Delete this conversation? This will permanently remove every message for both people in this chat. This can't be undone."
    );

    if (!confirmed) return;

    try {
      await deleteConversation(chatId, authUser.uid);
      onNavigate("/community/chat");
    } catch (err) {
      reportError(err);
    }
  };

  const handleOpenGroupInfo = () => {
    setShowSettings(false);

    // Keep the chat id in the same second argument format used by
    // the existing ChatList navigation.
    onNavigate("/community/chat/info", chatId);
  };

  const handleAddMember = () => {
    setShowSettings(false);
    onNavigate("/community/chat/info", chatId);
  };

  const handleOpenSearch = () => {
    setShowSettings(false);
    setSearchOpen(true);
  };

  const handleSelectMessages = () => {
    setShowSettings(false);
    setSearchOpen(false);
    setSelectMode(true);
    setSelectedMessages([]);
  };

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedMessages([]);
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleExitGroup = async () => {
    setShowSettings(false);

    if (!window.confirm("Leave this group?")) return;

    try {
      await leaveGroup(chatId, chat, authUser.uid);
      onNavigate("/community/chat");
    } catch (err) {
      reportError(err);
    }
  };

  const handleCopyMessage = async (msg) => {
    closeMessageMenu();

    // Text is copied as text. For media, copy the shared media URL when
    // available so the Copy action still works for images and videos.
    const copyText =
      msg.text ||
      msg.imageUrl ||
      msg.videoUrl ||
      msg.mediaUrl ||
      (msg.type === "image"
        ? "Photo"
        : msg.type === "video"
        ? "Video"
        : msg.type === "audio" || msg.type === "voice"
        ? "Voice message"
        : "");

    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
    } catch (err) {
      reportError(new Error("Could not copy the message."));
    }
  };

  const handleMessageMouseEnter = (messageId) => {
    if (messageHoverTimerRef.current) {
      clearTimeout(messageHoverTimerRef.current);
      messageHoverTimerRef.current = null;
    }
    setHoverMessageId(messageId);
  };

  const handleMessageMouseLeave = () => {
    if (messageHoverTimerRef.current) {
      clearTimeout(messageHoverTimerRef.current);
    }

    messageHoverTimerRef.current = setTimeout(() => {
      setHoverMessageId(null);
      messageHoverTimerRef.current = null;
    }, 180);
  };

  // Open the operations menu from the small hover arrow.
  // Position it relative to the viewport and flip/clamp it when near an edge.
  const handleMessageMenuOpen = (event, messageId) => {
    event.preventDefault();
    event.stopPropagation();

    const MENU_WIDTH = 220;
    const MENU_MAX_HEIGHT = Math.min(430, Math.max(160, window.innerHeight - 24));
    const GAP = 6;
    const PADDING = 12;

    let x = event.clientX;
    let y = event.clientY;

    if (x + MENU_WIDTH > window.innerWidth - PADDING) {
      x = event.clientX - MENU_WIDTH + GAP;
    }

    if (y + MENU_MAX_HEIGHT > window.innerHeight - PADDING) {
      y = event.clientY - MENU_MAX_HEIGHT + GAP;
    }

    x = Math.min(
      Math.max(PADDING, x),
      Math.max(PADDING, window.innerWidth - MENU_WIDTH - PADDING)
    );

    y = Math.min(
      Math.max(PADDING, y),
      Math.max(PADDING, window.innerHeight - MENU_MAX_HEIGHT - PADDING)
    );

    setMessageMenuPosition({ x, y });
    setMessageMenuId(messageId);
  };

  const closeMessageMenu = () => {
    setMessageMenuId(null);
    setMessageMenuPosition(null);
  };

  useEffect(() => {
    if (messageMenuId == null) return undefined;

    const handleOutsidePointer = () => closeMessageMenu();
    const handleEscape = (event) => {
      if (event.key === "Escape") closeMessageMenu();
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [messageMenuId]);

  const handleSelectOne = (messageId) => {
    closeMessageMenu();
    setSelectMode(true);
    setSelectedMessages([messageId]);
  };

  const handleOpenForward = async (messageIds) => {
    closeMessageMenu();

    const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (!uniqueIds.length || !authUser?.uid) return;

    setForwardMessages(uniqueIds);
    setShowForwardPicker(true);
    setForwardLoading(true);
    setForwardChats([]);

    try {
      // Load the current user's direct/group chats. Only chats where the
      // current user is a member are shown as forwarding destinations.
      const chatsRef = collection(db, "chats");
      const chatsSnap = await getDocs(
        query(chatsRef, where("members", "array-contains", authUser.uid))
      );

      const chatsList = chatsSnap.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((item) => item.id !== chatId);

      setForwardChats(chatsList);
    } catch (err) {
      console.error("Failed to load forward chats:", err);
      reportError(new Error("Could not load chats for forwarding."));
    } finally {
      setForwardLoading(false);
    }
  };

  const handleForwardToChat = async (targetChat) => {
    if (!targetChat?.id || !forwardMessages.length || !authUser?.uid) return;

    try {
      setForwardLoading(true);

      for (const messageId of forwardMessages) {
        const original = messages.find((msg) => msg.id === messageId);
        if (!original) continue;

        // Re-send the original content to the selected chat.
        if (original.type === "image" && (original.imageUrl || original.mediaUrl)) {
          await sendMessage(
            targetChat.id,
            authUser,
            original.text || original.imageUrl || original.mediaUrl
          );
        } else if (original.type === "video" && (original.videoUrl || original.mediaUrl)) {
          await sendMessage(
            targetChat.id,
            authUser,
            original.text || original.videoUrl || original.mediaUrl
          );
        } else if (original.text) {
          await sendMessage(targetChat.id, authUser, original.text);
        }
      }

      setShowForwardPicker(false);
      setForwardMessages([]);
      setForwardChats([]);
    } catch (err) {
      console.error("Failed to forward message:", err);
      reportError(err);
    } finally {
      setForwardLoading(false);
    }
  };

  const handleCloseForwardPicker = () => {
    if (forwardLoading) return;
    setShowForwardPicker(false);
    setForwardMessages([]);
    setForwardChats([]);
  };

  const handleDeleteForMe = async (messageId) => {
    closeMessageMenu();
    try {
      await deleteMessageForMe(chatId, messageId, authUser.uid);
    } catch (err) {
      reportError(err);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    closeMessageMenu();
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteMessageForEveryone(chatId, messageId, authUser.uid);
    } catch (err) {
      reportError(err);
    }
  };


  /* =========================================================
     SEND TEXT MESSAGE
  ========================================================= */

  const handleSend = async (event) => {
    event?.preventDefault();

    const trimmed = text.trim();

    if (!trimmed || sending || !chatId || !authUser?.uid) {
      return;
    }

    setSending(true);

    try {
      await sendMessage(chatId, authUser, trimmed);
      setText("");
    } catch (err) {
      reportError(err);
    } finally {
      setSending(false);
    }
  };

  /* =========================================================
     MEDIA PICKER / PREVIEW
  ========================================================= */

  const handlePickMedia = () => {
    if (uploadingMedia || pendingMedia.length > 0) return;
    fileInputRef.current?.click();
  };

  const handleMediaChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type.startsWith("video/")
    );

    if (!validFiles.length) {
      reportError(new Error("Please select an image or video file."));
      return;
    }

    const previews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video",
    }));

    setPendingMedia((prev) => [...prev, ...previews]);
  };

  const removePendingMedia = (index) => {
    setPendingMedia((prev) => {
      const item = prev[index];

      if (item?.url) {
        URL.revokeObjectURL(item.url);
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const clearPendingMedia = () => {
    setPendingMedia((prev) => {
      prev.forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });

      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     SEND PREVIEWED MEDIA
  ========================================================= */

  const handleSendPendingMedia = async () => {
    if (!pendingMedia.length || uploadingMedia || !chatId || !authUser?.uid) {
      return;
    }

    setUploadingMedia(true);

    try {
      for (const item of pendingMedia) {
        if (!item?.file) continue;

        if (item.type === "image") {
          await sendImageMessage(chatId, authUser, item.file);
        } else if (item.type === "video") {
          await sendVideoMessage(chatId, authUser, item.file);
        }
      }

      clearPendingMedia();
    } catch (err) {
      reportError(err);
    } finally {
      setUploadingMedia(false);
    }
  };

  const filteredMessages = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const visible = messages.filter((msg) => {
      // Delete for me: hidden only for this user.
      if (authUser?.uid && Array.isArray(msg.deletedFor) && msg.deletedFor.includes(authUser.uid)) return false;
      // Delete for everyone: keep the tombstone so everyone sees the deleted box.
      return true;
    });

    if (!keyword) return visible;

    return visible.filter((msg) =>
      [msg.text, msg.senderName, msg.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [messages, searchText, authUser?.uid]);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>
          Loading...
        </p>
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
          onClick={() => onNavigate("/login")}
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
        <p
          style={{
            color: "#b91c1c",
            marginBottom: 16,
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          {chatError ||
            "Unable to load this chat."}
        </p>

        <p
          style={{
            color: "#9ca3af",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          Chat ID: {chatId || "missing"}
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate("/community/chat")
          }
          style={styles.loginRedirectBtn}
        >
          Back to Chats
        </button>
      </div>
    );
  }

  const memberList = Array.isArray(chat.members)
    ? chat.members
    : [];

  const otherUid = !isGroup
    ? memberList.find((m) => m !== authUser.uid)
    : null;

  const title = isGroup
    ? chat.name || "Group Chat"
    : otherProfile?.name ||
      otherProfile?.displayName ||
      chat.memberNames?.[otherUid] ||
      "Chat";

  const otherProfilePhoto = isGroup
    ? ""
    : otherProfile?.profile_photo_url ||
      otherProfile?.profilePhotoUrl ||
      otherProfile?.photoURL ||
      chat.memberPhotos?.[otherUid] ||
      "";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button type="button" onClick={() => onNavigate("/community/chat")} style={styles.backBtn}>
          <ChevronLeft size={20} />
        </button>
        {selectMode ? (
          <div style={styles.selectionHeader}>
            <button
              type="button"
              onClick={handleCancelSelect}
              style={styles.headerIconBtn}
              title="Cancel selection"
            >
              <X size={19} />
            </button>
            <div style={styles.selectionTitle}>
              {selectedMessages.length} selected
            </div>

            <button
              type="button"
              onClick={() => handleOpenForward(selectedMessages)}
              disabled={!selectedMessages.length}
              style={{
                ...styles.headerIconBtn,
                opacity: selectedMessages.length ? 1 : 0.45,
              }}
              title="Forward selected messages"
              aria-label="Forward selected messages"
            >
              <Send size={18} />
            </button>
          </div>
        ) : (
          <>
            <div
              style={styles.headerClickable}
              onClick={
                isGroup
                  ? handleOpenGroupInfo
                  : () =>
                      onNavigate(
                        "/community/chat/friend-profile",
                        otherUid
                      )
              }
              title={
                isGroup
                  ? "Open group info"
                  : "Open friend profile"
              }
            >
              {isGroup ? (
                <div style={styles.avatarGroup}>
                  <Users size={16} />
                </div>
              ) : otherProfilePhoto ? (
                <img
                  src={otherProfilePhoto}
                  alt={title || "Friend"}
                  style={styles.headerAvatarImage}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div style={styles.avatarFallback}>
                  {(title || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={styles.headerTitle}>
                  {title || "Unnamed Group"}
                  {isMuted && (
                    <BellOff
                      size={13}
                      color="#9ca3af"
                      style={{ marginLeft: 6, verticalAlign: -1 }}
                    />
                  )}
                </div>
                {isGroup && (
                  <div style={styles.headerSubtitle}>
                    {memberList.length} members · tap for info
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginLeft: "auto", position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                style={styles.settingsBtn}
                title="Chat settings"
              >
                <MoreVertical size={18} />
              </button>

              {showSettings && (
                <div style={styles.settingsMenu}>
                  {isGroup && (
                    <>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        style={styles.settingsMenuItem}
                      >
                        <UserPlus size={15} />
                        Add member
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenGroupInfo}
                        style={styles.settingsMenuItem}
                      >
                        <Users size={15} />
                        Group info
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenSearch}
                    style={styles.settingsMenuItem}
                  >
                    <Search size={15} />
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectMessages}
                    style={styles.settingsMenuItem}
                  >
                    <CheckSquare size={15} />
                    Select messages
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    style={styles.settingsMenuItem}
                  >
                    {isMuted ? <Bell size={15} /> : <BellOff size={15} />}
                    {isMuted ? "Unmute notifications" : "Mute notifications"}
                  </button>

                  {isGroup ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTogglePin}
                        style={styles.settingsMenuItem}
                      >
                        <Pin size={15} />
                        {isPinned ? "Unpin from top" : "Pin to top"}
                      </button>

                      <button
                        type="button"
                        onClick={handleExitGroup}
                        style={{ ...styles.settingsMenuItem, color: "#b91c1c" }}
                      >
                        <LogOut size={15} />
                        Exit group
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDeleteConversation}
                      style={{ ...styles.settingsMenuItem, color: "#b91c1c" }}
                    >
                      <Trash2 size={15} />
                      Delete Conversation
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {searchOpen && (
        <div style={styles.searchBar}>
          <Search size={17} color="#6b7280" />
          <input
            type="text"
            autoFocus
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search messages..."
            style={styles.searchInput}
          />
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchText("");
            }}
            style={styles.searchCloseBtn}
            title="Close search"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div style={styles.messagesArea}>
        {filteredMessages.length === 0 ? (
          <p style={styles.emptyText}>
            {searchText.trim()
              ? "No matching messages found."
              : "Say hi to start the conversation 👋"}
          </p>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === authUser.uid;
            const isDeletedForEveryone = msg.deletedForEveryone === true || msg.type === "deleted";
            const readByOthers = Array.isArray(msg.readBy)
              ? msg.readBy.some((uid) => uid !== authUser.uid)
              : false;

            const rawTimestamp =
              msg.created_at ||
              msg.createdAt ||
              msg.timestamp ||
              msg.sentAt ||
              null;

            const messageDate = toDate(rawTimestamp);
            const isHovered = hoverMessageId === msg.id;
            const messageIndex = filteredMessages.indexOf(msg);
            const previousMessage = messageIndex > 0 ? filteredMessages[messageIndex - 1] : null;
            const previousDate = previousMessage
              ? toDate(previousMessage.created_at || previousMessage.createdAt || previousMessage.timestamp || previousMessage.sentAt)
              : null;
            const isNewDate = !!messageDate &&
              (!previousDate ||
                messageDate.getFullYear() !== previousDate.getFullYear() ||
                messageDate.getMonth() !== previousDate.getMonth() ||
                messageDate.getDate() !== previousDate.getDate());
            const timestamp = formatMessageTime(rawTimestamp);

            const bubbleStyle = isDeletedForEveryone
              ? styles.bubbleDeleted(isMe)
              : isMe
              ? styles.bubbleMine
              : styles.bubbleTheirs;

            return (
              <div key={`${msg.id}-container`}>
                {isNewDate && (
                  <div style={styles.dateSeparator}>
                    {formatDateSeparator(rawTimestamp)}
                  </div>
                )}
                <div
                  key={msg.id}
                  onClick={() => selectMode && toggleMessageSelection(msg.id)}
                  onMouseEnter={() => handleMessageMouseEnter(msg.id)}
                  onMouseLeave={handleMessageMouseLeave}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    cursor: selectMode ? "pointer" : "default",
                    padding: selectMode ? "3px 6px" : "2px 0",
                    borderRadius: 12,
                    background: selectedMessages.includes(msg.id) ? "#ecfdf5" : "transparent",
                  }}
                >
                {selectMode && (
                  <div style={styles.messageCheckbox}>
                    {selectedMessages.includes(msg.id) ? "✓" : ""}
                  </div>
                )}

                <div
                  style={{ ...styles.messageWrap, alignItems: isMe ? "flex-end" : "flex-start" }}
                  onMouseEnter={() => handleMessageMouseEnter(msg.id)}
                >
                  {isGroup && !isMe && !isDeletedForEveryone && (
                    <div style={styles.bubbleSender}>{msg.senderName}</div>
                  )}

                  <div style={bubbleStyle}>
                    {isDeletedForEveryone ? (
                      <div style={styles.deletedContent}>
                        <span>This message was deleted for everyone</span>
                        {timestamp && <span style={styles.deletedTime}>{timestamp}</span>}
                      </div>
                    ) : (
                      <>
                        {msg.type === "image" && (msg.imageUrl || msg.mediaUrl) && (
                          <img src={msg.imageUrl || msg.mediaUrl} alt="Shared" style={styles.chatImage} />
                        )}

                        {msg.type === "video" && (msg.videoUrl || msg.mediaUrl) && (
                          <video controls preload="metadata" src={msg.videoUrl || msg.mediaUrl} style={styles.chatVideo} />
                        )}

                        {(!msg.type || msg.type === "text") && (
                          <div style={styles.messageText}>{msg.text}</div>
                        )}

                        <div
                          style={{
                            ...styles.messageMeta,
                            color: isMe ? "rgba(255,255,255,.82)" : "#6b7280",
                          }}
                        >
                          <span>{timestamp}</span>
                          {isMe && (
                            <span style={readByOthers ? styles.readTicks : styles.sentTicks} title={readByOthers ? "Seen" : "Sent"}>
                              {readByOthers ? <CheckCheck size={15} strokeWidth={2.4} /> : <Check size={15} strokeWidth={2.4} />}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                  </div>

                  {!selectMode && !isDeletedForEveryone && isHovered && (
                    <button
                      type="button"
                      onClick={(event) => handleMessageMenuOpen(event, msg.id)}
                      style={styles.messageArrowBtn}
                      title="Message options"
                      aria-label="Message options"
                    >
                      <ChevronDown size={16} />
                    </button>
                  )}
                </div>
              </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {messageMenuId && messageMenuPosition && (
        <div
          style={{
            ...styles.messageContextMenu,
            left: messageMenuPosition.x,
            top: messageMenuPosition.y,
          }}
          onMouseEnter={() => {
            if (messageHoverTimerRef.current) {
              clearTimeout(messageHoverTimerRef.current);
              messageHoverTimerRef.current = null;
            }
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {(() => {
            const menuMessage = messages.find(
              (item) => item.id === messageMenuId
            );

            if (!menuMessage) return null;

            return (
              <div style={styles.messageContextMenuScroll}>
                <button
                  type="button"
                  onClick={() => handleCopyMessage(menuMessage)}
                  style={styles.messageMenuItem}
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOne(menuMessage.id)}
                  style={styles.messageMenuItem}
                >
                  <CheckSquare size={14} />
                  <span>Select</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenForward([menuMessage.id])}
                  style={styles.messageMenuItem}
                >
                  <Send size={14} />
                  <span>Forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteForMe(menuMessage.id)}
                  style={styles.messageMenuItem}
                >
                  <Trash2 size={14} />
                  <span>Delete for me</span>
                </button>

                {menuMessage.senderId === authUser.uid && (
                  <button
                    type="button"
                    onClick={() => handleDeleteForEveryone(menuMessage.id)}
                    style={{
                      ...styles.messageMenuItem,
                      color: "#b91c1c",
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete for everyone</span>
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {showForwardPicker && (
        <div style={styles.forwardOverlay}>
          <div style={styles.forwardPanel}>
            <div style={styles.forwardHeader}>
              <div>
                <div style={styles.forwardTitle}>Forward message</div>
                <div style={styles.forwardSubtitle}>
                  {forwardMessages.length} message{forwardMessages.length === 1 ? "" : "s"} selected
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseForwardPicker}
                disabled={forwardLoading}
                style={styles.forwardCloseBtn}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {forwardLoading ? (
              <div style={styles.forwardLoading}>Loading chats...</div>
            ) : forwardChats.length === 0 ? (
              <div style={styles.forwardEmpty}>
                No other chats available to forward to.
              </div>
            ) : (
              <div style={styles.forwardChatList}>
                {forwardChats.map((targetChat) => {
                  const isTargetGroup = targetChat.type === "group";
                  const targetTitle = isTargetGroup
                    ? targetChat.name || "Group Chat"
                    : (() => {
                        const members = Array.isArray(targetChat.members)
                          ? targetChat.members
                          : [];
                        const otherUid = members.find(
                          (uid) => uid !== authUser.uid
                        );
                        return (
                          targetChat.memberNames?.[otherUid] ||
                          "Chat"
                        );
                      })();

                  return (
                    <button
                      key={targetChat.id}
                      type="button"
                      onClick={() => handleForwardToChat(targetChat)}
                      disabled={forwardLoading}
                      style={styles.forwardChatItem}
                    >
                      <div style={styles.forwardChatAvatar}>
                        {isTargetGroup ? "👥" : (targetTitle || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.forwardChatInfo}>
                        <div style={styles.forwardChatName}>{targetTitle}</div>
                        <div style={styles.forwardChatType}>
                          {isTargetGroup ? "Group chat" : "Direct chat"}
                        </div>
                      </div>
                      <Send size={16} color="#16a34a" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {pendingMedia.length > 0 && (
        <div style={styles.mediaPreviewPanel}>
          <div style={styles.previewHeader}>
            <div style={styles.previewTitle}>
              {pendingMedia.length} {pendingMedia.length === 1 ? "item" : "items"} selected
            </div>
            <button
              type="button"
              onClick={clearPendingMedia}
              disabled={uploadingMedia}
              style={styles.previewCloseBtn}
              title="Cancel all"
            >
              <X size={18} />
            </button>
          </div>

          <div style={styles.mediaGrid}>
            {pendingMedia.map((item, index) => (
              <div key={`${item.url}-${index}`} style={styles.mediaThumb}>
                {item.type === "image" ? (
                  <img src={item.url} alt={`Preview ${index + 1}`} style={styles.mediaThumbImage} />
                ) : (
                  <video src={item.url} controls style={styles.mediaThumbVideo} />
                )}
                <button
                  type="button"
                  onClick={() => removePendingMedia(index)}
                  disabled={uploadingMedia}
                  style={styles.removeMediaBtn}
                  title="Remove"
                >
                  <X size={15} />
                </button>
                <div style={styles.mediaNumber}>{index + 1}</div>
              </div>
            ))}
          </div>

          <div style={styles.previewActions}>
            <button
              type="button"
              onClick={clearPendingMedia}
              disabled={uploadingMedia}
              style={styles.cancelPreviewBtn}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendPendingMedia}
              disabled={uploadingMedia}
              style={styles.confirmPreviewBtn}
            >
              {uploadingMedia ? "Sending..." : `Send ${pendingMedia.length > 1 ? "all" : ""}`}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} style={styles.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaChange}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={handlePickMedia}
          disabled={uploadingMedia || pendingMedia.length > 0}
          style={styles.iconBtn}
          title="Send an image or video"
          aria-label="Send an image or video"
        >
          <Paperclip size={19} color="#6b7280" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            pendingMedia.length > 0
              ? "Finish or cancel the preview first..."
              : "Type a message..."
          }
          disabled={pendingMedia.length > 0}
          style={styles.input}
        />

        <button
          type="submit"
          disabled={
            sending ||
            !text.trim() ||
            pendingMedia.length > 0
          }
          style={styles.sendBtn}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </form>

      {chatError && <div style={styles.errorBanner}>⚠️ {chatError}</div>}
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
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
  headerAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    display: "block",
  },
  avatarFallback: {
    width: 38,
    height: 38,
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
  avatarGroup: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerClickable: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    minWidth: 0,
  },
  headerTitle: { fontSize: 15.5, fontWeight: 700, color: "#111827" },
  selectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  selectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  headerIconBtn: {
    border: "none",
    background: "#f3f4f6",
    color: "#374151",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 14px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13.5,
    color: "#111827",
    background: "transparent",
  },
  searchCloseBtn: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    display: "flex",
    cursor: "pointer",
    padding: 4,
  },
  headerSubtitle: { fontSize: 12, color: "#9ca3af" },
  settingsBtn: {
    border: "none",
    background: "#f3f4f6",
    color: "#374151",
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
    zIndex: 20,
    minWidth: 200,
  },
  settingsMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#374151",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  dateSeparator: {
    alignSelf: "center",
    margin: "12px 0 8px",
    padding: "5px 10px",
    borderRadius: 10,
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: 13.5, marginTop: 40 },
  messageRow: { display: "flex", alignItems: "flex-end", width: "100%" },
  messageWrap: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width: "fit-content",
    maxWidth: "88%",
    minWidth: 0,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "normal",
  },
  messageCheckbox: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2px solid #16a34a",
    color: "#fff",
    background: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    marginRight: 7,
    flexShrink: 0,
  },
  bubbleMine: {
    background: "#16a34a",
    color: "#fff",
    borderRadius: "16px 16px 4px 16px",
    padding: "10px 16px",
    width: "fit-content",
    maxWidth: "100%",
    minWidth: 92,
    boxSizing: "border-box",
    fontSize: 14.5,
    lineHeight: 1.4,
  },
  bubbleTheirs: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    color: "#111827",
    borderRadius: "16px 16px 16px 4px",
    padding: "10px 16px",
    width: "fit-content",
    maxWidth: "100%",
    minWidth: 92,
    boxSizing: "border-box",
    fontSize: 14.5,
    lineHeight: 1.4,
  },
  bubbleImageWrap: (isMe) => ({
    background: "transparent",
    padding: 4,
    borderRadius: 16,
    maxWidth: "60%",
    border: isMe ? "none" : "1px solid #e5e7eb",
  }),
  chatImage: { width: "100%", maxWidth: 360, maxHeight: 360, objectFit: "cover", borderRadius: 12, display: "block" },
  chatVideo: { width: "100%", maxWidth: 420, maxHeight: 360, borderRadius: 12, display: "block", background: "#000" },
  audioPlayer: {
    maxWidth: 260,
  },

  voiceMessagePlayer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: 285,
    maxWidth: "100%",
    minWidth: 0,
  },

  voiceMessageMine: {
    color: "#fff",
  },

  voiceMessageTheirs: {
    color: "#111827",
  },

  audioElement: {
    width: 245,
    minWidth: 0,
    maxWidth: "100%",
    height: 40,
    display: "block",
  },

  voiceDuration: {
    fontSize: 10.5,
    fontWeight: 700,
    minWidth: 34,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  bubbleDeleted: (isMe) => ({
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    color: "#9ca3af",
    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    padding: "9px 12px",
    maxWidth: "100%",
    fontSize: 12.5,
    fontStyle: "italic",
  }),
  deletedContent: { display: "flex", alignItems: "center", gap: 10 },
  deletedTime: { fontSize: 10.5, color: "#a1a1aa", fontStyle: "normal", whiteSpace: "nowrap" },
  messageMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 1,
  },
  sentTicks: { display: "inline-flex", color: "rgba(255,255,255,.72)" },
  readTicks: { display: "inline-flex", color: "#93c5fd" },
  messageArrowBtn: {
    border: "none",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    minWidth: 30,
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0,0,0,.14)",
    marginLeft: 6,
    marginRight: 4,
    flexShrink: 0,
    alignSelf: "center",
  },
  messageContextMenu: {
    position: "fixed",
    width: 220,
    maxHeight: "calc(100vh - 24px)",
    boxSizing: "border-box",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 10px 28px rgba(0,0,0,.18)",
    padding: 5,
    zIndex: 10000,
    overflow: "hidden",
  },
  messageContextMenuScroll: {
    maxHeight: "calc(100vh - 34px)",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    scrollbarWidth: "thin",
  },
  messageMenuItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#374151",
    borderRadius: 8,
    padding: "9px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
  },
  bubbleSender: { fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginBottom: 3 },
  forwardOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11000,
    padding: 20,
    boxSizing: "border-box",
  },
  forwardPanel: {
    width: "min(420px, 100%)",
    maxHeight: "min(620px, 90vh)",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 18px 50px rgba(0,0,0,.22)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  forwardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    borderBottom: "1px solid #e5e7eb",
  },
  forwardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  forwardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },
  forwardCloseBtn: {
    border: "none",
    background: "#f3f4f6",
    color: "#374151",
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  forwardLoading: {
    padding: 30,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
  },
  forwardEmpty: {
    padding: 30,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
  },
  forwardChatList: {
    overflowY: "auto",
    padding: 8,
  },
  forwardChatItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    textAlign: "left",
  },
  forwardChatAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  forwardChatInfo: {
    flex: 1,
    minWidth: 0,
  },
  forwardChatName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  forwardChatType: {
    marginTop: 2,
    fontSize: 11,
    color: "#9ca3af",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 16,
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: "12px 18px",
    fontSize: 14.5,
    outline: "none",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  mediaPreviewPanel: {
    padding: "12px 16px 14px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  previewCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "#e5e7eb",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 8,
    maxHeight: 300,
    overflowY: "auto",
    padding: 2,
  },
  mediaThumb: {
    position: "relative",
    aspectRatio: "1 / 1",
    borderRadius: 12,
    overflow: "hidden",
    background: "#111827",
    border: "1px solid #e5e7eb",
  },
  mediaThumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  mediaThumbVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,.65)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  mediaNumber: {
    position: "absolute",
    bottom: 5,
    left: 5,
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 11,
    background: "rgba(0,0,0,.65)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPreviewBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
    maxHeight: 320,
    overflow: "hidden",
    background: "#111827",
    borderRadius: 14,
    padding: 8,
  },
  mediaPreviewImage: {
    maxWidth: "100%",
    maxHeight: 300,
    objectFit: "contain",
    borderRadius: 10,
  },
  mediaPreviewVideo: {
    width: "100%",
    maxHeight: 300,
    borderRadius: 10,
  },
  previewActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  cancelPreviewBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 10,
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmPreviewBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "9px 20px",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBanner: {
    textAlign: "center",
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: 600,
    padding: "10px 16px",
    background: "#fee2e2",
    borderTop: "1px solid #fecaca",
  },
};