import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, Users, MoreVertical, BellOff, Bell, Trash2, Paperclip, Search, CheckSquare, Pin, LogOut, UserPlus, X, Copy, Check, CheckCheck } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
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
    setMessageMenuId(null);
    const copyText = msg.text || (msg.type === "image" ? "Photo" : msg.type === "video" ? "Video" : "");
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
    } catch (err) {
      reportError(new Error("Could not copy the message."));
    }
  };

  const handleSelectOne = (messageId) => {
    setMessageMenuId(null);
    setSelectMode(true);
    setSelectedMessages([messageId]);
  };

  const handleDeleteForMe = async (messageId) => {
    setMessageMenuId(null);
    try {
      await deleteMessageForMe(chatId, messageId, authUser.uid);
    } catch (err) {
      reportError(err);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    setMessageMenuId(null);
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteMessageForEveryone(chatId, messageId, authUser.uid);
    } catch (err) {
      reportError(err);
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

  const otherUid = !isGroup ? chat.members.find((m) => m !== authUser.uid) : null;
  const title = isGroup ? chat.name : chat.memberNames?.[otherUid] || "Chat";

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
              <div style={isGroup ? styles.avatarGroup : styles.avatarFallback}>
                {isGroup ? <Users size={16} /> : (title || "?").charAt(0).toUpperCase()}
              </div>
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
                    {chat.members?.length || 0} members · tap for info
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
            const isHovered = hoverMessageId === msg.id;
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
                  onMouseEnter={() => setHoverMessageId(msg.id)}
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

                  {!selectMode && !isDeletedForEveryone && (isHovered || messageMenuId === msg.id) && (
                    <div
                      style={{
                        ...styles.messageOptions,
                        ...(isMe ? { right: -42 } : { left: -42 }),
                      }}
                      onMouseEnter={() => setHoverMessageId(msg.id)}
                      onMouseLeave={() => {
                        setHoverMessageId(null);
                        setMessageMenuId(null);
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageMenuId(msg.id);
                        }}
                        style={styles.messageMenuBtn}
                        title="Message options"
                        aria-label="Message options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {messageMenuId === msg.id && (
                        <div
                          style={{
                            ...styles.messageMenu,
                            ...(isMe
                              ? { right: 0 }
                              : { left: 0 }),
                          }}
                          onMouseEnter={() => setHoverMessageId(msg.id)}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMessage(msg);
                            }}
                            style={styles.messageMenuItem}
                          >
                            <Copy size={14} />
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOne(msg.id);
                            }}
                            style={styles.messageMenuItem}
                          >
                            <CheckSquare size={14} />
                            <span>Select</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteForMe(msg.id);
                            }}
                            style={styles.messageMenuItem}
                          >
                            <Trash2 size={14} />
                            <span>Delete for me</span>
                          </button>

                          {isMe && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteForEveryone(msg.id);
                              }}
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
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
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
  messageOptions: {
    position: "absolute",
    top: 4,
    zIndex: 100,
    width: 34,
    minHeight: 34,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  messageMenuBtn: {
    border: "none",
    background: "transparent",
    color: "rgba(107,114,128,.75)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,.12)",
  },
  messageMenu: {
    position: "absolute",
    top: 30,
    minWidth: 185,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 8px 20px rgba(0,0,0,.12)",
    padding: 5,
    zIndex: 200,
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