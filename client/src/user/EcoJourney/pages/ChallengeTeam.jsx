import React, { useState } from "react";
import { ChevronLeft, Users, Zap, UserPlus, MessageCircle } from "lucide-react";
import Layout from "../../../shared/components/Layout";

const ME = { name: "Keshi", ecoScore: 8750 };

const SUMMARY = [
  { icon: Users, iconColor: "#3b82f6", value: "1", label: "Active Teams" },
  { icon: Zap, iconColor: "#f97316", value: "305", label: "Team Points Earned", sub: "Across all teams" },
  { icon: Zap, iconColor: "#f97316", value: "1", label: "Completed Challenges", sub: "Certificates earned" },
];

const MY_TEAMS = [
  {
    id: 1,
    name: "Green Warriors KL",
    status: "Active",
    challenge: "KL Car-Free Weekend",
    pointsEarned: 105,
    pointsTarget: 150,
    members: [
      { name: "Jungkook", avatarBg: "#3b82f6", pts: 50, crown: true, pct: 100 },
      { name: "Luke Chiang", avatarBg: "#f59e0b", pts: 35, pct: 70 },
      { name: "Daniel Caesar", avatarBg: "#2563eb", pts: 20, pct: 40 },
    ],
  },
];

const TABS = ["My Teams", "Discover Teams", "Completed"];

function TeamCard({ team }) {
  const pct = Math.round((team.pointsEarned / team.pointsTarget) * 100);
  const remaining = team.pointsTarget - team.pointsEarned;

  return (
    <div style={styles.teamCard}>
      <div style={styles.teamTopBar} />
      <div style={styles.teamBody}>
        <div style={styles.teamHeadRow}>
          <div>
            <div style={styles.teamName}>{team.name}</div>
            <div style={styles.teamChallenge}>Challenge: {team.challenge}</div>
          </div>
          <span style={styles.statusPill}>{team.status}</span>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressHeadRow}>
            <span style={styles.progressLabel}>Team Progress</span>
            <span style={styles.progressPts}>
              {team.pointsEarned} / {team.pointsTarget} pts
            </span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
          <div style={styles.progressCaption}>
            {pct}% complete — {remaining} points to go
          </div>
        </div>

        <div style={styles.membersSection}>
          <div style={styles.membersLabel}>Team Members</div>
          {team.members.map((m) => (
            <div key={m.name} style={styles.memberRow}>
              <div style={{ ...styles.memberAvatar, background: m.avatarBg }}>
                {m.name.charAt(0)}
                {m.crown && <span style={styles.crown}>👑</span>}
              </div>
              <div style={styles.memberBarWrap}>
                <div style={styles.memberNameRow}>
                  <span style={styles.memberName}>{m.name}</span>
                  <span style={styles.memberPts}>+{m.pts} pts</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${m.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.actionsRow}>
          <button type="button" style={styles.btnOutline}>
            <UserPlus size={16} />
            Invite
          </button>
          <button type="button" style={styles.btnOutline}>
            <MessageCircle size={16} />
            Team Chat
          </button>
          <button type="button" style={styles.btnFilled}>
            <Zap size={16} />
            View Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeTeam({ onNavigate }) {
  const [tab, setTab] = useState("My Teams");

  return (
    <Layout active="community" user={ME} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button type="button" onClick={() => onNavigate?.("/community")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back
        </button>

        <div style={styles.headRow}>
          <h1 style={styles.pageTitle}>Challenge Team Mode</h1>
          <button type="button" style={styles.createBtn}>
            + Create Team
          </button>
        </div>
        <p style={styles.pageSubtitle}>Form eco-squads with friends and tackle sustainability challenges together</p>

        {/* Summary cards */}
        <div style={styles.summaryGrid}>
          {SUMMARY.map((s) => (
            <div key={s.label} style={styles.summaryCard}>
              <div style={styles.summaryHeadRow}>
                <span style={styles.summaryLabel}>{s.label}</span>
                <s.icon size={18} color={s.iconColor} />
              </div>
              <div style={styles.summaryValue}>{s.value}</div>
              <div style={styles.summarySub}>{s.sub || s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                ...styles.tabBtn,
                background: tab === t ? "#fff" : "transparent",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                color: tab === t ? "#111827" : "#6b7280",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Team list */}
        <div style={styles.teamList}>
          {tab === "My Teams" &&
            (MY_TEAMS.length > 0 ? (
              MY_TEAMS.map((team) => <TeamCard key={team.id} team={team} />)
            ) : (
              <div style={styles.empty}>You haven't joined any teams yet.</div>
            ))}
          {tab === "Discover Teams" && <div style={styles.empty}>No teams to discover right now.</div>}
          {tab === "Completed" && <div style={styles.empty}>No completed challenges yet.</div>}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto", textAlign: "left" },
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
    marginBottom: 16,
  },
  headRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 28, fontWeight: 800, margin: 0, color: "#111827" },
  createBtn: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 },
  summaryCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
  },
  summaryHeadRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, fontWeight: 500, color: "#374151" },
  summaryValue: { fontSize: 30, fontWeight: 800, color: "#111827", marginTop: 8 },
  summarySub: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  tabBar: {
    display: "inline-flex",
    background: "#e5e7eb",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 24,
  },
  tabBtn: {
    border: "none",
    borderRadius: 999,
    padding: "9px 22px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  teamList: { display: "flex", flexDirection: "column", gap: 20, paddingBottom: 32 },
  empty: { color: "#9ca3af", padding: "40px 0", textAlign: "center" },
  teamCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },
  teamTopBar: { height: 6, background: "#22c55e" },
  teamBody: { padding: 24, display: "flex", flexDirection: "column", gap: 22 },
  teamHeadRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  teamName: { fontSize: 18, fontWeight: 700, color: "#111827" },
  teamChallenge: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  statusPill: {
    fontSize: 12.5,
    fontWeight: 600,
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: 999,
  },
  progressSection: { display: "flex", flexDirection: "column", gap: 6 },
  progressHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 15, fontWeight: 600, color: "#111827" },
  progressPts: { fontSize: 14, fontWeight: 700, color: "#16a34a" },
  progressTrack: { width: "100%", height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: "#111827", borderRadius: 999 },
  progressCaption: { fontSize: 13, color: "#9ca3af" },
  membersSection: { display: "flex", flexDirection: "column", gap: 14 },
  membersLabel: { fontSize: 15, fontWeight: 600, color: "#111827" },
  memberRow: { display: "flex", alignItems: "center", gap: 14 },
  memberAvatar: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  crown: { position: "absolute", top: -12, right: -6, fontSize: 16 },
  memberBarWrap: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  memberNameRow: { display: "flex", justifyContent: "space-between" },
  memberName: { fontSize: 14.5, fontWeight: 600, color: "#111827" },
  memberPts: { fontSize: 13.5, fontWeight: 600, color: "#16a34a" },
  actionsRow: { display: "flex", gap: 12 },
  btnOutline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  btnFilled: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111827",
    border: "none",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
  },
};