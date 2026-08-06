import React from "react";
import AchievementCard from "../../../shared/components/AchievementCard";

import {
  Home,
  Map,
  Navigation,
  Users,
  Zap,
  Award,
  Trash2,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Share2,
  Download,
  TrendingDown,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const USER = { name: "Keshi", ecoScore: 8750 };

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", route: "/dashboard" },
  { icon: Map, label: "Itinerary", route: "/itinerary" },
  { icon: Navigation, label: "Recommendations", route: "/recommendations" },
  { icon: Users, label: "Community", route: "/community" },
  { icon: Zap, label: "Challenges", route: "/challenges" },
  { icon: Award, label: "Certification", route: "/certification" },
  { icon: Trash2, label: "Waste", route: "/waste" },
];

// ---- Report data (swap with real trip data later) ----
const REPORT = {
  tripName: "Cameron Highlands Eco Tour",
  dateRange: "1 Aug 2026 — 5 Aug 2026",
  traveller: "Keshi",
  grade: "A+",
  gradeLabel: "Outstanding",
  ecoScore: 95,
  co2Kg: 28.4,
  badgesEarned: 2,
};

const BREAKDOWN = [
  { label: "Transportation", value: 95 },
  { label: "Accommodation", value: 90 },
  { label: "Activities", value: 88 },
  { label: "Waste & Resources", value: 82 },
];

const CARBON_FOOTPRINT = [
  { label: "Hotel", value: 28.5, color: "#3b82f6" },
  { label: "Train", value: 14.35, color: "#eab308" },
  { label: "Bus", value: 2.23, color: "#22c55e" },
];

const IMPACT_TILES = [
  { emoji: "🌳", value: "2.3", unit: "trees", label: "Trees Equivalent" },
  { emoji: "♻️", value: "47", unit: "bottles", label: "Plastic Bottles Avoid" },
  { emoji: "trend", value: "-38%", unit: "carbon", label: "vs Avg Tourist" },
  { emoji: "🚆", value: "100%", unit: "of travel", label: "Public Transport" },
];

const ACHIEVEMENTS = [
  { icon: "♻️", title: "Zero Waste Warrior", category: "Waste", dateEarned: "5/15/2026" },
  { icon: "🌱", title: "Eco Pioneer", category: "General", dateEarned: "4/20/2026" },
  { icon: "🚆", title: "KL Transit Guru", category: "Transport", dateEarned: "5/8/2026" },
];

export default function EcoReportCard({ onNavigate, activeRoute = "/community" }) {
  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Leaf size={20} color="#fff" />
          </div>
          <span style={styles.brandName}>GreenTrip Malaysia</span>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.route === activeRoute;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate?.(item.route)}
                style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
              >
                <item.icon size={18} color={isActive ? "#15803d" : "#374151"} />
                <span style={{ color: isActive ? "#15803d" : "#374151", fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <header style={styles.topbar}>
          <div />
          <div style={styles.userBlock}>
            <div style={{ textAlign: "right" }}>
              <div style={styles.userName}>{USER.name}</div>
              <div style={styles.userSub}>Eco Score: {USER.ecoScore.toLocaleString()}</div>
            </div>
            <div style={styles.avatar}>🐨</div>
          </div>
        </header>

        <div style={styles.content}>
          {/* Back + actions row */}
          <div style={styles.actionsRow}>
            <button
              type="button"
              style={styles.backBtn}
              onClick={() => onNavigate?.("/community/history")}
            >
              <ChevronLeft size={16} /> Back to History
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={styles.shareBtn}>
                <Share2 size={15} /> Share
              </button>
              <button type="button" style={styles.downloadBtn}>
                <Download size={15} /> Download Report
              </button>
            </div>
          </div>

          {/* Hero card */}
          <div style={styles.hero}>
            <div style={styles.heroLeft}>
              <span style={styles.heroLabel}>ECO-REPORT CARD</span>
              <h1 style={styles.heroTitle}>{REPORT.tripName}</h1>
              <p style={styles.heroMeta}>{REPORT.dateRange}</p>
              <p style={styles.heroMeta}>Traveller: {REPORT.traveller}</p>

              <div style={styles.heroPills}>
                <div style={styles.heroPill}>
                  <div style={styles.heroPillValue}>{REPORT.ecoScore}</div>
                  <div style={styles.heroPillLabel}>Eco Score</div>
                </div>
                <div style={styles.heroPill}>
                  <div style={styles.heroPillValue}>{REPORT.co2Kg}</div>
                  <div style={styles.heroPillLabel}>kg CO₂</div>
                </div>
                <div style={styles.heroPill}>
                  <div style={styles.heroPillValue}>{REPORT.badgesEarned}</div>
                  <div style={styles.heroPillLabel}>Badges Earned</div>
                </div>
              </div>
            </div>

            <div style={styles.heroRight}>
              <div style={styles.grade}>{REPORT.grade}</div>
              <div style={styles.gradeLabel}>{REPORT.gradeLabel}</div>
            </div>
          </div>

          {/* Breakdown + carbon footprint */}
          <div style={styles.twoColGrid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <Leaf size={18} color="#22c55e" />
                <span style={styles.cardTitle}>Eco Score Breakdown</span>
              </div>
              <div style={{ marginTop: 16 }}>
                {BREAKDOWN.map((b) => (
                  <div key={b.label} style={{ marginBottom: 18 }}>
                    <div style={styles.rowHeader}>
                      <span style={styles.breakdownLabel}>{b.label}</span>
                      <span style={styles.breakdownValue}>{b.value}/100</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${b.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <TrendingDown size={18} color="#2563eb" />
                <span style={styles.cardTitle}>Carbon Footprint</span>
              </div>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={CARBON_FOOTPRINT}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={0}
                      outerRadius={80}
                    >
                      {CARBON_FOOTPRINT.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {CARBON_FOOTPRINT.map((f) => (
                  <div key={f.label} style={styles.legendRow}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...styles.legendDot, background: f.color }} />
                      {f.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>{f.value} kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Environmental impact */}
          <div style={{ ...styles.card, marginTop: 24 }}>
            <span style={styles.cardTitle}>Environmental Impact</span>
            <div style={styles.impactGrid}>
              {IMPACT_TILES.map((t) => (
                <div key={t.label} style={styles.impactTile}>
                  {t.emoji === "trend" ? (
                    <TrendingDown size={30} color="#dc2626" style={{ marginBottom: 6 }} />
                  ) : (
                    <div style={styles.impactEmoji}>{t.emoji}</div>
                  )}
                  <div style={{ ...styles.impactValue, color: t.emoji === "trend" ? "#dc2626" : "#111827" }}>
                    {t.value}
                  </div>
                  <div style={styles.impactUnit}>{t.unit}</div>
                  <div style={styles.impactLabel}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent achievements */}
          <div style={{ ...styles.card, marginTop: 24, marginBottom: 32 }}>
            <div style={styles.rowHeader}>
              <span style={styles.cardTitle}>Recent Achievements</span>
              <div style={styles.viewMore}>
                View More <ChevronRight size={16} />
              </div>
            </div>
            <div style={styles.achievementGrid}>
              {ACHIEVEMENTS.map((a) => (
                <AchievementCard key={a.title} {...a} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#f2f3f5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#111827",
  },
  sidebar: { width: 240, background: "#fff", borderRight: "1px solid #e5e7eb", padding: "20px 16px", flexShrink: 0 },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "0 8px 24px" },
  brandIcon: { width: 34, height: 34, borderRadius: 8, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontWeight: 700, fontSize: 15 },
  nav: { display: "flex", flexDirection: "column", gap: 4 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, fontSize: 14.5, cursor: "pointer", border: "none", background: "transparent", textAlign: "left", width: "100%" },
  navItemActive: { background: "#dcfce7" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "#fff", borderBottom: "1px solid #e5e7eb" },
  userBlock: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontWeight: 700, fontSize: 14.5 },
  userSub: { fontSize: 12.5, color: "#6b7280" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  content: { padding: "28px 32px", maxWidth: 1180, width: "100%", margin: "0 auto" },
  actionsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: "#111827", fontWeight: 600, fontSize: 14.5, cursor: "pointer" },
  shareBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  downloadBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "none", background: "#111827", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    background: "linear-gradient(120deg, #4ade80, #10b981)",
    borderRadius: 18,
    padding: "28px 32px",
    color: "#fff",
    marginBottom: 20,
  },
  heroLeft: { display: "flex", flexDirection: "column" },
  heroLabel: { fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.9 },
  heroTitle: { fontSize: 24, fontWeight: 800, margin: "6px 0 8px" },
  heroMeta: { fontSize: 13.5, opacity: 0.95, margin: 0 },
  heroPills: { display: "flex", gap: 12, marginTop: 20 },
  heroPill: { background: "rgba(255,255,255,0.25)", borderRadius: 12, padding: "10px 20px", textAlign: "center" },
  heroPillValue: { fontSize: 22, fontWeight: 800 },
  heroPillLabel: { fontSize: 12, opacity: 0.95 },
  heroRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" },
  grade: { fontSize: 48, fontWeight: 800, lineHeight: 1 },
  gradeLabel: { fontSize: 13.5, fontWeight: 600, opacity: 0.95 },
  twoColGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 },
  cardHeader: { display: "flex", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: 700, fontSize: 15.5 },
  rowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  breakdownLabel: { fontSize: 13.5, color: "#374151" },
  breakdownValue: { fontSize: 13.5, fontWeight: 700 },
  progressTrack: { width: "100%", height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", background: "#111827", borderRadius: 999 },
  legendRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#374151" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  impactGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 },
  impactTile: { background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 12, padding: "22px 12px", textAlign: "center" },
  impactEmoji: { fontSize: 30, marginBottom: 6 },
  impactValue: { fontSize: 22, fontWeight: 800 },
  impactUnit: { fontSize: 12, color: "#6b7280" },
  impactLabel: { fontSize: 13, fontWeight: 600, marginTop: 6 },
  viewMore: { display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#6b7280" },
  achievementGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 },
};