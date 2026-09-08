import React from "react";
import { Leaf, Hotel, ClipboardList } from "lucide-react";

export default function GreenCertificationHome({ onNavigate }) {
  const tiers = [
    {
      id: "platinum",
      name: "Platinum",
      saving: "Energy savings: > 40%",
      icon: "💎",
      background: "#9ca3af",
      textColor: "#ffffff",
    },
    {
      id: "gold",
      name: "Gold",
      saving: "Energy savings: 30-40%",
      icon: "🥇",
      background: "#eab308",
      textColor: "#ffffff",
    },
    {
      id: "silver",
      name: "Silver",
      saving: "Energy savings: 20-30%",
      icon: "🥈",
      background: "#cbd5e1",
      textColor: "#ffffff",
    },
    {
      id: "bronze",
      name: "Bronze",
      saving: "Energy savings: 10-20%",
      icon: "🥉",
      background: "#d97706",
      textColor: "#ffffff",
    },
  ];

  const handleStartApplication = () => {
    if (onNavigate) {
      onNavigate("/certification/apply");
    } else {
      window.location.hash = "/certification/apply";
    }
  };

  const handleViewDashboard = () => {
    if (onNavigate) {
      onNavigate("/hotel/partner-dashboard");
    } else {
      window.location.hash = "/hotel/partner-dashboard";
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
        {/* Page Titles */}
        <div style={styles.titleSection}>
          <h1 style={styles.heading}>Green Certification</h1>
          <p style={styles.subheading}>Eco-certification for Malaysian hotels</p>
        </div>

        {/* Certification Tiers Overview Card */}
        <section style={styles.tiersContainer}>
          <h2 style={styles.sectionTitle}>Certification Tiers</h2>
          <p style={styles.sectionSubtitle}>Four levels based on sustainability performance</p>

          <div style={styles.tierGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                style={{
                  ...styles.tierCard,
                  backgroundColor: tier.background,
                  color: tier.textColor,
                }}
              >
                <div style={styles.tierIcon}>{tier.icon}</div>
                <div style={styles.tierName}>{tier.name}</div>
                <div style={styles.tierSaving}>{tier.saving}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Lower Action Cards Grid */}
        <div style={styles.actionGrid}>
          {/* Card 1: Apply for Certification */}
          <div style={styles.actionCard}>
            <div style={styles.actionHeader}>
              <div style={styles.iconCircle}>
                <Hotel size={22} color="#1f2937" />
              </div>
              <div>
                <h3 style={styles.actionTitle}>Apply for Certification</h3>
                <p style={styles.actionSubtitle}>Hotels can submit applications</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartApplication}
              style={styles.btnPrimary}
            >
              Start Application
            </button>
          </div>

          {/* Card 2: Hotel Dashboard */}
          <div style={styles.actionCard}>
            <div style={styles.actionHeader}>
              <div style={styles.iconCircle}>
                <ClipboardList size={22} color="#1f2937" />
              </div>
              <div>
                <h3 style={styles.actionTitle}>Hotel Dashboard</h3>
                <p style={styles.actionSubtitle}>View your certification status</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleViewDashboard}
              style={styles.btnOutline}
            >
              View Dashboard
            </button>
          </div>
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
    padding: "36px 20px 0 20px",
  },
  titleSection: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  subheading: {
    fontSize: 13.5,
    color: "#6b7280",
    marginTop: 6,
    margin: 0,
  },
  tiersContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "24px 28px",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 18,
  },
  tierGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  tierCard: {
    borderRadius: 12,
    padding: "18px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  tierIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  tierName: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 4,
  },
  tierSaving: {
    fontSize: 11,
    fontWeight: 500,
    opacity: 0.95,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 150,
  },
  actionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  actionSubtitle: {
    fontSize: 12.5,
    color: "#9ca3af",
    margin: "4px 0 0 0",
  },
  btnPrimary: {
    width: "100%",
    padding: "10px 0",
    backgroundColor: "#262626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "0.2s",
  },
  btnOutline: {
    width: "100%",
    padding: "10px 0",
    backgroundColor: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "0.2s",
  },
};