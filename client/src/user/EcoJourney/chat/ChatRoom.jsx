import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Users, MoreVertical, BellOff, Bell, Trash2, Paperclip, Mic, Square } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  listenToMessages,
  sendMessage,
  sendImageMessage,
  sendVoiceMessage,
  toggleMuteChat,
  deleteConversation,
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [chatError, setChatError] = useState("");
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

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

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      await sendImageMessage(chatId, { uid: authUser.uid, displayName: profile?.name }, file);
    } catch (err) {
      reportError(err);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerIntervalRef.current);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          await sendVoiceMessage(chatId, { uid: authUser.uid, displayName: profile?.name }, blob);
        } catch (err) {
          reportError(err);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      reportError(new Error("Couldn't access your microphone. Check browser permissions and try again."));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // Clean up the timer if the component unmounts mid-recording.
  useEffect(() => {
    return () => clearInterval(timerIntervalRef.current);
  }, []);

  const isMuted = !!chat?.mutedBy?.includes(authUser?.uid);

  const handleToggleMute = async () => {
    setShowSettings(false);
    try {
      await toggleMuteChat(chatId, authUser.uid, isMuted);
    } catch (err) {
      alert(err.message);
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
    } catch (err) {
      alert(err.message);
    }
  };

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

  const isGroup = chat.type === "group";
  const otherUid = !isGroup ? chat.members.find((m) => m !== authUser.uid) : null;
  const title = isGroup ? chat.name : chat.memberNames?.[otherUid] || "Chat";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button type="button" onClick={() => onNavigate("/community/chat")} style={styles.backBtn}>
          <ChevronLeft size={20} />
        </button>
        <div
          style={styles.headerClickable}
          onClick={() => isGroup && onNavigate("/community/chat/info", chatId)}
        >
          <div style={isGroup ? styles.avatarGroup : styles.avatarFallback}>
            {isGroup ? <Users size={16} /> : (title || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={styles.headerTitle}>
              {title}
              {isMuted && <BellOff size={13} color="#9ca3af" style={{ marginLeft: 6, verticalAlign: -1 }} />}
            </div>
            {isGroup && (
              <div style={styles.headerSubtitle}>{chat.members.length} members · tap for info</div>
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
              <button type="button" onClick={handleToggleMute} style={styles.settingsMenuItem}>
                {isMuted ? <Bell size={15} /> : <BellOff size={15} />}
                {isMuted ? "Unmute Notifications" : "Mute Notifications"}
              </button>
              <button
                type="button"
                onClick={handleDeleteConversation}
                style={{ ...styles.settingsMenuItem, color: "#b91c1c" }}
              >
                <Trash2 size={15} />
                Delete Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <p style={styles.emptyText}>Say hi to start the conversation 👋</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === authUser.uid;
            const bubbleStyle = isMe ? styles.bubbleMine : styles.bubbleTheirs;

            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                <div style={msg.type === "image" ? styles.bubbleImageWrap(isMe) : bubbleStyle}>
                  {isGroup && !isMe && <div style={styles.bubbleSender}>{msg.senderName}</div>}

                  {msg.type === "image" && msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Shared" style={styles.chatImage} />
                  )}

                  {msg.type === "voice" && msg.audioUrl && (
                    <audio controls src={msg.audioUrl} style={styles.audioPlayer} />
                  )}

                  {(!msg.type || msg.type === "text") && <div>{msg.text}</div>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={styles.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={handlePickImage}
          disabled={uploadingImage || recording}
          style={styles.iconBtn}
          title="Send an image"
        >
          <Paperclip size={19} color="#6b7280" />
        </button>

        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            style={{ ...styles.iconBtn, background: "#fee2e2" }}
            title="Stop recording"
          >
            <Square size={17} color="#dc2626" fill="#dc2626" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={uploadingImage}
            style={styles.iconBtn}
            title="Record a voice message"
          >
            <Mic size={19} color="#6b7280" />
          </button>
        )}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "Recording voice message..." : "Type a message..."}
          disabled={recording}
          style={styles.input}
        />
        <button type="submit" disabled={sending || !text.trim() || recording} style={styles.sendBtn}>
          <Send size={18} />
        </button>
      </form>

      {recording && (
        <div style={styles.recordingBanner}>
          🔴 Recording {formatDuration(recordingSeconds)} — tap the square to stop and send
        </div>
      )}

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
  headerClickable: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  headerTitle: { fontSize: 15.5, fontWeight: 700, color: "#111827" },
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
  messageRow: { display: "flex" },
  bubbleMine: {
    background: "#16a34a",
    color: "#fff",
    borderRadius: "16px 16px 4px 16px",
    padding: "10px 14px",
    maxWidth: "70%",
    fontSize: 14.5,
  },
  bubbleTheirs: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    color: "#111827",
    borderRadius: "16px 16px 16px 4px",
    padding: "10px 14px",
    maxWidth: "70%",
    fontSize: 14.5,
  },
  bubbleImageWrap: (isMe) => ({
    background: "transparent",
    padding: 4,
    borderRadius: 16,
    maxWidth: "60%",
    border: isMe ? "none" : "1px solid #e5e7eb",
  }),
  chatImage: { width: "100%", borderRadius: 12, display: "block" },
  audioPlayer: { maxWidth: 240 },
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
  recordingBanner: {
    textAlign: "center",
    fontSize: 12.5,
    color: "#dc2626",
    fontWeight: 600,
    padding: "6px 0 14px",
    background: "#fff",
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