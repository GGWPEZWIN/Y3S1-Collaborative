import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, Users, MoreVertical, BellOff, Bell, Trash2, Paperclip, Mic, Pause, Play, Search, CheckSquare, Pin, LogOut, UserPlus, X, Copy, Check, CheckCheck } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  listenToMessages,
  sendMessage,
  sendImageMessage,
  sendVideoMessage,
  sendVoiceMessage,
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
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [hoverMessageId, setHoverMessageId] = useState(null);

  // Media is previewed first. Nothing is uploaded/sent until the user
  // explicitly presses Send, similar to WhatsApp.
  const [pendingMedia, setPendingMedia] = useState([]);
  const [pendingVoice, setPendingVoice] = useState(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingSecondsRef = useRef(0);
  const sendRecordingNowRef = useRef(false);

  // Visible in-page error banner — window.alert() can be silently
  // suppressed in some embedded/iframe browser previews, so surface
  // failures here too (and always log to console for devtools).
  const reportError = (err) => {
    console.error(err);
    setChatError(err?.message || "Something went wrong.");
    setTimeout(() => setChatError(""), 6000);
  };

  const formatDuration = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!chatId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (snap) => {
      setChat(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    const unsubMessages = listenToMessages(chatId, setMessages);
    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark incoming messages as seen when the chat is open.
  useEffect(() => {
    if (!chatId || !authUser?.uid || !messages.length) return;
    markMessagesAsRead(chatId, authUser.uid).catch((err) => {
      console.error("Unable to mark messages as seen:", err);
    });
  }, [chatId, authUser?.uid, messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(chatId, { uid: authUser.uid, displayName: profile?.name }, text);
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handlePickMedia = () => {
    if (uploadingMedia || recording || sendingVoice) return;
    fileInputRef.current?.click();
  };

  const clearPendingMedia = () => {
    pendingMedia.forEach((item) => {
      if (item?.url) URL.revokeObjectURL(item.url);
    });
    setPendingMedia([]);
  };

  const removePendingMedia = (index) => {
    setPendingMedia((current) => {
      const item = current[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return current.filter((_, i) => i !== index);
    });
  };

  const clearPendingVoice = () => {
    if (pendingVoice?.url) URL.revokeObjectURL(pendingVoice.url);
    setPendingVoice(null);
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return isImage || isVideo;
    });

    if (!validFiles.length) {
      reportError(new Error("Please choose image or video files."));
      return;
    }

    if (validFiles.length !== files.length) {
      reportError(new Error("Only image and video files were added. Unsupported files were skipped."));
    }

    clearPendingVoice();

    const selected = validFiles.map((file) => ({
      file,
      type: file.type.startsWith("image/") ? "image" : "video",
      url: URL.createObjectURL(file),
    }));

    setPendingMedia((current) => [...current, ...selected]);
  };

  const handleSendPendingMedia = async () => {
    if (!pendingMedia.length || uploadingMedia) return;

    setUploadingMedia(true);
    try {
      const sender = {
        uid: authUser.uid,
        displayName: profile?.name,
      };

      for (const item of pendingMedia) {
        if (item.type === "image") {
          await sendImageMessage(chatId, sender, item.file);
        } else {
          await sendVideoMessage(chatId, sender, item.file);
        }
      }

      clearPendingMedia();
    } catch (err) {
      reportError(err);
    } finally {
      setUploadingMedia(false);
    }
  };

  const startRecording = async () => {
    if (pendingMedia.length || pendingVoice || recording || uploadingMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerIntervalRef.current);

        const finalType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        const duration = recordingSecondsRef.current;
        const shouldSendNow = sendRecordingNowRef.current;

        setRecording(false);
        setRecordingPaused(false);
        setRecordingSeconds(0);
        recordingSecondsRef.current = 0;
        mediaRecorderRef.current = null;
        sendRecordingNowRef.current = false;

        if (!blob.size) return;

        if (shouldSendNow) {
          setSendingVoice(true);
          try {
            await sendVoiceMessage(
              chatId,
              { uid: authUser.uid, displayName: profile?.name },
              blob
            );
          } catch (err) {
            reportError(err);
          } finally {
            setSendingVoice(false);
          }
        } else {
          const url = URL.createObjectURL(blob);
          setPendingVoice({ blob, url, duration });
        }

        audioChunksRef.current = [];
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingPaused(false);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      sendRecordingNowRef.current = false;

      timerIntervalRef.current = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      reportError(
        new Error(
          "Couldn't access your microphone. Check browser permissions and try again."
        )
      );
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    sendRecordingNowRef.current = false;
    mediaRecorderRef.current.stop();
    clearInterval(timerIntervalRef.current);
  };

  const sendRecordingNow = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || sendingVoice) return;

    sendRecordingNowRef.current = true;
    if (recorder.state === "paused") {
      recorder.resume();
    }
    recorder.stop();
    clearInterval(timerIntervalRef.current);
  };

  const togglePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      setRecordingPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setRecordingPaused(false);
    }
  };

  const deleteRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }

    mediaRecorderRef.current = null;
    clearInterval(timerIntervalRef.current);
    audioChunksRef.current = [];
    setRecording(false);
    setRecordingPaused(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    sendRecordingNowRef.current = false;
  };

  const handleSendPendingVoice = async () => {
    if (!pendingVoice || sendingVoice) return;

    setSendingVoice(true);
    try {
      await sendVoiceMessage(
        chatId,
        {
          uid: authUser.uid,
          displayName: profile?.name,
        },
        pendingVoice.blob
      );

      clearPendingVoice();
    } catch (err) {
      reportError(err);
    } finally {
      setSendingVoice(false);
    }
  };

  // Clean up the timer/recorder if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
    };
  }, []);

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
      await deleteConversation(chatId);
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
    const copyText = msg.text || (msg.type === "image" ? "Photo" : msg.type === "video" ? "Video" : msg.type === "audio" || msg.type === "voice" ? "Voice message" : "");
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

  if (loading || !chat) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading chat...</p>
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
              onClick={isGroup ? handleOpenGroupInfo : undefined}
              title={isGroup ? "Open group info" : undefined}
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

            let timestamp = "";

            try {
              let date = null;

              if (rawTimestamp?.toDate) {
                date = rawTimestamp.toDate();
              } else if (rawTimestamp?.seconds != null) {
                date = new Date(Number(rawTimestamp.seconds) * 1000);
              } else if (rawTimestamp instanceof Date) {
                date = rawTimestamp;
              } else if (typeof rawTimestamp === "number") {
                date = new Date(rawTimestamp);
              } else if (typeof rawTimestamp === "string") {
                const parsed = new Date(rawTimestamp);
                if (!Number.isNaN(parsed.getTime())) date = parsed;
              }

              if (date && !Number.isNaN(date.getTime())) {
                timestamp = date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }
            } catch {
              timestamp = "";
            }

            const bubbleStyle = isDeletedForEveryone
              ? styles.bubbleDeleted(isMe)
              : isMe
              ? styles.bubbleMine
              : styles.bubbleTheirs;

            return (
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
                  onMouseLeave={() => {
                    if (messageMenuId !== msg.id) setHoverMessageId(null);
                  }}
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

                        {(msg.type === "voice" || msg.type === "audio") && (msg.audioUrl || msg.mediaUrl) && (
                          <audio controls preload="metadata" src={msg.audioUrl || msg.mediaUrl} style={styles.audioPlayer} />
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
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageMenuId((current) =>
                            current === msg.id ? null : msg.id
                          );
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

      {pendingVoice && (
        <div style={styles.mediaPreviewPanel}>
          <div style={styles.previewHeader}>
            <div style={styles.previewTitle}>Voice message</div>
            <button
              type="button"
              onClick={clearPendingVoice}
              disabled={sendingVoice}
              style={styles.previewCloseBtn}
              title="Cancel"
            >
              <X size={18} />
            </button>
          </div>

          <div style={styles.voicePreviewBox}>
            <Mic size={20} color="#16a34a" />
            <audio
              controls
              src={pendingVoice.url}
              style={styles.previewAudio}
            />
          </div>

          <div style={styles.previewActions}>
            <button
              type="button"
              onClick={clearPendingVoice}
              disabled={sendingVoice}
              style={styles.cancelPreviewBtn}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleSendPendingVoice}
              disabled={sendingVoice}
              style={styles.confirmPreviewBtn}
            >
              {sendingVoice ? "Sending..." : "Send"}
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

        {recording ? (
          <>
            <button
              type="button"
              onClick={deleteRecording}
              style={{ ...styles.iconBtn, background: "#fee2e2" }}
              title="Delete recording"
            >
              <Trash2 size={18} color="#dc2626" />
            </button>

            <div style={styles.recordingInput}>
              <span style={styles.recordingDot}>●</span>
              <strong>{recordingPaused ? "Paused" : "Recording"}</strong>
              <span style={styles.recordingTime}>{formatDuration(recordingSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={togglePauseRecording}
              style={{ ...styles.iconBtn, background: "#f3f4f6" }}
              title={recordingPaused ? "Resume recording" : "Pause recording"}
            >
              {recordingPaused ? (
                <Play size={17} color="#16a34a" fill="#16a34a" />
              ) : (
                <Pause size={17} color="#374151" fill="#374151" />
              )}
            </button>

            <button
              type="button"
              onClick={sendRecordingNow}
              disabled={sendingVoice}
              style={{ ...styles.sendBtn, width: 46, height: 46 }}
              title="Send voice message"
            >
              <Send size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePickMedia}
              disabled={uploadingMedia || pendingMedia.length > 0 || pendingVoice}
              style={styles.iconBtn}
              title="Send an image or video"
            >
              <Paperclip size={19} color="#6b7280" />
            </button>

            <button
              type="button"
              onClick={startRecording}
              disabled={uploadingMedia || pendingMedia.length > 0 || pendingVoice}
              style={styles.iconBtn}
              title="Record a voice message"
            >
              <Mic size={19} color="#6b7280" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                pendingMedia.length > 0 || pendingVoice
                  ? "Finish or cancel the preview first..."
                  : "Type a message..."
              }
              disabled={pendingMedia.length > 0 || pendingVoice}
              style={styles.input}
            />

            <button
              type="submit"
              disabled={sending || !text.trim() || pendingMedia.length > 0 || pendingVoice}
              style={styles.sendBtn}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </>
        )}
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
  audioPlayer: { maxWidth: 260 },
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
  voicePreviewBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  },
  previewAudio: {
    flex: 1,
    minWidth: 0,
    width: "100%",
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
  recordingInput: {
    flex: 1,
    minWidth: 0,
    height: 46,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 16px",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    background: "#fff",
    color: "#374151",
    fontSize: 14,
  },
  recordingDot: {
    color: "#dc2626",
    fontSize: 12,
  },
  recordingTime: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#111827",
    marginLeft: 2,
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