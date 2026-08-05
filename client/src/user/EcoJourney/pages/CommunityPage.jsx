import React from "react";
import {
  Leaf,
  TrendingUp,
  Calendar,
  Users,
  MessageCircle,
  BarChart2,
  FileText,
  Medal,
  ChevronRight,
  Award,
} from "lucide-react";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

import Layout from "../../../shared/components/Layout";
import StatCard from "../../../shared/components/StatCard";
import AchievementCard from "../../../shared/components/AchievementCard";

const TREND = [
  { name: "T1", score: 78 },
  { name: "T2", score: 92 },
  { name: "T3", score: 90 },
  { name: "T4", score: 82 },
];

const FEATURE_CARDS = [
  {
    icon: Calendar,
    iconColor: "#7c3aed",
    title: "Travel History",
    desc: "View your past trips and eco-reports",
    cta: "View History",
    variant: "outline",
  },
  {
    icon: Users,
    iconColor: "#3b82f6",
    title: "Friends",
    desc: "Connect with other eco-travelers",
    cta: "Manage Friends",
    variant: "outline",
  },
  {
    icon: MessageCircle,
    iconColor: "#22c55e",
    title: "Chat & Groups",
    desc: "Discuss travel experiences",
    cta: "Open Chat",
    variant: "outline",
  },
  {
    icon: BarChart2,
    iconColor: "#16a34a",
    title: "Progress Tracker",
    desc: "Charts, milestones and eco grades",
    cta: "View Progress",
    variant: "outline",
  },
  {
    icon: FileText,
    iconColor: "#0d9488",
    title: "Eco-Report Card",
    desc: "Download & share trip sustainability reports",
    cta: "View Report",
    variant: "outline",
  },
  {
    icon: Medal,
    iconColor: "#f43f5e",
    title: "Challenge Team",
    desc: "Form eco-squads and earn shared badges",
    cta: "View More",
    variant: "filled",
  },
];

function FeatureCard({ icon: Icon, iconColor, title, desc, cta, variant, onClick }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureHeader}>
        <Icon size={18} color={iconColor} />
        <span style={styles.featureTitle}>{title}</span>
      </div>
      <p style={styles.featureDesc}>{desc}</p>
      <button
        style={variant === "filled" ? styles.btnFilled : styles.btnOutline}
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

export default function CommunityPage({ onNavigate }) {
  const user = { name: "Keshi", ecoScore: 8750 };

  const stats = [
    { label: "Eco Score", icon: Leaf, iconColor: "#22c55e", value: "8,750", sub: "Level 8", progress: 0.72 },
    { label: "Global Rank", icon: TrendingUp, iconColor: "#3b82f6", value: "5", trendLabel: "12 this week", trendDirection: "up" },
    { label: "Total trips", icon: Calendar, iconColor: "#7c3aed", value: "12", sub: "Completed journeys" },
    { label: "Badges Earned", icon: Award, iconColor: "#f97316", value: "4", sub: "Achievements" },
  ];

  const achievements = [
    { icon: "♻️", title: "Zero Waste Warrior", category: "Waste", dateEarned: "5/15/2026" },
    { icon: "🌱", title: "Eco Pioneer", category: "General", dateEarned: "4/20/2026" },
    { icon: "🚆", title: "KL Transit Guru", category: "Transport", dateEarned: "5/8/2026" },
  ];

  const routeFor = {
    "Travel History": "/community/history",
    Friends: "/community/friends",
    "Chat & Groups": "/community/chat",
    "Progress Tracker": "/community/progress",
    "Eco-Report Card": "/community/report",
    "Challenge Team": "/community/challenges",
  };

  return (
    <Layout active="community" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Eco Journey & Community</h1>
        <p style={styles.pageSubtitle}>Connect with fellow eco-travelers and track your impact</p>

        {/* Stat cards */}
        <div style={styles.statGrid}>
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Progress snapshot */}
        <div style={{ ...styles.card, marginTop: 24 }}>
          <div style={styles.featureHeader}>
            <BarChart2 size={18} color="#22c55e" />
            <span style={styles.featureTitle}>Progress Snapshot</span>
          </div>
          <p style={styles.featureDesc}>Your Eco Score trend across recent trips</p>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={TREND} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "#111827" }}
                  tickLine={false}
                  tick={{ fontSize: 13, fontWeight: 600, fill: "#111827" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: "#22c55e", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature cards grid */}
        <div style={styles.featureGrid}>
          {FEATURE_CARDS.map((f) => (
            <FeatureCard key={f.title} {...f} onClick={() => onNavigate?.(routeFor[f.title])} />
          ))}
        </div>

        {/* Recent achievements */}
        <div style={{ ...styles.card, marginTop: 24, marginBottom: 32 }}>
          <div style={styles.achievementsHeader}>
            <span style={styles.featureTitle}>Recent Achievements</span>
            <span style={styles.viewMore}>
              View More <ChevronRight size={16} />
            </span>
          </div>
          <div style={styles.achievementGrid}>
            {achievements.map((a) => (
              <AchievementCard key={a.title} {...a} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto" },
  pageTitle: { fontSize: 28, fontWeight: 800, margin: 0 },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  featureHeader: { display: "flex", alignItems: "center", gap: 8 },
  featureTitle: { fontWeight: 700, fontSize: 15.5 },
  featureDesc: { color: "#6b7280", fontSize: 13.5, marginTop: 8, marginBottom: 16, minHeight: 36 },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 },
  featureCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  btnOutline: {
    width: "100%",
    padding: "9px 0",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnFilled: {
    width: "100%",
    padding: "9px 0",
    borderRadius: 8,
    border: "none",
    background: "#22c55e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  achievementsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  viewMore: { display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  achievementGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 },
};