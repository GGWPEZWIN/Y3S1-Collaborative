import { useCallback, useState } from "react";
import { AlertCircle } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import useWasteLedger from "../hooks/useWasteLedger";
import useLodging from "../hooks/useLodging";

import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import ReminderBanner from "../components/ReminderBanner";
import WasteStats from "../components/WasteStats";
import EntryPoints from "../components/EntryPoints";
import EcoNudge from "../components/EcoNudge";
import RecentLogs from "../components/RecentLogs";
import ReminderSettings from "../components/ReminderSettings";
import useGeofenceReminder from "../hooks/useGeofenceReminder";

import ScannerView from "../components/ScannerView";
import ResourceLoggerView from "../components/ResourceLoggerView";
import EcoReportsView from "../components/EcoReportsView";
import DetectionModal from "../components/DetectionModal";
import EditLogView from "../components/EditLogView";

/* ==================================================================
   MODULE 4 — WASTE & RESOURCE FOOTPRINT MANAGEMENT
   ------------------------------------------------------------------
   The page owns navigation and modal state only. The ledger lives in
   useWasteLedger (backed by Firestore), the geofence in
   useGeofenceReminder, and all maths and platform APIs in /services.
   ================================================================== */

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6">
      {children}
    </div>
  );
}

export default function WastePage({ onNavigate = () => {} }) {
  const [active, setActive] = useState("waste");
  const [view, setView] = useState("dashboard"); // dashboard | scan | logger | edit | reports
  const [inspecting, setInspecting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderBanner, setReminderBanner] = useState(false);

  const { status, user: authUser } = useAuthUser();
  const uid = authUser ? authUser.uid : null;

  const { logs, loading, error, addLog, editLog, hasLoggedToday, recent, nudges, monthlies, mcc } =
    useWasteLedger(uid);
  const { lodging, save: saveLodging } = useLodging(uid);

  const handleGeofenceTrigger = useCallback(() => setReminderBanner(true), []);
  const geofence = useGeofenceReminder({
    enabled: remindersOn,
    hasLoggedToday,
    onTrigger: handleGeofenceTrigger,
    lodging,
  });

  const commit = useCallback(
    async (entry) => {
      setView("dashboard");
      setReminderBanner(false);
      await addLog(entry);
    },
    [addLog]
  );

  const navigate = useCallback(
    (item) => {
      setActive(item.id);
      onNavigate(item.path);
    },
    [onNavigate]
  );

  if (status === "loading") {
    return (
      <Shell>
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-green-600 animate-spin" />
      </Shell>
    );
  }

  if (status === "signedOut") {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in to track your footprint</h1>
          <p className="mt-2 text-slate-500">Your waste ledger is tied to your account.</p>
          <button
            onClick={() => onNavigate("/login")}
            className="mt-6 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-6 py-3 text-base font-medium transition-colors"
          >
            Go to sign in
          </button>
        </div>
      </Shell>
    );
  }

  const displayUser = {
    name: authUser.displayName || authUser.email || "Traveller",
    ecoScore: mcc.score,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar user={displayUser} />

      <div className="flex">
        <Sidebar active={active} onSelect={navigate} />

        {view === "scan" ? (
          <ScannerView onBack={() => setView("dashboard")} onCommit={commit} />
        ) : view === "logger" ? (
          <ResourceLoggerView onBack={() => setView("dashboard")} onCommit={commit} />
        ) : view === "reports" ? (
          <EcoReportsView
            monthlies={monthlies}
            mcc={mcc}
            logs={logs}
            onBack={() => setView("dashboard")}
          />
        ) : view === "edit" && editing ? (
          <EditLogView
            log={editing}
            onBack={() => {
              setEditing(null);
              setView("dashboard");
            }}
            onSave={async (log, patch) => {
              await editLog(log, patch);
              setEditing(null);
              setView("dashboard");
            }}
          />
        ) : (
        <main className="flex-1 px-6 lg:px-8 py-8 max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight">Waste &amp; Resource Footprint</h1>
          <p className="mt-2 text-lg text-slate-500">
            Track and reduce your environmental impact
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Could not reach your ledger</p>
                <p className="text-red-800 mt-0.5">
                  Check your connection and refresh. Recent entries may not be saved.
                </p>
              </div>
            </div>
          )}

          {reminderBanner && (
            <ReminderBanner
              onDismiss={() => setReminderBanner(false)}
              lodgingName={lodging ? lodging.name : "your lodging"}
            />
          )}

          {loading ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="mt-6 h-9 w-20 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <WasteStats recent={recent} />
          )}

          <EntryPoints onScan={() => setView("scan")} onLog={() => setView("logger")} />

          {nudges.map((n) => (
            <EcoNudge key={n.id} nudge={n} lodging={lodging} />
          ))}

          {!loading && (
            <RecentLogs
              logs={logs.slice(0, 3)}
              onOpenReports={() => setView("reports")}
              onInspect={setInspecting}
              onEdit={(log) => {
                setEditing(log);
                setView("edit");
              }}
            />
          )}

          <ReminderSettings
            enabled={remindersOn}
            onToggle={() => setRemindersOn((v) => !v)}
            status={geofence.status}
            distance={geofence.distance}
            lodging={lodging}
            onSaveLodging={saveLodging}
          />
        </main>
        )}
      </div>



      {inspecting && <DetectionModal log={inspecting} onClose={() => setInspecting(null)} />}

    </div>
  );
}
