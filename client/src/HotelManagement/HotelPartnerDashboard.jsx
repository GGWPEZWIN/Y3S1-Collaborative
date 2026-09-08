import React, { useState } from "react";
import { 
  Leaf, 
  CheckCircle2, 
  Zap, 
  Droplets, 
  Award, 
  FileText, 
  ChevronLeft, 
  Bell, 
  Upload 
} from "lucide-react";

export default function HotelPartnerDashboard({ onNavigate }) {
  const [tab, setTab] = useState("pending"); // "submitted" | "pending"
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file.name);
      alert(`Uploaded: ${file.name} for Admin Review!`);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Navbar */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>
            <Leaf size={18} color="#fff" />
          </div>
          <span style={styles.brandTitle}>GreenTrip Malaysia</span>
        </div>
        <div style={styles.profileBadge}>
          <div style={{ textAlign: "right" }}>
            <div style={styles.profileName}>Keshi</div>
            <div style={styles.profileScore}>Eco Score: 8,750</div>
          </div>
          <div style={styles.avatar}>🐱</div>
        </div>
      </header>

      {/* Main Container */}
      <main style={styles.main}>
        {/* Page Title & Status Badge */}
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.heading}>Hotel Dashboard</h1>
            <p style={styles.subheading}>Green Heritage Hotel — Georgetown, Penang</p>
          </div>
          <div style={styles.goldBadge}>
            <span>🏅</span> Gold Certified
          </div>
        </div>

        {/* Certification Active Banner */}
        <div style={styles.banner}>
          <div style={styles.bannerLeft}>
            <CheckCircle2 size={24} color="#16a34a" />
            <div>
              <div style={styles.bannerTitle}>Certification Active</div>
              <div style={styles.bannerSubtitle}>Valid until 30 December 2026 — 154 days remaining</div>
            </div>
          </div>
          <div style={styles.bannerProgressTrack}>
            <div style={styles.bannerProgressBar} />
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div style={styles.statsGrid}>
          {/* Card 1: Electricity */}
          <div style={styles.statCard}>
            <Zap size={24} color="#eab308" fill="#fef08a" />
            <div style={styles.statValue}>27%</div>
            <div style={styles.statTitle}>Electricity Savings</div>
            <div style={styles.statCompare}>↓ vs hotel avg benchmark</div>
          </div>

          {/* Card 2: Water */}
          <div style={styles.statCard}>
            <Droplets size={24} color="#38bdf8" fill="#bae6fd" />
            <div style={styles.statValue}>44%</div>
            <div style={styles.statTitle}>Water Savings</div>
            <div style={styles.statCompare}>↓ vs hotel avg benchmark</div>
          </div>

          {/* Card 3: Carbon */}
          <div style={styles.statCard}>
            <div style={{ fontSize: 24 }}>📉</div>
            <div style={styles.statValue}>1,900 kg</div>
            <div style={styles.statTitle}>Carbon Reduced</div>
            <div style={styles.statCompare}>CO₂ saved this month</div>
          </div>

          {/* Card 4: Eco Score */}
          <div style={styles.statCard}>
            <Award size={24} color="#f59e0b" />
            <div style={styles.statValue}>88/100</div>
            <div style={styles.statTitle}>Green Score</div>
            <div style={styles.statCompare}>2 pts to Platinum tier</div>
          </div>
        </div>

        {/* Certification Tier Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <div style={styles.progressTitle}>Certification Tier Progress</div>
            <div style={styles.goldPill}>Gold Tier</div>
          </div>
          <div style={styles.progressSub}>
            <span>Progress to Platinum</span>
            <span>80/90 points</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={styles.progressBarFill} />
          </div>
        </div>

        {/* Back Link & Document Header */}
        <div style={styles.docHeaderRow}>
          <button style={styles.docFilterBtn}>
            <FileText size={16} /> Document
          </button>
          <button 
            type="button" 
            onClick={() => onNavigate?.("/certification")}
            style={styles.backBtn}
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>

        {/* Segmented Filter Pills */}
        <div style={styles.filterPillContainer}>
          <button
            type="button"
            onClick={() => setTab("submitted")}
            style={{
              ...styles.filterPill,
              ...(tab === "submitted" ? styles.filterPillActive : {}),
            }}
          >
            Submitted
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            style={{
              ...styles.filterPill,
              ...(tab === "pending" ? styles.filterPillActive : {}),
            }}
          >
            Pending <span style={styles.redBadge}>1</span>
          </button>
        </div>

        {/* Spot-Check Action Card */}
        <div style={styles.actionCard}>
          <div style={styles.actionCardTop}>
            <h3 style={styles.actionCardTitle}>Electricity Bill + Meter Photo</h3>
            <div style={styles.badgeGroup}>
              <span style={styles.spotBadge}>Spot-Check</span>
              <span style={styles.pendingBadge}>Pending</span>
            </div>
          </div>

          <div style={styles.requestedRow}>
            <Bell size={15} color="#9ca3af" />
            <span>Requested by GreenTrip Admin on 22 Jul 2026</span>
          </div>

          <div style={styles.instructionsBox}>
            Please upload your July 2026 TNB electricity bill together with a clear photo of your electricity meter reading. Both must match.
          </div>

          {uploadedFile && (
            <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
              ✓ Selected file: {uploadedFile}
            </div>
          )}

          <label style={styles.uploadBtn}>
            <Upload size={16} color="#fff" />
            <span>Upload Required Document</span>
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg" 
              onChange={handleFileUpload} 
              style={{ display: "none" }} 
            />
          </label>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 60,
  },
  header: {
    backgroundColor: "#fff",
    height: 64,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 36px",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 18, fontWeight: 800, color: "#111827" },
  profileBadge: { display: "flex", alignItems: "center", gap: 12 },
  profileName: { fontSize: 14, fontWeight: 700, color: "#111827" },
  profileScore: { fontSize: 11.5, color: "#6b7280" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  main: { maxWidth: 860, margin: "0 auto", padding: "32px 20px 0 20px" },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heading: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  subheading: { fontSize: 13, color: "#6b7280", marginTop: 4, margin: 0 },
  goldBadge: {
    backgroundColor: "#fef08a",
    color: "#854d0e",
    fontWeight: 700,
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  banner: {
    backgroundColor: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerLeft: { display: "flex", alignItems: "center", gap: 12 },
  bannerTitle: { fontSize: 14, fontWeight: 700, color: "#15803d" },
  bannerSubtitle: { fontSize: 12.5, fontWeight: 600, color: "#16a34a" },
  bannerProgressTrack: {
    width: 140,
    height: 10,
    backgroundColor: "#cbd5e1",
    borderRadius: 10,
    overflow: "hidden",
  },
  bannerProgressBar: { width: "70%", height: "100%", backgroundColor: "#111827" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: 800, color: "#111827", marginTop: 4 },
  statTitle: { fontSize: 12, fontWeight: 600, color: "#6b7280" },
  statCompare: { fontSize: 11, fontWeight: 600, color: "#22c55e" },
  progressSection: {
    backgroundColor: "#fff",
    border: "1px solid #86efac",
    borderRadius: 14,
    padding: "20px 24px",
    marginBottom: 20,
  },
  progressHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 14, fontWeight: 700, color: "#111827" },
  goldPill: {
    backgroundColor: "#fef08a",
    color: "#854d0e",
    fontWeight: 700,
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 14,
  },
  progressSub: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12.5,
    color: "#4b5563",
    fontWeight: 500,
    marginTop: 10,
    marginBottom: 8,
  },
  progressTrack: {
    width: "100%",
    height: 14,
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: { width: "88%", height: "100%", backgroundColor: "#111827" },
  docHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  docFilterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "1.5px solid #111827",
    background: "#fff",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  filterPillContainer: {
    display: "inline-flex",
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    padding: 3,
    gap: 4,
    marginBottom: 16,
  },
  filterPill: {
    border: "none",
    padding: "6px 18px",
    borderRadius: 6,
    fontSize: 12.5,
    cursor: "pointer",
    background: "transparent",
    color: "#4b5563",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    fontWeight: 700,
    color: "#111827",
  },
  redBadge: {
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    width: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
  },
  actionCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  actionCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionCardTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  badgeGroup: { display: "flex", gap: 8 },
  spotBadge: {
    backgroundColor: "#fee2e2",
    color: "#ef4444",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #fca5a5",
  },
  pendingBadge: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
  },
  requestedRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    color: "#9ca3af",
  },
  instructionsBox: {
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    padding: "16px 20px",
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  uploadBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
};