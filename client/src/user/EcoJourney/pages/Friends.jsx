import React, { useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import Layout from "../../../shared/components/Layout";

const ME = { name: "Keshi", ecoScore: 8750 };

const FRIENDS = [
  { id: 1, name: "Jungkook", ecoScore: 5550, avatarBg: "#3b82f6", avatarLetter: "J" },
  { id: 2, name: "Luke Chiang", ecoScore: 2760, avatarBg: "#f59e0b", avatarLetter: "L" },
  { id: 3, name: "Daniel Caesar", ecoScore: 3980, avatarBg: "#2563eb", avatarLetter: "D" },
];

const REQUESTS = [{ id: 4, name: "Aisyah Rahman", ecoScore: 4210, avatarBg: "#22c55e", avatarLetter: "A" }];

const PENDING = [{ id: 5, name: "Wei Ming", ecoScore: 1890, avatarBg: "#a855f7", avatarLetter: "W" }];

const TABS = [
  { id: "friends", label: `Friends (${FRIENDS.length})`, data: FRIENDS },
  { id: "requests", label: `Requests (${REQUESTS.length})`, data: REQUESTS },
  { id: "pending", label: `Pending (${PENDING.length})`, data: PENDING },
];

export default function Friends({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("friends");
  const [query, setQuery] = useState("");

  const current = TABS.find((t) => t.id === activeTab);
  const filtered = current.data.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Layout active="community" user={ME} onNavigate={onNavigate}>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Friends</h1>
        <p style={styles.pageSubtitle}>Connect with fellow eco-travelers</p>

        <button type="button" onClick={() => onNavigate?.("/community")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Search */}
        <div style={styles.searchCard}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends by Username or ID..."
            style={styles.searchInput}
          />
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabBtn,
                background: activeTab === t.id ? "#fff" : "transparent",
                boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                color: activeTab === t.id ? "#111827" : "#6b7280",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={styles.list}>
          {filtered.length === 0 && <div style={styles.empty}>No results.</div>}
          {filtered.map((f) => (
            <div key={f.id} style={styles.friendCard}>
              <div style={styles.friendLeft}>
                <div style={{ ...styles.avatar, background: f.avatarBg }}>{f.avatarLetter}</div>
                <div>
                  <div style={styles.friendName}>{f.name}</div>
                  <div style={styles.friendScore}>Eco Score: {f.ecoScore.toLocaleString()}</div>
                </div>
              </div>
              <button type="button" style={styles.viewBtn}>
                View Profile
              </button>
            </div>
          ))}
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
  searchCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "14px 20px",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14.5,
    color: "#111827",
  },
  tabBar: {
    display: "inline-flex",
    background: "#e5e7eb",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  tabBtn: {
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 },
  empty: { color: "#9ca3af", padding: "24px 0", textAlign: "center" },
  friendCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  friendLeft: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 17,
  },
  friendName: { fontWeight: 700, fontSize: 16, color: "#111827" },
  friendScore: { fontSize: 13.5, color: "#9ca3af", marginTop: 2 },
  viewBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 999,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};