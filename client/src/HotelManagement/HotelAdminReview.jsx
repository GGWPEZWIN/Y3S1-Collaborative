import React, { useEffect, useState } from "react";
import { 
  Zap, 
  Droplets, 
  FileText, 
  MapPin, 
  AlertTriangle, 
  Send, 
  Building, 
  Search, 
  ExternalLink, 
  BellRing, 
  Clock, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { updateHotelStatus } from "../firebase/hotelService";
import { db } from "../firebase/config";
import { 
  collection, 
  onSnapshot, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc 
} from "firebase/firestore";

// Helper to compute real counts from applications AND subcollection audits over the last 6 months
const getDynamicChartData = (apps, allAuditsMap) => {
  const monthsMap = {};
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    monthsMap[monthName] = { month: monthName, approved: 0, rejected: 0, flagged: 0, total: 0 };
  }

  // 1. Process main hotel applications
  apps.forEach((app) => {
    const dateObj = app.createdAt?.seconds ? new Date(app.createdAt.seconds * 1000) : new Date();
    const monthName = dateObj.toLocaleString('en-US', { month: 'short' });

    if (monthsMap[monthName]) {
      if (app.status === "Approved") {
        monthsMap[monthName].approved += 1;
        monthsMap[monthName].total += 1;
      } else if (app.status === "Rejected") {
        monthsMap[monthName].rejected += 1;
        monthsMap[monthName].total += 1;
      } else if (app.status === "Flagged" || app.status === "Suspended") {
        monthsMap[monthName].flagged += 1;
        monthsMap[monthName].total += 1;
      }
    }
  });

  // 2. Process subcollection audit logs (spot-checks, renewals, upgrades)
  Object.values(allAuditsMap).flat().forEach((audit) => {
    const dateObj = audit.uploadedAt?.seconds ? new Date(audit.uploadedAt.seconds * 1000) : new Date();
    const monthName = dateObj.toLocaleString('en-US', { month: 'short' });

    if (monthsMap[monthName]) {
      if (audit.status === "Passed") {
        monthsMap[monthName].approved += 1;
        monthsMap[monthName].total += 1;
      } else if (audit.status === "Rejected") {
        monthsMap[monthName].rejected += 1;
        monthsMap[monthName].total += 1;
      }
    }
  });

  return Object.values(monthsMap);
};

export default function HotelAdminReview() {
  const [activeSubTab, setActiveSubTab] = useState("pending");
  const [applications, setApplications] = useState([]);
  const [auditLogsMap, setAuditLogsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAiDetails, setShowAiDetails] = useState({});
  const [hoveredBar, setHoveredBar] = useState(null);

  // Sub-filters for tabs
  const [pendingFilter, setPendingFilter] = useState("All");
  const [flaggedFilter, setFlaggedFilter] = useState("All");
  const [spotCheckFilter, setSpotCheckFilter] = useState("All");
  const [certifiedTierFilter, setCertifiedTierFilter] = useState("All");

  // Real-time listener: updates automatically when hotel uploads evidence or requests audits
  useEffect(() => {
    const colRef = collection(db, "hotel_applications");
    const unsubscribe = onSnapshot(colRef, async (snapshot) => {
      const docsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApplications(docsData);

      // Fetch subcollection audits for each hotel to include spot-checks/renewals in chart
      const auditsMap = {};
      for (const d of snapshot.docs) {
        try {
          const auditsSnap = await getDocs(collection(db, "hotel_applications", d.id, "audits"));
          auditsMap[d.id] = auditsSnap.docs.map(ad => ad.data());
        } catch (e) {
          auditsMap[d.id] = [];
        }
      }
      setAuditLogsMap(auditsMap);
      setLoading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const chartData = getDynamicChartData(applications, auditLogsMap);

  const toggleAiDetails = (id) => {
    setShowAiDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getHotelTier = (app) => {
    if (app.status === "Suspended") return null;
    return app.certificationTier || (app.status === "Approved" ? "Bronze" : null);
  };

  // Open Base64 document preview cleanly using Blob URL
  const openDocumentPreview = (dataUrl) => {
    if (!dataUrl) {
      alert("No document data found.");
      return;
    }

    try {
      if (dataUrl.startsWith("data:")) {
        const parts = dataUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([uint8Array], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(dataUrl, "_blank");
      }
    } catch (err) {
      console.error("Error opening preview:", err);
      const win = window.open();
      if (win) {
        win.document.write(
          `<html><head><title>Evidence Preview</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#1e293b;"><img src="${dataUrl}" style="max-width:95vw;max-height:95vh;object-fit:contain;box-shadow:0 10px 25px rgba(0,0,0,0.5);border-radius:8px;" /></body></html>`
        );
        win.document.close();
      }
    }
  };

  // General Status Updater (Initial Review)
  const handleStatus = async (appId, newStatus) => {
    try {
      const updatePayload = newStatus === "Approved" 
        ? { status: "Approved", certificationTier: "Bronze" }
        : { status: newStatus };

      await updateHotelStatus(appId, updatePayload);
      alert(`Hotel status updated to: ${newStatus}${newStatus === "Approved" ? " (Certified Bronze)" : ""}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  // 3-Strikes Violation Logic
  const handleRejectEvidenceWithStrike = async (hotel) => {
    const currentStrikes = (hotel.flagStrikesCount || 0) + 1;
    const isSuspended = currentStrikes >= 3;

    let updatePayload = {};

    if (isSuspended) {
      const sixMonthsDate = new Date();
      sixMonthsDate.setMonth(sixMonthsDate.getMonth() + 6);

      updatePayload = {
        status: "Suspended",
        certificationTier: null,
        flagStrikesCount: 3,
        suspendedUntil: sixMonthsDate.toISOString(),
        suspensionReason: "Exceeded 3 rejected audit submissions. Certification revoked for 6 months.",
        "spotCheck.status": "Failed",
      };
      alert(`STRIKE 3/3: ${hotel.hotelName} is SUSPENDED for 6 months. Tier has been revoked.`);
    } else {
      updatePayload = {
        status: "Flagged",
        flagStrikesCount: currentStrikes,
        certificationTier: hotel.certificationTier || "Bronze",
        "fraudFlags.reason": `Audit evidence rejected by Admin (Strike ${currentStrikes}/3). Please resubmit valid meter proof.`,
        "spotCheck.status": "Pending",
        "spotCheck.submittedFileName": null,
        "spotCheck.submittedFileUrl": null,
      };
      alert(`Evidence Rejected! Warning Strike ${currentStrikes}/3 recorded for ${hotel.hotelName}. Hotel must resubmit, tier remains ${hotel.certificationTier || "Bronze"}.`);
    }

    try {
      await updateHotelStatus(hotel.id, updatePayload);

      const auditsRef = collection(db, "hotel_applications", hotel.id, "audits");
      const pendingAudits = await getDocs(query(auditsRef, where("status", "==", "Submitted")));
      for (const auditDoc of pendingAudits.docs) {
        await updateDoc(doc(db, "hotel_applications", hotel.id, "audits", auditDoc.id), {
          status: "Rejected",
          reviewedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      alert("Error updating strike penalty.");
    }
  };

  // Spot-check: Verify & Pass
  const handlePassSpotCheck = async (hotel) => {
    try {
      const updatePayload = {
        status: "Approved",
        certificationTier: hotel.certificationTier || "Bronze",
        "spotCheck.status": "Passed",
        "spotCheck.resolvedAt": new Date().toISOString(),
      };
      await updateHotelStatus(hotel.id, updatePayload);

      const auditsRef = collection(db, "hotel_applications", hotel.id, "audits");
      const pendingAudits = await getDocs(query(auditsRef, where("status", "==", "Submitted")));
      for (const auditDoc of pendingAudits.docs) {
        await updateDoc(doc(db, "hotel_applications", hotel.id, "audits", auditDoc.id), {
          status: "Passed",
          reviewedAt: new Date().toISOString(),
        });
      }

      alert(`Spot-check verified! ${hotel.hotelName} remains certified ${updatePayload.certificationTier}.`);
    } catch (err) {
      console.error(err);
      alert("Error approving spot-check");
    }
  };

  // Spot-Check trigger
  const handleTriggerSpotCheck = async (hotel) => {
    const docOptions = [
      {
        title: "Electricity Bill",
        instruction: "Upload your latest official electricity statement and matching photograph of the main meter reading.",
      },
      {
        title: "Water Utility Bill",
        instruction: "Upload your state water utility statement along with a clear photograph of your primary water meter dial.",
      },
    ];

    const chosenDoc = docOptions[Math.floor(Math.random() * docOptions.length)];
    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + 7);

    const updatePayload = {
      spotCheck: {
        status: "Pending",
        title: chosenDoc.title,
        instruction: chosenDoc.instruction,
        requestedAt: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        deadline: dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        dueDateTimestamp: dueDate.getTime(),
        submittedFileName: null,
        submittedFileUrl: null,
      },
    };

    try {
      await updateHotelStatus(hotel.id, updatePayload);
      alert(`Spot-Check Assigned to ${hotel.hotelName}!\nItem: ${chosenDoc.title}\nDue: ${updatePayload.spotCheck.deadline}`);
    } catch (err) {
      console.error(err);
      alert("Failed to initiate spot-check.");
    }
  };

  // Manual Nudge/Reminder Button
  const handleSendReminder = async (hotel) => {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      await updateHotelStatus(hotel.id, {
        adminReminder: `Urgent: Verification evidence pending. Sent by GreenTrip Admin at ${nowStr}.`,
        reminderTimestamp: Date.now(),
      });
      alert(`Urgent reminder ping delivered to ${hotel.hotelName}'s dashboard!`);
    } catch (err) {
      console.error(err);
      alert("Failed to send reminder.");
    }
  };

  // Category partition with strict clearing for processed items
  const pendingApps = applications.filter((a) => {
    if (a.status === "Approved" || a.status === "Rejected" || a.status === "Flagged" || a.status === "Suspended") return false;
    if (pendingFilter === "All") return !a.status || a.status === "Pending Review" || a.status === "Submitted";
    if (pendingFilter === "Pending") return !a.status || a.status === "Pending Review" || a.status === "Submitted";
    return a.status === pendingFilter;
  });

  const flaggedApps = applications.filter((a) => {
    // Once pardoned (Approved) or fully resolved, remove from flagged list
    if (a.status === "Approved") return false;

    const isSuspended = a.status === "Suspended";
    const isFlagged = a.status === "Flagged" || a.fraudFlags?.hasSuspicion;
    if (flaggedFilter === "Active") return isFlagged && !isSuspended;
    if (flaggedFilter === "Suspended") return isSuspended;
    return isFlagged || isSuspended;
  });

  const spotcheckApps = applications.filter((a) => {
    const sc = a.spotCheck;
    if (!sc || sc.status === "None" || sc.status === "Passed") return false;
    const now = Date.now();
    const isNearDue = sc.dueDateTimestamp && (sc.dueDateTimestamp - now < 2 * 24 * 3600 * 1000);

    if (spotCheckFilter === "Waiting Upload") return sc.status === "Pending";
    if (spotCheckFilter === "Uploaded") return sc.status === "Submitted";
    if (spotCheckFilter === "Near Due") return isNearDue && sc.status === "Pending";
    return true;
  });

  const pendingReviewCount = applications.filter((a) => a.spotCheck?.status === "Submitted").length;

  const certifiedApps = applications.filter((a) => {
    if (a.status !== "Approved" && (!a.certificationTier || a.status === "Suspended")) return false;
    if (certifiedTierFilter === "All") return true;
    return getHotelTier(a) === certifiedTierFilter;
  });

  const tierCounts = {
    Platinum: applications.filter((a) => a.status !== "Suspended" && getHotelTier(a) === "Platinum").length,
    Gold: applications.filter((a) => a.status !== "Suspended" && getHotelTier(a) === "Gold").length,
    Silver: applications.filter((a) => a.status !== "Suspended" && getHotelTier(a) === "Silver").length,
    Bronze: applications.filter((a) => a.status !== "Suspended" && getHotelTier(a) === "Bronze").length,
  };

  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        (item.hotelName || "").toLowerCase().includes(q) ||
        (item.address || "").toLowerCase().includes(q) ||
        (item.state || "").toLowerCase().includes(q)
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.titleSection}>
        <h1 style={styles.heading}>Admin Dashboard</h1>
        <p style={styles.subheading}>Review applications, investigate flagged cases, and manage certifications</p>
      </div>

      {/* Top 4 Metrics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ fontSize: 22 }}>🔆</div>
          <div style={styles.statNumber}>{applications.filter(a => a.status === "Pending Review" || !a.status).length}</div>
          <div style={styles.statLabel}>Pending Reviews</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ fontSize: 22 }}>🔺</div>
          <div style={styles.statNumber}>{applications.filter(a => a.status === "Flagged" || a.status === "Suspended").length}</div>
          <div style={styles.statLabel}>Flagged Cases</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ fontSize: 22 }}>📋</div>
          <div style={styles.statNumber}>{applications.filter(a => a.spotCheck?.status === "Pending" || a.spotCheck?.status === "Submitted").length}</div>
          <div style={styles.statLabel}>Spot-Checks Active</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ fontSize: 22 }}>🏅</div>
          <div style={styles.statNumber}>{certifiedApps.length}</div>
          <div style={styles.statLabel}>Total Certified</div>
        </div>
      </div>

      {/* Monthly Review Activity Chart */}
      <div style={styles.chartCard}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>Monthly Review Activity</h3>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "3px 0 0 0" }}>Approvals, rejections, and flagged cases over 6 months</p>
        </div>

        <div style={styles.chartArea}>
          {/* Y-Axis Labels */}
          <div style={styles.yAxis}>
            <span>32</span>
            <span>24</span>
            <span>16</span>
            <span>8</span>
            <span>0</span>
          </div>

          {/* Chart Grid & Bars */}
          <div style={styles.gridContainer}>
            {/* Horizontal Grid Lines */}
            <div style={styles.gridLine} />
            <div style={styles.gridLine} />
            <div style={styles.gridLine} />
            <div style={styles.gridLine} />
            <div style={styles.gridLine} />

            <div style={styles.barsRow}>
              {chartData.map((item, idx) => {
                const isHovered = hoveredBar === idx;
                const barHeightPercent = Math.min((item.total / 32) * 100, 100);

                return (
                  <div 
                    key={item.month} 
                    style={styles.barColumnWrapper}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Hover Column Background Highlight */}
                    {isHovered && <div style={styles.barHighlightBg} />}

                    {/* Interactive Tooltip Card */}
                    {isHovered && (
                      <div style={styles.tooltipCard}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{item.month}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#22c55e", marginBottom: 3 }}>Approved : {item.approved}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#ef4444", marginBottom: 3 }}>Rejected : {item.rejected}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#f59e0b" }}>Flagged : {item.flagged}</div>
                      </div>
                    )}

                    {/* Bar Element */}
                    <div style={styles.barTrack}>
                      <div 
                        style={{ 
                          ...styles.barFill, 
                          height: `${barHeightPercent}%`,
                          backgroundColor: isHovered ? "#d97706" : "#f59e0b"
                        }} 
                      />
                    </div>
                    <span style={styles.xAxisLabel}>{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={styles.subtabTrack}>
        <button
          type="button"
          onClick={() => setActiveSubTab("pending")}
          style={{ ...styles.subtabBtn, ...(activeSubTab === "pending" ? styles.subtabBtnActive : {}) }}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("flagged")}
          style={{ ...styles.subtabBtn, ...(activeSubTab === "flagged" ? styles.subtabBtnActive : {}) }}
        >
          Flagged & Strikes
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("spotcheck")}
          style={{ ...styles.subtabBtn, ...(activeSubTab === "spotcheck" ? styles.subtabBtnActive : {}) }}
        >
          Spot-Checks & Reminders {pendingReviewCount > 0 && <span style={styles.redBadge}>{pendingReviewCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("certified")}
          style={{ ...styles.subtabBtn, ...(activeSubTab === "certified" ? styles.subtabBtnActive : {}) }}
        >
          Certified Directory
        </button>
      </div>

      {/* Toolbar Row */}
      <div style={styles.toolbarRow}>
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search hotel or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <Search size={16} color="#9ca3af" />
        </div>

        {activeSubTab === "pending" && (
          <select value={pendingFilter} onChange={(e) => setPendingFilter(e.target.value)} style={styles.selectFilter}>
            <option value="All">All Inflow</option>
            <option value="Pending">Only Pending</option>
            <option value="Approved">Approved Baseline</option>
            <option value="Rejected">Rejected</option>
          </select>
        )}

        {activeSubTab === "flagged" && (
          <select value={flaggedFilter} onChange={(e) => setFlaggedFilter(e.target.value)} style={styles.selectFilter}>
            <option value="All">All Cases</option>
            <option value="Active">Active Discrepancies</option>
            <option value="Suspended">6-Month Suspended</option>
          </select>
        )}

        {activeSubTab === "spotcheck" && (
          <select value={spotCheckFilter} onChange={(e) => setSpotCheckFilter(e.target.value)} style={styles.selectFilter}>
            <option value="All">All Audits</option>
            <option value="Waiting Upload">Awaiting Hotel File</option>
            <option value="Uploaded">Hotel Uploaded (Review Ready)</option>
            <option value="Near Due">Near Due Date (&lt; 48h)</option>
          </select>
        )}

        {activeSubTab === "certified" && (
          <select value={certifiedTierFilter} onChange={(e) => setCertifiedTierFilter(e.target.value)} style={styles.selectFilter}>
            <option value="All">All Certified Tiers</option>
            <option value="Bronze">Bronze Tier</option>
            <option value="Silver">Silver Tier</option>
            <option value="Gold">Gold Tier</option>
            <option value="Platinum">Platinum Tier</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.emptyBox}>Loading applications...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TAB 1: PENDING */}
          {activeSubTab === "pending" && (
            filterBySearch(pendingApps).length === 0 ? (
              <div style={styles.emptyBox}>No applications found under this filter.</div>
            ) : (
              filterBySearch(pendingApps).map((app) => (
                <div key={app.id} style={styles.pendingCard}>
                  <div style={styles.cardHeaderRow}>
                    <h3 style={styles.cardHotelName}>{app.hotelName || "Hotel Property"}</h3>
                    <span style={styles.cardDate}>
                      {app.status === "Approved" ? "✓ Approved" : app.status === "Rejected" ? "✕ Rejected" : "Pending Review"}
                    </span>
                  </div>

                  <div style={styles.locationRow}>
                    <MapPin size={16} color="#9ca3af" />
                    <span>{app.address ? `${app.address}, ${app.state || "Malaysia"}` : "Address not provided"}</span>
                  </div>

                  <div style={styles.metricsGrid3}>
                    <div style={styles.metricBox}>
                      <Zap size={24} color="#eab308" fill="#fef08a" />
                      <div style={styles.metricNum}>{app.electricityUsage?.toLocaleString() || "0"}</div>
                      <div style={styles.metricUnit}>kWh/mo</div>
                    </div>
                    <div style={styles.metricBox}>
                      <Droplets size={24} color="#38bdf8" fill="#bae6fd" />
                      <div style={styles.metricNum}>{app.waterUsage?.toLocaleString() || "0"}</div>
                      <div style={styles.metricUnit}>L/mo</div>
                    </div>
                    <div style={styles.metricBox}>
                      <FileText size={24} color="#4b5563" />
                      <div style={styles.metricNum}>{app.rooms || "1"}</div>
                      <div style={styles.metricUnit}>rooms</div>
                    </div>
                  </div>

                  <div style={styles.documentPreviewRow}>
                    {app.electricityBillUrl && (
                      <button type="button" onClick={() => openDocumentPreview(app.electricityBillUrl)} style={styles.previewBtn}>
                        <FileText size={14} color="#0284c7" />
                        <span>View Electricity Bill</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                    {app.waterBillUrl && (
                      <button type="button" onClick={() => openDocumentPreview(app.waterBillUrl)} style={styles.previewBtn}>
                        <FileText size={14} color="#0284c7" />
                        <span>View Water Bill</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>

                  {app.status !== "Approved" && (
                    <div style={styles.actionRow}>
                      <button type="button" onClick={() => handleStatus(app.id, "Approved")} style={styles.greenBtn}>
                        Approve (Grant Bronze)
                      </button>
                      <button type="button" onClick={() => handleStatus(app.id, "Rejected")} style={styles.redOutlineBtn}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          )}

          {/* TAB 2: FLAGGED */}
          {activeSubTab === "flagged" && (
            filterBySearch(flaggedApps).length === 0 ? (
              <div style={styles.emptyBox}>No flagged or suspended properties.</div>
            ) : (
              filterBySearch(flaggedApps).map((app) => {
                const isOpen = showAiDetails[app.id] ?? true;
                const strikes = app.flagStrikesCount || 0;
                const isSuspended = app.status === "Suspended";

                return (
                  <div key={app.id} style={{ ...styles.flaggedCard, borderColor: isSuspended ? "#7f1d1d" : "#ef4444" }}>
                    <div style={styles.cardHeaderRow}>
                      <div>
                        <h3 style={styles.cardHotelName}>{app.hotelName}</h3>
                        <span style={styles.locationRow}>
                          <MapPin size={14} color="#9ca3af" /> {app.address}, {app.state}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={isSuspended ? styles.suspendedPill : styles.strikeBadge}>
                          {isSuspended ? "6-Month Suspension" : `Strike Count: ${strikes}/3`}
                        </span>
                      </div>
                    </div>

                    <div style={styles.mismatchAlert}>
                      <ShieldAlert size={18} color={isSuspended ? "#7f1d1d" : "#dc2626"} />
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {isSuspended 
                          ? `Revoked until: ${new Date(app.suspendedUntil).toLocaleDateString()}` 
                          : "Audit Discrepancy / Document Suspicion"}
                      </span>
                    </div>

                    <button type="button" onClick={() => toggleAiDetails(app.id)} style={styles.toggleAiBtn}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      <span>Diagnostic & Fraud Log</span>
                    </button>

                    {isOpen && (
                      <div style={styles.aiAlertBox}>
                        {app.suspensionReason || app.fraudFlags?.reason || "Irregular usage ratio or duplicate receipt detected."}
                      </div>
                    )}

                    <div style={styles.documentPreviewRow}>
                      {app.electricityBillUrl && (
                        <button type="button" onClick={() => openDocumentPreview(app.electricityBillUrl)} style={styles.previewBtn}>
                          <FileText size={14} color="#dc2626" />
                          <span>Inspect Declared Document</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>

                    {!isSuspended && (
                      <div style={styles.actionRow}>
                        <button type="button" onClick={() => handleRejectEvidenceWithStrike(app)} style={styles.redOutlineBtn}>
                          Reject & Add Strike ({strikes + 1}/3)
                        </button>
                        <button type="button" onClick={() => handleStatus(app.id, "Approved")} style={styles.greenBtn}>
                          Pardon & Grant Bronze
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}

          {/* TAB 3: SPOT-CHECKS & REMINDERS */}
          {activeSubTab === "spotcheck" && (
            filterBySearch(spotcheckApps).length === 0 ? (
              <div style={styles.emptyBox}>No active spot-check audits matching this filter.</div>
            ) : (
              filterBySearch(spotcheckApps).map((app) => {
                const sc = app.spotCheck;
                const isSubmitted = sc?.status === "Submitted";
                const isNearDue = sc?.dueDateTimestamp && (sc.dueDateTimestamp - Date.now() < 2 * 24 * 3600 * 1000);

                return (
                  <div key={app.id} style={styles.spotCheckCard}>
                    <div style={styles.cardHeaderRow}>
                      <div>
                        <h3 style={styles.cardHotelName}>{app.hotelName}</h3>
                        <div style={styles.locationRow}>
                          <MapPin size={14} color="#9ca3af" /> {app.address}, {app.state}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {isNearDue && !isSubmitted && (
                          <span style={styles.urgentPill}>Due Soon</span>
                        )}
                        <span style={isSubmitted ? styles.submittedStatusPill : styles.pendingStatusPill}>
                          {isSubmitted ? "Evidence Uploaded (Action Required)" : "Awaiting Hotel"}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
                      Requirement: <strong>{sc?.title}</strong><br />
                      Deadline: <strong>{sc?.deadline}</strong>
                    </div>

                    {isSubmitted && sc?.submittedFileUrl && (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" onClick={() => openDocumentPreview(sc.submittedFileUrl)} style={styles.previewBtn}>
                          <FileText size={14} color="#15803d" />
                          <span>Inspect Uploaded Meter Proof ({sc.submittedFileName})</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                      <div>
                        {!isSubmitted && (
                          <button type="button" onClick={() => handleSendReminder(app)} style={styles.reminderBtn}>
                            <BellRing size={14} />
                            <span>Send Urgent Reminder Ping</span>
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        {isSubmitted && (
                          <>
                            <button type="button" onClick={() => handleRejectEvidenceWithStrike(app)} style={styles.redOutlineBtn}>
                              Reject Evidence
                            </button>
                            <button type="button" onClick={() => handlePassSpotCheck(app)} style={styles.greenBtn}>
                              Verify & Pass Audit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 4: CERTIFIED DIRECTORY */}
          {activeSubTab === "certified" && (
            <div>
              <div style={styles.tiersFourGrid}>
                <div style={{ ...styles.tierBlock, background: "#d1d5db" }}>
                  <div style={styles.tierBlockNum}>{tierCounts.Platinum}</div>
                  <div style={styles.tierBlockName}>Platinum</div>
                </div>
                <div style={{ ...styles.tierBlock, background: "#fef08a" }}>
                  <div style={{ ...styles.tierBlockNum, color: "#854d0e" }}>{tierCounts.Gold}</div>
                  <div style={styles.tierBlockName}>Gold</div>
                </div>
                <div style={{ ...styles.tierBlock, background: "#e5e7eb" }}>
                  <div style={styles.tierBlockNum}>{tierCounts.Silver}</div>
                  <div style={styles.tierBlockName}>Silver</div>
                </div>
                <div style={{ ...styles.tierBlock, background: "#fed7aa" }}>
                  <div style={{ ...styles.tierBlockNum, color: "#9a3412" }}>{tierCounts.Bronze}</div>
                  <div style={styles.tierBlockName}>Bronze</div>
                </div>
              </div>

              {filterBySearch(certifiedApps).length === 0 ? (
                <div style={styles.emptyBox}>No certified properties match the selected filter.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filterBySearch(certifiedApps).map((app) => (
                    <div key={app.id} style={styles.certifiedCard}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Building size={16} color="#4b5563" />
                          <span style={styles.cardHotelName}>{app.hotelName}</span>
                          <span style={
                            getHotelTier(app) === "Platinum" ? styles.platinumPill :
                            getHotelTier(app) === "Gold" ? styles.goldPill :
                            getHotelTier(app) === "Silver" ? styles.silverPill :
                            styles.bronzePill
                          }>
                            {getHotelTier(app)}
                          </span>
                        </div>
                        <div style={styles.certifiedMeta}>{app.address ? `${app.address}, ${app.state}` : "Malaysia"}</div>
                      </div>

                      <button type="button" onClick={() => handleTriggerSpotCheck(app)} style={styles.spotCheckActionBtn}>
                        <Send size={14} /> Trigger Random Spot-Check
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { width: "100%" },
  titleSection: { marginBottom: 20 },
  heading: { fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 },
  subheading: { fontSize: 13.5, color: "#6b7280", marginTop: 6, margin: 0 },
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
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statNumber: { fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: 600 },
  chartCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "24px 28px",
    marginBottom: 24,
  },
  chartArea: {
    display: "flex",
    alignItems: "flex-end",
    height: 180,
    marginTop: 16,
    position: "relative",
  },
  yAxis: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
    fontSize: 11.5,
    color: "#9ca3af",
    paddingRight: 12,
    paddingBottom: 20,
    textAlign: "right",
    width: 24,
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  gridLine: {
    width: "100%",
    borderBottom: "1px dashed #f3f4f6",
  },
  barsRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "flex-end",
    padding: "0 16px",
  },
  barColumnWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    position: "relative",
    width: 44,
    cursor: "pointer",
  },
  barHighlightBg: {
    position: "absolute",
    top: -10,
    bottom: -6,
    width: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    zIndex: 1,
  },
  tooltipCard: {
    position: "absolute",
    bottom: "105%",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 16px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
    zIndex: 20,
    minWidth: 120,
    pointerEvents: "none",
  },
  barTrack: {
    width: 28,
    height: "100%",
    display: "flex",
    alignItems: "flex-end",
    zIndex: 2,
  },
  barFill: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
    transition: "background-color 0.15s ease",
  },
  xAxisLabel: {
    position: "absolute",
    bottom: -22,
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    zIndex: 2,
  },
  subtabTrack: {
    display: "inline-flex",
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 16,
  },
  subtabBtn: {
    border: "none",
    background: "transparent",
    padding: "8px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  subtabBtnActive: {
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    color: "#111827",
    fontWeight: 700,
  },
  redBadge: {
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
  },
  toolbarRow: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    marginBottom: 18,
  },
  searchBar: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "9px 14px",
    backgroundColor: "#fff",
  },
  searchInput: { border: "none", outline: "none", width: "100%", fontSize: 13, color: "#374151" },
  selectFilter: {
    padding: "9px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    outline: "none",
    cursor: "pointer",
  },
  pendingCard: {
    backgroundColor: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: 14,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  flaggedCard: {
    backgroundColor: "#fff",
    border: "2px solid #ef4444",
    borderRadius: 14,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  spotCheckCard: {
    backgroundColor: "#fff",
    border: "1.5px solid #d1d5db",
    borderRadius: 14,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  cardHotelName: { fontSize: 16.5, fontWeight: 700, color: "#111827", margin: 0 },
  cardDate: { fontSize: 13, fontWeight: 700, color: "#4b5563" },
  locationRow: { display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6b7280", marginTop: 2 },
  metricsGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    margin: "6px 0",
  },
  metricBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #f3f4f6",
    borderRadius: 10,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  metricNum: { fontSize: 18, fontWeight: 800, color: "#111827", marginTop: 2 },
  metricUnit: { fontSize: 11.5, color: "#6b7280", fontWeight: 600 },
  documentPreviewRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  previewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#0369a1",
    cursor: "pointer",
  },
  actionRow: { display: "flex", gap: 10, marginTop: 4 },
  greenBtn: {
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "8px 18px",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  redOutlineBtn: {
    backgroundColor: "#fff",
    color: "#dc2626",
    border: "1px solid #dc2626",
    padding: "8px 18px",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  reminderBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
    padding: "7px 14px",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  strikeBadge: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    padding: "4px 10px",
    borderRadius: 14,
    fontSize: 12,
    fontWeight: 800,
  },
  suspendedPill: {
    backgroundColor: "#7f1d1d",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 14,
    fontSize: 12,
    fontWeight: 800,
  },
  urgentPill: {
    backgroundColor: "#ffedd5",
    color: "#c2410c",
    border: "1px solid #fed7aa",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 11.5,
    fontWeight: 700,
  },
  pendingStatusPill: {
    border: "1px solid #fde047",
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 12px",
    borderRadius: 14,
  },
  submittedStatusPill: {
    border: "1px solid #86efac",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 12px",
    borderRadius: 14,
  },
  mismatchAlert: { display: "flex", alignItems: "center", gap: 6, color: "#dc2626" },
  toggleAiBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    color: "#4b5563",
    fontSize: 12.5,
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
  },
  aiAlertBox: {
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  tiersFourGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 16,
  },
  tierBlock: { borderRadius: 12, padding: "16px 12px", textAlign: "center" },
  tierBlockNum: { fontSize: 26, fontWeight: 800, color: "#374151" },
  tierBlockName: { fontSize: 12.5, fontWeight: 700, color: "#4b5563", marginTop: 2 },
  certifiedCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  certifiedMeta: { fontSize: 12.5, color: "#9ca3af", marginTop: 4 },
  platinumPill: { backgroundColor: "#e2e8f0", color: "#334155", fontWeight: 700, fontSize: 11.5, padding: "3px 10px", borderRadius: 10 },
  goldPill: { backgroundColor: "#fef08a", color: "#854d0e", fontWeight: 700, fontSize: 11.5, padding: "3px 10px", borderRadius: 10 },
  silverPill: { backgroundColor: "#e5e7eb", color: "#4b5563", fontWeight: 700, fontSize: 11.5, padding: "3px 10px", borderRadius: 10 },
  bronzePill: { backgroundColor: "#fed7aa", color: "#9a3412", fontWeight: 700, fontSize: 11.5, padding: "3px 10px", borderRadius: 10 },
  spotCheckActionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    border: "1px solid #374151",
    color: "#111827",
    padding: "7px 14px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyBox: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 36,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
  },
};