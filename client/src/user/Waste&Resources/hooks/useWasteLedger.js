import { useCallback, useEffect, useMemo, useState } from "react";
import { saveLog, subscribeToLedger, updateLog } from "../services/ledgerStore";
import { sumRows } from "../services/benchmarkService";
import { buildMonthlySummaries, computeMCC } from "../services/reportingService";
import { evaluateNudges } from "../services/nudgeService";
import { getBenchmarks, refreshBenchmarks } from "../services/baselineService";
import { displayDate, isoDate } from "../utils/date";

const EMPTY = { rows: [], days: 0, totals: sumRows([]) };

/**
 * Owns the ledger and everything derived from it, so the page component
 * only has to deal with layout and modal state.
 *
 * @param {string|null} uid  Firebase Auth uid, or null when signed out.
 */
export default function useWasteLedger(uid) {
  const [logs, setLogs] = useState(null); // null = still loading
  const [error, setError] = useState(null);

  // Reset during render when the account changes, rather than in an effect,
  // so the previous user's rows are never shown to the next one.
  const [prevUid, setPrevUid] = useState(uid);
  if (prevUid !== uid) {
    setPrevUid(uid);
    setLogs(null);
    setError(null);
  }

  // Subscribing to an external system and setting state from its callback
  // is exactly what an effect is for.
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToLedger(
      uid,
      (rows) => setLogs(rows),
      (err) => {
        setError(err);
        setLogs([]);
      }
    );
  }, [uid]);

  const rows = useMemo(() => logs ?? [], [logs]);

  // Pull the live water baseline from data.gov.my once. `stamp` only ever
  // changes from the async callback, so the derived figures recompute after
  // the fetch resolves without any setState in the effect body.
  const [benchmarks, setBenchmarks] = useState(getBenchmarks);
  useEffect(() => {
    const controller = new AbortController();
    refreshBenchmarks({ signal: controller.signal }).then(setBenchmarks);
    return () => controller.abort();
  }, []);

  const todayIso = isoDate(new Date());
  const hasLoggedToday = useMemo(
    () => rows.some((l) => l.iso === todayIso),
    [rows, todayIso]
  );

  /* F5 — the three stat cards read the most recent three logged days. */
  const recent = useMemo(() => {
    if (rows.length === 0) return EMPTY;
    const days = [...new Set(rows.map((l) => l.iso))].sort().reverse().slice(0, 3);
    const picked = rows.filter((l) => days.includes(l.iso));
    return { rows: picked, days: days.length, totals: sumRows(picked) };
  }, [rows]);

  // `benchmarks` is a real dependency: the service functions below read the
  // baseline through getBenchmarks(), so a refreshed figure must invalidate
  // these memos. ESLint cannot see through the module boundary.
  /* eslint-disable react-hooks/exhaustive-deps */
  const nudges = useMemo(() => evaluateNudges(rows), [rows, benchmarks]);
  const monthlies = useMemo(() => buildMonthlySummaries(rows), [rows, benchmarks]);
  const mcc = useMemo(() => computeMCC(rows), [rows, benchmarks]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /**
   * Writes to Firestore. No local state update is needed — the onSnapshot
   * subscription echoes the write back immediately via latency compensation.
   */
  const addLog = useCallback(
    async (entry) => {
      if (!uid) return;
      const now = new Date();
      try {
        await saveLog(uid, {
          iso: isoDate(now),
          date: displayDate(now),
          showerMin: 0,
          detections: null,
          ...entry,
        });
      } catch (err) {
        setError(err);
      }
    },
    [uid]
  );

  /** Applies a user correction to an existing log. */
  const editLog = useCallback(
    async (log, patch) => {
      if (!uid) return;
      try {
        await updateLog(uid, log.id, patch, log);
      } catch (err) {
        setError(err);
      }
    },
    [uid]
  );

  return {
    logs: rows,
    loading: logs === null,
    error,
    addLog,
    editLog,
    hasLoggedToday,
    recent,
    nudges,
    monthlies,
    mcc,
    benchmarks,
  };
}
