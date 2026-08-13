import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Users } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToMessages, sendMessage } from "../../../firebase/chatService";

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
            <div style={styles.headerTitle}>{title}</div>
            {isGroup && (
              <div style={styles.headerSubtitle}>{chat.members.length} members · tap for info</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <p style={styles.emptyText}>Say hi to start the conversation 👋</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === authUser.uid;
            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                <div style={isMe ? styles.bubbleMine : styles.bubbleTheirs}>
                  {isGroup && !isMe && (
                    <div style={styles.bubbleSender}>{msg.senderName}</div>
                  )}
                  <div>{msg.text}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={styles.inputRow}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="submit" disabled={sending || !text.trim()} style={styles.sendBtn}>
          <Send size={18} />
        </button>
      </form>
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
  bubbleSender: { fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginBottom: 3 },
  inputRow: {
    display: "flex",
    gap: 10,
    padding: 16,
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
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
};