import { useEffect, useState } from "react";
import {
  Share2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Award,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";

import {
  getTravelHistory,
} from "../../../firebase/travelHistoryService";

import {
  getEcoReport,
  publishEcoReport,
} from "../../../firebase/ecoReportService";

import {
  useCurrentUser,
} from "../../../firebase/useCurrentUser";

import CompletedEcoReport from "../../AIRecommendation/components/CompletedEcoReport";
import {
  buildCompletedReportView,
  isModule2Report,
} from "../../AIRecommendation/services/report/completedReportView.js";
import {
  formatCarbonKg,
  formatCompletionDate,
  formatScore,
  visibilityLabel,
} from "../../AIRecommendation/services/report/reportDisplay.js";
import { PUBLISH_ERROR_MESSAGE } from "../../AIRecommendation/services/report/finishFlowState.js";
import "../../AIRecommendation/styles/aiRecommendation.css";

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
          const data = await getEcoReport(tripId);

          if (!mounted) return;
          setReport(isModule2Report(data) ? data : null);
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
                const data = await getEcoReport(trip.id);

                if (!isModule2Report(data)) {
                  return {
                    tripId: trip.id,
                    trip,
                    reportError:
                      "Report available after trip completion",
                  };
                }

                return {
                  ...data,
                  tripId: trip.id,
                  trip,
                };
              } catch {
                return {
                  tripId: trip.id,
                  trip,
                  reportError:
                    "Unable to load this Eco-Report Card.",
                };
              }
            })
        );

        if (!mounted) return;

        setReports(results);
        setReport(null);
      } catch {
        if (mounted) {
          setError("Unable to load Eco-Report Card.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
    // authUser?.uid, not authUser: if useCurrentUser returns a new
    // object reference per render, depending on the object itself
    // refetches the whole list (an N+1 of getEcoReport calls) on
    // every render.
    // Previously: }, [authUser, userLoading, tripId]);
  }, [authUser?.uid, userLoading, tripId]);

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
            Eco report not found. Report available after trip completion.
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

    // key={tripId} forces a remount when the trip changes.
    // FullEcoReport seeds state from props with useState, which
    // only reads its initial value once: without the key, moving
    // from ?id=A to ?id=B kept trip A's data on screen.
    return (
      <FullEcoReport
        key={tripId}
        report={report}
        tripId={tripId}
        layoutUser={layoutUser}
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
  onView,
}) {
  const trip = report.trip || {};
  const view = buildCompletedReportView(report, report.tripId);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [isPublic, setIsPublic] = useState(Boolean(view?.isPublic));
  const hasError = Boolean(report.reportError);
  const tripName =
    view?.title ||
    trip.name ||
    trip.title ||
    "Untitled Trip";

  async function handlePublish() {
    if (publishing || isPublic || !report.tripId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = await publishEcoReport(report.tripId);
      setIsPublic(updated?.visibility === "public" || updated?.alreadyPublic);
    } catch {
      setPublishError(PUBLISH_ERROR_MESSAGE);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={styles.reportCard}>
      <div style={styles.topBar} />

      <div style={styles.cardBody}>
        <div style={styles.listHeader}>
          <div style={styles.cardInfo}>
            <div style={styles.reportTag}>ECO-REPORT CARD</div>
            <h2 style={styles.tripName}>{tripName}</h2>
            {view ? (
              <div style={styles.dateRow}>
                <Calendar size={16} color="#9ca3af" />
                <span>{formatCompletionDate(view.completedAt)}</span>
              </div>
            ) : null}
          </div>
          {view ? (
            <span style={isPublic ? styles.statusPill : styles.privatePill}>
              {visibilityLabel(isPublic ? "public" : "private")}
            </span>
          ) : null}
        </div>

        {view ? (
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Final Trip Eco-Score</div>
              <div style={styles.scoreValue}>
                {formatScore(view.finalEcoScore)}
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Confirmed transportation carbon</div>
              <div style={styles.statValue}>
                {formatCarbonKg(view.confirmedTransportationCarbonKg)}
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Destinations</div>
              <div style={styles.statValue}>
                {view.reachedCount} reached, {view.skippedCount} skipped
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Visibility</div>
              <span style={isPublic ? styles.statusPill : styles.privatePill}>
                {visibilityLabel(isPublic ? "public" : "private")}
              </span>
            </div>
          </div>
        ) : null}

        {hasError ? (
          <div style={styles.reportError}>
            {report.reportError}
          </div>
        ) : (
          <div style={styles.actionsRow}>
            <button
              type="button"
              onClick={onView}
              style={styles.btnPrimary}
            >
              View Full Report
              <ChevronRight size={17} />
            </button>
            {isPublic ? (
              <span style={styles.statusPill}>
                Public - ready for Community Hub
              </span>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                style={styles.btnOutline}
                disabled={publishing}
              >
                <Share2 size={15} />
                {publishing ? "Sharing..." : "Share Eco Report to Community"}
              </button>
            )}
          </div>
        )}
        {publishError ? (
          <div style={styles.reportError} role="alert">
            {publishError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FullEcoReport({
  report,
  tripId,
  layoutUser,
  onNavigate,
}) {
  const reportView = buildCompletedReportView(report, tripId);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [reportState, setReportView] = useState(reportView);

  async function handlePublish() {
    if (publishing || reportState?.isPublic || !tripId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = await publishEcoReport(tripId);
      setReportView(
        buildCompletedReportView(
          { ...report, ...updated, visibility: "public" },
          tripId
        )
      );
    } catch {
      setPublishError(PUBLISH_ERROR_MESSAGE);
    } finally {
      setPublishing(false);
    }
  }

  if (!reportState) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.errorText}>
          Report available after trip completion
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
    <Layout
      active="community"
      user={layoutUser}
      onNavigate={onNavigate}
    >
      <div style={styles.detailPage}>
        <div style={styles.detailTopRow}>
          <button
            type="button"
            style={styles.backButton}
            onClick={() => onNavigate?.("/community/reports")}
          >
            <ChevronLeft size={20} />
            <span>Back to Eco-Reports</span>
          </button>
        </div>
        <CompletedEcoReport
          reportView={reportState}
          publishing={publishing}
          publishError={publishError}
          onPublish={handlePublish}
        />
      </div>
    </Layout>
  );
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
  // ==========================================================
  // NOTE: the commented-out keys below are unused here. They
  // belong to CompletedEcoReport, which now renders the detail
  // view. Kept for reference; uncomment before reusing.
  // ==========================================================

  // reportCapture: {
  // background: "#f3f4f6",
  // borderRadius: 16,
  // overflow: "hidden",
  // },
  // reportIdentity: {
  // display: "flex",
  // justifyContent: "space-between",
  // alignItems: "center",
  // gap: 20,
  // padding: "16px 20px",
  // background: "#ffffff",
  // border: "1px solid #e5e7eb",
  // borderBottom: "none",
  // },
  // identityApp: {
  // fontSize: 11,
  // fontWeight: 800,
  // letterSpacing: "0.08em",
  // color: "#15803d",
  // },
  // identityLabel: { fontSize: 11.5, color: "#9ca3af", marginTop: 3 },
  // identityName: { fontSize: 16, fontWeight: 800, color: "#111827", marginTop: 2 },
  // identityEmail: { fontSize: 12.5, color: "#6b7280", textAlign: "right", wordBreak: "break-word" },
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

  // gradeCircle: {
  // width: 80,
  // height: 80,
  // minWidth: 80,
  // borderRadius: "50%",
  // display: "flex",
  // alignItems: "center",
  // justifyContent: "center",
  // fontSize: 26,
  // fontWeight: 800,
  // },
  //
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

  // scoreMax: {
  // fontSize: 14,
  // color: "#9ca3af",
  // fontWeight: 500,
  // marginLeft: 2,
  // },
  //
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },

  // statValueRow: {
  // display: "flex",
  // alignItems: "center",
  // gap: 7,
  // },
  //
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

  privatePill: {
    display: "inline-flex",
    width: "fit-content",
    background: "#f3f4f6",
    color: "#374151",
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

  // btnDark: {
  // display: "flex",
  // alignItems: "center",
  // justifyContent: "center",
  // gap: 7,
  // background: "#111827",
  // color: "#fff",
  // border: "none",
  // fontSize: 14,
  // fontWeight: 600,
  // padding: "12px 20px",
  // borderRadius: 999,
  // cursor: "pointer",
  // },
  //
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

  // actionGroup: {
  // display: "flex",
  // gap: 10,
  // },
  //
  // hero: {
  // borderRadius: 18,
  // padding: 30,
  // background:
  // "linear-gradient(135deg, #a7f59b 0%, #4de8ae 52%, #11d9b2 100%)",
  // },
  //
  // heroTop: {
  // display: "flex",
  // justifyContent: "space-between",
  // alignItems: "flex-start",
  // gap: 24,
  // },
  //
  // heroInfo: {
  // flex: 1,
  // minWidth: 0,
  // },
  //
  // heroTag: {
  // fontSize: 12,
  // fontWeight: 800,
  // color: "#3f9448",
  // letterSpacing: 0.5,
  // },
  //
  // heroTitle: {
  // fontSize: 24,
  // fontWeight: 800,
  // color: "#075c38",
  // margin: "5px 0 7px",
  // },
  //
  // heroSub: {
  // fontSize: 14,
  // color: "#147348",
  // marginTop: 5,
  // },
  //
  // gradeContainer: {
  // textAlign: "center",
  // minWidth: 105,
  // paddingTop: 2,
  // },
  //
  // heroGrade: {
  // fontSize: 40,
  // lineHeight: 1,
  // fontWeight: 800,
  // color: "#075c38",
  // },
  //
  // heroGradeLabel: {
  // fontSize: 13.5,
  // fontWeight: 600,
  // color: "#147348",
  // marginTop: 8,
  // },
  //
  // heroStats: {
  // display: "grid",
  // gridTemplateColumns: "repeat(3, 1fr)",
  // gap: 22,
  // marginTop: 24,
  // },
  //
  // heroStatBox: {
  // background: "rgba(255,255,255,0.42)",
  // borderRadius: 12,
  // padding: "15px 20px",
  // textAlign: "center",
  // },
  //
  // heroStatValue: {
  // fontSize: 29,
  // fontWeight: 800,
  // color: "#075c38",
  // },
  //
  // heroStatLabel: {
  // fontSize: 13,
  // color: "#147348",
  // marginTop: 2,
  // },
  //
  // twoCol: {
  // display: "grid",
  // gridTemplateColumns: "1fr 1fr",
  // gap: 18,
  // marginTop: 20,
  // },
  //
  // card: {
  // background: "#fff",
  // border: "1px solid #e5e7eb",
  // borderRadius: 14,
  // padding: 20,
  // boxSizing: "border-box",
  // },
  //
  // cardHeader: {
  // display: "flex",
  // alignItems: "center",
  // gap: 8,
  // },
  //
  // cardTitle: {
  // fontWeight: 700,
  // fontSize: 16,
  // color: "#111827",
  // },
  //
  // breakdownRow: {
  // display: "flex",
  // justifyContent: "space-between",
  // fontSize: 14,
  // marginBottom: 7,
  // },
  //
  // breakdownLabel: {
  // color: "#374151",
  // },
  //
  // breakdownValue: {
  // fontWeight: 700,
  // color: "#111827",
  // },
  //
  // progressTrack: {
  // width: "100%",
  // height: 7,
  // background: "#d9dde1",
  // borderRadius: 999,
  // overflow: "hidden",
  // },
  //
  // progressFill: {
  // height: "100%",
  // background: "#111111",
  // borderRadius: 999,
  // },
  //
  // chartBox: {
  // width: "100%",
  // height: 190,
  // marginTop: 5,
  // },
  //
  // cssPie: {
  // width: 150,
  // height: 150,
  // borderRadius: "50%",
  // margin: "14px auto 10px",
  // border: "6px solid #fff",
  // boxSizing: "border-box",
  // boxShadow: "0 0 0 1px #e5e7eb",
  // },
  //
  // legend: {
  // display: "flex",
  // flexDirection: "column",
  // gap: 11,
  // marginTop: 3,
  // },
  //
  // legendRow: {
  // display: "flex",
  // justifyContent: "space-between",
  // alignItems: "center",
  // fontSize: 13.5,
  // color: "#374151",
  // },
  //
  // legendLeft: {
  // display: "flex",
  // alignItems: "center",
  // gap: 9,
  // },
  //
  // legendDot: {
  // width: 12,
  // height: 12,
  // borderRadius: "50%",
  // flexShrink: 0,
  // },
  //
  // legendValue: {
  // fontWeight: 600,
  // color: "#374151",
  // },
  //
  // emptyData: {
  // color: "#9ca3af",
  // fontSize: 14,
  // marginTop: 18,
  // },
  //
  // impactGrid: {
  // display: "grid",
  // gridTemplateColumns: "repeat(4, 1fr)",
  // gap: 14,
  // marginTop: 17,
  // },
  //
  // impactCard: {
  // background: "#f8fafc",
  // borderRadius: 12,
  // padding: "17px 10px",
  // textAlign: "center",
  // minHeight: 135,
  // boxSizing: "border-box",
  // },
  //
  // impactIcon: {
  // fontSize: 31,
  // lineHeight: 1,
  // },
  //
  // impactValue: {
  // fontSize: 24,
  // fontWeight: 800,
  // color: "#111827",
  // marginTop: 8,
  // },
  //
  // impactSub: {
  // fontSize: 11.5,
  // color: "#9ca3af",
  // minHeight: 16,
  // },
  //
  // impactLabel: {
  // fontSize: 12.5,
  // fontWeight: 600,
  // color: "#374151",
  // marginTop: 6,
  // },
  //
  // achievementsHeader: {
  // display: "flex",
  // alignItems: "center",
  // justifyContent: "space-between",
  // gap: 12,
  // },
  //
  // viewMoreButton: {
  // display: "flex",
  // alignItems: "center",
  // gap: 3,
  // border: "none",
  // background: "transparent",
  // color: "#111827",
  // fontSize: 13.5,
  // fontWeight: 600,
  // cursor: "pointer",
  // padding: 0,
  // },
  //
  // achievementGrid: {
  // display: "grid",
  // gridTemplateColumns: "repeat(3, 1fr)",
  // gap: 16,
  // marginTop: 16,
  // },
  //
  // achievementCard: {
  // border: "1px solid #e5e7eb",
  // borderRadius: 13,
  // padding: "17px 10px 14px",
  // textAlign: "center",
  // minHeight: 135,
  // boxSizing: "border-box",
  // },
  //
  // achievementIcon: {
  // fontSize: 32,
  // lineHeight: 1,
  // marginBottom: 10,
  // },
  //
  // achievementTitle: {
  // fontSize: 13.5,
  // fontWeight: 700,
  // color: "#111827",
  // },
  //
  // achievementCategory: {
  // fontSize: 12,
  // color: "#9ca3af",
  // marginTop: 3,
  // },
  //
  // achievementDate: {
  // fontSize: 11.5,
  // color: "#9ca3af",
  // marginTop: 8,
  // },
  //
  // emptyAchievement: {
  // color: "#9ca3af",
  // fontSize: 14,
  // padding: "20px 0 5px",
  // textAlign: "center",
  // },
  //
  // footerTitle: {
  // fontSize: 18,
  // fontWeight: 700,
  // color: "#111827",
  // },
  //
  // footerText: {
  // marginTop: 6,
  // fontSize: 14,
  // color: "#6b7280",
  // },
};
