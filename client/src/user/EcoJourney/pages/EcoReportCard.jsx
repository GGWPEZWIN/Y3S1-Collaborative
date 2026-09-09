import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  Share2,
  Download,
  TrendingDown,
  Leaf,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Award,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";

import {
  getCurrentUser,
  getTravelHistory,
} from "../../../firebase/travelHistoryService";

import {
  getOrCreateEcoReport,
} from "../../../firebase/ecoReportService";

import {
  useCurrentUser,
} from "../../../firebase/useCurrentUser";

// ============================================================
// ECO REPORT CARD
//
// One component handles both screens:
//
// /community/reports
//   -> list of Eco-Report Cards for every trip
//
// /community/report?id=TRIP_ID
//   -> full Eco-Report Card for one trip
// ============================================================

export default function EcoReportCard({
  onNavigate,
  onBack,
  tripId,
}) {
  const {
    authUser,
    profile,
    loading: userLoading,
  } = useCurrentUser();

  const [reports, setReports] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD LIST OR SINGLE REPORT
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (userLoading) return;

      if (!authUser) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // ------------------------------------------------------
        // DETAIL PAGE
        // ------------------------------------------------------
        if (tripId) {
          const data = await getOrCreateEcoReport(tripId);

          if (!mounted) return;
          setReport(data);
          setReports([]);
          return;
        }

        // ------------------------------------------------------
        // LIST PAGE
        // ------------------------------------------------------
        const trips = await getTravelHistory({
          status: "All Trips",
          sortBy: "Newest First",
          queryText: "",
        });

        if (!mounted) return;

        const results = await Promise.all(
          (trips || [])
            .filter((trip) => trip?.id)
            .map(async (trip) => {
              try {
                const data = await getOrCreateEcoReport(trip.id);

                return {
                  ...data,
                  tripId: trip.id,
                  trip,
                };
              } catch (reportError) {
                console.error(
                  `Failed to load Eco Report for ${trip.id}:`,
                  reportError
                );

                return {
                  tripId: trip.id,
                  trip,
                  reportError:
                    reportError?.message ||
                    "Unable to load this Eco-Report Card.",
                };
              }
            })
        );

        if (!mounted) return;

        setReports(results);
        setReport(null);
      } catch (err) {
        console.error("Failed to load Eco-Report Card:", err);

        if (mounted) {
          setError(
            err?.message ||
              "Unable to load Eco-Report Card."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [authUser, userLoading, tripId]);

  // ==========================================================
  // AUTH
  // ==========================================================

  if (userLoading) {
    return <LoadingPage text="Loading Eco-Report Card..." />;
  }

  if (!authUser) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.errorText}>You're not logged in.</p>
        <button
          type="button"
          onClick={() => onNavigate?.("/login")}
          style={styles.loginButton}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // ==========================================================
  // USER
  // ==========================================================

  const layoutUser = {
    name:
      profile?.name ||
      authUser.displayName ||
      "User",
    ecoScore:
      profile?.eco_score ??
      profile?.ecoScore ??
      0,
  };

  // ==========================================================
  // DETAIL SCREEN
  // ==========================================================

  if (tripId) {
    if (loading) {
      return <LoadingPage text="Loading Eco-Report Card..." />;
    }

    if (error) {
      return (
        <div style={styles.loadingPage}>
          <p style={styles.errorText}>{error}</p>
          <button
            type="button"
            onClick={() => onNavigate?.("/community/reports")}
            style={styles.loginButton}
          >
            Back to Eco-Reports
          </button>
        </div>
      );
    }

    if (!report) {
      return (
        <div style={styles.loadingPage}>
          <p style={styles.errorText}>
            Eco report not found.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("/community/reports")}
            style={styles.loginButton}
          >
            Back to Eco-Reports
          </button>
        </div>
      );
    }

    return (
      <FullEcoReport
        report={report}
        layoutUser={layoutUser}
        authUser={authUser}
        onNavigate={onNavigate}
      />
    );
  }

  // ==========================================================
  // LIST SCREEN
  // ==========================================================

  return (
    <Layout
      active="community"
      user={layoutUser}
      onNavigate={onNavigate}
    >
      <div style={styles.page}>
        <div style={styles.header}>
          <button
            type="button"
            onClick={() =>
              onBack
                ? onBack()
                : onNavigate?.("/community")
            }
            style={styles.backButton}
          >
            <ChevronLeft size={20} />
            <span>Back to Community</span>
          </button>

          <div>
            <h1 style={styles.title}>Eco-Report Cards</h1>
            <p style={styles.subtitle}>
              View, download and share your sustainability reports for each trip.
            </p>
          </div>
        </div>

        {loading && (
          <div style={styles.centerMessage}>
            Loading Eco-Report Cards...
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <strong>Unable to load Eco-Report Cards.</strong>
            <div style={{ marginTop: 6 }}>{error}</div>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div style={styles.emptyState}>
            <Award size={42} color="#86efac" />
            <h3 style={styles.emptyTitle}>
              No Eco-Report Cards yet
            </h3>
            <p style={styles.emptyText}>
              Complete a trip to generate your Eco-Report Card.
            </p>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div style={styles.reportList}>
            {reports.map((item) => (
              <ReportListCard
                key={item.tripId || item.trip?.id}
                report={item}
                userName={layoutUser.name}
                userEmail={authUser.email || profileEmailFallback(item)}
                onView={() =>
                  onNavigate?.(
                    "/community/report",
                    item.tripId
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ============================================================
// LIST CARD
// ============================================================

function ReportListCard({
  report,
  userName,
  userEmail,
  onView,
}) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const trip = report.trip || {};

  const tripName =
    report.tripName ||
    trip.name ||
    trip.title ||
    "Untitled Trip";

  const ecoScore = Number(
    report.ecoScore ?? trip.ecoScore ?? 0
  );

  const carbonKg = Number(
    report.carbonKg ?? trip.carbonKg ?? 0
  );

  const badges =
    report.badgesEarned ??
    trip.badgesEarned ??
    0;

  const grade =
    report.grade ||
    trip.grade ||
    getGrade(ecoScore);

  const status =
    report.status ||
    trip.status ||
    "Completed";

  const dateRange =
    report.dateRange ||
    trip.dateRange ||
    formatDateRange(
      report.startDate || trip.startDate,
      report.endDate || trip.endDate
    );

  const gradeStyle = getGradeStyle(grade);
  const hasError = Boolean(report.reportError);

  return (
    <div ref={cardRef} style={styles.reportCard}>
      <div style={styles.topBar} />

      <div style={styles.cardBody}>
        <div style={styles.listHeader}>
          <div style={styles.cardInfo}>
            <div style={styles.reportTag}>ECO-REPORT CARD</div>

            <h2 style={styles.tripName}>{tripName}</h2>

            {dateRange && (
              <div style={styles.dateRow}>
                <Calendar size={16} color="#9ca3af" />
                <span>{dateRange}</span>
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.gradeCircle,
              background: gradeStyle.background,
              color: gradeStyle.color,
            }}
          >
            {grade}
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Eco Score</div>
            <div style={styles.scoreValue}>
              {ecoScore}
              <span style={styles.scoreMax}>/100</span>
            </div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Carbon Footprint</div>
            <div style={styles.statValue}>
              {carbonKg.toFixed(1)} kg CO₂
            </div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Badges Earned</div>
            <div style={styles.statValueRow}>
              <Award size={17} color="#f59e0b" />
              <span style={styles.statValue}>{badges}</span>
            </div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Status</div>
            <span style={styles.statusPill}>
              {status}
            </span>
          </div>
        </div>

        {hasError ? (
          <div style={styles.reportError}>
            {report.reportError}
          </div>
        ) : (
          <div style={styles.actionsRow} data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={onView}
              style={styles.btnPrimary}
            >
              View Full Report
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              onClick={async () => {
                if (busy) return;
                try {
                  setBusy(true);
                  await shareElementImage(
                    cardRef.current,
                    report,
                    userName,
                    userEmail
                  );
                } catch (err) {
                  if (err?.name !== "AbortError") {
                    console.error("List card share failed:", err);
                    alert("Unable to share this Eco-Report Card. Please try again.");
                  }
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.btnOutline}
              disabled={busy}
            >
              <Share2 size={15} />
              Share
            </button>

            <button
              type="button"
              onClick={async () => {
                if (busy) return;
                try {
                  setBusy(true);
                  await downloadElementImage(cardRef.current, report, userName, userEmail);
                } catch (err) {
                  console.error("List card download failed:", err);
                  alert("Unable to download this Eco-Report Card. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.btnDark}
            >
              <Download size={15} />
              Download
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================
// FULL REPORT SCREEN
// ============================================================

function FullEcoReport({
  report,
  layoutUser,
  authUser,
  onNavigate,
}) {
  const breakdown = getBreakdown(report);
  const carbonSplit = getCarbonSplit(report);
  const impact = getImpact(report);
  const achievements = getAchievements(report);
  const reportCaptureRef = useRef(null);
  const [shareBusy, setShareBusy] = useState(false);

  const userName = layoutUser?.name || authUser?.displayName || "User";
  const userEmail = authUser?.email || profileEmailFallback(report) || "";

  const handleDownloadReport = async () => {
    if (!reportCaptureRef.current) return;
    try {
      setShareBusy(true);
      await downloadElementImage(reportCaptureRef.current, report, userName, userEmail);
    } catch (err) {
      console.error("Failed to download Eco-Report Card:", err);
      alert("Unable to create the report image. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleShareImage = async () => {
    if (!reportCaptureRef.current) return;
    try {
      setShareBusy(true);
      await shareElementImage(
        reportCaptureRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        alert("Unable to share the Eco-Report Card. Please try again.");
      }
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <Layout
      active="community"
      user={layoutUser}
      onNavigate={onNavigate}
    >
      <div style={styles.detailPage}>
        <div style={styles.detailTopRow} data-html2canvas-ignore="true">
          <button
            type="button"
            style={styles.backButton}
            onClick={() =>
              onNavigate?.("/community/reports")
            }
          >
            <ChevronLeft size={20} />
            <span>Back to Eco-Reports</span>
          </button>

          <div style={styles.actionGroup}>
            <button
              type="button"
              style={styles.btnOutline}
              onClick={handleShareImage}
              disabled={shareBusy}
            >
              <Share2 size={15} />
              {shareBusy ? "Preparing…" : "Share"}
            </button>

            <button
              type="button"
              style={styles.btnDark}
              onClick={handleDownloadReport}
            >
              <Download size={15} />
              Download Report
            </button>
          </div>
        </div>

        <div ref={reportCaptureRef} style={styles.reportCapture}>
        {/* HERO */}
        <div style={styles.hero}>
          <div style={styles.heroTop}>
            <div style={styles.heroInfo}>
              <div style={styles.heroTag}>ECO-REPORT CARD</div>

              <h1 style={styles.heroTitle}>
                {report.tripName || "Untitled Trip"}
              </h1>

              {getDateRangeFromReport(report) && (
                <div style={styles.heroSub}>
                  {getDateRangeFromReport(report)}
                </div>
              )}

              <div style={styles.heroSub}>
                Traveller: {layoutUser.name}
              </div>
            </div>

            <div style={styles.gradeContainer}>
              <div style={styles.heroGrade}>
                {report.grade || getGrade(report.ecoScore)}
              </div>
              <div style={styles.heroGradeLabel}>
                {report.gradeLabel ||
                  getGradeLabel(report.grade || getGrade(report.ecoScore))}
              </div>
            </div>
          </div>

          <div style={styles.heroStats}>
            <div style={styles.heroStatBox}>
              <div style={styles.heroStatValue}>
                {Number(report.ecoScore ?? 0)}
              </div>
              <div style={styles.heroStatLabel}>
                Eco Score
              </div>
            </div>

            <div style={styles.heroStatBox}>
              <div style={styles.heroStatValue}>
                {Number(report.carbonKg ?? 0).toFixed(1)}
              </div>
              <div style={styles.heroStatLabel}>
                kg CO₂
              </div>
            </div>

            <div style={styles.heroStatBox}>
              <div style={styles.heroStatValue}>
                {report.badgesEarned ?? 0}
              </div>
              <div style={styles.heroStatLabel}>
                Badges Earned
              </div>
            </div>
          </div>
        </div>

        {/* BREAKDOWN + CARBON */}
        <div style={styles.twoCol}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Leaf size={18} color="#22c55e" />
              <span style={styles.cardTitle}>
                Eco Score Breakdown
              </span>
            </div>

            {breakdown.length > 0 ? (
              breakdown.map((item) => {
                const value = Math.min(
                  Math.max(Number(item.value) || 0, 0),
                  100
                );

                return (
                  <div
                    key={item.label}
                    style={{ marginTop: 16 }}
                  >
                    <div style={styles.breakdownRow}>
                      <span style={styles.breakdownLabel}>
                        {item.label}
                      </span>
                      <span style={styles.breakdownValue}>
                        {value}/100
                      </span>
                    </div>

                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${value}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyData}>
                No Eco Score breakdown data available.
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <TrendingDown size={18} color="#1683ff" />
              <span style={styles.cardTitle}>
                Carbon Footprint
              </span>
            </div>

            {carbonSplit.length > 0 ? (
              <>
                <div style={styles.chartBox}>
                  <div
                    style={{
                      ...styles.cssPie,
                      background: buildPieGradient(carbonSplit),
                    }}
                    aria-label="Carbon footprint chart"
                  />
                </div>

                <div style={styles.legend}>
                  {carbonSplit.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      style={styles.legendRow}
                    >
                      <div style={styles.legendLeft}>
                        <span
                          style={{
                            ...styles.legendDot,
                            background:
                              item.color ||
                              FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span style={styles.legendValue}>
                        {Number(item.value || 0).toFixed(2)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={styles.emptyData}>
                No carbon breakdown data available.
              </div>
            )}
          </div>
        </div>

        {/* ENVIRONMENTAL IMPACT */}
        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.cardTitle}>
            Environmental Impact
          </div>

          {impact.length > 0 ? (
            <div style={styles.impactGrid}>
              {impact.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  style={styles.impactCard}
                >
                  <div style={styles.impactIcon}>
                    {item.icon || "🌱"}
                  </div>
                  <div style={styles.impactValue}>
                    {item.value}
                  </div>
                  <div style={styles.impactSub}>
                    {item.sub || ""}
                  </div>
                  <div style={styles.impactLabel}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyData}>
              No environmental impact data available.
            </div>
          )}
        </div>

        {/* RECENT ACHIEVEMENTS */}
        <div style={{ ...styles.card, marginTop: 20 }}>
          <div style={styles.achievementsHeader}>
            <span style={styles.cardTitle}>
              Recent Achievements
            </span>

            <button
              type="button"
              style={styles.viewMoreButton}
              onClick={() =>
                onNavigate?.("/community/achievements")
              }
            >
              View More
              <ChevronRight size={18} />
            </button>
          </div>

          {achievements.length > 0 ? (
            <div style={styles.achievementGrid}>
              {achievements.slice(0, 3).map((achievement, index) => (
                <div
                  key={`${achievement.title}-${index}`}
                  style={styles.achievementCard}
                >
                  <div style={styles.achievementIcon}>
                    {achievement.icon || "🏆"}
                  </div>
                  <div style={styles.achievementTitle}>
                    {achievement.title}
                  </div>
                  <div style={styles.achievementCategory}>
                    {achievement.category || "General"}
                  </div>
                  {achievement.dateEarned && (
                    <div style={styles.achievementDate}>
                      {achievement.dateEarned}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyAchievement}>
              No recent achievements for this trip yet.
            </div>
          )}
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: 20,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          <div style={styles.footerTitle}>
            🌱 Keep travelling sustainably!
          </div>
          <div style={styles.footerText}>
            Your Eco-Report Card is stored securely in your GreenTrip travel history.
          </div>
        </div>
        </div>

      </div>
    </Layout>
  );
}

// ============================================================
// DATA HELPERS
// ============================================================

const FALLBACK_CHART_COLORS = [
  "#2495e8",
  "#facc15",
  "#43a047",
  "#f97316",
];

function getBreakdown(report) {
  if (Array.isArray(report?.breakdown)) {
    return report.breakdown;
  }

  // Some report documents may store the values individually.
  const source = report?.ecoScoreBreakdown;
  if (source && typeof source === "object") {
    return Object.entries(source).map(([label, value]) => ({
      label,
      value,
    }));
  }

  return [];
}

function getCarbonSplit(report) {
  if (Array.isArray(report?.carbonSplit)) {
    return report.carbonSplit;
  }

  if (Array.isArray(report?.carbonBreakdown)) {
    return report.carbonBreakdown.map((item) => ({
      name: item.name || item.label,
      value: Number(item.value) || 0,
      color: item.color,
    }));
  }

  return [];
}

function getImpact(report) {
  if (Array.isArray(report?.impact)) {
    return report.impact;
  }

  if (Array.isArray(report?.environmentalImpact)) {
    return report.environmentalImpact;
  }

  return [];
}

function getAchievements(report) {
  if (Array.isArray(report?.achievements)) {
    return report.achievements;
  }

  if (Array.isArray(report?.recentAchievements)) {
    return report.recentAchievements;
  }

  return [];
}

function getGrade(score) {
  const value = Number(score) || 0;

  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B";
  if (value >= 60) return "C";
  return "D";
}

function getGradeLabel(grade) {
  if (grade === "A+") return "Outstanding";
  if (grade === "A") return "Excellent";
  if (grade === "B") return "Good";
  if (grade === "C") return "Fair";
  return "Needs Improvement";
}

function getGradeStyle(grade) {
  if (grade === "A+" || grade === "A") {
    return {
      background: "#dcfce7",
      color: "#15803d",
    };
  }

  if (grade === "B") {
    return {
      background: "#fef3c7",
      color: "#d97706",
    };
  }

  if (grade === "C") {
    return {
      background: "#ffedd5",
      color: "#ea580c",
    };
  }

  return {
    background: "#fee2e2",
    color: "#dc2626",
  };
}

function formatDateRange(start, end) {
  const format = (value) => {
    if (!value) return null;

    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    if (value instanceof Date) {
      return value.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    if (typeof value === "string") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }

    return null;
  };

  const first = format(start);
  const second = format(end);

  if (first && second && first !== second) {
    return `${first} - ${second}`;
  }

  return first || second || "";
}

function getDateRangeFromReport(report) {
  return (
    report?.dateRange ||
    formatDateRange(report?.startDate, report?.endDate)
  );
}

async function createReportImageBlob(element, report, userName, userEmail) {
  if (!element) {
    throw new Error("Report element is not available.");
  }

  // Wait until the report has fully painted before capturing it.
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

  const rect = element.getBoundingClientRect();
  const width = Math.max(360, Math.ceil(rect.width));

  // Clone only the report itself. Buttons marked with
  // data-html2canvas-ignore are removed from the generated image.
  const clone = element.cloneNode(true);

  clone
    .querySelectorAll("[data-html2canvas-ignore]")
    .forEach((node) => node.remove());

  // Add the user/app identity ONLY to the generated image.
  // It is not rendered permanently on the normal page.
  const identity = document.createElement("div");
  identity.style.cssText = `
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:24px;
    width:100%;
    padding:22px 26px;
    background:#ffffff;
    border:1px solid #e5e7eb;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
  `;

  identity.innerHTML = `
    <div style="min-width:0;flex:1">
      <div style="font-size:14px;font-weight:800;letter-spacing:.08em;color:#15803d">
        GREEN TRIP MALAYSIA
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:5px">
        Eco-Report Card generated for
      </div>
      <div style="font-size:18px;font-weight:800;color:#111827;margin-top:4px;word-break:break-word">
        ${escapeHtml(userName || "User")}
      </div>
    </div>
    <div style="font-size:13px;color:#64748b;text-align:right;word-break:break-word;max-width:42%">
      ${escapeHtml(userEmail || "Email not available")}
    </div>
  `;

  const wrapper = document.createElement("div");

  // Keep the capture target outside the visible viewport, but DO NOT use
  // display:none, visibility:hidden, opacity:0 or a huge negative z-index.
  // html2canvas cannot reliably capture those elements.
  wrapper.style.cssText = `
    position:absolute;
    left:-5000px;
    top:0;
    width:${width}px;
    background:#f3f4f6;
    box-sizing:border-box;
    overflow:visible;
    font-family:Arial, Helvetica, sans-serif;
  `;

  wrapper.appendChild(identity);
  wrapper.appendChild(clone);

  // Friendly invitation is part of the exported/shared image only.
  const invitation = document.createElement("div");
  invitation.style.cssText = `
    width:100%;
    box-sizing:border-box;
    padding:18px 24px;
    background:#ecfdf5;
    border:1px solid #bbf7d0;
    color:#166534;
    font-family:Arial, Helvetica, sans-serif;
    font-size:16px;
    font-weight:700;
    line-height:1.45;
    text-align:center;
  `;
  invitation.textContent =
    "🌱 Come join me on my sustainable journey with GreenTrip Malaysia!";

  wrapper.appendChild(invitation);
  document.body.appendChild(wrapper);

  try {
    // Give the browser one paint cycle for the cloned report.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#f3f4f6",
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 20000,
      removeContainer: true,
      scrollX: 0,
      scrollY: 0,
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight,
      windowWidth: Math.max(window.innerWidth, wrapper.scrollWidth),
      windowHeight: Math.max(window.innerHeight, wrapper.scrollHeight),
    });

    if (!canvas || !canvas.width || !canvas.height) {
      throw new Error("html2canvas returned an empty image.");
    }

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error("Could not create PNG image."));
          }
        },
        "image/png",
        1
      );
    });
  } finally {
    wrapper.remove();
  }
}

function makeReportFile(blob, report) {
  const filename = `${sanitizeFilename(
    report?.tripName || "eco-report"
  )}-eco-report.png`;

  return new File([blob], filename, {
    type: "image/png",
  });
}

async function downloadElementImage(element, report, userName, userEmail) {
  const blob = await createReportImageBlob(
    element,
    report,
    userName,
    userEmail
  );

  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(
      report?.tripName || "eco-report"
    )}-eco-report.png`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

async function shareElementImage(
  element,
  report,
  userName,
  userEmail
) {
  const blob = await createReportImageBlob(
    element,
    report,
    userName,
    userEmail
  );

  const file = makeReportFile(blob, report);

  // Use the operating system/browser native share sheet.
  // The generated PNG is the shared file itself.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    const fileShareSupported =
      typeof navigator.canShare !== "function" ||
      navigator.canShare({ files: [file] });

    if (fileShareSupported) {
      await navigator.share({
        title: `${report?.tripName || "GreenTrip"} - Eco-Report Card`,
        files: [file],
      });

      return { method: "native-share" };
    }
  }

  // Desktop fallback. Browsers do not allow a normal webpage to force
  // WhatsApp/Instagram/etc. to receive a local file. We still give the
  // user the actual image, not a report URL or text.
  let copiedImage = false;

  try {
    if (
      navigator.clipboard &&
      typeof window.ClipboardItem !== "undefined"
    ) {
      const item = new ClipboardItem({
        "image/png": blob,
      });

      await navigator.clipboard.write([item]);
      copiedImage = true;
    }
  } catch (error) {
    console.warn("Could not copy report image:", error);
  }

  await downloadElementImage(
    element,
    report,
    userName,
    userEmail
  );

  if (copiedImage) {
    alert(
      "The Eco-Report Card image was copied and downloaded. Your browser does not support the native image share sheet here. You can paste the actual image into WhatsApp, Instagram, Messenger or another app."
    );
  } else {
    alert(
      "The Eco-Report Card image was downloaded. Your browser does not support sharing image files directly from this page."
    );
  }

  return { method: "desktop-fallback" };
}

function sanitizeFilename(value) {
  return String(value || "eco-report")
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "eco-report";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPieGradient(items) {
  if (!items?.length) return "#e5e7eb";
  const total = items.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0);
  if (!total) return "#e5e7eb";
  let current = 0;
  const stops = items.map((item, index) => {
    const value = Math.max(Number(item.value) || 0, 0);
    const start = (current / total) * 100;
    current += value;
    const end = (current / total) * 100;
    const color = item.color || FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length];
    return `${color} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function profileEmailFallback(report) {
  return report?.userEmail || report?.email || "";
}




function LoadingPage({ text }) {
  return (
    <div style={styles.loadingPage}>
      <p style={styles.loadingText}>{text}</p>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  reportCapture: {
    background: "#f3f4f6",
    borderRadius: 16,
    overflow: "hidden",
  },
  reportIdentity: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    padding: "16px 20px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderBottom: "none",
  },
  identityApp: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#15803d",
  },
  identityLabel: { fontSize: 11.5, color: "#9ca3af", marginTop: 3 },
  identityName: { fontSize: 16, fontWeight: 800, color: "#111827", marginTop: 2 },
  identityEmail: { fontSize: 12.5, color: "#6b7280", textAlign: "right", wordBreak: "break-word" },
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "28px 34px 60px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginBottom: 28,
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "none",
    background: "transparent",
    color: "#374151",
    cursor: "pointer",
    fontSize: 15,
    padding: 0,
    width: "fit-content",
  },

  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: 15,
  },

  reportList: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
    maxWidth: 1140,
    margin: "0 auto",
  },

  reportCard: {
    background: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },

  topBar: {
    height: 7,
    background: "#22c55e",
  },

  cardBody: {
    padding: "26px 32px 24px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  cardInfo: {
    minWidth: 0,
    flex: 1,
  },

  reportTag: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.65,
    color: "#16a34a",
    marginBottom: 6,
  },

  tripName: {
    margin: 0,
    fontSize: 27,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2,
  },

  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    color: "#6b7280",
    fontSize: 15,
  },

  gradeCircle: {
    width: 80,
    height: 80,
    minWidth: 80,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 800,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginTop: 28,
  },

  statBox: {
    background: "#f8fafc",
    borderRadius: 14,
    padding: "20px 22px",
    minWidth: 0,
    minHeight: 76,
    boxSizing: "border-box",
  },

  statLabel: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: 8,
  },

  scoreValue: {
    fontSize: 27,
    fontWeight: 800,
    color: "#16a34a",
  },

  scoreMax: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: 500,
    marginLeft: 2,
  },

  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },

  statValueRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  statusPill: {
    display: "inline-flex",
    width: "fit-content",
    background: "#dcfce7",
    color: "#15803d",
    padding: "7px 13px",
    borderRadius: 999,
    fontSize: "13px",
    fontWeight: 700,
  },

  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 11,
    marginTop: 28,
  },

  btnPrimary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "#16a34a",
    color: "#fff",
    border: "2px solid #f59e0b",
    fontSize: 15,
    fontWeight: 700,
    padding: "12px 22px",
    borderRadius: 999,
    cursor: "pointer",
  },

  btnOutline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "#fff",
    color: "#374151",
    border: "1px solid #dbe1e8",
    fontSize: 14,
    fontWeight: 600,
    padding: "11px 20px",
    borderRadius: 999,
    cursor: "pointer",
  },

  btnDark: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "#111827",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 20px",
    borderRadius: 999,
    cursor: "pointer",
  },

  reportError: {
    marginTop: 20,
    width: "100%",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    boxSizing: "border-box",
  },

  centerMessage: {
    background: "#fff",
    padding: 55,
    textAlign: "center",
    borderRadius: 18,
    color: "#6b7280",
  },

  emptyState: {
    background: "#fff",
    padding: 60,
    textAlign: "center",
    borderRadius: 18,
  },

  emptyTitle: {
    color: "#111827",
    margin: "12px 0 6px",
  },

  emptyText: {
    color: "#9ca3af",
    margin: 0,
  },

  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },

  loadingText: {
    color: "#6b7280",
  },

  errorText: {
    color: "#dc2626",
    marginBottom: 16,
  },

  loginButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // ----------------------------------------------------------
  // DETAIL
  // ----------------------------------------------------------

  detailPage: {
    padding: "26px 34px 60px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  detailTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },

  actionGroup: {
    display: "flex",
    gap: 10,
  },

  hero: {
    borderRadius: 18,
    padding: 30,
    background:
      "linear-gradient(135deg, #a7f59b 0%, #4de8ae 52%, #11d9b2 100%)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
  },

  heroTag: {
    fontSize: 12,
    fontWeight: 800,
    color: "#3f9448",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#075c38",
    margin: "5px 0 7px",
  },

  heroSub: {
    fontSize: 14,
    color: "#147348",
    marginTop: 5,
  },

  gradeContainer: {
    textAlign: "center",
    minWidth: 105,
    paddingTop: 2,
  },

  heroGrade: {
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 800,
    color: "#075c38",
  },

  heroGradeLabel: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#147348",
    marginTop: 8,
  },

  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 22,
    marginTop: 24,
  },

  heroStatBox: {
    background: "rgba(255,255,255,0.42)",
    borderRadius: 12,
    padding: "15px 20px",
    textAlign: "center",
  },

  heroStatValue: {
    fontSize: 29,
    fontWeight: 800,
    color: "#075c38",
  },

  heroStatLabel: {
    fontSize: 13,
    color: "#147348",
    marginTop: 2,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginTop: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
    boxSizing: "border-box",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  cardTitle: {
    fontWeight: 700,
    fontSize: 16,
    color: "#111827",
  },

  breakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    marginBottom: 7,
  },

  breakdownLabel: {
    color: "#374151",
  },

  breakdownValue: {
    fontWeight: 700,
    color: "#111827",
  },

  progressTrack: {
    width: "100%",
    height: 7,
    background: "#d9dde1",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#111111",
    borderRadius: 999,
  },

  chartBox: {
    width: "100%",
    height: 190,
    marginTop: 5,
  },

  cssPie: {
    width: 150,
    height: 150,
    borderRadius: "50%",
    margin: "14px auto 10px",
    border: "6px solid #fff",
    boxSizing: "border-box",
    boxShadow: "0 0 0 1px #e5e7eb",
  },

  legend: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
    marginTop: 3,
  },

  legendRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13.5,
    color: "#374151",
  },

  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
  },

  legendValue: {
    fontWeight: 600,
    color: "#374151",
  },

  emptyData: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 18,
  },

  impactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginTop: 17,
  },

  impactCard: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: "17px 10px",
    textAlign: "center",
    minHeight: 135,
    boxSizing: "border-box",
  },

  impactIcon: {
    fontSize: 31,
    lineHeight: 1,
  },

  impactValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    marginTop: 8,
  },

  impactSub: {
    fontSize: 11.5,
    color: "#9ca3af",
    minHeight: 16,
  },

  impactLabel: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginTop: 6,
  },

  achievementsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  viewMoreButton: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    border: "none",
    background: "transparent",
    color: "#111827",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },

  achievementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginTop: 16,
  },

  achievementCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 13,
    padding: "17px 10px 14px",
    textAlign: "center",
    minHeight: 135,
    boxSizing: "border-box",
  },

  achievementIcon: {
    fontSize: 32,
    lineHeight: 1,
    marginBottom: 10,
  },

  achievementTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#111827",
  },

  achievementCategory: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 3,
  },

  achievementDate: {
    fontSize: 11.5,
    color: "#9ca3af",
    marginTop: 8,
  },

  emptyAchievement: {
    color: "#9ca3af",
    fontSize: 14,
    padding: "20px 0 5px",
    textAlign: "center",
  },

  footerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },

  footerText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
  },
};
