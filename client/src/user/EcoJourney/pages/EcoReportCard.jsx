import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
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
import "../../AIRecommendation/styles/aiRecommendation.css";


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

        if (tripId) {
          const data = await getEcoReport(tripId);

          if (!mounted) return;
          setReport(isModule2Report(data) ? data : null);
          setReports([]);
          return;
        }

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
  }, [authUser?.uid, userLoading, tripId]);


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

    return (
      <FullEcoReport
        key={tripId}
        report={report}
        tripId={tripId}
        layoutUser={layoutUser}
        authUser={authUser}
        onNavigate={onNavigate}
      />
    );
  }


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
                userEmail={
                  authUser.email ||
                  profileEmailFallback(item)
                }
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


function ReportListCard({
  report,
  userName,
  userEmail,
  onView,
}) {
  const cardRef = useRef(null);
  const [shareBusy, setShareBusy] = useState(false);

  const trip = report.trip || {};
  const view = buildCompletedReportView(
    report,
    report.tripId
  );

  const hasError = Boolean(report.reportError);

  const tripName =
    view?.title ||
    trip.name ||
    trip.title ||
    "Untitled Trip";

  async function handleShareImage() {
    if (shareBusy || !cardRef.current) return;

    try {
      setShareBusy(true);

      await shareElementImage(
        cardRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(
          "Report image share failed:",
          err
        );

        alert(
          "Unable to share this Eco-Report Card. Please try again."
        );
      }
    } finally {
      setShareBusy(false);
    }
  }

  async function handleDownloadImage() {
    if (shareBusy || !cardRef.current) return;

    try {
      setShareBusy(true);

      await downloadElementImage(
        cardRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      console.error(
        "Report image download failed:",
        err
      );

      alert(
        "Unable to download this Eco-Report Card. Please try again."
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function handleShareOrDownload() {
    if (shareBusy || !cardRef.current) return;

    try {
      setShareBusy(true);

      await shareOrDownloadElementImage(
        cardRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(
          "Report image share/download failed:",
          err
        );

        alert(
          "Unable to share or download this Eco-Report Card. Please try again."
        );
      }
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <div
      ref={cardRef}
      style={styles.reportCard}
    >
      <div style={styles.topBar} />

      <div style={styles.cardBody}>
        <div style={styles.listHeader}>
          <div style={styles.cardInfo}>
            <div style={styles.reportTag}>
              ECO-REPORT CARD
            </div>

            <h2 style={styles.tripName}>
              {tripName}
            </h2>

            {view ? (
              <div style={styles.dateRow}>
                <Calendar
                  size={16}
                  color="#9ca3af"
                />
                <span>
                  {formatCompletionDate(
                    view.completedAt
                  )}
                </span>
              </div>
            ) : null}
          </div>

          {view ? (
            <span
              style={
                view.isPublic
                  ? styles.statusPill
                  : styles.privatePill
              }
            >
              {visibilityLabel(
                view.isPublic
                  ? "public"
                  : "private"
              )}
            </span>
          ) : null}
        </div>

        {view ? (
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Final Trip Eco-Score
              </div>

              <div style={styles.scoreValue}>
                {formatScore(
                  view.finalEcoScore
                )}
              </div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Confirmed transportation carbon
              </div>

              <div style={styles.statValue}>
                {formatCarbonKg(
                  view.confirmedTransportationCarbonKg
                )}
              </div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Destinations
              </div>

              <div style={styles.statValue}>
                {view.reachedCount} reached,{" "}
                {view.skippedCount} skipped
              </div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Visibility
              </div>

              <span
                style={
                  view.isPublic
                    ? styles.statusPill
                    : styles.privatePill
                }
              >
                {visibilityLabel(
                  view.isPublic
                    ? "public"
                    : "private"
                )}
              </span>
            </div>
          </div>
        ) : null}

        {hasError ? (
          <div style={styles.reportError}>
            {report.reportError}
          </div>
        ) : (
          <div
            style={styles.actionsRow}
            data-html2canvas-ignore="true"
          >
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
              onClick={handleShareOrDownload}
              style={styles.btnDark}
              disabled={shareBusy}
            >
              <Share2 size={15} />
              {shareBusy ? "Preparing..." : "Share / Download Image"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FullEcoReport({
  report,
  tripId,
  layoutUser,
  authUser,
  onNavigate,
}) {
  const reportView =
    buildCompletedReportView(
      report,
      tripId
    );

  const reportCaptureRef = useRef(null);
  const [shareBusy, setShareBusy] =
    useState(false);

  const userName =
    layoutUser?.name ||
    "User";

  const userEmail =
    authUser?.email ||
    report?.userEmail ||
    report?.email ||
    "";

  async function handleShareImage() {
    if (
      shareBusy ||
      !reportCaptureRef.current
    ) {
      return;
    }

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
        console.error(
          "Report image share failed:",
          err
        );

        alert(
          "Unable to share the Eco-Report Card. Please try again."
        );
      }
    } finally {
      setShareBusy(false);
    }
  }

  async function handleDownloadImage() {
    if (
      shareBusy ||
      !reportCaptureRef.current
    ) {
      return;
    }

    try {
      setShareBusy(true);

      await downloadElementImage(
        reportCaptureRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      console.error(
        "Report image download failed:",
        err
      );

      alert(
        "Unable to download the Eco-Report Card. Please try again."
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function handleShareOrDownload() {
    if (
      shareBusy ||
      !reportCaptureRef.current
    ) {
      return;
    }

    try {
      setShareBusy(true);

      await shareOrDownloadElementImage(
        reportCaptureRef.current,
        report,
        userName,
        userEmail
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(
          "Report image share/download failed:",
          err
        );

        alert(
          "Unable to share or download the Eco-Report Card. Please try again."
        );
      }
    } finally {
      setShareBusy(false);
    }
  }

  if (!reportView) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.errorText}>
          Report available after trip completion
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.(
              "/community/reports"
            )
          }
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
        <div
          style={styles.detailTopRow}
          data-html2canvas-ignore="true"
        >
          <button
            type="button"
            style={styles.backButton}
            onClick={() =>
              onNavigate?.(
                "/community/reports"
              )
            }
          >
            <ChevronLeft size={20} />
            <span>
              Back to Eco-Reports
            </span>
          </button>

          <div style={styles.actionGroup}>
            <button
              type="button"
              style={styles.btnDark}
              onClick={handleShareOrDownload}
              disabled={shareBusy}
            >
              <Share2 size={15} />
              {shareBusy ? "Preparing..." : "Share / Download Image"}
            </button>
          </div>
        </div>

        <div
          ref={reportCaptureRef}
          style={styles.reportCapture}
        >
          <CompletedEcoReport
            reportView={reportView}
          />
        </div>
      </div>
    </Layout>
  );
}


// ============================================================
// REPORT IMAGE EXPORT / SOCIAL SHARING
// ============================================================

async function createReportImageBlob(
  element,
  report,
  userName,
  userEmail
) {
  if (!element) {
    throw new Error(
      "Report element is not available."
    );
  }

  // Wait for the report to finish rendering.
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

  const rect =
    element.getBoundingClientRect();

  const width = Math.max(
    360,
    Math.ceil(rect.width)
  );

  // Clone the visible report so the real UI
  // is never changed.
  const clone =
    element.cloneNode(true);

  // Remove anything marked as non-shareable.
  clone
    .querySelectorAll(
      "[data-html2canvas-ignore]"
    )
    .forEach((node) => node.remove());

  // Add GreenTrip + username + email ONLY
  // to the exported image.
  const identity =
    document.createElement("div");

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

  const left =
    document.createElement("div");

  left.style.cssText = `
    min-width:0;
    flex:1;
  `;

  const appName =
    document.createElement("div");

  appName.textContent =
    "GREEN TRIP MALAYSIA";

  appName.style.cssText = `
    font-size:14px;
    font-weight:800;
    letter-spacing:.08em;
    color:#15803d;
  `;

  const label =
    document.createElement("div");

  label.textContent =
    "Eco-Report Card generated for";

  label.style.cssText = `
    font-size:12px;
    color:#94a3b8;
    margin-top:5px;
  `;

  const name =
    document.createElement("div");

  name.textContent =
    userName || "User";

  name.style.cssText = `
    font-size:18px;
    font-weight:800;
    color:#111827;
    margin-top:4px;
    word-break:break-word;
  `;

  left.appendChild(appName);
  left.appendChild(label);
  left.appendChild(name);

  const email =
    document.createElement("div");

  email.textContent =
    userEmail || "Email not available";

  email.style.cssText = `
    font-size:13px;
    color:#64748b;
    text-align:right;
    word-break:break-word;
    max-width:42%;
  `;

  identity.appendChild(left);
  identity.appendChild(email);

  const wrapper =
    document.createElement("div");

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

  // Friendly social-sharing footer.
  const invitation =
    document.createElement("div");

  invitation.textContent =
    "🌱 Come join me on my sustainable journey with GreenTrip Malaysia!";

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

  wrapper.appendChild(
    invitation
  );

  document.body.appendChild(
    wrapper
  );

  try {
    await new Promise((resolve) =>
      requestAnimationFrame(resolve)
    );

    const canvas =
      await html2canvas(wrapper, {
        backgroundColor: "#f3f4f6",
        scale: Math.min(
          2,
          window.devicePixelRatio || 1.5
        ),
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 20000,
        removeContainer: true,
        scrollX: 0,
        scrollY: 0,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: Math.max(
          window.innerWidth,
          wrapper.scrollWidth
        ),
        windowHeight: Math.max(
          window.innerHeight,
          wrapper.scrollHeight
        ),
      });

    if (
      !canvas ||
      !canvas.width ||
      !canvas.height
    ) {
      throw new Error(
        "html2canvas returned an empty image."
      );
    }

    return await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (
              blob &&
              blob.size > 0
            ) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "Could not create PNG image."
                )
              );
            }
          },
          "image/png",
          1
        );
      }
    );
  } finally {
    wrapper.remove();
  }
}

function makeReportFile(
  blob,
  report
) {
  const filename =
    `${sanitizeFilename(
      report?.tripName ||
        "eco-report"
    )}-eco-report.png`;

  return new File(
    [blob],
    filename,
    {
      type: "image/png",
    }
  );
}

async function downloadBlob(file, blob) {
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name || "eco-report.png";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

async function downloadElementImage(
  element,
  report,
  userName,
  userEmail
) {
  const blob =
    await createReportImageBlob(
      element,
      report,
      userName,
      userEmail
    );

  const url =
    URL.createObjectURL(blob);

  try {
    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${sanitizeFilename(
        report?.tripName ||
          "eco-report"
      )}-eco-report.png`;

    link.style.display = "none";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  } finally {
    setTimeout(
      () =>
        URL.revokeObjectURL(url),
      3000
    );
  }
}

async function shareOrDownloadElementImage(
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

  // On mobile/tablet, open the native share sheet so the user
  // can choose WhatsApp, Instagram, Messenger, etc.
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

  // If direct sharing is unavailable (common on desktop),
  // download the same image automatically.
  await downloadBlob(file, blob);

  return { method: "download" };
}

async function shareElementImage(
  element,
  report,
  userName,
  userEmail
) {
  const blob =
    await createReportImageBlob(
      element,
      report,
      userName,
      userEmail
    );

  const file =
    makeReportFile(
      blob,
      report
    );

  // Mobile browsers can open the native
  // share sheet and share the actual PNG.
  if (
    typeof navigator !==
      "undefined" &&
    typeof navigator.share ===
      "function"
  ) {
    const fileShareSupported =
      typeof navigator.canShare !==
        "function" ||
      navigator.canShare({
        files: [file],
      });

    if (fileShareSupported) {
      await navigator.share({
        title:
          `${report?.tripName || "GreenTrip"} - Eco-Report Card`,
        files: [file],
      });

      return {
        method: "native-share",
      };
    }
  }

  // Desktop fallback:
  // copy the ACTUAL IMAGE to clipboard
  // when supported, then download it.
  let copiedImage = false;

  try {
    if (
      navigator.clipboard &&
      typeof window.ClipboardItem !==
        "undefined"
    ) {
      const item =
        new ClipboardItem({
          "image/png": blob,
        });

      await navigator.clipboard.write([
        item,
      ]);

      copiedImage = true;
    }
  } catch (error) {
    console.warn(
      "Could not copy report image:",
      error
    );
  }

  await downloadElementImage(
    element,
    report,
    userName,
    userEmail
  );

  if (copiedImage) {
    alert(
      "The Eco-Report Card image was copied and downloaded. You can paste the actual image into WhatsApp, Instagram, Messenger or another social app."
    );
  } else {
    alert(
      "The Eco-Report Card image was downloaded. Your browser does not support direct image sharing from this page."
    );
  }

  return {
    method: "desktop-fallback",
  };
}

function sanitizeFilename(
  value
) {
  return String(
    value || "eco-report"
  )
    .replace(
      /[^a-z0-9\-_]+/gi,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase() ||
    "eco-report";
}

function profileEmailFallback(
  report
) {
  return (
    report?.userEmail ||
    report?.email ||
    ""
  );
}


function LoadingPage({ text }) {
  return (
    <div style={styles.loadingPage}>
      <p style={styles.loadingText}>{text}</p>
    </div>
  );
}


const styles = {

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

  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
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
    flexWrap: "wrap",
  },

  btnDark: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#111827",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 22px",
    borderRadius: 999,
    cursor: "pointer",
  },

  reportCapture: {
    background: "#f3f4f6",
    borderRadius: 16,
    overflow: "hidden",
  },

};
