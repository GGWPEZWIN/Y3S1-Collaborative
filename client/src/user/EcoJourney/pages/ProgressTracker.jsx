import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Utensils,
  Droplet,
  Recycle,
  Trash2,
  Car,
  Activity,
  BedDouble,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Tooltip,
} from "recharts";

import { getTravelHistory } from "../../../firebase/travelHistoryService";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { getTripWasteImpact } from "../../../firebase/wasteImpactService";

/* ============================================================
   HELPERS
============================================================ */

function getDateValue(value) {
  if (!value) return 0;

  if (value?.toDate) {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatMonth(value) {
  if (!value) return "";

  let date;

  if (value?.toDate) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function calculateGrade(score) {
  const numericScore = Number(score) || 0;

  if (numericScore >= 90) return "A+";
  if (numericScore >= 80) return "A";
  if (numericScore >= 70) return "B";
  if (numericScore >= 60) return "C";

  return "D";
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ");
}

function isCompletedTrip(trip) {
  const status = normalizeStatus(trip.status);

  return (
    status === "completed" ||
    status === "complete" ||
    status === "finished" ||
    trip.completed === true ||
    trip.isCompleted === true
  );
}

/* ============================================================
   TRIP GRADE CARD
============================================================ */

function TripGradeCard({ trip }) {
  const grade = trip.grade || calculateGrade(trip.ecoScore);

  const gradeStyles = {
    "A+": {
      bg: "#dcfce7",
      text: "#15803d",
    },
    A: {
      bg: "#dcfce7",
      text: "#16a34a",
    },
    B: {
      bg: "#fef3c7",
      text: "#b45309",
    },
    C: {
      bg: "#ffedd5",
      text: "#c2410c",
    },
    D: {
      bg: "#fee2e2",
      text: "#b91c1c",
    },
  };

  const gradeStyle = gradeStyles[grade] || gradeStyles.D;

  return (
    <div style={styles.tripCard}>
      <div style={styles.tripHeadRow}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.tripName}>
            {trip.name || trip.title || "Untitled Trip"}
          </div>

          <div style={styles.tripMonth}>
            {formatMonth(trip.startDate)}
          </div>
        </div>

        <div
          style={{
            ...styles.gradeCircle,
            background: gradeStyle.bg,
            color: gradeStyle.text,
          }}
        >
          {grade}
        </div>
      </div>

      <div style={styles.tripStatsRow}>
        <div>
          <div style={styles.tripStatLabel}>Eco Score</div>

          <div style={styles.tripStatValueGreen}>
            {Number(trip.ecoScore || 0)}
          </div>
        </div>

        <div>
          <div style={styles.tripStatLabel}>Carbon</div>

          <div style={styles.tripStatValue}>
            {Number(trip.carbonKg || 0).toFixed(1)} kg
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CUSTOM TOOLTIP
============================================================ */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipTitle}>{label}</div>

      {payload.map((item, index) => (
        <div key={index} style={styles.tooltipRow}>
          <span>{item.name}</span>
          <strong>
            {item.value}
            {item.dataKey === "carbon" ? " kg" : ""}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   SUSTAINABILITY BREAKDOWN
============================================================ */

function SustainabilityBreakdown({ trips, uid }) {
  const [impact, setImpact] = useState({
    foodWasteG: 0,
    waterL: 0,
    plasticItems: 0,
    disposables: 0,
    logCount: 0,
  });
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadImpact() {
      if (!uid || !trips.length) {
        if (mounted) {
          setImpact({
            foodWasteG: 0,
            waterL: 0,
            plasticItems: 0,
            disposables: 0,
            logCount: 0,
          });
          setImpactError("");
        }
        return;
      }

      try {
        setImpactLoading(true);
        setImpactError("");

        const results = await Promise.all(
          trips
            .filter((trip) => trip?.id)
            .map(async (trip) => {
              try {
                return await getTripWasteImpact(uid, trip.id);
              } catch (err) {
                console.error(
                  `Failed to load waste impact for trip ${trip.id}:`,
                  err
                );
                return null;
              }
            })
        );

        if (!mounted) return;

        const totals = results.filter(Boolean).reduce(
          (sum, item) => ({
            foodWasteG:
              sum.foodWasteG + Number(item.foodWasteG || 0),

            waterL:
              sum.waterL + Number(item.waterL || 0),

            plasticItems:
              sum.plasticItems + Number(item.plasticItems || 0),

            disposables:
              sum.disposables +
              Number(
                item.disposables ??
                  item.disposableItems ??
                  0
              ),

            logCount:
              sum.logCount + Number(item.logCount || 0),
          }),
          {
            foodWasteG: 0,
            waterL: 0,
            plasticItems: 0,
            disposables: 0,
            logCount: 0,
          }
        );

        setImpact(totals);
      } catch (err) {
        console.error(
          "Failed to load sustainability breakdown:",
          err
        );

        if (mounted) {
          setImpactError(
            err?.message ||
              "Unable to load detailed impact data."
          );
        }
      } finally {
        if (mounted) {
          setImpactLoading(false);
        }
      }
    }

    loadImpact();

    return () => {
      mounted = false;
    };
  }, [uid, trips]);

  const totalCarbonKg = trips.reduce(
    (sum, trip) =>
      sum + Number(trip?.carbonKg || 0),
    0
  );

  const cards = [
    {
      key: "transport",
      icon: Car,
      label: "Transport",
      value: `${totalCarbonKg.toFixed(1)} kg`,
      sub: "CO₂ footprint",
    },
    {
      key: "food",
      icon: Utensils,
      label: "Food Waste",
      value: `${impact.foodWasteG.toFixed(0)} g`,
      sub: "recorded waste",
    },
    {
      key: "plastic",
      icon: Recycle,
      label: "Plastic",
      value: `${impact.plasticItems.toFixed(0)}`,
      sub: "items",
    },
    {
      key: "water",
      icon: Droplet,
      label: "Water",
      value: `${impact.waterL.toFixed(1)} L`,
      sub: "recorded usage",
    },
    {
      key: "disposables",
      icon: Trash2,
      label: "Disposables",
      value: `${impact.disposables.toFixed(0)}`,
      sub: "items",
    },
    {
      key: "activities",
      icon: Activity,
      label: "Activities",
      value: "—",
      sub: "not recorded",
    },
    {
      key: "lodging",
      icon: BedDouble,
      label: "Lodging",
      value: "—",
      sub: "not recorded",
    },
  ];

  return (
    <div
      style={{
        ...styles.card,
        marginTop: 20,
      }}
    >
      <div style={styles.cardTitle}>
        Sustainability Breakdown
      </div>

      <div style={styles.breakdownIntro}>
        <span>
          Detailed impact from your latest{" "}
          {trips.length} completed{" "}
          {trips.length === 1 ? "trip" : "trips"}.
        </span>

        {impactLoading ? (
          <span style={styles.breakdownStatus}>
            Loading waste data...
          </span>
        ) : impact.logCount > 0 ? (
          <span style={styles.breakdownStatus}>
            {impact.logCount} waste{" "}
            {impact.logCount === 1 ? "log" : "logs"} recorded
          </span>
        ) : null}
      </div>

      {impactError ? (
        <div style={styles.breakdownError}>
          {impactError}
        </div>
      ) : null}

      <div style={styles.impactGrid}>
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              style={styles.impactCard}
            >
              <div style={styles.impactIcon}>
                <Icon size={23} strokeWidth={2} />
              </div>

              <div style={styles.impactLabel}>
                {item.label}
              </div>

              <div style={styles.impactValue}>
                {item.value}
              </div>

              <div style={styles.impactSub}>
                {item.sub}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.breakdownNote}>
        Food Waste, Plastic, Water and Disposables come from
        the Waste & Resource logs linked to these trips.
        Activities and Lodging are shown as unavailable because
        those impact values are not currently stored in the
        progress-tracker data source.
      </div>
    </div>
  );
}

/* ============================================================
   PROGRESS TRACKER
============================================================ */

export default function ProgressTracker({ onBack }) {
  const { authUser } = useCurrentUser();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ----------------------------------------------------------
     LOAD REAL FIRESTORE DATA
  ---------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadProgressData() {
      try {
        setLoading(true);
        setError("");

        const history = await getTravelHistory({
          status: "All Trips",
          sortBy: "Newest First",
          queryText: "",
        });

        if (!mounted) return;

        /*
         * Keep completed trips only.
         *
         * We filter here instead of using:
         * status: "Completed"
         *
         * because this also supports older records using
         * "Complete" or "Finished".
         */
        const completedTrips = (history || [])
          .filter(isCompletedTrip)
          .sort(
            (a, b) =>
              getDateValue(b.startDate) -
              getDateValue(a.startDate)
          );

        /*
         * Latest 4 completed trips.
         */
        setTrips(completedTrips.slice(0, 4));
      } catch (err) {
        console.error("Failed to load progress tracker:", err);

        if (mounted) {
          setError(
            err?.message ||
              "Unable to load your travel progress."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProgressData();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CHART DATA
  ========================================================== */

  const ecoTrend = useMemo(() => {
    /*
     * Reverse the latest-four list so the chart runs
     * from older -> newer.
     */
    return [...trips]
      .reverse()
      .map((trip) => ({
        name:
          trip.name ||
          trip.title ||
          "Untitled Trip",

        score: Number(trip.ecoScore || 0),
      }));
  }, [trips]);

  const carbonData = useMemo(() => {
    return [...trips]
      .reverse()
      .map((trip) => ({
        name:
          trip.name ||
          trip.title ||
          "Untitled Trip",

        carbon: Number(trip.carbonKg || 0),
      }));
  }, [trips]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div style={styles.content}>
      <h1 style={styles.pageTitle}>
        Progress Tracker
      </h1>

      <p style={styles.pageSubtitle}>
        Track your sustainability performance over time
      </p>

      <button
        type="button"
        onClick={onBack}
        style={styles.backBtn}
      >
        <ChevronLeft size={16} />
        Back
      </button>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (
        <div style={styles.loadingState}>
          <Loader2
            size={22}
            style={{
              animation: "spin 1s linear infinite",
            }}
          />

          <span>
            Loading your travel progress...
          </span>
        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {!loading && error && (
        <div style={styles.errorState}>
          <div style={styles.errorTitle}>
            Unable to load progress
          </div>

          <div style={styles.errorText}>
            {error}
          </div>
        </div>
      )}

      {/* ======================================================
          NO COMPLETED TRIPS
      ====================================================== */}

      {!loading &&
        !error &&
        trips.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>
              No completed trips yet
            </div>

            <div style={styles.emptyText}>
              Complete your first GreenTrip journey to see
              your Eco Score and carbon footprint progress
              here.
            </div>
          </div>
        )}

      {/* ======================================================
          REAL DATA CONTENT
      ====================================================== */}

      {!loading &&
        !error &&
        trips.length > 0 && (
          <>
            {/* ------------------------------------------------
                ECO SCORE CHART
            ------------------------------------------------ */}

            <div style={styles.card}>
              <div style={styles.cardTitle}>
                Eco Score Across Trips
              </div>

              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={ecoTrend}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 10,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="ecoScoreFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22c55e"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="100%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="#f3f4f6"
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{
                        stroke: "#e5e7eb",
                      }}
                      tick={{
                        fontSize: 11,
                        fill: "#9ca3af",
                      }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#9ca3af",
                      }}
                    />

                    <Tooltip
                      content={<ChartTooltip />}
                    />

                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Eco Score"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      fill="url(#ecoScoreFill)"
                      dot={{
                        r: 5,
                        fill: "#22c55e",
                        strokeWidth: 0,
                      }}
                      activeDot={{
                        r: 7,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ------------------------------------------------
                CARBON CHART
            ------------------------------------------------ */}

            <div
              style={{
                ...styles.card,
                marginTop: 20,
              }}
            >
              <div style={styles.cardTitle}>
                Carbon Footprint per Trip (kg CO₂)
              </div>

              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={carbonData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#f3f4f6"
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{
                        stroke: "#e5e7eb",
                      }}
                      tick={{
                        fontSize: 11,
                        fill: "#9ca3af",
                      }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#9ca3af",
                      }}
                    />

                    <Tooltip
                      content={<ChartTooltip />}
                    />

                    <Bar
                      dataKey="carbon"
                      name="Carbon"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ------------------------------------------------
                SUSTAINABILITY BREAKDOWN
            ------------------------------------------------ */}

            <SustainabilityBreakdown
              trips={trips}
              uid={authUser?.uid || null}
            />

            {/* ------------------------------------------------
                RECENT 4 TRIPS
            ------------------------------------------------ */}

            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionTitle}>
                  Recent Completed Trips
                </div>

                <div style={styles.sectionSubtitle}>
                  Showing your latest {trips.length} completed{" "}
                  {trips.length === 1 ? "trip" : "trips"}
                </div>
              </div>
            </div>

            <div style={styles.tripGrid}>
              {trips.map((trip) => (
                <TripGradeCard
                  key={trip.id}
                  trip={trip}
                />
              ))}
            </div>
          </>
        )}
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = {
  content: {
    padding: "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    textAlign: "left",
    boxSizing: "border-box",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    color: "#111827",
  },

  pageSubtitle: {
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14.5,
  },

  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 0",
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxSizing: "border-box",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },

  breakdownIntro: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
    color: "#6b7280",
    fontSize: 13.5,
  },

  breakdownStatus: {
    color: "#16a34a",
    fontWeight: 600,
  },

  breakdownError: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 13,
  },

  impactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginTop: 18,
  },

  impactCard: {
    background: "#f8fafc",
    border: "1px solid #eef2f7",
    borderRadius: 14,
    padding: "17px 12px",
    minHeight: 128,
    boxSizing: "border-box",
    textAlign: "center",
  },

  impactIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#16a34a",
    marginBottom: 8,
  },

  impactLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  },

  impactValue: {
    fontSize: 21,
    fontWeight: 800,
    color: "#111827",
    marginTop: 7,
  },

  impactSub: {
    fontSize: 11.5,
    color: "#9ca3af",
    marginTop: 4,
  },

  breakdownNote: {
    marginTop: 15,
    paddingTop: 13,
    borderTop: "1px solid #eef2f7",
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 1.55,
  },

  chartWrapper: {
    width: "100%",
    height: 250,
    marginTop: 12,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
  },

  sectionSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },

  tripGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    paddingBottom: 32,
  },

  tripCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    boxSizing: "border-box",
  },

  tripHeadRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  tripName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    wordBreak: "break-word",
  },

  tripMonth: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },

  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14.5,
    flexShrink: 0,
  },

  tripStatsRow: {
    display: "flex",
    gap: 48,
    marginTop: 20,
  },

  tripStatLabel: {
    fontSize: 12.5,
    color: "#9ca3af",
    marginBottom: 4,
  },

  tripStatValueGreen: {
    fontSize: 17,
    fontWeight: 700,
    color: "#16a34a",
  },

  tripStatValue: {
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
  },

  tooltip: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },

  tooltipTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 6,
  },

  tooltipRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },

  loadingState: {
    minHeight: 260,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "#6b7280",
    fontSize: 14,
  },

  errorState: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    padding: 24,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#991b1b",
  },

  errorText: {
    marginTop: 6,
    fontSize: 14,
    color: "#b91c1c",
  },

  emptyState: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 40,
    textAlign: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },

  emptyText: {
    maxWidth: 520,
    margin: "8px auto 0",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#6b7280",
  },

  radarEmpty: {
    minHeight: 210,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
    boxSizing: "border-box",
  },

  radarEmptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#374151",
  },

  radarEmptyText: {
    maxWidth: 650,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#9ca3af",
  },
};