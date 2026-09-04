import React, {
  useEffect,
  useState,
} from "react";

import {
  Share2,
  Download,
  TrendingDown,
  Leaf,
  ChevronRight,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import Layout from "../../../shared/components/Layout";

import AchievementCard from "../../../shared/components/AchievementCard";

import {
  getOrCreateEcoReport,
} from "../../../firebase/ecoReportService";

import {
  useCurrentUser,
} from "../../../firebase/useCurrentUser";


// ============================================================
// ECO REPORT CARD
// ============================================================

export default function EcoReportCard({
  onNavigate,
  tripId,
}) {

  const {
    authUser,
    profile,
    loading: userLoading,
  } = useCurrentUser();


  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ==========================================================
  // LOAD REPORT
  // ==========================================================

  useEffect(() => {

    async function loadReport() {

      if (
        userLoading ||
        !authUser ||
        !tripId
      ) {
        return;
      }

      try {

        setLoading(true);

        setError("");

        const data =
          await getOrCreateEcoReport(
            tripId
          );

        setReport(data);

      } catch (err) {

        console.error(
          "Failed to load Eco Report:",
          err
        );

        setError(
          err.message ||
          "Unable to load Eco-Report Card."
        );

      } finally {

        setLoading(false);
      }
    }

    loadReport();

  }, [
    userLoading,
    authUser,
    tripId,
  ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    userLoading ||
    loading
  ) {

    return (
      <div style={styles.loadingPage}>

        <p style={styles.loadingText}>
          Loading Eco-Report Card...
        </p>

      </div>
    );
  }


  // ==========================================================
  // NOT LOGGED IN
  // ==========================================================

  if (!authUser) {

    return (
      <div style={styles.loadingPage}>

        <p style={styles.errorText}>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/login")
          }
          style={styles.loginButton}
        >
          Go to Login
        </button>

      </div>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (
      <div style={styles.loadingPage}>

        <p style={styles.errorText}>
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/community/history")
          }
          style={styles.loginButton}
        >
          Back to Travel History
        </button>

      </div>
    );
  }


  // ==========================================================
  // NO REPORT
  // ==========================================================

  if (!report) {

    return (
      <div style={styles.loadingPage}>

        <p style={styles.errorText}>
          Eco report not found.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/community/history")
          }
          style={styles.loginButton}
        >
          Back to Travel History
        </button>

      </div>
    );
  }


  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  function handleDownload() {

    const text = `
GREEN TRIP MALAYSIA
ECO-REPORT CARD

Trip:
${report.tripName}

Location:
${report.location || "N/A"}

Eco Score:
${report.ecoScore}/100

Grade:
${report.grade}

Status:
${report.status}

Carbon Footprint:
${report.carbonKg} kg CO₂

Badges Earned:
${report.badgesEarned}

Thank you for travelling sustainably!
    `.trim();


    const blob =
      new Blob(
        [text],
        {
          type: "text/plain",
        }
      );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      `${report.tripName || "eco-report"}-eco-report.txt`;


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }


  // ==========================================================
  // SHARE
  // ==========================================================

  async function handleShare() {

    const shareText =
      `${report.tripName} - ` +
      `Eco Score ${report.ecoScore}/100 ` +
      `(${report.grade}), ` +
      `${report.carbonKg} kg CO₂`;


    try {

      if (
        navigator.share
      ) {

        await navigator.share({
          title:
            "Eco-Report Card",
          text:
            shareText,
        });

      } else {

        await navigator.clipboard.writeText(
          shareText
        );

        alert(
          "Eco-Report Card information copied!"
        );
      }

    } catch (err) {

      console.log(
        "Share cancelled."
      );
    }
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
  // REPORT
  // ==========================================================

  return (

    <Layout
      active="community"
      user={layoutUser}
      onNavigate={onNavigate}
    >

      <div style={styles.content}>

        {/* ==================================================
            TOP BAR
        =================================================== */}

        <div style={styles.topRow}>

          <button
            style={styles.backLink}
            onClick={() =>
              onNavigate?.(
                "/community/history"
              )
            }
          >

            ‹ Back to History

          </button>


          <div style={styles.actionGroup}>

            <button
              style={styles.btnOutline}
              onClick={handleShare}
            >

              <Share2 size={15} />

              Share

            </button>


            <button
              style={styles.btnDark}
              onClick={handleDownload}
            >

              <Download size={15} />

              Download Report

            </button>

          </div>

        </div>


        {/* ==================================================
            HERO
        =================================================== */}

        <div style={styles.hero}>

          <div style={styles.heroTop}>

            <div>

              <div style={styles.heroTag}>
                ECO-REPORT CARD
              </div>


              <h1 style={styles.heroTitle}>
                {report.tripName}
              </h1>


              {report.location && (

                <div style={styles.heroSub}>
                  📍 {report.location}
                </div>

              )}


              <div style={styles.heroSub}>
                Traveller:{" "}
                {layoutUser.name}
              </div>

            </div>


            <div style={styles.gradeContainer}>

              <div style={styles.heroGrade}>
                {report.grade}
              </div>

              <div style={styles.heroGradeLabel}>
                {report.gradeLabel}
              </div>

            </div>

          </div>


          {/* ==================================================
              MAIN STATS
          =================================================== */}

          <div style={styles.heroStats}>

            <div style={styles.heroStatBox}>

              <div style={styles.heroStatValue}>
                {report.ecoScore}
              </div>

              <div style={styles.heroStatLabel}>
                Eco Score
              </div>

            </div>


            <div style={styles.heroStatBox}>

              <div style={styles.heroStatValue}>
                {Number(
                  report.carbonKg || 0
                ).toFixed(1)}
              </div>

              <div style={styles.heroStatLabel}>
                kg CO₂
              </div>

            </div>


            <div style={styles.heroStatBox}>

              <div style={styles.heroStatValue}>
                {report.badgesEarned}
              </div>

              <div style={styles.heroStatLabel}>
                Badges Earned
              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            BREAKDOWN + CARBON
        =================================================== */}

        <div style={styles.twoCol}>


          {/* ECO BREAKDOWN */}

          <div style={styles.card}>

            <div style={styles.cardHeader}>

              <Leaf
                size={18}
                color="#22c55e"
              />

              <span style={styles.cardTitle}>
                Eco Score Breakdown
              </span>

            </div>


            {(report.breakdown || []).map(
              (item) => {

                const value =
                  Math.min(
                    Math.max(
                      Number(
                        item.value
                      ) || 0,
                      0
                    ),
                    100
                  );

                return (

                  <div
                    key={item.label}
                    style={{
                      marginTop: 16,
                    }}
                  >

                    <div
                      style={
                        styles.breakdownRow
                      }
                    >

                      <span
                        style={
                          styles.breakdownLabel
                        }
                      >
                        {item.label}
                      </span>

                      <span
                        style={
                          styles.breakdownValue
                        }
                      >
                        {value}/100
                      </span>

                    </div>


                    <div
                      style={
                        styles.progressTrack
                      }
                    >

                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${value}%`,
                        }}
                      />

                    </div>

                  </div>

                );
              }
            )}

          </div>


          {/* CARBON */}

          <div style={styles.card}>

            <div style={styles.cardHeader}>

              <TrendingDown
                size={18}
                color="#3b82f6"
              />

              <span style={styles.cardTitle}>
                Carbon Footprint
              </span>

            </div>


            {report.carbonSplit?.length > 0 ? (

              <>
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    marginTop: 8,
                  }}
                >

                  <ResponsiveContainer>

                    <PieChart>

                      <Pie
                        data={
                          report.carbonSplit
                        }
                        dataKey="value"
                        innerRadius={0}
                        outerRadius={80}
                      >

                        {report.carbonSplit.map(
                          (item, index) => (

                            <Cell
                              key={
                                item.name ||
                                index
                              }
                              fill={
                                item.color ||
                                [
                                  "#3b82f6",
                                  "#facc15",
                                  "#22c55e",
                                  "#f97316",
                                ][index % 4]
                              }
                            />

                          )
                        )}

                      </Pie>

                    </PieChart>

                  </ResponsiveContainer>

                </div>


                <div
                  style={styles.legend}
                >

                  {report.carbonSplit.map(
                    (item, index) => (

                      <div
                        key={
                          item.name ||
                          index
                        }
                        style={
                          styles.legendRow
                        }
                      >

                        <div
                          style={
                            styles.legendLeft
                          }
                        >

                          <span
                            style={{
                              ...styles.legendDot,
                              background:
                                item.color ||
                                [
                                  "#3b82f6",
                                  "#facc15",
                                  "#22c55e",
                                  "#f97316",
                                ][index % 4],
                            }}
                          />

                          <span>
                            {item.name}
                          </span>

                        </div>


                        <span
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {item.value} kg
                        </span>

                      </div>

                    )
                  )}

                </div>
              </>

            ) : (

              <div
                style={
                  styles.emptyData
                }
              >
                No carbon breakdown data
                available for this trip.
              </div>

            )}

          </div>

        </div>


        {/* ==================================================
            ENVIRONMENTAL IMPACT
        =================================================== */}

        <div
          style={{
            ...styles.card,
            marginTop: 20,
          }}
        >

          <div style={styles.cardTitle}>
            Environmental Impact
          </div>


          {report.impact?.length > 0 ? (

            <div style={styles.impactGrid}>

              {report.impact.map(
                (item) => (

                  <div
                    key={item.label}
                    style={
                      styles.impactCard
                    }
                  >

                    <div
                      style={{
                        fontSize: 30,
                      }}
                    >
                      {item.icon}
                    </div>


                    <div
                      style={
                        styles.impactValue
                      }
                    >
                      {item.value}
                    </div>


                    <div
                      style={
                        styles.impactSub
                      }
                    >
                      {item.sub}
                    </div>


                    <div
                      style={
                        styles.impactLabel
                      }
                    >
                      {item.label}
                    </div>

                  </div>

                )
              )}

            </div>

          ) : (

            <div
              style={{
                marginTop: 16,
                color: "#9ca3af",
              }}
            >
              No environmental impact
              data available.
            </div>

          )}

        </div>


        {/* ==================================================
            FOOTER
        =================================================== */}

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
            Your Eco-Report Card is stored
            securely in your GreenTrip
            travel history.
          </div>

        </div>

      </div>

    </Layout>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = {

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

  content: {
    padding: "28px 32px",
    maxWidth: 1000,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  backLink: {
    background: "none",
    border: "none",
    color: "#111827",
    fontWeight: 500,
    fontSize: 15,
    cursor: "pointer",
    padding: 0,
  },

  actionGroup: {
    display: "flex",
    gap: 10,
  },

  btnOutline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  btnDark: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  hero: {
    marginTop: 20,
    borderRadius: 18,
    padding: 28,
    background:
      "linear-gradient(135deg, #86efac 0%, #34d399 100%)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  heroTag: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#065f46",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "#064e3b",
    margin: "4px 0",
  },

  heroSub: {
    fontSize: 14,
    color: "#065f46",
    marginTop: 4,
  },

  gradeContainer: {
    textAlign: "center",
    minWidth: 100,
  },

  heroGrade: {
    fontSize: 42,
    fontWeight: 800,
    color: "#064e3b",
  },

  heroGradeLabel: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#065f46",
  },

  heroStats: {
    display: "flex",
    gap: 16,
    marginTop: 24,
  },

  heroStatBox: {
    background:
      "rgba(255,255,255,0.35)",
    borderRadius: 12,
    padding: "16px 24px",
    flex: 1,
    textAlign: "center",
  },

  heroStatValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#064e3b",
  },

  heroStatLabel: {
    fontSize: 13,
    color: "#065f46",
    marginTop: 2,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
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
    marginBottom: 6,
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
    height: 6,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 999,
  },

  legend: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },

  legendRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
  },

  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },

  emptyData: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 20,
  },

  impactGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: 16,
    marginTop: 16,
  },

  impactCard: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
  },

  impactValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    marginTop: 8,
  },

  impactSub: {
    fontSize: 12.5,
    color: "#9ca3af",
  },

  impactLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginTop: 6,
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