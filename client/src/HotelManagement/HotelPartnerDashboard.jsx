import React, { useEffect, useState } from "react";
import { 
  Leaf, 
  CheckCircle2, 
  Zap, 
  Droplets, 
  Award, 
  FileText, 
  ChevronLeft, 
  Bell, 
  Upload, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  BellRing,
  RefreshCw,
  X,
  ExternalLink,
  Lightbulb,
  ArrowUpRight,
  TrendingUp,
  Filter
} from "lucide-react";
import { auth, db } from "../firebase/config";
import { listenToHotelApplication, uploadSpotCheckEvidence } from "../firebase/hotelService";
import { doc, getDoc, collection, onSnapshot, query, orderBy, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";

export default function HotelPartnerDashboard({ onNavigate }) {
  const [tab, setTab] = useState("pending");
  const [hotelData, setHotelData] = useState(null);
  const [userName, setUserName] = useState("Hotel Partner");
  const [loading, setLoading] = useState(true);
  const [dismissedNotice, setDismissedNotice] = useState(false);

  // Subcollection audit history
  const [auditHistory, setAuditHistory] = useState([]);
  const [submittedStatusFilter, setSubmittedStatusFilter] = useState("All");

  // Spot-check file selection
  const [selectedSpotCheckFile, setSelectedSpotCheckFile] = useState(null);
  const [uploadingSpotCheck, setUploadingSpotCheck] = useState(false);

  // Renewal file selection
  const [selectedRenewalFile, setSelectedRenewalFile] = useState(null);
  const [uploadingRenewal, setUploadingRenewal] = useState(false);

  // Tier Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    newElectricityUsage: "",
    newWaterUsage: "",
    implementedInitiatives: "",
  });
  const [upgradeFile, setUpgradeFile] = useState(null);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const fallbackTag = `Hotel_${(user.uid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000) + 1000}`;

    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists() && (snap.data().username || snap.data().displayName)) {
        setUserName(snap.data().username || snap.data().displayName);
      } else {
        setUserName(fallbackTag);
      }
    }).catch(() => setUserName(fallbackTag));

    // 1. Listen to main hotel application doc
    const unsubscribeApp = listenToHotelApplication(user.uid, (data) => {
      setHotelData(data);
      if (data?.hotelName) {
        setUserName(data.hotelName);
      }
      setLoading(false);
    });

    // 2. Listen to all entries in 'audits' subcollection
    const auditsQuery = query(
      collection(db, "hotel_applications", user.uid, "audits"),
      orderBy("uploadedAt", "desc")
    );

    const unsubscribeAudits = onSnapshot(auditsQuery, (snap) => {
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAuditHistory(logs);
    }, (err) => {
      console.warn("Audit logs query info:", err.message);
    });

    return () => {
      if (unsubscribeApp) unsubscribeApp();
      if (unsubscribeAudits) unsubscribeAudits();
    };
  }, []);

  const isSuspended = hotelData?.status === "Suspended";
  const isFlagged = hotelData?.status === "Flagged";
  const isApproved = hotelData?.status === "Approved" || (isFlagged && !isSuspended && !!hotelData?.certificationTier);

  // Retain Bronze tier during audits/flags unless explicitly suspended
  const currentTier = !isSuspended && hotelData?.certificationTier 
    ? hotelData.certificationTier 
    : isApproved 
    ? "Bronze" 
    : "None";

  const targetNextTier = currentTier === "Bronze" ? "Silver" : currentTier === "Silver" ? "Gold" : "Platinum";

  // Expiry calculation
  const nowMs = Date.now();
  const expiryDateMs = hotelData?.expiryDate ? new Date(hotelData.expiryDate).getTime() : nowMs + 365 * 24 * 3600 * 1000;
  const daysUntilExpiry = Math.ceil((expiryDateMs - nowMs) / (1000 * 60 * 60 * 24));
  const isRenewalDue = !isSuspended && isApproved && daysUntilExpiry <= 30 && hotelData?.renewal?.status !== "Submitted";

  // Active spot-check only shows when strictly Pending and not suspended
  const spotCheckData = hotelData?.spotCheck;
  const hasActiveSpotCheck = spotCheckData?.status === "Pending" && !isSuspended;

  const pendingCount = (hasActiveSpotCheck ? 1 : 0) + (isRenewalDue ? 1 : 0);
  const strikes = hotelData?.flagStrikesCount || 0;

  // Dismiss Notice
  const handleDismissNotice = async () => {
    setDismissedNotice(true);
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, "hotel_applications", auth.currentUser.uid), {
          adminReminder: null
        });
      } catch (e) {
        console.error("Could not clear reminder:", e);
      }
    }
  };

  // Spot-check handlers
  const handleSpotCheckFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert("File size exceeds 800KB limit. Please compress image/PDF.");
      return;
    }
    setSelectedSpotCheckFile(file);
  };

  const handleSpotCheckSubmit = async () => {
    if (!selectedSpotCheckFile || !auth.currentUser) return;
    setUploadingSpotCheck(true);
    try {
      await uploadSpotCheckEvidence(auth.currentUser.uid, selectedSpotCheckFile, "spot_check");
      alert(`Uploaded ${selectedSpotCheckFile.name}! Sent to Admin for review.`);
      setSelectedSpotCheckFile(null);
      setTab("submitted");
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed.");
    } finally {
      setUploadingSpotCheck(false);
    }
  };

  // Renewal handlers
  const handleRenewalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert("File size exceeds 800KB.");
      return;
    }
    setSelectedRenewalFile(file);
  };

  const handleRenewalSubmit = async () => {
    if (!selectedRenewalFile || !auth.currentUser) return;
    setUploadingRenewal(true);
    try {
      await uploadSpotCheckEvidence(auth.currentUser.uid, selectedRenewalFile, "renewal");
      alert(`Renewal proof submitted!`);
      setSelectedRenewalFile(null);
      setTab("submitted");
    } catch (err) {
      console.error(err);
      alert(err.message || "Renewal upload failed.");
    } finally {
      setUploadingRenewal(false);
    }
  };

  // Tier Upgrade Submit Handler
  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!upgradeFile || !auth.currentUser) {
      alert("Please attach your latest utility statement as evidence.");
      return;
    }

    setSubmittingUpgrade(true);
    try {
      const fileUrl = await uploadSpotCheckEvidence(auth.currentUser.uid, upgradeFile, "tier_upgrade");

      await updateDoc(doc(db, "hotel_applications", auth.currentUser.uid), {
        upgradeRequest: {
          status: "Pending Review",
          targetTier: targetNextTier,
          newElectricityUsage: Number(upgradeForm.newElectricityUsage) || hotelData?.electricityUsage,
          newWaterUsage: Number(upgradeForm.newWaterUsage) || hotelData?.waterUsage,
          initiatives: upgradeForm.implementedInitiatives,
          submittedFileName: upgradeFile.name,
          submittedFileUrl: fileUrl,
          requestedAt: new Date().toISOString(),
        }
      });

      alert(`Upgrade request to ${targetNextTier} Tier submitted! GreenTrip Admin will review your updated metrics.`);
      setShowUpgradeModal(false);
      setUpgradeFile(null);
      setTab("submitted");
    } catch (err) {
      console.error(err);
      alert("Failed to submit upgrade application.");
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  // Document Viewer via Blob URL
  const openDoc = (url) => {
    if (!url) {
      alert("No document data found.");
      return;
    }

    try {
      if (url.startsWith("data:")) {
        const parts = url.split(",");
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
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("Error opening document preview:", err);
      const w = window.open();
      if (w) {
        w.document.write(
          `<html><head><title>Document Preview</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#1e293b;"><img src="${url}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;" /></body></html>`
        );
        w.document.close();
      }
    }
  };

  // Filter submitted records by status
  const filteredAuditHistory = auditHistory.filter((log) => {
    if (submittedStatusFilter === "All") return true;
    if (submittedStatusFilter === "Passed") return log.status === "Passed";
    if (submittedStatusFilter === "Rejected") return log.status === "Rejected";
    if (submittedStatusFilter === "Under Review") return log.status === "Submitted" || !log.status;
    return true;
  });

  if (loading) {
    return (
      <div style={{ ...styles.container, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ fontWeight: 600, color: "#6b7280" }}>Loading Hotel Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Navbar */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}><Leaf size={18} color="#fff" /></div>
          <span style={styles.brandTitle}>GreenTrip Malaysia</span>
        </div>

        {/* CLICKABLE PROFILE BADGE WITH DYNAMIC HOTEL NAME */}
        <div 
          style={styles.profileBadge}
          onClick={() => onNavigate?.("/hotel/profile")}
          title="Manage Hotel Profile"
        >
          <div style={{ textAlign: "right" }}>
            <div style={styles.profileName}>{hotelData?.hotelName || userName}</div>
            <div style={styles.profileScore}>Eco Portal</div>
          </div>
          <div style={styles.avatar}>🏨</div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Top Back Navigation Bar */}
        <div style={styles.topNavRow}>
          <button 
            type="button" 
            onClick={() => onNavigate?.("/certification")} 
            style={styles.topBackBtn}
          >
            <ChevronLeft size={17} />
            <span>Back to Portal Overview</span>
          </button>
        </div>

        {/* Title Row */}
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.heading}>Hotel Dashboard</h1>
            <p style={styles.subheading}>{hotelData?.hotelName || "Property Dashboard"}</p>
          </div>
          <div style={{
            ...styles.tierBadge,
            backgroundColor: isApproved ? "#fed7aa" : isSuspended ? "#fee2e2" : "#fef08a",
            color: isApproved ? "#9a3412" : isSuspended ? "#b91c1c" : "#854d0e",
          }}>
            <span>🏅</span> {isApproved ? `${currentTier} Tier` : isSuspended ? "Suspended" : "Under Review"}
          </div>
        </div>

        {/* 6-Month Suspension Lockout Banner */}
        {isSuspended && (
          <div style={styles.suspensionBanner}>
            <ShieldAlert size={28} color="#991b1b" />
            <div>
              <div style={styles.suspensionTitle}>Certification Revoked (6-Month Suspension)</div>
              <div style={styles.suspensionSub}>
                {hotelData?.suspensionReason || "Exceeded 3 rejected audit submissions. Your green certification has been revoked."}
              </div>
              <div style={styles.suspensionDate}>
                Eligible to re-apply after: <strong>{new Date(hotelData?.suspendedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>. When reapplying, your tier will reset to baseline.
              </div>
            </div>
          </div>
        )}

        {/* Admin Urgency Reminder Banner with Dismiss X Button */}
        {hotelData?.adminReminder && !dismissedNotice && !isSuspended && (
          <div style={styles.reminderBanner}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BellRing size={20} color="#b45309" />
              <div>
                <span style={{ fontWeight: 700, color: "#92400e" }}>Admin Notice: </span>
                <span style={{ color: "#78350f" }}>{hotelData.adminReminder}</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleDismissNotice}
              style={styles.closeBannerBtn}
              title="Close notification"
            >
              <X size={16} color="#92400e" />
            </button>
          </div>
        )}

        {/* Certification Active / Warning Banner */}
        {!isSuspended && (
          <div style={{
            ...styles.banner,
            backgroundColor: isApproved ? "#dcfce7" : isFlagged ? "#fee2e2" : "#fef9c3",
            borderColor: isApproved ? "#86efac" : isFlagged ? "#fca5a5" : "#fde047",
          }}>
            <div style={styles.bannerLeft}>
              {isApproved && !isFlagged ? (
                <CheckCircle2 size={24} color="#16a34a" />
              ) : isFlagged ? (
                <AlertTriangle size={24} color="#dc2626" />
              ) : (
                <Clock size={24} color="#d97706" />
              )}
              <div>
                <div style={{ 
                  ...styles.bannerTitle, 
                  color: isApproved && !isFlagged ? "#15803d" : isFlagged ? "#b91c1c" : "#b45309" 
                }}>
                  {isApproved && !isFlagged 
                    ? "Certification Active" 
                    : isFlagged 
                    ? `Audit Action Required (Strike ${strikes}/3)` 
                    : "Application Under Review"}
                </div>
                <div style={{ 
                  ...styles.bannerSubtitle, 
                  color: isApproved && !isFlagged ? "#16a34a" : isFlagged ? "#dc2626" : "#d97706" 
                }}>
                  {isApproved && !isFlagged 
                    ? `National Eco Certification active. ${daysUntilExpiry > 0 ? daysUntilExpiry : 0} days remaining in current cycle.`
                    : isFlagged 
                    ? (hotelData?.fraudFlags?.reason || "Please submit accurate meter proof below to resolve this discrepancy.")
                    : "Application submitted. Awaiting GreenTrip admin approval."}
                </div>
              </div>
            </div>
            <div style={styles.bannerProgressTrack}>
              <div style={{ ...styles.bannerProgressBar, width: isApproved ? "85%" : "25%" }} />
            </div>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <Zap size={24} color="#eab308" fill="#fef08a" />
            <div style={styles.statValue}>{isApproved ? "27%" : "0%"}</div>
            <div style={styles.statTitle}>Electricity Savings</div>
            <div style={styles.statCompare}>{hotelData?.electricityUsage ? `${hotelData.electricityUsage} kWh/mo` : "vs benchmark"}</div>
          </div>
          <div style={styles.statCard}>
            <Droplets size={24} color="#38bdf8" fill="#bae6fd" />
            <div style={styles.statValue}>{isApproved ? "38%" : "0%"}</div>
            <div style={styles.statTitle}>Water Savings</div>
            <div style={styles.statCompare}>{hotelData?.waterUsage ? `${hotelData.waterUsage} L/mo` : "vs benchmark"}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: 24 }}>📉</div>
            <div style={styles.statValue}>{isApproved ? "55 kg" : "0 kg"}</div>
            <div style={styles.statTitle}>Carbon Reduced</div>
            <div style={styles.statCompare}>CO₂ saved this cycle</div>
          </div>
          <div style={styles.statCard}>
            <Award size={24} color="#f59e0b" />
            <div style={styles.statValue}>{isApproved ? "85/100" : "Pending"}</div>
            <div style={styles.statTitle}>Green Score</div>
            <div style={styles.statCompare}>{isApproved ? `Progress to ${targetNextTier}` : "Awaiting baseline"}</div>
          </div>
        </div>

        {/* Certification Tier Progress Section with Upgrade Button */}
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={styles.progressTitle}>Certification Tier Progress</div>
              <div style={styles.bronzePillBadge}>{isApproved ? `${currentTier} Tier` : "No Tier"}</div>
            </div>

            {isApproved && (
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(true)} 
                style={styles.applyUpgradeBtn}
              >
                <TrendingUp size={14} />
                <span>Apply for {targetNextTier} Upgrade</span>
              </button>
            )}
          </div>

          <div style={styles.progressSub}>
            <span>{isApproved ? `Progress toward ${targetNextTier} Tier (Reduces bills to earn +10 pts)` : "Pending audit approval"}</span>
            <span>{isApproved ? "80/90 points" : "0/90 points"}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBarFill, width: isApproved ? "88%" : "0%" }} />
          </div>
        </div>

        {/* Suggestions Bar Below Tier Progress */}
        {isApproved && (
          <div style={styles.suggestionSection}>
            <div style={styles.suggestionHeader}>
              <div style={styles.suggestionIconWrapper}>
                <Lightbulb size={20} color="#ca8a04" />
              </div>
              <div>
                <h3 style={styles.suggestionTitle}>Actionable Steps to Earn +10 Points</h3>
                <p style={styles.suggestionSubtitle}>
                  Decreasing your consumption through these steps reduces your monthly bills and boosts your score to <strong>{targetNextTier} Tier (90 pts)</strong>
                </p>
              </div>
            </div>

            <div style={styles.suggestionList}>
              <div style={styles.suggestionItem}>
                <div style={styles.suggestionBullet}>1</div>
                <div>
                  <div style={styles.suggestionItemTitle}>Install Room Keycard Power Cuts (+5 pts)</div>
                  <div style={styles.suggestionItemDesc}>
                    Cuts guest room idle electricity by ~14%, lowering your billed kWh and adding +5 score points.
                  </div>
                </div>
              </div>

              <div style={styles.suggestionItem}>
                <div style={styles.suggestionBullet}>2</div>
                <div>
                  <div style={styles.suggestionItemTitle}>Aerator Faucet Retrofits (+5 pts)</div>
                  <div style={styles.suggestionItemDesc}>
                    Reduces tap water flow from 9L/min to 5L/min. Lower water volume on your bills adds +5 score points.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents & Audits Section Header */}
        <div style={styles.docHeaderRow}>
          <button style={styles.docFilterBtn}>
            <FileText size={16} /> Documents & Audits
          </button>
        </div>

        {/* Filter Tabs & Status Sub-Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={styles.filterPillContainer}>
            <button
              type="button"
              onClick={() => setTab("submitted")}
              style={{ ...styles.filterPill, ...(tab === "submitted" ? styles.filterPillActive : {}) }}
            >
              Submitted ({auditHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("pending")}
              style={{ ...styles.filterPill, ...(tab === "pending" ? styles.filterPillActive : {}) }}
            >
              Pending {pendingCount > 0 && <span style={styles.redBadge}>{pendingCount}</span>}
            </button>
          </div>

          {tab === "submitted" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={14} color="#6b7280" />
              <select
                value={submittedStatusFilter}
                onChange={(e) => setSubmittedStatusFilter(e.target.value)}
                style={styles.statusFilterDropdown}
              >
                <option value="All">All Statuses ({auditHistory.length})</option>
                <option value="Under Review">Under Review</option>
                <option value="Passed">Verified & Passed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Body */}
        {tab === "pending" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {hasActiveSpotCheck && (
              <div style={styles.actionCard}>
                <div style={styles.actionCardTop}>
                  <h3 style={styles.actionCardTitle}>{spotCheckData?.title || "Electricity Bill + Meter Photo"}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    {strikes > 0 && <span style={styles.strikePill}>Strike {strikes}/3</span>}
                    <span style={styles.spotBadge}>Spot-Check</span>
                    <span style={styles.pendingBadge}>Pending</span>
                  </div>
                </div>

                <div style={styles.metaNoticeRow}>
                  <div style={styles.metaItem}>
                    <Bell size={15} color="#6b7280" />
                    <span>Requested: {spotCheckData?.requestedAt || "Recent"}</span>
                  </div>
                  {spotCheckData?.deadline && (
                    <div style={{ ...styles.metaItem, color: "#b91c1c", fontWeight: 700 }}>
                      <Calendar size={15} color="#b91c1c" />
                      <span>Due: {spotCheckData.deadline}</span>
                    </div>
                  )}
                </div>

                <div style={styles.instructionsBox}>
                  {spotCheckData?.instruction || hotelData?.fraudFlags?.reason || "Upload your utility bill along with a photo of your meter dial."}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={styles.filePickerBox}>
                    <Upload size={16} color="#4b5563" />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                      {selectedSpotCheckFile ? selectedSpotCheckFile.name : "Choose File (PNG, JPG, PDF < 800KB)"}
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      onChange={handleSpotCheckFileChange} 
                      style={{ display: "none" }} 
                    />
                  </label>

                  {selectedSpotCheckFile && (
                    <button
                      type="button"
                      onClick={handleSpotCheckSubmit}
                      disabled={uploadingSpotCheck}
                      style={styles.submitGreenBtn}
                    >
                      {uploadingSpotCheck ? "Uploading & Submitting..." : "Submit Spot-Check Evidence"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {isRenewalDue && (
              <div style={{ ...styles.actionCard, borderColor: "#3b82f6" }}>
                <div style={styles.actionCardTop}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <RefreshCw size={18} color="#2563eb" />
                    <h3 style={styles.actionCardTitle}>Annual Certification Renewal</h3>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={styles.renewalBadge}>Yearly Renewal</span>
                    <span style={styles.pendingBadge}>Action Required</span>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "#1e40af", fontWeight: 600 }}>
                  Your certification expires in {daysUntilExpiry} days. Please upload your latest utility statement to renew for 2027.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={styles.filePickerBox}>
                    <Upload size={16} color="#4b5563" />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                      {selectedRenewalFile ? selectedRenewalFile.name : "Choose Renewal Bill (PDF, PNG < 800KB)"}
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      onChange={handleRenewalFileChange} 
                      style={{ display: "none" }} 
                    />
                  </label>

                  {selectedRenewalFile && (
                    <button
                      type="button"
                      onClick={handleRenewalSubmit}
                      disabled={uploadingRenewal}
                      style={{ ...styles.submitGreenBtn, backgroundColor: "#2563eb" }}
                    >
                      {uploadingRenewal ? "Submitting Renewal..." : "Submit Annual Renewal"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!hasActiveSpotCheck && !isRenewalDue && (
              <div style={styles.emptyPromptCard}>
                <CheckCircle2 size={32} color="#16a34a" />
                <div>
                  <strong>All documents up-to-date.</strong>
                  <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
                    No spot-check audits or renewals currently pending. Your submitted documents are being verified by Admin.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredAuditHistory.length === 0 ? (
              <div style={styles.emptyPromptCard}>
                <div>No records match the selected status filter ({submittedStatusFilter}).</div>
              </div>
            ) : (
              filteredAuditHistory.map((log) => {
                const isPassed = log.status === "Passed";
                const isRejected = log.status === "Rejected";

                return (
                  <div key={log.id} style={styles.actionCard}>
                    <div style={styles.actionCardTop}>
                      <div>
                        <h3 style={styles.actionCardTitle}>
                          {log.type === "renewal" 
                            ? "Annual Renewal Submission" 
                            : log.type === "tier_upgrade" 
                            ? "Tier Promotion Application" 
                            : (log.title || "Spot-Check Verification Document")}
                        </h3>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          Uploaded: {log.uploadedAt?.seconds ? new Date(log.uploadedAt.seconds * 1000).toLocaleString() : "Recent"}
                        </div>
                      </div>

                      <span style={{
                        ...styles.pendingBadge,
                        backgroundColor: isPassed ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef9c3",
                        color: isPassed ? "#15803d" : isRejected ? "#b91c1c" : "#854d0e",
                      }}>
                        {isPassed ? "Verified & Passed" : isRejected ? "Rejected" : "Under Review"}
                      </span>
                    </div>

                    <div style={styles.instructionsBox}>
                      <strong>Submitted File:</strong> {log.fileName || "Evidence File"}<br />
                      <strong>Property:</strong> {hotelData?.hotelName || "Registered Property"}<br />
                      <strong>Result:</strong> {isPassed ? "Approved by GreenTrip Auditor" : isRejected ? "Did not meet requirements" : "Awaiting GreenTrip Admin validation"}
                    </div>

                    {log.fileUrl && (
                      <button
                        type="button"
                        onClick={() => openDoc(log.fileUrl)}
                        style={styles.viewLinkBtn}
                      >
                        <FileText size={14} />
                        <span>View Submitted File</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* TIER UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={22} color="#16a34a" />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>
                  Apply for {targetNextTier} Tier Upgrade
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#4b5563", marginTop: 8, marginBottom: 16 }}>
              Submit your latest decreased consumption numbers and utility bill statements. Once approved, your certification tier updates immediately.
            </p>

            <form onSubmit={handleUpgradeSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={styles.modalLabel}>New Monthly Electricity Usage (kWh)</label>
                <input 
                  type="number" 
                  placeholder={`Current: ${hotelData?.electricityUsage || 0} kWh`}
                  value={upgradeForm.newElectricityUsage}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, newElectricityUsage: e.target.value })}
                  style={styles.modalInput}
                  required
                />
              </div>

              <div>
                <label style={styles.modalLabel}>New Monthly Water Usage (Liters)</label>
                <input 
                  type="number" 
                  placeholder={`Current: ${hotelData?.waterUsage || 0} L`}
                  value={upgradeForm.newWaterUsage}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, newWaterUsage: e.target.value })}
                  style={styles.modalInput}
                  required
                />
              </div>

              <div>
                <label style={styles.modalLabel}>Implemented Green Upgrades</label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Added rooftop solar panels, installed keycard power cuts in all 120 rooms..."
                  value={upgradeForm.implementedInitiatives}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, implementedInitiatives: e.target.value })}
                  style={styles.modalTextarea}
                  required
                />
              </div>

              <div>
                <label style={styles.modalLabel}>Upload Latest Reduced Utility Bill (Proof)</label>
                <input 
                  type="file" 
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => setUpgradeFile(e.target.files[0])}
                  required
                  style={{ fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setShowUpgradeModal(false)}
                  style={styles.cancelModalBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingUpgrade}
                  style={styles.submitModalBtn}
                >
                  {submittingUpgrade ? "Submitting..." : `Submit for ${targetNextTier} Promotion`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  profileBadge: { 
    display: "flex", 
    alignItems: "center", 
    gap: 12,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 10,
    transition: "background 0.15s ease",
  },
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
  main: { maxWidth: 860, margin: "0 auto", padding: "20px 20px 0 20px" },
  topNavRow: {
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
  },
  topBackBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#4b5563",
    cursor: "pointer",
    padding: "4px 0",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heading: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  subheading: { fontSize: 13, color: "#6b7280", marginTop: 4, margin: 0 },
  tierBadge: {
    fontWeight: 700,
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  suspensionBanner: {
    backgroundColor: "#fee2e2",
    border: "2px solid #ef4444",
    borderRadius: 14,
    padding: "18px 22px",
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  suspensionTitle: { fontSize: 16, fontWeight: 800, color: "#991b1b" },
  suspensionSub: { fontSize: 13, color: "#b91c1c", marginTop: 4 },
  suspensionDate: { fontSize: 12.5, color: "#7f1d1d", marginTop: 8 },
  reminderBanner: {
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    fontSize: 13.5,
  },
  closeBannerBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    border: "1px solid #86efac",
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerLeft: { display: "flex", alignItems: "center", gap: 12 },
  bannerTitle: { fontSize: 14, fontWeight: 700 },
  bannerSubtitle: { fontSize: 12.5, fontWeight: 600 },
  bannerProgressTrack: {
    width: 140,
    height: 10,
    backgroundColor: "#cbd5e1",
    borderRadius: 10,
    overflow: "hidden",
  },
  bannerProgressBar: { height: "100%", backgroundColor: "#111827", transition: "width 0.3s" },
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
    marginBottom: 16,
  },
  progressHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 14, fontWeight: 700, color: "#111827" },
  bronzePillBadge: {
    backgroundColor: "#fed7aa",
    color: "#9a3412",
    fontWeight: 700,
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 14,
  },
  applyUpgradeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
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
  progressBarFill: { height: "100%", backgroundColor: "#111827", transition: "width 0.3s" },
  suggestionSection: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fef08a",
    borderRadius: 14,
    padding: "18px 22px",
    marginBottom: 22,
  },
  suggestionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  suggestionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#fef9c3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#854d0e",
    margin: 0,
  },
  suggestionSubtitle: {
    fontSize: 12.5,
    color: "#a16207",
    margin: "3px 0 0 0",
  },
  suggestionList: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  suggestionItem: {
    backgroundColor: "#fff",
    border: "1px solid #fef08a",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  suggestionBullet: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    backgroundColor: "#fef08a",
    color: "#854d0e",
    fontSize: 11,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  suggestionItemTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1f2937",
  },
  suggestionItemDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 1.4,
  },
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
  filterPillContainer: {
    display: "inline-flex",
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    padding: 3,
    gap: 4,
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
  statusFilterDropdown: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    outline: "none",
    cursor: "pointer",
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
    alignItems: "flex-start",
  },
  actionCardTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  strikePill: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontSize: 11.5,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 6,
  },
  spotBadge: {
    backgroundColor: "#fee2e2",
    color: "#ef4444",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #fca5a5",
  },
  renewalBadge: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #93c5fd",
  },
  pendingBadge: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
  },
  metaNoticeRow: { display: "flex", gap: 20, alignItems: "center" },
  metaItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6b7280" },
  instructionsBox: {
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    padding: "16px 20px",
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  filePickerBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    border: "1.5px dashed #cbd5e1",
    padding: "12px 18px",
    borderRadius: 8,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  submitGreenBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    alignSelf: "flex-start",
    cursor: "pointer",
  },
  viewLinkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    color: "#0284c7",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  emptyPromptCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: "24px 28px",
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeModalBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#6b7280",
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    display: "block",
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  },
  modalTextarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  cancelModalBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  submitModalBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#16a34a",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};