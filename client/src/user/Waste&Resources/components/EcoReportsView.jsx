import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  BarChart2,
  BarChart3,
  Download,
  Leaf,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ProgressBar from "./ProgressBar";
import TabBar from "./TabBar";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../constants/waste";
import { categoryScore } from "../services/benchmarkService";
import { buildReportCsv, downloadCsv } from "../services/exportService";
import { evaluateMilestones } from "../services/milestoneService";

/* ==================================================================
   ECO-REPORTS & PROGRESS  (F7)
   ------------------------------------------------------------------
   Macro temporal insight reporting: monthly eco-summaries with
   category-specific behavioural change and A+ to F grades, plus the
   annual footprint ledger that finalises the MCC score.

   Every figure is derived from the live ledger.

   Adapted from the design in one respect: the mockup charts progress
   per TRIP, but trips belong to the Itinerary module and this module
   records daily consumption. Months are the equivalent unit here.
   ================================================================== */

const TABS = [
  { id: "progress", label: "Progress Tracker" },
  { id: "monthly", label: "Monthly Reports" },
  { id: "annual", label: "Annual Footprint" },
  { id: "milestones", label: "Milestones" },
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function shortMonth(key) {
  const [, m] = key.split("-");
  return SHORT_MONTHS[Number(m) - 1] || key;
}

function gradeColour(grade) {
  if (grade === "A+") return "text-green-600";
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-lime-600";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-orange-500";
}

function Card({ title, icon: Icon, iconClass, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className={"w-5 h-5 " + iconClass} aria-hidden="true" />}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function EcoReportsView({ monthlies, mcc, logs, onBack }) {
  const [tab, setTab] = useState("progress");

  const latest = monthlies.length ? monthlies[monthlies.length - 1] : null;

  const chartData = useMemo(
    () =>
      monthlies.map((m) => ({
        month: shortMonth(m.key),
        label: m.label,
        score: Math.round(m.score),
        carbon: Math.round(m.carbonKg * 10) / 10,
        foodWaste: Math.round(m.totals.foodWaste),
        plastic: Math.round(m.totals.plastic),
        water: Math.round(m.totals.water),
        grade: m.grade,
      })),
    [monthlies]
  );

  // Radar covers the four categories this module measures. Transport,
  // Lodging and Activities in the mockup are owned by other modules.
  const radarData = useMemo(() => {
    if (!latest) return [];
    return CATEGORY_KEYS.map((k) => {
      const cat = latest.categories.find((c) => c.key === k);
      return {
        category: CATEGORY_LABELS[k],
        score: Math.round(categoryScore(cat ? cat.variance : 0)),
        fullMark: 100,
      };
    });
  }, [latest]);

  const milestones = useMemo(
    () => evaluateMilestones(logs, monthlies, mcc),
    [logs, monthlies, mcc]
  );

  const variancePct = (key) => {
    if (!latest) return 0;
    const cat = latest.categories.find((c) => c.key === key);
    return cat ? cat.variance : 0;
  };

  const headline = [
    { label: "Food Waste", key: "foodWaste" },
    { label: "Plastic Use", key: "plastic" },
    { label: "Water", key: "water" },
  ];

  const exportReport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`greentrip-eco-report-${stamp}.csv`, buildReportCsv(monthlies, mcc, logs));
  };

  return (
    <main className="flex-1 px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-base font-medium hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back
        </button>

        <div className="mt-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Eco-Reports &amp; Progress</h1>
            <p className="mt-2 text-lg text-slate-500">
              Track your sustainability performance over time
            </p>
          </div>
          <button
            onClick={exportReport}
            disabled={!latest}
            className="shrink-0 flex items-center gap-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white px-5 py-3 text-base font-medium transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export Full Report
          </button>
        </div>

        {!latest ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center">
            <BarChart3 size={28} className="mx-auto text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-lg font-medium">No reports yet</p>
            <p className="mt-1 text-slate-500">
              Monthly summaries, your conservation contribution and milestones appear
              once you have logged a few days.
            </p>
          </div>
        ) : (
          <>
            {/* ---------- Grade banner ---------- */}
            <section className="mt-6 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
                <div className="flex items-center justify-between flex-wrap gap-6">
                  <div>
                    <p className="text-green-100 text-sm font-medium uppercase tracking-wider">
                      {latest.label} Sustainability Grade
                    </p>
                    <div className="text-7xl font-black mt-1">{latest.grade}</div>
                    <p className="text-green-100 mt-1">
                      {Math.round(latest.score)}/100 across {latest.days} logged
                      {latest.days === 1 ? " day" : " days"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {headline.map((h) => {
                      const pct = variancePct(h.key);
                      return (
                        <div key={h.key} className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                          <div className="text-2xl font-bold tabular-nums">
                            {pct < 0 ? "-" : "+"}
                            {Math.abs(Math.round(pct))}%
                          </div>
                          <div className="text-green-100 text-xs mt-1">{h.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6">
              <TabBar tabs={TABS} active={tab} onChange={setTab} />
            </div>

            {/* ---------- Progress Tracker ---------- */}
            {tab === "progress" && (
              <div className="mt-4 space-y-6">
                <Card title="Eco Score Across Months" icon={Leaf} iconClass="text-green-600">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ecoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}`, "Eco Score"]} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fill="url(#ecoGrad)"
                        dot={{ fill: "#22c55e", strokeWidth: 2, r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card
                  title="Carbon Footprint per Month (kg CO₂e)"
                  icon={TrendingDown}
                  iconClass="text-blue-600"
                >
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v} kg`, "CO₂e"]} />
                      <Bar dataKey="carbon" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Sustainability Radar" icon={BarChart2} iconClass="text-purple-600">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Your Score"
                        dataKey="score"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className="mt-2 text-sm text-slate-500">
                    Covers the four categories this module measures. Transport, lodging and
                    activities are recorded by other modules.
                  </p>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...monthlies].reverse().map((m) => (
                    <div
                      key={m.key}
                      className="bg-white border border-green-100 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div>
                          <h4 className="font-semibold text-base leading-tight">{m.label}</h4>
                          <p className="text-sm text-slate-500">
                            {m.days} logged {m.days === 1 ? "day" : "days"}
                          </p>
                        </div>
                        <span className="rounded-md bg-green-600 text-white text-xs font-semibold px-2 py-1">
                          {m.grade}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Eco Score</p>
                          <p className="font-bold text-green-600 tabular-nums">
                            {Math.round(m.score)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Carbon</p>
                          <p className="font-bold tabular-nums">{m.carbonKg.toFixed(1)} kg</p>
                        </div>
                      </div>
                      <ProgressBar value={m.score} className="h-1.5 mt-3" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Monthly Reports ---------- */}
            {tab === "monthly" && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Food Waste Trend (g)">
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => [`${v}g`, "Food waste"]} />
                      <Line
                        type="monotone"
                        dataKey="foodWaste"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Plastic Items Used">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => [`${v} items`, "Plastic"]} />
                      <Bar dataKey="plastic" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Water Usage (L)">
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => [`${v}L`, "Water"]} />
                      <Area
                        type="monotone"
                        dataKey="water"
                        stroke="#3b82f6"
                        fill="url(#waterGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Monthly Eco Grades">
                  <div className="space-y-3">
                    {chartData.map((m) => (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="w-8 text-sm font-medium text-slate-500">
                          {m.month}
                        </span>
                        <ProgressBar value={m.score} className="flex-1 h-2" />
                        <span
                          className={
                            "text-sm font-bold w-8 text-right " + gradeColour(m.grade)
                          }
                        >
                          {m.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ---------- Annual Footprint ---------- */}
            {tab === "annual" && (
              <div className="mt-4 space-y-6">
                <Card title="Malaysian Conservation Contribution (MCC) Score">
                  <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                    <div>
                      <div className="text-5xl font-black text-green-600 tabular-nums">
                        {mcc.score}
                      </div>
                      <p className="text-slate-500 mt-1">
                        Total MCC Points · {new Date().getFullYear()}
                      </p>
                    </div>
                    <span className="rounded-lg bg-green-600 text-white text-lg font-semibold px-4 py-2">
                      Grade {latest.grade}
                    </span>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                    <p className="text-sm text-green-800">
                      Derived from {mcc.days} logged {mcc.days === 1 ? "day" : "days"}, your
                      choices avoided an estimated {mcc.totalAvoided.toFixed(1)} kg CO₂e
                      against the national per-capita baseline.
                    </p>
                  </div>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Food Waste",
                      value: `${(mcc.totals.foodWaste / 1000).toFixed(1)} kg`,
                      pct: variancePct("foodWaste"),
                    },
                    {
                      label: "Plastic Items",
                      value: `${mcc.totals.plastic}`,
                      pct: variancePct("plastic"),
                    },
                    {
                      label: "Water Usage",
                      value: `${(mcc.totals.water / 1000).toFixed(1)} kL`,
                      pct: variancePct("water"),
                    },
                  ].map((s) => {
                    const Icon = s.pct < 0 ? TrendingDown : TrendingUp;
                    return (
                      <div
                        key={s.label}
                        className="bg-white border border-slate-200 rounded-xl p-5 text-center"
                      >
                        <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                        <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                        <div
                          className={
                            "flex items-center justify-center gap-1 text-sm mt-1 " +
                            (s.pct < 0 ? "text-green-600" : "text-orange-600")
                          }
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                          {s.pct < 0 ? "-" : "+"}
                          {Math.abs(Math.round(s.pct))}% vs avg
                        </div>
                      </div>
                    );
                  })}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-sm text-slate-500 mb-1">Carbon Saved</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {mcc.totalAvoided.toFixed(0)} kg
                    </p>
                    <div className="flex items-center justify-center gap-1 text-sm mt-1 text-blue-600">
                      <TrendingUp className="w-4 h-4" aria-hidden="true" />
                      CO₂e avoided
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------- Milestones ---------- */}
            {tab === "milestones" && (
              <div className="mt-4">
                <Card title="Sustainability Milestones" icon={Award} iconClass="text-yellow-500">
                  <div className="space-y-4">
                    {milestones.map((m) => (
                      <div
                        key={m.key}
                        className={
                          "p-4 rounded-xl border flex items-start gap-4 " +
                          (m.achieved
                            ? "border-green-200 bg-green-50/60"
                            : "border-dashed border-slate-300")
                        }
                      >
                        <div className="text-3xl shrink-0" aria-hidden="true">
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h4
                              className={
                                "font-semibold " + (m.achieved ? "" : "text-slate-500")
                              }
                            >
                              {m.label}
                            </h4>
                            {m.achieved ? (
                              m.date && (
                                <span className="shrink-0 rounded-md bg-green-600 text-white text-xs font-semibold px-2 py-1">
                                  {m.date}
                                </span>
                              )
                            ) : (
                              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                                {m.progress}%
                              </span>
                            )}
                          </div>
                          {!m.achieved && (
                            <ProgressBar value={m.progress} className="h-1.5 mt-2" />
                          )}
                          {m.achieved && (
                            <p className="text-xs text-green-600 mt-1 font-medium">
                              ✓ Achieved!
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
