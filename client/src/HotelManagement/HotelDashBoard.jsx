import React, { useEffect, useState } from "react";
import {
  Leaf,
  Hotel,
  ClipboardList,
  Sparkles,
  Award,
  Medal,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function GreenCertificationHome({ onNavigate }) {
  const [partnerDisplayName, setPartnerDisplayName] = useState("Hotel Partner");
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Generate a consistent 4-digit code from user UID (e.g., Hotel_4821)
  const generateDefaultHotelTag = (uid) => {
    if (!uid) return "Hotel_1001";
    const numericSeed = uid
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const code = (numericSeed % 9000) + 1000;
    return `Hotel_${code}`;
  };

  useEffect(() => {
    const fetchUserAndApplicationData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      const defaultTag = generateDefaultHotelTag(user.uid);

      try {
        // 1. Check if user configured a custom name in 'users' collection
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const customUsername = userSnap.exists()
          ? userSnap.data().username || userSnap.data().displayName
          : null;

        // 2. Check if user has an application record
        const appRef = doc(db, "hotel_applications", user.uid);
        const appSnap = await getDoc(appRef);

        if (appSnap.exists()) {
          setHasApplied(true);
          const hotelName = appSnap.data().hotelName;
          // Priority: Custom username -> Hotel application name -> Hotel_XXXX
          setPartnerDisplayName(customUsername || hotelName || defaultTag);
        } else {
          setHasApplied(false);
          // Priority: Custom username -> Hotel_XXXX
          setPartnerDisplayName(customUsername || defaultTag);
        }
      } catch (err) {
        console.error("Error loading partner application status:", err);
        setPartnerDisplayName(defaultTag);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchUserAndApplicationData();
  }, []);

  const tiers = [
    {
      id: "platinum",
      name: "Platinum",
      saving: "Energy savings: > 40%",
      icon: <Sparkles size={28} color="#38bdf8" />,
      gradient: "linear-gradient(145deg, #1e293b, #334155)",
      border: "1px solid #475569",
      pillBg: "rgba(56, 189, 248, 0.15)",
      pillColor: "#bae6fd",
      badgeText: "Elite",
    },
    {
      id: "gold",
      name: "Gold",
      saving: "Energy savings: 30–40%",
      icon: <Award size={28} color="#fbbf24" />,
      gradient: "linear-gradient(145deg, #b45309, #d97706)",
      border: "1px solid #f59e0b",
      pillBg: "rgba(254, 240, 138, 0.2)",
      pillColor: "#fef08a",
      badgeText: "Advanced",
    },
    {
      id: "silver",
      name: "Silver",
      saving: "Energy savings: 20–30%",
      icon: <Medal size={28} color="#94a3b8" />,
      gradient: "linear-gradient(145deg, #475569, #64748b)",
      border: "1px solid #94a3b8",
      pillBg: "rgba(241, 245, 249, 0.18)",
      pillColor: "#f1f5f9",
      badgeText: "Standard",
    },
    {
      id: "bronze",
      name: "Bronze",
      saving: "Energy savings: 10–20%",
      icon: <ShieldCheck size={28} color="#fdba74" />,
      gradient: "linear-gradient(145deg, #9a3412, #c2410c)",
      border: "1px solid #ea580c",
      pillBg: "rgba(254, 215, 170, 0.2)",
      pillColor: "#ffedd5",
      badgeText: "Baseline",
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
    if (!hasApplied) {
      alert("Please submit your green certification application first before accessing the Hotel Dashboard.");
      return;
    }

    if (onNavigate) {
      onNavigate("/hotel/partner-dashboard");
    } else {
      window.location.hash = "/hotel/partner-dashboard";
    }
  };

  // Directs to Hotel Profile instead of Traveler Profile
  const handleProfileClick = () => {
    if (onNavigate) {
      onNavigate("/hotel/profile");
    } else {
      window.location.hash = "/hotel/profile";
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

        {/* Profile Header Badge */}
        <div
          style={styles.profileBadge}
          onClick={handleProfileClick}
          title="Click to view hotel profile"
        >
          <div style={{ textAlign: "right" }}>
            <div style={styles.profileName}>{partnerDisplayName}</div>
            <div style={styles.profileScore}>Eco Portal</div>
          </div>
          <div style={styles.avatar}>🏨</div>
        </div>
      </header>

      {/* Main Container */}
      <main style={styles.main}>
        {/* Page Titles */}
        <div style={styles.titleSection}>
          <h1 style={styles.heading}>Green Certification</h1>
          <p style={styles.subheading}>Verified eco-standards and operational audits for Malaysian hotels</p>
        </div>

        {/* Certification Tiers Overview Card */}
        <section style={styles.tiersContainer}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>Certification Tiers</h2>
              <p style={styles.sectionSubtitle}>Four progressive levels based on validated energy benchmarks</p>
            </div>
            <span style={styles.verifiedTag}>National Eco Standard</span>
          </div>

          <div style={styles.tierGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                style={{
                  ...styles.tierCard,
                  background: tier.gradient,
                  border: tier.border,
                }}
              >
                <div style={styles.tierIconWrap}>{tier.icon}</div>
                <div style={styles.tierName}>{tier.name}</div>
                <div style={styles.tierSaving}>{tier.saving}</div>
                <div
                  style={{
                    ...styles.tierPill,
                    backgroundColor: tier.pillBg,
                    color: tier.pillColor
                  }}
                >
                  {tier.badgeText}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lower Action Cards Grid */}
        <div style={styles.actionGrid}>
          {/* Card 1: Apply for Certification */}
          <div style={styles.actionCard}>
            <div style={styles.actionHeader}>
              <div style={styles.iconCirclePrimary}>
                <Hotel size={22} color="#16a34a" />
              </div>
              <div>
                <h3 style={styles.actionTitle}>Apply for Certification</h3>
                <p style={styles.actionSubtitle}>Submit hotel bills and property metrics for audit</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartApplication}
              style={styles.btnPrimary}
            >
              <span>{hasApplied ? "View / Update Application" : "Start Application"}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Card 2: Hotel Dashboard */}
          <div style={styles.actionCard}>
            <div style={styles.actionHeader}>
              <div style={styles.iconCircleSecondary}>
                <ClipboardList size={22} color="#0284c7" />
              </div>
              <div>
                <h3 style={styles.actionTitle}>Hotel Partner Dashboard</h3>
                <p style={styles.actionSubtitle}>Monitor spot-check status and renewal timelines</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleViewDashboard}
              style={styles.btnOutline}
            >
              <span>View Dashboard</span>
              <ArrowRight size={16} />
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
    backgroundColor: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 60,
  },
  header: {
    backgroundColor: "#fff",
    height: 64,
    borderBottom: "1px solid #e2e8f0",
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
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 8,
    userSelect: "none",
    transition: "background 0.15s ease",
  },
  profileName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#1e293b",
  },
  profileScore: {
    fontSize: 11.5,
    color: "#64748b",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  main: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "36px 20px 0 20px",
  },
  titleSection: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.025em",
    margin: 0,
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    margin: 0,
  },
  tiersContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    padding: "26px 28px",
    marginBottom: 24,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.04)",
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    margin: 0,
  },
  verifiedTag: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#16a34a",
    backgroundColor: "#dcfce7",
    padding: "4px 10px",
    borderRadius: 20,
    letterSpacing: "0.01em",
  },
  tierGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  tierCard: {
    borderRadius: 14,
    padding: "22px 14px 18px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    color: "#ffffff",
    boxShadow: "0 8px 16px -4px rgba(0, 0, 0, 0.12)",
    transition: "transform 0.15s ease",
  },
  tierIconWrap: {
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tierName: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    marginBottom: 4,
  },
  tierSaving: {
    fontSize: 11.5,
    fontWeight: 500,
    opacity: 0.92,
    marginBottom: 14,
    minHeight: 28,
  },
  tierPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 12px",
    borderRadius: 20,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    padding: "26px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 160,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03)",
  },
  actionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  iconCirclePrimary: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconCircleSecondary: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  btnPrimary: {
    width: "100%",
    padding: "12px 0",
    backgroundColor: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.2s",
  },
  btnOutline: {
    width: "100%",
    padding: "12px 0",
    backgroundColor: "#fff",
    color: "#0f172a",
    border: "1.5px solid #cbd5e1",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.2s",
  },
};