import React, { useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import Layout from "../../../shared/components/Layout";

const ME = { name: "Keshi", ecoScore: 8750, avatarBg: "#dcfce7", avatarLetter: "K" };

const CONVERSATIONS = [
  {
    id: "jungkook",
    name: "Jungkook",
    avatarBg: "#3b82f6",
    avatarLetter: "J",
    online: true,
    preview: "Alright, glad to hear…",
    messages: [
      { from: "them", text: "Hey! How's your trip?", time: "10:00 AM" },
      { from: "them", text: "Is it good?", time: "10:01 AM" },
      { from: "me", text: "It is amazing! I love it.", time: "10:05 AM" },
      { from: "them", text: "Alright, glad to hear that.", time: "10:05 AM" },
    ],
  },
  {
    id: "luke",
    name: "Luke Chiang",
    avatarBg: "#f59e0b",
    avatarLetter: "L",
    online: true,
    preview: "Hi, how are you?",
    messages: [{ from: "them", text: "Hi, how are you?", time: "9:40 AM" }],
  },
  {
    id: "daniel",
    name: "Daniel Caesar",
    avatarBg: "#2563eb",
    avatarLetter: "D",
    online: false,
    preview: "Hope to see you soon…",
    messages: [{ from: "them", text: "Hope to see you soon…", time: "Yesterday" }],
  },
];

export default function ChatGroups({ onNavigate }) {
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [draft, setDraft] = useState("");
  const active = CONVERSATIONS.find((c) => c.id === activeId);

  return (
    <Layout active="community" user={ME} onNavigate={onNavigate}>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Chat & Groups</h1>
        <p style={styles.pageSubtitle}>Connect with fellow eco-travelers and track your impact</p>

        <button type="button" onClick={() => onNavigate?.("/community")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back
        </button>

        <div style={styles.layout}>
          {/* Conversation list */}
          <div style={styles.listCard}>
            <div style={styles.listTitle}>Conversations</div>
            {CONVERSATIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                style={{
                  ...styles.convoRow,
                  background: c.id === activeId ? "#f3f4f6" : "transparent",
                }}
              >
                <div style={styles.avatarWrap}>
                  <div style={{ ...styles.avatar, background: c.avatarBg }}>{c.avatarLetter}</div>
                  {c.online && <div style={styles.onlineDot} />}
                </div>
                <div style={styles.convoText}>
                  <div style={styles.convoName}>{c.name}</div>
                  <div style={styles.convoPreview}>{c.preview}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Chat window */}
          <div style={styles.chatCard}>
            <div style={styles.chatHeader}>
              <div style={{ ...styles.avatar, background: active.avatarBg }}>{active.avatarLetter}</div>
              <div>
                <div style={styles.convoName}>{active.name}</div>
                {active.online && <div style={styles.onlineText}>Online</div>}
              </div>
            </div>

            <div style={styles.messages}>
              {active.messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.messageRow,
                    justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                  }}
                >
                  {m.from === "them" && (
                    <div style={{ ...styles.avatarSm, background: active.avatarBg }}>{active.avatarLetter}</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: m.from === "me" ? "flex-end" : "flex-start" }}>
                    <div style={m.from === "me" ? styles.bubbleMe : styles.bubbleThem}>{m.text}</div>
                    <div style={styles.timeText}>{m.time}</div>
                  </div>
                  {m.from === "me" && (
                    <div style={{ ...styles.avatarSm, background: ME.avatarBg, color: "#15803d" }}>{ME.avatarLetter}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.inputRow}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                style={styles.input}
              />
              <button type="button" style={styles.sendBtn} onClick={() => setDraft("")}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto", textAlign: "left" },
  pageTitle: { fontSize: 28, fontWeight: 800, margin: 0, color: "#111827" },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 20, fontSize: 14.5 },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 20,
  },
  layout: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, paddingBottom: 32 },
  listCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    height: "fit-content",
  },
  listTitle: { fontWeight: 700, fontSize: 16, padding: "8px 8px 12px" },
  convoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 8px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
  },
  avatarSm: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 12.5,
    flexShrink: 0,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid #fff",
  },
  convoText: { minWidth: 0 },
  convoName: { fontWeight: 700, fontSize: 14.5, color: "#111827" },
  convoPreview: {
    fontSize: 13,
    color: "#9ca3af",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 200,
  },
  chatCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    height: 620,
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: "1px solid #f3f4f6",
  },
  onlineText: { fontSize: 13, color: "#16a34a", fontWeight: 600 },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  messageRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  bubbleThem: {
    background: "#f3f4f6",
    color: "#111827",
    padding: "10px 14px",
    borderRadius: 14,
    fontSize: 14,
    maxWidth: 320,
  },
  bubbleMe: {
    background: "#dcfce7",
    color: "#111827",
    padding: "10px 14px",
    borderRadius: 14,
    fontSize: 14,
    maxWidth: 320,
  },
  timeText: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderTop: "1px solid #f3f4f6",
  },
  input: {
    flex: 1,
    background: "#f3f4f6",
    border: "none",
    borderRadius: 999,
    padding: "12px 18px",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#111827",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
};