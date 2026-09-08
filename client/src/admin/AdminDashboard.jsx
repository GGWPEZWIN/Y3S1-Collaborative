import React, { useState } from "react";
import {
  Leaf,
  SunMedium,
  AlertTriangle,
  FileSearch,
  BadgeCheck,
  MapPin,
  Eye,
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Spot-check (7)");

  const stats = [
    { label: "Pending Reviews", count: 5, icon: SunMedium, color: "#f59e0b", bg: "#fef3c7" },
    { label: "Flagged Cases", count: 4, icon: AlertTriangle, color: "#ef4444", bg: "#fee2e2" },
    { label: "Spot-Checks Active", count: 7, icon: FileSearch, color: "#06b6d4", bg: "#cffafe" },
    { label: "Total Certified", count: 836, icon: BadgeCheck, color: "#3b82f6", bg: "#dbeafe" },
  ];

  const filterTabs = [
    "Pending (5)",
    "Flagged (4)",
    "Spot-check (7)",
    "Certified",
  ];

  const [spotChecks, setSpotChecks] = useState([
    {
      id: 1,
      hotelName: "Coastal Inn",
      location: "Kuala Lumpur",
      requested: "July electricity bill + meter reading photo",
      deadline: "24 Jul 2026",
      status: "Pending",
      statusType: "pending",
      action: "reminder",
    },
    {
      id: 2,
      hotelName: "Coastal Inn",
      location: "Kuala Lumpur",
      requested: "July electricity bill + meter reading photo",
      deadline: "24 Jul 2026",
      status: "Overdue",
      statusType: "overdue",
      action: "suspend",
    },
    {
      id: 3,
      hotelName: "Coastal Inn",
      location: "Kuala Lumpur",
      requested: "July electricity bill + meter reading photo",
      deadline: "24 Jul 2026",
      status: "Submitted",
      statusType: "submitted",
      action: "review_actions",
    },
  ]);

  const barData = [
    { month: "Feb", height: 60 },
    { month: "Mar", height: 80 },
    { month: "Apr", height: 110 },
    { month: "May", height: 125 },
    { month: "Jun", height: 95 },
    { month: "Jul", height: 40, active: true },
  ];

  const handleSendReminder = (hotelName) => {
    alert(`Reminder notification sent to ${hotelName}!`);
  };

  const handleSuspend = (id, hotelName) => {
    if (window.confirm(`Are you sure you want to suspend certification for ${hotelName}?`)) {
      setSpotChecks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Suspended", statusType: "overdue" } : item
        )
      );
      alert(`Certification for ${hotelName} has been suspended.`);
    }
  };

  const handleApprove = (id, hotelName) => {
    setSpotChecks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Approved", statusType: "pending" } : item
      )
    );
    alert(`Audit approved for ${hotelName}!`);
  };

  const handleReject = (id, hotelName) => {
    if (window.confirm(`Reject submission for ${hotelName}?`)) {
      setSpotChecks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Rejected", statusType: "overdue" } : item
        )
      );
      alert(`Submission rejected for ${hotelName}.`);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header / Navigation Bar */}
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

      <main style={styles.main}>
        {/* Title Section */}
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Admin Dashboard</h1>
          <p style={styles.subheading}>Review applications, investigate flagged cases, and manage certifications</p>
        </div>

        {/* 4 Summary Stat Cards */}
        <div style={styles.statsGrid}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} style={styles.statCard}>
                <div style={{ ...styles.iconWrapper, backgroundColor: stat.bg }}>
                  <IconComponent size={20} color={stat.color} />
                </div>
                <div style={styles.statNumber}>{stat.count}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Monthly Activity Analytics Card */}
        <div style={styles.chartContainer}>
          <div style={styles.chartHeader}>
            <h2 style={styles.chartTitle}>Monthly Review Activity</h2>
            <p style={styles.chartSubtitle}>Approvals, rejections, and flagged cases over 6 months</p>
          </div>

          <div style={styles.chartBody}>
            <div style={styles.yAxis}>
              <span>32</span>
              <span>24</span>
              <span>16</span>
              <span>8</span>
              <span>0</span>
            </div>

            <div style={styles.barsArea}>
              {barData.map((bar, i) => (
                <div key={i} style={styles.barColumn}>
                  <div
                    style={{
                      ...styles.bar,
                      height: `${bar.height}px`,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                  <span style={styles.xLabel}>{bar.month}</span>
                </div>
              ))}

              {/* Data Tooltip overlay */}
              <div style={styles.chartTooltip}>
                <div style={styles.tooltipMonth}>Jul</div>
                <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>Approved : 12</div>
                <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>Rejected : 2</div>
                <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>Flagged : 5</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={styles.filterPillContainer}>
          {filterTabs.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.filterPill,
                  backgroundColor: isSelected ? "#fff" : "transparent",
                  boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#111827" : "#4b5563",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Hotel Spot-Check Records */}
        <div style={styles.listContainer}>
          {spotChecks.map((item) => (
            <div key={item.id} style={styles.hotelCard}>
              <div style={styles.cardLeft}>
                <h3 style={styles.hotelName}>{item.hotelName}</h3>
                <div style={styles.locationRow}>
                  <MapPin size={14} color="#9ca3af" />
                  <span>{item.location}</span>
                </div>
                <div style={styles.requestedInfo}>
                  <span style={{ fontWeight: 600, color: "#111827" }}>Requested:</span> {item.requested}
                </div>
                <div style={styles.deadlineInfo}>
                  <span style={{ fontWeight: 600, color: "#111827" }}>Deadline:</span> {item.deadline}
                </div>
              </div>

              <div style={styles.cardRight}>
                <div
                  style={{
                    ...styles.badge,
                    backgroundColor:
                      item.statusType === "pending"
                        ? "#fef9c3"
                        : item.statusType === "overdue"
                        ? "#fee2e2"
                        : "#cffafe",
                    color:
                      item.statusType === "pending"
                        ? "#854d0e"
                        : item.statusType === "overdue"
                        ? "#dc2626"
                        : "#0891b2",
                  }}
                >
                  {item.status}
                </div>

                {item.action === "reminder" && (
                  <button
                    type="button"
                    onClick={() => handleSendReminder(item.hotelName)}
                    style={styles.btnOutline}
                  >
                    Send reminder
                  </button>
                )}

                {item.action === "suspend" && (
                  <button
                    type="button"
                    onClick={() => handleSuspend(item.id, item.hotelName)}
                    style={styles.btnDanger}
                  >
                    Suspend Cert
                  </button>
                )}

                {item.action === "review_actions" && (
                  <div style={styles.actionGroup}>
                    <button
                      type="button"
                      onClick={() => alert(`Reviewing utility files uploaded by ${item.hotelName}...`)}
                      style={styles.btnReview}
                    >
                      <Eye size={15} /> Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(item.id, item.hotelName)}
                      style={styles.btnApprove}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item.id, item.hotelName)}
                      style={styles.btnOutline}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 60,
    width: "100%",
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
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  profileScore: {
    fontSize: 11.5,
    color: "#6b7280",
  },
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
  main: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 20px 0 20px",
  },
  pageHeader: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  subheading: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600,
  },
  chartContainer: {
    backgroundColor: "#fff",
    border: "1.5px solid #86efac",
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  chartSubtitle: {
    fontSize: 12.5,
    color: "#9ca3af",
    marginTop: 4,
    margin: 0,
  },
  chartBody: {
    display: "flex",
    alignItems: "flex-end",
    height: 160,
    position: "relative",
    paddingLeft: 32,
  },
  yAxis: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#9ca3af",
  },
  barsArea: {
    flex: 1,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: "100%",
    borderBottom: "1px solid #e5e7eb",
    borderLeft: "1px solid #e5e7eb",
    position: "relative",
    paddingBottom: 22,
  },
  barColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 34,
  },
  bar: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
  },
  xLabel: {
    position: "absolute",
    bottom: 0,
    fontSize: 11,
    color: "#9ca3af",
  },
  chartTooltip: {
    position: "absolute",
    right: 60,
    top: 15,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  tooltipMonth: {
    fontWeight: 700,
    fontSize: 13,
    color: "#111827",
    marginBottom: 2,
  },
  filterPillContainer: {
    display: "inline-flex",
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 20,
  },
  filterPill: {
    border: "none",
    padding: "6px 16px",
    borderRadius: 8,
    fontSize: 12.5,
    cursor: "pointer",
    transition: "0.2s",
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  hotelCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  locationRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12.5,
    color: "#9ca3af",
  },
  requestedInfo: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 4,
  },
  deadlineInfo: {
    fontSize: 13,
    color: "#4b5563",
  },
  cardRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 14,
  },
  badge: {
    padding: "4px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  actionGroup: {
    display: "flex",
    gap: 8,
  },
  btnOutline: {
    padding: "7px 14px",
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
  },
  btnDanger: {
    padding: "7px 16px",
    backgroundColor: "#ef4444",
    border: "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  btnReview: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 12px",
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
  },
  btnApprove: {
    padding: "7px 16px",
    backgroundColor: "#22c55e",
    border: "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
};